# 🔥 Moltboard

**Task Management, Evolved**

Moltboard is an AI-native task board built for [OpenClaw](https://github.com/openclaw/openclaw) (formerly Moltbot). Manage your projects, collaborate with AI, and watch your tasks transform into shipped work.

[![Built for OpenClaw](https://img.shields.io/badge/Built%20for-OpenClaw-orange?logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMiAyMkgyMkwxMiAyWiIgZmlsbD0iI0Y5NzMxNiIvPgo8L3N2Zz4K)](https://github.com/openclaw/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

---

## ✨ Features

- **🤖 AI-Native** - Built-in chat with Moltbot integration
- **📋 Multiple Boards** - Organize projects with customizable boards
- **🏷️ Smart Labels** - Categorize with priority, type, and custom labels
- **💬 Task Comments** - Collaborate with team and AI on tasks
- **📊 Activity Stream** - Track all changes and updates in real-time
- **🔔 Notifications** - Unread badges for Moltbot comments
- **🗄️ Archive** - Keep completed work without clutter
- **🎨 Modern UI** - Clean Material Design interface
- **🔐 Secure Auth** - GitHub authentication with NextAuth

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB database
- GitHub OAuth App (for authentication)

### Installation

```bash
# Clone the repository
git clone https://github.com/mrlynn/moltboard.git
cd moltboard

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Environment Variables

Create a `.env.local` file with:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/moltboard?retryWrites=true&w=majority

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
ALLOWED_GITHUB_USERS=your_github_username

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your_random_secret_key

# Moltboard API
MOLTBOARD_API_KEY=your_api_key_for_moltbot
```

---

## 🦞 Moltbot Integration

Moltboard works seamlessly with OpenClaw/Moltbot as a native communication channel.

### Features

- **Task Context** - AI automatically knows which task you're discussing
- **Board Awareness** - Moltbot understands your project structure
- **Real-time Chat** - Integrated chat in every task
- **Status Tracking** - Track AI processing status (pending → complete)
- **Activity Logging** - All AI interactions logged automatically

### Setup Moltbot Integration

See [docs/INDEPENDENT_IMPLEMENTATION_GUIDE.md](docs/INDEPENDENT_IMPLEMENTATION_GUIDE.md) for building the OpenClaw channel adapter.

**Quick overview:**
1. Run Moltboard (this app)
2. Build the channel adapter (Node.js service)
3. Connect to OpenClaw gateway (`ws://127.0.0.1:18789`)
4. Chat with Moltbot directly from your tasks!

---

## 📖 Documentation

- **[Feature Plan](docs/FEATURE_PLAN.md)** - Planned features and roadmap
- **[OpenClaw Integration](docs/INDEPENDENT_IMPLEMENTATION_GUIDE.md)** - Build the channel adapter
- **[Channel Proposal](docs/OPENCLAW_PROPOSAL.md)** - Official OpenClaw channel proposal
- **[Integration Architecture](docs/MOLTBOT_CHANNEL_INTEGRATION.md)** - Technical deep-dive
- **[Rebranding](docs/REBRANDING_CHECKLIST.md)** - Moltboard rebranding checklist

---

## 🏗️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [Material-UI (MUI)](https://mui.com/)
- **Database:** [MongoDB](https://www.mongodb.com/)
- **Auth:** [NextAuth.js](https://next-auth.js.org/)
- **Drag & Drop:** [@dnd-kit](https://dndkit.com/)
- **Deployment:** [Vercel](https://vercel.com/) (recommended)

---

## 🎯 Use Cases

### For Developers
- Manage side projects with AI assistance
- Track bugs and features with context
- Chat with Moltbot about specific tasks
- Archive completed work cleanly

### For Teams
- Collaborate on projects with AI in the loop
- Track progress across multiple boards
- Get AI help on task details and blockers
- Comment threads on every task

### For AI Enthusiasts
- First task board built for OpenClaw
- AI-native workflow management
- Experiment with task-aware AI interactions
- Build on the channel adapter

---

## 🗂️ Project Structure

```
moltboard/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── (app)/             # Main app pages
│   │   ├── (auth)/            # Auth pages
│   │   └── api/               # API routes
│   ├── components/            # React components
│   │   ├── layout/           # Layout components
│   │   ├── MoltBoard.tsx     # Main board view
│   │   ├── TaskCard.tsx      # Task cards
│   │   ├── FloatingChat.tsx  # Chat UI
│   │   └── ...
│   ├── types/                # TypeScript types
│   │   ├── moltboard.ts      # Core types
│   │   └── chat.ts           # Chat types
│   └── lib/                  # Utilities
│       ├── mongodb.ts        # Database connection
│       ├── auth.ts           # Auth helpers
│       └── activity.ts       # Activity logging
├── docs/                     # Documentation
├── public/                   # Static assets
└── package.json
```

---

## 🔌 API Reference

### Boards

```typescript
GET    /api/boards              // List all boards
POST   /api/boards              // Create board
GET    /api/boards/:id          // Get board details
PATCH  /api/boards/:id          // Update board
DELETE /api/boards/:id          // Delete board
GET    /api/boards/:id/archive  // Get archived tasks
```

### Tasks

```typescript
GET    /api/tasks?boardId=xxx        // List tasks
POST   /api/tasks                    // Create task
GET    /api/tasks/:id                // Get task
PATCH  /api/tasks/:id                // Update task
DELETE /api/tasks/:id                // Delete task
POST   /api/tasks/reorder            // Reorder tasks
POST   /api/tasks/:id/archive        // Archive task
GET    /api/tasks/:id/comments       // Get comments
POST   /api/tasks/:id/comments       // Add comment
```

### Chat

```typescript
GET    /api/chat?boardId=xxx&since=timestamp  // Poll messages
POST   /api/chat                              // Send message
PATCH  /api/chat/:id                          // Update status
```

### Activities

```typescript
GET    /api/activities?boardId=xxx&since=timestamp  // Get activities
```

---

## 🤝 Contributing

We welcome contributions! Moltboard is open source and community-driven.

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Lint code
npm run lint
```

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Features (Complete)
- [x] Multiple boards
- [x] Task CRUD operations
- [x] Drag & drop reordering
- [x] Labels and priorities
- [x] Comments
- [x] Activity stream
- [x] Archive functionality
- [x] Moltbot chat integration

### 🚧 Phase 2: Enhanced Features (In Progress)
- [ ] Due dates with calendar view
- [ ] Assignees and user management
- [ ] Checklists within tasks
- [ ] Search and filtering
- [ ] OpenClaw channel adapter (standalone service)

### 🔮 Phase 3: Advanced Features (Planned)
- [ ] File attachments
- [ ] Rich text descriptions
- [ ] Markdown support
- [ ] Task templates
- [ ] Board templates
- [ ] Keyboard shortcuts
- [ ] Dark mode
- [ ] Mobile responsive improvements

### 🚀 Phase 4: OpenClaw Integration (Planned)
- [ ] Official OpenClaw channel
- [ ] Task creation via chat commands
- [ ] AI-powered task suggestions
- [ ] Context-aware automation
- [ ] Multi-user board collaboration

See [docs/FEATURE_PLAN.md](docs/FEATURE_PLAN.md) for detailed implementation plans.

---

## 📜 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[OpenClaw Team](https://github.com/openclaw/openclaw)** - For building the amazing AI assistant platform
- **[Peter Steinberger](https://github.com/steipete)** - Creator of OpenClaw (formerly Moltbot/Clawdbot)
- **[Next.js Team](https://nextjs.org/)** - For the incredible framework
- **[Material-UI](https://mui.com/)** - For the beautiful component library
- **Moltbot Community** - For inspiration and support 🔥

---

## 🔗 Links

- **Website:** [kanban.mlynn.org](https://kanban.mlynn.org)
- **GitHub:** [github.com/mrlynn/moltboard](https://github.com/mrlynn/moltboard)
- **OpenClaw:** [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)
- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/mrlynn/moltboard/issues)

---

## 💬 Community

- **Discord:** Join the [OpenClaw Discord](https://discord.gg/openclaw)
- **Discussions:** [GitHub Discussions](https://github.com/mrlynn/moltboard/discussions)
- **Twitter:** [@moltboard_dev](https://twitter.com/moltboard_dev) (coming soon)

---

<div align="center">

**Built with 🔥 by [Michael Lynn](https://github.com/mrlynn)**

**Transform Your Tasks with Moltboard**

[Get Started](https://kanban.mlynn.org) · [Documentation](docs/) · [Report Bug](https://github.com/mrlynn/moltboard/issues)

</div>
