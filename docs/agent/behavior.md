# 行为引擎 (BehaviorEngine)

> 最后更新：2026-04-08 | 版本 v0.02

---

行为引擎驱动 Agent "做什么"。**所有 Agent 的行为都由 LLM 生成，不做硬编码限制。** 成本控制靠频率分级和请求队列管理，不靠规则引擎替代。

## 核心原则

```
1. 所有 Agent 都由 LLM 驱动思考
2. 行为方向不受限制——送外卖的也可以创业，可以和用户竞争
3. 每个思考都通过 LLMScheduler 统一排队
4. 频率按与用户的关联度分级
5. 超载时低优先级请求延后或丢弃
```

## 思考频率分级

| 等级 | Agent 类型 | 思考频率 | 模型 | 说明 |
|------|-----------|---------|------|------|
| 高频 | 用户正在交互的 Agent | 每 tick | premiumModel | 实时响应，最高优先级 |
| 高频 | 用户身边的核心人物 | 每 tick | premiumModel | 家人、密友、同事 |
| 中频 | 用户认识的、偶尔互动的 | 每 2-3 tick | standardModel | 熟人、同学 |
| 低频 | 有关联但距离远的 | 每 5-10 tick | cheapModel | 邻居、前同事 |
| 极低频 | 尚未接触的远处 Agent | 每天一次总结 | cheapModel | 不在用户社交圈内 |

**注意**：低频不代表没有人生。每个 Agent 都有完整的思考，只是调用的间隔不同。当用户突然接触到远处 Agent 时，该 Agent 应该有合理的"这段时间经历了什么"的记忆。

## 决策流程

```
Agent.tick()
  |
  v
检查本 tick 是否需要思考（根据频率分级）
  |
  +-- 不需要 --> 跳过（保持上次状态）
  |
  +-- 需要 --> 构建 Prompt
                |
                +-- 人格 + 当前状态 + 记忆上下文
                +-- 当前场景/待处理事件
                +-- 可用工具列表
                |
                v
              LLMScheduler.submit() --> 排队等待
                |
                v
              LLM 返回决策 --> 解析 --> 执行动作 --> 更新状态 --> 存记忆
```

## BehaviorEngine 接口

```typescript
// packages/server/src/agent/behavior.ts

export class BehaviorEngine {
  private llmScheduler: LLMScheduler;
  private toolRegistry: ToolRegistry;

  constructor(llmScheduler: LLMScheduler, toolRegistry: ToolRegistry) {
    this.llmScheduler = llmScheduler;
    this.toolRegistry = toolRegistry;
  }

  async processBehavior(agent: AgentRuntime, worldState: WorldState): Promise<void> {
    if (!this.shouldThink(agent, worldState)) return;

    const pendingEvents = worldState.getPendingEvents(agent.id);
    const prompt = buildDecisionPrompt(agent, worldState, pendingEvents);
    const tools = this.toolRegistry.toFunctionDefinitions();

    try {
      const result = await this.llmScheduler.submit({
        agentId: agent.id,
        callType: this.getCallType(agent),
        model: agent.getRequiredModel(),
        messages: prompt,
        tools,
      });

      agent.processDecision(result);

      if (result.toolCalls) {
        for (const call of result.toolCalls) {
          const tool = this.toolRegistry.get(call.name);
          if (tool) {
            const output = await tool.execute(call.args, agent);
            agent.processToolResult(call.name, output);
          }
        }
      }

      await agent.memory.add(result.content, 'decision', 0.7);
    } catch (err) {
      if (err instanceof LLMRequestDroppedError) {
        // 请求被丢弃，Agent 保持上次状态，下次 tick 再思考
        return;
      }
      throw err;
    }
  }

  private shouldThink(agent: AgentRuntime, worldState: WorldState): boolean {
    const level = agent.getThoughtFrequencyLevel();
    const tick = worldState.currentTick;

    switch (level) {
      case 'high': return true;
      case 'medium': return tick % 3 === 0;
      case 'low': return tick % 8 === 0;
      case 'minimal': return tick % 30 === 0;
    }
  }

  private getCallType(agent: AgentRuntime): LLMCallType {
    if (agent.isUserInteracting()) return 'user-chat';
    if (agent.getThoughtFrequencyLevel() === 'high') return 'decision';
    return 'social';
  }
}
```

## Agent 行为不受限制

Agent 的行为方向完全由 LLM 决定，系统不做硬编码限制：

- 送外卖的 Agent 可以决定辞职创业
- 创业成功后可能和用户的公司竞争
- Agent 可以主动撩用户、发自拍
- Agent 可以拒绝用户、可以消失
- Agent 可以去炒股、投资、甚至想移民火星

系统只提供**工具**（找工作的渠道、交易平台、社交平台），不限制 Agent 选择做什么。

## 日常时间驱动事件

虽然所有 Agent 的决策都是 LLM 驱动的，但有一些基础的时间驱动事件作为 Agent 思考的**输入**（不是替代思考）：

| 时间 | 事件 | 说明 |
|------|------|------|
| 7:00 | 起床 | 作为事件输入给 Agent，Agent 自主决定今天做什么 |
| 9:00 | 上班时间 | 提醒 Agent 该上班了，但 Agent 可以决定不去 |
| 12:00 | 午餐 | Agent 可以决定和谁吃、吃什么 |
| 18:00 | 下班 | Agent 可以决定去哪、做什么 |
| 22:00 | 睡觉时间 | Agent 可以决定熬夜 |

这些事件只是"提醒"，Agent 可以选择忽略（比如决定去蹦迪、加班、或者通宵写代码）。

## 规则引擎的角色

规则引擎在新的设计中角色发生变化：

- **不是**替代 LLM 决策的工具
- **是**提供 Agent 思考时的上下文输入
- **是**处理纯数值变化（时间推进自动消耗精力等）
- **是**用户/预设自定义世界规则的方式

---

> 相关文档：[AgentRuntime](./runtime.md) | [LLM 调度器](../llm/scheduler.md) | [Prompt 模板](./prompts.md) | [规则引擎](../world/rules.md)
