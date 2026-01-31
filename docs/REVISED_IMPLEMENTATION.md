# Revised Implementation Plan
## Moltboard as Clawdbot Channel (Not Standalone AI)

**Key Insight:** Moltbot already exists in Clawdbot. Moltboard is just a **task board UI + channel adapter** that surfaces tasks to Moltbot.

**Date:** 2026-01-31
**Status:** Corrected Strategy

---

## 🎯 Correct Architecture

```
┌──────────────────────────────────────────────┐
│         CLAWDBOT GATEWAY                      │
│  (Already running at ws://127.0.0.1:18789)    │
│                                               │
│  - Moltbot AI agent (already exists)          │
│  - Cron scheduling (already exists)           │
│  - Multi-channel routing (already exists)     │
│  - Memory/context (already exists)            │
└────────────┬─────────────────────────────────┘
             │
             │ Channel Plugin
             │
┌────────────▼─────────────────────────────────┐
│      MOLTBOARD CHANNEL PLUGIN                 │
│  (clawdbot-plugin/index.ts - already exists!) │
│                                               │
│  - Polls /api/chat for new messages           │
│  - Posts Moltbot responses back               │
└────────────┬─────────────────────────────────┘
             │
             │ HTTP API
             │
┌────────────▼─────────────────────────────────┐
│         MOLTBOARD WEB APP                     │
│  (Next.js - this is what we build)            │
│                                               │
│  - Task board UI (kanban view)                │
│  - Chat interface                             │
│  - Settings panel                             │
│  - REST API (/api/*)                          │
└───────────────────────────────────────────────┘
```

**What this means:**
- ✅ Moltbot AI already exists (via Clawdbot)
- ✅ Channel plugin already exists (clawdbot-plugin/)
- ✅ Cron already exists (Clawdbot handles scheduling)
- ✅ We just need to build Moltboard features

---

## What Moltboard Actually Needs to Build

### 1. Settings Panel ⚙️

**User Control Over Moltbot Behavior:**

#### Create `/src/app/(app)/settings/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  Button,
  Card,
  CardContent,
  Divider
} from '@mui/material';

interface MoltbotSettings {
  temperature: number;        // 0-1 for Claude API
  personality: 'professional' | 'casual' | 'humorous';
  proactiveEnabled: boolean;
  briefingTime: string;       // "08:00" format
  stuckTaskDays: number;      // Days before alerting
  memoryEnabled: boolean;
  autoCreateTasks: boolean;   // NLP task creation
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<MoltbotSettings>({
    temperature: 0.7,
    personality: 'professional',
    proactiveEnabled: true,
    briefingTime: '08:00',
    stuckTaskDays: 3,
    memoryEnabled: true,
    autoCreateTasks: true
  });

  const saveSettings = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800 }}>
      <Typography variant="h4" gutterBottom>
        Moltbot Settings
      </Typography>

      {/* Personality */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Personality
          </Typography>
          <Select
            fullWidth
            value={settings.personality}
            onChange={(e) => setSettings({
              ...settings,
              personality: e.target.value as any
            })}
          >
            <MenuItem value="professional">
              Professional (clear, concise)
            </MenuItem>
            <MenuItem value="casual">
              Casual (friendly, relaxed)
            </MenuItem>
            <MenuItem value="humorous">
              Humorous (witty, playful)
            </MenuItem>
          </Select>
        </CardContent>
      </Card>

      {/* Temperature */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Creativity Level
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Higher = more creative, lower = more focused
          </Typography>
          <Slider
            value={settings.temperature}
            onChange={(_, val) => setSettings({
              ...settings,
              temperature: val as number
            })}
            min={0}
            max={1}
            step={0.1}
            marks={[
              { value: 0, label: 'Focused' },
              { value: 0.5, label: 'Balanced' },
              { value: 1, label: 'Creative' }
            ]}
            valueLabelDisplay="auto"
          />
        </CardContent>
      </Card>

      {/* Proactive Features */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Proactive Features
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.proactiveEnabled}
                onChange={(e) => setSettings({
                  ...settings,
                  proactiveEnabled: e.target.checked
                })}
              />
            }
            label="Enable proactive suggestions"
          />

          {settings.proactiveEnabled && (
            <Box sx={{ mt: 2 }}>
              <TextField
                label="Daily briefing time"
                type="time"
                value={settings.briefingTime}
                onChange={(e) => setSettings({
                  ...settings,
                  briefingTime: e.target.value
                })}
                fullWidth
                sx={{ mb: 2 }}
              />

              <TextField
                label="Alert when task stuck (days)"
                type="number"
                value={settings.stuckTaskDays}
                onChange={(e) => setSettings({
                  ...settings,
                  stuckTaskDays: parseInt(e.target.value)
                })}
                fullWidth
                inputProps={{ min: 1, max: 14 }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Memory & Privacy */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Memory & Privacy
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.memoryEnabled}
                onChange={(e) => setSettings({
                  ...settings,
                  memoryEnabled: e.target.checked
                })}
              />
            }
            label="Allow Moltbot to remember context"
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            When enabled, Moltbot remembers your preferences and past
            conversations to provide better assistance.
          </Typography>

          <Button
            variant="outlined"
            color="error"
            sx={{ mt: 2 }}
            onClick={() => {
              if (confirm('Delete all Moltbot memories? This cannot be undone.')) {
                // TODO: Implement memory deletion
              }
            }}
          >
            Clear All Memories
          </Button>
        </CardContent>
      </Card>

      {/* Task Creation */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Automation
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={settings.autoCreateTasks}
                onChange={(e) => setSettings({
                  ...settings,
                  autoCreateTasks: e.target.checked
                })}
              />
            }
            label="Auto-create tasks from chat"
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            When you say "remind me to..." Moltbot will automatically create a task.
          </Typography>
        </CardContent>
      </Card>

      <Button
        variant="contained"
        size="large"
        onClick={saveSettings}
        fullWidth
      >
        Save Settings
      </Button>
    </Box>
  );
}
```

---

### 2. Chat Message Deletion 🗑️

**User Control Over Chat History:**

#### Update `/src/components/layout/ChatPanel.tsx`

Add delete button to each message:

```typescript
// In message rendering
{message.author === 'mike' && (
  <IconButton
    size="small"
    onClick={() => handleDeleteMessage(message.id)}
    sx={{ ml: 'auto' }}
  >
    <Delete fontSize="small" />
  </IconButton>
)}
```

#### Create `/src/app/api/chat/[messageId]/delete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  if (!(await isAuthenticated(request))) {
    return unauthorizedResponse();
  }

  const db = await getDb();

  // Delete the message
  await db.collection('chats').deleteOne({ id: params.messageId });

  // If message has embeddings, delete those too
  await db.collection('message_embeddings').deleteOne({
    messageId: params.messageId
  });

  return NextResponse.json({ success: true });
}
```

---

### 3. Avatar from Logo 🎨

#### Create `/src/lib/avatar.ts`

```typescript
/**
 * Generate Moltbot avatar from logo
 */

export function getMoltbotAvatar(): React.ReactNode {
  // Option 1: Use the logo image
  return (
    <Avatar
      src="/logo.png"
      alt="Moltbot"
      sx={{ width: 32, height: 32 }}
    />
  );

  // Option 2: Use fire emoji (current)
  // return '🔥';

  // Option 3: Custom SVG based on logo colors
  // (Extract dominant color from logo.png and create simple icon)
}
```

#### Update all actor configs to use avatar:

```typescript
const actorConfig: Record<Actor, { name: string; color: string; avatar: React.ReactNode }> = {
  mike: {
    name: 'Mike',
    color: '#3B82F6',
    avatar: <Person />
  },
  moltbot: {
    name: 'Moltbot',
    color: '#F97316',
    avatar: <Avatar src="/logo.png" sx={{ width: 24, height: 24 }} />
  },
  system: {
    name: 'System',
    color: '#6B7280',
    avatar: 'S'
  },
  api: {
    name: 'API',
    color: '#8B5CF6',
    avatar: 'A'
  }
};
```

---

### 4. MongoDB Vector Search for Semantic Memory 🧠

**Enable Moltbot to remember context semantically:**

#### Add to `/src/types/moltboard.ts`

```typescript
export interface MessageEmbedding {
  _id?: ObjectId;
  messageId: string;
  boardId: string;
  userId: string;
  content: string;
  embedding: number[];  // 1536-dim for OpenAI, 768 for Claude?
  createdAt: Date;
  metadata?: {
    taskId?: string;
    taskTitle?: string;
    important?: boolean;
  };
}
```

#### Create vector index in MongoDB

```javascript
// In MongoDB Atlas or via shell:
db.message_embeddings.createSearchIndex({
  name: "semantic_search",
  type: "vectorSearch",
  definition: {
    "fields": [
      {
        "type": "vector",
        "path": "embedding",
        "numDimensions": 1536,  // Adjust based on embedding model
        "similarity": "cosine"
      },
      {
        "type": "filter",
        "path": "userId"
      },
      {
        "type": "filter",
        "path": "boardId"
      }
    ]
  }
});
```

#### Create `/src/lib/embeddings.ts`

```typescript
/**
 * Generate and search embeddings for semantic memory
 */

import { getDb } from './mongodb';

export async function generateEmbedding(text: string): Promise<number[]> {
  // Option 1: Use OpenAI Embeddings API
  // const response = await fetch('https://api.openai.com/v1/embeddings', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     model: 'text-embedding-3-small',
  //     input: text
  //   })
  // });
  // const data = await response.json();
  // return data.data[0].embedding;

  // Option 2: Ask Clawdbot to generate embedding
  // (Clawdbot might have embedding generation built-in)

  // For now, return placeholder
  return new Array(1536).fill(0);
}

export async function storeMessageEmbedding(
  messageId: string,
  boardId: string,
  userId: string,
  content: string
) {
  const embedding = await generateEmbedding(content);
  const db = await getDb();

  await db.collection('message_embeddings').insertOne({
    messageId,
    boardId,
    userId,
    content,
    embedding,
    createdAt: new Date()
  });
}

export async function semanticSearch(
  query: string,
  userId: string,
  limit: number = 10
): Promise<any[]> {
  const queryEmbedding = await generateEmbedding(query);
  const db = await getDb();

  // MongoDB Atlas Vector Search
  const results = await db.collection('message_embeddings').aggregate([
    {
      $vectorSearch: {
        index: 'semantic_search',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit: limit,
        filter: {
          userId: userId
        }
      }
    },
    {
      $project: {
        content: 1,
        messageId: 1,
        score: { $meta: 'vectorSearchScore' }
      }
    }
  ]).toArray();

  return results;
}
```

#### Hook into chat API to generate embeddings

```typescript
// In /src/app/api/chat/route.ts POST handler
// After creating message:

if (actor === 'mike' || actor === 'moltbot') {
  // Store embedding for future semantic search
  await storeMessageEmbedding(
    message.id,
    message.boardId,
    'mike', // TODO: actual userId
    message.content
  );
}
```

---

## Revised Week 1 Sprint

**Day 1: Settings Panel**
- [ ] Create settings page
- [ ] Create settings API endpoint
- [ ] Store settings in MongoDB
- [ ] Apply temperature/personality to Clawdbot

**Day 2: Chat Deletion & Privacy**
- [ ] Add delete button to chat messages
- [ ] Implement DELETE endpoint
- [ ] Add "Clear All Memories" function
- [ ] Delete embeddings when message deleted

**Day 3: Avatar & Branding**
- [ ] Extract/prepare logo for avatar
- [ ] Update all actor configs
- [ ] Test avatar in chat UI
- [ ] Ensure consistent branding

**Day 4: Vector Search Setup**
- [ ] Create MongoDB vector index
- [ ] Implement embedding generation
- [ ] Store embeddings for new messages
- [ ] Test semantic search

**Day 5: Integration Testing**
- [ ] Test all settings work with Clawdbot
- [ ] Verify deletions work
- [ ] Test semantic memory
- [ ] Document user-facing features

---

## Questions for You

### 1. Moltbot Settings - How to Apply?

**Question:** When user changes temperature/personality in Moltboard settings, how do we tell Clawdbot?

**Options:**
a) Store in MongoDB, Clawdbot plugin reads settings before each response
b) Call Clawdbot API to update settings
c) Settings only apply to Moltboard-initiated requests

**Recommendation:** Store in MongoDB under user profile, Clawdbot plugin includes settings in context.

---

### 2. Vector Search - Which Embedding Model?

**Question:** What embedding model should we use?

**Options:**
a) OpenAI `text-embedding-3-small` (1536 dims, $0.02/1M tokens)
b) OpenAI `text-embedding-3-large` (3072 dims, $0.13/1M tokens)
c) Ask Clawdbot to generate embeddings (if supported)
d) Defer vector search to Phase 2

**Recommendation:** Start with OpenAI `text-embedding-3-small` for cost-effectiveness.

---

### 3. Logo Avatar

**Question:** Should we use the full logo or create a simplified icon?

I can help create a circular avatar version of your logo if you want. Need to see the current logo first:

```bash
# Let's look at the logo
open /Users/michael.lynn/clawd/kanban/public/logo.png
```

---

### 4. Cron in Clawdbot

**Question:** Since Clawdbot has cron, how do we tell it what jobs to run?

**Current understanding:**
- Clawdbot plugin already polls `/api/chat?pendingOnly=true`
- Clawdbot could also poll `/api/tasks` to detect stuck tasks
- Clawdbot could schedule daily briefings internally

**Action needed:** Configure Clawdbot to:
1. Check for stuck tasks every 6 hours
2. Generate daily briefing at user's preferred time

**Where to configure?** In `~/.clawdbot/clawdbot.json` or via Moltboard settings API?

---

## Next Steps

1. **Confirm architecture understanding** - Is this correct now?
2. **Answer the 4 questions above**
3. **I'll build the settings panel** (Day 1 sprint)
4. **Set up vector search** (if you want it Phase 1)

**Ready to start building when you confirm the approach!** 🚀
