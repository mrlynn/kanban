# OpenClaw Channel Proposal: Moltboard Integration

## Proposal for Official Channel Support

**Project:** Moltboard
**Proposed Channel Name:** `moltboard`
**Domain:** moltboard.app
**Status:** Pre-Implementation Discussion
**Author:** Michael Lynn (@mrlynn)
**Date:** 2026-01-31

---

## Executive Summary

We propose integrating Moltboard as an officially supported channel in OpenClaw (formerly Moltbot), enabling task management and project collaboration as a native communication surface alongside WhatsApp, Telegram, and other messaging platforms.

**Key Value Propositions:**

1. **Task-Aware Conversations** - First channel to provide rich task/project context automatically
2. **Developer-Focused** - Built for engineering teams already using OpenClaw
3. **Self-Hosted Option** - Aligns with OpenClaw's philosophy of user control and privacy
4. **Open Source** - MIT licensed, community-driven development
5. **Production Ready** - Chat infrastructure already built and tested

---

## Why Moltboard as a Channel?

### Unique Value Proposition

Unlike chat-first platforms (WhatsApp, Telegram), Moltboard provides **task-centric context**:

- Conversations happen within the context of specific tasks
- AI assistant has access to task details, checklists, due dates, assignees
- Enables workflows like: "Moltbot, summarize all P1 bugs" or "What's blocking the Q1 launch?"
- Natural fit for developer productivity use cases

### Target Users

1. **Software Development Teams** - Using OpenClaw for code automation + task tracking
2. **Product Teams** - Managing roadmaps and backlogs with AI assistance
3. **Solo Developers** - Personal task management integrated with AI workflows
4. **Open Source Projects** - Community task boards with AI triage

### Differentiation from Existing Channels

| Feature | WhatsApp/Telegram | Slack/Discord | **Moltboard** |
|---------|------------------|---------------|------------|
| Message threading | ✅ | ✅ | ✅ |
| Rich task context | ❌ | ⚠️ (limited) | ✅ **Native** |
| Board/project views | ❌ | ❌ | ✅ |
| Due date awareness | ❌ | ❌ | ✅ |
| Checklist integration | ❌ | ❌ | ✅ |
| Activity tracking | ❌ | ⚠️ (basic) | ✅ |
| Self-hostable | ❌ (WhatsApp) | ❌ (Slack) | ✅ |

---

## Current Implementation Status

### What's Already Built

**Chat Infrastructure (✅ Complete):**
- RESTful API with polling support (`GET /api/chat`, `POST /api/chat`)
- Actor-based authentication (session + API key detection)
- Message status tracking (pending → processing → complete)
- Multiple UI components (FloatingChat, ChatPanel, ActivityStream)
- MongoDB backend with `chats` collection

**Task Management (✅ Complete):**
- Full CRUD for tasks, boards, columns
- Comments and activity streams
- Labels, priorities, descriptions
- Real-time updates via polling

**Integration Points (✅ Ready):**
- API key authentication (x-api-key header) already detects `moltbot` actor
- Context passing (boardId, taskId, taskTitle) in message schema
- Unread message tracking
- Status management for bot responses

**What's Missing for OpenClaw Integration:**

1. WebSocket adapter to connect to OpenClaw gateway (`ws://127.0.0.1:18789`)
2. Message format translation (Moltboard ↔ OpenClaw)
3. Channel registration with OpenClaw
4. Bidirectional sync service

**Estimated Implementation Time:** 2-3 weeks

---

## Technical Architecture

### Proposed Integration Approach

**Phase 1: WebSocket Channel Adapter (Core)**

```
Moltboard Chat UI → Moltboard API ↔ WebSocket Adapter ↔ OpenClaw Gateway (ws://18789)
                                                          ↓
                                                    OpenClaw Agent
```

**Phase 2: Enhanced Context Features**

- Task context injection in prompts
- Board-specific sessions
- Rich message formatting (task cards)
- Activity stream integration

**Phase 3: Advanced Features**

- Multi-user support per board
- DM pairing flow
- Group routing with mention gating
- Task creation/updates via chat

### Channel Adapter Design

**Repository Structure:**
```
openclaw-moltboard-channel/
├── src/
│   ├── adapter.ts          # Main WebSocket adapter
│   ├── message-translator.ts  # Format conversion
│   ├── session-manager.ts  # Session/board mapping
│   └── moltboard-client.ts    # Moltboard API client
├── tests/
│   └── integration.test.ts
├── package.json
├── README.md
└── CHANNEL.md             # Channel-specific docs
```

**Dependencies:**
- `ws` - WebSocket client for OpenClaw gateway
- `node-fetch` or `axios` - Moltboard API calls
- TypeScript - Type safety for message formats

**Configuration:**
```typescript
interface MoltboardChannelConfig {
  moltboardApiUrl: string;      // e.g., http://localhost:3001
  moltboardApiKey: string;      // For moltbot authentication
  openclawGateway: string;   // ws://127.0.0.1:18789
  channelId: string;         // "moltboard"
  defaultBoardId?: string;   // Optional default board
  enableMultiSession: boolean; // Board-specific sessions
}
```

### Message Translation Spec

**Moltboard → OpenClaw:**
```typescript
{
  channelId: "moltboard",
  sessionId: message.boardId || "general",
  userId: message.author,
  content: message.content,
  metadata: {
    taskId: message.taskId,
    taskTitle: message.taskTitle,
    replyTo: message.replyTo,
    messageId: message.id,
    timestamp: message.createdAt.toISOString()
  }
}
```

**OpenClaw → Moltboard:**
```typescript
POST /api/chat
Headers: { "x-api-key": "<KANBAN_API_KEY>" }
Body: {
  content: response.content,
  boardId: response.sessionId,
  taskId: response.metadata?.taskId,
  taskTitle: response.metadata?.taskTitle,
  replyTo: response.metadata?.messageId
}
```

---

## Implementation Plan

### Phase 1: Proof of Concept (Week 1)

**Goal:** Validate bidirectional message flow

**Deliverables:**
- [ ] HTTP webhook endpoints in Moltboard API
- [ ] Simple connector script (HTTP-based)
- [ ] Test message flow both directions
- [ ] Document setup process

**Success Criteria:** Send message in Moltboard UI → receive OpenClaw response

### Phase 2: WebSocket Channel Adapter (Week 2-3)

**Goal:** Production-ready channel adapter

**Deliverables:**
- [ ] WebSocket client connecting to OpenClaw gateway
- [ ] Channel registration and handshake
- [ ] Message translation layer
- [ ] Session management (board mapping)
- [ ] Error handling and reconnection logic
- [ ] Unit and integration tests
- [ ] Documentation and examples

**Success Criteria:**
- Channel appears in OpenClaw channel list
- Messages sync with < 2s latency
- 99.9% delivery reliability

### Phase 3: Enhanced Features (Week 4+)

**Goal:** Channel-specific capabilities

**Deliverables:**
- [ ] Task context injection
- [ ] Rich message formatting (task cards)
- [ ] Board-specific routing
- [ ] Multi-user session support
- [ ] Activity stream integration
- [ ] Task creation/update commands

**Success Criteria:**
- "Show me P1 bugs" returns formatted task list
- "Create task: Fix login bug" creates task in current board
- Users can have per-board conversations

---

## Contribution Strategy

### Following OpenClaw Guidelines

Based on [CONTRIBUTING.md](https://github.com/openclaw/openclaw/blob/main/CONTRIBUTING.md):

**Step 1: GitHub Discussion (Pre-Implementation)**
- Open GitHub Discussion in openclaw/openclaw
- Present this proposal
- Get maintainer feedback on approach
- Discuss integration points and API surface

**Step 2: Issue for Tracking**
- Create detailed GitHub Issue
- Link to discussion
- Break down implementation into reviewable chunks
- Get maintainer buy-in before coding

**Step 3: Incremental PRs (Not Monolithic)**
- PR #1: Channel adapter interface/skeleton (< 200 lines)
- PR #2: WebSocket client and connection management
- PR #3: Message translation layer
- PR #4: Session management and routing
- PR #5: Documentation and examples

**Step 4: Testing and Transparency**
- All PRs marked as "AI-assisted" where applicable
- Include test coverage for each PR
- Note testing degree (fully tested)
- Include session logs/prompts in PR description

**Avoiding Past Mistakes:**
- ❌ Don't submit 1000+ line PR without discussion (AgentMail mistake)
- ✅ Start with discussion issue first
- ✅ Get alignment before implementation
- ✅ Break into small, reviewable PRs

---

## Requesting OpenClaw's Help

### What We're Asking For

1. **Technical Guidance**
   - Review of proposed architecture
   - Feedback on message translation format
   - Guidance on channel registration API
   - Best practices for WebSocket adapter

2. **Code Review**
   - Review incremental PRs
   - Suggest improvements to integration points
   - Help optimize for OpenClaw gateway

3. **Documentation Support**
   - Guidance on channel-specific docs format
   - Help with OpenClaw-side configuration docs
   - Examples from existing channel adapters

4. **Community Promotion**
   - Mention in OpenClaw channels list
   - Showcase in docs/blog post (once stable)
   - Share with Discord community

### What We're Offering

1. **Production-Ready Code**
   - Fully tested adapter
   - Comprehensive documentation
   - Example deployment configs
   - Ongoing maintenance commitment

2. **Unique Value**
   - First task-management channel
   - Expands OpenClaw use cases
   - Developer productivity focus
   - Reference implementation for future channels

3. **Community Contribution**
   - Open source under MIT license
   - Active maintenance and bug fixes
   - Community support in Discord
   - Help other developers integrate

4. **Transparency**
   - AI-assisted development noted
   - Clear documentation of approach
   - Open communication throughout

---

## Success Metrics

### Technical Goals

- ✅ Channel appears in OpenClaw channel selector
- ✅ Message latency < 2 seconds
- ✅ 99.9% message delivery rate
- ✅ Zero message loss during reconnection
- ✅ Supports multiple concurrent boards/sessions

### User Experience Goals

- ✅ Seamless switching between Moltboard and WhatsApp
- ✅ Task context automatically available to AI
- ✅ Natural language task queries work
- ✅ No duplicate notifications
- ✅ Setup takes < 5 minutes

### Community Goals

- ✅ 100+ GitHub stars on channel adapter repo
- ✅ 10+ community contributors
- ✅ Featured in OpenClaw showcase
- ✅ 1000+ active users within 3 months

---

## Risk Mitigation

### Potential Risks

**Risk 1: OpenClaw API Changes**
- *Mitigation:* Version lock adapter to OpenClaw version, provide migration guides

**Risk 2: Scaling Issues**
- *Mitigation:* Start with single-board support, add multi-board gradually

**Risk 3: Security Concerns**
- *Mitigation:* Implement API key rotation, webhook signature verification, rate limiting

**Risk 4: Maintenance Burden**
- *Mitigation:* Commit to 2-year maintenance, recruit co-maintainers

---

## Timeline

| Week | Milestone | Deliverable |
|------|-----------|-------------|
| 1 | Discussion & Planning | GitHub Discussion opened, maintainer feedback |
| 2 | Issue Creation | Detailed GitHub Issue with implementation plan |
| 3-4 | Phase 1 POC | HTTP webhook MVP working |
| 5-7 | Phase 2 Adapter | WebSocket adapter PRs submitted |
| 8-9 | Testing & Docs | Integration tests, documentation |
| 10+ | Phase 3 Features | Enhanced task context features |

---

## Call to Action

We're requesting:

1. **Feedback on this proposal** - Is this aligned with OpenClaw's vision?
2. **Technical review** - Does the architecture make sense?
3. **Maintainer guidance** - What's the best path to official channel status?
4. **Collaboration** - Can OpenClaw team provide technical guidance during implementation?

---

## Contact & Resources

**Project Lead:** Michael Lynn (@mrlynn)
**Project Repository:** https://github.com/mrlynn/clawd-moltboard
**Live Demo:** [TBD - will deploy public demo]
**Documentation:** See [docs/MOLTBOT_CHANNEL_INTEGRATION.md](./MOLTBOT_CHANNEL_INTEGRATION.md)

**OpenClaw Resources:**
- GitHub: https://github.com/openclaw/openclaw
- Discussions: https://github.com/openclaw/openclaw/discussions
- Documentation: https://docs.openclaw.ai

---

## Appendix

### A. Example Use Cases

**Use Case 1: Daily Standup**
> User: "What tasks are in progress on the frontend board?"
> Moltbot: "3 tasks in progress: [Task links with assignees and due dates]"

**Use Case 2: Bug Triage**
> User: "Create a P1 bug: Login fails with invalid session"
> Moltbot: "Created task TASK-123 in 'To Do' column. Added P1 priority label."

**Use Case 3: Context-Aware Queries**
> User (in task chat): "What's blocking this?"
> Moltbot: "Checking task TASK-456 dependencies... Blocked by TASK-123 (In Progress, due tomorrow)"

### B. API Endpoints Summary

**Existing Moltboard APIs:**
- `GET /api/chat` - Fetch messages
- `POST /api/chat` - Send message
- `PATCH /api/chat/[messageId]` - Update status
- `GET /api/tasks?boardId=xxx` - List tasks
- `POST /api/tasks/[taskId]/comments` - Add comment

**New APIs for OpenClaw (Phase 1):**
- `POST /api/openclaw/webhook` - Receive OpenClaw messages
- `GET /api/openclaw/pending` - Poll for user messages
- `POST /api/openclaw/ack` - Acknowledge processing

### C. Competitive Analysis

**Similar Integrations:**
- Linear: Has Slack bot, no OpenClaw integration
- Asana: Has Slack/Teams bots, closed ecosystem
- Trello: Has Power-Ups, no AI assistant integration
- ClickUp: Has chat, but not OpenClaw-compatible

**Opportunity:** First task management tool with native OpenClaw channel support

---

**Document Version:** 1.0
**Status:** Ready for Submission
**Next Step:** Post to GitHub Discussions
