#!/bin/bash

# Send a message to Moltbot through Moltboard API
# This will be picked up by the Clawdbot channel plugin

API_KEY="461e0eef6b8d7096a4de2946030b55ac3b0dadf4f3a4327d7ecbb0a4ab647a89"
API_URL="http://localhost:3001/api/chat"

MESSAGE="Hey Moltbot! 👋 We need to coordinate on building out Moltboard features together.

**This Week - User Control Features:**
1. Settings panel (temperature, personality, proactive toggles)
2. Chat deletion & privacy controls
3. Logo avatar for you
4. Optional: Vector search for semantic memory

**Key Questions:**
1. How should Moltboard settings (temperature, personality) be passed to you?
2. Do you want vector embeddings for semantic search now?
3. Should we build the settings API first so you can read user preferences?

What do you think? Ready to pair program on this? 🔥

**Context:** We're rebranding from Kanban to Moltboard, and I want to make sure you have all the context you need to help build the proactive features we discussed in the strategic vision.

cc: @docs/STRATEGIC_VISION.md @docs/REVISED_IMPLEMENTATION.md"

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"content\": $(echo "$MESSAGE" | jq -Rs .),
    \"boardId\": \"general\"
  }"

echo "\n\nMessage sent! Check Moltboard chat or Clawdbot dashboard."
