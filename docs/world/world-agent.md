# World Agent — 世界管理 Agent

> 最后更新：2026-04-08 | 版本 v0.02

---

World Agent 是一个特殊的系统 Agent，负责世界层面的宏观模拟——天灾、气候变化、社会趋势等超出单个 Agent 控制范围的事件。

## 定位

World Agent 代表"世界本身的意志"。它不扮演任何角色，而是模拟世界的自然运行规律。

- 每隔若干 tick 思考一次（不需要每 tick 都思考）
- 产出的是**世界级事件**（地震、飓风、经济波动、社会变革）
- 产出的内容由 Agent 们自主反应，World Agent 不控制 Agent 的反应

## 接口定义

```typescript
// packages/server/src/world/world-agent.ts

export interface WorldAgentConfig {
  disasterFrequency: number;      // 天灾频率 0-1
  economicVolatility: number;     // 经济波动性 0-1
  socialChangeRate: number;       // 社会变革速率 0-1
}

export class WorldAgent {
  private llmScheduler: LLMScheduler;
  private config: WorldAgentConfig;
  private lastThinkTick: number = 0;
  private thinkInterval: number = 10; // 每 10 tick 思考一次

  constructor(llmScheduler: LLMScheduler, config?: Partial<WorldAgentConfig>) {
    this.llmScheduler = llmScheduler;
    this.config = { disasterFrequency: 0.3, economicVolatility: 0.5, socialChangeRate: 0.2, ...config };
  }

  async think(worldState: WorldState): Promise<WorldEvent[]> {
    if (worldState.currentTick - this.lastThinkTick < this.thinkInterval) {
      return [];
    }
    this.lastThinkTick = worldState.currentTick;

    const prompt = this.buildWorldThinkPrompt(worldState);
    const result = await this.llmScheduler.submit({
      agentId: 'world-agent',
      callType: 'decision',
      model: config.llm.defaults.standardModel,
      messages: prompt,
    });

    return this.parseWorldEvents(result.content, worldState);
  }
}
```

## World Agent 的 Prompt 模板

```typescript
private buildWorldThinkPrompt(worldState: WorldState): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `你是世界模拟引擎，负责模拟世界的宏观运行。你不扮演任何角色，你代表"世界的自然运行规律"。

你需要决定在这个时间段内，世界层面发生什么事情。

可以生成的事件类型：
- 自然灾害：地震、飓风、洪水、干旱、小行星撞击等
- 经济变化：经济繁荣、衰退、通货膨胀、股市崩盘等
- 社会变化：社会运动、政策变化、科技突破等
- 疾病疫情：流感、传染病等
- 其他宏观事件

注意：
- 事件要合理，不要每个 tick 都有天灾
- 大部分时候世界是平静的，偶尔才有大事
- 事件要有地域性，不是所有地方都受影响
- 返回 JSON 数组格式，如果没有事件返回空数组`,
    },
    {
      role: 'user',
      content: `当前世界状态：
- 时间：${worldState.currentTime}
- 地点：${worldState.location}
- 第 ${worldState.day} 天
- 当前活跃 Agent 数量：${worldState.agentCount}
- 近期已发生的世界事件：${JSON.stringify(worldState.recentWorldEvents)}

灾害频率设置：${this.config.disasterFrequency}
经济波动性：${this.config.economicVolatility}

请决定是否需要生成世界级事件。返回 JSON：
[{
  "type": "natural_disaster" | "economic" | "social" | "epidemic" | "other",
  "description": "事件描述",
  "location": "受影响区域",
  "severity": 1-10,
  "affectedAgents": ["影响到的 Agent 类别"],
  "consequences": ["可能的后果"]
}]`,
    },
  ];
}
```

## 事件频率控制

World Agent 不是每 tick 都生成事件。大部分时候世界是平静的。

| 配置 | 默认值 | 说明 |
|------|--------|------|
| `disasterFrequency` | 0.3 | 天灾频率（0 = 永远没有天灾，1 = 频繁天灾） |
| `economicVolatility` | 0.5 | 经济波动性 |
| `socialChangeRate` | 0.2 | 社会变革速率 |
| 思考间隔 | 10 tick | World Agent 每 10 tick 思考一次 |

通过频率配置和 Prompt 中的约束，确保大部分时候世界是正常运行的。

## 历史模式下的 World Agent

在历史模式下，World Agent 会参考真实历史事件：

- 如果是"2017 年"，那一年真实发生的大事件可以作为参考
- 但用户进入后历史已经分叉，不需要严格遵循真实时间线
- 历史预设包可以包含"该时期可能发生的事件"供 World Agent 参考

## 与上帝模式的关系

- 上帝模式可以触发世界级事件（相当于手动调用 World Agent 的能力）
- World Agent 是自动运行的世界管理器，上帝模式是手动的
- 两者产出的事件类型相同，但触发方式不同

---

> 相关文档：[事件系统](./events.md) | [玩家模式](../architecture/player-modes.md) | [TickScheduler](./tick-scheduler.md)
