# Lore — 技术设计文档

> 最后更新：2026-04-08

## 1. 项目概述

**Lore** 是一个开源的 AI 人生模拟器。N 个 AI 角色在一个虚拟世界里自主运行，用户作为参与者进入这个世界，与角色互动、建立关系、影响事件走向。

### 核心理念

**不是聊天工具，是一个有自己运行规则的虚拟世界。**

- AI 角色不是等着你找她聊，她有自己的工作、社交、感情线
- 你不理她三天，她可能已经谈了个新男朋友
- 有人可能出车祸死了，有人可能升职加薪了
- 世界不围着你转，你是其中一员

### 与现有项目的区别

| 项目 | 模式 | 局限 |
|------|------|------|
| AI Town (a16z) | 25个角色在2D小镇走动聊天 | 只有空间模拟，没有人生线 |
| AgentLife | 3D 单人小屋 | 只能看一个人住屋里 |
| Unbounded (Google) | AI无限人生模拟 | 没开源 |
| SillyTavern | 角色扮演聊天 | 没有自主行为，没有世界 |
| **Lore** | **多Agent人生模拟 + 用户参与** | **没有（这就是机会）** |

---

## 2. 交互模式

### 参考：《中国式家长》式事件驱动

不做 2D 地图，不做角色在屏幕上走动。采用**事件驱动 + 状态面板 + 聊天**的交互模式。

```
┌─────────────────────────────────────────────────┐
│  Lore — 世界                                     │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│  左侧：      │  右侧：                           │
│  角色列表    │  主交互区                          │
│  + 状态概览  │                                  │
│              │  ┌──────────────────────────────┐ │
│  ┌────────┐  │  │  📋 事件卡片                  │ │
│  │ 小美    │  │  │                              │ │
│  │ 😊 开心  │  │  │  "小美在公司年会上遇到了前   │ │
│  │ 工作:OK  │  │  │   男友，两人聊了很久…"        │ │
│  └────────┘  │  │                              │ │
│  ┌────────┐  │  │  [上前搭话]  [默默旁观]        │ │
│  │ 阿杰    │  │  └──────────────────────────────┘ │
│  │ 😐 平静  │  │                                  │
│  │ 恋爱中   │  │  ┌──────────────────────────────┐ │
│  └────────┘  │  │  💬 聊天                       │ │
│  ┌────────┐  │  │                              │ │
│  │ 王姐    │  │  │  小美: "你今天怎么这么早？"    │ │
│  │ 😢 难过  │  │  │  你: __________________     │ │
│  │ 失业中   │  │  │              [发送]          │ │
│  └────────┘  │  └──────────────────────────────┘ │
│              │                                  │
│              │  ┌──────────────────────────────┐ │
│              │  │  📱 朋友圈 / 动态流             │ │
│              │  │                              │ │
│              │  │  小美 发了一张自拍              │ │
│              │  │  "今天的夕阳好美🌅"             │ │
│              │  │  ❤️ 12  💬 3                  │ │
│              │  └──────────────────────────────┘ │
├──────────────┴──────────────────────────────────┤
│  底部：时间线 / 事件日志                           │
│  Day 1: 小美入职微软  →  Day 5: 你和小美第一次聊天  │
└─────────────────────────────────────────────────┘
```

### 核心交互元素

**1. 事件卡片（核心）**
- 世界里发生的事件以卡片形式弹出
- 每张事件卡片包含：描述文字 + 可选配图 + 选择按钮（或仅通知）
- 事件类型：日常（上班/吃饭）、社交（聚会/吵架）、感情（表白/分手）、突发（事故/中奖）
- 用户可以选择介入或忽略
- 不介入 = 事件按 Agent 自主决策推进

**2. 角色状态面板**
- 每个 Agent 的核心属性：心情、健康、金钱、职业、感情状态
- 属性随事件变化
- 左侧列表显示所有 Agent 及其状态概览

**3. 聊天界面**
- 与任意 Agent 1v1 对话
- 流式输出，打字机效果
- 支持 Markdown
- 聊天内容会影响 Agent 对你的态度和关系值

**4. 社交动态流（朋友圈）**
- Agent 自主发布动态（文字 + AI 生成配图）
- 用户可以浏览、点赞、评论
- 类似微信朋友圈 / Instagram feed

**5. 时间线**
- 世界事件的时间轴
- 可回溯查看历史

---

## 3. 技术栈

### 前端（重）
| 层面 | 选型 | 说明 |
|------|------|------|
| 框架 | React 19 + TypeScript | 生态成熟，AI 辅助编程友好 |
| 构建 | Vite | 快，配置简单 |
| UI 组件 | shadcn/ui + Tailwind CSS | 事件卡片、状态面板等自定义组件 |
| 移动端 | PWA（Service Worker + Web Push） | 不做原生 APP |
| 状态管理 | zustand | 轻量，够用 |
| 路由 | React Router | 标配 |
| 动画 | framer-motion | 事件卡片弹出、页面过渡 |

### 后端（重 — 世界引擎）
| 层面 | 选型 | 说明 |
|------|------|------|
| 运行时 | Node.js | 前后端统一语言 |
| HTTP 框架 | Fastify | 性能好，插件体系强 |
| 世界引擎 | 自研 | 事件驱动，Agent 调度，时间流逝 |
| Agent Runtime | 自研 | 每个 Agent 独立运行，有行为逻辑 |
| 数据库 | SQLite + Drizzle ORM | 零配置，本地友好 |
| 向量存储 | SQLite vec0 | 长期记忆语义检索 |
| LLM 调用 | OpenAI SDK（兼容多厂商） | 统一接口 |
| 定时任务 | node-cron | Agent 心跳、事件触发 |
| 实时通信 | WebSocket | 事件推送、流式聊天 |
| 推送通知 | Web Push API | Agent 主动通知用户 |

### 工程化
| 层面 | 选型 |
|------|------|
| 包管理 | pnpm monorepo |
| 包分发 | npm publish（`npm install -g lore && lore`） |
| 运行环境 | Node.js ≥ 20，不用 Docker |
| 代码质量 | ESLint + Prettier + TypeScript strict |

---

## 4. 架构设计

### 4.1 世界引擎（World Engine）— 核心

这是整个系统的心脏。不是简单的聊天后端，而是一个持续运行的模拟引擎。

```
┌─────────────────────────────────────────────┐
│              World Engine                    │
│                                             │
│  ┌──────────┐   ┌───────────┐   ┌────────┐ │
│  │ 时间系统  │   │ 事件系统   │   │ Agent  │ │
│  │ (Clock)  │──▶│ (Event    │──▶│ Pool   │ │
│  │          │   │  Engine)  │   │        │ │
│  └──────────┘   └─────┬─────┘   └───┬────┘ │
│                       │             │       │
│                       ▼             ▼       │
│                  ┌─────────────────────┐     │
│                  │    记忆引擎          │     │
│                  │  (Memory Engine)    │     │
│                  │  + 向量检索 (vec0)   │     │
│                  └─────────────────────┘     │
│                       │                      │
│                       ▼                      │
│                  ┌─────────────────────┐     │
│                  │    LLM 引擎          │     │
│                  │  (OpenAI 兼容)       │     │
│                  └─────────────────────┘     │
└─────────────────────────────────────────────┘
```

### 4.2 时间系统

- 世界有自己的时间，独立于现实时间
- 可配置时间流速：1 现实秒 = N 世界分钟
- 用户不在线时，世界继续运行（后台事件积累）
- 用户上线时，追赶式推送积累的事件

### 4.3 事件系统

**事件驱动，不是轮询。**

```
规则引擎（不需要 LLM，省 token）：
  日常事件：起床 → 通勤 → 上班 → 吃饭 → 下班 → 回家
  概率事件：随机触发（10% 概率加班、5% 概率遇到熟人）
  定时事件：发薪日、生日、纪念日

LLM 驱动（关键决策点）：
  Agent 之间的社交互动（聊什么、怎么聊）
  感情决策（要不要接受表白）
  用户介入事件后的 Agent 反应
  自主发朋友圈 / 聊天内容生成

用户触发：
  用户发消息 → Agent 收到 → LLM 生成回复
  用户选择事件选项 → 触发后果 → 生成新事件
```

### 4.4 Agent 模型

每个 Agent 是一个独立实体：

```typescript
interface Agent {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  
  // 外在
  appearance: string;       // 外貌描述（用于生成头像）
  occupation: string;       // 职业
  workplace: string;        // 工作地点
  
  // 内在
  personality: string;      // 性格描述
  backstory: string;        // 背景故事（工作经历、恋爱史等）
  values: string[];         // 价值观
  
  // 状态（动态变化）
  stats: {
    mood: number;           // 心情 0-100
    health: number;         // 健康 0-100
    money: number;          // 金钱
    energy: number;         // 精力 0-100
  };
  
  // 关系
  relationships: {
    agentId: string;
    type: 'friend' | 'lover' | 'colleague' | 'family' | 'stranger';
    intimacy: number;       // 亲密度 0-100
  }[];
  
  // 行为配置
  behaviorConfig: {
    proactiveness: number;  // 主动性（多久主动找用户聊一次）
    socialFrequency: number;// 社交频率
    workEthic: number;      // 工作态度
  };
  
  // 状态
  status: 'idle' | 'active' | 'sleeping' | 'dead';
  alive: boolean;
}
```

### 4.5 长期记忆引擎

**Agent 的记忆 = 它的人生经历。**

| 层级 | 说明 | 加载方式 |
|------|------|----------|
| 工作记忆 | 当前对话上下文 | 始终加载 |
| 近期记忆 | 最近 7 天的事件摘要 | 每次交互加载 |
| 长期记忆 | 重要事件、人际关系、偏好 | 语义检索（向量 Top-K） |

**向量检索方案：**
- 事件和对话写入时生成 embedding → SQLite vec0
- 检索：当前场景 embedding 匹配记忆库 → 返回最相关的 K 条
- 省成本：只对"重要"记忆做 embedding，日常流水账不存

### 4.6 LLM 成本控制

100+ Agent 不能每个都持续调大模型。

```
分层策略：
├── 核心交互 Agent（用户正在聊的 1-3 个）→ 大模型（GPT-4o / Claude）
├── 活跃 Agent（最近有互动的 10-20 个）→ 中模型（GPT-4o-mini）
├── 背景 Agent（其他几十个）→ 规则引擎 + 小模型 / 不调 LLM
└── 事件汇总（每天）→ 一个大模型调用批量生成
```

### 4.7 外部平台通道（Channel Manager）

用户可以选择在第三方平台上接收通知和互动：

- Telegram Bot（最友好）
- 飞书 Bot
- Discord Bot

填入 Bot Token 即可接入，但完整体验在 Lore 自有界面。

---

## 5. Monorepo 结构

```
lore/
├── packages/
│   ├── server/              # 后端 + 世界引擎
│   │   ├── src/
│   │   │   ├── world/           # 世界引擎核心
│   │   │   │   ├── engine.ts       # 世界主循环
│   │   │   │   ├── clock.ts        # 时间系统
│   │   │   │   ├── events.ts       # 事件系统
│   │   │   │   └── scheduler.ts    # 事件调度器
│   │   │   ├── agent/           # Agent 系统
│   │   │   │   ├── pool.ts         # Agent 池管理
│   │   │   │   ├── runtime.ts      # 单个 Agent 运行时
│   │   │   │   ├── memory.ts       # 长期记忆引擎
│   │   │   │   ├── behavior.ts     # 行为逻辑（规则引擎）
│   │   │   │   └── personality.ts  # 人格系统
│   │   │   ├── llm/             # LLM 调用层
│   │   │   │   ├── provider.ts     # 统一接口
│   │   │   │   ├── openai.ts       # OpenAI 兼容
│   │   │   │   └── cost.ts         # 成本控制
│   │   │   ├── channels/        # 外部平台接入
│   │   │   ├── push/            # Web Push
│   │   │   ├── api/             # HTTP + WebSocket
│   │   │   └── db/              # 数据库层
│   │   └── package.json
│   │
│   ├── client/              # 前端 React PWA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── world/         # 世界视图
│   │   │   │   │   ├── EventCard.tsx     # 事件卡片
│   │   │   │   │   ├── AgentList.tsx     # 角色列表
│   │   │   │   │   ├── Timeline.tsx      # 时间线
│   │   │   │   │   └── Feed.tsx          # 动态流（朋友圈）
│   │   │   │   ├── chat/          # 聊天
│   │   │   │   │   ├── ChatPanel.tsx     # 聊天面板
│   │   │   │   │   └── MessageBubble.tsx # 消息气泡
│   │   │   │   └── agent/         # Agent 相关
│   │   │   │       ├── AgentProfile.tsx   # 角色详情
│   │   │   │       └── AgentStats.tsx     # 状态面板
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── services/       # WebSocket + API 调用
│   │   │   └── app.tsx
│   │   └── package.json
│   │
│   └── shared/              # 共享类型
│       ├── src/
│       │   ├── types.ts       # Agent, Event, Message 等类型
│       │   └── protocol.ts    # WebSocket 消息协议
│       └── package.json
│
├── docs/
│   └── tech-design.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── README.md
└── LICENSE
```

---

## 6. 部署与分发

### 安装

```bash
npm install -g lore
lore
```

首次运行自动初始化数据目录 `~/.lore/`，打开浏览器。

### 数据目录

```
~/.lore/
├── config.json      # 配置（API Key、模型、时间流速等）
├── lore.db          # SQLite 数据库
├── agents/          # Agent 定义文件
├── assets/          # 头像、背景等资源
└── logs/
```

### 手机访问

- 同一 WiFi：`http://电脑IP:3952`，PWA 加到桌面
- 外网：cloudflared / ngrok（文档指引）
- PWA 安装后支持 Web Push 推送通知

---

## 7. 开发原则

1. **世界引擎是灵魂**：事件系统、Agent 行为、时间流逝是核心差异化
2. **前端体验是门面**：事件卡片、动态流、聊天 UI 要好看好用
3. **省 token 是生死线**：规则引擎处理日常，LLM 只在决策点介入
4. **AI 辅助编程，不过度设计**：先跑通，再优化
5. **本地优先，隐私第一**：所有数据默认存本地
6. **渐进式开发**：先 1 个 Agent + 基础事件，再扩展

---

## 8. 开发路线

### Phase 1 — 能跑（单 Agent + 基础事件）
- Monorepo 脚手架
- 后端 Fastify + WebSocket
- 前端 React 基础布局（角色列表 + 事件卡片 + 聊天）
- 1 个 Agent，规则引擎驱动日常行为
- 简单事件系统（预设事件 + 随机触发）
- OpenAI 兼容 LLM 接入（聊天用）
- SQLite 存储基础数据

### Phase 2 — 能记（记忆 + 多 Agent）
- 长期记忆引擎（SQLite + vec0 向量检索）
- 记忆选择策略（每次交互加载哪些记忆）
- 多 Agent 支持（Agent Pool）
- Agent 之间的关系网络
- 角色创建/编辑 UI

### Phase 3 — 能活（自主行为 + 推送）
- 时间系统（世界时间流逝）
- Agent 自主决策（LLM 驱动的关键行为）
- Web Push 推送通知
- 动态流（朋友圈）
- 事件卡片图片生成（AI 生成配图）

### Phase 4 — 能看（外部通道 + 发布）
- 外部平台接入（Telegram / 飞书 / Discord）
- PWA 完整配置
- 多 LLM Provider（Claude、本地模型）
- npm 发布 + README + 文档

### Phase 5 — 能火（社区 + 高级功能）
- 角色市场（分享/下载 Agent 人设）
- 社交动态流完善（AI 生图配图）
- 高级事件（恋爱线、职业线、突发事件）
- LLM 成本优化（蒸馏小模型、批量处理）
- 社区建设（GitHub、Discord）

### Phase 6+ — 能成（开放世界）
- Agent 死亡 / 新 Agent 加入（开放世界生态）
- 用户自定义世界（校园 / 职场 / 城市）
- NPC 社交网络（Agent 之间形成社交圈）
- 事件链（一个事件引发连锁反应）
- 世界模板（一键生成不同场景的世界）

---

## 9. 参考项目

- [AI Town](https://github.com/a16z-infra/ai-town) — 2D 小镇多 Agent 模拟（a16z, 9.6k stars）
- [AgentLife](https://github.com/HarderThenHarder/AgentLife) — 3D Agent 小屋模拟器
- [Unbounded](https://generative-infinite-game.github.io/) — Google AI 无限人生模拟（未开源）
- [中国式家长](https://store.steampowered.com/app/836840/) — 事件驱动人生模拟游戏（交互参考）
- [SillyTavern](https://github.com/SillyTavern/SillyTavern) — AI 角色扮演聊天前端（UI 参考）
- [人生重开模拟器](https://github.com/VickScarlet/lifeRestart) — 纯文字人生模拟
