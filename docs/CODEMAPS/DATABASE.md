# Database Codemap

**Last Updated:** 2025-04-23  
**Location:** `~/.local/share/navetted/events.db` (SQLite WAL mode, 0600 perms)

## Schema

### events (append-only log)

```sql
CREATE TABLE events (
  seq       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        REAL NOT NULL,          -- unix timestamp
  json      TEXT NOT NULL,          -- full event JSON
  session_id TEXT NOT NULL DEFAULT ''
);
```

**Purpose:** Immutable event log. Clients replay from `since` seq.  
**Retention:** Capped at 10,000 rows via `enforce_retention()`.  
**Indexes:** By `seq` (PK), by `session_id`.

**Example rows:**

```json
{ "seq": 1, "ts": 1713897600.5, "json": "{\"type\":\"session_started\",\"session_id\":\"abc123\",\"prompt\":\"hello\"}", "session_id": "abc123" }
{ "seq": 2, "ts": 1713897601.2, "json": "{\"type\":\"claude\",\"session_id\":\"abc123\",\"content\":{...}}", "session_id": "abc123" }
{ "seq": 3, "ts": 1713897602.9, "json": "{\"type\":\"approval_pending\",\"tool_use_id\":\"xyz\",\"tool_name\":\"read_file\"}", "session_id": "abc123" }
```

### scheduled_sessions

```sql
CREATE TABLE scheduled_sessions (
  id           TEXT PRIMARY KEY,      -- UUID
  prompt       TEXT NOT NULL,
  container    TEXT,                  -- distrobox name (optional)
  command      TEXT,                  -- override CLAUDE_BIN (optional)
  scheduled_at REAL NOT NULL,         -- unix timestamp when to fire
  created_at   REAL NOT NULL,
  fired        INTEGER NOT NULL DEFAULT 0  -- bool: whether scheduler fired it
);
```

**Purpose:** Cron-like job scheduling.  
**Polling:** Scheduler polls every 30s; fires jobs where `scheduled_at <= now()` and `fired=0`.  
**Persistence:** Marked `fired=1` before spawning to prevent re-fire on crash.

### prompt_library

```sql
CREATE TABLE prompt_library (
  id         TEXT PRIMARY KEY,         -- UUID
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,            -- full prompt text
  tags       TEXT NOT NULL DEFAULT '[]',  -- JSON array ["tag1", "tag2"]
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
```

**Purpose:** User-saved prompt templates.  
**CRUD:** Via WS commands `save_prompt`, `update_prompt`, `delete_prompt`.

### secrets

```sql
CREATE TABLE secrets (
  name       TEXT PRIMARY KEY,         -- e.g. "ANTHROPIC_API_KEY"
  encrypted  BLOB NOT NULL,            -- AES-256-GCM ciphertext
  nonce      BLOB NOT NULL,            -- 96-bit nonce
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
```

**Purpose:** Encrypted key-value storage.  
**Encryption:** AES-256-GCM. Key = HKDF-SHA256(auth_token, HKDF_SALT="navetted-secrets-v1").  
**Injection:** Sessions can request `inject_secrets=true` → plaintext values added to Claude's environment.  
**Security:** Changing the auth token invalidates all secrets (re-encrypt or re-create).

**Functions (db.rs):**
```rust
pub fn derive_secret_key(token: &str) -> Result<Vec<u8>>
pub fn encrypt_secret(key: &[u8], plaintext: &[u8]) -> Result<(Vec<u8>, Vec<u8>)>
pub fn decrypt_secret(key: &[u8], ciphertext: &[u8], nonce: &[u8]) -> Result<Vec<u8>>
pub fn set_secret(conn: &Connection, name: &str, value: &str) -> Result<()>
pub fn get_secret_encrypted(conn: &Connection, name: &str) -> Result<Option<(Vec<u8>, Vec<u8>)>>
pub fn delete_secret(conn: &Connection, name: &str) -> Result<()>
```

### devices

```sql
CREATE TABLE devices (
  device_id  TEXT PRIMARY KEY,         -- unique per phone
  name       TEXT NOT NULL,            -- user-friendly name
  paired_at  REAL NOT NULL,
  last_seen  REAL NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0  -- bool: revoked pairing
);
```

**Purpose:** Track paired mobile clients.  
**Usage:** Device revocation (unpair from settings).  
**Client ID:** Generated once per mobile install: `mobile-{uuid}`.

### approval_policy

```sql
CREATE TABLE approval_policy (
  tool_name  TEXT PRIMARY KEY,         -- e.g. "read_file", "bash"
  action     TEXT NOT NULL DEFAULT 'prompt',  -- 'prompt' | 'allow' | 'deny'
  created_at REAL NOT NULL,
  updated_at REAL NOT NULL
);
```

**Purpose:** Per-tool auto-approval rules.  
**Actions:**
- `prompt` — Default; ask user for each tool use
- `allow` — Auto-approve all uses of this tool
- `deny` — Auto-deny all uses of this tool

**Flow:** When hook connects, check `approval_policy` table. If action != 'prompt', auto-respond without waiting.

## Key Operations (db.rs)

| Function | Purpose |
|----------|---------|
| `open()` | Create/open DB, run migrations |
| `insert_event()` | Append to events table; return seq |
| `get_events_since()` | Fetch events with seq > since |
| `enforce_retention()` | Delete oldest rows if exceeds 10k |
| `get_pending_scheduled_sessions()` | Find jobs with fired=0 and scheduled_at <= now |
| `mark_scheduled_session_fired()` | Set fired=1 on job |
| `list_prompts()` | Fetch all from prompt_library |
| `save_prompt()`, `update_prompt()`, `delete_prompt()` | CRUD |
| `set_secret()`, `get_secret_encrypted()`, `delete_secret()`, `list_secrets()` | Secret CRUD |
| `list_devices()`, `revoke_device()`, `rename_device()` | Device tracking |
| `get_approval_policies()`, `set_approval_policy()`, `delete_approval_policy()` | Policy CRUD |
| `derive_secret_key()`, `encrypt_secret()`, `decrypt_secret()` | Encryption helpers |

## Data Lifecycle

```
1. Session starts
   ├─ insert_event({type: "session_started", ...})  → seq 1
   ├─ Insert into sessions map (in-memory, not DB)
   └─ Emit on broadcast channel

2. Claude runs; events stream
   ├─ Read from PTY line-by-line
   ├─ insert_event({type: "claude", content: ...})  → seq 2, 3, 4, ...
   └─ Accumulate tokens atomically

3. Tool use approval
   ├─ hook.rs receives HookRequest
   ├─ insert_event({type: "approval_pending", ...})
   ├─ Broadcast to WS clients
   ├─ Wait for user decision (up to approval_ttl_secs)
   ├─ insert_event({type: "approval_granted" or "approval_denied", ...})
   └─ Respond to hook binary

4. Session ends
   ├─ insert_event({type: "session_ended", ...})
   ├─ Broadcast session_list_changed (synthetic, seq=0)
   └─ Remove from sessions map

5. Retention
   ├─ After each insert, check row count
   ├─ If > 10,000: delete oldest batch
   └─ SQLite WAL ensures no corruption
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_pending ON scheduled_sessions(fired, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_secrets_name ON secrets(name);
CREATE INDEX IF NOT EXISTS idx_devices_revoked ON devices(revoked);
```

## Configuration

- **Location:** `~/.local/share/navetted/events.db`
- **Permissions:** `0600` (owner read/write only)
- **WAL mode:** Enabled for concurrent access (readers don't block writers)
- **Retention:** 10,000 rows max (enforced after each insert)
- **Transactions:** Used for multi-step operations (e.g., set_secret)

## File Path

`/src/db.rs` — All database operations (300+ lines)

## Security Notes

- Secrets table uses AES-256-GCM encryption at rest
- DB file itself is mode 0600
- Auth token acts as encryption key (HKDF-derived)
- No plaintext secrets ever written to disk
- Scheduled jobs fire only after being marked `fired=1` (atomicity)
- Events are immutable; audit trail is tamper-obvious
