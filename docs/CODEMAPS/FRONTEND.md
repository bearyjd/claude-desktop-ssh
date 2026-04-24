# Frontend Codemap (React Native)

**Last Updated:** 2025-04-23  
**Entry Points:** `mobile/src/App.tsx`, `mobile/src/hooks/useNavettedWS.ts`

## Component Hierarchy

```
App.tsx (root)
├─ Navigation (bottom tabs / drawer)
├─ ConnectScreen
│  └─ QR scanner, manual input
├─ MainScreen
│  ├─ SessionList dropdown
│  ├─ ChatView (message rendering)
│  ├─ InputBar (text + approval buttons)
│  ├─ FilePreview (for read_file results)
│  └─ PendingApprovals (approval card)
├─ LockScreen (biometric / PIN)
├─ SettingsScreen
│  ├─ Connection details
│  ├─ Notification config
│  ├─ Device management
│  └─ Approval policies
├─ FileBrowserScreen
│  └─ Directory listing, file read/write
├─ PromptLibraryScreen
│  └─ Save/load/manage prompts
├─ SecretsScreen
│  └─ Add/delete encrypted keys
├─ ScheduleScreen
│  └─ Create scheduled sessions
├─ SkillsScreen
│  └─ List available tools
├─ SessionHistoryScreen
│  └─ Past sessions browser
└─ ContainersScreen
   └─ Available distrobox containers
```

## Core Hook: useNavettedWS

**File:** `/mobile/src/hooks/useNavettedWS.ts`

**Purpose:** Central state & command management. All WebSocket communication flows through this hook.

**Key State:**
```typescript
interface UseNavettedWSResult {
  // Connection
  status: ConnectionStatus  // 'disconnected' | 'connecting' | 'connected' | 'error'
  reconnecting: boolean
  reconnectCount: number

  // Sessions
  sessions: SessionInfo[]
  activeSessionId: string | null
  sessionStatus: SessionStatus  // 'idle' | 'running'
  
  // Events & approvals
  events: EventFrame[]
  pendingApprovals: PendingApproval[]
  lastSeq: number
  viewStartSeq: number
  sessionHistory: Record<string, EventFrame[]>
  
  // Resources
  savedPrompts: SavedPrompt[]
  secrets: SecretEntry[]
  scheduledSessions: ScheduledSessionInfo[]
  devices: DeviceEntry[]
  approvalPolicies: ApprovalPolicy[]
  skills: SkillInfo[]
  containers: ContainerInfo[]
  pastSessions: PastSessionInfo[]
  notifyConfig: NotifyConfig | null
  testNotificationResult: 'idle' | 'sent' | 'failed'
  
  // Methods (all are fire-and-forget or callback-based)
  connect: (config: ServerConfig) => void
  disconnect: () => void
  decide: (tool_use_id: string, allow: boolean) => void
  batchDecide: (allow: boolean) => void
  run: (prompt, container?, skip?, workDir?, command?, injectSecrets?) => void
  kill: (sessionId?) => void
  sendInput: (text, sessionId?) => void
  // ... 20+ more commands
}
```

## Message Rendering (ChatView.tsx)

Renders `EventFrame[]` in chronological order:

```typescript
type EventType = 
  | 'session_started'
  | 'claude' (text, tool_use, tool_result)
  | 'approval_pending' / 'approval_granted' / 'approval_denied'
  | 'session_ended'
  | 'file_content' / 'file_listing' / 'file_write_result'
  | ...
```

Each event type has a dedicated rendering component.

## File Structure

| Path | Purpose |
|------|---------|
| `mobile/src/App.tsx` | Root, navigation setup |
| `mobile/src/hooks/useNavettedWS.ts` | Central WS hook (all state/commands) |
| `mobile/src/types/index.ts` | All TypeScript interfaces |
| `mobile/src/screens/` | Screen components (Connect, Main, etc.) |
| `mobile/src/components/` | Reusable UI (ChatView, InputBar, etc.) |
| `mobile/src/utils/` | Helpers (formatting, validation, crypto) |
| `mobile/package.json` | Expo, React Native, dependencies |
| `mobile/app.json` | Expo config |

## Key Data Types

```typescript
// Server config for pairing
interface ServerConfig {
  host: string
  port: number
  token: string
  tls: boolean
}

// Active session info
interface SessionInfo {
  session_id: string
  prompt: string
  container?: string
  command?: string
  started_at: number
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
}

// Approval card
interface PendingApproval {
  tool_use_id: string
  tool_name: string
  session_id: string
  input: Record<string, any>
  created_at: number
  expires_at: number
}

// Broadcast event
interface EventFrame {
  seq: number
  ts: number
  type: string
  [key: string]: any  // Event-specific payload
}

// Saved prompt template
interface SavedPrompt {
  id: string
  title: string
  body: string
  tags: string[]
  created_at: number
  updated_at: number
}

// Encrypted secret
interface SecretEntry {
  name: string
  created_at: number
  updated_at: number
  // value not sent to app — server only
}

// Paired device
interface DeviceEntry {
  device_id: string
  name: string
  paired_at: number
  last_seen: number
  revoked: boolean
}

// Auto-approval rule
interface ApprovalPolicy {
  tool_name: string
  action: 'prompt' | 'allow' | 'deny'
  created_at: number
  updated_at: number
}
```

## Dependencies (package.json)

| Package | Purpose |
|---------|---------|
| `expo` v52 | React Native framework |
| `react-native` 0.76.9 | Mobile runtime |
| `@react-navigation/native` | Navigation (tabs/drawer) |
| `expo-secure-store` | Encrypted token storage |
| `expo-camera` | QR code scanning |
| `expo-clipboard` | Copy to clipboard |
| `expo-crypto` | UUID generation |
| `expo-local-authentication` | Biometric unlock |
| `crypto-js` | HMAC-SHA256 (token auth fallback) |
| `@react-native-async-storage/async-storage` | Persistent state |
| `expo-av` | Audio/video (future) |
| `expo-speech-recognition` | Voice input (future) |

## Connection Flow

1. **Pairing:**
   - User runs `navetted --pair` on workstation
   - QR code appears on terminal
   - Mobile scans QR → decodes to ServerConfig (host, port, token, tls)
   - Stores token in `expo-secure-store`

2. **Connection (useNavettedWS.connect):**
   - Retrieve token from secure storage
   - Open WebSocket (ws:// or wss://)
   - Send `hello` message with token (HMAC-SHA256 constant-time verify on server)
   - Server responds with `hello_accepted` or `hello_rejected`
   - Send `attach` with `since=LAST_SEQ_KEY` from AsyncStorage
   - Server replays events from DB
   - Enter live loop: receive events, dispatch commands

3. **Auto-reconnect:**
   - Connection drop → exponential backoff
   - Retries up to max; shows "Reconnecting..." UI
   - On success, replay events since `lastSeq`

## Screen Examples

**MainScreen (primary UI):**
- Session dropdown (switch between running sessions)
- ChatView (messages + approvals)
- InputBar (text input + send button)
- Approval cards (allow/deny buttons)
- File preview (when server sends file_content)

**ConnectScreen:**
- QR scanner or manual host/port entry
- Token input field
- Connect button → calls `connect(serverConfig)`

**FileBrowserScreen:**
- Directory listing (calls `listDir(path)`)
- File click → `readFile(path)` or `writeFile(path, content)`
- Breadcrumb navigation

**SecretsScreen:**
- List secrets from server (names only; values never sent)
- Add secret → `setSecret(name, value)` (transmitted over WSS)
- Delete secret → `deleteSecret(name)`

## File Paths

- `/mobile/src/App.tsx` — Root component
- `/mobile/src/hooks/useNavettedWS.ts` — All state + commands (~600 lines)
- `/mobile/src/types/index.ts` — TypeScript interfaces
- `/mobile/src/screens/` — Screen components
- `/mobile/src/components/` — Reusable UI components
- `/mobile/package.json` — Dependencies
