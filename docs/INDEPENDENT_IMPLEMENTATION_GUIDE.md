# Independent OpenClaw Channel Implementation Guide

## Overview

This guide shows you how to build the Moltboard ↔ OpenClaw integration **independently**, without waiting for official maintainer approval. OpenClaw is open source, and you can build against its WebSocket gateway directly.

---

## Why Build Independently?

**You don't need permission because:**

1. ✅ **OpenClaw is open source** (MIT/Apache license)
2. ✅ **WebSocket gateway is documented** and accessible
3. ✅ **Community plugins are encouraged**
4. ✅ **ClawdHub accepts third-party submissions**
5. ✅ **You control your timeline**

**Build it first, then decide:**
- Keep it as a standalone service
- Publish as a community plugin
- Offer to upstream later (optional)

---

## Architecture: Standalone Adapter Service

```
┌─────────────────────┐
│   Moltboard App        │
│   (Next.js)         │
│   Port 3001         │
└──────┬──────────────┘
       │ HTTP API
       │
┌──────▼──────────────┐
│  OpenClaw Adapter   │◄──────┐
│  (Node.js Service)  │       │
│                     │       │
│  - Polls Moltboard API │       │
│  - WebSocket Client │       │
└──────┬──────────────┘       │
       │                      │
       │ ws://127.0.0.1:18789 │
       │                      │
┌──────▼──────────────┐       │
│  OpenClaw Gateway   │       │
│  (Local Instance)   │───────┘
└─────────────────────┘
```

**Key Insight:** The adapter is a **separate Node.js service** that:
- Connects to OpenClaw gateway via WebSocket
- Polls your Moltboard API for new messages
- Translates between formats
- Runs alongside both apps

---

## Step-by-Step Implementation

### Prerequisites

1. **OpenClaw installed locally**
   ```bash
   npm install -g openclaw
   openclaw setup
   ```

2. **Moltboard app running**
   ```bash
   cd /Users/michael.lynn/clawd/moltboard
   npm run dev  # Should be on port 3001
   ```

3. **Node.js 18+** for adapter service

---

### Step 1: Study Existing Channel Adapters (2-3 hours)

**Clone OpenClaw repo:**
```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
```

**Find channel adapter code:**
```bash
# Look for channel implementations
find . -name "*channel*" -o -name "*adapter*" | grep -v node_modules
```

**Key files to study:**
- `src/channels/` - Channel adapter implementations
- `src/gateway/` - WebSocket gateway code
- Look at WhatsApp, Telegram, or WebChat adapters

**What to learn:**
- How channels register with gateway
- Message format expected by gateway
- Session management patterns
- Error handling and reconnection logic

**Document your findings:**
```bash
# Create notes file
touch ~/openclaw-channel-research.md
```

---

### Step 2: Create Adapter Service Scaffold (1 day)

**Create new project:**
```bash
mkdir -p /Users/michael.lynn/clawd/moltboard-openclaw-adapter
cd /Users/michael.lynn/clawd/moltboard-openclaw-adapter

npm init -y
npm install ws node-fetch dotenv typescript @types/node @types/ws
npm install -D tsx nodemon
```

**Project structure:**
```
moltboard-openclaw-adapter/
├── src/
│   ├── index.ts                # Main entry point
│   ├── openclaw-client.ts      # WebSocket client for OpenClaw
│   ├── moltboard-client.ts        # HTTP client for Moltboard API
│   ├── message-translator.ts  # Format conversion
│   ├── poller.ts               # Poll Moltboard for new messages
│   └── types.ts                # TypeScript interfaces
├── .env.example
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**.env.example:**
```bash
# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=ws://127.0.0.1:18789

# Moltboard API
KANBAN_API_URL=http://localhost:3001
KANBAN_API_KEY=your_api_key_here

# Adapter Config
CHANNEL_ID=moltboard
DEFAULT_BOARD_ID=general
POLL_INTERVAL_MS=5000
LOG_LEVEL=debug
```

---

### Step 3: Implement OpenClaw WebSocket Client (1 day)

**src/types.ts:**
```typescript
export interface OpenClawMessage {
  type: 'message' | 'register' | 'ack' | 'status';
  channelId: string;
  sessionId: string;
  userId?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface MoltboardMessage {
  id: string;
  boardId: string;
  author: 'mike' | 'moltbot' | 'system' | 'api';
  content: string;
  taskId?: string;
  taskTitle?: string;
  replyTo?: string;
  status?: 'pending' | 'processing' | 'complete';
  createdAt: Date;
  updatedAt?: Date;
}
```

**src/openclaw-client.ts:**
```typescript
import WebSocket from 'ws';
import { OpenClawMessage } from './types';
import { EventEmitter } from 'events';

export class OpenClawClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;

  constructor(
    private gatewayUrl: string,
    private channelId: string
  ) {
    super();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`[OpenClaw] Connecting to ${this.gatewayUrl}...`);

      this.ws = new WebSocket(this.gatewayUrl);

      this.ws.on('open', () => {
        console.log('[OpenClaw] Connected to gateway');
        this.reconnectAttempts = 0;
        this.register();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString()) as OpenClawMessage;
          console.log('[OpenClaw] Received:', message);
          this.emit('message', message);
        } catch (error) {
          console.error('[OpenClaw] Failed to parse message:', error);
        }
      });

      this.ws.on('close', () => {
        console.log('[OpenClaw] Disconnected from gateway');
        this.ws = null;
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('[OpenClaw] WebSocket error:', error);
        reject(error);
      });
    });
  }

  private register(): void {
    const registerMsg: OpenClawMessage = {
      type: 'register',
      channelId: this.channelId,
      sessionId: 'default',
      metadata: {
        name: 'Moltboard',
        version: '1.0.0',
        capabilities: ['text', 'context']
      }
    };

    this.send(registerMsg);
    console.log('[OpenClaw] Sent registration');
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[OpenClaw] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[OpenClaw] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect().catch((error) => {
        console.error('[OpenClaw] Reconnection failed:', error);
      });
    }, delay);
  }

  send(message: OpenClawMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[OpenClaw] Cannot send - not connected');
      return;
    }

    this.ws.send(JSON.stringify(message));
    console.log('[OpenClaw] Sent:', message.type);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

---

### Step 4: Implement Moltboard API Client (1 day)

**src/moltboard-client.ts:**
```typescript
import fetch from 'node-fetch';
import { MoltboardMessage } from './types';

export class MoltboardClient {
  private lastChecked: Date;

  constructor(
    private apiUrl: string,
    private apiKey: string
  ) {
    this.lastChecked = new Date();
  }

  /**
   * Fetch new messages since last check (for user → OpenClaw flow)
   */
  async getPendingMessages(boardId?: string): Promise<MoltboardMessage[]> {
    const url = new URL(`${this.apiUrl}/api/chat`);
    url.searchParams.set('since', this.lastChecked.toISOString());
    url.searchParams.set('pendingOnly', 'true');

    if (boardId) {
      url.searchParams.set('boardId', boardId);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Moltboard API error: ${response.status}`);
    }

    const data = await response.json() as { messages: MoltboardMessage[] };

    if (data.messages.length > 0) {
      this.lastChecked = new Date();
    }

    return data.messages;
  }

  /**
   * Send OpenClaw response to Moltboard (OpenClaw → user flow)
   */
  async sendMessage(
    content: string,
    boardId: string,
    taskId?: string,
    taskTitle?: string,
    replyTo?: string
  ): Promise<MoltboardMessage> {
    const response = await fetch(`${this.apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey // Triggers 'moltbot' actor
      },
      body: JSON.stringify({
        content,
        boardId,
        taskId,
        taskTitle,
        replyTo
      })
    });

    if (!response.ok) {
      throw new Error(`Moltboard API error: ${response.status}`);
    }

    return await response.json() as MoltboardMessage;
  }

  /**
   * Mark message as processing/complete
   */
  async updateMessageStatus(
    messageId: string,
    status: 'processing' | 'complete'
  ): Promise<void> {
    const response = await fetch(`${this.apiUrl}/api/chat/${messageId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      throw new Error(`Failed to update message status: ${response.status}`);
    }
  }
}
```

---

### Step 5: Message Translation Layer (4 hours)

**src/message-translator.ts:**
```typescript
import { OpenClawMessage, MoltboardMessage } from './types';

export class MessageTranslator {
  constructor(private channelId: string) {}

  /**
   * Translate Moltboard message to OpenClaw format
   */
  moltboardToOpenClaw(moltboardMsg: MoltboardMessage): OpenClawMessage {
    return {
      type: 'message',
      channelId: this.channelId,
      sessionId: moltboardMsg.boardId,
      userId: moltboardMsg.author,
      content: moltboardMsg.content,
      metadata: {
        messageId: moltboardMsg.id,
        taskId: moltboardMsg.taskId,
        taskTitle: moltboardMsg.taskTitle,
        replyTo: moltboardMsg.replyTo,
        timestamp: moltboardMsg.createdAt.toISOString()
      },
      timestamp: moltboardMsg.createdAt.toISOString()
    };
  }

  /**
   * Translate OpenClaw message to Moltboard format
   */
  openclawToMoltboard(openclawMsg: OpenClawMessage): {
    content: string;
    boardId: string;
    taskId?: string;
    taskTitle?: string;
    replyTo?: string;
  } {
    return {
      content: openclawMsg.content || '',
      boardId: openclawMsg.sessionId,
      taskId: openclawMsg.metadata?.taskId as string | undefined,
      taskTitle: openclawMsg.metadata?.taskTitle as string | undefined,
      replyTo: openclawMsg.metadata?.messageId as string | undefined
    };
  }
}
```

---

### Step 6: Main Adapter Logic (4 hours)

**src/index.ts:**
```typescript
import dotenv from 'dotenv';
import { OpenClawClient } from './openclaw-client';
import { MoltboardClient } from './moltboard-client';
import { MessageTranslator } from './message-translator';

dotenv.config();

const OPENCLAW_GATEWAY = process.env.OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
const KANBAN_API_URL = process.env.KANBAN_API_URL || 'http://localhost:3001';
const KANBAN_API_KEY = process.env.KANBAN_API_KEY || '';
const CHANNEL_ID = process.env.CHANNEL_ID || 'moltboard';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

async function main() {
  console.log('🦞 Starting Moltboard OpenClaw Adapter...');

  // Initialize clients
  const openclawClient = new OpenClawClient(OPENCLAW_GATEWAY, CHANNEL_ID);
  const moltboardClient = new MoltboardClient(KANBAN_API_URL, KANBAN_API_KEY);
  const translator = new MessageTranslator(CHANNEL_ID);

  // Connect to OpenClaw
  await openclawClient.connect();

  // Handle incoming OpenClaw messages (OpenClaw → Moltboard)
  openclawClient.on('message', async (msg) => {
    if (msg.type === 'message' && msg.content) {
      console.log('📨 [OpenClaw → Moltboard]', msg.content);

      try {
        const moltboardMsg = translator.openclawToMoltboard(msg);
        await moltboardClient.sendMessage(
          moltboardMsg.content,
          moltboardMsg.boardId,
          moltboardMsg.taskId,
          moltboardMsg.taskTitle,
          moltboardMsg.replyTo
        );

        console.log('✅ Message sent to Moltboard');
      } catch (error) {
        console.error('❌ Failed to send to Moltboard:', error);
      }
    }
  });

  // Poll Moltboard for new user messages (Moltboard → OpenClaw)
  setInterval(async () => {
    try {
      const pendingMessages = await moltboardClient.getPendingMessages();

      for (const moltboardMsg of pendingMessages) {
        console.log('📨 [Moltboard → OpenClaw]', moltboardMsg.content);

        // Mark as processing
        await moltboardClient.updateMessageStatus(moltboardMsg.id, 'processing');

        // Send to OpenClaw
        const openclawMsg = translator.moltboardToOpenClaw(moltboardMsg);
        openclawClient.send(openclawMsg);

        console.log('✅ Message sent to OpenClaw');
      }
    } catch (error) {
      console.error('❌ Error polling Moltboard:', error);
    }
  }, POLL_INTERVAL);

  console.log(`✅ Adapter running (polling every ${POLL_INTERVAL}ms)`);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit(0);
});

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
```

---

### Step 7: Testing (1 day)

**Setup .env:**
```bash
cp .env.example .env
# Edit .env with your actual values
```

**Start OpenClaw:**
```bash
openclaw start
```

**Start Moltboard app:**
```bash
cd /Users/michael.lynn/clawd/moltboard
npm run dev
```

**Start adapter:**
```bash
cd /Users/michael.lynn/clawd/moltboard-openclaw-adapter
npm run dev
```

**Test flow:**

1. **Moltboard → OpenClaw:**
   - Open Moltboard UI (http://localhost:3001)
   - Send a message in chat
   - Check adapter logs: should see "📨 [Moltboard → OpenClaw]"
   - Check OpenClaw: should receive the message

2. **OpenClaw → Moltboard:**
   - Trigger OpenClaw response (via CLI or other channel)
   - Check adapter logs: should see "📨 [OpenClaw → Moltboard]"
   - Check Moltboard UI: should see moltbot response

---

## Step 8: Publish as Plugin (Optional)

Once working, you can share it with the community:

**Option 1: NPM Package**
```bash
npm publish moltboard-openclaw-adapter
```

**Option 2: ClawdHub Submission**
```bash
clawdhub publish ./moltboard-openclaw-adapter \
  --slug moltboard-channel \
  --name "Moltboard Channel Adapter" \
  --version 1.0.0
```

**Option 3: GitHub Release**
- Push to GitHub repo
- Create release with installation instructions
- Share in OpenClaw Discord

---

## Timeline Summary

| Task | Time | Total |
|------|------|-------|
| Study existing channels | 3 hours | 3h |
| Create adapter scaffold | 4 hours | 7h |
| OpenClaw WebSocket client | 8 hours | 15h |
| Moltboard API client | 8 hours | 23h |
| Message translator | 4 hours | 27h |
| Main adapter logic | 4 hours | 31h |
| Testing & debugging | 8 hours | 39h |
| Documentation | 3 hours | 42h |

**Total: ~1 week of focused work** (or 2-3 weeks part-time)

---

## When to Engage Maintainers

**Build first, ask questions later:**

You can develop 100% independently, then:

**Engage if/when you want to:**
- Get feedback on a specific technical challenge
- Contribute adapter back to core repo
- Get official endorsement
- Troubleshoot gateway integration issues

**How to engage:**
- Post in GitHub Discussions with working code
- Share demo video
- Ask specific technical questions in Discord
- Submit small, focused PRs if contributing back

---

## Key Insights

1. **You don't need permission** - OpenClaw is open, build against it freely
2. **Standalone adapter works** - No need to modify OpenClaw code
3. **Test locally first** - Prove the concept before asking for help
4. **Community plugins are normal** - Many extensions exist outside core repo
5. **Share when ready** - Contribute back if/when you want

---

## Next Steps

**This Week:**
1. Study OpenClaw channel code (3 hours)
2. Create adapter scaffold (4 hours)
3. Basic WebSocket connection test (2 hours)

**Next Week:**
1. Complete adapter implementation
2. Test end-to-end flow
3. Write documentation

**Week 3+:**
1. Polish and optimize
2. Add error handling
3. Package for distribution
4. Share with community (optional)

---

## Resources

**OpenClaw Source Code:**
- Main repo: https://github.com/openclaw/openclaw
- Channel examples: `src/channels/`
- Gateway code: `src/gateway/`

**Your Moltboard APIs:**
- [GET /api/chat](../src/app/api/chat/route.ts#L25)
- [POST /api/chat](../src/app/api/chat/route.ts#L83)
- [PATCH /api/chat/[messageId]](../src/app/api/chat/[messageId]/route.ts)

**Community Resources:**
- Discord: https://discord.gg/openclaw
- Discussions: https://github.com/openclaw/openclaw/discussions
- ClawdHub: https://clawdhub.com

---

**Document Version:** 1.0
**Last Updated:** 2026-01-31
**Status:** Ready to Implement
