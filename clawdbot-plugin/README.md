# @moltboard/clawdbot-plugin

Clawdbot channel plugin for [Moltboard](https://github.com/mrlynn/moltboard) — AI-native task management.

## Features

- 💬 Chat with Clawdbot directly from Moltboard task cards
- 🔗 Full task context injected into conversations  
- 📋 Create, update, and manage tasks via natural language
- 🔄 Real-time message polling and delivery

## Installation

```bash
npm install @moltboard/clawdbot-plugin
```

## Configuration

Add to your `clawdbot.json` or `gateway.yaml`:

```json
{
  "channels": {
    "moltboard": {
      "enabled": true,
      "apiUrl": "https://kanban.mlynn.org",
      "apiKey": "your-moltboard-api-key",
      "defaultBoardId": "board_xxx",
      "pollIntervalMs": 5000
    }
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable the channel |
| `apiUrl` | string | `https://kanban.mlynn.org` | Moltboard API base URL |
| `apiKey` | string | — | API key from Moltboard Settings |
| `defaultBoardId` | string | — | Default board for message routing |
| `pollIntervalMs` | number | `5000` | Polling interval in milliseconds |

## Getting Your API Key

1. Go to your Moltboard instance → **Settings**
2. Under **API Keys**, click **Create Key**
3. Copy the full key (starts with `moltboard_sk_...`)

## Getting Your Board ID

The board ID is in the URL when viewing a board:
```
https://kanban.mlynn.org/board/board_a04c5b25d72ea6af
                              ^^^^^^^^^^^^^^^^^^^^^^^^
```

## Usage

Once configured, Clawdbot will:

1. Poll Moltboard for new messages
2. Dispatch them to the agent with full task context
3. Send agent responses back to Moltboard

### Task Context

When chatting from a task card, Clawdbot receives:
- Task title and description
- Priority and labels
- Due date
- Checklist progress
- Board context

### Commands

The Moltboard API supports natural language commands:

```
create task: Fix the login bug, priority high, due tomorrow
move "Design review" to done
show me all P1 tasks
archive all done tasks
```

## Development

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT

## Links

- [Moltboard](https://github.com/mrlynn/moltboard)
- [Clawdbot](https://github.com/clawdbot/clawdbot)
- [Documentation](https://docs.clawd.bot)
