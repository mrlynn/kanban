# Moltboard Channel Engineering Spec

> **Rebranded from "Moltboard" to "Moltboard" on 2026-01-31**
> **Domain:** moltboard.app (pending DNS)

> **Status:** Active Development
> **Last Updated:** 2026-01-31
> **Engineers:** @moltbot, @mike, @team

---

## Overview

This document defines the technical specification for implementing Clawd Moltboard as a **native Clawdbot channel plugin**. Once implemented, Moltboard will appear alongside WhatsApp, Telegram, Discord, etc. in Clawdbot's channel list.

**Goal:** Enable Moltbot to receive messages from the Moltboard chat UI and respond through Clawdbot's standard pipeline.

---

## Current State

### What's Already Built ✅

| Component | Status | Location |
|-----------|--------|----------|
| Chat API - GET messages | ✅ | `/api/chat` |
| Chat API - POST messages | ✅ | `/api/chat` |
| Chat API - PATCH status | ✅ | `/api/chat/[messageId]` |
| Actor detection (x-api-key → moltbot) | ✅ | `src/lib/activity.ts` |
| Message status tracking | ✅ | `pending → processing → complete` |
| Floating Chat UI | ✅ | `src/components/FloatingChat.tsx` |
| Activity Stream | ✅ | `src/components/ActivityStream.tsx` |
| Heartbeat polling (Moltbot) | ✅ | `HEARTBEAT.md` |

### What's Missing ❌

| Component | Priority | Notes |
|-----------|----------|-------|
| Clawdbot plugin manifest | P0 | `clawdbot.plugin.json` |
| Channel plugin implementation | P0 | Register with gateway |
| Webhook endpoint | P0 | Receive Clawdbot responses |
| Outbound send handler | P0 | Post messages to Moltboard API |
| Config schema | P1 | `channels.moltboard` config |
| Multi-account support | P2 | Per-board channels |

---

## Architecture

### Message Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           INBOUND (User → Moltbot)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────────┐    POST     ┌──────────────┐    Poll/Push             │
│   │  Moltboard UI   │ ─────────▶  │  Moltboard API  │ ─────────────▶           │
│   │  (React)     │   /api/chat │  (Next.js)   │                          │
│   └──────────────┘             └──────┬───────┘                          │
│                                       │                                  │
│                                       ▼                                  │
│                          ┌────────────────────────┐                      │
│                          │   Moltboard Channel       │                      │
│                          │   Plugin (Gateway)     │                      │
│                          │                        │                      │
│                          │   - Polls /api/chat    │                      │
│                          │   - Translates format  │                      │
│                          │   - Routes to agent    │                      │
│                          └───────────┬────────────┘                      │
│                                      │                                   │
│                                      ▼                                   │
│                          ┌────────────────────────┐                      │
│                          │   Clawdbot Gateway     │                      │
│                          │   (Agent Pipeline)     │                      │
│                          └────────────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          OUTBOUND (Moltbot → User)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌────────────────────────┐                                             │
│   │   Clawdbot Gateway     │                                             │
│   │   (Agent Response)     │                                             │
│   └───────────┬────────────┘                                             │
│               │                                                          │
│               ▼                                                          │
│   ┌────────────────────────┐     POST        ┌──────────────┐            │
│   │   Moltboard Channel       │ ─────────────▶  │  Moltboard API  │            │
│   │   Plugin               │   /api/chat     │              │            │
│   │                        │   x-api-key     └──────┬───────┘            │
│   │   - outbound.sendText  │                        │                    │
│   └────────────────────────┘                        ▼                    │
│                                              ┌──────────────┐            │
│                                              │  Moltboard UI   │            │
│                                              │  (Polling)   │            │
│                                              └──────────────┘            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Minimal Viable Channel (MVP) — 1-2 days

**Goal:** Get Moltboard showing as a Clawdbot channel with basic send/receive.

#### 1.1 Create Plugin Scaffold

**Location:** `/Users/michael.lynn/clawd/moltboard/clawdbot-plugin/`

```
clawdbot-plugin/
├── clawdbot.plugin.json     # Plugin manifest
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── index.ts                 # Plugin entry point
└── src/
    ├── channel.ts           # Channel plugin definition
    ├── config.ts            # Config schema
    ├── send.ts              # Outbound: send to Moltboard API
    ├── poll.ts              # Inbound: poll Moltboard API
    └── types.ts             # Shared types
```

#### 1.2 Plugin Manifest

**File:** `clawdbot.plugin.json`

```json
{
  "id": "moltboard",
  "name": "Moltboard",
  "description": "Clawd Moltboard task management channel",
  "version": "1.0.0",
  "channels": ["moltboard"],
  "configSchema": {
    "type": "object",
    "additionalProperties": false,
    "properties": {
      "apiUrl": {
        "type": "string",
        "description": "Moltboard API base URL"
      },
      "apiKey": {
        "type": "string",
        "description": "API key for moltbot authentication"
      },
      "pollIntervalMs": {
        "type": "number",
        "default": 5000
      },
      "defaultBoardId": {
        "type": "string",
        "description": "Default board for routing"
      }
    },
    "required": ["apiUrl", "apiKey"]
  },
  "uiHints": {
    "apiKey": {
      "label": "API Key",
      "sensitive": true
    },
    "apiUrl": {
      "label": "Moltboard API URL",
      "placeholder": "http://localhost:3001"
    }
  }
}
```

#### 1.3 Channel Plugin Implementation

**File:** `src/channel.ts`

```typescript
import type { ChannelPlugin, ClawdbotConfig } from "clawdbot/plugin-sdk";

interface MoltboardAccount {
  accountId: string;
  apiUrl: string;
  apiKey: string;
  pollIntervalMs: number;
  defaultBoardId?: string;
  enabled: boolean;
  configured: boolean;
}

export const moltboardPlugin: ChannelPlugin<MoltboardAccount> = {
  id: "moltboard",
  
  meta: {
    id: "moltboard",
    label: "Moltboard",
    selectionLabel: "Clawd Moltboard (Task Board)",
    detailLabel: "Moltboard",
    docsPath: "/channels/moltboard",
    docsLabel: "moltboard",
    blurb: "Task management chat via Clawd Moltboard board.",
    aliases: ["mb", "tasks"],
    order: 80,
  },

  capabilities: {
    chatTypes: ["direct"],  // Start simple, add "group" later for boards
    media: false,           // Text only for MVP
    reactions: false,       // Future: task completion as reaction
    edit: false,
    unsend: false,
    reply: true,            // Support reply threading
  },

  config: {
    listAccountIds: (cfg) => {
      const moltboardCfg = (cfg as ClawdbotConfig).channels?.moltboard;
      if (moltboardCfg?.accounts) {
        return Object.keys(moltboardCfg.accounts);
      }
      // Single account mode
      if (moltboardCfg?.apiUrl) return ["default"];
      return [];
    },
    
    resolveAccount: (cfg, accountId = "default"): MoltboardAccount => {
      const moltboardCfg = (cfg as ClawdbotConfig).channels?.moltboard;
      const account = moltboardCfg?.accounts?.[accountId] ?? moltboardCfg;
      return {
        accountId,
        apiUrl: account?.apiUrl ?? "http://localhost:3001",
        apiKey: account?.apiKey ?? "",
        pollIntervalMs: account?.pollIntervalMs ?? 5000,
        defaultBoardId: account?.defaultBoardId,
        enabled: account?.enabled !== false,
        configured: Boolean(account?.apiUrl && account?.apiKey),
      };
    },
    
    defaultAccountId: () => "default",
    
    isConfigured: (account) => account.configured,
    
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: `Moltboard (${account.apiUrl})`,
      enabled: account.enabled,
      configured: account.configured,
      baseUrl: account.apiUrl,
    }),
  },

  outbound: {
    deliveryMode: "direct",
    textChunkLimit: 10000,  // Moltboard can handle long messages
    
    resolveTarget: ({ to }) => {
      // Target is boardId or "default"
      const target = to?.trim() || "default";
      return { ok: true, to: target };
    },
    
    sendText: async ({ cfg, to, text, accountId, replyToId }) => {
      const account = moltboardPlugin.config.resolveAccount(cfg, accountId);
      const boardId = to || account.defaultBoardId || "default";
      
      const response = await fetch(`${account.apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": account.apiKey,
        },
        body: JSON.stringify({
          content: text,
          boardId,
          replyTo: replyToId,
        }),
      });
      
      if (!response.ok) {
        return { ok: false, error: new Error(`Moltboard API error: ${response.status}`) };
      }
      
      const result = await response.json();
      return {
        ok: true,
        messageId: result.id,
        channel: "moltboard",
      };
    },
  },

  // Gateway adapter for inbound polling
  gateway: {
    startAccount: async (ctx) => {
      const { account, runtime, abortSignal } = ctx;
      
      ctx.log?.info(`[moltboard:${account.accountId}] Starting poller...`);
      
      // Poll loop
      const pollInterval = account.pollIntervalMs || 5000;
      let lastTimestamp: string | null = null;
      
      const poll = async () => {
        if (abortSignal.aborted) return;
        
        try {
          const url = new URL(`${account.apiUrl}/api/chat`);
          url.searchParams.set("pendingOnly", "true");
          if (lastTimestamp) {
            url.searchParams.set("since", lastTimestamp);
          }
          
          const response = await fetch(url.toString(), {
            headers: { "x-api-key": account.apiKey },
            signal: abortSignal,
          });
          
          if (!response.ok) {
            ctx.log?.warn(`[moltboard] Poll failed: ${response.status}`);
            return;
          }
          
          const data = await response.json();
          const messages = data.messages || [];
          
          for (const msg of messages) {
            // Skip moltbot's own messages
            if (msg.author === "moltbot") continue;
            
            // Route to Clawdbot agent pipeline
            await runtime.inbound({
              channel: "moltboard",
              accountId: account.accountId,
              sessionId: msg.boardId || "default",
              senderId: msg.author,
              senderName: msg.author,
              messageId: msg.id,
              text: msg.content,
              timestamp: new Date(msg.createdAt),
              context: {
                boardId: msg.boardId,
                taskId: msg.taskId,
                taskTitle: msg.taskTitle,
              },
            });
            
            // Mark as processing
            await fetch(`${account.apiUrl}/api/chat/${msg.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": account.apiKey,
              },
              body: JSON.stringify({ status: "processing" }),
            });
            
            lastTimestamp = msg.createdAt;
          }
          
          if (data.meta?.latestTimestamp) {
            lastTimestamp = data.meta.latestTimestamp;
          }
        } catch (error) {
          if (!abortSignal.aborted) {
            ctx.log?.error(`[moltboard] Poll error: ${error}`);
          }
        }
      };
      
      // Initial poll
      await poll();
      
      // Start interval
      const intervalId = setInterval(poll, pollInterval);
      
      // Return cleanup
      return () => {
        clearInterval(intervalId);
        ctx.log?.info(`[moltboard:${account.accountId}] Stopped.`);
      };
    },
  },
};
```

#### 1.4 Plugin Entry Point

**File:** `index.ts`

```typescript
import type { ClawdbotPluginApi } from "clawdbot/plugin-sdk";
import { moltboardPlugin } from "./src/channel.js";

const plugin = {
  id: "moltboard",
  name: "Moltboard",
  description: "Clawd Moltboard task management channel",
  
  register(api: ClawdbotPluginApi) {
    api.registerChannel({ plugin: moltboardPlugin });
    api.logger.info("[moltboard] Channel registered");
  },
};

export default plugin;
```

#### 1.5 Clawdbot Configuration

Add to Clawdbot config (`~/.clawdbot/config.yaml` or equivalent):

```yaml
channels:
  moltboard:
    enabled: true
    apiUrl: "http://localhost:3001"
    apiKey: "461e0eef6b8d7096a4de2946030b55ac3b0dadf4f3a4327d7ecbb0a4ab647a89"
    pollIntervalMs: 5000
    defaultBoardId: "board_411973f805a0a2d9"
```

---

### Phase 2: Enhanced Features — 1 week

#### 2.1 Webhook Support (Push Instead of Poll)

Add webhook endpoint to Moltboard API:

**File:** `src/app/api/clawdbot/webhook/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.CLAWDBOT_WEBHOOK_SECRET;
  
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const body = await request.json();
  const { content, boardId, taskId, taskTitle, replyTo } = body;
  
  const db = await getDb();
  const message = {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    author: "moltbot",
    content,
    boardId: boardId || "default",
    taskId,
    taskTitle,
    replyTo,
    status: "complete",
    createdAt: new Date(),
  };
  
  await db.collection("chats").insertOne(message);
  
  return NextResponse.json({ success: true, id: message.id });
}
```

Update plugin to register HTTP handler:

```typescript
api.registerHttpHandler(async (req, res) => {
  if (req.url?.startsWith("/moltboard-callback")) {
    // Handle Moltboard push notifications
    return true;
  }
  return false;
});
```

#### 2.2 Task Context Injection

Modify the inbound handler to include task context in the agent prompt:

```typescript
const context = {
  boardId: msg.boardId,
  taskId: msg.taskId,
  taskTitle: msg.taskTitle,
  // Fetch additional task details if available
  task: msg.taskId ? await fetchTaskDetails(account, msg.taskId) : undefined,
};

await runtime.inbound({
  // ...
  context,
  systemHint: msg.taskId 
    ? `User is discussing task "${msg.taskTitle}" (${msg.taskId}).`
    : undefined,
});
```

#### 2.3 Multi-Board Sessions

Support per-board routing:

```yaml
channels:
  moltboard:
    accounts:
      netpad:
        apiUrl: "http://localhost:3001"
        apiKey: "xxx"
        defaultBoardId: "board_netpad"
      personal:
        apiUrl: "http://localhost:3001"
        apiKey: "xxx"
        defaultBoardId: "board_personal"
```

#### 2.4 Rich Responses

Support task cards and formatting:

```typescript
// In outbound.sendText
if (text.includes("[[task:")) {
  // Parse task card syntax and convert to Moltboard task link
}
```

---

### Phase 3: Production Hardening — 1 week

#### 3.1 Error Handling & Retry

- Exponential backoff on poll failures
- Dead letter queue for failed messages
- Health check endpoint

#### 3.2 Rate Limiting

- Debounce rapid messages
- Queue outbound for batching

#### 3.3 Observability

- Structured logging
- Metrics (messages/sec, latency, errors)
- Status in Clawdbot dashboard

#### 3.4 Security

- Webhook signature verification
- API key rotation support
- IP allowlisting option

---

## API Contract

### Moltboard Chat API (Existing)

#### GET /api/chat

```typescript
// Request
GET /api/chat?pendingOnly=true&since=2026-01-31T00:00:00Z

// Response
{
  "messages": [
    {
      "id": "msg_xxx",
      "author": "mike",
      "content": "What's the status of the CLI?",
      "boardId": "board_xxx",
      "taskId": "task_xxx",
      "taskTitle": "@netpad/cli Interactive Shell",
      "status": "pending",
      "createdAt": "2026-01-31T10:00:00Z"
    }
  ],
  "meta": {
    "count": 1,
    "latestTimestamp": "2026-01-31T10:00:00Z"
  }
}
```

#### POST /api/chat

```typescript
// Request
POST /api/chat
Headers: { "x-api-key": "xxx" }
Body: {
  "content": "The CLI interactive shell is complete with...",
  "boardId": "board_xxx",
  "taskId": "task_xxx",
  "taskTitle": "@netpad/cli Interactive Shell",
  "replyTo": "msg_xxx"
}

// Response
{
  "id": "msg_yyy",
  "author": "moltbot",
  "content": "...",
  "status": "complete",
  "createdAt": "2026-01-31T10:00:05Z"
}
```

#### PATCH /api/chat/[messageId]

```typescript
// Request
PATCH /api/chat/msg_xxx
Body: { "status": "processing" }

// Response
{ "success": true }
```

---

## Configuration Reference

### Clawdbot Config

```yaml
channels:
  moltboard:
    enabled: true                    # Enable the channel
    apiUrl: "http://localhost:3001"  # Moltboard API base URL
    apiKey: "xxx"                    # API key (triggers moltbot actor)
    pollIntervalMs: 5000             # Polling interval (ms)
    defaultBoardId: "board_xxx"      # Default board for routing
    
    # Optional: Multi-account
    accounts:
      work:
        apiUrl: "https://moltboard.work.com"
        apiKey: "work-key"
        defaultBoardId: "board_work"
      personal:
        apiUrl: "http://localhost:3001"
        apiKey: "personal-key"
        defaultBoardId: "board_personal"
    
    # Optional: DM policy (future)
    dmPolicy: "open"  # or "pairing" or "allowlist"
```

### Moltboard Environment Variables

```bash
# .env.local
CLAWDBOT_WEBHOOK_SECRET=xxx          # For push mode
CLAWDBOT_CHANNEL_ENABLED=true        # Feature flag
```

---

## Testing Checklist

### Unit Tests

- [ ] Plugin loads without errors
- [ ] Config validation works
- [ ] Message translation (Moltboard ↔ Clawdbot format)
- [ ] API client error handling

### Integration Tests

- [ ] Send message from Moltboard UI → received by Clawdbot
- [ ] Clawdbot response → appears in Moltboard UI
- [ ] Message status transitions correctly
- [ ] Task context preserved in conversation
- [ ] Reply threading works

### Manual Testing

- [ ] Channel appears in `clawdbot channels list`
- [ ] `clawdbot status` shows Moltboard channel status
- [ ] Messages sync within 5 seconds
- [ ] Error recovery after API downtime
- [ ] Multiple boards work independently

---

## Open Questions

1. **Session Strategy:** One session per board, or global session with board context?
   - **Recommendation:** Per-board sessions for isolation

2. **Heartbeat Conflict:** Should we disable HEARTBEAT.md polling once channel is active?
   - **Recommendation:** Yes, remove heartbeat polling; channel handles it

3. **Task Commands:** Should chat support commands like `/task create` or `/task complete`?
   - **Recommendation:** Phase 2 feature; start with pure chat

4. **Notification Routing:** Should Moltboard notifications go to primary channel (WhatsApp) too?
   - **Recommendation:** Configurable; default to Moltboard-only

---

## Timeline

| Phase | Deliverable | ETA |
|-------|-------------|-----|
| Phase 1 MVP | Basic send/receive channel | 1-2 days |
| Phase 2 | Webhook push, task context, multi-board | +1 week |
| Phase 3 | Production hardening | +1 week |

**Total:** ~2-3 weeks for production-ready channel

---

## Resources

### Clawdbot Documentation

- Plugin SDK: `/opt/homebrew/lib/node_modules/clawdbot/docs/plugin.md`
- Channels: `/opt/homebrew/lib/node_modules/clawdbot/docs/channels/`
- BlueBubbles Reference: `/opt/homebrew/lib/node_modules/clawdbot/extensions/bluebubbles/`

### Moltboard Implementation

- Chat API: `src/app/api/chat/route.ts`
- Activity Tracking: `src/lib/activity.ts`
- Chat UI: `src/components/FloatingChat.tsx`

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-01-31 | @moltbot | Initial spec created |

---

**Next Steps:**

1. [ ] Review this spec with Mike
2. [ ] Create `clawdbot-plugin/` directory
3. [ ] Implement Phase 1 MVP
4. [ ] Test end-to-end flow
5. [ ] Deploy and validate
