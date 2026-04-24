# 目录结构

> 最后更新：2026-04-23 | 版本 v0.02
> 以下为 Lore 项目唯一的统一目录结构。如与其他文档冲突，以本文档为准。

---

## packages/server/src/

```
packages/server/src/
├── index.ts                    # 入口：启动 Fastify
├── agent/                      # Agent 系统
│   ├── agent-manager.ts        # AgentManager -- 全局注册/生命周期/请求队列
│   ├── agent-runtime.ts        # AgentRuntime -- 单个 Agent 运行时
│   ├── init-agent.ts           # InitAgent -- 世界初始化 Agent（仅首次创建时运行）
│   ├── memory.ts               # MemoryManager -- 三层记忆
│   ├── relationships.ts        # RelationshipManager -- 关系管理
│   ├── social.ts               # SocialEngine -- 社交行为
│   ├── tools.ts                # ToolRegistry -- Agent 工具/技能
│   ├── default-tools.ts        # 默认工具实现
│   ├── state-machine.ts        # Agent 状态机
│   ├── event-bus.ts            # Agent 事件总线
│   ├── stats-manager.ts        # Agent 状态管理
│   └── index.ts                # Agent 模块导出
├── scheduler/                  # 调度系统
│   ├── tick-scheduler.ts       # TickScheduler -- 世界主循环（setInterval）
│   ├── push-manager.ts         # PushManager -- 推送事件到前端
│   └── event-bus.ts            # 调度器事件总线
├── llm/                        # LLM 调用层
│   ├── scheduler.ts            # LLMScheduler -- 请求队列/并发/优先级/超载丢弃
│   ├── openai-provider.ts      # OpenAI 兼容层（DeepSeek/Kimi/千问等）
│   ├── anthropic-provider.ts   # Claude 支持
│   ├── mock-provider.ts        # Mock Provider（测试用）
│   ├── factory.ts              # ProviderFactory -- Provider 工厂
│   ├── prompts.ts              # Prompt 模板
│   ├── presets.ts              # Provider 预设配置
│   ├── circuit-breaker.ts      # 熔断器
│   ├── resilience.ts           # 韧性处理
│   └── types.ts                # LLM 相关类型
├── world/                      # 世界引擎
│   ├── clock.ts                # WorldClock -- 时间系统
│   ├── event-engine.ts         # EventEngine -- 事件生成
│   ├── event-chain-engine.ts   # EventChainEngine -- 事件链状态机
│   ├── world-agent.ts          # WorldAgent -- 世界管理 Agent（天灾/宏观事件）
│   ├── platform-engine.ts      # PlatformEngine -- 虚拟平台系统
│   ├── economy-engine.ts       # EconomyEngine -- 经济模拟
│   ├── faction-system.ts       # FactionEngine -- 势力交互
│   ├── persistence.ts          # WorldPersistence -- 自动持久化
│   └── initialization.ts       # 世界初始化系统（随机/历史模式）
├── api/                        # HTTP + WebSocket
│   ├── routes.ts               # REST API 路由
│   ├── provider-routes.ts      # Provider 配置 API
│   └── ws.ts                   # WebSocket 处理
├── db/                         # 数据库
│   ├── index.ts                # 数据库连接初始化
│   ├── schema.ts               # Drizzle schema
│   ├── repository.ts           # 数据访问层
│   └── vector.ts               # vec0 向量操作
├── monitor/                    # 监控
│   ├── index.ts                # Monitor 实现
│   └── types.ts                # Monitor 类型定义
├── modes/                      # 玩家模式
│   └── mode-manager.ts         # ModeManager -- 模式切换
├── config/                     # 配置
│   ├── index.ts                # 配置管理
│   └── loader.ts               # 配置加载（Zod 校验）
├── utils/                      # 工具
│   └── encryption.ts           # 加密工具（API Key 加密存储）
└── errors.ts                   # 错误类型定义
```

---

## packages/client/src/

```
packages/client/src/
├── main.tsx                    # 入口
├── App.tsx                     # 应用根组件
├── pages/                      # 页面组件
│   ├── InitPage.tsx            # 世界初始化页面
│   ├── HomePage.tsx            # 主页
│   ├── WorldPage.tsx           # 世界主页面
│   └── SettingsPage.tsx        # 设置页面
├── components/                 # 组件目录
│   ├── layout/                 # 布局组件
│   │   ├── Sidebar.tsx         # 侧边栏
│   │   ├── Header.tsx          # 顶部导航
│   │   └── BottomNav.tsx       # 底部导航（移动端）
│   ├── agent/                  # Agent 相关组件
│   │   ├── AgentList.tsx       # Agent 列表
│   │   ├── EconomyPanel.tsx    # 经济面板
│   │   └── RelationshipPanel.tsx # 关系面板
│   ├── chat/                   # 聊天组件
│   │   ├── ChatPanel.tsx       # 聊天面板
│   │   └── ChatInput.tsx       # 聊天输入框
│   ├── world/                  # 世界相关组件
│   │   ├── EventCard.tsx       # 事件卡片
│   │   ├── Timeline.tsx        # 时间线
│   │   ├── WorldClock.tsx      # 世界时钟
│   │   └── SaveManager.tsx     # 存档管理
│   ├── events/                 # 事件相关组件
│   │   ├── EventCard.tsx       # 事件卡片
│   │   ├── EventList.tsx       # 事件列表
│   │   └── EventCardList.tsx   # 事件卡片列表
│   ├── platform/               # 虚拟平台组件
│   │   └── PlatformFeed.tsx    # 平台动态流
│   ├── phone/                  # 手机设备组件
│   │   ├── PhoneHome.tsx       # 手机主屏幕
│   │   ├── apps/               # 手机应用
│   │   │   ├── ChatApp.tsx     # 聊天应用
│   │   │   ├── ContactsApp.tsx # 联系人应用
│   │   │   └── SocialApp.tsx   # 社交应用
│   │   └── system/             # 手机系统组件
│   │       └── IOSComponents.tsx # iOS 风格组件
│   ├── device/                 # 设备组件
│   │   ├── DeviceSelector.tsx  # 设备选择器
│   │   ├── computer/           # 电脑设备
│   │   │   ├── MacDesktop.tsx  # Mac 桌面
│   │   │   └── MacShell.tsx    # Mac 外壳
│   │   └── phone/              # 手机设备
│   │       └── PhoneShell.tsx  # 手机外壳
│   ├── earth/                  # 地球/地图组件
│   │   ├── Globe.tsx           # 3D 地球
│   │   └── index.ts            # 导出
│   ├── god/                    # 上帝模式组件
│   │   └── GodObservationPanel.tsx # 上帝观察面板
│   ├── monitor/                # 监控组件
│   │   └── MonitorPanel.tsx    # 监控面板
│   ├── settings/               # 设置组件
│   │   ├── AIProvidersPanel.tsx # AI Provider 面板
│   │   ├── ProviderCard.tsx    # Provider 卡片
│   │   ├── ProviderEditModal.tsx # Provider 编辑弹窗
│   │   └── ProviderPresetSelector.tsx # Provider 预设选择器
│   └── common/                 # 通用组件
│       ├── Avatar.tsx          # 头像组件
│       ├── Button.tsx          # 按钮组件
│       └── Card.tsx            # 卡片组件
├── stores/                     # 状态管理（zustand）
│   ├── worldStore.ts           # 世界状态
│   └── settingsStore.ts        # 设置状态
├── services/                   # 服务层
│   ├── api.ts                  # API 调用
│   └── websocket.ts            # WebSocket 服务
├── hooks/                      # 自定义 Hooks
│   └── useMobile.ts            # 移动端检测
├── lib/                        # 工具库
│   ├── types.ts                # 类型定义
│   └── ios26-tokens.ts         # iOS 26 设计令牌
└── styles/                     # 样式文件
    ├── global.css              # 全局样式
    └── variables.css           # CSS 变量
```

---

## packages/shared/src/

```
packages/shared/src/
├── index.ts                    # 模块导出
└── types/                      # 类型定义目录
    ├── agent.ts                # Agent 相关类型
    ├── event.ts                # 事件相关类型
    ├── initialization.ts       # 初始化相关类型
    ├── memory.ts               # 记忆相关类型
    ├── mode.ts                 # 模式相关类型
    ├── platform.ts             # 平台相关类型
    ├── provider.ts             # Provider 相关类型
    └── relationship.ts         # 关系相关类型
```

---

## packages/server/tests/

```
packages/server/tests/
├── unit/                       # 单元测试
│   ├── agent-runtime.test.ts   # AgentRuntime 测试
│   ├── agent-stat-changes.test.ts # Agent 状态变化测试
│   ├── circuit-breaker.test.ts # 熔断器测试
│   ├── clock.test.ts           # 时钟测试
│   ├── errors.test.ts          # 错误处理测试
│   ├── event-chain-engine.test.ts # 事件链引擎测试
│   ├── event-engine.test.ts    # 事件引擎测试
│   ├── faction-system.test.ts  # 势力系统测试
│   ├── memory.test.ts          # 记忆系统测试
│   ├── relationship-manager.test.ts # 关系管理测试
│   ├── tick-scheduler.test.ts  # Tick 调度器测试
│   └── tools.test.ts           # 工具测试
└── integration/                # 集成测试
    └── api.test.ts             # API 集成测试
```

---

> 相关文档：[项目概述](./overview.md) | [技术栈](./tech-stack.md) | [部署](./deployment.md) | [Agent 指南](../../AGENTS.md)
