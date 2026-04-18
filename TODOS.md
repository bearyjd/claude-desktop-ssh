# TODOS

## Pre-timeout approval warning
**What:** Before the 1800s approval auto-deny fires, broadcast a warning event at T-5min so the user knows time is running out.
**Why:** Without a warning, the user returns at minute 31 to find their session DEAD with no explanation. A countdown gives them a chance to approve.
**Pros:** Prevents frustrating surprise kills; ~5 extra lines of Tokio timer code.
**Cons:** None significant. Small added complexity.
**Context:** The approval timeout is `[session] approval_timeout_seconds = 1800` in config.toml. Add a second timer at `timeout - 300` seconds that broadcasts `{"type":"approval_warning","remaining_s":300,"session_id":"...","tool_name":"..."}`. Client shows a countdown UI.
**Depends on:** Approval timeout implementation (Phase 1)

---

## Session TTL / garbage collection
**What:** Add a `clauded gc` command (or auto-GC on startup) that deletes DEAD and DONE session DBs older than 30 days.
**Why:** Session DBs accumulate indefinitely in `~/.local/share/clauded/`. Not a problem at 10 sessions; becomes disk noise at 200+.
**Pros:** Keeps the data directory clean; simple CLI command.
**Cons:** Accidental deletion if someone wants to review old sessions. Mitigate with a `--dry-run` flag.
**Context:** Each session is one SQLite DB at `~/.local/share/clauded/{session-id}.db`. The `meta` table has `created_at` and `status`. GC query: `SELECT db_path FROM sessions WHERE status IN ('DEAD','DONE') AND created_at < (now - 30days)`.
**Depends on:** Session meta table implementation

---

## Evaluate ntfy.sh before committing to FCM
**What:** 30-minute spike: can ntfy.sh deliver push notifications to the Android app over Tailscale?
**Why:** FCM requires a Firebase project, server SDK, and Google Play Services on the device (4-8h setup, Google dependency). ntfy.sh is open-source, self-hostable, has a native Android app, and works over Tailscale. Could replace FCM entirely for a personal tool.
**Pros:** Eliminates Firebase dependency; self-hosted keeps everything local; much simpler setup.
**Cons:** ntfy.sh Android app must be installed separately (not bundled with clauded client). If the React Native app handles push natively, ntfy.sh requires a different integration path.
**Context:** Run `ntfy.sh` on the home machine (or use ntfy.sh SaaS), subscribe from Android, test that a message sent from clauded appears as a push notification when the app is backgrounded over Tailscale.
**Depends on:** Phase 2 (Android app) started; Tailscale setup complete

---

## ARM64 Linux binary in CI (build now)
**What:** Add `linux/arm64` cross-compilation to the GitHub Actions release workflow.
**Why:** Trivial to add now (5 lines of YAML), painful after the first release when users request it. The home machine may eventually be ARM (e.g., Raspberry Pi as a server).
**Pros:** Future-proof; zero implementation risk; uses `cross` tool for Rust cross-compilation.
**Cons:** Slightly longer CI runs.
**Context:** Add to `.github/workflows/release.yml` when creating the CI pipeline. Use `cross build --target aarch64-unknown-linux-gnu --release`. Add the ARM64 binary to the GitHub Release assets alongside the amd64 binary.
**Depends on:** CI pipeline creation (Phase 1)
