# Moltboard Implementation Roadmap
## Turning Vision into Reality

**Based on:** [STRATEGIC_VISION.md](./STRATEGIC_VISION.md)
**Date:** 2026-01-31
**Status:** Planning → Implementation

---

## 🎯 North Star Metrics

**Primary Success Metric:**
- **Active Daily Users engaging with Moltbot** (not just board usage)

**Supporting Metrics:**
- Messages sent to Moltbot per user/day
- Tasks created/updated by Moltbot (vs manually)
- User retention after first "aha moment" (Moltbot proactive action)

---

## Phase 1: AI-Native Core (Weeks 1-4)

**Goal:** Make Moltbot feel like a teammate, not a chatbot

### Week 1-2: Proactive Moltbot

**What we're building:**
Moltbot autonomously monitors the board and takes initiative

**Features:**

#### 1.1 Daily Briefing
```typescript
// Every morning at 8am (user's timezone)
interface DailyBriefing {
  summary: string;           // "You have 3 tasks in progress, 2 overdue"
  priorities: Task[];        // Top 3 tasks Moltbot recommends for today
  blockers: Task[];          // Tasks stuck > 3 days
  suggestions: string[];     // "Should I draft the blog post for TASK-123?"
}
```

**Implementation:**
- [ ] Create `/src/lib/moltbot/briefing.ts` - Briefing generator
- [ ] Add cron job or scheduled task (runs server-side)
- [ ] Post briefing to general chat (boardId: 'general')
- [ ] UI: Show briefing in ActivityStream with special styling

**Files to create/modify:**
- `/src/lib/moltbot/briefing.ts` - Core briefing logic
- `/src/app/api/cron/daily-briefing/route.ts` - Scheduled endpoint
- `/src/components/ActivityStream.tsx` - Add briefing card UI

---

#### 1.2 Stuck Task Detection

Moltbot monitors tasks and intervenes:

```typescript
// Check every 6 hours
interface StuckTaskCheck {
  taskId: string;
  stuckDays: number;         // How long in current column
  lastActivity: Date;
  suggestion: string;        // "Need help? Want me to research solutions?"
}
```

**Triggers:**
- Task in "In Progress" > 3 days → "This task seems stuck. Need help?"
- Task with no comments > 7 days → "Want me to break this down into subtasks?"
- Task moved back to "To Do" → "What went wrong? Should I add notes?"

**Implementation:**
- [ ] Create `/src/lib/moltbot/stuck-detector.ts`
- [ ] Add background job (every 6 hours)
- [ ] Post contextual message to task's chat thread
- [ ] Track user responses to learn patterns

**Files:**
- `/src/lib/moltbot/stuck-detector.ts`
- `/src/app/api/cron/check-stuck-tasks/route.ts`

---

#### 1.3 Pattern Recognition

Moltbot learns your habits:

```typescript
interface UserPattern {
  userId: string;
  patterns: {
    bestWorkTime: string;      // "You ship most tasks 2-4pm"
    weakDays: string[];        // "Mondays are slow for you"
    taskPreferences: {
      avoidDays: string[];     // "You hate Monday deadlines"
      preferredLabels: string[];
    };
  };
}
```

**Examples:**
- "I noticed you always push content tasks to Friday. Want me to schedule them earlier?"
- "You've completed 3 API tasks this week but haven't touched design. Should we prioritize?"

**Implementation:**
- [ ] Create `/src/lib/moltbot/pattern-analyzer.ts`
- [ ] Store patterns in MongoDB (`user_patterns` collection)
- [ ] Use patterns to inform suggestions
- [ ] Weekly "insights" message

**Files:**
- `/src/lib/moltbot/pattern-analyzer.ts`
- `/src/lib/moltbot/insights.ts`
- Add to schema: `user_patterns` collection

---

### Week 3-4: Natural Language Task Creation

**Goal:** Create tasks by talking naturally to Moltbot

**Examples:**
- "Remind me to follow up with John next Tuesday" → Creates task, sets due date
- "Draft a blog post about the new feature" → Creates task with draft attached
- "We should add dark mode eventually" → Creates backlog task with "nice-to-have" label

**Implementation:**

```typescript
// Natural language parser
interface TaskIntent {
  action: 'create' | 'update' | 'remind';
  title: string;
  dueDate?: Date;
  priority?: 'p0' | 'p1' | 'p2';
  column?: string;
  context?: string;        // Additional info extracted
}
```

**Technical approach:**
1. User sends message to Moltbot
2. Moltbot analyzes intent (using Claude)
3. If task-related → extract details + create task
4. Confirm with user: "Created task: 'Follow up with John' (Due: Feb 6)"

**Implementation:**
- [ ] Create `/src/lib/moltbot/nlp-parser.ts`
- [ ] Add intent classification
- [ ] Implement task creation from chat
- [ ] Add confirmation messages

**Files:**
- `/src/lib/moltbot/nlp-parser.ts`
- `/src/lib/moltbot/task-creator.ts`
- Update `/src/app/api/chat/route.ts` to detect task intents

---

## Phase 2: Deep Integrations (Weeks 5-8)

**Goal:** Moltbot has context from everywhere

### Week 5-6: GitHub Integration

**What it does:**
- PR opened → Creates task "Review PR #123"
- PR merged → Moves associated task to Done
- Issue created → Creates task with GitHub link
- Commit mentions task ID → Updates task with commit link

**Implementation:**

```typescript
// Webhook handler
interface GitHubEvent {
  type: 'pull_request' | 'issue' | 'push';
  action: 'opened' | 'closed' | 'merged';
  data: {
    title: string;
    url: string;
    author: string;
  };
}
```

**Setup:**
- [ ] Add GitHub webhook endpoint: `/api/webhooks/github`
- [ ] Parse webhook events
- [ ] Create/update tasks automatically
- [ ] Post to chat: "PR #123 merged! Moving TASK-456 to Done"

**Files:**
- `/src/app/api/webhooks/github/route.ts`
- `/src/lib/integrations/github.ts`
- Add to `.env`: `GITHUB_WEBHOOK_SECRET`

---

### Week 6-7: Calendar Integration

**What it does:**
- Task with due date → Creates calendar event
- Calendar event → Can create task
- Meeting scheduled → Moltbot suggests prep tasks
- Deadline approaching → Moltbot reprioritizes board

**Implementation:**

```typescript
// Google Calendar API integration
interface CalendarSync {
  taskId: string;
  eventId: string;
  dueDate: Date;
  syncBoth: boolean;  // Changes in calendar update task & vice versa
}
```

**Files:**
- `/src/lib/integrations/google-calendar.ts`
- `/src/app/api/calendar/sync/route.ts`
- OAuth flow for Google Calendar

---

### Week 7-8: Email Integration

**What it does:**
- Starred email → "Should I create a task for this?"
- Task created from email → Includes email content
- Task completed → Can send follow-up email
- Deadline missed → Moltbot drafts apology email

**Implementation:**
- [ ] Gmail API integration
- [ ] Email → Task creation flow
- [ ] Task → Email sending
- [ ] Email templates

**Files:**
- `/src/lib/integrations/gmail.ts`
- `/src/app/api/email/create-task/route.ts`

---

## Phase 3: AI Work Execution (Weeks 9-12)

**Goal:** Moltbot doesn't just organize - it does work

### Week 9-10: Content Drafting

**What it does:**
- "Draft the blog post for this task" → Moltbot writes first draft
- "Research competitors for this feature" → Moltbot creates research doc
- "Write the release notes" → Moltbot summarizes changes

**Implementation:**

```typescript
interface WorkExecution {
  taskId: string;
  workType: 'draft' | 'research' | 'outline' | 'notes';
  context: {
    taskDescription: string;
    relatedTasks: Task[];
    userPreferences: UserPattern;
  };
  output: {
    content: string;
    format: 'markdown' | 'text';
    attachedTo: string;  // Comment or file
  };
}
```

**Files:**
- `/src/lib/moltbot/work-executor.ts`
- `/src/lib/moltbot/content-drafter.ts`
- `/src/lib/moltbot/researcher.ts`

---

### Week 11: Subtask Generation

**What it does:**
- Large task → "Want me to break this down?"
- Epic → Moltbot creates logical subtasks
- Checklist → Auto-generated based on task type

**Example:**
```
Task: "Launch new feature"

Moltbot creates:
- [ ] Write feature spec
- [ ] Design mockups
- [ ] Implement backend
- [ ] Implement frontend
- [ ] Write tests
- [ ] Update docs
- [ ] Deploy to staging
- [ ] QA testing
- [ ] Deploy to production
- [ ] Write launch announcement
```

**Files:**
- `/src/lib/moltbot/subtask-generator.ts`

---

### Week 12: Smart Scheduling

**What it does:**
- Analyzes your patterns
- Suggests optimal due dates
- Auto-reschedules when blocked
- Balances workload across days

**Example:**
- "You have 5 tasks due Friday. I moved 2 to Thursday based on your velocity."

**Files:**
- `/src/lib/moltbot/scheduler.ts`

---

## Phase 4: Team Intelligence (Weeks 13-16)

**Goal:** Multi-user with Moltbot as mediator

### Features:

#### 4.1 Automated Standups
Moltbot collects updates and summarizes:
- "What did you ship yesterday?"
- "What are you working on today?"
- "Any blockers?"

Posts summary to team chat at 9am.

#### 4.2 Institutional Knowledge
- "Ask Moltbot about the project"
- Moltbot remembers decisions, discussions, context
- Searchable: "Why did we choose PostgreSQL?"

#### 4.3 Pattern Detection (Team)
- "Sarah ships design faster when given 2-day sprints"
- "Backend tasks take 50% longer than estimated"
- "We ship fastest on Tuesdays"

---

## Technical Architecture

### Moltbot Service Layer

```
┌─────────────────────────────────────────────┐
│              MOLTBOARD                       │
│  (Next.js App + MongoDB + Chat UI)           │
└────────────────┬────────────────────────────┘
                 │
                 │ HTTP API + WebSocket
                 │
┌────────────────▼────────────────────────────┐
│         CLAWDBOT GATEWAY                     │
│  (AI Router + Channel Manager)               │
│                                              │
│  Channels:                                   │
│  - Moltboard (native)                        │
│  - WhatsApp                                  │
│  - iMessage                                  │
│  - Email                                     │
└────────────────┬────────────────────────────┘
                 │
                 │ Claude API
                 │
┌────────────────▼────────────────────────────┐
│          MOLTBOT (AI Agent)                  │
│                                              │
│  Capabilities:                               │
│  - Board monitoring                          │
│  - Pattern learning                          │
│  - Work execution                            │
│  - Cross-app context                         │
│  - Natural language understanding            │
└──────────────────────────────────────────────┘
```

### Key Components to Build

#### 1. Moltbot Service (`/src/lib/moltbot/`)

```
src/lib/moltbot/
├── core/
│   ├── agent.ts              # Main Moltbot agent
│   ├── context-manager.ts    # Manages conversation context
│   └── memory.ts             # Long-term memory store
├── features/
│   ├── briefing.ts           # Daily briefings
│   ├── stuck-detector.ts     # Stuck task detection
│   ├── pattern-analyzer.ts   # User pattern learning
│   ├── nlp-parser.ts         # Natural language → tasks
│   ├── work-executor.ts      # Execute actual work
│   └── scheduler.ts          # Smart scheduling
├── integrations/
│   ├── github.ts
│   ├── google-calendar.ts
│   └── gmail.ts
└── utils/
    ├── prompts.ts            # System prompts for Moltbot
    └── formatters.ts         # Message formatting
```

#### 2. Background Jobs (`/src/app/api/cron/`)

```typescript
// Examples
GET /api/cron/daily-briefing    - Runs at 8am daily
GET /api/cron/check-stuck       - Runs every 6 hours
GET /api/cron/pattern-analysis  - Runs weekly
GET /api/cron/task-reminders    - Runs hourly
```

**Using Vercel Cron:**
```json
// vercel.json
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

#### 3. MongoDB Collections

```typescript
// New collections needed

// User patterns and preferences
collection: 'user_patterns'
interface UserPattern {
  userId: string;
  patterns: {
    bestWorkTime: string;
    weakDays: string[];
    taskPreferences: Record<string, any>;
  };
  updatedAt: Date;
}

// Moltbot memory (long-term context)
collection: 'moltbot_memory'
interface MoltbotMemory {
  userId: string;
  boardId: string;
  type: 'decision' | 'preference' | 'context';
  content: string;
  embedding?: number[];  // For semantic search
  createdAt: Date;
}

// Integration state
collection: 'integrations'
interface Integration {
  userId: string;
  type: 'github' | 'calendar' | 'email';
  config: Record<string, any>;
  oauth: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  };
}
```

---

## Quick Wins (Start Here)

**Week 1 Sprint - Prove the Vision:**

### Day 1-2: Daily Briefing MVP
- [ ] Create briefing generator
- [ ] Post to chat at 8am
- [ ] Include: tasks in progress, overdue, today's priorities

### Day 3-4: Stuck Task Detection
- [ ] Detect tasks stuck > 3 days
- [ ] Post contextual question to task chat
- [ ] Track responses

### Day 5: Natural Language MVP
- [ ] Parse "remind me to X" → create task
- [ ] Parse "draft Y" → create task with note

**Ship this to your first user** (yourself!) by end of Week 1.

---

## Success Metrics by Phase

### Phase 1 (AI-Native Core)
- [ ] 80% of tasks created via Moltbot chat (vs manual UI)
- [ ] Moltbot sends 3+ proactive messages/day
- [ ] User responds to Moltbot suggestions 60%+ of time

### Phase 2 (Deep Integrations)
- [ ] 50% of tasks auto-created from integrations
- [ ] Calendar sync active for all users
- [ ] GitHub events → task updates working

### Phase 3 (AI Work Execution)
- [ ] Moltbot drafts attached to 30% of tasks
- [ ] Users accept Moltbot subtask suggestions 70%+ of time
- [ ] Time-to-task-completion decreases 40%

### Phase 4 (Team Intelligence)
- [ ] 3+ active teams using Moltboard
- [ ] Moltbot mediates 50% of team communication
- [ ] Retention > 80% after 30 days

---

## Development Priorities

**Priority 1: Make Moltbot Feel Alive** ⭐⭐⭐
- Daily briefings
- Stuck task detection
- Proactive suggestions

**Priority 2: Natural Language Interface** ⭐⭐⭐
- Create tasks from chat
- Update tasks from chat
- Query board via chat

**Priority 3: Work Execution** ⭐⭐
- Content drafting
- Research
- Subtask generation

**Priority 4: Integrations** ⭐⭐
- GitHub (high value for developers)
- Calendar (universal need)
- Email (nice-to-have)

**Priority 5: Team Features** ⭐
- Defer until solo use case is proven

---

## Next Actions

### This Week:
1. **Review this roadmap** - Align on priorities
2. **Set up Vercel Cron** - For background jobs
3. **Implement Daily Briefing MVP** - First proactive feature
4. **Ship to yourself** - Use Moltboard for Moltboard development

### This Month:
1. **Build Phase 1 features** (AI-Native Core)
2. **Design partner recruitment** - Find 3 solo founders
3. **Landing page** - moltboard.app with clear positioning
4. **Demo video** - 60-second "Moltbot in action"

---

## Questions to Resolve

1. **Moltbot Personality**
   - Tone: Professional? Casual? Humorous?
   - Name: "Moltbot" or "Molty"?
   - Avatar: Fire emoji 🔥 or custom?

2. **Privacy/Security**
   - How much does Moltbot remember?
   - User control over memory?
   - Delete/forget feature?

3. **Pricing Strategy**
   - Launch with free tier only?
   - Or paid-only beta?
   - Lifetime deals for early adopters?

4. **Technical Decisions**
   - Self-host Moltbot logic or use Clawdbot exclusively?
   - Embeddings for semantic search (Moltbot memory)?
   - WebSocket for real-time updates?

---

**Status:** Ready to start Phase 1 Week 1 🚀

**Next Update:** Weekly progress tracking

*This is a living roadmap. Update as we learn.*
