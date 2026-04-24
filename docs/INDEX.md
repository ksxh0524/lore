# Lore 技术文档

## 根目录

| 文件 | 内容 |
|------|------|
| [README.md](../README.md) | 项目介绍、快速开始 |
| [AGENTS.md](../AGENTS.md) | 开发指南（命令、架构、风格） |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 贡献指南 |

## architecture/

| 文件 | 内容 |
|------|------|
| [overview.md](./architecture/overview.md) | 项目概述、架构概览 |
| [tech-stack.md](./architecture/tech-stack.md) | 前后端技术栈 |
| [directory.md](./architecture/directory.md) | 目录结构 |
| [player-modes.md](./architecture/player-modes.md) | 世界类型、操控方式 |
| [deployment.md](./architecture/deployment.md) | 安装、配置 |

## agent/

| 文件 | 内容 |
|------|------|
| [runtime.md](./agent/runtime.md) | AgentRuntime 核心、tick/chat、状态机 |
| [manager.md](./agent/manager.md) | AgentManager 注册中心 |
| [init-agent.md](./agent/init-agent.md) | 世界初始化 Agent |
| [personality.md](./agent/personality.md) | AgentProfile、Stats |
| [behavior.md](./agent/behavior.md) | 行为引擎 |
| [memory.md](./agent/memory.md) | 三层记忆系统 |
| [tools.md](./agent/tools.md) | ToolRegistry |
| [social.md](./agent/social.md) | 社交引擎 |
| [relationships.md](./agent/relationships.md) | 关系系统 |
| [lifecycle.md](./agent/lifecycle.md) | 懒加载、生命周期 |
| [prompts.md](./agent/prompts.md) | Prompt 模板 |

## world/

| 文件 | 内容 |
|------|------|
| [initialization.md](./world/initialization.md) | 世界初始化 |
| [world-agent.md](./world/world-agent.md) | World Agent |
| [platform.md](./world/platform.md) | 虚拟平台 |
| [tick-scheduler.md](./world/tick-scheduler.md) | 主循环 |
| [clock.md](./world/clock.md) | 时间系统 |
| [events.md](./world/events.md) | 事件系统 |
| [economy.md](./world/economy.md) | 经济系统 |
| [persistence.md](./world/persistence.md) | 存档系统 |

## api/

| 文件 | 内容 |
|------|------|
| [database.md](./api/database.md) | Drizzle ORM 表定义 |
| [rest.md](./api/rest.md) | REST API |
| [websocket.md](./api/websocket.md) | WebSocket 协议 |

## llm/

| 文件 | 内容 |
|------|------|
| [providers.md](./llm/providers.md) | Provider 架构（OpenAI/Anthropic） |
| [scheduler.md](./llm/scheduler.md) | 优先级队列、并发控制 |
| [resilience.md](./llm/resilience.md) | 熔断器、重试 |

## 其他

| 文件 | 内容 |
|------|------|
| [ROADMAP.md](./ROADMAP.md) | Phase 1-6 路线 |
| [TECH-DECISIONS.md](./TECH-DECISIONS.md) | 技术决策记录 |