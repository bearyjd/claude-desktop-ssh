# navette

Your workstation, from your pocket.

navette is a mobile-first interface for Claude Code. The navette
app runs on your phone. navetted runs on your workstation and
speaks WebSocket to the app over Tailscale or any network.

## Architecture

```
phone (navette) ←── WebSocket :7878 ───→ workstation (navetted)
                                                ↕
                                         Claude Code CLI
```

## Install

### navetted (workstation daemon)

```bash
cargo install navetted
```

### navette (mobile app)

App Store / Play Store links — add when published.

## Usage

On your workstation:

```bash
navetted --port 7878
```

On your phone:

Open navette, enter your workstation address, connect.

## License

AGPL-3.0-only — © 2025 Entrevoix, Inc.
