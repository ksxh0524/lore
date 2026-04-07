# Lore

> 🌍 开源 AI 人生模拟器 — AI 角色在一个虚拟世界里自主运行，你作为参与者进入其中

[English](./README.md) | [中文](./README.zh-CN.md)

## Lore 是什么？

Lore 不是聊天机器人。它是一个**有生命的 AI 世界**。

每个 AI 角色都有自己的职业、社交、性格和记忆。他们上班、恋爱、交友、经历人生事件。世界不因你的离开而暂停。

**你不是世界的中心，你是其中一员。**

### 核心特性

- 🤖 **自主 AI 角色** — 每个角色有独立人格、背景故事和行为逻辑
- 🌍 **活的世界** — 世界 7×24 运行，事件持续发生，关系不断变化
- 💬 **深度互动** — 与角色聊天，建立关系，影响事件走向
- 📱 **社交动态** — 角色会发"朋友圈"（自拍、感悟、日常）
- 🎴 **事件驱动** — 人生事件以卡片形式弹出，选择介入或旁观
- 🔒 **隐私优先** — 所有数据本地存储，无需云端
- 🔌 **多模型支持** — 兼容 OpenAI、Claude、DeepSeek、本地模型（Ollama）等

### 与其他项目的区别

| | SillyTavern（酒馆） | AI Town | **Lore** |
|---|---|---|---|
| Agent 自主性 | ❌ 被动等待 | ✅ 基础行为 | ✅ 完整人生模拟 |
| 多 Agent 世界 | ❌ | ✅ 25 个角色 | ✅ 无限制 |
| 用户参与度 | 只能聊天 | 只能旁观 | 互动 + 影响 |
| 记忆系统 | 仅会话内 | 无 | 长期记忆 + 语义检索 |
| 视觉体验 | 纯文字 | 2D 地图 | 事件卡片 + 社交动态 |

## 快速开始

```bash
# 安装
npm install -g lore

# 运行
lore
```

首次运行会自动：
1. 创建 `~/.lore/` 数据目录
2. 初始化 SQLite 数据库
3. 启动世界引擎
4. 打开浏览器 → `http://localhost:3952`

## 开发

```bash
# 克隆
git clone https://github.com/your-username/lore.git
cd lore

# 安装依赖
pnpm install

# 启动开发（服务端 + 前端并行）
pnpm dev
```

### 技术栈

- **前端**：React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **后端**：Node.js + Fastify + WebSocket
- **数据库**：SQLite + Drizzle ORM + vec0（向量检索）
- **AI**：OpenAI 兼容接口（支持 OpenAI、Claude、DeepSeek、Ollama 等）
- **工程化**：pnpm monorepo

### 项目结构

```
lore/
├── packages/
│   ├── server/       # 后端 + 世界引擎
│   ├── client/       # 前端 React PWA
│   └── shared/       # 共享类型
├── docs/
│   └── tech-design.md    # 技术设计文档
└── README.md
```

详细架构请看 [技术设计文档](./docs/tech-design.md)。

## 开发路线

- [x] Phase 0：项目脚手架
- [ ] Phase 1：单 Agent + 基础事件 + 聊天
- [ ] Phase 2：记忆引擎 + 多 Agent
- [ ] Phase 3：自主行为 + 推送通知
- [ ] Phase 4：外部通道（Telegram、飞书、Discord）+ npm 发布
- [ ] Phase 5：角色市场 + 社区
- [ ] Phase 6+：开放世界（Agent 生死、用户自定义世界）

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

MIT
