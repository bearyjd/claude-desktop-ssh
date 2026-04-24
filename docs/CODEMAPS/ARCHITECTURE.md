# Architecture Codemap

**Last Updated:** 2025-04-23  
**Entry Points:** `src/main.rs`, `mobile/src/App.tsx`

## System Diagram

```
┌─────────────────────────────────────┐
│  Phone (React Native / Expo)        │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ useNavettedWS Hook              ││
│  │  - WebSocket connection         ││
│  │  - Event dispatch & state       ││
│  │  - All commands                 ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ React Native Screens            ││
│  │  - Connect, Main, FileBrowser   ││
│  │  - PromptLibrary, Secrets       ││
│  │  - Devices, ApprovalPolicies    ││
│  └─────────────────────────────────┘│
└─────────────────┬───────────────────┘
                  │
         WebSocket (TLS optional)
                  │
         wss://host:7878
                  │
┌─────────────────▼───────────────────┐
│  Workstation (Rust Daemon)          │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ WS Server (ws.rs)               ││
│  │  - Auth (token)                 ││
│  │  - Message dispatch (run, kill) ││
│  │  - Event replay (seq-based)     ││
│  └──────────────┬────────────────────│
│                 │                    │
│  ┌──────────────▼────────────────────│
│  │ Session Loop (main.rs)           ││
│  │  - run_session() spawns claude   ││
│  │  - Broadcast channel (4096)      ││
│  │  - Session map (Arc<Mutex>)      ││
│  └────────────────────────────────────│
│                 │                    │
│  ┌──────────────▼────────────────────│
│  │ Claude PTY (claude.rs)           ││
│  │  - Opens PTY (cols=32767)        ││
│  │  - Reads JSON lines              ││
│  │  - Collects tokens               ││
│  └──────────────┬────────────────────│
│                 │                    │
│  ┌──────────────▼────────────────────│
│  │ Hook Socket (hook.rs)            ││
│  │  - Unix socket listener          ││
│  │  - Approval pending → broadcast  ││
│  │  - Resolve oneshot on decision   ││
│  └────────────────────────────────────│
│         ↓          ↓          ↓       │
│  ┌─────────────────────────────────┐│
│  │ Shared State (Arc<Mutex<>>)     ││
│  │  - PendingApprovals (oneshots)  ││
│  │  - BufferedDecisions            ││
│  │  - Sessions (entries with PTY)  ││
│  │  - Events broadcast channel     ││
│  └─────────────────────────────────┘│
│         ↓          ↓          ↓       │
│  ┌─────────────────────────────────┐│
│  │ SQLite DB (db.rs) [WAL]         ││
│  │  - events table (append-only)   ││
│  │  - scheduled_sessions           ││
│  │  - prompt_library, secrets      ││
│  │  - devices, approval_policy     ││
│  └─────────────────────────────────┘│
│         ↓          ↓          ↓       │
│  ┌─────────────────────────────────┐│
│  │ Notifications (notify.rs)       ││
│  │  - ntfy (HTTP POST)             ││
│  │  - Telegram (bot)               ││
│  │  - Event filtering              ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
         ↓
  Local Workstation Tools
  - distrobox (containers)
  - Claude CLI (CLAUDE_BIN)
```

## Data Flow: Approval Lifecycle

```
1. Claude runs tool use
   ↓
2. navetted-hook (binary) reads stdin (HookRequest JSON)
   ↓
3. navetted-hook connects to Unix socket (hook.rs)
   ↓
4. hook.rs:
   - Check BufferedDecisions (early decisions)
   - If none, insert into PendingApprovals (oneshot sender)
   - Emit "approval_pending" event → broadcast channel
   ↓
5. WS clients receive event → show approval UI
   ↓
6. User taps allow/deny
   ↓
7. WS handler resolves oneshot in PendingApprovals
   ↓
8. hook.rs catches decision from oneshot
   ↓
9. Writes HookResponse to Unix socket
   ↓
10. navetted-hook exits 0 (allow) or 2 (deny)
    ↓
11. Claude continues or rolls back
```

## Task Orchestration (main.rs)

Four tokio::spawn() tasks run concurrently:

1. **Hook socket** (`hook::serve()`) — Unix socket listener for approval requests
2. **Notifications** — Broadcast subscriber; fires ntfy/Telegram on events
3. **Scheduler** — 30s poll loop; fires scheduled sessions from DB
4. **WebSocket server** (`ws::serve()`) — TCP listener on port 7878

All share state via `Arc<Mutex<...>>` and the broadcast channel.

## Event Replay & Sequencing

- Events stored with sequential `seq` (SQLite AUTOINCREMENT)
- WS clients send `attach` with `since` parameter
- Server replays from `since+1` to latest from DB
- Live events append to DB and broadcast to all connected clients
- `seq=0` for synthetic events (session_list_changed) — not persisted

## File Paths

**Core architecture:**
- `/src/main.rs` (492 lines) — Entry, tokio tasks, session lifecycle
- `/src/ws.rs` (1540 lines) — WebSocket server, message dispatch, event replay
- `/src/claude.rs` (240 lines) — Claude PTY spawning, JSON parsing
- `/src/hook.rs` (200 lines) — Unix socket, approval pending/response

**Configuration & data:**
- `/src/config.rs` — TOML loading, QR pairing, TLS setup
- `/src/db.rs` (300+ lines) — SQLite schema, CRUD ops, secret encryption
- `/src/notify.rs` — ntfy/Telegram publishers

**Mobile entry:**
- `/mobile/src/App.tsx` — Root; navigation setup
- `/mobile/src/hooks/useNavettedWS.ts` — All state management & commands
