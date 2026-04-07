# 目录结构

> 最后更新：2026-04-08 | 版本 v0.02
> 以下为 Lore 项目唯一的统一目录结构。如与其他文档冲突，以本文档为准。

---

## packages/server/src/

```
packages/server/src/
+-- index.ts                    # 入口：启动 Fastify
+-- agent/                      # Agent 系统
|   +-- agent-manager.ts        # AgentManager -- 全局注册/生命周期/请求队列
|   +-- agent-runtime.ts        # AgentRuntime -- 单个 Agent 运行时
|   +-- init-agent.ts           # InitAgent -- 世界初始化 Agent（仅首次创建时运行）
|   +-- memory.ts               # MemoryManager -- 三层记忆
|   +-- personality.ts          # Personality -- 人格定义
|   +-- behavior.ts             # BehaviorEngine -- LLM 驱动的行为引擎
|   +-- social.ts               # SocialEngine -- 社交行为
|   +-- relationships.ts        # RelationshipManager -- 关系管理
|   +-- tools.ts                # ToolRegistry -- Agent 工具/技能
|   +-- avatar.ts               # UserAvatar -- 用户化身
|   +-- types.ts                # Agent 相关类型
+-- scheduler/                  # 调度系统
|   +-- tick-scheduler.ts       # TickScheduler -- 主循环（setInterval）
|   +-- llm-scheduler.ts        # LLMScheduler -- 请求队列/并发/优先级/超载丢弃
|   +-- event-bus.ts            # EventBus -- Agent 间通信
|   +-- push-manager.ts         # PushManager -- 推送事件到前端
+-- llm/                        # LLM 调用层
|   +-- llm-provider.ts         # LLMProvider -- 统一接口
|   +-- openai-compatible.ts    # OpenAI 兼容（DeepSeek/Kimi/千问等）
|   +-- anthropic.ts            # Claude
|   +-- google.ts               # Gemini
|   +-- image-provider.ts       # 图片生成（DALL-E / Stable Diffusion）
|   +-- factory.ts              # ProviderFactory
|   +-- prompts.ts              # Prompt 模板
|   +-- types.ts
+-- multimodal/                 # 多模态（插件化）
|   +-- plugin-registry.ts      # MultimodalRegistry
|   +-- tts-plugin.ts           # TTS 插件接口
|   +-- image-plugin.ts         # 图片生成/识别
|   +-- video-plugin.ts         # 视频识别
|   +-- music-plugin.ts         # 音乐生成
|   +-- types.ts
+-- world/                      # 世界引擎
|   +-- clock.ts                # WorldClock -- 时间系统
|   +-- events.ts               # EventEngine -- 事件生成
|   +-- world-agent.ts          # WorldAgent -- 世界管理 Agent（天灾/宏观事件）
|   +-- initialization.ts       # 世界初始化系统（随机/历史模式）
|   +-- platform.ts             # PlatformEngine -- 虚拟平台系统
|   +-- economy-engine.ts       # EconomyEngine -- 经济模拟
|   +-- rule-engine.ts          # RuleEngine -- 可配置规则
|   +-- faction-engine.ts       # FactionEngine -- 势力交互
|   +-- event-chain-engine.ts   # EventChainEngine -- 事件链状态机
|   +-- persistence.ts          # WorldPersistence -- 自动持久化
|   +-- types.ts
+-- preset/                     # 世界预设系统
|   +-- loader.ts               # PresetLoader -- 从目录加载 YAML
|   +-- validator.ts            # PresetValidator -- 校验
|   +-- registry.ts             # PresetRegistry -- 仓库管理
|   +-- schema.ts               # Zod schemas for YAML
|   +-- types.ts
+-- modes/                      # 玩家模式
|   +-- mode-manager.ts         # ModeManager -- 模式切换
|   +-- character-mode.ts       # CharacterMode -- 角色模式
|   +-- god-mode.ts             # GodMode -- 上帝模式（观察为主）
|   +-- types.ts
+-- api/                        # HTTP + WebSocket
|   +-- routes.ts               # REST API
|   +-- ws.ts                   # WebSocket
|   +-- protocol.ts             # 消息协议
+-- db/                         # 数据库
|   +-- schema.ts               # Drizzle schema
|   +-- repository.ts           # 数据访问层
|   +-- vector.ts               # vec0 向量操作
+-- monitor/                    # 监控
|   +-- agent-monitor.ts        # AgentMonitor
|   +-- resource-tracker.ts     # ResourceTracker
|   +-- types.ts
+-- config/
    +-- loader.ts               # 配置加载（Zod 校验）
```

## packages/client/src/

```
packages/client/src/
+-- main.tsx
+-- app.tsx
+-- components/
|   +-- layout/
|   |   +-- AppLayout.tsx
|   |   +-- Sidebar.tsx
|   +-- init/                    # 世界初始化
|   |   +-- InitPage.tsx         # 初始化页面（选择模式、设定参数）
|   |   +-- ModeSelector.tsx     # 模式选择（历史/随机）
|   |   +-- RandomConfig.tsx     # 随机模式参数设置
|   |   +-- HistorySelector.tsx  # 历史模式预设选择
|   +-- world/
|   |   +-- EventCard.tsx
|   |   +-- AgentList.tsx
|   |   +-- Timeline.tsx
|   |   +-- WorldClock.tsx
|   +-- chat/
|   |   +-- ChatPanel.tsx
|   |   +-- MessageBubble.tsx
|   |   +-- ChatInput.tsx         # 含图片上传
|   +-- agent/
|   |   +-- AgentProfile.tsx
|   |   +-- AgentStats.tsx
|   +-- platform/                 # 虚拟平台
|   |   +-- PlatformFeed.tsx
|   |   +-- PostCard.tsx
|   |   +-- CreatePost.tsx
|   |   +-- ContentStats.tsx     # 用户查看内容数据
|   +-- social/
|   |   +-- SocialFeed.tsx
|   |   +-- PostCard.tsx
|   +-- god/
|   |   +-- GodPanel.tsx
|   |   +-- AgentInspector.tsx
|   +-- monitor/
|   |   +-- MonitorPanel.tsx
|   |   +-- TokenStats.tsx
|   +-- preset/
|   |   +-- PresetBrowser.tsx
|   +-- settings/
|       +-- ProviderConfig.tsx
|       +-- PlayerModeToggle.tsx
+-- pages/
|   +-- WorldPage.tsx
|   +-- ChatPage.tsx
|   +-- SettingsPage.tsx
+-- hooks/
|   +-- useWebSocket.ts
|   +-- useAgent.ts
+-- stores/
|   +-- worldStore.ts
|   +-- agentStore.ts
|   +-- chatStore.ts
+-- services/
|   +-- ws.ts
|   +-- api.ts
+-- lib/
    +-- utils.ts
```

## packages/shared/src/

```
packages/shared/src/
+-- index.ts
+-- types/
|   +-- agent.ts                # AgentProfile, AgentState, AgentStats, Relationship
|   +-- event.ts                # WorldEvent, EventConsequence
|   +-- memory.ts               # MemoryEntry, LongTermMemoryEntry
|   +-- social.ts               # SocialPost, PostComment, FriendRequest
|   +-- platform.ts             # VirtualPlatform, PlatformPost, PlatformComment
|   +-- message.ts              # Message, ClientMessage, ServerMessage
|   +-- provider.ts             # ProviderConfig, LLMProvider
|   +-- faction.ts              # Faction, FactionRelation
|   +-- mode.ts                 # WorldType, ControlMode
|   +-- initialization.ts       # InitRequest, InitResult, RandomInitParams, HistoryInitParams
+-- protocol.ts                 # WebSocket 消息协议
```

---

> 相关文档：[项目概述](./overview.md) | [技术栈](./tech-stack.md) | [部署](./deployment.md)
