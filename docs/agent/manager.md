# AgentManager — Agent 注册中心

> 最后更新：2026-04-08 | 版本 v0.02

---

AgentManager 是全局 Agent 注册中心，管理所有 AgentRuntime 实例的生命周期、请求队列和持久化。

## 接口定义

```typescript
// packages/server/src/agent/agent-manager.ts

export class AgentManager {
  private agents: Map<string, AgentRuntime> = new Map();
  private db: Repository;

  constructor(db: Repository) {
    this.db = db;
  }

  async createAgent(worldId: string, type: AgentType, profile: AgentProfile): Promise<AgentRuntime> {
    const id = generateId();
    const agent = new AgentRuntime(id, worldId, type, profile);
    this.agents.set(id, agent);
    await this.db.insertAgent(agent.serialize());
    return agent;
  }

  get(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  getAll(worldId: string): AgentRuntime[] {
    return Array.from(this.agents.values()).filter(a => a.worldId === worldId);
  }

  async destroy(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      agent.state.status = 'dead';
      await this.db.updateAgent(id, { status: 'dead', diedAt: new Date() });
      this.agents.delete(id);
    }
  }

  async persist(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      await this.db.updateAgent(id, agent.serialize());
    }
  }

  async restore(id: string): Promise<AgentRuntime> {
    const data = await this.db.getAgent(id);
    if (!data) throw new Error(`Agent ${id} not found`);
    const agent = AgentRuntime.deserialize(data);
    this.agents.set(id, agent);
    return agent;
  }

  async tickAll(worldState: WorldState, llmProvider: ILLMProvider): Promise<void> {
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.state.status !== 'dead');

    for (const agent of activeAgents) {
      try {
        await agent.tick(worldState, llmProvider);
      } catch (err) {
        logger.error({ err, agentId: agent.id }, 'Agent tick failed');
      }
    }
  }

  async persistAll(): Promise<void> {
    const promises = Array.from(this.agents.values()).map(a => this.persist(a.id));
    await Promise.all(promises);
  }
}
```

## Agent 数量管理

| 场景 | 说明 |
|------|------|
| 世界初始化 | 创建用户身边 5-15 个核心 Agent |
| 日常运行 | 懒加载创建新 Agent，数量持续增长 |
| 用户探索 | 用户的生活圈扩大 → 创建更多 Agent |
| 远期目标 | 可能达到上千甚至上万个 Agent |

**没有固定的数量上限**。Agent 数量由用户的探索范围和世界自然发展决定。

## 错误隔离

tickAll() 对每个 Agent 单独 try-catch：

```
Agent A tick 成功 -> 继续
Agent B tick 失败 -> 记录错误 -> 继续（不影响 A 和 C）
Agent C tick 成功 -> 继续
```

单个 Agent 出错不影响其他 Agent 和世界运行。

## 请求队列管理

所有 Agent 的 LLM 请求通过 LLMScheduler 统一排队：

```
每个 tick:
  1. 收集所有需要思考的 Agent
  2. 按思考频率和优先级排序
  3. 提交到 LLMScheduler
  4. 超出并发上限的请求自动排队
  5. 超载时低优先级请求延后到下个 tick 或丢弃
```

### 优先级规则

```
用户正在交互的 Agent     --> 最高优先级（P0）
用户身边核心 Agent        --> 高优先级（P1）
用户认识的 Agent          --> 中优先级（P2）
远处关联 Agent            --> 低优先级（P3）
```

### 超载处理

当 LLM 请求量超出并发上限时：

1. **优先保证 P0 和 P1** 的请求完成
2. P2 请求延后到下一个 tick
3. P3 请求在持续超载时可以丢弃（Agent 保持上次状态）
4. 丢弃的请求在 Monitor 面板中记录

### 资源管理（远期）

当 Agent 数量达到上千时：

- **懒加载**：用户未接触的 Agent 不创建
- **Agent 回收**：长期未与用户产生任何关联的 Agent 降低到极低频思考
- **记忆压缩**：非活跃 Agent 的记忆压缩存储
- **批量思考**：远处 Agent 的日常行为可以批量生成（一次 LLM 调用生成多个 Agent 的行为摘要）

---

> 相关文档：[AgentRuntime](./runtime.md) | [生命周期](./lifecycle.md) | [LLM 调度器](../llm/scheduler.md)
