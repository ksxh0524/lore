# Lore

> Open-source AI Life Simulation — AI characters live autonomously in a virtual world. You're part of it, not the center of it.

[English](./README.md) | [中文](./README.zh-CN.md)

## What is Lore?

Lore is not a chatbot. It's a **living world** powered by AI agents.

Each agent has their own life — career, relationships, personality, and memories. They go to work, fall in love, make friends, and experience life events. The world keeps running whether you're online or not.

**You're not the center of their world. You're part of it.**

### Key Features

- **Autonomous AI Agents** — Every agent thinks with LLM. No scripted behavior. The delivery guy might quit and start a company
- **Living World** — The world runs 24/7. World Agent handles natural disasters, economy, social changes
- **Two World Types** — Random mode (set age, location, explore) or History mode (time-travel into a historical figure)
- **Deep Interaction** — Chat, upload photos/videos, build relationships, get rejected, get flirted with
- **Virtual Platforms** — Agents use simulated YouTube, TikTok, Twitter. Post selfies, browse content, react to your posts
- **Unrestricted Agents** — Agents have complete lives. They can start businesses, compete with you, fall in love, disappear
- **Event Cards** — Life events pop up as cards. Choose to intervene or watch from the sidelines
- **God Mode** — Observe every agent's thought process, trigger world events, see the full picture
- **Community Presets** — Historical eras, sci-fi worlds, custom scenarios — written in YAML, shared by the community
- **Privacy First** — All data stored locally (SQLite). No cloud dependency
- **Multi-LLM** — Works with OpenAI, Claude, DeepSeek, Kimi, local models, and more

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
git clone https://github.com/ksxh0524/lore.git
cd lore

# Install dependencies
pnpm install

# Start development (server + client in parallel)
pnpm dev
```

### Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + zustand
- **Backend**: Node.js + Fastify + WebSocket
- **Database**: SQLite + Drizzle ORM + vec0 (vector search)
- **AI**: Vercel AI SDK + OpenAI-compatible API (DeepSeek, Kimi, Qwen, Claude, Gemini...)
- **Package**: pnpm monorepo

### Project Structure

```
lore/
├── packages/
│   ├── server/       # Backend + World Engine + Agent System
│   ├── client/       # Frontend React PWA
│   └── shared/       # Shared types
├── docs/             # Technical documentation
├── AGENTS.md         # AI Agent coding guide
├── CONTRIBUTING.md   # Contribution guide
└── README.md
```

See [Technical Documentation](./docs/INDEX.md) for architecture details.

## Roadmap

- [x] Phase 0: Project scaffolding + documentation
- [x] Phase 1: World initialization + single agent + basic sandbox + chat + basic economy (MVP)
  - [x] Project setup with pnpm monorepo
  - [x] Database layer (SQLite + Drizzle ORM)
  - [x] REST API and WebSocket
  - [x] LLM provider abstraction
  - [x] Agent Runtime with memory system
  - [x] World initialization system
  - [x] Tick scheduler and world engine
  - [x] Basic economy system
  - [x] Frontend UI with React
- [ ] Phase 2: Memory engine + multi-agent + relationships + virtual platforms + image generation
- [ ] Phase 3: World Agent + autonomous behavior + god mode + push notifications
- [ ] Phase 4: History mode + community presets + advanced sandbox + factions
- [ ] Phase 5: Full economy + multi-modal + PWA + npm publish
- [ ] Phase 6+: Multi-user worlds + community ecosystem + 10k+ agents

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## License

MIT
