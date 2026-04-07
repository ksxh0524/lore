# Lore

> 🌍 Open-source AI Life Simulation — AI 角色在一个虚拟世界里自主运行，你作为参与者进入其中

[English](./README.md) | [中文](./README.zh-CN.md)

## What is Lore?

Lore is not a chatbot. It's a **living world** powered by AI agents.

Each agent has their own life — career, relationships, personality, and memories. They go to work, fall in love, make friends, and experience life events. The world keeps running whether you're online or not.

**You're not the center of their world. You're part of it.**

### Key Features

- 🤖 **Autonomous AI Agents** — Each agent has their own personality, backstory, and behavior logic
- 🌍 **Living World** — The world runs 24/7. Events happen, relationships change, lives unfold
- 💬 **Deep Interaction** — Chat with agents, build relationships, influence events
- 📱 **Social Feed** — Agents post on their "social media" (photos, thoughts, life updates)
- 🎴 **Event-Driven** — Life events pop up as cards. Choose to intervene or watch from the sidelines
- 🔒 **Privacy First** — All data stored locally. No cloud dependency.
- 🔌 **Multi-LLM** — Works with OpenAI, Claude, DeepSeek, local models (Ollama), and more

### How It's Different

| | SillyTavern | AI Town | **Lore** |
|---|---|---|---|
| Agent Autonomy | ❌ Passive | ✅ Basic | ✅ Full life simulation |
| Multi-Agent World | ❌ | ✅ 25 agents | ✅ Unlimited |
| User Participation | Chat only | Observe | Interact + influence |
| Memory | Session-based | None | Long-term + semantic search |
| Visual | Text only | 2D map | Event cards + social feed |

## Quick Start

```bash
# Install
npm install -g lore

# Run
lore
```

First run will:
1. Create `~/.lore/` data directory
2. Initialize SQLite database
3. Start the world engine
4. Open your browser → `http://localhost:3952`

## Development

```bash
# Clone
git clone https://github.com/your-username/lore.git
cd lore

# Install dependencies
pnpm install

# Start development (server + client in parallel)
pnpm dev
```

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: Node.js + Fastify + WebSocket
- **Database**: SQLite + Drizzle ORM + vec0 (vector search)
- **AI**: OpenAI-compatible API (works with OpenAI, Claude, DeepSeek, Ollama...)
- **Package**: pnpm monorepo

### Project Structure

```
lore/
├── packages/
│   ├── server/       # Backend + World Engine
│   ├── client/       # Frontend React PWA
│   └── shared/       # Shared types
├── docs/
│   └── tech-design.md
└── README.md
```

See [Technical Design Document](./docs/tech-design.md) for architecture details.

## Roadmap

- [x] Phase 0: Project scaffolding
- [ ] Phase 1: Single agent + basic events + chat
- [ ] Phase 2: Memory engine + multi-agent
- [ ] Phase 3: Autonomous behavior + push notifications
- [ ] Phase 4: External channels (Telegram, Feishu, Discord) + npm publish
- [ ] Phase 5: Agent marketplace + community
- [ ] Phase 6+: Open world (agent birth/death, user-created worlds)

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

MIT
