# claude-desktop-ssh

A multi-device native client for [Claude Code](https://www.anthropic.com/claude-code) — built for developing on the go.

Raw Termux+SSH works but the UX is painful: tiny keyboard, no context on reconnect, tool approvals buried in terminal noise. This project wraps Claude Code CLI in a persistent daemon with a WebSocket resume protocol and a React Native Android app. Tool approvals become swipeable cards. Disconnecting and reconnecting replays what you missed.

## Architecture

```
[claude --output-format stream-json]
         ↑ PTY (events stream as JSON lines)
    [clauded — Rust/Tokio daemon]
         ├── PreToolUse hook binary (clauded-hook)
         │     └── Unix socket: $XDG_RUNTIME_DIR/clauded/hook.sock
         │           blocks claude until user decides
         ├── SQLite: ~/.local/share/clauded/events.db
         │     WAL mode, 10k event retention, 64KB max payload
         ├── WebSocket: 0.0.0.0:7878
         │     token auth → attach+replay → live broadcast
         │     receives approval decisions from clients
         └── stdin fallback: y/n <tool_use_id>

    [React Native Android app]
         ├── ConnectScreen: host / port / token → AsyncStorage
         ├── MainScreen: event feed + pending approval cards
         └── ApprovalCard: swipe right=allow, left=deny → WS input message
```

## How the hook gate works

Claude emits events via `--output-format stream-json` through a PTY. Before executing each tool, Claude Code invokes the `PreToolUse` hook subprocess (`clauded-hook`).

`clauded` writes hook config to `~/.claude/settings.local.json` before spawning Claude (atomic tempfile + rename):

```json
{
  "permissions": {
    "allow": ["Bash(*)", "Write(*)", "Read(*)", "Edit(*)", ...]
  },
  "hooks": {
    "PreToolUse": [{"matcher": ".*", "hooks": [{"type": "command", "command": "/path/to/clauded-hook"}]}]
  }
}
```

The `permissions.allow` list pre-approves tools so Claude doesn't prompt interactively — the hook is the sole approval gate.

Hook protocol:
1. `clauded-hook` reads tool call JSON from stdin (`tool_use_id`, `tool_name`, `tool_input`)
2. Connects to daemon Unix socket (500ms timeout — fail closed on miss)
3. Sends `{"tool_use_id": "...", "tool_name": "...", "input": {...}}` + EOF
4. Blocks until daemon responds `{"decision": "allow"}` or `{"decision": "deny"}`
5. Exit 0 → allow, exit 2 → deny. Every error path exits 2.

Race handling: the assistant event containing the `tool_use` block is broadcast over WebSocket before the hook connects to the socket (~20ms later). A `BufferedDecisions` map absorbs WS approvals that arrive before the hook registers — the hook drains this buffer on connect.

## WebSocket protocol

### Authentication

```json
// client → server
{"type": "hello", "token": "shared-secret", "client_id": "my-phone"}

// server → client
{"type": "welcome", "client_id": "my-phone"}
// or
{"type": "rejected", "reason": "bad token"}
```

### Replay + live stream

```json
// client → server
{"type": "attach", "since": 0}

// server → client: replay seq > 0, then live
{"seq": 1, "ts": 1713380000.1, "event": {...}}
{"type": "caught-up", "seq": 17}
{"seq": 18, ...}  // live from here
```

`since` is exclusive — pass the last `seq` you saw to resume without gaps.

### Tool approval

```json
// client → server (swipe right in app, or any time after seeing the assistant event)
{"type": "input", "tool_use_id": "toolu_abc123", "decision": "y"}
// or "n" to deny
```

First client to send wins. Concurrent tool calls use independent `tool_use_id` keys.

## Configuration

`~/.config/clauded/config.toml` (created `chmod 600` on first run):

```toml
token = "randomly-generated-32-char-token"
ws_port = 7878
```

The token is generated randomly on first launch. Copy it into the Android app's Connect screen.

## Building

```bash
cargo build --release
# produces: target/release/clauded  target/release/clauded-hook
# both binaries must be in the same directory
```

## Running

```bash
clauded "refactor the auth module"
```

clauded blocks until Claude exits. Events stream to SQLite and WebSocket in real time. Approve tool calls from the Android app or by typing `y <tool_use_id>` in the terminal.

**Stdin fallback** (useful without a WS client):
```
y toolu_01XUfSMihoL3EquzSZsEQxqR
n toolu_01XUfSMihoL3EquzSZsEQxqR
```

## Android app

Built with Expo (bare workflow), targeting Android.

```bash
cd mobile
npm install
npx expo run:android   # or: npx expo start → Expo Go
```

Connect screen saves host/port/token to AsyncStorage. The main screen shows:
- Pending approval cards (swipe right = allow, left = deny)
- Live event feed (color-coded by type: tool call, assistant text, result)
- Connection status dot + disconnect button

## Network

Use [Tailscale](https://tailscale.com). clauded binds `0.0.0.0:7878` — Tailscale makes it reachable from your phone's Tailscale IP with no open ports. No cloud relay.

## Event storage

- DB: `~/.local/share/clauded/events.db` (SQLite WAL)
- Schema: `events(seq INTEGER PK AUTOINCREMENT, ts REAL, json TEXT)`
- Retention: 10,000 most recent events (enforced every 100 inserts)
- Max payload: 64KB inline; larger truncated with `{"truncated": true, "full_size_bytes": N}`

## Status

Core implementation complete and smoke-tested end-to-end:

- [x] PTY spawn with hook settings injection
- [x] `clauded-hook` binary — blocks, correlates by `tool_use_id`, fail-closed
- [x] Unix socket IPC with buffered decision race fix
- [x] SQLite event log with WAL + retention
- [x] WebSocket server — auth, replay, live broadcast, bidirectional approvals
- [x] Stdin fallback approvals
- [x] React Native Android app — connect, event feed, swipeable approval cards
- [ ] Approval timeout (auto-deny after N seconds)
- [ ] Push notifications (ntfy.sh or FCM)
- [ ] Tauri desktop app
- [ ] CI release pipeline (GitHub Actions, `linux/amd64` + `linux/arm64`)

## Requirements

- [Claude Code](https://www.anthropic.com/claude-code) installed and authenticated
- [Tailscale](https://tailscale.com) on all devices
- Rust toolchain (1.75+)
- Node.js + npm (for the Android app)
- Android SDK / Expo environment (for the Android app)
