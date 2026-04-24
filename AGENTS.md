# Lore Agent 指南

> 本指南面向 AI 编码助手（Agents），提供项目结构、编码规范和开发指南。
> 最后更新：2026-04-23

---

## 项目简介

**Lore 是一个开源的 AI 世界模拟器。** 用户进入一个由 AI 驱动的虚拟世界——里面每个角色都是独立的 AI Agent，有自己的工作、社交、感情线、人生轨迹。世界持续运行，角色自主决策。

### 核心理念

- **不是聊天工具，是一个有自己运行规则的虚拟世界**
- AI 角色有自己的工作、社交、感情线，不是等着你找她聊
- 世界不围着你转，你是其中一员
- 每个角色都由 LLM 驱动思考，行为不受限制

---

## 项目结构

```
lore/
├── README.md                 # 项目介绍（中英文）
├── CONTRIBUTING.md          # 贡献指南
├── docs/                    # 技术文档（详细设计）
│   ├── INDEX.md            # 文档索引
│   ├── ROADMAP.md          # Phase 1-6 开发路线
│   ├── TECH-DECISIONS.md   # 技术决策记录
│   ├── architecture/       # 架构文档
│   ├── agent/              # Agent 系统文档
│   ├── world/              # 世界引擎文档
│   ├── api/                # 接口文档
│   └── llm/                # LLM 接入文档
├── packages/
│   ├── server/             # 后端 + 世界引擎 + Agent 系统
│   ├── client/             # 前端 React PWA
│   └── shared/             # 共享 TypeScript 类型
├── package.json            # 根 package.json
├── pnpm-workspace.yaml     # pnpm 工作区配置
└── tsconfig.base.json      # 共享 TS 配置
```

---

## 快速开始

### 环境要求

- Node.js >= 20
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

这会同时启动：
- 后端服务器：`http://localhost:3952`
- 前端开发服务器：`http://localhost:5173`

### 构建项目

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

---

## 技术栈

### 前端

| 层面 | 选型 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建 | Vite |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 状态管理 | zustand |
| 动画 | framer-motion |

### 后端

| 层面 | 选型 |
|------|------|
| HTTP 框架 | Fastify |
| 数据库 | SQLite + Drizzle ORM |
| 向量存储 | SQLite vec0 |
| LLM 调用 | Vercel AI SDK |
| WebSocket | @fastify/websocket |

---

## 核心目录详解

### packages/server/src/

```
packages/server/src/
├── index.ts                    # 入口：启动 Fastify
├── agent/                      # Agent 系统
│   ├── agent-manager.ts        # Agent 注册/生命周期管理
│   ├── agent-runtime.ts        # 单个 Agent 运行时
│   ├── init-agent.ts           # 世界初始化 Agent
│   ├── memory.ts               # 三层记忆系统
│   ├── relationships.ts        # 关系管理
│   ├── social.ts               # 社交引擎
│   └── tools.ts                # Agent 工具/技能
├── scheduler/                  # 调度系统
│   ├── tick-scheduler.ts       # 世界主循环
│   └── push-manager.ts         # 前端推送
├── llm/                        # LLM 调用层
│   ├── openai-provider.ts      # OpenAI 兼容层
│   ├── anthropic-provider.ts   # Claude 支持
│   └── scheduler.ts            # LLM 请求调度
├── world/                      # 世界引擎
│   ├── clock.ts                # 时间系统
│   ├── event-engine.ts         # 事件生成
│   ├── world-agent.ts          # 世界管理 Agent
│   └── persistence.ts          # 持久化
├── api/                        # HTTP + WebSocket
│   ├── routes.ts               # REST API
│   └── ws.ts                   # WebSocket
└── db/                         # 数据库
    ├── schema.ts               # Drizzle schema
    └── repository.ts           # 数据访问层
```

### packages/client/src/

```
packages/client/src/
├── main.tsx
├── App.tsx
├── pages/                      # 页面
│   ├── InitPage.tsx           # 世界初始化
│   ├── HomePage.tsx           # 主页
│   ├── WorldPage.tsx          # 世界页面
│   └── SettingsPage.tsx       # 设置
├── components/                 # 组件
│   ├── layout/                # 布局组件
│   ├── agent/                 # Agent 相关
│   ├── chat/                  # 聊天组件
│   ├── events/                # 事件卡片
│   ├── world/                 # 世界相关
│   └── settings/              # 设置组件
├── stores/                     # zustand 状态管理
├── services/                   # API 和 WebSocket 服务
└── lib/                        # 工具函数
```

---

## 编码规范

### TypeScript

- 使用 TypeScript strict 模式
- 类型定义放在 `packages/shared/src/types/`
- 优先使用接口（interface）定义对象类型
- 避免使用 `any`，使用 `unknown` 配合类型守卫

### 命名规范

- **文件**: `kebab-case.ts` (如 `tick-scheduler.ts`)
- **类**: `PascalCase` (如 `AgentRuntime`)
- **函数**: `camelCase` (如 `handleMessage`)
- **常量**: `SCREAMING_SNAKE_CASE` (如 `MAX_RETRY_COUNT`)
- **类型**: `PascalCase` (如 `AgentState`)

### 代码风格

- 使用 ESLint + Prettier 自动格式化
- 提交前运行 `pnpm lint`
- 保持函数简短（不超过 50 行）
- 添加有意义的注释，解释"为什么"而不是"是什么"

### 错误处理

```typescript
// 使用自定义错误类型
import { LoreError, ErrorCode } from '../errors.js';

throw new LoreError(ErrorCode.AGENT_NOT_FOUND, `Agent ${id} not found`);

// 异步错误处理
async function fetchData(): Promise<Result<Data, Error>> {
  try {
    const data = await api.fetch();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: normalizeError(error) };
  }
}
```

---

## 架构原则

### 1. 所有 Agent 都由 LLM 驱动

**不存在纯规则引擎驱动的 Agent。** 每个角色都有完整的、不受限制的人生，由 LLM 驱动思考。

成本控制不在 LLM 价格，而在调用频率：
- 核心 Agent（用户正在交互的）→ 每 tick 思考，用 premium 模型
- 活跃 Agent（用户身边的）→ 每 1-3 tick 思考，用 standard 模型
- 远处 Agent → 每 5-10 tick 思考，用 cheap 模型

### 2. 事件驱动架构

```
tick() {
  1. 世界时间 +1
  2. World Agent 决策（天灾、宏观事件）
  3. 生成日常事件
  4. 遍历 Agent：每个都要思考（LLM 驱动）
  5. 重要事件推给前端
  6. 定期持久化
}
```

### 3. 懒加载 Agent

不是所有 Agent 在世界初始化时都创建。Agent 的创建是渐进式的：
- 初始化时只创建用户身边的核心人物
- 用户探索新区域时按需创建
- 系统可以预判创建

---

## 测试策略

### 测试框架

- **vitest** 作为测试框架
- **@vitest/coverage-v8** 覆盖率
- LLM 调用统一 mock

### 测试分层

```
packages/server/tests/
├── unit/                      # 单元测试
│   ├── agent/
│   ├── world/
│   ├── llm/
│   └── scheduler/
├── integration/               # 集成测试
│   ├── db/
│   └── api/
└── e2e/                       # 端到端测试
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 生成覆盖率报告
pnpm test:coverage
```

---

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式（同时启动前后端）
pnpm dev

# 仅启动后端
pnpm dev:server

# 仅启动前端
pnpm dev:client

# 构建
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 格式化
pnpm format

# 数据库迁移
pnpm db:migrate

# 生成数据库类型
pnpm db:generate
```

---

## 提交规范

使用约定式提交（Conventional Commits）：

```
feat:     新功能
fix:      修复 bug
docs:     文档更新
refactor: 代码重构（不改变功能）
chore:    维护性工作（依赖更新、配置等）
test:     测试相关
style:    代码风格（格式化，不影响逻辑）
```

示例：
```bash
git commit -m "feat: add agent relationship tracking"
git commit -m "fix: resolve memory leak in tick scheduler"
git commit -m "docs: update API endpoint documentation"
```

---

## 重要文档速查

| 文档 | 内容 |
|------|------|
| [docs/INDEX.md](./docs/INDEX.md) | 文档总索引 |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Phase 1-6 开发路线 |
| [docs/TECH-DECISIONS.md](./docs/TECH-DECISIONS.md) | 技术决策记录 |
| [docs/architecture/overview.md](./docs/architecture/overview.md) | 项目概述、架构 |
| [docs/architecture/directory.md](./docs/architecture/directory.md) | 完整目录结构 |
| [docs/architecture/tech-stack.md](./docs/architecture/tech-stack.md) | 技术栈详情 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

---

## 注意事项

1. **不要引入不必要的复杂性** - 我们使用 AI 辅助编程，代码应该简单易懂
2. **优先使用成熟工具** - 通用问题用成熟工具，差异化问题自研
3. **所有 Agent 都由 LLM 驱动** - 不存在纯规则引擎驱动的 Agent
4. **本地优先** - `npm install -g lore && lore` 即可运行，零配置
5. **保持类型安全** - 使用 TypeScript strict 模式，避免 `any`

---

## 需要帮助？

- 查看 [docs/INDEX.md](./docs/INDEX.md) 获取完整文档索引
- 查看 [docs/architecture/overview.md](./docs/architecture/overview.md) 了解架构详情
- 查看 [docs/TECH-DECISIONS.md](./docs/TECH-DECISIONS.md) 了解技术选型理由
