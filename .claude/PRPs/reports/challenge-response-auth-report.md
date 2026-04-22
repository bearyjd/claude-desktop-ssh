# Implementation Report: Challenge-Response Auth

## Summary
Replaced plaintext token transmission with HMAC-SHA256 challenge-response authentication. The token never crosses the wire for v2 clients. Legacy v1 clients (sending `token` in hello) remain supported via backward-compatible constant-time compare.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Small-Medium |
| Confidence | 8/10 | 9/10 |
| Files Changed | 3 | 3 (+ Cargo.lock, package-lock.json auto-generated) |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | New auth protocol in ws.rs | Done | hello v2 → challenge nonce → HMAC response → verify |
| 2 | Backward compatibility | Done | Legacy hello with token field still accepted (version 1) |
| 3 | Tests | Done | 4 tests: success, wrong HMAC, invalid hex, legacy token |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis (Rust) | Pass | clippy zero warnings |
| Static Analysis (TS) | Pass | tsc --noEmit clean |
| Unit Tests | Pass | 41 tests (4 new) |
| Build | Pass | cargo check clean |
| Integration | N/A | Requires running daemon + mobile app |

## Files Changed

| File | Action | Lines |
|---|---|---|
| `Cargo.toml` | UPDATED | +1 (hex dependency) |
| `src/ws.rs` | UPDATED | +75 (challenge flow, helpers, tests) |
| `mobile/src/hooks/useNavettedWS.ts` | UPDATED | +9 (challenge handler, imports) |
| `mobile/package.json` | UPDATED | +2 (crypto-js, @types/crypto-js) |

## Deviations from Plan
- Added `hex` crate for nonce encoding/HMAC hex conversion (not mentioned in plan but necessary)
- Used `crypto-js` on mobile instead of `expo-crypto` (expo-crypto lacks HMAC support)
- Added 4 tests instead of 3 (extra test for invalid hex input)

## Issues Encountered
None

## Tests Written
| Test | Coverage |
|---|---|
| `challenge_response_success` | HMAC roundtrip with correct token |
| `challenge_response_wrong_hmac` | Reject HMAC signed with wrong token |
| `challenge_response_invalid_hex` | Reject non-hex HMAC string |
| `legacy_token_auth` | Constant-time token compare (v1 compat) |

## Next Steps
- [ ] Code review via `/code-review`
- [ ] Create PR via `/prp-pr`
