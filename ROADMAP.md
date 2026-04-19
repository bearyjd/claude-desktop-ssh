# clauded Roadmap

Self-hosted, subscription-free AI agent remote control — a Rust PTY daemon + React Native mobile client.

**Positioning**: The remote control layer for developers who won't route their sessions through someone else's server. Works with any Claude API key, no Anthropic Max subscription required, zero cloud relay.

---

## Shipped

### Phase 1 — Approval timeout + auto-deny
- Configurable TTL (`approval_ttl_secs`, `approval_warn_before_secs`) in `clauded.toml`
- Auto-deny on expiry; `approval_pending`, `approval_warning`, `approval_expired` events
- Countdown timer in `ApprovalCard` with warning color at ≤30s

### Phase 2 — Push notifications via ntfy.sh
- `NotifyClient` in `src/notify.rs` (fire-and-forget, errors logged not propagated)
- Notifies on: approval needed, approval expiring, auto-denied, session ended
- Self-hostable ntfy server supported; no Apple Push/FCM account needed
- Settings screen with topic display and ntfy deep-link

### Phase 3 — Multi-session daemon
- `SessionRegistry`: `Arc<Mutex<HashMap<SessionId, SessionEntry>>>`
- `max_concurrent_sessions` cap (default 4)
- Per-session `session_id` injected into all broadcast events and DB rows
- `kill_session`, `list_sessions`, `session_list_changed` WS messages
- Mobile: horizontal pill switcher; ChatView filters by `activeSessionId`

---

## Next Up

### Sprint 4 — Multi-provider / agent-agnostic support *(P0)*

Every direct competitor (AgentsRoom, ClawTab, AgentApprove, Nimbalyst, Warp) supports multiple agent CLIs. clauded's PTY daemon is already agent-agnostic at the architecture level — Claude Code is just a subprocess. Surfacing this at the config/UI level unlocks 3–5× the addressable market.

**Scope:**
- Daemon: configurable `command` in session start message (today hardcoded to `claude`)
- Support: Codex (`openai codex`), Gemini CLI (`gemini`), Aider (`aider`), OpenCode
- Mobile: session-start UI lets user pick agent or enter custom command
- Hook binary remains unchanged (PTY-level intercept is agent-agnostic)

### Sprint 5 — Visual diff review on mobile *(P0)*

The most-cited missing feature in comparable tools. When an agent modifies files, the approval decision requires seeing what changed — raw terminal ANSI is unreadable on a small screen.

**Scope:**
- Parse unified diff blocks from the PTY stream
- `DiffView` component: swipeable file-by-file, red/green line highlighting
- Integrate into `ApprovalCard` when tool is `Write`/`Edit`/`MultiEdit`
- Full-screen expandable diff viewer

### Sprint 6 — Session dashboard *(P1)*

Multi-session support exists architecturally; the UX needs a board-level view. Flat session list is insufficient when running 3+ parallel sessions.

**Scope:**
- Card-based dashboard: session status (running / waiting-approval / blocked / done), active file, elapsed time, agent type
- Replace or supplement horizontal pill row with a scrollable card grid
- Status color-coding; tap card to switch active session

### Sprint 7 — Apple Watch approval companion *(P1)*

AgentApprove is the only current tool with watchOS support — it's a standout differentiator. Permit/deny directly from the watch face (no phone unlock) is uniquely compelling for the "AFK and need to unblock an agent" scenario.

**Scope:**
- WatchKit companion target (or React Native Watch bridge)
- Push approval-pending payloads to watch via paired iOS app
- Single-glance: tool name, truncated input, Permit / Deny actions
- Complication showing count of pending approvals

### Sprint 8 — Mosh transport option *(P1)*

WebSocket drops on network change (WiFi → cellular, subway tunnels, sleep). Moshi and Blink Shell users consistently cite mosh resilience as a key advantage for mobile terminal use. clauded sessions should survive network transitions.

**Scope:**
- Mosh server mode in daemon (UDP-based, roaming-aware)
- React Native client: mosh transport toggle in connection config
- Graceful fallback to WebSocket when mosh unavailable

---

## Known Bugs

| Bug | Area | Notes |
|---|---|---|
| Directory selector does not work | Mobile / session start | Working directory picker UI is broken; users cannot select which directory Claude runs in |

---

## Backlog

| Feature | Priority | Notes |
|---|---|---|
| Token usage tracking per session | P2 | Input/output/cache tokens per session_id; aggregate view in dashboard |
| Scheduled / cron sessions | P2 | Schedule a session start from mobile; overnight batch workflows |
| Session recording + replay | P2 | Store full PTY stream; replay after the fact for debugging/audit |
| Installed skills browser | P2 | Mobile UI to browse `~/.claude/skills/` on the remote host; show skill name, description, and trigger keywords; read-only view via new WS request/response |
| Telegram notification channel | P3 | ntfy.sh covers the use case; Telegram would broaden reach |
| Voice input (Whisper on-device) | P3 | Moshi has this; reduces friction for mobile prompt authoring |
| Android `.aab` release build + signing | P3 | Current APK is debug-signed; need Play Store-ready build |
| iOS App Store submission | P3 | Requires Apple Developer account and TestFlight distribution |

---

## Competitive Context (April 2026)

| Competitor | Self-hosted | No subscription | Android | Multi-agent | Diff review | Watch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **clauded** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Anthropic Remote Control | ❌ | ❌ ($100+/mo) | ✅ | ❌ | ❌ | ❌ |
| AgentsRoom | ❌ | ❌ | ✅ | ✅ | Partial | ❌ |
| Nimbalyst | ❌ | ❌ | ❌ | Partial | ✅ | ❌ |
| ClawTab | Partial | ✅ (MIT) | ❌ | ✅ | ❌ | ❌ |
| AgentApprove | Partial | ❌ | ❌ | ✅ | ❌ | ✅ |
| Moshi | ✅ (SSH) | ✅ | ❌ | ✅ (SSH) | ❌ | ✅ (webhook) |

**clauded's moat**: The only full-featured option requiring no cloud relay, no vendor subscription, and no Apple Push/FCM account. Works with raw API keys, Bedrock, and Vertex. Anthropic Remote Control's $100+/mo paywall and API-key exclusion are the wedge.
