# Moltboard Rebranding Checklist

## Overview

Rebranding from "Clawd Kanban" to **Moltboard**

- **New Name:** Moltboard
- **Domain:** moltboard.app
- **Tagline:** "Task Management, Evolved" or "Transform Your Tasks"
- **Integration:** Built for OpenClaw/Moltbot
- **Theme:** Transformation, evolution, molten energy 🔥

---

## Completed ✅

- [x] package.json name changed to "moltboard"
- [x] Root layout metadata updated (title: "Moltboard")
- [x] Description mentions "Moltbot 🔥"

---

## To Update

### Core Configuration

- [ ] Update MongoDB database name from `clawd_kanban` to `moltboard`
- [ ] Update environment variables
  - [ ] MONGODB_URI database name
  - [ ] Any KANBAN_* env vars to MOLTBOARD_*
- [ ] Update repository name on GitHub (if applicable)
- [ ] Update .gitignore if needed

### Documentation Files

- [ ] README.md (create/update)
- [ ] docs/FEATURE_PLAN.md - Update references
- [ ] docs/OPENCLAW_PROPOSAL.md - Update project name
- [ ] docs/INDEPENDENT_IMPLEMENTATION_GUIDE.md - Update references
- [ ] docs/MOLTBOT_CHANNEL_INTEGRATION.md - Update project name
- [ ] docs/PROJECT_NAMING.md - Mark decision made

### UI Components

Most components use generic "Board" or "Task" language, but check:
- [ ] src/components/KanbanBoard.tsx - Rename to BoardView.tsx or MoltBoard.tsx
- [ ] src/components/KanbanColumn.tsx - Rename to BoardColumn.tsx or MoltColumn.tsx
- [ ] Page titles and headings that say "Kanban"

### Type Definitions

- [ ] src/types/kanban.ts - Rename to board.ts or moltboard.ts
- [ ] Update all imports from @/types/kanban

### API Routes

API routes use generic terms (tasks, boards, chat) - mostly fine as-is
- [ ] Check for hardcoded "kanban" strings in route.ts files
- [ ] Update API key env var name if needed (KANBAN_API_KEY → MOLTBOARD_API_KEY)

### Auth & Metadata

- [ ] src/app/(auth)/layout.tsx - Update any "Kanban" references
- [ ] src/app/(auth)/auth/signin/page.tsx - Update sign-in page title/description
- [ ] Update OpenGraph/SEO metadata for moltboard.app
- [ ] Add favicon/app icons with Moltboard branding

### Plugin/Integration

- [ ] clawdbot-plugin/package.json - Update references
- [ ] OpenClaw channel adapter naming

---

## Branding Assets Needed

### Visual Identity

- [ ] Logo design (abstract transformation/molt icon)
- [ ] Color palette (warm oranges/reds, molten theme 🔥)
- [ ] Favicon (16x16, 32x32, 192x192, 512x512)
- [ ] App icon (PWA)
- [ ] Social media preview image (og:image)

### Tagline Options

- "Task Management, Evolved"
- "Transform Your Tasks"
- "Where Work Transforms"
- "Evolve Your Workflow"
- "Built for Moltbot"

### Domain Setup

- [ ] Register moltboard.app
- [ ] Set up DNS/hosting
- [ ] SSL certificate
- [ ] Configure Vercel/hosting for moltboard.app

---

## Priority Order

### Phase 1: Critical (Do First) ✅
- [x] package.json
- [x] Root metadata
- [ ] README.md
- [ ] Database name update
- [ ] Environment variables

### Phase 2: User-Facing (Do Next)
- [ ] Page titles and UI text
- [ ] Auth pages
- [ ] SEO metadata
- [ ] Favicon

### Phase 3: Code Quality (Do Soon)
- [ ] Rename files (KanbanBoard → BoardView)
- [ ] Rename types file
- [ ] Update documentation

### Phase 4: Launch Prep (Do Before Public)
- [ ] Domain setup
- [ ] Branding assets
- [ ] Social media
- [ ] Marketing site

---

## Search & Replace Guide

### Safe to Replace Everywhere

```bash
# Component/file names
KanbanBoard → MoltBoard or BoardView
KanbanColumn → BoardColumn or MoltColumn
kanban.ts → moltboard.ts or board.ts

# Imports
@/types/kanban → @/types/moltboard

# Text strings
"Kanban" → "Moltboard"
"kanban" → "moltboard"
```

### Be Careful With

```bash
# Database collection names (needs migration)
# Keep as "boards", "tasks", etc. (generic)

# API routes
# Keep generic: /api/boards, /api/tasks (not /api/moltboard)

# Environment variables
KANBAN_API_KEY → MOLTBOARD_API_KEY (update in .env files)
```

### Don't Replace

- MongoDB collection names (boards, tasks, comments, activities, chats)
- Generic task management terms in code comments
- API endpoint paths (keep RESTful: /api/boards not /api/moltboards)

---

## Next Steps

1. Create README.md for Moltboard
2. Update database connection string
3. Rename component files
4. Update all documentation
5. Design logo and branding
6. Set up moltboard.app domain

---

**Status:** In Progress
**Last Updated:** 2026-01-31
