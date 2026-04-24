# Lore 开发路线

## Phase 1: 能跑（MVP） ✅ 95%

**目标**: 单 Agent + 世界初始化 + 基础沙盒 + 聊天

| Step | 任务 | 状态 |
|------|------|------|
| 1 | 项目脚手架（pnpm monorepo + TS + Vite + Fastify） | ✅ |
| 2 | 数据库层（SQLite + Drizzle ORM） | ✅ |
| 3 | REST API（Fastify 路由） | ✅ |
| 4 | LLM 接入（Provider 抽象 + OpenAI 兼容） | ✅ |
| 5 | Agent Runtime（AgentRuntime + Memory + Personality） | ✅ |
| 6 | 初始化系统（InitAgent + 随机模式） | ✅ |
| 7 | 世界引擎（TickScheduler + WorldClock） | ✅ |
| 8 | 基础沙盒（找工作、买东西） | ⚠️ 70% |
| 9 | 基础经济（收入支出） | ⚠️ 60% |
| 10 | WebSocket（实时推送 + 流式聊天） | ✅ |
| 11 | 前端 UI（事件卡片 + 聊天面板） | ✅ |
| 12 | 集成测试 | ⚠️ 30% |

## Phase 2: 能记 ✅ 100%

**目标**: 三层记忆完整实现，多 Agent 互动，虚拟平台

| 任务 | 状态 |
|------|------|
| 三层记忆（working/recent/long-term + vec0） | ✅ |
| Agent 间关系（RelationshipManager） | ✅ |
| EventBus（Agent 间通信） | ✅ |
| 虚拟平台系统（TikTok/Twitter） | ✅ |
| 多模态（生图集成） | ⚠️ |

## Phase 3: 能活 ⚠️ 80%

**目标**: Agent 自主行为，World Agent，上帝模式

| 任务 | 状态 |
|------|------|
| Agent 自主行为（主动发消息） | ✅ |
| World Agent（天灾、宏观事件） | ⚠️ 简化版 |
| LLMScheduler 升级（优先级队列） | ⚠️ 定义但未完全使用 |
| PushManager（选择性推送） | ✅ |
| 上帝模式（观察 Agent 思考） | ✅ |
| Monitor 面板 | ✅ |
| 懒加载 Agent | ✅ |

## Phase 4: 能玩 🔜

**目标**: 历史模式，社区预设，高级沙盒

| 任务 | 状态 |
|------|------|
| 历史模式（魂穿、历史分叉） | 待开发 |
| 社区预设系统（YAML + Zod） | 待开发 |
| 高级沙盒（创业、创建平台） | 待开发 |
| 事件链状态机 | ✅ 已搭建 |
| 势力系统 | ✅ 已搭建 |

## Phase 5: 能看 🔜

**目标**: 产品化，npm 发布

| 任务 | 状态 |
|------|------|
| 多 Provider 完善 | ⚠️ Anthropic 已完成 |
| PWA（Service Worker） | 待开发 |
| npm 发布（`npm install -g lore`） | 待开发 |
| 完整经济系统 | 待开发 |

## Phase 6+: 能火 🔜

**目标**: 多人世界，社区生态

| 任务 | 状态 |
|------|------|
| 多人世界 | 待开发 |
| 社区生态系统 | 待开发 |

## 性能约束

| 指标 | 目标 |
|------|------|
| Tick 间隔 | 3s |
| 单 Tick 耗时 | < 500ms |
| Agent 数量 | 10-50 |
| 内存占用 | < 500MB |
| LLM 并发 | 5-10 |