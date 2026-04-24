# Contributing to Lore

感谢你的贡献！本指南将帮助你快速上手。

---

## 开发环境

### 前置要求

- Node.js ≥ 20
- pnpm ≥ 9

### 环境检查

```bash
# 检查 Node.js 版本
node --version  # 应 >= 20

# 检查 pnpm 版本
pnpm --version  # 应 >= 9
```

---

## 快速开始

### 1. Fork 和克隆

```bash
# Fork 仓库后克隆
git clone https://github.com/your-username/lore.git
cd lore
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，添加你的 API Key
# 支持的 Provider：OpenAI、DeepSeek、Kimi、Claude 等
```

### 4. 启动开发服务器

```bash
pnpm dev
```

这会同时启动：
- 后端：`http://localhost:3952`
- 前端：`http://localhost:5173`

---

## 项目结构

```
lore/
├── packages/
│   ├── server/     # 后端：Fastify + 世界引擎 + Agent Runtime
│   ├── client/     # 前端：React 19 + Vite + shadcn/ui
│   └── shared/     # 共享 TypeScript 类型
├── docs/           # 技术文档
├── AGENTS.md       # AI 编码助手指南
└── CONTRIBUTING.md # 本文件
```

---

## 架构概述

Lore 是一个**事件驱动的 AI 人生模拟器**。核心概念：

- **World Engine**：管理时间、事件和 Agent 生命周期
- **Agent Pool**：每个 Agent 独立运行，有个性、记忆和行为
- **Event System**：事件由规则引擎（低成本）或 LLM（高成本，仅在决策点使用）生成
- **Memory Engine**：长期记忆 + 向量搜索（SQLite vec0）

详细架构请查看：
- [AGENTS.md](../AGENTS.md) - AI 编码助手专用指南
- [docs/architecture/overview.md](../docs/architecture/overview.md) - 架构详情
- [docs/INDEX.md](../docs/INDEX.md) - 完整文档索引

---

## 开发规范

### 代码风格

- TypeScript strict 模式
- ESLint + Prettier（提交前自动格式化）
- 共享类型放在 `packages/shared/src/types/`
- 保持简单 —— 我们使用 AI 辅助编程，不要过度设计

### 命名规范

- **文件**: `kebab-case.ts` (如 `tick-scheduler.ts`)
- **类**: `PascalCase` (如 `AgentRuntime`)
- **函数**: `camelCase` (如 `handleMessage`)
- **常量**: `SCREAMING_SNAKE_CASE` (如 `MAX_RETRY_COUNT`)
- **类型**: `PascalCase` (如 `AgentState`)

### 提交信息规范

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

## 开发流程

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发和测试

```bash
# 运行单元测试
pnpm test:unit

# 运行集成测试
pnpm test:integration

# 运行所有测试
pnpm test

# 代码检查
pnpm lint

# 格式化
pnpm format
```

### 3. 构建验证

```bash
pnpm build
```

确保构建成功后再提交。

### 4. 提交 PR

1. Push 到你的 fork
2. 创建 Pull Request 到 `main` 分支
3. 填写清晰的 PR 描述

---

## 常用命令

```bash
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

## 测试策略

### 测试框架

- **vitest** - 测试框架
- **@vitest/coverage-v8** - 覆盖率
- LLM 调用统一 mock，不依赖真实 API

### 测试结构

```
packages/server/tests/
├── unit/                       # 单元测试
│   ├── agent/
│   ├── world/
│   ├── llm/
│   └── scheduler/
├── integration/                # 集成测试
│   ├── db/
│   └── api/
└── e2e/                        # 端到端测试
```

### Mock LLM Provider

```typescript
export function createMockLLMProvider(): ILLMProvider {
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
  };
}
```

---

## 常见问题

### Q: 启动时出现端口冲突？

检查 `.env` 文件中的端口配置：

```bash
PORT=3952          # 后端端口
CLIENT_PORT=5173   # 前端端口
```

### Q: 数据库连接失败？

确保 SQLite 数据库文件路径正确：

```bash
# 检查数据库目录
ls ~/.lore/

# 如果没有，手动创建
mkdir -p ~/.lore
touch ~/.lore/lore.db
```

### Q: LLM 调用返回错误？

检查 `.env` 文件中的 API Key 配置：

```bash
# OpenAI 兼容
OPENAI_API_KEY=your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# DeepSeek
DEEPSEEK_API_KEY=your-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

### Q: 前端热更新不工作？

尝试重启开发服务器：

```bash
pnpm dev:client
```

---

## 架构原则

1. **所有 Agent 都由 LLM 驱动** —— 不存在纯规则引擎驱动的 Agent
2. **事件驱动** —— tick 循环驱动世界运转
3. **懒加载** —— Agent 按需创建，不是一次性全部初始化
4. **本地优先** —— 零配置，开箱即用
5. **类型安全** —— TypeScript strict 模式

---

## 需要帮助？

- 查看 [AGENTS.md](../AGENTS.md) - 详细的开发指南
- 查看 [docs/INDEX.md](../docs/INDEX.md) - 完整文档索引
- 查看 [docs/architecture/overview.md](../docs/architecture/overview.md) - 架构详情
- 提交 Issue 到 GitHub

---

## 许可证

通过贡献代码，你同意将你的代码以 MIT 许可证开源。
