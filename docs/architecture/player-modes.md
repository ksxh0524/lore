# 玩家模式

> 最后更新：2026-04-08 | 版本 v0.02

---

Lore 的体验由**两个维度**组成：世界类型（创建世界时选定）和操控方式（进入世界后可切换）。

## 维度一：世界类型（创建时选定）

### 历史模式

基于真实历史时间点创建世界。

- 用户选择一个历史时期 + 魂穿成某个历史人物
- 例："我要穿越到 2020 年当乔布斯"、"我要当康熙的八阿哥"
- 初始参数基于真实历史，用户进入后历史分叉
- 需要社区贡献历史预设包（人物、事件、社会背景）
- 详见 [初始化系统](../world/initialization.md)

### 随机模式

完全随机生成一个世界。

- 用户设定基础参数：年龄、地点、大致背景
- 其他的（父母、家庭、人际关系）系统自动生成
- 地点可以是现实的（中国、美国），也可以是虚构的（2080 年的火星）
- 没有魂穿概念

## 维度二：操控方式（可随时切换）

### 角色模式（默认）

用户以自己的角色身份存在于世界中，和其他 Agent 平等。

**能做的事**：
- 与 Agent 聊天（文字、图片、视频）
- 在虚拟平台发内容、浏览
- 选择事件选项
- 创业、找工作、投资
- 谈恋爱、交友、社交

**限制**：
- 只能看到与自己相关的事件和公开事件
- 左侧角色列表只显示认识的 Agent
- Agent 状态面板只显示外在可观察信息（心情用表情而非数值）
- 可能会失败，可能被拒绝

### 上帝模式

用户脱离角色，以观察者视角看世界。**核心能力是观察**。

**观察能力**：
- 看到所有 Agent 的完整内部状态（心情/健康/金钱/精力数值、关系网络、记忆列表）
- 看到所有 Agent 的思考过程和每一步决策
- 看到所有 Agent 之间的对话记录
- 查看 LLM 的 prompt 和 response
- 回溯完整的时间线和事件日志

**事件影响能力**：
- 可以触发世界级事件（地震、飓风、小行星等）
- 可以通过发事件的方式间接影响世界
- **不能**直接修改 Agent 的数值或强制控制行为
- 不能让 Agent 做违反其性格的事
- 干预是间接的、有节制的

## TypeScript 类型定义

```typescript
// packages/server/src/modes/types.ts

export type WorldType = 'history' | 'random';
export type ControlMode = 'character' | 'god';
export type PlayerMode = ControlMode;

export interface ModeSwitchEvent {
  type: 'mode_switch';
  from: ControlMode;
  to: ControlMode;
  worldId: string;
  timestamp: number;
}

export interface IPlayerMode {
  readonly mode: ControlMode;

  filterEvents(events: WorldEvent[], userId: string): WorldEvent[];
  filterAgents(agentIds: string[], knownAgentIds: string[]): string[];
  transformAgentState(agent: any): any;
  isActionAllowed(action: string, targetAgentId: string): boolean;

  onEnter(worldId: string): Promise<void>;
  onExit(worldId: string): Promise<void>;
}

export interface IModeManager {
  currentMode: ControlMode;
  worldType: WorldType;
  getHandler(): IPlayerMode;
  switchMode(newMode: ControlMode): Promise<ModeSwitchEvent>;
  isGodMode(): boolean;
  onModeChange(callback: (event: ModeSwitchEvent) => void): void;
}
```

## 上帝模式 WebSocket 协议

```typescript
// ===== 客户端 --> 服务端 =====

interface GodTriggerEvent {
  type: 'god_trigger_event';
  event: {
    category: 'natural_disaster' | 'epidemic' | 'economic' | 'social' | 'other';
    description: string;
    location?: string;
    severity: number;  // 1-10
    affectedArea?: string;
  };
}

interface GodObserveAgent {
  type: 'god_observe_agent';
  agentId: string;
  includeMemory?: boolean;
  includeThoughts?: boolean;
}

// ===== 服务端 --> 客户端 =====

interface GodEventResult {
  type: 'god_event_result';
  event: WorldEvent;
  agentReactions: Array<{
    agentId: string;
    thoughtProcess: string;
    decision: string;
    tokensUsed: number;
  }>;
}

interface GodAgentObservation {
  type: 'god_agent_observation';
  agentId: string;
  fullState: AgentStats;
  thoughts: Array<{ tick: number; thought: string; decision: string }>;
  memories: { working: string[]; recent: string[]; longTerm: string[] };
  relationships: Array<{ targetId: string; type: string; intimacy: number }>;
}
```

## 实现要点

**CharacterMode**：
- `filterEvents()`：只保留涉及用户的事件 + priority >= 80 的公开事件
- `filterAgents()`：只返回关系不为 `stranger` 的 Agent
- `transformAgentState()`：将 `stats.mood: 75` 转为 `{ emoji: '😊', label: '开心' }`
- `isActionAllowed()`：检查操作是否属于用户角色权限

**GodMode**：
- 所有 filter 方法直接返回原数据，不做任何过滤
- `isActionAllowed()`：观察类操作始终允许，事件触发类操作做基本校验
- 事件触发后由 Agent 自主反应，上帝不能控制 Agent 的反应方式

**ModeManager**：
- 切换时行为：
  - 角色 -> 上帝：即时生效，解锁观察能力
  - 上帝 -> 角色：即时生效，隐藏上帝专属 UI。**已发生的事件不回滚**
- 世界类型（历史/随机）在创建时确定，运行期间不可切换

---

> 相关文档：[项目概述](./overview.md) | [WebSocket 协议](../api/websocket.md) | [初始化系统](../world/initialization.md) | [技术决策](../TECH-DECISIONS.md)
