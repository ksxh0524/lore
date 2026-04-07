# 事件系统

> 最后更新：2026-04-08 | 版本 v0.02

---

## 事件类型

```typescript
export interface WorldEvent {
  id: string;
  worldId: string;
  type: 'routine' | 'random' | 'social' | 'romantic' | 'career' | 'crisis' | 'user' | 'world';
  category: string;
  description: string;
  involvedAgents: string[];
  consequences?: EventConsequence[];
  timestamp: Date;
  processed: boolean;
  userChoices?: string[];
  priority: number;
}

export interface EventConsequence {
  agentId: string;
  statChanges: Partial<AgentStats>;
  relationshipChange?: { targetId: string; delta: number };
  newEvent?: Partial<WorldEvent>;
}
```

## 事件来源

### 日常事件（routine）

按时触发的时间驱动事件，作为 Agent 思考的**输入**（不是替代思考）。

| 时间 | 事件 | 说明 |
|------|------|------|
| 7:00 | 起床 | 提醒 Agent 新的一天开始 |
| 9:00 | 上班时间 | Agent 可以选择不去 |
| 12:00 | 午餐 | Agent 自主决定怎么吃 |
| 18:00 | 下班 | Agent 自主决定下班后做什么 |
| 22:00 | 睡觉时间 | Agent 可以选择熬夜 |

这些是"提醒"，Agent 的决策由 LLM 生成。

### 概率事件（random）

按概率随机触发：

| 事件 | 概率 | 说明 |
|------|------|------|
| 加班 | 10% | Agent 自主决定是否接受 |
| 遇到熟人 | 5% | 可能触发社交 |
| 好运 | 1% | 中奖/捡钱等 |
| 倒霉 | 3% | 丢东西/迟到等 |
| 生病 | 2% | 需要治疗 |

### 社交/感情事件

由 Agent 间的互动触发，通过 LLM 生成。

### 用户触发事件

- 用户发消息 -> Agent 收到 -> LLM 生成回复
- 用户选择事件选项 -> 触发后续事件
- 用户上传内容到平台 -> Agent 反应

### 世界事件（world）

由 **World Agent** 生成的宏观事件：

| 类型 | 说明 |
|------|------|
| 自然灾害 | 地震、飓风、洪水、干旱 |
| 经济变化 | 经济繁荣/衰退、通胀 |
| 社会变化 | 社会运动、政策变化 |
| 疾病疫情 | 传染病爆发 |
| 其他 | 小行星撞击等极端事件 |

World Agent 每 10 tick 左右思考一次，大部分时候世界是平静的。

## EventEngine 接口

```typescript
// packages/server/src/world/events.ts

export class EventEngine {
  private worldAgent: WorldAgent;

  constructor(worldAgent: WorldAgent) {
    this.worldAgent = worldAgent;
  }

  async generate(clock: WorldClock, agents: AgentRuntime[], worldState: WorldState): Promise<WorldEvent[]> {
    const events: WorldEvent[] = [];

    // 1. 日常事件（时间驱动）
    events.push(...this.generateRoutineEvents(clock, agents));

    // 2. 概率事件（随机）
    events.push(...this.generateRandomEvents(agents));

    // 3. 世界事件（World Agent）
    const worldEvents = await this.worldAgent.think(worldState);
    events.push(...worldEvents);

    return events;
  }

  async applyConsequences(event: WorldEvent, agentManager: AgentManager): Promise<void> {
    if (!event.consequences) return;

    for (const c of event.consequences) {
      const agent = agentManager.get(c.agentId);
      if (!agent) continue;

      if (c.statChanges) agent.applyStatChanges(c.statChanges);
      if (c.relationshipChange) {
        await this.relationshipManager.update(
          c.agentId,
          c.relationshipChange.targetId,
          { intimacy: c.relationshipChange.delta },
        );
      }
      if (c.newEvent) {
        await this.submitEvent({ ...c.newEvent, worldId: event.worldId });
      }
    }

    event.processed = true;
  }
}
```

## 事件优先级与推送

| 优先级 | 范围 | 推送策略 |
|--------|------|---------|
| 紧急 | 90-100 | 立即推送（生死、天灾、重大变故） |
| 重要 | 60-89 | 推送，可以折叠 |
| 普通 | 30-59 | 累积后批量推送 |
| 日常 | 0-29 | 不推送，只在时间线可见 |
| 世界 | 80+ | 天灾等世界事件通常高优先级推送 |

---

> 相关文档：[World Agent](./world-agent.md) | [TickScheduler](./tick-scheduler.md) | [规则引擎](./rules.md)
