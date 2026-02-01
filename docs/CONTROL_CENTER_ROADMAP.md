# Moltboard Control Center Roadmap

> Transforming Moltboard from a kanban board into the command center for Mike + Butter's work.

## Vision

Moltboard becomes the single pane of glass for:
- **Task tracking** across all projects (NetPad, side projects, MongoDB work)
- **AI collaboration** — Butter can see, create, update, and prioritize work
- **Automation** — GitHub PRs auto-create/move tasks, stale work gets flagged
- **Briefings** — Daily/weekly summaries pushed proactively
- **Cross-project visibility** — GitHub, calendar, email surfaced in context

---

## Phase 1: Dashboard Mode 📊
**Goal:** At-a-glance project health

### 1.1 Dashboard Page (`/dashboard`)
- [ ] Velocity chart (tasks completed per day/week)
- [ ] Burn-down/burn-up for active sprints
- [ ] Tasks by priority pie chart
- [ ] Overdue task alerts
- [ ] "Stuck" tasks (in progress > 3 days)
- [ ] Recent activity feed (condensed)

### 1.2 Metrics API (`/api/metrics`)
```typescript
GET /api/metrics?boardId=xxx&range=7d
{
  velocity: { daily: number[], weekly: number },
  tasksByPriority: { p0: n, p1: n, p2: n, p3: n },
  tasksByColumn: { [columnId]: number },
  overdue: Task[],
  stuck: Task[],
  recentCompletions: Task[],
  avgCycleTime: number, // hours from created → done
}
```

### 1.3 Dashboard Widgets
- Board health score (0-100)
- Focus mode: "What should Mike work on next?"
- AI recommendations panel

---

## Phase 2: AI Command Center 🤖
**Goal:** Natural language task management

### 2.1 Command Parser
Butter can say:
- "Create a task: Fix the publish button on NetPad, priority P1, due Friday"
- "Move 'Design partners' to Done"
- "What's blocking the demo video?"
- "Show me all P0 and P1 tasks"
- "Archive everything in Done older than 2 weeks"

### 2.2 Enhanced Chat API
- `/api/chat/command` — Parse and execute commands
- Return structured responses (task created, task updated, query results)
- Support bulk operations

### 2.3 Contextual Awareness
- When chatting on a task, AI knows the full task context
- Can reference other tasks by title or partial match
- Understands project/board structure

---

## Phase 3: Cross-Project Hub 🔗
**Goal:** Unified view of all work

### 3.1 External Integrations
- **GitHub** — PRs, issues, CI status
- **Calendar** — Upcoming events, deadlines
- **NetPad** — Form/template status (via API)

### 3.2 Unified Activity Stream
All sources feed into one timeline:
- Task updates
- GitHub events (PR merged, issue opened)
- Calendar reminders
- System alerts

### 3.3 Data Model
```typescript
interface ExternalLink {
  id: string;
  taskId: string;
  type: 'github_pr' | 'github_issue' | 'calendar_event' | 'netpad_form';
  externalId: string;
  url: string;
  title: string;
  status?: string;
  syncedAt: Date;
}
```

### 3.4 Project Mapping
```typescript
interface Project {
  id: string;
  name: string;
  boardId: string;
  github?: { owner: string; repo: string };
  netpad?: { applicationId: string };
  color: string;
}
```

---

## Phase 4: Automation Engine ⚙️
**Goal:** Work happens automatically

### 4.1 Webhooks
- `/api/webhooks/github` — PR/issue events
- `/api/webhooks/vercel` — Deploy status
- `/api/webhooks/calendar` — Event reminders

### 4.2 Automation Rules
```typescript
interface AutomationRule {
  id: string;
  trigger: 'github_pr_merged' | 'task_stuck' | 'due_date_approaching' | 'pr_opened';
  conditions?: Record<string, unknown>;
  action: 'move_task' | 'create_task' | 'notify' | 'update_task';
  actionParams: Record<string, unknown>;
}
```

Examples:
- PR merged → Move linked task to "Done"
- PR opened → Create task in "Review" column
- Task in "In Progress" > 3 days → Add "stuck" label + notify
- Due date in 24h → Notify

### 4.3 GitHub Sync
- Bi-directional: Task → GitHub issue, GitHub issue → Task
- Auto-link PRs that mention task IDs
- CI status reflected on task cards

---

## Phase 5: Briefing Generator 📝
**Goal:** Proactive communication

### 5.1 Enhanced Daily Briefing
```markdown
## 🌅 Good morning, Mike!

### Today's Focus
1. [P1] Record 60-second demo video (due today)
2. [P0] Fix publish button (3 days stuck)

### Yesterday's Wins
- ✅ Merged PR #12: applicationId fix
- ✅ Completed 3 tasks

### Alerts
- ⚠️ "Design partners" overdue by 1 day
- 🔴 CI failing on netpad-3 main

### This Week
- 5 tasks in progress
- 2 PRs awaiting review
- Friday: NetPad demo deadline
```

### 5.2 Weekly Summary
- Velocity trends
- Completion rate
- Blockers analysis
- Recommendations

### 5.3 Delivery Channels
- Moltboard chat
- Signal/Telegram (via Clawdbot)
- Email digest

---

## Implementation Priority

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| 1.1 Dashboard page | High | Medium | 🥇 First |
| 2.1 Command parser | High | Medium | 🥈 Second |
| 4.3 GitHub sync | High | High | 🥉 Third |
| 3.1 External integrations | Medium | Medium | Fourth |
| 5.1 Enhanced briefings | Medium | Low | Fifth |
| 4.2 Automation rules | Medium | High | Sixth |

---

## Tech Decisions

- **Charts:** Recharts (lightweight, React-native)
- **GitHub:** Octokit REST API
- **Calendar:** Google Calendar API (gog CLI as fallback)
- **State:** Keep it simple — MongoDB for persistence, React Query for client
- **No new dependencies** unless absolutely necessary

---

## Database Collections

### Existing
- `boards` — Kanban boards
- `tasks` — All tasks
- `activities` — Activity log
- `chat_messages` — Chat history
- `tenants` — Multi-tenant config
- `apiKeys` — API authentication

### New (Phase 3+)
- `projects` — Cross-project mapping
- `external_links` — GitHub/calendar/NetPad links
- `automations` — Automation rules
- `metrics_snapshots` — Daily metric snapshots for trends

---

## API Endpoints to Add

### Phase 1
- `GET /api/metrics` — Dashboard metrics
- `GET /api/metrics/velocity` — Velocity over time
- `GET /api/tasks/stuck` — Tasks stuck in progress

### Phase 2
- `POST /api/chat/command` — Parse and execute commands
- `GET /api/tasks/search` — Enhanced search with NLP

### Phase 3
- `GET /api/projects` — List projects with integrations
- `POST /api/projects` — Create project
- `GET /api/external-links` — Task external links
- `POST /api/external-links/sync` — Sync external data

### Phase 4
- `POST /api/webhooks/github` — GitHub webhook receiver
- `GET /api/automations` — List automation rules
- `POST /api/automations` — Create automation rule

---

## Next Steps

1. **Now:** Build `/dashboard` page with core metrics
2. **Now:** Add `/api/metrics` endpoint
3. **Then:** Implement command parser in chat
4. **Then:** GitHub integration

Let's ship it. 🔥
