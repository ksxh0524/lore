# Lore 技术文档

> 最后更新：2026-04-23 | 版本 v0.02

---

## 文档目录

### 项目根目录

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [README.md](../README.md) | 项目介绍、快速开始 | 第一次接触项目 |
| [README.zh-CN.md](../README.zh-CN.md) | 中文版项目介绍 | 中文用户 |
| [AGENTS.md](../AGENTS.md) | Agent 指南：项目结构、编码规范、开发指南 | AI 编码助手 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南、开发环境设置 | 想要贡献代码 |

### architecture/ — 架构

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [overview.md](./architecture/overview.md) | 项目概述、核心理念、世界初始化模式、架构概览 | 第一次接触项目时 |
| [tech-stack.md](./architecture/tech-stack.md) | 前后端技术栈、工程化、成本控制 | 了解用什么技术时 |
| [directory.md](./architecture/directory.md) | 完整目录结构（server/client/shared） | 创建新文件时 |
| [player-modes.md](./architecture/player-modes.md) | 世界类型（历史/随机）× 操控方式（角色/上帝） | 实现模式切换时 |
| [deployment.md](./architecture/deployment.md) | 安装、配置 Schema、手机访问 | 部署或配置时 |
| [frontend-ui.md](./architecture/frontend-ui.md) | 前端 UI 设计规范（配色、字体、组件、动效、页面设计） | 设计/实现前端界面时 |
| [frontend-conventions.md](./architecture/frontend-conventions.md) | 前端开发规范（组件、状态管理、WebSocket、样式） | 编写前端代码时 |
| [backend-conventions.md](./architecture/backend-conventions.md) | 后端开发规范（代码风格、API、数据库、LLM 调用） | 编写后端代码时 |

### agent/ — Agent 系统

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [runtime.md](./agent/runtime.md) | AgentRuntime 核心、tick/chat、思考频率分级、模型选择 | 实现 Agent 运行时 |
| [manager.md](./agent/manager.md) | AgentManager 注册中心、请求队列、超载处理 | 实现 Agent 管理时 |
| [init-agent.md](./agent/init-agent.md) | 初始化 Agent（仅首次世界创建时运行） | 实现世界初始化时 |
| [personality.md](./agent/personality.md) | AgentProfile、BehaviorConfig、AgentStats | 实现人格系统时 |
| [behavior.md](./agent/behavior.md) | 行为引擎、所有 Agent LLM 驱动、频率分级、不限制行为 | 实现行为逻辑时 |
| [memory.md](./agent/memory.md) | 三层记忆、加载策略、token 预算分配 | 实现记忆系统时 |
| [tools.md](./agent/tools.md) | ToolRegistry、function calling、图片生成工具 | 实现工具系统时 |
| [social.md](./agent/social.md) | 社交引擎、平台发帖、Agent 自拍 | 实现社交功能时 |
| [relationships.md](./agent/relationships.md) | 关系类型、亲密度变化、转换规则 | 实现关系系统时 |
| [lifecycle.md](./agent/lifecycle.md) | 懒加载创建、冷启动、死亡/归档、UserAvatar | 实现生命周期时 |
| [prompts.md](./agent/prompts.md) | Prompt 模板（聊天/决策/懒加载创建） | 写 LLM prompt 时 |

### world/ — 世界引擎

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [initialization.md](./world/initialization.md) | 世界初始化系统（历史/随机模式、InitAgent 调用流程） | 实现世界创建时 |
| [world-agent.md](./world/world-agent.md) | World Agent（天灾、宏观事件、世界层面模拟） | 实现世界层面模拟时 |
| [platform.md](./world/platform.md) | 虚拟平台系统（YouTube/TikTok 模拟、Agent 发自拍） | 实现虚拟平台时 |
| [tick-scheduler.md](./world/tick-scheduler.md) | 主循环、tick 流程 | 实现世界主循环时 |
| [clock.md](./world/clock.md) | 时间系统、流速控制、离线加速 | 实现时间系统时 |
| [events.md](./world/events.md) | 事件类型、World Agent 事件、推送优先级 | 实现事件系统时 |
| [rules.md](./world/rules.md) | 规则引擎（Agent 思考的输入，不是替代） | 自定义世界规则时 |
| [economy.md](./world/economy.md) | 基础经济（Phase 1）→ 完整经济（Phase 5） | 实现经济系统时 |
| [factions.md](./world/factions.md) | 势力系统、战争/结盟/外交 | 实现势力系统时 |
| [presets.md](./world/presets.md) | 历史预设、社区贡献、YAML 结构 | 实现预设系统时 |
| [persistence.md](./world/persistence.md) | 实时持久化、快照存档、加载 | 实现存档系统时 |

### api/ — 接口

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [database.md](./api/database.md) | 所有 Drizzle ORM 表定义（含平台表） | 建表或查询时 |
| [rest.md](./api/rest.md) | REST API 端点（含初始化、平台、经济端点） | 实现接口时 |
| [websocket.md](./api/websocket.md) | WebSocket 消息协议（含平台、上帝模式协议） | 实现实时通信时 |

### llm/ — LLM 接入

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [providers.md](./llm/providers.md) | Provider 架构、统一接口、图片生成 | 接入 LLM 时 |
| [scheduler.md](./llm/scheduler.md) | 优先级队列、并发控制、超载丢弃 | 实现调度器时 |
| [cost-control.md](./llm/cost-control.md) | 模型分层、每日预算、降级策略 | 控制成本时 |
| [resilience.md](./llm/resilience.md) | 熔断器、重试、降级链 | 处理 LLM 错误时 |

### 其他

| 文件 | 内容 | 什么时候看 |
|------|------|-----------|
| [ROADMAP.md](./ROADMAP.md) | Phase 1-6 路线、实施步骤、测试策略 | 开始编码前 |
| [TECH-DECISIONS.md](./TECH-DECISIONS.md) | 技术调研和决策记录（D1-D9） | 想了解为什么这么设计时 |
| [AGENTS.md](../AGENTS.md) | Agent 指南（项目结构、编码规范） | AI 编码助手快速入门 |

---

## 文档使用建议

1. **新用户**：先看 README.md → AGENTS.md → architecture/overview.md
2. **开发者**：AGENTS.md → 具体模块文档（agent/, world/, api/）
3. **想了解技术选型**：TECH-DECISIONS.md
4. **开始编码前**：ROADMAP.md → 相关模块文档
