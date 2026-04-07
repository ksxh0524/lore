# 后端开发规范

> 最后更新：2026-04-08 | 版本 v0.02

---

## 技术选型

| 层面 | 选型 | 版本 |
|------|------|------|
| 运行时 | Node.js | >= 20 |
| 语言 | TypeScript | 5.x strict |
| HTTP | Fastify | 5.x |
| WebSocket | @fastify/websocket | 最新 |
| ORM | Drizzle ORM | 最新 |
| 数据库 | better-sqlite3 | 最新 |
| LLM | Vercel AI SDK (ai) + @ai-sdk/openai | 最新 |
| 配置校验 | Zod | 3.x |
| 日志 | pino（Fastify 内置） | - |
| 测试 | vitest | - |

## 项目结构

```
packages/server/src/
+-- index.ts                    # 入口：创建 Fastify 实例、注册插件、启动
+-- agent/                      # Agent 系统
+-- scheduler/                  # 调度系统
+-- llm/                        # LLM 调用层
+-- multimodal/                 # 多模态（插件化）
+-- world/                      # 世界引擎
+-- preset/                     # 世界预设系统
+-- modes/                      # 玩家模式
+-- api/                        # HTTP + WebSocket
+-- db/                         # 数据库
+-- monitor/                    # 监控
+-- config/                     # 配置
```

## TypeScript 规范

### strict 模式

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler"
  }
}
```

### 类型定义

- **共享类型**放 `packages/shared/src/`，前后端共用
- **后端专用类型**就近定义在对应模块的 `types.ts`
- **接口定义**用 `interface`，联合类型用 `type`

```typescript
// ✅ Good
interface ILLMProvider {
  readonly name: string;
  generateText(request: LLMCallRequest): Promise<LLMCallResult>;
}

type AgentType = 'npc' | 'system' | 'user-avatar' | 'world' | 'init';

// ❌ Bad
type LLMProvider = {
  name: string;
  generateText: (request: any) => Promise<any>;
}
```

### 禁止 any

同前端规范。用 `unknown` + 类型守卫。

## 代码风格

### 类 vs 函数

- **有状态的模块**用 class（AgentRuntime、WorldClock、TickScheduler）
- **无状态的逻辑**用纯函数（buildChatPrompt、calculateImportance）
- **单例服务**用 class + 依赖注入

```typescript
// ✅ Good: 有状态用 class
export class WorldClock {
  private worldTime: Date;
  private timeSpeed: number;

  advance(tickIntervalMs: number): void {
    this.worldTime = new Date(this.worldTime.getTime() + tickIntervalMs * this.timeSpeed);
  }
}

// ✅ Good: 无状态用函数
export function buildChatPrompt(agent: AgentRuntime, message: string): Message[] {
  return [/* ... */];
}
```

### 错误处理

```typescript
// ✅ Good: 自定义错误类型
export class LoreError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'LoreError';
  }
}

// 使用
throw new LoreError(ErrorCode.AGENT_NOT_FOUND, `Agent ${id} not found`);
```

### async/await

```typescript
// ✅ Good
async function processAgent(agent: AgentRuntime): Promise<void> {
  try {
    await agent.tick(worldState, llmProvider);
  } catch (err) {
    logger.error({ err, agentId: agent.id }, 'Agent tick failed');
  }
}

// ❌ Bad: 不要混用 .then 和 async/await
async function processAgent(agent: AgentRuntime) {
  agent.tick(worldState).then(() => {}).catch(() => {});
}
```

### 注入依赖，不导入单例

```typescript
// ✅ Good: 依赖注入
export class BehaviorEngine {
  constructor(
    private llmScheduler: LLMScheduler,
    private toolRegistry: ToolRegistry,
  ) {}
}

// ❌ Bad: 直接导入全局单例
import { llmScheduler } from '../scheduler/llm-scheduler';
```

## Fastify 规范

### 入口文件

```typescript
// packages/server/src/index.ts
import Fastify from 'fastify';
import { registerRoutes } from './api/routes';
import { registerWebSocket } from './api/ws';
import { loadConfig } from './config/loader';

async function main() {
  const config = loadConfig();
  const fastify = Fastify({ logger: true });

  // 注册插件
  await fastify.register(require('@fastify/cors'), { origin: true });
  await fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, '../client/dist'),
  });

  // 注册路由
  registerRoutes(fastify);
  registerWebSocket(fastify);

  // 启动
  await fastify.listen({ port: config.server.port, host: config.server.host });
}

main();
```

### 路由定义

```typescript
// packages/server/src/api/routes.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

export function registerRoutes(fastify: FastifyInstance) {
  const bodySchema = z.object({
    worldType: z.enum(['history', 'random']),
    randomParams: z.object({
      age: z.number().int().min(1).max(150),
      location: z.string().min(1),
      background: z.string().min(1),
    }).optional(),
    historyParams: z.object({
      presetName: z.string().min(1),
      targetCharacter: z.string().optional(),
    }).optional(),
  });

  fastify.post('/api/worlds/init', async (request, reply) => {
    const body = bodySchema.parse(request.body);
    const result = await initAgent.initialize(body);
    return { data: result };
  });

  fastify.get('/api/worlds/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const world = await db.getWorld(id);
    if (!world) {
      reply.status(404);
      return { error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'World not found' } };
    }
    return { data: world };
  });
}
```

### 路由规范

- 每个资源一组路由，统一在 `registerRoutes` 中注册
- 用 Zod 做 request body 校验
- 返回格式统一：`{ data: T }` 或 `{ error: { code, message } }`
- 错误用 Fastify 的 `reply.status()` + error object

## 数据库规范

### Schema 定义

```typescript
// packages/server/src/db/schema.ts
import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  type: text('type', { enum: ['npc', 'system', 'user-avatar', 'world', 'init'] }).notNull(),
  profile: text('profile', { mode: 'json' }).notNull(),
  state: text('state', { mode: 'json' }).notNull(),
  stats: text('stats', { mode: 'json' }).notNull(),
  alive: integer('alive', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### Schema 规范

- **JSON 字段**用于存储复杂嵌套结构（AgentProfile、AgentStats 等），避免过多的关联表
- **外键**只用于核心关联（agents.worldId -> worlds.id）
- **时间戳**用 `integer('xxx', { mode: 'timestamp' })`
- **布尔值**用 `integer('xxx', { mode: 'boolean' })`
- 表名用复数（agents, worlds, events）
- 列名用 snake_case

### Repository 层

```typescript
// packages/server/src/db/repository.ts
export class Repository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getAgent(id: string): Promise<AgentRecord | null> {
    const rows = this.db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insertAgent(agent: NewAgent): Promise<void> {
    this.db.insert(agents).values(agent).run();
  }

  async updateAgent(id: string, data: Partial<AgentRecord>): Promise<void> {
    this.db.update(agents).set(data).where(eq(agents.id, id)).run();
  }

  async getWorldAgents(worldId: string): Promise<AgentRecord[]> {
    return this.db.select().from(agents).where(eq(agents.worldId, worldId)).all();
  }
}
```

### Repository 规范

- 所有数据库操作通过 Repository 类，不直接在路由或业务逻辑中写 SQL
- Repository 注入 Database 实例
- 返回类型明确，查不到返回 `null` 而不是 throw
- 批量操作提供批量方法（`insertAgents`, `updateAgents`）

### Migration

使用 Drizzle Kit 管理 migration：

```bash
pnpm drizzle-kit generate   # 生成 migration 文件
pnpm drizzle-kit migrate     # 执行 migration
```

## 日志规范

### 使用 Fastify 内置 pino

```typescript
const logger = fastify.log;

// 级别：trace < debug < info < warn < error < fatal
logger.info({ tick, agentId }, 'Agent tick completed');
logger.warn({ agentId, latencyMs }, 'LLM call slow');
logger.error({ err, agentId }, 'Agent tick failed');
logger.debug({ event }, 'Event generated');
```

### 结构化日志

```typescript
// ✅ Good: 结构化
logger.info({ tick: 42, agentCount: 15, eventCount: 3 }, 'Tick completed');

// ❌ Bad: 字符串拼接
logger.info(`Tick 42 completed with ${15} agents`);
```

### 日志级别使用

| 级别 | 场景 |
|------|------|
| `error` | 不可恢复的错误，需要人工关注 |
| `warn` | 可恢复的问题（LLM 超时、请求被丢弃） |
| `info` | 关键流程节点（世界创建、Agent 创建、tick 完成） |
| `debug` | 详细调试信息（事件内容、LLM 请求/响应） |
| `trace` | 极详细的内部状态 |

## Agent 系统规范

### AgentRuntime

```typescript
export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType;

  // 公开属性
  profile: AgentProfile;
  state: AgentState;
  stats: AgentStats;

  // 私有模块
  private memoryInstance: MemoryManager;

  constructor(id: string, worldId: string, type: AgentType, profile: AgentProfile) {
    this.id = id;
    this.worldId = worldId;
    this.type = type;
    this.profile = profile;
    this.state = { status: 'idle', currentActivity: '', currentLocation: '', lastActiveTick: 0 };
    this.stats = { mood: 70, health: 100, energy: 100, money: 1000 };
    this.memoryInstance = new MemoryManager(id);
  }

  get memory(): MemoryManager { return this.memoryInstance; }

  // 方法
  async tick(worldState: WorldState, llmProvider: ILLMProvider): Promise<void> { /* ... */ }
  async *chat(userMessage: string, llmProvider: ILLMProvider): AsyncIterable<string> { /* ... */ }
  serialize(): SerializedAgent { /* ... */ }
}
```

### AgentRuntime 规范

- `id` 和 `worldId` 是 readonly，创建后不可变
- `tick()` 和 `chat()` 通过依赖注入接收 llmProvider，不自己持有关联
- `serialize()` / `deserialize()` 用于持久化
- 内部状态变更通过方法，不直接改属性（除了 `state` 和 `stats`）

### 错误隔离

```typescript
// AgentManager.tickAll()
for (const agent of activeAgents) {
  try {
    await agent.tick(worldState, llmProvider);
  } catch (err) {
    // 单个 Agent 出错不影响其他
    logger.error({ err, agentId: agent.id }, 'Agent tick failed');
    agent.state.status = 'idle'; // 回到安全状态
  }
}
```

## LLM 调用规范

### 统一通过 LLMScheduler

```typescript
// ✅ Good: 通过调度器
const result = await this.llmScheduler.submit({
  agentId: agent.id,
  callType: 'decision',
  model: agent.getRequiredModel(),
  messages: prompt,
});

// ❌ Bad: 直接调 provider
const result = await llmProvider.generateText({ model, messages });
```

### 不要在循环中串行调 LLM

```typescript
// ❌ Bad: 串行调用
for (const agent of agents) {
  await llmScheduler.submit(buildRequest(agent));
}

// ✅ Good: 并发提交，调度器控制并发数
const promises = agents.map(agent => llmScheduler.submit(buildRequest(agent)));
const results = await Promise.allSettled(promises);
```

### 处理 LLM 错误

```typescript
try {
  const result = await llmScheduler.submit(request);
  agent.processDecision(result);
} catch (err) {
  if (err instanceof LLMRequestDroppedError) {
    return; // 请求被丢弃，下次 tick 重试
  }
  if (err instanceof LLMRateLimitError) {
    logger.warn({ agentId: agent.id }, 'LLM rate limited, will retry');
    return;
  }
  throw err;
}
```

## 配置规范

### 加载优先级

```
1. 环境变量（LORE_PORT, LORE_LLM_API_KEY 等）
2. 命令行参数（lore --port 8080）
3. ~/.lore/config.json
4. 代码内默认值
```

### Zod 校验

```typescript
const ConfigSchema = z.object({
  llm: z.object({
    providers: z.array(z.object({
      name: z.string(),
      type: z.enum(['openai-compatible', 'anthropic', 'google']),
      baseUrl: z.string().optional(),
      apiKey: z.string(),
      models: z.array(z.string()),
    })),
    defaults: z.object({
      premiumModel: z.string(),
      standardModel: z.string(),
      cheapModel: z.string(),
      embedModel: z.string(),
    }),
    limits: z.object({
      maxConcurrent: z.number().int().min(1).max(100).default(5),
      timeoutMs: z.number().int().min(5000).max(120000).default(30000),
    }),
  }),
  world: z.object({
    defaultTimeSpeed: z.number().min(0.1).max(100).default(1),
    defaultTickIntervalMs: z.number().int().min(500).max(60000).default(3000),
  }),
  server: z.object({
    port: z.number().int().min(1).max(65535).default(3952),
    host: z.string().default('0.0.0.0'),
  }),
});

export type LoreConfig = z.infer<typeof ConfigSchema>;
```

## API 响应规范

### 成功响应

```typescript
return { data: result };
```

### 错误响应

```typescript
reply.status(404);
return { error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'World not found' } };
```

### 列表响应

```typescript
return { data: agents };
```

不需要分页（本地应用，数据量不大）。

### HTTP 状态码

| 状态码 | 场景 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 409 | 冲突（世界已在运行） |
| 500 | 内部错误 |

## 测试规范

### 测试文件位置

```
packages/server/src/
+-- agent/
|   +-- __tests__/
|       +-- agent-runtime.test.ts
|       +-- memory.test.ts
```

### Mock LLM

```typescript
// __tests__/helpers/mock-llm.ts
export function createMockLLMProvider(): ILLMProvider {
  return {
    name: 'mock',
    generateText: async () => ({
      content: '{"action":"do_nothing","reasoning":"test","mood_change":0}',
      usage: { promptTokens: 10, completionTokens: 20 },
      model: 'mock',
      latencyMs: 10,
    }),
    streamText: async function* () {
      yield 'test';
    },
    embed: async () => Array(1536).fill(0),
    isModelSupported: () => true,
  };
}
```

### 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { WorldClock } from '../world/clock';

describe('WorldClock', () => {
  it('should advance time by tick interval * speed', () => {
    const clock = new WorldClock(new Date('2024-01-01T08:00:00'), 10);
    clock.advance(3000);
    expect(clock.getTime()).toEqual(new Date('2024-01-01T08:00:30'));
  });
});
```

## 文件命名

- 类文件：kebab-case（`agent-runtime.ts`）
- 工具/函数文件：kebab-case（`prompts.ts`）
- 类型文件：`types.ts`
- 测试文件：`*.test.ts`

---

> 相关文档：[前端开发规范](./frontend-conventions.md) | [技术栈](./tech-stack.md) | [目录结构](./directory.md)
