# Moltbot Channel Integration Plan

## Executive Summary

This document outlines the approach to integrate the Moltboard chat facility as a formal channel in Moltbot (formerly Clawdbot), enabling it to operate alongside WhatsApp, Telegram, iMessage, and other messaging platforms as a first-class communication channel.

## Current Architecture Analysis

### Moltboard Chat Implementation

The Moltboard app has a fully functional chat system:

**Components:**
- [FloatingChat.tsx](../src/components/FloatingChat.tsx) - Floating chat window (draggable, minimizable)
- [ChatPanel.tsx](../src/components/layout/ChatPanel.tsx) - Sidebar slide-in panel
- [ChatSidebar.tsx](../src/components/ChatSidebar.tsx) - Drawer-based chat
- [ActivityStream.tsx](../src/components/ActivityStream.tsx) - Activity feed

**API Endpoints:**
- `GET /api/chat` - Fetch messages with polling support
- `POST /api/chat` - Send messages with actor detection
- `PATCH /api/chat/[messageId]` - Update message status

**Actor System:**
Currently supports 4 actors: `mike`, `moltbot`, `system`, `api`

**Authentication:**
- Session-based auth → `mike` actor
- API key header (`x-api-key`) → `moltbot` actor
- Detects actor in [activity.ts:72-79](../src/lib/activity.ts#L72-L79)

**Message Flow:**
1. Frontend polls every 10 seconds
2. Messages stored in MongoDB `chats` collection
3. Status tracking: `pending` → `processing` → `complete`
4. Unread badge tracking for moltbot messages

### Moltbot Channel Architecture

Based on research, Moltbot/OpenClaw uses:

**Gateway Control Plane:**
- WebSocket server at `ws://127.0.0.1:18789`
- Central hub for sessions, channels, tools, and events
- Routes messages between channels and AI agents

**Channel Adapters:**
Each messaging platform has a dedicated adapter:
- WhatsApp: Baileys library (WhatsApp Web protocol)
- Telegram: grammY framework (Bot API)
- Slack: Bolt framework
- Discord: discord.js
- iMessage: imsg CLI (macOS only)
- WebChat: Direct gateway connection (no separate port)

**Security Model:**
- Default: DM pairing (unknown senders get pairing codes)
- Configurable: per-channel policies (pairing vs. open access)
- Allowlists for controlling inbound messages
- Group routing: mention gating, reply tags

**Message Routing:**
- Channel-specific chunking and routing rules
- Group support with mention gating
- Reply threading with reply tags

## Integration Approaches

### Option 1: WebSocket Channel Adapter (Recommended)

Create a dedicated channel adapter that connects the Moltboard chat to Moltbot's gateway via WebSocket.

**Architecture:**
```
Moltboard Chat UI → Moltboard API → WebSocket Client → Moltbot Gateway (ws://127.0.0.1:18789)
                                      ↓
                                Moltbot Agent
                                      ↓
                                WebSocket Client → Moltboard API → Chat UI
```

**Implementation:**

1. **Create Channel Adapter Service** (`/services/moltbot-adapter/`)
   - WebSocket client connecting to `ws://127.0.0.1:18789`
   - Polls Moltboard chat API for new messages
   - Translates Moltboard messages to Moltbot gateway format
   - Listens for Moltbot responses and posts to Moltboard API

2. **Channel Registration**
   - Register "moltboard" channel with Moltbot gateway
   - Configure channel metadata (name, icon, capabilities)
   - Set up pairing/auth policies

3. **Message Translation Layer**
   ```typescript
   interface MoltbotMessage {
     channelId: string;        // "moltboard"
     sessionId: string;        // boardId or userId
     author: string;           // "mike", "system"
     content: string;
     context?: {
       taskId?: string;
       taskTitle?: string;
       boardId?: string;
     };
     timestamp: Date;
   }
   ```

4. **Bidirectional Sync**
   - Moltboard → Moltbot: Poll for `pending` messages, send via WebSocket
   - Moltbot → Moltboard: Receive via WebSocket, POST to `/api/chat` with `x-api-key`

**Pros:**
- Native Moltbot integration (same as other channels)
- Full feature parity with WhatsApp, Telegram, etc.
- Leverages existing gateway architecture
- Proper session management through gateway
- Supports all Moltbot features (tools, context, etc.)

**Cons:**
- Requires separate adapter service/process
- Additional infrastructure component
- Needs WebSocket connection management

**Effort:** Medium-High (2-3 days)

---

### Option 2: HTTP Webhook Channel

Expose the Moltboard chat API as webhook endpoints that Moltbot can call directly.

**Architecture:**
```
Moltboard Chat UI → Moltboard API ←→ Moltbot Gateway (HTTP webhooks)
```

**Implementation:**

1. **Add Webhook Endpoints**
   ```typescript
   // POST /api/moltbot/webhook - Receive messages from Moltbot
   // GET /api/moltbot/pending - Allow Moltbot to poll for user messages
   ```

2. **Register Webhook Channel**
   - Configure Moltbot to use HTTP webhook channel
   - Provide Moltboard API URL as webhook target
   - Set up authentication (API key)

3. **Polling or Push**
   - Option A: Moltbot polls `/api/moltbot/pending` for new messages
   - Option B: Moltboard pushes to Moltbot webhook when user sends message

**Pros:**
- Simpler implementation (HTTP only)
- No WebSocket connection management
- Easier deployment (stateless)
- Can run as part of Next.js app

**Cons:**
- Not a "native" Moltbot channel
- May have higher latency
- Less feature-rich than WebSocket approach
- Requires polling or webhook reliability

**Effort:** Low-Medium (1-2 days)

---

### Option 3: Moltbot Plugin/Extension

Develop a custom Moltbot plugin that integrates Moltboard as a channel.

**Architecture:**
```
Moltbot Gateway → Moltboard Plugin (inside Moltbot) → Moltboard API (HTTP)
```

**Implementation:**

1. **Create Plugin Package**
   - Follow Moltbot plugin architecture
   - Create `moltbot.hooks` manifest
   - Implement channel adapter interface

2. **Install via moltbot hooks**
   ```bash
   moltbot install moltboard-channel --from npm/path/zip
   ```

3. **Plugin Logic**
   - Polls Moltboard API for messages
   - Posts Moltbot responses back to Moltboard API
   - Handles session management

**Pros:**
- Deep integration with Moltbot ecosystem
- Installable/shareable via npm or ClawdHub
- Can be reused by other Moltboard users
- Fully managed within Moltbot process

**Cons:**
- Requires learning Moltbot plugin API
- Plugin development may have limited documentation
- Depends on Moltbot plugin stability

**Effort:** Medium-High (2-4 days, plus plugin learning curve)

---

### Option 4: Shared Database Integration

Use MongoDB as shared communication layer between Moltboard and Moltbot.

**Architecture:**
```
Moltboard Chat UI → MongoDB ← Moltbot Watcher Service → Moltbot Gateway
```

**Implementation:**

1. **Moltbot Watcher Service**
   - Watches `chats` collection for new messages
   - Filters for `status: 'pending'` and `author: 'mike'`
   - Forwards to Moltbot for processing

2. **Moltbot Response Writer**
   - Receives responses from Moltbot
   - Writes to `chats` collection with `author: 'moltbot'`

**Pros:**
- No API changes needed in Moltboard
- Simple architecture
- Leverages existing MongoDB setup
- Low latency (change streams)

**Cons:**
- Tight coupling via shared database
- Not a "channel" in Moltbot's architecture
- Harder to scale/distribute
- Less portable

**Effort:** Low (1 day)

---

## Recommended Approach: Hybrid (Option 1 + 2)

**Primary: WebSocket Channel Adapter**
For full integration as a formal Moltbot channel with all features.

**Fallback: HTTP Webhook**
For simpler deployment scenarios or development/testing.

### Implementation Phases

#### Phase 1: HTTP Webhook (MVP) - Week 1

Quick proof-of-concept to validate integration:

1. Add webhook endpoints to Moltboard API
2. Create simple HTTP-based connector
3. Test message flow in both directions
4. Validate actor detection and auth

**Files to create:**
- `/src/app/api/moltbot/webhook/route.ts` - Receive Moltbot messages
- `/src/app/api/moltbot/pending/route.ts` - Expose pending messages
- `/scripts/moltbot-connector.ts` - Simple HTTP polling connector

#### Phase 2: WebSocket Channel Adapter - Week 2-3

Full-featured channel integration:

1. Create standalone adapter service
2. Implement WebSocket client for Moltbot gateway
3. Add channel registration and session management
4. Implement bidirectional message translation
5. Add context passing (task, board info)
6. Implement pairing/auth flow

**Files to create:**
- `/services/moltbot-adapter/index.ts` - Main adapter service
- `/services/moltbot-adapter/websocket-client.ts` - Gateway connection
- `/services/moltbot-adapter/message-translator.ts` - Format conversion
- `/services/moltbot-adapter/session-manager.ts` - Session tracking
- `/services/moltbot-adapter/config.ts` - Channel configuration

#### Phase 3: Enhanced Features - Week 4

Channel-specific features:

1. Task context in conversations
2. Rich message formatting (task cards, checklists)
3. Multi-user support (channel sessions per user)
4. Board-specific channels
5. Activity stream integration

---

## Technical Specifications

### Message Format Translation

**Moltboard → Moltbot:**
```typescript
{
  channel: "moltboard",
  sessionId: boardId || "general",
  userId: "mike", // or detected from session
  message: {
    text: content,
    metadata: {
      taskId?: string,
      taskTitle?: string,
      replyTo?: string,
    }
  },
  timestamp: createdAt.toISOString()
}
```

**Moltbot → Moltboard:**
```typescript
{
  content: string,
  boardId: sessionId,
  taskId?: metadata.taskId,
  taskTitle?: metadata.taskTitle,
  replyTo?: metadata.replyTo
}
// POST to /api/chat with x-api-key header
```

### API Extensions Needed

**New endpoints for Phase 1:**

```typescript
// POST /api/moltbot/webhook
// Accept messages from Moltbot
interface WebhookRequest {
  channelId: "moltboard";
  sessionId: string;
  message: string;
  context?: Record<string, unknown>;
}

// GET /api/moltbot/pending
// Return messages awaiting Moltbot response
interface PendingResponse {
  messages: ChatMessage[];
  cursor?: string; // for pagination
}

// POST /api/moltbot/ack
// Mark message as processed
interface AckRequest {
  messageId: string;
  status: "processing" | "complete";
}
```

### Environment Variables

Add to [.env.local](../.env.local):

```bash
# Moltbot Integration
MOLTBOT_GATEWAY_URL=ws://127.0.0.1:18789
MOLTBOT_CHANNEL_ID=moltboard
MOLTBOT_WEBHOOK_SECRET=<secure_secret>

# Optional: Per-board channels
ENABLE_MULTI_SESSION=true
```

### Database Schema Extensions

No changes needed for Phase 1/2. Existing `chats` collection supports all required fields.

**Optional for Phase 3:**
```typescript
interface ChannelSession {
  id: string;
  channelType: "moltboard" | "whatsapp" | "telegram";
  sessionId: string; // boardId for moltboard
  userId: string;
  pairedAt: Date;
  lastActiveAt: Date;
  metadata?: Record<string, unknown>;
}
```

---

## Channel Features Comparison

| Feature | WhatsApp | Telegram | Moltboard (Current) | Moltboard (Proposed) |
|---------|----------|----------|------------------|-------------------|
| Real-time messaging | ✅ | ✅ | ✅ (polling) | ✅ (WebSocket) |
| Message threading | ✅ | ✅ | ✅ | ✅ |
| Rich formatting | ✅ | ✅ | ❌ | ✅ (Markdown) |
| Context passing | ✅ | ✅ | ⚠️ (limited) | ✅ |
| Multi-user sessions | ✅ | ✅ | ❌ | ✅ |
| DM pairing | ✅ | ✅ | ❌ | ✅ |
| Group routing | ✅ | ✅ | ❌ | ✅ |
| File attachments | ✅ | ✅ | ❌ | 🔮 Future |
| Voice messages | ✅ | ✅ | ❌ | ❌ |
| Task integration | ❌ | ❌ | ✅ | ✅ |
| Board context | ❌ | ❌ | ✅ | ✅ |

---

## Security Considerations

### Authentication

**Current:**
- Session-based auth for `mike`
- API key header for `moltbot`

**Proposed:**
- Add webhook secret verification
- Implement channel pairing flow
- Support multi-user sessions with user-specific auth

### Authorization

**Channel-level permissions:**
- Which users can access which board channels
- Per-board channel visibility
- Admin controls for channel management

**Message-level security:**
- Validate message origin (Moltbot webhook signature)
- Sanitize content from Moltbot
- Prevent injection attacks

### Rate Limiting

Implement rate limits for:
- Webhook endpoint (prevent abuse)
- Pending message polling (prevent resource exhaustion)
- Message posting (prevent spam)

---

## Deployment Architecture

### Development

```
┌─────────────────┐
│  Next.js App    │
│  (Port 3001)    │
│  + Chat API     │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         ▼
┌─────────────────┐
│  Moltbot        │
│  (Local)        │
│  ws://18789     │
└─────────────────┘
```

### Production (Option A: Same Host)

```
┌──────────────────────┐
│   Docker Compose     │
│                      │
│  ┌────────────────┐  │
│  │  Next.js App   │  │
│  │  (Port 3001)   │  │
│  └───────┬────────┘  │
│          │           │
│  ┌───────▼────────┐  │
│  │ Moltbot Adapter│  │
│  │   (Node.js)    │  │
│  └───────┬────────┘  │
│          │           │
│  ┌───────▼────────┐  │
│  │    Moltbot     │  │
│  │  (ws://18789)  │  │
│  └────────────────┘  │
│                      │
│  ┌────────────────┐  │
│  │    MongoDB     │  │
│  └────────────────┘  │
└──────────────────────┘
```

### Production (Option B: Distributed)

```
┌─────────────────┐         ┌─────────────────┐
│  Vercel/Host    │         │  Moltbot Host   │
│                 │         │                 │
│  Next.js App    │◄────────┤  Moltbot        │
│  (HTTPS)        │ Webhook │  + Adapter      │
│  + Webhook API  │─────────►  (ws://18789)   │
└────────┬────────┘         └─────────────────┘
         │
         ▼
┌─────────────────┐
│  MongoDB Atlas  │
└─────────────────┘
```

---

## Testing Strategy

### Unit Tests

- Message translation logic
- Actor detection
- Status transitions
- API endpoint validation

### Integration Tests

- End-to-end message flow (Moltboard → Moltbot → Moltboard)
- WebSocket connection handling
- Authentication/authorization
- Error handling and retries

### Manual Testing Checklist

- [ ] Send message from Moltboard UI, verify Moltbot receives it
- [ ] Send message from Moltbot, verify it appears in Moltboard UI
- [ ] Test with task context (taskId, taskTitle)
- [ ] Verify unread badge updates
- [ ] Test message status transitions (pending → complete)
- [ ] Validate actor detection (mike vs moltbot)
- [ ] Test across multiple boards
- [ ] Verify pairing flow (if implemented)
- [ ] Test error scenarios (connection loss, invalid messages)

---

## Success Metrics

### Functional Goals

- ✅ Moltboard chat appears as channel option in Moltbot dashboard
- ✅ Messages flow bidirectionally without loss
- ✅ Task context preserved in conversations
- ✅ Latency < 2 seconds for message delivery
- ✅ 99.9% message delivery rate

### User Experience Goals

- ✅ Users can switch seamlessly between Moltboard chat and WhatsApp/Telegram
- ✅ Moltbot maintains conversation context across channels
- ✅ Task-related queries automatically include task context
- ✅ No duplicate notifications across channels

---

## Future Enhancements

### Rich Message Types

Support for:
- Task cards (interactive previews)
- Checklist rendering
- Activity feed summaries
- Board overviews

### Advanced Routing

- Mention-based routing in shared boards
- Private DM channels per user
- Board-specific bot personas
- Custom routing rules

### Analytics Integration

- Message volume tracking
- Response time metrics
- User engagement analytics
- Bot performance monitoring

### Multi-tenant Support

- Organization-level channels
- Team-based board channels
- Permission inheritance
- Federated authentication

---

## Resources

### Moltbot Documentation

- [Moltbot Official Guide 2026](https://dev.to/czmilo/moltbot-the-ultimate-personal-ai-assistant-guide-for-2026-d4e)
- [DataCamp Tutorial: Control Your PC from WhatsApp](https://www.datacamp.com/tutorial/moltbot-clawdbot-tutorial)
- [DigitalOcean Moltbot Documentation](https://docs.digitalocean.com/products/marketplace/catalog/moltbot/)
- [OpenClaw Complete Guide 2026](https://www.nxcode.io/resources/news/openclaw-complete-guide-2026)

### Moltbot GitHub

- [GitHub: openclaw/openclaw](https://github.com/openclaw/openclaw)
- [GitHub: moltbot/moltbot](https://github.com/moltbot/moltbot)
- [Cloudflare Moltworker](https://github.com/cloudflare/moltworker)

### Architecture References

- [IBM: OpenClaw Testing Vertical Integration](https://www.ibm.com/think/news/clawdbot-ai-agent-testing-limits-vertical-integration)
- [Cisco Blogs: Personal AI Agents Security](https://blogs.cisco.com/ai/personal-ai-agents-like-openclaw-are-a-security-nightmare)
- [Fast Company: Clawdbot/Moltbot/OpenClaw](https://www.fastcompany.com/91484506/what-is-clawdbot-moltbot-openclaw)

---

## Next Steps

1. **Decision Point:** Choose primary approach (Webhook vs WebSocket vs Hybrid)
2. **Environment Setup:** Install Moltbot locally for development
3. **API Design:** Finalize webhook/adapter API contract
4. **POC Implementation:** Build Phase 1 MVP (1 week)
5. **Testing:** Validate bidirectional message flow
6. **Documentation:** Create setup guide for users
7. **Deployment:** Prepare production deployment strategy

---

## Questions to Resolve

1. **Channel Naming:** "moltboard", "clawd-moltboard", or user-configurable?
2. **Session Strategy:** One session per board, or global session?
3. **Multi-user:** Support multiple users in same board channel?
4. **Pairing Flow:** Required for all users, or optional?
5. **Deployment:** Bundled with Moltboard app, or separate service?
6. **Rich Messages:** What level of formatting to support in Phase 1?

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Author:** Claude Code
**Status:** Draft for Review
