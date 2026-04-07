# Lore

> 开源 AI 人生模拟器 — AI 角色在一个虚拟世界里自主运行，你作为参与者进入其中

[English](./README.md) | [中文](./README.zh-CN.md)

## Lore 是什么？

Lore 不是聊天机器人。它是一个**有生命的 AI 世界**。

每个 AI 角色都有自己的职业、社交、性格和记忆。他们上班、恋爱、交友、经历人生事件。世界不因你的离开而暂停。

**你不是世界的中心，你是其中一员。**

### 核心特性

- **自主 AI 角色** — 每个角色都由 LLM 驱动思考，没有脚本行为。送外卖的也可能创业成功
- **活的世界** — World Agent 负责天灾、经济、社会变化，世界 7×24 自主运行
- **两种世界模式** — 随机模式（设定年龄、地点，自由探索）或历史模式（魂穿成历史人物）
- **深度互动** — 聊天、上传照片/视频、建立关系、被拒绝、被撩
- **虚拟平台** — Agent 们使用模拟的 YouTube、TikTok、Twitter，发自拍、刷内容、对你的帖子做出反应
- **不限制行为** — Agent 有完整人生，可以创业、和你竞争、谈恋爱、消失
- **事件卡片** — 人生事件以卡片形式弹出，选择介入或旁观
- **上帝模式** — 观察每个 Agent 的思考过程，触发世界事件，看到全局
- **社区预设** — 历史时期、科幻世界、自定义场景——YAML 格式，社区共享
- **隐私优先** — 所有数据本地存储（SQLite），无需云端
- **多模型支持** — 兼容 OpenAI、Claude、DeepSeek、Kimi、本地模型等

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
git clone https://github.com/ksxh0524/lore.git
cd lore

# 安装依赖
pnpm install

# 启动开发（服务端 + 前端并行）
pnpm dev
```

### 技术栈

- **前端**：React 19 + TypeScript + Vite + shadcn/ui + Tailwind CSS + zustand
- **后端**：Node.js + Fastify + WebSocket
- **数据库**：SQLite + Drizzle ORM + vec0（向量检索）
- **AI**：Vercel AI SDK + OpenAI 兼容接口（DeepSeek、Kimi、千问、Claude、Gemini 等）
- **工程化**：pnpm monorepo

### 项目结构

```
lore/
├── packages/
│   ├── server/       # 后端 + 世界引擎 + Agent 系统
│   ├── client/       # 前端 React PWA
│   └── shared/       # 共享类型
├── docs/             # 技术文档
└── README.md
```

详细架构请看 [技术文档](./docs/INDEX.md)。

## 开发路线

- [x] Phase 0：项目脚手架 + 文档
- [ ] Phase 1：世界初始化 + 单 Agent + 基础沙盒 + 聊天 + 基础经济（MVP）
- [ ] Phase 2：记忆引擎 + 多 Agent + 关系网络 + 虚拟平台 + 图片生成
- [ ] Phase 3：World Agent + 自主行为 + 上帝模式 + 推送通知
- [ ] Phase 4：历史模式 + 社区预设 + 高级沙盒 + 势力系统
- [ ] Phase 5：完整经济 + 多模态 + PWA + npm 发布
- [ ] Phase 6+：多人世界 + 社区生态 + 万级 Agent

## 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

MIT
