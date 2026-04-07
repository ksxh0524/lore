# AgentRuntime — 单个 Agent 运行时

> 最后更新：2026-04-08 | 版本 v0.02

---

AgentRuntime 是单个 Agent 的运行时实例，是一个内存中的 TypeScript 对象。每个 Agent（NPC、系统角色、用户化身）都有独立的 AgentRuntime 实例。

## 核心接口

```typescript
// packages/server/src/agent/agent-runtime.ts

export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType;

  profile: AgentProfile;
  state: AgentState;
  stats: AgentStats;
  memory: MemoryManager;
  relationships: Map<string, Relationship>;

  constructor(id: string, worldId: string, type: AgentType, profile: AgentProfile, db: Repository) {
    this.id = id;
    this.worldId = worldId;
    this.type = type;
    this.profile = profile;
    this.state = {
      status: 'idle',
      currentActivity: '',
      currentLocation: '',
      lastActiveTick: 0,
    };
    this.stats = { mood: 70, health: 100, energy: 100, money: 1000 };
    this.memory = new MemoryManager(id, db);
    this.relationships = new Map();
  }
}
```

## 关键方法

### tick()

每个世界 tick 调用一次。**所有 Agent 都由 LLM 驱动思考**，只是频率不同。

```typescript
async tick(worldState: WorldState, llmScheduler: LLMScheduler): Promise<void> {
  // 1. 更新基础状态（时间推进自动消耗精力等）
  this.updateStats(worldState);

  // 2. 判断本 tick 是否需要思考（根据频率分级）
  if (!this.shouldThink(worldState)) return;

  // 3. 构建 prompt -> 通过 LLMScheduler 调 LLM -> 解析结果
  const prompt = buildDecisionPrompt(this, worldState);
  const result = await llmScheduler.submit({
    agentId: this.id,
    callType: 'decision',
    model: this.getRequiredModel(),
    messages: prompt,
    tools: this.getAvailableTools(),
  });

  // 4. 处理结果：更新状态、执行动作、存储记忆
  this.processDecision(result);
  await this.memory.add(result.content, 'decision', 0.7);
}
```

### chat()

用户与 Agent 对话，流式返回。Agent 可以根据心情拒绝、冷淡回复、主动撩用户。

```typescript
async *chat(userMessage: string, llmScheduler: LLMScheduler): AsyncIterable<string> {
  const context = this.memory.getContext(2000);
  const messages = buildChatPrompt(this, userMessage, context);

  const stream = await llmScheduler.submitStream({
    agentId: this.id,
    callType: 'user-chat',
    model: this.getRequiredModel(),
    messages,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    fullResponse += chunk;
    yield chunk;
  }

  await this.memory.add(`User: ${userMessage}`, 'chat', 0.5);
  await this.memory.add(`Me: ${fullResponse}`, 'chat', 0.5);
}
```

### 序列化

```typescript
serialize(): SerializedAgent {
  return {
    id: this.id,
    worldId: this.worldId,
    type: this.type,
    profile: this.profile,
    state: this.state,
    stats: this.stats,
    relationships: Array.from(this.relationships.entries()),
  };
}

static deserialize(data: SerializedAgent): AgentRuntime {
  const agent = new AgentRuntime(data.id, data.worldId, data.type, data.profile);
  agent.state = data.state;
  agent.stats = data.stats;
  agent.relationships = new Map(data.relationships);
  return agent;
}
```

## Agent 类型

| 类型 | 说明 | 来源 |
|------|------|------|
| `npc` | 普通 NPC | 世界初始化 / 懒加载创建 |
| `system` | 系统角色（旁白等） | 系统创建 |
| `user-avatar` | 用户在世界中的化身 | 用户创建 |
| `world` | 世界管理 Agent（天灾等） | 系统创建 |
| `init` | 初始化 Agent（仅创建世界时使用） | 系统创建 |

## 思考频率分级

思考频率判断逻辑在 `BehaviorEngine` 中实现（见 [行为引擎](./behavior.md)）。AgentRuntime 提供 `getThoughtFrequencyLevel()` 方法供 BehaviorEngine 调用：

```typescript
type ThoughtFrequency = 'high' | 'medium' | 'low' | 'minimal';

getThoughtFrequencyLevel(): ThoughtFrequency {
  if (this.isUserInteracting()) return 'high';
  if (this.isCloseToUser()) return 'high';
  if (this.isKnownToUser()) return 'medium';
  if (this.isInUserNetwork()) return 'low';
  return 'minimal';
}
```

## 模型选择

```typescript
getRequiredModel(): string {
  if (this.isUserInteracting()) {
    return config.llm.defaults.premiumModel;
  }
  if (this.isCloseToUser()) {
    return config.llm.defaults.premiumModel;
  }
  if (this.isKnownToUser()) {
    return config.llm.defaults.standardModel;
  }
  return config.llm.defaults.cheapModel;
}
```

## 行为不受限制

Agent 的行为方向完全由 LLM 决定。系统提供工具和上下文，不限制 Agent 的选择：

- Agent 可以辞职、创业、搬家
- Agent 可以主动撩用户、发自拍到平台
- Agent 可以拒绝用户、消失
- Agent 可以炒股、投资、开发软件
- 远处 Agent 也可能有精彩人生（送外卖的也可能创业成功）

低频思考不代表没有人生。每个 Agent 都有完整的思考和记忆。

---

> 相关文档：[AgentManager](./manager.md) | [人格系统](./personality.md) | [行为引擎](./behavior.md) | [记忆系统](./memory.md) | [生命周期](./lifecycle.md)
