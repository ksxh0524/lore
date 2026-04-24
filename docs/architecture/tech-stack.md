# 技术栈

> 最后更新：2026-04-23 | 版本 v0.02

---

## 前端

| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + TypeScript | 生态成熟，AI 辅助编程友好 |
| 构建 | Vite | 快，配置简单 |
| UI 组件 | shadcn/ui + Tailwind CSS | 自定义组件 |
| 状态管理 | zustand | 轻量，够用 |
| 动画 | framer-motion | 事件卡片弹出、页面过渡 |
| 移动端 | PWA（Service Worker + Web Push） | 不做原生 APP |
| 路由 | React Router | 标配 |

## 后端

| 层面 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js >= 20 | 前后端统一语言 |
| HTTP 框架 | Fastify | 性能好，插件体系强，内置日志（pino） |
| 实时通信 | WebSocket（@fastify/websocket） | 事件推送、流式聊天 |
| 数据库 | SQLite + Drizzle ORM | 零配置，本地友好 |
| 向量存储 | SQLite vec0 | 长期记忆语义检索 |
| LLM 调用 | Vercel AI SDK + OpenAI SDK | 统一接口，多厂商支持 |
| 图片生成 | DALL-E / Stable Diffusion API | Agent 自拍、平台图片 |
| 定时任务 | setInterval（TickScheduler） | 世界主循环 |

## 工程化

| 层面 | 选型 |
|------|------|
| 包管理 | pnpm monorepo |
| 分发 | npm publish |
| 运行环境 | Node.js >= 20，不用 Docker |
| 配置校验 | Zod |
| 代码质量 | ESLint + Prettier + TypeScript strict |
| 测试 | vitest |
| 文件上传 | multer（图片/视频上传到虚拟平台） |

## 不用的东西

| 不用 | 原因 |
|------|------|
| Docker | 本地优先，npm install -g 即可 |
| PostgreSQL | 零配置原则，SQLite 够用 |
| Mastra / LangGraph | 不提供持续多 Agent + 时间 + 社交 + 推送 |
| Redis | 单机本地运行，内存缓存足够 |

## LLM 成本控制

所有 Agent 都由 LLM 驱动思考。成本控制靠频率分级和请求队列管理：

```
核心 Agent（用户正在聊的 1-3 个）--> premiumModel，每 tick 思考
活跃 Agent（用户身边的 10-30 个）--> premiumModel，每 tick 思考
关联 Agent（用户认识的）--> standardModel，每 2-3 tick 思考
远处 Agent（有关联但距离远）--> cheapModel，每 5-10 tick 思考
极远处 Agent --> cheapModel，每天一次总结
超载时低优先级请求延后或丢弃
```

---

> 相关文档：[项目概述](./overview.md) | [目录结构](./directory.md) | [LLM 接入](../llm/providers.md)
