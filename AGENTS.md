# Lore Agent Instructions

pnpm monorepo: `packages/server` (Fastify backend), `packages/client` (React frontend), `packages/shared` (types)

## Commands

```bash
pnpm dev              # server + client in parallel
pnpm dev:server       # backend only (port 3952)
pnpm dev:client       # frontend only (port 39528)
pnpm build            # shared first, then server + client (order matters)
pnpm test             # vitest in packages/server
pnpm test:unit        # runs tests/unit folder
pnpm lint             # ESLint across packages/*/src
pnpm format           # Prettier
```

## Key Facts

- **Build order**: `packages/shared` must build before server/client (see root package.json)
- **Database**: SQLite at `~/.lore/lore.db`, auto-created on first run (no migration commands)
- **Native deps**: `better-sqlite3` requires compilation (in onlyBuiltDependencies)
- **Mock LLM**: `ENABLE_MOCK_PROVIDER=true` allows dev without API keys (default: true)
- **Ports**: server 3952, client 39528 (defaults in config/loader.ts)
- **Tests**: vitest in packages/server only, structure: `tests/unit/`, `tests/integration/`

## Code Style

- TypeScript strict + `noUncheckedIndexedAccess` + `noImplicitReturns` (tsconfig.base.json)
- Files: `kebab-case.ts`, classes: `PascalCase`, functions: `camelCase`
- ESLint import order enforced: alphabetize, newlines-between groups (see .eslintrc.json)
- Shared types in `packages/shared/src/types/`
- Avoid `any` - use `unknown` with type guards

## Architecture

- All agents are LLM-driven (no pure rule-engine agents)
- Tick-based event loop drives world state
- Agent memory: 3-tier system with vector search (SQLite vec0)
- Lazy agent creation: not all initialized at world start

## Docs

- `docs/INDEX.md` - documentation index
- `docs/ROADMAP.md` - development phases
- `docs/architecture/overview.md` - architecture details