# 成本控制

> 最后更新：2026-04-08 | 版本 v0.02

---

## 模型分层

所有 Agent 行为由 LLM 生成，通过模型分层控制成本：

```typescript
config.llm.defaults = {
  premiumModel: 'kimi-k2.5',       // 用户正在交互的 Agent
  standardModel: 'deepseek-v3',    // 最近有互动的 Agent
  cheapModel: 'deepseek-v3',       // 批量处理背景 Agent
  embedModel: 'deepseek-v3',       // 向量嵌入
};
```

## 每日预算

```typescript
// packages/server/src/llm/cost-controller.ts

export class CostController {
  private dailyBudget: number | null;  // null = 不限制
  private dailySpent: number = 0;
  private perAgentDailyLimit: number;

  /** 检查是否超出预算 */
  canMakeCall(agentId: string, estimatedTokens: number): boolean {
    if (!this.dailyBudget) return true;
    if (this.dailySpent >= this.dailyBudget) return false;
    // 检查单 Agent 限额
    const agentSpent = this.getAgentDailySpent(agentId);
    if (agentSpent >= this.perAgentDailyLimit) return false;
    return true;
  }

  /** 记录花费 */
  recordSpend(agentId: string, tokens: number, cost: number): void {
    this.dailySpent += cost;
    this.agentSpending.set(agentId, (this.agentSpending.get(agentId) ?? 0) + cost);
  }

  /** 每日重置 */
  dailyReset(): void {
    this.dailySpent = 0;
    this.agentSpending.clear();
  }
}
```

## 预算耗尽策略

当预算即将用完时：

| 阶段 | 策略 |
|------|------|
| 预算 > 50% | 正常使用 |
| 预算 20-50% | 背景 Agent 降级到 cheapModel |
| 预算 < 20% | 只处理用户交互，暂停其他 |
| 预算耗尽 | 只用 cheapModel 处理用户交互 |

---

> 相关文档：[LLM 调度器](./scheduler.md) | [错误处理](./resilience.md)
