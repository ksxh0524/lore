# Lore — 完整开发文档

> 最后更新：2026-04-08
> 本文档是给 AI Coding 工具（Cursor / Claude Code / Windsurf 等）使用的开发指南，包含所有设计决策、架构细节、类型定义、开发规范和实施路线。

---

## 一、项目概述

### 1.1 一句话定义

**Lore 是一个开源的 AI 人生模拟器。** N 个 AI 角色在一个虚拟世界里自主运行，用户作为参与者进入这个世界，与角色互动、建立关系、影响事件走向。

### 1.2 核心理念

**不是聊天工具，是一个有自己运行规则的虚拟世界。**

- AI 角色不是等着你找她聊，她有自己的工作、社交、感情线
- 你不理她三天，她可能已经谈了个新男朋友
- 有人可能出车祸死了，有人可能升职加薪了
- 世界不围着你转，你是其中一员

### 1.3 核心交互模式

不做 2D 地图，不做角色在屏幕上走动。采用**事件驱动 + 状态面板 + 聊天 + 社交平台**的交互模式。

```
┌─────────────────────────────────────────────────────┐
│  Lore — 世界                                         │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  左侧：      │  右侧：                               │
│  角色列表    │  主交互区                              │
│  + 状态概览  │                                      │
│              │  ┌──────────────────────────────────┐ │
│  ┌────────┐  │  │  📋 事件卡片                      │ │
│  │ 小美    │  │  │                                  │ │
│  │ 😊 开心  │  │  │  "小美在公司年会上遇到了前       │ │
│  │ 工作:OK  │  │  │   男友，两人聊了很久…"            │ │
│  └────────┘  │  │                                  │ │
│  ┌────────┐  │  │  [上前搭话]  [默默旁观]            │ │
│  │ 阿杰    │  │  └──────────────────────────────────┘ │
│  │ 😐 平静  │  │                                      │
│  │ 恋爱中   │  │  ┌──────────────────────────────────┐ │
│  └────────┘  │  │  💬 聊天                           │ │
│  ┌────────┐  │  │                                  │ │
│  │ 王姐    │  │  │  小美: "你今天怎么这么早？"        │ │
│  │ 😢 难过  │  │  │  你: __________________         │ │
│  │ 失业中   │  │  │              [发送]              │ │
│  └────────┘  │  └──────────────────────────────────┘ │
│              │                                      │
│              │  ┌──────────────────────────────────┐ │
│              │  │  📱 动态流（类微博/朋友圈）         │ │
│              │  │                                  │ │
│              │  │  小美 发了一张自拍                 │ │
│              │  │  "今天的夕阳好美🌅"                │ │
│              │  │  ❤️ 12  💬 3                     │ │
│              │  └──────────────────────────────────┘ │
│              │                                      │
│              │  ┌──────────────────────────────────┐ │
│              │  │  🎬 视频区（Phase 5+）             │ │
│              │  │  Agent 可发布视频，其他 Agent      │ │
│              │  │  可点赞、评论                      │ │
│              │  └──────────────────────────────────┘ │
├──────────────┴──────────────────────────────────────┤
│  底部：时间线 / 事件日志                               │
│  Day 1: 小美入职微软  →  Day 5: 你和小美第一次聊天      │
├──────────────────────────────────────────────────────┤
│  🔧 管理面板（开发者/用户可查看）                        │
│  Agent 活动 Monitor | Token 消耗 | 世界状态            │
└──────────────────────────────────────────────────────┘
```

### 1.4 核心交互元素

**1. 事件卡片（核心）**
- 世界里发生的事件以卡片形式弹出
- 每张事件卡片包含：描述文字 + 可选配图 + 选择按钮（或仅通知）
- 事件类型：日常（上班/吃饭）、社交（聚会/吵架）、感情（表白/分手）、突发（事故/中奖）
- 用户可以选择介入或忽略
- 不介入 = 事件按 Agent 自主决策推进

**2. 角色状态面板**
- 每个 Agent 的核心属性：心情、健康、金钱、职业、感情状态
- 属性随事件变化
- 左侧列表显示所有 Agent 及其状态概览

**3. 聊天界面**
- 与任意 Agent 1v1 对话
- 流式输出，打字机效果
- 支持 Markdown
- 聊天内容会影响 Agent 对你的态度和关系值

**4. 社交动态流（类微博/朋友圈）**
- Agent 自主发布动态（文字 + AI 生成配图）
- 用户也可以发布自己的照片和内容
- 其他 Agent 可以点赞、评论
- Agent 根据自己的人格决定发什么、发不发（有些 Agent 天生不爱发）
- 类似微信朋友圈 / 微博 / Instagram feed

**5. 社交关系系统**
- Agent 可以主动加其他 Agent 或用户好友
- 被加好友的 Agent 可以同意或拒绝（取决于人格和关系）
- Agent 可以给其他 Agent 的动态点赞、评论
- Agent 可以在"视频区"发评论（Phase 5+）

**6. 时间线**
- 世界事件的时间轴
- 可回溯查看历史

**7. Agent 活动 Monitor（管理面板）**
- 统计所有 Agent 的思考过程和每一步行为
- 用户可选择性查看（默认折叠，不刷屏）
- 开发调试时全开，用户可选择性关闭
- 记录：Agent 的思考、决策、LLM 调用、token 消耗、状态变化

**8. 多人世界（远期愿景）**
- 多个真实用户可以进入同一个世界
- 他们可以和同一个 Agent 交互
- 2-30 人共享一个世界
- 架构上需要预留多人协作的支持

---

## 二、技术栈（已确认）

### 2.1 前端

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + TypeScript | 生态成熟，AI 辅助编程友好 |
| 构建 | Vite | 快，配置简单 |
| UI 组件 | shadcn/ui + Tailwind CSS | 事件卡片、状态面板等自定义组件 |
| 移动端 | PWA（Service Worker + Web Push） | 不做原生 APP |
| 状态管理 | zustand | 轻量，够用 |
| 路由 | React Router | 标配 |
| 动画 | framer-motion | 事件卡片弹出、页面过渡 |

### 2.2 后端

| 层面 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js ≥ 20 | 前后端统一语言 |
| HTTP 框架 | Fastify | 性能好，插件体系强 |
| 世界引擎 | 自研 | 事件驱动，Agent 调度，时间流逝 |
| Agent Runtime | 自研 | 每个 Agent 独立运行，有行为逻辑 |
| 数据库 | SQLite + Drizzle ORM | 零配置，本地友好 |
| 向量存储 | SQLite vec0 | 长期记忆语义检索 |
| LLM 调用 | Vercel AI SDK + OpenAI SDK | 统一接口，多厂商支持 |
| 定时任务 | node-cron | Agent 心跳、事件触发 |
| 实时通信 | WebSocket (@fastify/websocket) | 事件推送、流式聊天 |
| 推送通知 | Web Push API | Agent 主动通知用户 |

### 2.3 工程化

| 层面 | 选型 |
|------|------|
| 包管理 | pnpm monorepo |
| 包分发 | npm publish（`npm install -g lore && lore`） |
| 运行环境 | Node.js ≥ 20，不用 Docker |
| 代码质量 | ESLint + Prettier + TypeScript strict |

---

## 三、架构设计

> **底层框架的详细实现见 `docs/AGENT_FRAMEWORK.md`。** 那份文档写透了每个 class 的实现。这里只做概览。

### 3.1 Lore 到底在干什么？

**没有"世界引擎"。** 底层就是：

```
1. Fastify HTTP 服务器 → 提供页面 + REST API
2. WebSocket → 前端和服务端实时通信
3. setInterval 定时器 → 每隔 N 秒触发一个 tick
4. N 个 AgentRuntime 实例 → 每个都是内存中的 TypeScript 对象
5. SQLite 数据库 → 持久化
6. EventEmitter → Agent 间通过事件通信
```

每个 tick 做的事：
```
tick() {
  1. 世界时间 +1
  2. 生成规则事件（起床/上班/吃饭，不调 LLM）
  3. 生成概率事件（随机偶遇，不调 LLM）
  4. 遍历 Agent：有事做吗？
     → 有 → 调 LLMScheduler.submit() → 排队 → 优先级执行 → 存记忆
     → 没有 → 跳过
  5. 重要事件推给前端
  6. 定期持久化
}
```

### 3.2 核心组件

```
┌─────────────────────────────────────────────────────────────┐
│                    TickScheduler (setInterval)                │
│                                                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │ WorldClock   │  │ RuleEvents    │  │ RandomEvents     │ │
│  │ (时间系统)    │  │ (规则事件)     │  │ (概率事件)        │ │
│  └──────────────┘  └───────────────┘  └──────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   LLMScheduler                         │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 优先级队列（系统自动计算，Agent 不参与）           │ │ │
│  │  │   user-chat(160) > decision(80) > social(70)      │ │ │
│  │  │   > memory(60) > creative(50) > batch(30)         │ │ │
│  │  ├──────────────────────────────────────────────────┤ │ │
│  │  │ 并发控制（用户可配 1-100）                        │ │ │
│  │  │ 限流检测 → 自动降级 → 慢慢恢复                    │ │ │
│  │  │ 超时保护（30s）                                   │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 AgentManager                            │ │
│  │  注册/创建/销毁/查询/持久化/恢复                        │ │
│  │  Agent 类型: npc | system | user-avatar                │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              N × AgentRuntime                           │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │ │
│  │  │ 小美      │ │ 阿杰      │ │ 王姐      │  ...         │ │
│  │  │ 人格     │ │ 人格     │ │ 人格     │               │ │
│  │  │ 状态     │ │ 状态     │ │ 状态     │               │ │
│  │  │ 记忆(三层)│ │ 记忆(三层)│ │ 记忆(三层)│              │ │
│  │  │ 关系网络  │ │ 关系网络  │ │ 关系网络  │               │ │
│  │  └──────────┘ └──────────┘ └──────────┘               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  EventBus        ResourceTracker    MultimodalRegistry  │ │
│  │  (Agent间通信)   (Token/成本统计)    (TTS/图片/视频)     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 关键设计决策

**为什么不用现成 Agent 框架？**
- 2026-04 调研了 Mastra(22k stars)、ElizaOS(~20k)、LangGraph、Letta、CrewAI 等
- 没有任何一个框架提供：持续运行的多 Agent + 时间系统 + 社交关系 + 推送
- Lore 的核心差异就是这些，套框架反而受限
- 做法自研核心 + 借鉴 Letta 的三层记忆架构 + 借鉴 ElizaOS 的人格系统

**为什么要有 LLMScheduler？**
- 所有 Agent 的 LLM 调用统一排队，避免 API 限流导致程序停滞
- 优先级保证用户交互不卡
- 限流自动降级，恢复后自动回升
- 每个 Agent 的 Token/成本独立统计

详细实现见 → [`docs/AGENT_FRAMEWORK.md`](./AGENT_FRAMEWORK.md)

> **以下所有详细实现见 `docs/AGENT_FRAMEWORK.md`：**
> - Agent 的事件系统、记忆系统、行为引擎、社交系统 → 第三、四、五章
> - Agent 的类型定义（AgentProfile、AgentState、Relationship 等）→ 各章内联
> - 初始化 Agent → AgentManager.createAgent()
> - Agent Monitor → ResourceTracker + AgentMonitor
> - LLM 调用层 → LLMScheduler + LLMProvider
> - 分层调用策略 → LLMScheduler.calculatePriority()
> - WebSocket 协议 → api/ws.ts + api/protocol.ts

---

## 四、LLM Provider 接入方案（已确认）

### 4.1 架构

```
LLM 层
├── Vercel AI SDK（统一接口）
│   ├── streamText / generateText / embed
│   ├── 内置 Provider: OpenAI, Anthropic, Google
│   └── 自定义 Provider: createOpenAICompatible()
│
├── OpenAI 兼容层（国内厂商）
│   ├── Kimi（月之暗面）→ 100% 兼容
│   ├── 阿里百炼（千问）→ 高度兼容
│   ├── 火山方舟（豆包）→ 高度兼容
│   ├── 智谱 GLM → 高度兼容
│   ├── DeepSeek → 100% 兼容
│   └── MiniMax → 基础对话兼容
│
├── 原生 SDK 适配层
│   ├── Anthropic Claude（@anthropic-ai/sdk）
│   └── Google Gemini（@google/generative-ai）
│
└── 统一接口（Provider Interface）
    ├── chat(messages, options) → stream / generate
    └── embed(texts) → embeddings
```

### 4.2 用户配置格式

```json
{
  "providers": [
    {
      "name": "kimi",
      "type": "openai-compatible",
      "baseUrl": "https://api.moonshot.cn/v1",
      "apiKey": "sk-xxx",
      "models": ["kimi-k2.5", "kimi-k2-thinking"]
    },
    {
      "name": "qwen",
      "type": "openai-compatible",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "apiKey": "sk-xxx",
      "models": ["qwen3.5-plus", "qwen3-max"]
    },
    {
      "name": "claude",
      "type": "anthropic",
      "apiKey": "sk-ant-xxx",
      "models": ["claude-sonnet-4-20250514"]
    },
    {
      "name": "gemini",
      "type": "google",
      "apiKey": "xxx",
      "models": ["gemini-2.5-pro"]
    },
    {
      "name": "deepseek",
      "type": "openai-compatible",
      "baseUrl": "https://api.deepseek.com/v1",
      "apiKey": "sk-xxx",
      "models": ["deepseek-v3"]
    }
  ],
  "defaults": {
    "premiumModel": "kimi-k2.5",
    "standardModel": "deepseek-v3",
    "cheapModel": "deepseek-v3",
    "embedModel": "deepseek-v3"
  }
}
```

**UI 上用户操作：选厂商模板 → 自动填 baseURL → 填 API Key → 选模型。也可以手动填任意 OpenAI 兼容的 baseURL。**

### 4.3 Coding Plan 策略

**现阶段不能直接用 Coding Plan**（只限编程工具），走 API 按量计费。

参考价格：
- DeepSeek V3.2：¥1/百万输入 token，¥2/百万输出 token（最便宜）
- 千问 3.5-Plus（百炼）：¥2/百万输入 token
- Kimi K2.5：¥12/百万输入 token

**架构预留**：如果以后 Coding Plan 开放了非编程场景，只需要加一个 Provider Adapter。

---

## 五、数据库设计

### 5.1 Drizzle ORM Schema（核心表）

```typescript
// agents 表
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  gender: text('gender', { enum: ['male', 'female', 'other'] }).notNull(),
  appearance: text('appearance').notNull(),
  avatar: text('avatar'),
  occupation: text('occupation').notNull(),
  workplace: text('workplace').notNull(),
  personality: text('personality').notNull(),
  backstory: text('backstory').notNull(),
  values: text('values'), // JSON array
  speechStyle: text('speech_style').notNull(),
  behaviorConfig: text('behavior_config'), // JSON
  status: text('status', { enum: ['idle', 'active', 'sleeping', 'busy', 'dead'] }).default('idle'),
  currentActivity: text('current_activity'),
  currentLocation: text('current_location'),
  stats: text('stats'), // JSON: mood, health, money, energy, reputation, happiness
  alive: integer('alive').default(1),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

// relationships 表
export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  targetId: text('target_id').notNull(), // 可以是 agent id 或 'user'
  type: text('type', { enum: ['stranger', 'acquaintance', 'friend', 'close_friend', 'lover', 'ex_lover', 'colleague', 'family', 'enemy'] }),
  intimacy: integer('intimacy').default(0),
  history: text('history'), // JSON
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

// events 表
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  category: text('category', { enum: ['daily', 'social', 'romance', 'career', 'health', 'random', 'user'] }),
  description: text('description').notNull(),
  involvedAgents: text('involved_agents'), // JSON array
  consequences: text('consequences'), // JSON
  userActionable: integer('user_actionable').default(0),
  userOptions: text('user_options'), // JSON array
  priority: integer('priority').default(50),
  worldTime: integer('world_time'),
  createdAt: integer('created_at'),
});

// memories 表（近期记忆）
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  type: text('type', { enum: ['event', 'conversation', 'thought', 'observation'] }),
  summary: text('summary').notNull(),
  importance: integer('importance').default(0),
  emotionalWeight: integer('emotional_weight').default(0),
  tags: text('tags'), // JSON array
  worldTime: integer('world_time'),
  createdAt: integer('created_at'),
  expiresAt: integer('expires_at'), // 近期记忆 7 天过期
});

// 长期记忆表（带向量）
export const longTermMemories = sqliteTable('long_term_memories', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  type: text('type'),
  summary: text('summary').notNull(),
  importance: integer('importance'),
  emotionalWeight: integer('emotional_weight'),
  tags: text('tags'),
  embedding: text('embedding'), // vec0 向量，JSON 序列化
  worldTime: integer('world_time'),
  createdAt: integer('created_at'),
});

// 社交动态表
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  authorId: text('author_id').notNull(), // agent id 或 'user'
  content: text('content').notNull(),
  images: text('images'), // JSON array
  likes: integer('likes').default(0),
  worldTime: integer('world_time'),
  worldDay: integer('world_day'),
  createdAt: integer('created_at'),
});

// 评论表
export const comments = sqliteTable('comments', {
  id: text('id').primaryKey(),
  postId: text('post_id').references(() => posts.id).notNull(),
  authorId: text('author_id').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at'),
});

// 好友请求表
export const friendRequests = sqliteTable('friend_requests', {
  id: text('id').primaryKey(),
  fromId: text('from_id').notNull(),
  toId: text('to_id').notNull(),
  status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
  createdAt: integer('created_at'),
});

// 聊天记录表
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  agentId: text('agent_id').references(() => agents.id),
  role: text('role', { enum: ['user', 'agent', 'system'] }).notNull(),
  content: text('content').notNull(),
  worldTime: integer('world_time'),
  createdAt: integer('created_at'),
});

// Agent 活动日志表
export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').references(() => agents.id).notNull(),
  worldTime: integer('world_time'),
  worldDay: integer('world_day'),
  step: integer('step'),
  thoughtProcess: text('thought_process'),
  decision: text('decision'), // JSON
  tokensUsed: integer('tokens_used'),
  modelUsed: text('model_used'),
  latencyMs: integer('latency_ms'),
  createdAt: integer('created_at'),
});

// 世界状态表
export const worlds = sqliteTable('worlds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  setting: text('setting'), // JSON: 世界设定
  currentDay: integer('current_day').default(1),
  currentWorldTime: integer('current_world_time'),
  timeSpeed: integer('time_speed').default(1),
  createdAt: integer('created_at'),
  updatedAt: integer('updated_at'),
});

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey().default('user'),
  name: text('name').default('你'),
  avatar: text('avatar'),
  bio: text('bio'),
  createdAt: integer('created_at'),
});
```

---

## 六、Monorepo 结构

```
lore/
├── packages/
│   ├── server/              # 后端 + 世界引擎
│   │   ├── src/
│   │   │   ├── index.ts           # 入口：启动 Fastify + 世界引擎
│   │   │   ├── world/            # 世界引擎核心
│   │   │   │   ├── engine.ts         # WorldEngine - 世界主循环
│   │   │   │   ├── clock.ts          # WorldClock - 时间系统
│   │   │   │   ├── events.ts         # EventEngine - 事件引擎
│   │   │   │   ├── scheduler.ts      # 事件调度器
│   │   │   │   └── types.ts          # 世界引擎类型
│   │   │   ├── agent/            # Agent 系统
│   │   │   │   ├── pool.ts           # AgentPool - Agent 池管理
│   │   │   │   ├── runtime.ts        # AgentRuntime - 单个 Agent 运行时
│   │   │   │   ├── memory.ts         # MemoryManager - 记忆管理
│   │   │   │   ├── behavior.ts       # BehaviorEngine - 行为引擎
│   │   │   │   ├── personality.ts    # 人格系统
│   │   │   │   ├── social.ts         # SocialEngine - 社交行为
│   │   │   │   ├── initialization.ts # InitializationAgent - 初始化
│   │   │   │   ├── cost.ts           # CostController - 成本控制
│   │   │   │   └── monitor.ts        # AgentMonitor - 活动监控
│   │   │   ├── llm/              # LLM 调用层
│   │   │   │   ├── provider.ts       # LLMProvider 统一接口
│   │   │   │   ├── factory.ts        # ProviderFactory 工厂
│   │   │   │   ├── openai-compatible.ts  # OpenAI 兼容 Provider
│   │   │   │   ├── anthropropic.ts    # Anthropic Provider
│   │   │   │   ├── google.ts         # Google Provider
│   │   │   │   └── types.ts          # LLM 类型定义
│   │   │   ├── api/              # HTTP + WebSocket
│   │   │   │   ├── routes.ts         # HTTP 路由
│   │   │   │   ├── ws.ts             # WebSocket 处理
│   │   │   │   └── protocol.ts       # 消息协议
│   │   │   ├── db/               # 数据库层
│   │   │   │   ├── schema.ts         # Drizzle schema
│   │   │   │   ├── migrate.ts        # 迁移
│   │   │   │   └── vector.ts         # vec0 向量操作
│   │   │   └── push/             # 推送通知
│   │   │       └── web-push.ts       # Web Push
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   ├── client/              # 前端 React PWA
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── app.tsx
│   │   │   ├── components/
│   │   │   │   ├── layout/       # 页面布局
│   │   │   │   │   ├── AppLayout.tsx
│   │   │   │   │   └── Sidebar.tsx
│   │   │   │   ├── world/        # 世界视图
│   │   │   │   │   ├── EventCard.tsx     # 事件卡片
│   │   │   │   │   ├── AgentList.tsx     # 角色列表
│   │   │   │   │   ├── Timeline.tsx      # 时间线
│   │   │   │   │   ├── Feed.tsx          # 动态流
│   │   │   │   │   └── WorldClock.tsx    # 世界时间显示
│   │   │   │   ├── chat/         # 聊天
│   │   │   │   │   ├── ChatPanel.tsx
│   │   │   │   │   ├── MessageBubble.tsx
│   │   │   │   │   └── ChatInput.tsx
│   │   │   │   ├── agent/        # Agent 详情
│   │   │   │   │   ├── AgentProfile.tsx
│   │   │   │   │   ├── AgentStats.tsx
│   │   │   │   │   └── AgentMemory.tsx
│   │   │   │   ├── social/       # 社交
│   │   │   │   │   ├── SocialFeed.tsx    # 动态流
│   │   │   │   │   ├── PostCard.tsx      # 动态卡片
│   │   │   │   │   ├── CreatePost.tsx    # 发布动态
│   │   │   │   │   └── FriendList.tsx    # 好友列表
│   │   │   │   ├── monitor/      # Agent Monitor
│   │   │   │   │   ├── MonitorPanel.tsx  # 监控面板
│   │   │   │   │   ├── AgentLog.tsx      # 单 Agent 日志
│   │   │   │   │   └── TokenStats.tsx    # Token 统计
│   │   │   │   └── settings/     # 设置
│   │   │   │       ├── ProviderConfig.tsx  # LLM Provider 配置
│   │   │   │       └── WorldSettings.tsx   # 世界设置
│   │   │   ├── pages/
│   │   │   │   ├── WorldPage.tsx      # 主页面（世界视图）
│   │   │   │   ├── ChatPage.tsx       # 聊天页
│   │   │   │   ├── AgentDetailPage.tsx # Agent 详情
│   │   │   │   ├── MonitorPage.tsx    # 监控页
│   │   │   │   └── SettingsPage.tsx   # 设置页
│   │   │   ├── hooks/
│   │   │   │   ├── useWebSocket.ts    # WebSocket 连接
│   │   │   │   ├── useAgent.ts        # Agent 状态
│   │   │   │   └── useWorld.ts        # 世界状态
│   │   │   ├── stores/
│   │   │   │   ├── worldStore.ts      # 世界状态 (zustand)
│   │   │   │   ├── agentStore.ts      # Agent 状态
│   │   │   │   └── chatStore.ts       # 聊天状态
│   │   │   ├── services/
│   │   │   │   ├── ws.ts             # WebSocket 客户端
│   │   │   │   └── api.ts            # REST API
│   │   │   └── lib/
│   │   │       └── utils.ts
│   │   ├── public/
│   │   │   └── manifest.json       # PWA manifest
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── shared/              # 共享类型
│       ├── src/
│       │   ├── types/
│       │   │   ├── agent.ts         # Agent 类型
│       │   │   ├── event.ts         # Event 类型
│       │   │   ├── message.ts       # Message 类型
│       │   │   ├── social.ts        # Social 类型
│       │   │   ├── memory.ts        # Memory 类型
│       │   │   └── provider.ts      # LLM Provider 类型
│       │   └── protocol.ts          # WebSocket 消息协议
│       └── package.json
│
├── docs/
│   ├── DEVELOPMENT.md        # 本文档
│   ├── tech-design.md        # 技术设计（保留作参考）
│   └── tech-decisions.md     # 技术决策（保留作参考）
│
├── package.json              # root package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
├── .gitignore
├── .eslintrc.js
├── .prettierrc
├── README.md
├── README.zh-CN.md
├── CONTRIBUTING.md
└── LICENSE
```

---

## 七、开发路线

### Phase 1 — 能跑（单 Agent + 基础聊天）

**目标：** 打开浏览器 → 看到一个角色 → 能和她聊天 → 流式回复

**任务清单：**
1. Monorepo 脚手架（root package.json + pnpm workspace + tsconfig）
2. `packages/shared`：所有共享类型定义（Agent, Event, Message, Protocol）
3. `packages/server`：
   - Fastify HTTP 服务器 + WebSocket
   - 简单的 Agent Runtime（角色定义 + 状态）
   - OpenAI 兼容 LLM 调用（一个 Provider 就行）
   - WebSocket 聊天协议（发消息 → 调 LLM → 流式返回）
   - SQLite + Drizzle ORM 基础表（agents, messages）
4. `packages/client`：
   - Vite + React 19 + TypeScript
   - shadcn/ui 初始化 + Tailwind CSS
   - 基础布局（左侧角色列表 + 右侧聊天区）
   - 聊天组件（消息气泡 + 流式显示 + 输入框）
   - WebSocket 连接
5. 基础规则引擎：Agent 有简单的日常行为（不需要 LLM）
6. 简单事件系统：预设事件 + 随机触发
7. LLM Provider 配置页面（填 API Key + 选模型）

### Phase 2 — 能记（记忆 + 多 Agent）

**目标：** 多个 Agent 并存，能记住之前的对话和事件

**任务清单：**
1. Agent Pool 管理（创建/销毁/列出 Agent）
2. 记忆系统三层架构（工作/近期/长期）
3. SQLite vec0 向量检索
4. Agent 之间的关系网络
5. 初始化 Agent（创建世界时生成 5-10 个 NPC + 分配关系）
6. 角色创建/编辑 UI
7. Agent 状态面板（心情/健康/金钱等）

### Phase 3 — 能活（自主行为 + 社交）

**目标：** 世界自主运行，Agent 有丰富的社交行为

**任务清单：**
1. 时间系统（世界时间流逝，可配置流速）
2. 步进式世界引擎（runStep 循环）
3. Agent 自主决策（LLM 驱动的社交/感情行为）
4. 社交系统：加好友 / 同意拒绝 / 动态流 / 点赞 / 评论
5. 事件卡片系统（弹出 + 用户可介入）
6. Web Push 推送通知
7. 动态流 UI（类微博/朋友圈）
8. Agent 活动 Monitor（可查看每个 Agent 的思考和行为）

### Phase 4 — 能看（多 Provider + PWA + 发布）

**目标：** 完善体验，准备开源发布

**任务清单：**
1. 多 LLM Provider 接入（Claude, Gemini, 国内厂商模板）
2. 分层 LLM 调用策略（核心/活跃/背景 Agent 用不同模型）
3. PWA 完整配置（Service Worker + manifest + 离线缓存）
4. 多用户访问支持（基础鉴权）
5. 外部平台接入（Telegram / 飞书 / Discord Bot）
6. npm 发布 + 完善文档

### Phase 5 — 能火（社区 + 高级功能）

**目标：** 社区生态，用户留存

**任务清单：**
1. 角色市场（分享/下载 Agent 人设）
2. AI 生图配图（动态的图片由 AI 生成）
3. 视频区（Agent 可发布视频，其他 Agent 可评论）— 需评估成本
4. 用户可发布自己的照片/视频到动态流
5. 高级事件系统（恋爱线、职业线、突发事件链）
6. LLM 成本优化（蒸馏小模型、批量处理）

### Phase 6+ — 能成（开放世界 + 多人）

**目标：** 多人共享世界，开放世界生态

**任务清单：**
1. Agent 死亡 / 新 Agent 加入
2. 用户自定义世界模板（校园 / 职场 / 城市）
3. 多人世界：2-30 个真实用户进入同一个世界，和同一个 Agent 交互
4. NPC 社交网络（Agent 之间形成社交圈）
5. 事件链（一个事件引发连锁反应）
6. 世界模板市场

---

## 八、开发规范

### 8.1 代码规范

- TypeScript strict 模式
- ESLint + Prettier
- 命名：文件 kebab-case，类 PascalCase，函数/变量 camelCase，常量 UPPER_SNAKE_CASE
- 注释：复杂逻辑必须写注释，特别是 LLM prompt 拼接的部分
- 错误处理：async 函数统一 try-catch，错误日志要有上下文

### 8.2 Git 规范

- 分支：main（稳定）, dev（开发）, feature/*（功能分支）
- Commit message：英文，格式 `type(scope): description`
  - type: feat, fix, docs, style, refactor, test, chore
  - 示例：`feat(world): add step-based simulation loop`

### 8.3 开发原则

1. **世界引擎是灵魂**：事件系统、Agent 行为、时间流逝是核心差异化
2. **前端体验是门面**：事件卡片、动态流、聊天 UI 要好看好用
3. **省 token 是生死线**：规则引擎处理日常，LLM 只在决策点介入
4. **AI 辅助编程，不过度设计**：先跑通 Phase 1，再迭代
5. **本地优先，隐私第一**：所有数据默认存本地（~/.lore/）
6. **渐进式开发**：Phase 1 只需要 1 个 Agent + 基础聊天

---

## 九、部署与分发

### 9.1 安装

```bash
npm install -g lore
lore
```

首次运行自动初始化数据目录 `~/.lore/`，打开浏览器 `http://localhost:3952`。

### 9.2 数据目录

```
~/.lore/
├── config.json      # 配置（API Key、模型、时间流速等）
├── lore.db          # SQLite 数据库
├── agents/          # Agent 定义文件（可选，也可全在 DB 里）
├── assets/          # 头像、背景等资源
└── logs/
```

### 9.3 手机访问

- 同一 WiFi：`http://电脑IP:3952`，PWA 加到桌面
- 外网：cloudflared / ngrok（文档指引）
- PWA 安装后支持 Web Push 推送通知

---

## 十、关键设计决策记录

### D1: 为什么自研世界引擎而不直接用 Mastra/LangGraph？

Mastra 和 LangGraph 都是通用 Agent 框架，但 Lore 的核心是**持续运行的多 Agent 世界**，这需要：

- 世界持续运行（不是被动调用）
- 时间系统（可配置流速，离线加速）
- 事件引擎（规则 + 概率 + LLM 驱动 + 用户触发）
- Agent Pool 管理（动态创建/销毁，分层 LLM 调用）
- 关系网络（Agent 之间的关系网络）
- 推送系统（选择性推送给用户）

这些东西 Mastra 和 LangGraph 都没有，强行套框架反而限制发挥。

**做法：借鉴 Mastra 的设计模式（Agent 类、记忆分层、Tool 系统），借鉴 AI Town 的步进式循环，代码自己写。**

### D2: 为什么不用 Claude Code / Cursor 来写 Agent 框架代码？

这份文档就是给 Claude Code / Cursor 等工具用的。架构设计和类型定义已经写好，AI Coding 工具只需要按照文档实现即可。

### D3: 为什么选 SQLite 而不是 PostgreSQL？

- Lore 是本地优先的工具（`npm install -g lore && lore`），不需要远程数据库
- SQLite 零配置，单文件，数据就在用户电脑上
- vec0 扩展支持向量检索，满足记忆系统需求
- Drizzle ORM 对 SQLite 支持极好
- 如果以后要做多人在线版本，可以迁移到 PostgreSQL（Drizzle 支持切换）

### D4: 关于 Coding Plan

现阶段 Coding Plan 只限编程工具，Lore 是 chat/agent 场景用不了。

**但架构上预留了空间**：LLM 调用层是统一接口（Provider Interface），底层换实现不影响上层。如果以后 Coding Plan 开放了，只需要加一个 Provider Adapter。

### D5: 关于多人世界

多人共享世界是远期愿景（Phase 6+）。架构上需要注意：

- Agent 的状态不能只存在内存，必须持久化
- WebSocket 需要支持多连接（多个用户同时在线）
- 事件推送需要按用户过滤（不同用户看到的事件可能不同）
- Agent 和不同用户的关系是独立的

**现阶段不需要实现，但数据模型和 API 设计要考虑多人场景。**

---

## 十一、Phase 1 详细实施步骤

> 这是给 AI Coding 工具的具体操作指南，按顺序执行即可。

### Step 1：Monorepo 脚手架

```bash
# 在 lore/ 根目录下执行

# 1. 创建 pnpm workspace 配置
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'packages/*'
EOF

# 2. Root package.json
cat > package.json << 'EOF'
{
  "name": "lore-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel --filter ./packages/* run dev",
    "dev:server": "pnpm --filter @lore/server run dev",
    "dev:client": "pnpm --filter @lore/client run dev",
    "build": "pnpm --filter @lore/shared run build && pnpm --filter ./packages/* run build",
    "db:generate": "pnpm --filter @lore/server run db:generate",
    "db:migrate": "pnpm --filter @lore/server run db:migrate"
  },
  "engines": {
    "node": ">=20"
  }
}
EOF

# 3. TypeScript 基础配置
cat > tsconfig.base.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
EOF

# 4. .gitignore
cat > .gitignore << 'EOF'
node_modules/
dist/
*.db
*.db-journal
.env
.env.local
.turbo/
.DS_Store
*.log
coverage/
EOF
```

### Step 2：packages/shared（共享类型）

```bash
mkdir -p packages/shared/src/types
```

```json
// packages/shared/package.json
{
  "name": "@lore/shared",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

共享类型文件（把第三部分的所有 interface 和 type 拆分到以下文件）：
- `packages/shared/src/types/agent.ts` — AgentProfile, AgentStats, AgentState, Relationship, Agent
- `packages/shared/src/types/event.ts` — WorldEvent, EventConsequence, EventCategory
- `packages/shared/src/types/memory.ts` — AgentMemory, MemoryEntry, LongTermMemoryEntry
- `packages/shared/src/types/social.ts` — SocialAction, SocialPost, PostComment, FriendRequest
- `packages/shared/src/types/provider.ts` — ProviderConfig, GenerateOptions, LLMProvider
- `packages/shared/src/types/message.ts` — Message, ClientMessage, ServerMessage
- `packages/shared/src/index.ts` — 统一导出

### Step 3：packages/server（后端）

```bash
mkdir -p packages/server/src/{world,agent,llm,api,db}
```

```json
// packages/server/package.json
{
  "name": "@lore/server",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  },
  "dependencies": {
    "@lore/shared": "workspace:*",
    "fastify": "^5.2.0",
    "@fastify/websocket": "^11.0.0",
    "@fastify/cors": "^10.0.0",
    "@fastify/static": "^8.0.0",
    "ai": "^4.1.0",
    "@ai-sdk/openai": "^1.2.0",
    "drizzle-orm": "^0.38.0",
    "better-sqlite3": "^11.8.0",
    "nanoid": "^5.1.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "@types/better-sqlite3": "^7.6.0",
    "@types/node": "^22.0.0",
    "drizzle-kit": "^0.30.0"
  }
}
```

```json
// packages/server/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

**服务端入口** `packages/server/src/index.ts`：

```typescript
import Fastify from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import { registerRoutes } from './api/routes.js';
import { registerWebSocket } from './api/ws.js';
import { initDB } from './db/index.js';

const app = Fastify({ logger: true });

async function main() {
  // 插件
  await app.register(fastifyCors, { origin: true });
  await app.register(fastifyWebSocket);

  // 数据库
  const db = await initDB();

  // 路由
  registerRoutes(app, db);
  registerWebSocket(app, db);

  // 启动
  const port = Number(process.env.PORT) || 3952;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🪐 Lore server running at http://localhost:${port}`);
}

main().catch(console.error);
```

### Step 4：LLM 调用层（Phase 1 最小实现）

**Phase 1 只需要一个 OpenAI 兼容的 Provider 就够了。** 用 Vercel AI SDK 的 `createOpenAI`：

```typescript
// packages/server/src/llm/openai-compatible.ts
import { createOpenAI } from '@ai-sdk/openai';
import { streamText, generateText, embed } from 'ai';
import type { ProviderConfig } from '@lore/shared';

/**
 * 创建 OpenAI 兼容的 LLM 客户端
 * 支持 Kimi、千问、豆包、智谱、DeepSeek 等所有兼容 OpenAI 格式的厂商
 */
export function createOpenAICompatibleProvider(config: ProviderConfig) {
  const openai = createOpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
  });

  return {
    /**
     * 流式生成文本（聊天用）
     */
    async streamChat(systemPrompt: string, messages: Array<{role: string; content: string}>, model: string) {
      const result = streamText({
        model: openai(model),
        system: systemPrompt,
        messages,
      });
      return result;
    },

    /**
     * 非流式生成文本（Agent 决策用）
     */
    async generate(systemPrompt: string, messages: Array<{role: string; content: string}>, model: string) {
      const { text } = await generateText({
        model: openai(model),
        system: systemPrompt,
        messages,
      });
      return text;
    },

    /**
     * 生成 embedding（记忆向量用）
     * 注意：不是所有 OpenAI 兼容厂商都支持 embed，需要 try-catch
     */
    async embedTexts(texts: string[], model: string) {
      try {
        const { embeddings } = await embed({
          model: openai.embedding(model),
          values: texts,
        });
        return embeddings;
      } catch {
        // embed 不支持时，返回空向量（Phase 1 先跳过向量检索）
        return texts.map(() => []);
      }
    },
  };
}
```

### Step 5：Agent 的 LLM System Prompt 模板

**这是 Agent 行为的灵魂。** 以下是一个完整的 prompt 模板，Phase 1 可以直接用：

```typescript
// packages/server/src/agent/prompts.ts

/**
 * 构建聊天时的 System Prompt
 * 
 * 核心原则：
 * 1. Agent 要像真人一样说话，不要像 AI 助手
 * 2. 根据角色的人格、背景、心情调整语气
 * 3. 记忆上下文让对话有连续性
 * 4. 不要主动说"我是 AI"或"我是虚拟角色"
 */
export function buildChatSystemPrompt(agent: Agent, context: {
  worldTime: string;
  recentMemories: string[];
  relevantMemories: string[];
  relationshipWithUser?: Relationship;
}): string {
  const parts: string[] = [];

  // 1. 角色身份（核心）
  parts.push(`你是${agent.profile.name}，${agent.profile.age}岁，${agent.profile.occupation}。
工作地点：${agent.profile.workplace}。

你的性格：${agent.profile.personality}
你的说话风格：${agent.profile.speechStyle}

你的背景故事：
${agent.profile.backstory}

你的价值观：${agent.profile.values.join('、')}

你现在的心情：${describeMood(agent.state.stats.mood)}
你现在的状态：${agent.state.currentActivity}（在${agent.state.currentLocation}）`);

  // 2. 世界信息
  parts.push(`\n---\n当前世界时间：${context.worldTime}`);

  // 3. 与用户的关系
  if (context.relationshipWithUser) {
    const rel = context.relationshipWithUser;
    const relDesc = rel.type === 'stranger' ? '陌生人'
      : rel.type === 'acquaintance' ? '认识的人'
      : rel.type === 'friend' ? '朋友'
      : rel.type === 'close_friend' ? '好朋友'
      : rel.type === 'lover' ? '恋人'
      : rel.type;
    parts.push(`\n你和对方的关系：${relDesc}（亲密度：${rel.intimacy}/100）
关系历史摘要：${rel.history || '暂无'}`);
  }

  // 4. 记忆上下文
  if (context.recentMemories.length > 0) {
    parts.push(`\n---\n你最近记得的事情：
${context.recentMemories.map(m => `- ${m}`).join('\n')}`);
  }

  if (context.relevantMemories.length > 0) {
    parts.push(`\n与当前对话相关的记忆：
${context.relevantMemories.map(m => `- ${m}`).join('\n')}`);
  }

  // 5. 行为规则
  parts.push(`\n---\n【行为规则 - 必须遵守】
1. 你是${agent.profile.name}，一个真实的人。不要说"作为AI"、"我是一个虚拟角色"之类的话。
2. 用你自己的风格说话（${agent.profile.speechStyle}），保持一致。
3. 根据你的心情（${describeMood(agent.state.stats.mood)}）调整语气。心情好的时候更开朗，心情差的时候更冷淡或烦躁。
4. 不要每条消息都很长。像真人聊天一样，有时回一个字，有时回一段话。
5. 如果你正在忙（${agent.state.currentActivity}），可以表现出分心或不耐烦。
6. 对方的态度和行为会影响你的心情和关系。对方说好话你会开心，对方说不好听的话你会生气。
7. 你有记忆，可以提到之前发生的事。
8. 不要过度热情，不要像客服一样。你是一个有自己生活和情绪的普通人。`);

  return parts.join('\n');
}

/**
 * 构建决策用的 System Prompt
 * 
 * Agent 在需要做决策时使用（非聊天场景）
 */
export function buildDecisionSystemPrompt(agent: Agent, context: {
  worldTime: string;
  pendingEvents: WorldEvent[];
  otherAgents: Array<{name: string; relationship: Relationship}>;
}): string {
  const parts: string[] = [];

  parts.push(`你是${agent.profile.name}，正在做日常决策。

你的性格：${agent.profile.personality}
你的说话风格：${agent.profile.speechStyle}

当前状态：
- 心情：${describeMood(agent.state.stats.mood)}（${agent.state.stats.mood}/100）
- 精力：${agent.state.stats.energy}/100
- 当前位置：${agent.state.currentLocation}
- 正在做：${agent.state.currentActivity}

当前时间：${context.worldTime}

你认识的人：
${context.otherAgents.map(a => `- ${a.name}（${a.relationship.type}，亲密度${a.relationship.intimacy}）`).join('\n')}

待处理的事件：
${context.pendingEvents.map(e => `- [${e.category}] ${e.description}`).join('\n')}

【你需要做的】
根据你的性格、心情、精力、当前活动，决定接下来做什么。

输出 JSON 格式：
{
  "action": "你要做的事（简短描述）",
  "targetAgentId": "如果和某个特定的人互动，填写对方的 ID；否则为 null",
  "response": "如果你要说话，填写要说的话；否则为 null",
  "moodChange": 心情变化值（-20到20之间）,
  "energyChange": 精力变化值（-20到20之间）,
  "memoryWorthStoring": "如果有值得记住的事，简短描述；否则为 null"
}`);

  return parts.join('\n');
}

function describeMood(mood: number): string {
  if (mood >= 80) return '非常好';
  if (mood >= 60) return '不错';
  if (mood >= 40) return '一般';
  if (mood >= 20) return '不太好';
  return '很差';
}
```

### Step 6：WebSocket 聊天实现

```typescript
// packages/server/src/api/ws.ts
import type { FastifyInstance } from 'fastify';
import { createOpenAICompatibleProvider } from '../llm/openai-compatible.js';
import { buildChatSystemPrompt } from '../agent/prompts.js';

export function registerWebSocket(app: FastifyInstance, db: any) {
  app.get('/ws', { websocket: true }, (socket, req) => {
    // 加载用户配置的 LLM Provider
    const provider = createOpenAICompatibleProvider({
      baseUrl: process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
      apiKey: process.env.LLM_API_KEY || '',
    });

    const model = process.env.LLM_MODEL || 'deepseek-chat';

    // 当前会话状态
    let currentAgentId: string | null = null;
    let chatHistory: Array<{role: string; content: string}> = [];

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as ClientMessage;

        switch (message.type) {
          case 'chat': {
            // 1. 加载 Agent
            const agent = await db.getAgent(message.agentId);
            if (!agent) {
              socket.send(JSON.stringify({ type: 'error', message: 'Agent not found' }));
              return;
            }

            currentAgentId = message.agentId;

            // 2. 保存用户消息
            chatHistory.push({ role: 'user', content: message.content });
            await db.saveMessage(message.agentId, 'user', message.content);

            // 3. 构建 System Prompt
            const systemPrompt = buildChatSystemPrompt(agent, {
              worldTime: 'Day 1, 09:00',
              recentMemories: [],
              relevantMemories: [],
            });

            // 4. 流式调 LLM
            const stream = await provider.streamChat(systemPrompt, chatHistory, model);

            // 5. 流式返回给前端
            let fullText = '';
            for await (const chunk of (await stream).textStream) {
              fullText += chunk;
              socket.send(JSON.stringify({
                type: 'chat_stream',
                agentId: message.agentId,
                chunk,
              }));
            }

            // 6. 流结束
            socket.send(JSON.stringify({
              type: 'chat_end',
              agentId: message.agentId,
              fullMessage: fullText,
            }));

            // 7. 保存 Agent 回复
            chatHistory.push({ role: 'assistant', content: fullText });
            await db.saveMessage(message.agentId, 'agent', fullText);
            break;
          }

          case 'get_agent_state': {
            const state = await db.getAgentState(message.agentId);
            socket.send(JSON.stringify({
              type: 'agent_state_update',
              agentId: message.agentId,
              state,
            }));
            break;
          }
        }
      } catch (error) {
        socket.send(JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });

    socket.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });
}
```

### Step 7：REST API 端点

```typescript
// packages/server/src/api/routes.ts
import type { FastifyInstance } from 'fastify';

export function registerRoutes(app: FastifyInstance, db: any) {
  // ========== 世界 ==========

  // 获取世界状态
  app.get('/api/world', async (req, reply) => {
    const world = await db.getWorld();
    return world;
  });

  // 创建新世界
  app.post('/api/world', async (req, reply) => {
    const { setting, agentCount } = req.body as { setting?: string; agentCount?: number };
    const world = await db.createWorld(setting, agentCount || 8);
    return world;
  });

  // ========== Agent ==========

  // 获取所有 Agent 列表
  app.get('/api/agents', async (req, reply) => {
    const agents = await db.listAgents();
    return agents.map(a => ({
      id: a.id,
      name: a.name,
      occupation: a.occupation,
      avatar: a.avatar,
      status: a.status,
      stats: JSON.parse(a.stats),
      currentActivity: a.currentActivity,
    }));
  });

  // 获取单个 Agent 详情
  app.get('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await db.getAgent(id);
    if (!agent) return reply.code(404).send({ error: 'Agent not found' });
    return agent;
  });

  // 创建 Agent
  app.post('/api/agents', async (req, reply) => {
    const profile = req.body;
    const agent = await db.createAgent(profile);
    return agent;
  });

  // 更新 Agent
  app.put('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const updates = req.body;
    const agent = await db.updateAgent(id, updates);
    return agent;
  });

  // ========== 聊天记录 ==========

  // 获取与某 Agent 的聊天历史
  app.get('/api/agents/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { limit = 50, offset = 0 } = req.query as { limit?: string; offset?: string };
    const messages = await db.getMessages(id, Number(limit), Number(offset));
    return messages;
  });

  // ========== 事件 ==========

  // 获取事件历史
  app.get('/api/events', async (req, reply) => {
    const { limit = 50, offset = 0 } = req.query as { limit?: string; offset?: string };
    const events = await db.getEvents(Number(limit), Number(offset));
    return events;
  });

  // ========== 社交动态 ==========

  // 获取动态流
  app.get('/api/posts', async (req, reply) => {
    const { limit = 20, offset = 0 } = req.query as { limit?: string; offset?: string };
    const posts = await db.getPosts(Number(limit), Number(offset));
    return posts;
  });

  // 发布动态
  app.post('/api/posts', async (req, reply) => {
    const { content, images } = req.body as { content: string; images?: string[] };
    const post = await db.createPost('user', content, images);
    return post;
  });

  // ========== 关系 ==========

  // 获取 Agent 与用户的关系
  app.get('/api/agents/:id/relationship', async (req, reply) => {
    const { id } = req.params as { id: string };
    const relationship = await db.getRelationship(id, 'user');
    return relationship || { type: 'stranger', intimacy: 0 };
  });

  // ========== Monitor ==========

  // 获取 Agent 活动日志
  app.get('/api/monitor/:agentId', async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    const { limit = 50 } = req.query as { limit?: string };
    const logs = await db.getActivityLogs(agentId, Number(limit));
    return logs;
  });

  // 获取 Token 统计
  app.get('/api/monitor/stats', async (req, reply) => {
    const stats = await db.getTokenStats();
    return stats;
  });

  // ========== 配置 ==========

  // 获取 LLM Provider 配置
  app.get('/api/config/providers', async (req, reply) => {
    // 从 ~/.lore/config.json 读取
    return []; // Phase 1 先返回空，前端引导用户配置
  });

  // 保存 LLM Provider 配置
  app.post('/api/config/providers', async (req, reply) => {
    const config = req.body;
    // 写入 ~/.lore/config.json
    return { success: true };
  });

  // 测试 LLM 连接
  app.post('/api/config/test', async (req, reply) => {
    const { baseUrl, apiKey, model } = req.body as { baseUrl: string; apiKey: string; model: string };
    try {
      const provider = createOpenAICompatibleProvider({ baseUrl, apiKey, name: 'test', type: 'openai-compatible', models: [model] });
      const result = await provider.generate('你是一个测试。回复"连接成功"', [{ role: 'user', content: '你好' }], model);
      return { success: true, message: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });
}
```

### Step 8：packages/client（前端）

```bash
cd packages/client && pnpm create vite@latest . --template react-ts
pnpm add zustand framer-motion
pnpm add -D tailwindcss @tailwindcss/vite
```

```json
// packages/client/package.json（关键依赖）
{
  "name": "@lore/client",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@lore/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.1.0",
    "zustand": "^5.0.0",
    "framer-motion": "^11.15.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

**Phase 1 前端只需要 3 个核心页面：**

1. **WorldPage** — 左侧 Agent 列表 + 右侧主交互区（事件卡片 + 聊天）
2. **SettingsPage** — LLM Provider 配置（填 API Key + baseURL + model）
3. **ChatPanel** — 聊天组件（消息气泡 + 流式显示 + 输入框）

**WebSocket 客户端 hook：**

```typescript
// packages/client/src/services/ws.ts
import { useEffect, useRef, useCallback } from 'react';

const WS_URL = `ws://${window.location.hostname}:3952/ws`;

export function useWebSocket(onMessage: (msg: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    ws.onclose = () => {
      // 3 秒后自动重连
      reconnectRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [onMessage]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectRef.current);
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
```

### Step 9：启动开发

```bash
# 安装所有依赖
pnpm install

# 构建 shared（client 和 server 依赖它）
pnpm --filter @lore/shared run build

# 同时启动 server 和 client
pnpm dev

# 或分别启动：
pnpm dev:server  # http://localhost:3952
pnpm dev:client  # http://localhost:5173
```

**Vite 开发代理配置**（packages/client/vite.config.ts）：

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3952',
      '/ws': {
        target: 'ws://localhost:3952',
        ws: true,
      },
    },
  },
});
```

---

## 十二、环境变量

```
# .env（放在 lore/ 根目录，gitignore 掉）

# LLM 配置（Phase 1 先用环境变量，后面改用 ~/.lore/config.json）
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-your-key-here
LLM_MODEL=deepseek-chat

# 服务端口
PORT=3952
```

---

## 十三、Phase 1 验收标准

Phase 1 完成的标志：

- [ ] `pnpm install` 成功，无报错
- [ ] `pnpm dev:server` 启动成功，API 可访问
- [ ] `pnpm dev:client` 启动成功，浏览器打开能看到界面
- [ ] 前端能看到一个预设的 Agent（如"小美"）
- [ ] 点 Agent 可以进入聊天界面
- [ ] 发消息后，Agent 流式回复（打字机效果）
- [ ] 回复风格符合角色设定（不是 AI 助手风格）
- [ ] 设置页面可以配置 API Key 和模型
- [ ] SQLite 数据库正常创建，聊天记录可以持久化
- [ ] 关闭服务再启动，之前的聊天记录还在
