# Dependencies & External Services

**Last Updated:** 2025-04-23

## Rust Crates (Backend)

### Runtime & Async

| Crate | Version | Purpose |
|-------|---------|---------|
| `tokio` | 1.x | Async runtime (rt-multi-thread, process, sync, net, time, macros) |
| `futures-util` | 0.3 | Future combinators (sink, std) |
| `tokio-tungstenite` | 0.24 | WebSocket over Tokio |
| `tokio-rustls` | 0.26 | TLS for async (used with WebSocket) |

### Serialization

| Crate | Version | Purpose |
|-------|---------|---------|
| `serde` | 1 | Serialize/deserialize framework |
| `serde_json` | 1 | JSON encoding/decoding |
| `toml` | 0.8 | TOML config parsing |
| `base64` | 0.22 | Base64 encoding (QR URI) |

### Cryptography & Security

| Crate | Version | Purpose |
|-------|---------|---------|
| `ring` | 0.17 | AES-256-GCM, HKDF-SHA256, secure random |
| `rustls` | 0.23 | TLS implementation (with ring) |
| `rustls-pemfile` | 2 | PEM certificate parsing |
| `rcgen` | 0.13 | Self-signed cert generation (future) |
| `subtle` | 2 | Constant-time comparison (token auth) |

### Database & Storage

| Crate | Version | Purpose |
|-------|---------|---------|
| `rusqlite` | 0.29 | SQLite bindings (bundled) |

### Process & Terminal

| Crate | Version | Purpose |
|-------|---------|---------|
| `portable-pty` | 0.8 | PTY management (cross-platform) |

### Utilities

| Crate | Version | Purpose |
|-------|---------|---------|
| `anyhow` | 1 | Error handling with context |
| `tracing` | 0.1 | Structured logging |
| `tracing-subscriber` | 0.3 | Log formatting (env-filter) |
| `rand` | 0.8 | RNG (session IDs, nonces) |
| `reqwest` | 0.12 | HTTP client (ntfy notifications, TLS) |
| `qrcode` | 0.14 | QR code generation (pairing) |
| `local-ip-address` | 0.6 | Detect local IP for QR |
| `hex` | 0.4 | Hex encoding/decoding |

## JavaScript/TypeScript Dependencies (Mobile)

### Core Framework

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | 52.x | React Native framework + managed services |
| `react` | 18.3.1 | UI library |
| `react-native` | 0.76.9 | Mobile runtime |

### Navigation

| Package | Version | Purpose |
|---------|---------|---------|
| `@react-navigation/native` | 6.1.17 | Core navigation |
| `@react-navigation/bottom-tabs` | 6.5.20 | Tab navigator |
| `react-native-screens` | 4.4 | Native screen containers |
| `react-native-gesture-handler` | 2.20.2 | Gesture support |
| `react-native-safe-area-context` | 4.12 | Safe area insets |

### Native Modules (Expo SDK)

| Package | Version | Purpose |
|---------|---------|---------|
| `expo-camera` | 16.x | Camera access (QR scanning) |
| `expo-crypto` | 14.x | UUID generation, crypto utils |
| `expo-secure-store` | 14.x | Encrypted storage (token) |
| `expo-local-authentication` | 15.x | Biometric unlock (face/fingerprint) |
| `expo-clipboard` | 7.x | Copy to clipboard |
| `expo-haptics` | 14.x | Vibration feedback |
| `expo-av` | 15.x | Audio/video playback (future) |
| `expo-speech-recognition` | 3.1.2 | Voice input (future) |
| `expo-status-bar` | 2.x | Status bar control |
| `expo-asset` | 11.x | Asset management |

### Cryptography & Storage

| Package | Version | Purpose |
|---------|---------|---------|
| `crypto-js` | 4.2 | HMAC-SHA256 (token auth fallback) |
| `@react-native-async-storage/async-storage` | 1.23.1 | Persistent key-value store |

### Testing (Dev Dependencies)

| Package | Version | Purpose |
|---------|---------|---------|
| `jest` | 30.3 | Test runner |
| `jest-expo` | 52.x | Expo test preset |
| `@testing-library/react-native` | 13.3 | React Native testing utilities |
| `react-test-renderer` | 18.3.1 | Snapshot testing |

### Build & Type Tools (Dev)

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | 5.3 | TypeScript compiler |
| `@types/react` | 18.3 | React type definitions |
| `@types/jest` | 30.x | Jest type definitions |
| `@types/crypto-js` | 4.2 | crypto-js types |
| `@babel/core` | 7.24 | JavaScript transpiler |

## External Services

### Notifications

| Service | Purpose | Config |
|---------|---------|--------|
| **ntfy.sh** | HTTP-based push notifications | Base URL + topic in config.toml |
| **Telegram Bot** | Telegram message delivery | Bot token + chat ID in config |

**Usage:** When approval_pending/expired events occur, daemon POSTs to ntfy and sends Telegram message.

### Optional TLS

| Service | Purpose |
|---------|---------|
| **Self-signed cert (rcgen)** | HTTPS for WebSocket (optional) |
| **Let's Encrypt** | Production TLS (user-provided cert/key paths) |

## Installation & Building

### Backend (Rust)

```bash
# Build both binaries (navetted + navetted-hook)
cargo build --release

# Run tests
cargo test

# Lint
cargo clippy -- -D warnings

# Format
cargo fmt

# Security audit
cargo audit
cargo deny check
```

### Frontend (React Native / Expo)

```bash
cd mobile

# Install dependencies
npm install

# Start dev server
npx expo start

# Build for Android
npx expo run:android
eas build --platform android --profile preview

# Build for iOS
npx expo run:ios
eas build --platform ios

# Run tests
npm test
```

## Vendored Dependencies

Rust vendored crates live in `/vendor/` (committed for offline Flatpak builds).

```bash
cargo vendor
# Creates vendor/ directory with all crates
```

Flatpak build uses vendored crates; normal `cargo build` uses registry.

## Security Scanning

### Backend

```bash
# Check for CVEs in dependencies
cargo audit

# Check license compliance and advisory policies
cargo deny check

# Show dependency tree
cargo tree
cargo tree -d  # duplicates only
```

### Frontend

```bash
# npm audit (built into npm 6+)
npm audit

# Fix vulnerabilities
npm audit fix
```

## Version Pinning

- **Backend:** Cargo.toml uses `=` for critical deps (ring, tokio, portable-pty)
- **Frontend:** package-lock.json committed to ensure reproducible builds
- **Mobile builds:** Use EAS (Expo Application Services) for consistent CI builds

## File Paths

- `/Cargo.toml` — Rust dependencies
- `/Cargo.lock` — Lockfile (committed)
- `/vendor/` — Vendored crates (for Flatpak)
- `/mobile/package.json` — npm dependencies
- `/mobile/package-lock.json` — npm lockfile (committed)
- `~/.config/navetted/config.toml` — Notification endpoints, TLS paths

## Performance Notes

- **Tokio multi-threaded runtime:** Optimal for I/O-heavy workloads (PTY, WS, DB)
- **SQLite WAL mode:** Allows concurrent readers while writer is active
- **Broadcast channel (4096 slots):** Sized for up to 4096 queued events per subscriber
- **Portable-pty:** Ensures PTY works on Linux, macOS, Windows (WSL)
- **Token counts via Atomic:** No locks; read/update via CAS
