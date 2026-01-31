# Week 1 Sprint: Prove the Vision
## Make Moltbot Feel Alive

**Goal:** Ship a working prototype that demonstrates "AI teammate, not AI feature"
**Timeline:** 5 days
**Success:** You're using Moltboard daily and Moltbot surprises you at least once

---

## The "Aha Moment" We're Building Toward

**Friday morning, 8am:**
> You open Moltboard. Moltbot says:
>
> "Good morning! I reviewed your board overnight. You have 3 tasks in progress, but 'API Documentation' has been stuck for 4 days. Want me to draft the first version? Also, you scheduled 5 tasks for Friday but historically you ship more on Tuesdays - should I reschedule some?"

**That feeling = "Holy shit, this thing actually helps."**

---

## Day 1: Foundation

### Morning: Set Up Moltbot Service Layer

**Create core structure:**

```bash
mkdir -p src/lib/moltbot/core
mkdir -p src/lib/moltbot/features
mkdir -p src/lib/moltbot/utils
```

**Files to create:**

#### 1. `/src/lib/moltbot/core/agent.ts`

```typescript
/**
 * Moltbot Agent - The AI teammate
 *
 * This is the core Moltbot interface that all features use
 * to interact with Claude via Clawdbot.
 */

import { getDb } from '@/lib/mongodb';

export interface MoltbotContext {
  userId: string;
  boardId: string;
  recentTasks?: any[];
  userPatterns?: any;
}

export class MoltbotAgent {
  private context: MoltbotContext;

  constructor(context: MoltbotContext) {
    this.context = context;
  }

  /**
   * Send a proactive message to the user
   */
  async sendProactiveMessage(message: string, metadata?: Record<string, any>) {
    const db = await getDb();

    // Post to chat as Moltbot
    await db.collection('chats').insertOne({
      id: `msg_${Date.now()}`,
      boardId: this.context.boardId,
      author: 'moltbot',
      content: message,
      status: 'complete',
      createdAt: new Date(),
      metadata: {
        proactive: true,
        ...metadata
      }
    });
  }

  /**
   * Analyze board and generate insights
   */
  async analyzeBoardState() {
    const db = await getDb();

    // Get all tasks for this board
    const tasks = await db.collection('tasks')
      .find({ boardId: this.context.boardId })
      .toArray();

    // Get recent activity
    const recentActivity = await db.collection('activities')
      .find({ boardId: this.context.boardId })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();

    return {
      totalTasks: tasks.length,
      inProgress: tasks.filter(t => t.column === 'in-progress').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).length,
      recentActivity,
      tasks
    };
  }

  /**
   * Generate a daily briefing
   */
  async generateBriefing() {
    const state = await this.analyzeBoardState();

    // Simple briefing for MVP
    let briefing = `Good morning! 📋\n\n`;

    briefing += `**Board Status:**\n`;
    briefing += `- ${state.totalTasks} total tasks\n`;
    briefing += `- ${state.inProgress} in progress\n`;

    if (state.overdue > 0) {
      briefing += `- ⚠️ ${state.overdue} overdue\n`;
    }

    briefing += `\nWhat should we tackle today?`;

    return briefing;
  }
}
```

---

#### 2. `/src/lib/moltbot/features/briefing.ts`

```typescript
/**
 * Daily Briefing Feature
 *
 * Moltbot reviews the board each morning and provides a summary
 */

import { MoltbotAgent } from '../core/agent';
import { getDb } from '@/lib/mongodb';

export async function generateDailyBriefings() {
  const db = await getDb();

  // Get all boards (for MVP, we'll just do 'general')
  const boards = ['general']; // TODO: Get from DB when we have multiple boards

  for (const boardId of boards) {
    const agent = new MoltbotAgent({
      userId: 'mike', // TODO: Get actual user
      boardId
    });

    const briefing = await agent.generateBriefing();
    await agent.sendProactiveMessage(briefing, {
      type: 'daily-briefing',
      generatedAt: new Date()
    });
  }

  return { success: true, boardsProcessed: boards.length };
}
```

---

### Afternoon: Create Cron Endpoint

#### 3. `/src/app/api/cron/daily-briefing/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateDailyBriefings } from '@/lib/moltbot/features/briefing';

/**
 * Daily Briefing Cron Job
 *
 * Runs every morning at 8am to generate Moltbot briefings
 */
export async function GET(request: NextRequest) {
  // Verify this is a cron request (Vercel adds this header)
  const authHeader = request.headers.get('authorization');

  // For local testing, allow any request
  // In production, verify: authHeader === `Bearer ${process.env.CRON_SECRET}`

  try {
    const result = await generateDailyBriefings();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Daily briefing error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

#### 4. `/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-briefing",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

### Evening: Test It

**Manual trigger:**
```bash
# Start your app
npm run dev

# In another terminal, trigger the briefing
curl http://localhost:3001/api/cron/daily-briefing
```

**Expected result:**
- Check your Moltboard chat
- Should see a daily briefing from Moltbot
- Should include task counts

✅ **Day 1 Complete:** Moltbot can send proactive messages!

---

## Day 2: Stuck Task Detection

### Morning: Build the Detector

#### 5. `/src/lib/moltbot/features/stuck-detector.ts`

```typescript
/**
 * Stuck Task Detection
 *
 * Monitors tasks and alerts when they're stuck too long
 */

import { MoltbotAgent } from '../core/agent';
import { getDb } from '@/lib/mongodb';

interface StuckTask {
  taskId: string;
  title: string;
  column: string;
  daysStuck: number;
  lastActivity?: Date;
}

export async function detectStuckTasks() {
  const db = await getDb();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find tasks in 'in-progress' older than 3 days
  const tasks = await db.collection('tasks').find({
    column: 'in-progress',
    createdAt: { $lt: threeDaysAgo }
  }).toArray();

  const stuckTasks: StuckTask[] = [];

  for (const task of tasks) {
    // Check last activity
    const lastActivity = await db.collection('activities')
      .findOne(
        { taskId: task.id },
        { sort: { timestamp: -1 } }
      );

    const daysSinceActivity = lastActivity
      ? Math.floor((Date.now() - new Date(lastActivity.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity >= 3) {
      stuckTasks.push({
        taskId: task.id,
        title: task.title,
        column: task.column,
        daysStuck: daysSinceActivity,
        lastActivity: lastActivity?.timestamp
      });
    }
  }

  // Send alerts for stuck tasks
  for (const stuck of stuckTasks) {
    const agent = new MoltbotAgent({
      userId: 'mike',
      boardId: 'general' // TODO: Get from task
    });

    const message = `🚨 **Task Alert:** "${stuck.title}" has been in progress for ${stuck.daysStuck} days with no activity.\n\nNeed help? Want me to:\n- Break it into smaller tasks?\n- Research solutions?\n- Mark it as blocked?`;

    await agent.sendProactiveMessage(message, {
      type: 'stuck-task-alert',
      taskId: stuck.taskId,
      daysStuck: stuck.daysStuck
    });
  }

  return { stuckTasks: stuckTasks.length };
}
```

---

#### 6. `/src/app/api/cron/check-stuck/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { detectStuckTasks } from '@/lib/moltbot/features/stuck-detector';

/**
 * Stuck Task Detection Cron
 * Runs every 6 hours
 */
export async function GET(request: NextRequest) {
  try {
    const result = await detectStuckTasks();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stuck detection error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

#### 7. Update `/vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-briefing",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/check-stuck",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

---

### Afternoon: Test With Real Data

**Create a stuck task:**
1. Create a task in "In Progress"
2. Manually update its `createdAt` to 4 days ago in MongoDB:

```bash
# MongoDB shell or Compass
db.tasks.updateOne(
  { id: "your-task-id" },
  { $set: { createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) } }
)
```

**Trigger the check:**
```bash
curl http://localhost:3001/api/cron/check-stuck
```

**Expected result:**
- Moltbot sends alert about stuck task
- Offers to help

✅ **Day 2 Complete:** Moltbot detects and alerts on stuck tasks!

---

## Day 3: Natural Language Task Creation

### Morning: NLP Parser

#### 8. `/src/lib/moltbot/features/nlp-parser.ts`

```typescript
/**
 * Natural Language Parser
 *
 * Detects task creation intents from chat messages
 */

export interface TaskIntent {
  action: 'create' | 'update' | 'query' | 'none';
  title?: string;
  dueDate?: Date;
  priority?: string;
  context?: string;
}

export function parseTaskIntent(message: string): TaskIntent {
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching for MVP
  // TODO: Use Claude API for better intent detection

  // Pattern: "remind me to X"
  if (lowerMessage.match(/remind me to|reminder to|todo:/i)) {
    const title = message
      .replace(/remind me to|reminder to|todo:/i, '')
      .trim();

    return {
      action: 'create',
      title,
      context: 'reminder'
    };
  }

  // Pattern: "draft X" or "write X"
  if (lowerMessage.match(/draft|write|create/i)) {
    const match = message.match(/(draft|write|create)\s+(.+)/i);
    if (match) {
      return {
        action: 'create',
        title: match[2].trim(),
        context: 'content-creation'
      };
    }
  }

  // Pattern: "by [date]" or "due [date]"
  let dueDate: Date | undefined;

  if (lowerMessage.includes('tomorrow')) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);
  } else if (lowerMessage.includes('next week')) {
    dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
  } else if (lowerMessage.match(/next (monday|tuesday|wednesday|thursday|friday)/i)) {
    // TODO: Calculate next occurrence of day
  }

  // If we detected a due date but no action yet
  if (dueDate && !title) {
    const title = message
      .replace(/tomorrow|next week|by|due/gi, '')
      .trim();

    return {
      action: 'create',
      title,
      dueDate
    };
  }

  return { action: 'none' };
}
```

---

### Afternoon: Integrate with Chat API

#### 9. Update `/src/app/api/chat/route.ts`

Add intent detection when messages arrive:

```typescript
// In the POST handler, after creating the message:

// If message is from mike (user), check for task intent
if (actor === 'mike') {
  const { parseTaskIntent } = await import('@/lib/moltbot/features/nlp-parser');
  const intent = parseTaskIntent(content);

  if (intent.action === 'create' && intent.title) {
    // Create the task
    const newTask = {
      id: generateId('task'),
      boardId: boardId || 'general',
      title: intent.title,
      description: '',
      column: 'todo',
      labels: [],
      priority: intent.priority || 'p2',
      dueDate: intent.dueDate,
      createdAt: new Date(),
      createdBy: actor
    };

    await db.collection('tasks').insertOne(newTask);

    // Moltbot confirms
    const confirmMessage = {
      id: generateId('msg'),
      boardId: boardId || 'general',
      author: 'moltbot',
      content: `✅ Created task: "${intent.title}"${intent.dueDate ? ` (Due: ${intent.dueDate.toLocaleDateString()})` : ''}`,
      status: 'complete',
      createdAt: new Date(),
      metadata: {
        taskCreated: newTask.id
      }
    };

    await db.collection('chats').insertOne(confirmMessage);
  }
}
```

---

### Evening: Test Natural Language

**Try these in Moltboard chat:**
- "Remind me to follow up with John"
- "Draft blog post about Moltbot"
- "Write documentation tomorrow"

**Expected results:**
- Tasks created automatically
- Moltbot confirms with task details
- Tasks appear on board

✅ **Day 3 Complete:** Natural language task creation works!

---

## Day 4: Polish & UI Enhancements

### Morning: Special Moltbot Message Styling

#### 10. Update `/src/components/layout/ChatPanel.tsx`

Add visual distinction for proactive Moltbot messages:

```typescript
// In the message rendering:

{message.author === 'moltbot' && message.metadata?.proactive && (
  <Chip
    label="Proactive"
    size="small"
    color="warning"
    icon={<Lightbulb />}
    sx={{ ml: 1 }}
  />
)}
```

---

### Afternoon: Moltbot Status Indicator

#### 11. Add "Moltbot is thinking..." indicator

When a message is processing, show:
```
🔥 Moltbot is analyzing...
```

---

### Evening: Documentation

#### 12. Create `/docs/MOLTBOT_FEATURES.md`

Document what Moltbot can do so users know.

✅ **Day 4 Complete:** Polished UI and documented features!

---

## Day 5: Ship It & Demo

### Morning: Self-Dogfooding

1. **Use Moltboard for Moltboard development**
   - Create task: "Week 1 Sprint - Build Daily Briefing"
   - Let it sit for 3 days → Moltbot alerts
   - Talk to Moltbot: "Remind me to deploy to prod"

2. **Collect Evidence**
   - Screenshots of proactive messages
   - Screenshots of task creation from chat
   - Note your reactions

---

### Afternoon: Create Demo Video

**60-second script:**

```
[0:00] "I'm a solo founder building Moltboard"
[0:05] "Every morning, Moltbot reviews my board"
[0:10] *Show daily briefing message*
[0:15] "It notices when tasks are stuck"
[0:20] *Show stuck task alert*
[0:25] "I can create tasks just by talking"
[0:30] *Type "Remind me to..." → task appears*
[0:35] "Moltbot isn't a feature - it's my co-founder"
[0:40] *Show board with Moltbot actively helping*
[0:45] "Coming soon: Moltbot drafts content, does research"
[0:50] "Try it: moltboard.app"
[0:55] *Logo + CTA*
```

---

### Evening: Ship & Share

1. **Deploy to production**
   ```bash
   git add .
   git commit -m "Week 1: Moltbot proactive features"
   git push origin main
   ```

2. **Share on Twitter**
   ```
   I spent this week making my project board actually helpful.

   Moltbot (my AI teammate) now:
   - Reviews my board every morning
   - Alerts me when tasks are stuck
   - Creates tasks from chat messages

   It's not a chatbot. It's a co-founder.

   Demo: [video]
   Try it: moltboard.app
   ```

✅ **Day 5 Complete:** Shipped and shared!

---

## Success Criteria

By end of Week 1, you should:

- [ ] Daily briefing working (triggers at 8am)
- [ ] Stuck task detection working (checks every 6 hours)
- [ ] Natural language task creation working
- [ ] Using Moltboard for your own work
- [ ] Had at least one "aha moment" with Moltbot
- [ ] Created demo video
- [ ] Shared on social media

---

## Next Week Preview

**Week 2: Deep Integrations**
- GitHub webhook (PRs → tasks)
- Calendar sync (due dates → events)
- Email integration (emails → tasks)

**Week 3: AI Work Execution**
- Moltbot drafts content
- Moltbot does research
- Moltbot creates subtasks

**Week 4: Launch Prep**
- Landing page
- Pricing page
- Design partner recruitment

---

## Emergency Shortcuts

**If you're behind schedule:**

**Must ship:**
- Daily briefing
- Stuck task detection

**Can defer:**
- Natural language parsing (use simple patterns)
- UI polish
- Demo video

**The core insight to prove:** Moltbot is proactive, not reactive.

---

## Resources

- **Implementation Roadmap:** [docs/IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md)
- **Strategic Vision:** [docs/STRATEGIC_VISION.md](./STRATEGIC_VISION.md)
- **Moltbot Prompt Templates:** [TBD - create as needed]

---

**Ready to start? Let's build Day 1! 🚀**
