# Lore 开发路线

> 最后更新：2026-04-08 | 版本 v0.02
> 本文档描述 Lore 的开发阶段规划和详细实施指南，供 AI 编码工具参考。

---

## 目录

1. [开发路线总览](#1-开发路线总览)
2. [Phase 1 详细实施步骤](#2-phase-1-详细实施步骤)
3. [Phase 1 验收标准](#3-phase-1-验收标准)
4. [测试策略](#4-测试策略)
5. [错误处理设计](#5-错误处理设计)
6. [性能约束与扩展性](#6-性能约束与扩展性)
7. [日志与可观测性](#7-日志与可观测性)

---

## 1. 开发路线总览

### Phase 1: 能跑（MVP）

**目标**：单 Agent + 世界初始化 + 基础沙盒 + 聊天，能跑起来

| 任务 | 说明 | 依赖 |
|------|------|------|
| Step 1: 项目脚手架 | pnpm monorepo + TypeScript + Vite + Fastify | 无 |
| Step 2: 数据库层 | SQLite + Drizzle ORM + schema + migrations | Step 1 |
| Step 3: REST API | Fastify 路由 + 基础 CRUD | Step 2 |
| Step 4: LLM 接入 | Provider 抽象 + OpenAI 兼容 + 配置加载 | Step 1 |
| Step 5: Agent Runtime | AgentRuntime + MemoryManager + Personality | Step 2, 4 |
| Step 6: 初始化系统 | InitAgent + 随机模式 + 世界初始化流程 | Step 4, 5 |
| Step 7: 世界引擎 | TickScheduler + WorldClock + 事件生成 | Step 5 |
| Step 8: 基础沙盒 | Agent 能执行简单行动（找工作、买东西、创业基础） | Step 5, 7 |
| Step 9: 基础经济 | 简单的收入支出、金钱系统 | Step 7 |
| Step 10: WebSocket | 实时事件推送 + 流式聊天 | Step 3, 7 |
| Step 11: 前端 UI | 事件卡片 + 聊天面板 + Agent 列表 + 世界初始化页 | Step 10 |
| Step 12: 集成测试 | 端到端测试 + 调通全流程 | Step 11 |

### Phase 2: 能记（记忆引擎 + 多 Agent + 虚拟平台）

**目标**：三层记忆完整实现，多个 Agent 互动，虚拟平台系统

| 任务 | 说明 |
|------|------|
| 三层记忆完整实现 | 工作记忆 + 近期记忆（7 天 SQLite）+ 长期记忆（vec0 向量检索） |
| 记忆加载策略 | token 预算分配、优先级排序、记忆压缩 |
| 多 Agent 创建 | AgentManager 动态创建/销毁/懒加载 |
| Agent 间关系 | RelationshipManager + 关系类型 + 亲密度 |
| EventBus | Agent 间事件通信 |
| 虚拟平台系统 | Agent 发帖/点赞/评论，用户上传内容，模拟数据 |
| 多模态 | 生图模型集成，Agent 可发自拍照 |

### Phase 3: 能活（自主行为 + 推送 + 上帝模式 + World Agent）

**目标**：Agent 有完整的自主意志，世界有宏观运行逻辑

| 任务 | 说明 |
|------|------|
| Agent 自主行为 | 主动发消息、自主决策、不限制行为方向 |
| World Agent | 天灾、宏观事件、世界层面模拟 |
| LLMScheduler 升级 | 优先级队列 + 并发控制 + 超载丢弃/延后 |
| PushManager | 选择性推送、重要事件优先 |
| 上帝模式 | 观察所有 Agent 思考 + 间接事件影响 |
| Monitor 面板 | Agent 思考过程、token 消耗、世界状态 |
| 懒加载 Agent | 按需创建、预判创建、资源管理 |

### Phase 4: 能玩（历史模式 + 社区预设 + 高级沙盒）

**目标**：历史模式完整体验，社区预设生态，沙盒能力大幅增强

| 任务 | 说明 |
|------|------|
| 历史模式 | 魂穿、历史分叉、真实初始参数 |
| 社区预设系统 | YAML 预设 + Zod 校验 + 预设浏览器 + GitHub 动态加载 |
| 高级沙盒 | Agent 可创业、开发软件、创建平台 |
| 事件链状态机 | EventChainEngine + 分支/合并/条件 |
| 势力系统 | FactionEngine + 战争/结盟/贸易/外交 |
| 规则引擎 | RuleEngine + 可配置规则 + 用户自定义 |

### Phase 5: 能看（多 Provider + PWA + 发布）

**目标**：产品化，可以给普通人用

| 任务 | 说明 |
|------|------|
| 多 Provider 支持 | Anthropic / Google / 国内厂商完整适配 |
| PWA | Service Worker + Web Push + 离线缓存 |
| npm 发布 | `npm install -g lore && lore` |
| 完整经济系统 | 就业/银行/股票/房产 |
| 多模态完善 | TTS / 视频 / 音乐（插件化） |

### Phase 6+: 能火（社区生态 + 高级功能）

**目标**：开放生态，社区驱动，支持上万 Agent

| 任务 | 说明 |
|------|------|
| 多人世界 | 多用户共享世界、事件按用户过滤 |
| 预设市场 | 社区上传/下载/评分世界预设 |
| 沙盒系统 | Agent 可执行代码、创建工具 |
| 移动端优化 | 手势操作、推送通知、离线模式 |
| API 开放 | 第三方集成、Webhook |
| 插件系统 | 自定义 Agent 行为、自定义事件类型 |
| 万级 Agent | 完善懒加载、Agent 回收、分布式思考 |

---

## 2. Phase 1 详细实施步骤

### Step 1: 项目脚手架

**目标**：pnpm monorepo + TypeScript + Fastify + Vite，能编译运行。

**文件结构**：

```
lore/
+-- package.json                # 根 package.json（workspaces）
+-- pnpm-workspace.yaml
+-- tsconfig.base.json          # 共享 TS 配置
+-- packages/
    +-- server/
    |   +-- package.json
    |   +-- tsconfig.json
    |   +-- src/
    |       +-- index.ts        # Fastify 入口
    +-- client/
    |   +-- package.json
    |   +-- tsconfig.json
    |   +-- vite.config.ts
    |   +-- index.html
    |   +-- src/
    |       +-- main.tsx
    +-- shared/
        +-- package.json
        +-- tsconfig.json
        +-- src/
            +-- index.ts
```

**验证**：`pnpm dev` 启动后，浏览器访问 `http://localhost:3952` 能看到页面。

---

### Step 2: 数据库层

**目标**：SQLite + Drizzle ORM + 所有表定义 + migrations。

**关键文件**：
- `packages/server/src/db/schema.ts` — Drizzle schema（所有表）
- `packages/server/src/db/repository.ts` — 数据访问层
- `packages/server/src/db/vector.ts` — vec0 向量操作

**Phase 1 需要实现的表**：

| 表 | 说明 |
|------|------|
| `worlds` | 世界实例 |
| `agents` | Agent 实例 |
| `messages` | 聊天消息 |
| `events` | 世界事件 |
| `config` | 配置 |
| `memories` | 记忆条目（Phase 1 简化版） |
| `relationships` | 关系 |
| `economy` | 经济（基础版） |

参考 [数据库 Schema](./api/database.md)。

**验证**：写一个测试脚本，创建所有表，插入/查询数据。

---

### Step 3: REST API

**目标**：Fastify 路由 + 基础 CRUD。

Phase 1 实现的端点参考 [REST API](./api/rest.md)。

**验证**：用 curl / httpie 测试所有端点。

---

### Step 4: LLM 接入

**目标**：LLMProvider 统一接口 + OpenAI 兼容层 + 配置加载。

参考 [LLM Provider 架构](./llm/providers.md)。

**验证**：配置 DeepSeek/Kimi API Key，调用 generateText 和 streamText。

---

### Step 5: Agent Runtime

**目标**：单个 Agent 运行时 + 人格系统 + 简单记忆。

参考 [AgentRuntime](./agent/runtime.md)、[人格系统](./agent/personality.md)、[记忆系统](./agent/memory.md)。

**核心实现**：

```typescript
export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType;
  profile: AgentProfile;
  state: AgentState;
  stats: AgentStats;
  memory: MemoryManager;
  relationships: Map<string, Relationship>;

  constructor(id: string, worldId: string, type: AgentType, profile: AgentProfile, db: Repository) {
    this.id = id;
    this.worldId = worldId;
    this.type = type;
    this.profile = profile;
    this.state = { status: 'idle', currentActivity: '', currentLocation: '', lastActiveTick: 0 };
    this.stats = { mood: 70, health: 100, energy: 100, money: 1000 };
    this.memory = new MemoryManager(id, db);
    this.relationships = new Map();
  }

  async tick(worldState: WorldState, llmScheduler: LLMScheduler): Promise<void> {
    this.updateStats(worldState);
    if (!this.needsDecision(worldState)) return;
    const prompt = buildDecisionPrompt(this, worldState);
    const result = await llmScheduler.submit({
      agentId: this.id,
      callType: 'decision',
      model: this.getRequiredModel(),
      messages: prompt,
      tools: this.getAvailableTools(),
    });
    this.processDecision(result);
    await this.memory.add(result.content, 'decision', 0.7);
  }

  async *chat(userMessage: string, llmScheduler: LLMScheduler): AsyncIterable<string> {
    const context = this.memory.getContext(2000);
    const messages = buildChatPrompt(this, userMessage, context);
    const stream = await llmScheduler.submitStream({
      agentId: this.id,
      callType: 'user-chat',
      model: this.getRequiredModel(),
      messages,
    });
    let fullResponse = '';
    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }
    await this.memory.add(`User: ${userMessage}`, 'chat', 0.5);
    await this.memory.add(`Me: ${fullResponse}`, 'chat', 0.5);
  }

  serialize(): SerializedAgent {
    return { id: this.id, worldId: this.worldId, type: this.type, profile: this.profile, state: this.state, stats: this.stats };
  }
}
```

**验证**：创建一个 Agent，手动调用 tick() 和 chat()，检查状态变化和 LLM 调用。

---

### Step 6: 初始化系统

**目标**：InitAgent + 随机模式世界初始化。

参考 [初始化系统](./world/initialization.md)。

**核心实现**：

```typescript
export class InitAgent {
  private llmScheduler: LLMScheduler;

  async initialize(request: InitRequest): Promise<InitResult> {
    if (request.worldType === 'history') {
      return this.initHistoryWorld(request);
    }
    return this.initRandomWorld(request);
  }

  private async initRandomWorld(request: InitRequest): Promise<InitResult> {
    const prompt = buildRandomWorldInitPrompt(request.randomParams);
    const result = await this.llmScheduler.submit({
      agentId: 'init-agent',
      callType: 'creative',
      model: config.llm.defaults.premiumModel,
      messages: prompt,
    });
    return parseInitResult(result.content);
  }
}
```

**验证**：调用 InitAgent.initialize()，检查生成的世界和角色。

---

### Step 7: 世界引擎

**目标**：TickScheduler + WorldClock + 事件生成，世界能自主运行。

参考 [TickScheduler](./world/tick-scheduler.md)、[时间系统](./world/clock.md)、[事件系统](./world/events.md)。

**验证**：启动 TickScheduler，观察时间推进和事件生成。

---

### Step 8: 基础沙盒

**目标**：Agent 能执行简单行动（找工作、买东西、创业基础）。

Phase 1 的沙盒能力是基础版：

| 能力 | 说明 |
|------|------|
| 找工作 | Agent 可以找工作，有面试过程（LLM 生成） |
| 买东西 | 简单的消费行为 |
| 社交互动 | 主动聊天、交友 |
| 基础创业 | 用户可以"开公司"，招募 Agent |

**验证**：Agent 能通过 LLM 决策执行上述行动。

---

### Step 9: 基础经济

**目标**：简单的收入支出、金钱系统。

Phase 1 只做最基础的经济：

```typescript
interface BasicEconomy {
  agentId: string;
  balance: number;      // 余额
  income: number;       // 月收入
  expenses: number;     // 月支出
}
```

- 每月结算：balance += income - expenses
- 上班 = income，消费 = expenses
- 不做股票、房产等复杂功能

---

### Step 10: WebSocket

**目标**：实时事件推送 + 流式聊天。

参考 [WebSocket 协议](./api/websocket.md)。

**验证**：WebSocket 客户端连接后能收到事件推送和流式聊天。

---

### Step 11: 前端 UI

**目标**：世界初始化页 + 事件卡片 + 聊天面板 + Agent 列表 + 基础布局。

**关键页面/组件**：

| 组件 | 路径 | 说明 |
|------|------|------|
| InitPage | `pages/InitPage.tsx` | 世界初始化页面（选择模式、设定参数） |
| AppLayout | `components/layout/AppLayout.tsx` | 主布局（左中右三栏） |
| Sidebar | `components/layout/Sidebar.tsx` | Agent 列表 + 世界时间 |
| EventCard | `components/world/EventCard.tsx` | 事件卡片（弹出动画） |
| ChatPanel | `components/chat/ChatPanel.tsx` | 聊天面板（流式输出） |
| ChatInput | `components/chat/ChatInput.tsx` | 输入框 + 发送 + 图片上传 |
| AgentList | `components/world/AgentList.tsx` | Agent 列表 |
| WorldClock | `components/world/WorldClock.tsx` | 世界时间显示 |
| MonitorPanel | `components/monitor/MonitorPanel.tsx` | 监控面板（折叠） |

**状态管理**：

```typescript
import { create } from 'zustand';

interface WorldStore {
  worldTime: Date;
  tick: number;
  paused: boolean;
  events: WorldEvent[];
  setWorldTime: (time: Date) => void;
  addEvent: (event: WorldEvent) => void;
  setPaused: (paused: boolean) => void;
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldTime: new Date(),
  tick: 0,
  paused: false,
  events: [],
  setWorldTime: (time) => set({ worldTime: time }),
  addEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  setPaused: (paused) => set({ paused }),
}));
```

**验证**：浏览器中能看到初始化页面、事件卡片弹出、Agent 状态变化、聊天流式输出。

---

### Step 12: 集成测试

**目标**：端到端测试，全流程调通。

**测试场景**：

1. 随机模式初始化世界 → 世界时间推进 → 事件生成
2. 用户发送消息 → Agent 回复（流式） → 记忆存储
3. Agent 执行行动（找工作、买东西）
4. 时间推进 → 日常事件触发 → Agent 状态变化
5. 暂停/恢复 → 状态正确
6. 持久化 → 重启 → 恢复

---

## 3. Phase 1 验收标准

### 功能验收

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | `pnpm dev` 启动后浏览器能看到初始化页面 | 手动验证 |
| 2 | 随机模式初始化：设定参数后能生成完整世界和角色 | API 调用 |
| 3 | 世界时间自动推进 | 观察 WorldClock |
| 4 | 每个 Agent 都有独立人格和完整生平 | API 查询 |
| 5 | 用户能与任意 Agent 对话，流式输出 | 前端聊天 |
| 6 | Agent 根据人格调整回复语气 | 观察回复 |
| 7 | Agent 能执行简单行动（找工作等） | 观察行为 |
| 8 | 基础经济：有收入支出金钱变化 | API 查询 |
| 9 | 事件卡片在前端弹出 | 前端观察 |
| 10 | 聊天记录持久化到 SQLite | 重启后查询 |
| 11 | 暂停/恢复正常 | 前端操作 |
| 12 | Monitor 面板显示 LLM 调用统计 | 前端观察 |

### 非功能验收

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 单 Agent tick < 100ms（不含 LLM） | 性能测试 |
| 2 | LLM 调用延迟 < 5s（正常网络） | 观察延迟 |
| 3 | 10 个 Agent 同时运行无异常 | 压力测试 |
| 4 | 内存占用 < 500MB（10 Agent） | 进程监控 |
| 5 | 配置 API Key 后即开即用 | 首次启动 |

---

## 4. 测试策略

### 4.1 测试框架

- **vitest** 作为测试框架
- **@vitest/coverage-v8** 覆盖率
- LLM 调用统一 mock，不依赖真实 API

### 4.2 测试分层

```
tests/
+-- unit/                      # 单元测试
|   +-- agent/
|   |   +-- agent-runtime.test.ts
|   |   +-- memory.test.ts
|   |   +-- personality.test.ts
|   |   +-- init-agent.test.ts
|   +-- world/
|   |   +-- clock.test.ts
|   |   +-- events.test.ts
|   |   +-- initialization.test.ts
|   +-- llm/
|   |   +-- llm-provider.test.ts
|   +-- scheduler/
|       +-- tick-scheduler.test.ts
|       +-- llm-scheduler.test.ts
+-- integration/
|   +-- db/
|   |   +-- repository.test.ts
|   +-- api/
|       +-- routes.test.ts
+-- e2e/
    +-- world-lifecycle.test.ts
    +-- initialization.test.ts
```

### 4.3 LLM Mock 策略

```typescript
export function createMockLLMProvider(overrides?: Partial<ILLMProvider>): ILLMProvider {
  return {
    name: 'mock',
    generateText: async () => ({
      content: '这是 mock 回复',
      usage: { promptTokens: 10, completionTokens: 20 },
      model: 'mock-model',
      latencyMs: 100,
    }),
    streamText: async function* () {
      yield '这'; yield '是'; yield ' mock'; yield ' 回复';
    },
    embed: async () => Array(1536).fill(0),
    isModelSupported: () => true,
    ...overrides,
  };
}
```

---

## 5. 错误处理设计

### 5.1 错误分类

```typescript
export enum ErrorCode {
  WORLD_NOT_FOUND = 1001,
  WORLD_ALREADY_RUNNING = 1002,
  WORLD_PAUSED = 1003,

  AGENT_NOT_FOUND = 2001,
  AGENT_DEAD = 2002,
  AGENT_BUSY = 2003,
  AGENT_INIT_FAILED = 2004,

  LLM_API_ERROR = 3001,
  LLM_RATE_LIMITED = 3002,
  LLM_TIMEOUT = 3003,
  LLM_CONTENT_FILTERED = 3004,
  LLM_NO_PROVIDER = 3005,
  LLM_BUDGET_EXCEEDED = 3006,

  CONFIG_INVALID = 4001,
  CONFIG_API_KEY_MISSING = 4002,

  DB_ERROR = 5001,
  DB_MIGRATION_FAILED = 5002,

  INIT_PRESET_NOT_FOUND = 6001,
  INIT_GENERATION_FAILED = 6002,

  INTERNAL_ERROR = 9001,
  VALIDATION_ERROR = 9002,
}
```

### 5.2 错误恢复策略

| 错误类型 | 恢复策略 |
|---------|---------|
| LLM 限流 (429) | 自动降级到便宜模型，逐步恢复 |
| LLM 超时 | 重试 1 次，失败后跳过本次 tick 思考 |
| LLM API 错误 | Agent 保持上一 tick 的状态，下次 tick 重试 |
| 数据库错误 | 重试 3 次（指数退避） |
| Agent 初始化失败 | 回滚已创建的 Agent，返回错误 |
| 内存不足 | 触发 GC，降低低频 Agent 思考频率 |

---

## 6. 性能约束与扩展性

### 6.1 Phase 1 性能目标

| 指标 | 目标 | 说明 |
|------|------|------|
| Tick 间隔 | 3s | 默认值，可配置 |
| 单 Tick 耗时 | < 500ms | 不含 LLM 调用 |
| Agent 数量 | 10-50 | Phase 1 目标 |
| 内存占用 | < 500MB | 50 Agent |
| 数据库写入 | 每 10 tick | 批量持久化 |
| LLM 并发 | 5-10 | 默认值，可配置 |

### 6.2 远期扩展性

| 场景 | 设计方案 |
|------|---------|
| Agent 从 50 -> 1000 | 懒加载 + 思考频率分级 + 请求队列超载丢弃 |
| Agent 从 1000 -> 10000 | Agent 回收机制 + 分布式思考 + 仅活跃 Agent 全量思考 |
| Tick 间隔从 3s -> 1s | 批量 LLM 调用 + 减少低频 Agent 思考频率 |
| 前端大量事件 | 推送节流 + 事件合并 + 前端虚拟列表 |

### 6.3 Agent 思考频率分级

```
核心 Agent（用户正在交互的 1-3 个）
  --> 每 tick 都思考，用 premiumModel，实时响应

活跃 Agent（用户身边、经常互动的 10-30 个）
  --> 每 1-3 tick 思考一次，用 standardModel

关联 Agent（和用户有间接关系的 50-200 个）
  --> 每 5-10 tick 思考一次，用 cheapModel

远处 Agent（用户尚未接触的）
  --> 不创建（懒加载），或极低频思考（每天一次总结）
```

**重要**：所有 Agent 都由 LLM 驱动思考，只是频率不同。不存在纯规则引擎驱动的 Agent。

超载策略：
- 每个 tick 的 LLM 请求有上限（如 10 并发）
- 超出上限的请求延后到下一个 tick
- 低优先级请求在持续超载时可丢弃（Agent 保持上一 tick 状态）

---

## 7. 日志与可观测性

### 7.1 日志系统

使用 Fastify 内置的 **pino** 日志。

```typescript
const logger = fastify.log;

logger.info({ tick, agentId }, 'Agent tick completed');
logger.warn({ agentId, latencyMs }, 'LLM call slow');
logger.error({ err, agentId }, 'Agent tick failed');
logger.debug({ event }, 'Event generated');
```

### 7.2 日志存储

| 类型 | 存储位置 | 保留时间 |
|------|---------|---------|
| 运行日志 | `~/.lore/logs/` | 7 天 |
| Agent 日志 | `monitor_logs` 表 | 7 天 |
| LLM 调用日志 | `monitor_logs` 表 | 7 天 |
| 错误日志 | `~/.lore/logs/error.log` | 30 天 |

### 7.3 Monitor 面板数据

```typescript
export interface AgentMonitorData {
  agentId: string;
  totalLLMCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  lastDecision: string;
  lastDecisionTime: Date;
  thoughtFrequency: 'high' | 'medium' | 'low';
}

export interface WorldMonitorData {
  tick: number;
  worldTime: Date;
  agentCount: number;
  activeAgentCount: number;
  totalLLMCalls: number;
  totalTokens: number;
  totalCost: number;
  eventsPerTick: number;
  pendingLLMRequests: number;
  droppedRequests: number;
}
```

---

## 相关文档

| 文件 | 内容 |
|------|------|
| [项目概述](./architecture/overview.md) | 核心理念、架构、交互模式 |
| [初始化系统](./world/initialization.md) | 世界初始化、InitAgent |
| [Agent 系统](./agent/runtime.md) | AgentRuntime、记忆、行为 |
| [API 参考](./api/rest.md) | REST API、WebSocket、数据库 |
| [技术决策](./TECH-DECISIONS.md) | 技术调研和选型理由 |
