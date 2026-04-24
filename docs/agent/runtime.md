# AgentRuntime — 单个 Agent 运行时

AgentRuntime 是单个 Agent 的内存运行时实例。

## 核心属性

```typescript
export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType; // 'npc' | 'system' | 'user-avatar' | 'world' | 'init'

  profile: AgentProfile;     // 人格配置
  stateMachine: AgentStateMachine;  // 状态机（idle/sleeping/working等）
  statsManager: StatsManager;        // 属性管理（mood/health/energy/money）
  memory: MemoryManager;             // 三层记忆
  relationships: Map<string, Relationship>;
  tools: ToolRegistry;               // 工具注册

  // 内部状态
  lastThinkTick: number;
  consecutiveFailures: number;
}
```

## 构造函数

```typescript
constructor(
  id: string,
  worldId: string,
  type: AgentType,
  profile: AgentProfile,
  repo: Repository,
  llmScheduler: LLMScheduler,
  config: LoreConfig,
  initialStats?: AgentStats,
)
```

## tick() 主流程

每个世界 tick 调用一次。所有 Agent 由 LLM 驱动思考，频率不同。

```
tick() 流程:
1. 更新基础状态（时间推进消耗精力）
2. 判断本 tick 是否需要思考（思考频率分级）
3. 构建 prompt → LLM Scheduler → 解析结果
4. 执行决策（toolCalls 或状态变更）
5. 存储记忆
```

思考频率分级：
- `high`: 每 tick 思考，用 premium 模型（用户正在交互）
- `medium`: 每 2-3 tick，用 standard 模型
- `low`: 每 5-10 tick，用 cheap 模型
- `minimal`: 仅被动响应

## chat() 流式对话

```typescript
async *chat(userMessage: string): AsyncIterable<string> {
  const context = this.memory.getContext(2000);
  const messages = buildChatPrompt(this, userMessage, context);
  return this.llmScheduler.submitStream({ messages, model: 'premium' });
}
```

Agent 可根据心情拒绝、冷淡回复、主动撩用户。

## 状态机

状态流转：`idle → sleeping → working → idle`

```typescript
// packages/server/src/agent/state-machine.ts

class AgentStateMachine {
  state: AgentState; // 'idle' | 'sleeping' | 'working' | 'dead'
  history: StateHistory[];
  
  transition(to: AgentState, reason: string): void;
  on(event: 'stateChange', handler: Function): void;
}
```

## 持久化

```typescript
serialize(): SerializedAgent;
static deserialize(data: SerializedAgent, repo, llmScheduler, config): AgentRuntime;
```