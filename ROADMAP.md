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

### Sprint 4 — Multi-provider / agent-agnostic support
- `command` field accepted in `run` WS message; daemon resolves binary (`claude`, `codex`, `gemini`, `aider`, custom)
- Mobile: horizontal agent picker pills (claude / codex / gemini / aider) in session-start UI
- Falls back to `CLAUDE_BIN` env var or `claude` when no command specified

### Sprint 5 — Visual diff review on mobile
- `DiffView.tsx`: collapsible unified diff viewer with +/- line coloring and hunk headers
- Integrated into expanded tool_result blocks in ChatView

### Sprint 6 — Session dashboard
- `SessionCard.tsx`: card with agent label, prompt preview, status dot, elapsed time (live tick)
- `MainScreen`: horizontal FlatList of cards when sessions > 1; falls back to pill row for single session
- `hasPendingApproval` highlights active session card yellow

### Token usage tracking (P2)
- `SessionEntry` gains `input_tokens`/`output_tokens`/`cache_read_tokens` as `Arc<AtomicU64>`
- `claude.rs` parses `usage` fields from JSON stream and accumulates into atomics
- `get_token_usage` WS message returns live counts; `sessions_snapshot` includes totals
- `SessionCard` shows `↑N ↓N` token summary when counts > 0

### Installed skills browser (P2)
- `list_skills` WS message reads `~/.claude/skills/` subdirs, extracts description from `SKILL.md`
- `SkillsScreen.tsx`: FlatList modal (name, description, folder icon, refresh button)
- Accessible via Settings → Browse Skills

### Session history replay (P2)
- `db.rs`: `get_session_list()` and `get_session_events()` query past sessions from SQLite
- `list_past_sessions` / `get_session_history` WS messages
- `SessionHistoryScreen.tsx`: two-panel viewer (session list + read-only event replay)
- Accessible via Settings → Session History

### Scheduled / cron sessions (P2)
- `scheduled_sessions` SQLite table; 30s polling scheduler task in daemon
- `schedule_session` / `cancel_scheduled_session` / `list_scheduled_sessions` WS messages
- `ScheduleScreen.tsx`: +1h/+4h/+8h/+24h quick buttons + custom hours input, pending list with cancel
- Accessible via Settings → Scheduled Sessions

---

## Next Up

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
| Directory selector does not work | Mobile / session start | Fixed — server sends plain {type:'dir_listing'} without seq/event wrapper; added top-level handler in ws.onmessage before seq check |

---

## Backlog

| Feature | Priority | Notes |
|---|---|---|
| Token usage tracking per session | ~~P2~~ **shipped** | SessionCard shows live ↑/↓ counts; get_token_usage WS message |
| Scheduled / cron sessions | ~~P2~~ **shipped** | ScheduleScreen with quick buttons; 30s daemon polling loop |
| Session recording + replay | ~~P2~~ **shipped** | SessionHistoryScreen reads past events from SQLite |
| Installed skills browser | ~~P2~~ **shipped** | SkillsScreen lists ~/.claude/skills/ with descriptions |
| Telegram notification channel | P3 | ntfy.sh covers the use case; Telegram would broaden reach |
| Voice input (Whisper on-device) | P3 | Moshi has this; reduces friction for mobile prompt authoring |
| Android `.aab` release build + signing | P3 | Current APK is debug-signed; need Play Store-ready build |
| iOS App Store submission | P3 | Requires Apple Developer account and TestFlight distribution |

---

## Competitive Context (April 2026)

| Competitor | Self-hosted | No subscription | Android | Multi-agent | Diff review | Watch |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **clauded** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Anthropic Remote Control | ❌ | ❌ ($100+/mo) | ✅ | ❌ | ❌ | ❌ |
| AgentsRoom | ❌ | ❌ | ✅ | ✅ | Partial | ❌ |
| Nimbalyst | ❌ | ❌ | ❌ | Partial | ✅ | ❌ |
| ClawTab | Partial | ✅ (MIT) | ❌ | ✅ | ❌ | ❌ |
| AgentApprove | Partial | ❌ | ❌ | ✅ | ❌ | ✅ |
| Moshi | ✅ (SSH) | ✅ | ❌ | ✅ (SSH) | ❌ | ✅ (webhook) |

**clauded's moat**: The only full-featured option requiring no cloud relay, no vendor subscription, and no Apple Push/FCM account. Works with raw API keys, Bedrock, and Vertex. Anthropic Remote Control's $100+/mo paywall and API-key exclusion are the wedge.
