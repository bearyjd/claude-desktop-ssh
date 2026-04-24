# Backend Codemap (Rust Daemon)

**Last Updated:** 2025-04-23  
**Entry Points:** `src/main.rs`, `src/bin/navetted-hook.rs`

## Module Breakdown

| Module | Purpose | Key Functions | Lines |
|--------|---------|---------------|-------|
| `main.rs` | Task startup, session lifecycle, stdin approvals | `main()`, `run_session()`, `emit_session_list_changed()` | 492 |
| `ws.rs` | WebSocket server, auth, command dispatch | `serve()`, `handle_ws()`, message handlers | 1540 |
| `claude.rs` | Claude PTY management, JSON parsing | `spawn_and_process()`, event streaming | 240 |
| `hook.rs` | Unix socket approval handler | `serve()`, `handle_connection()` | 200 |
| `db.rs` | SQLite persistence, encryption | `open()`, `insert_event()`, secret ops | 300+ |
| `config.rs` | TOML config, QR pairing, TLS | `load_or_create()`, `handle_pair()` | 150+ |
| `notify.rs` | Push notifications | `NotifyClient::publish()`, `send_telegram()` | 100+ |

## Shared State Types

```rust
// PendingApprovals: tool_use_id → oneshot::Sender<Decision>
pub type PendingApprovals = Arc<Mutex<HashMap<String, oneshot::Sender<Decision>>>>;

// BufferedDecisions: decisions arriving before hook connects
pub type BufferedDecisions = Arc<Mutex<HashMap<String, Decision>>>;

// Sessions: session_id → SessionEntry
pub type Sessions = Arc<Mutex<HashMap<String, SessionEntry>>>;

// Broadcast channel: (seq, unix_ts, json_string)
pub type EventTx = broadcast::Sender<(i64, f64, String)>;

// Session metadata
pub struct SessionEntry {
    pub prompt: String,
    pub container: Option<String>,
    pub command: Option<String>,
    pub started_at: f64,
    pub kill_tx: Option<oneshot::Sender<()>>,
    pub input_tokens: Arc<AtomicU64>,
    pub output_tokens: Arc<AtomicU64>,
    pub cache_read_tokens: Arc<AtomicU64>,
    pub pty_tx: Option<tokio::sync::mpsc::Sender<String>>,
}

pub enum Decision {
    Allow,
    Deny,
}
```

## WebSocket Message Types

**Client → Server:**

| Message | Purpose | Example |
|---------|---------|---------|
| `hello` | Auth with token | `{"type":"hello","token":"..."}` |
| `attach` | Event replay; switch session | `{"type":"attach","since":1000,"session_id":"abc"}` |
| `run` | Start Claude session | `{"type":"run","prompt":"...","container":"..."}` |
| `kill_session` | Stop session | `{"type":"kill_session","session_id":"abc"}` |
| `input` | Send text to PTY stdin | `{"type":"input","text":"...","session_id":"abc"}` |
| `input` (approval) | Allow/deny tool use | `{"type":"input","tool_use_id":"xyz","allow":true}` |
| `list_sessions` | Get active sessions | `{"type":"list_sessions"}` |
| `list_dir` | Browse filesystem | `{"type":"list_dir","path":"/home"}` |
| `read_file` | Get file content | `{"type":"read_file","path":"~/.claude/config.toml"}` |
| `write_file` | Write to `~/.claude/` only | `{"type":"write_file","path":"~/.claude/x.json","content":"..."}` |
| `schedule_session` | Queue future session | `{"type":"schedule_session","prompt":"...","scheduled_at":123.45}` |
| `list_scheduled_sessions` | Get queued jobs | `{"type":"list_scheduled_sessions"}` |
| `list_prompts` | Prompt library | `{"type":"list_prompts"}` |
| `save_prompt` | Cache prompt | `{"type":"save_prompt","title":"...","body":"..."}` |
| `set_secret` | Encrypted storage | `{"type":"set_secret","name":"KEY","value":"secret"}` |
| `delete_secret` | Remove secret | `{"type":"delete_secret","name":"KEY"}` |
| `list_devices` | Paired phones | `{"type":"list_devices"}` |
| `revoke_device` | Unpair device | `{"type":"revoke_device","device_id":"..."}` |
| `get_approval_policies` | Fetch tool policies | `{"type":"get_approval_policies"}` |
| `set_approval_policy` | Allow/deny tool auto | `{"type":"set_approval_policy","tool_name":"read_file","action":"allow"}` |

**Server → Client (events):**

| Event | Payload |
|-------|---------|
| `session_started` | `{type, session_id, prompt, container, command}` |
| `session_ended` | `{type, session_id, ok}` |
| `session_list_changed` | `{type, sessions: SessionInfo[]}` |
| `claude` | Claude's assistant/tool messages (raw JSON lines) |
| `approval_pending` | `{type, tool_use_id, tool_name, session_id}` |
| `approval_granted` / `approval_denied` | `{type, tool_use_id}` |
| `approval_warning` | `{type, seconds_remaining}` |
| `approval_expired` | `{type}` |
| `skill_info` | `{type, skills: SkillInfo[]}` |
| `token_usage` | `{type, session_id, input, output, cache_read}` |
| `file_listing` | `{type, entries: FileEntry[]}` |
| `file_content` | `{type, path, content, error?}` |
| `file_write_result` | `{type, path, ok, error?}` |
| `prompt_library` | `{type, prompts: SavedPrompt[]}` |
| `scheduled_sessions` | `{type, sessions: ScheduledSessionInfo[]}` |
| `test_notification_sent` | `{type, result: string}` |
| `secrets_list` | `{type, secrets: SecretEntry[]}` |
| `devices_list` | `{type, devices: DeviceEntry[]}` |
| `approval_policies_list` | `{type, policies: ApprovalPolicy[]}` |

## Hook Binary Flow (navetted-hook.rs)

```rust
// Executed as PreToolUse hook by Claude Code

1. Read stdin (JSON HookRequest)
2. Parse hook input (tool_use_id, tool_name, input)
3. Connect to Unix socket at $XDG_RUNTIME_DIR/navetted/hook.sock
4. Send HookRequest JSON
5. Wait for HookResponse (timeout 300s default)
6. If "Allow": exit(0)  →  Claude tool executes
7. If "Deny": exit(2)   →  Claude skips tool
```

## Key Design Details

**PTY Setup (claude.rs):**
- `portable_pty::openpty()` with cols=32,767 (prevents JSON line wrapping)
- PTY required so Claude's `isatty()` returns true
- Output format: `--output-format stream-json --verbose`
- Every JSON line is stored; events >64 KiB are truncated
- Token counts extracted from `usage` fields, accumulated atomically

**Approval TTL (hook.rs):**
- Default 300 seconds, configurable
- Warning event emitted `approval_warn_before_secs` before expiry
- Auto-deny if no decision after TTL (exit code 2 to hook binary)
- Buffered decisions consumed immediately when hook connects

**Secret Encryption (db.rs):**
- `AES-256-GCM` with 96-bit nonce
- Key derived via `HKDF-SHA256` from auth token
- Changing token invalidates all secrets
- Secrets at rest in SQLite `secrets` table

**Session Limits:**
- `max_concurrent_sessions` enforced per config
- Scheduler skips jobs if limit reached
- Token counters are `Arc<AtomicU64>` — no locks

## File Paths

- `/src/main.rs` — Task setup, session spawning
- `/src/ws.rs` — WebSocket listener, message dispatch
- `/src/claude.rs` — PTY spawning, JSON parsing, token collection
- `/src/hook.rs` — Unix socket approval handler
- `/src/db.rs` — SQLite tables, queries, encryption
- `/src/config.rs` — TOML, QR code generation
- `/src/notify.rs` — ntfy/Telegram publishers
- `/src/bin/navetted-hook.rs` — Hook binary entry point
- `/Cargo.toml` — Dependencies (tokio, portable-pty, rusqlite, ring, etc.)
