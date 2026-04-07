# 规则引擎 (RuleEngine)

> 最后更新：2026-04-08 | 版本 v0.02

---

规则引擎管理世界的可配置规则。规则是 Agent 思考时的**输入和上下文**，不是替代 LLM 决策的工具。

## 设计理念

- **规则 ≠ Agent 行为**：规则提供时间驱动的上下文（起床时间、上班时间），Agent 的决策由 LLM 生成
- 规则处理纯数值变化（时间推进自动消耗精力）
- 规则是用户/预设自定义世界运行参数的方式
- Agent 可以选择忽略规则（比如决定不去上班）

## 接口定义

```typescript
// packages/server/src/world/rule-engine.ts

export interface WorldRule {
  id: string;
  name: string;
  condition: RuleCondition;
  effects: RuleEffect[];
  priority: number;       // 优先级，高优先级先执行
  source: 'system' | 'preset' | 'user';  // 规则来源
}

export interface RuleCondition {
  /** 世界时间范围 */
  hourRange?: [number, number];
  /** Agent 状态过滤 */
  agentStatus?: AgentStatus;
  /** 星期几 */
  dayOfWeek?: number[];
  /** 自定义条件表达式 */
  custom?: string;
}

export interface RuleEffect {
  statChanges?: Partial<AgentStats>;
  activity?: string;
  location?: string;
  eventsToGenerate?: Partial<WorldEvent>[];
}

export class RuleEngine {
  private rules: WorldRule[] = [];

  /** 加载规则 */
  loadRules(rules: WorldRule[]): void {
    this.rules = rules.sort((a, b) => b.priority - a.priority);
  }

  /** 评估当前 tick 应用的规则 */
  evaluate(clock: WorldClock, agent: AgentRuntime): RuleEffect[] {
    const effects: RuleEffect[] = [];
    const hour = clock.getTime().getHours();

    for (const rule of this.rules) {
      if (this.matchesCondition(rule.condition, hour, agent)) {
        effects.push(...rule.effects);
      }
    }

    return effects;
  }

  /** 用户添加自定义规则 */
  addRule(rule: WorldRule): void {
    rule.source = 'user';
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /** 删除规则 */
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }
}
```

## 基础规则集

系统自带的默认规则（人类世界基础法则）：

```yaml
# 示例：系统默认规则
rules:
  - name: "起床"
    condition:
      hourRange: [7, 7]
      agentStatus: sleeping
    effects:
      - activity: "起床"
        location: "home"
        statChanges:
          energy: 100
          mood: 5

  - name: "上班"
    condition:
      hourRange: [9, 9]
      dayOfWeek: [1, 2, 3, 4, 5]  # 工作日
    effects:
      - activity: "上班"
        location: "office"
        statChanges:
          energy: -20
          mood: -5

  - name: "午餐"
    condition:
      hourRange: [12, 12]
    effects:
      - activity: "午餐"
        location: "restaurant"
        statChanges:
          energy: 10
          mood: 5

  - name: "下班"
    condition:
      hourRange: [18, 18]
      dayOfWeek: [1, 2, 3, 4, 5]
    effects:
      - activity: "下班"
        location: "transit"
        statChanges:
          energy: 10

  - name: "睡觉"
    condition:
      hourRange: [22, 22]
    effects:
      - activity: "睡觉"
        location: "home"
        statChanges:
          energy: 100
```

## 规则冲突解决

当多条规则同时匹配时：

1. 按优先级排序，高优先级先执行
2. 同优先级按来源排序：user > preset > system
3. 冲突的 statChanges 取最后一个生效的规则

---

> 相关文档：[事件系统](./events.md) | [预设系统](./presets.md)
