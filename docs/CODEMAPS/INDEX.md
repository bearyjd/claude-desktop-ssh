# Navette Codemaps

**Last Updated:** 2025-04-23

Navette is a mobile-first remote interface for Claude Code. This codemap documents the architecture, data flow, and key modules.

## Overview

```
Phone (React Native)          Workstation (Rust)
  └─ Expo app  ──WebSocket──> navetted daemon
     - Connect screen          - Hook socket (PTY approval)
     - Main session view       - Claude process (PTY)
     - File browser            - SQLite events DB
     - Prompt library          - Config (TOML)
     - Secrets vault           - Notifications (ntfy/Telegram)
     - Device management
     - Approval policies
```

## Module Codemaps

1. **Architecture** — System diagram, data flow, lifecycle
2. **Backend** — Rust daemon modules, WS protocol, approval flow
3. **Frontend** — React Native screens, hooks, components
4. **Database** — SQLite tables, event schema, encryption
5. **Dependencies** — Crates, npm packages, external services

## Entry Points

**Daemon:**
- `/src/main.rs` — Starts four tokio tasks: hook socket, notifications, scheduler, WebSocket
- `/src/bin/navetted-hook.rs` — PreToolUse hook binary; connects to Unix socket

**Mobile:**
- `/mobile/src/App.tsx` — Root component; navigation setup
- `/mobile/src/hooks/useNavettedWS.ts` — Core WS connection hook (all commands/events)

## Key Design Principles

- **PTY required** — Claude's `isatty()` must return true for PreToolUse hooks
- **Broadcast events** — All activity flows through `tokio::broadcast::channel` (4096-slot buffer)
- **Buffered decisions** — Mobile decisions cache while hooks connect
- **File writes restricted** — Only `~/.claude/` allowed via WS
- **Secrets encrypted** — AES-256-GCM with key from auth token (HKDF-SHA256)
- **Device pairing** — QR code on workstation; token auth over WebSocket
- **Approval policies** — Per-tool allowlist/denylist in SQLite `approval_policy` table
- **Scheduled sessions** — Cron-like scheduling with 30s poll interval

## Build & Test

```bash
# Daemon
cargo build && cargo test && cargo clippy -- -D warnings && cargo fmt

# Mobile
cd mobile && npm install && npx expo start
```

## File Paths

**Daemon modules:**
- `src/main.rs` — Task orchestration, scheduler
- `src/ws.rs` — WebSocket server (1540 lines)
- `src/claude.rs` — Claude PTY management
- `src/hook.rs` — Unix socket approval handler
- `src/db.rs` — SQLite persistence
- `src/config.rs` — TOML config + QR pairing
- `src/notify.rs` — ntfy/Telegram push notifications
- `src/bin/navetted-hook.rs` — Hook binary

**Mobile:**
- `mobile/src/hooks/useNavettedWS.ts` — Core hook (all state/commands)
- `mobile/src/screens/MainScreen.tsx` — Primary session view
- `mobile/src/components/ChatView.tsx` — Message rendering
- `mobile/src/types/index.ts` — All TypeScript interfaces

---

See individual codemaps for architecture, module details, and data flow.
