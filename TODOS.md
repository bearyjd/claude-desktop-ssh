# TODOS

## Approval timeout (auto-deny)
**What:** After N seconds with no decision, automatically deny the pending approval and broadcast a timeout event.
**Why:** Without a timeout, a blocked tool call hangs the session indefinitely if the user never responds.
**Approach:** When the hook registers in `pending`, spawn a `tokio::time::sleep` task. On expiry, remove the entry and send `Decision::Deny`. Broadcast `{"type":"approval_timeout","tool_use_id":"...","tool_name":"..."}` to WS clients. Default timeout: 1800s (configurable in config.toml).
**Bonus:** Add a warning event at T-5min so the mobile app can show a countdown.

---

## Push notifications
**What:** Notify the phone when a tool approval is pending (app is backgrounded).
**Options:**
- **ntfy.sh** — open-source, self-hostable, native Android app, works over Tailscale. 30-min spike to evaluate. No Google dependency.
- **FCM** — requires Firebase project + Google Play Services. More work, broader device support.
**Recommended:** Try ntfy.sh first. Run `ntfy serve` on the home machine, subscribe from Android, have clauded POST when a `PreToolUse` hook fires.

---

## Pre-timeout approval warning
**What:** Before auto-deny fires, broadcast a warning event at T-5min.
**Why:** User returns at minute 31 to find session dead with no explanation. Countdown gives them a chance to respond.
**Approach:** Second timer at `timeout - 300s` broadcasts `{"type":"approval_warning","remaining_s":300,"tool_use_id":"...","tool_name":"..."}`. Mobile app shows a countdown badge on the approval card.
**Depends on:** Approval timeout implementation

---

## Multiple sessions / session management
**What:** Support spawning and attaching to multiple named Claude sessions.
**Current state:** clauded runs one session per process (prompt as argv[1]). The DB and WS are per-process.
**Full design:** session spawn/attach protocol, per-session SQLite DBs at `~/.local/share/clauded/{session-id}.db`, session state machine (IDLE → RUNNING → PENDING_APPROVAL → DONE/DEAD), restart on unexpected exit.
**Scope:** Large. Not needed for solo use where one session at a time is fine.

---

## Tauri desktop app
**What:** Three-panel desktop client: sessions / conversation / diff viewer.
**Why:** Better ergonomics for code review on a large screen than the mobile app.
**Approach:** Scaffold from hermes-desktop, connect to WS same as mobile app.

---

## CI release pipeline
**What:** GitHub Actions on tag push → `cargo build --release` → GitHub Release with binaries.
**Targets:** `linux/amd64` (native) and `linux/arm64` (cross via `cross`).
**APK:** Expo EAS build or local `npx expo build:android` for the Android app.

---

## Session TTL / garbage collection
**What:** `clauded gc` command (or auto-GC on startup) to delete old session DBs.
**Why:** Not needed now; becomes disk noise at 100+ sessions.
**Approach:** Delete `~/.local/share/clauded/{session-id}.db` for sessions with `status IN ('DEAD','DONE') AND created_at < now - 30days`. Add `--dry-run` flag.
**Depends on:** Multiple sessions implementation
