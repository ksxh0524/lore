# 经济系统 (EconomyEngine)

> 最后更新：2026-04-08 | 版本 v0.02

---

## Phase 1：基础经济

Phase 1 只做最基础的经济系统，保证 Agent 有收入和支出的概念。

### 数据结构

```typescript
export interface BasicEconomy {
  agentId: string;
  worldId: string;
  balance: number;          // 余额
  income: number;           // 月收入（工资）
  expenses: number;         // 月支出（生活费）
  updatedAt: Date;
}
```

### 基础功能

| 功能 | 说明 | Phase |
|------|------|-------|
| 月收入 | 有工作的 Agent 每月有工资 | 1 |
| 月支出 | 每月有基本生活开支 | 1 |
| 余额计算 | balance += income - expenses | 1 |
| 消费 | Agent 买东西花金钱 | 1 |
| 找工作 | Agent 可以找工作（LLM 生成面试场景） | 1 |

### Phase 1 接口

```typescript
// packages/server/src/world/economy-engine.ts

export class EconomyEngine {
  /** 每月结算 */
  async monthlySettle(worldId: string): Promise<void> {
    const economies = await this.db.getEconomies(worldId);
    for (const eco of economies) {
      eco.balance += eco.income - eco.expenses;
      await this.db.updateEconomy(eco);
    }
  }

  /** Agent 消费 */
  async spend(agentId: string, amount: number, reason: string): Promise<boolean> {
    const eco = await this.db.getEconomy(agentId);
    if (eco.balance < amount) return false;
    eco.balance -= amount;
    await this.db.updateEconomy(eco);
    return true;
  }

  /** Agent 获得收入 */
  async earn(agentId: string, amount: number, reason: string): Promise<void> {
    const eco = await this.db.getEconomy(agentId);
    eco.balance += amount;
    await this.db.updateEconomy(eco);
  }
}
```

---

## Phase 5：完整经济

远期的完整经济系统。

### 数据结构

```typescript
export interface AgentEconomy {
  agentId: string;
  worldId: string;
  balance: number;
  income: number;
  expenses: number;
  assets: Asset[];
  job: Job | null;
  updatedAt: Date;
}

export interface Job {
  company: string;
  position: string;
  salary: number;
  startDate: Date;
  satisfaction: number;
}

export interface Asset {
  type: 'real_estate' | 'vehicle' | 'stock' | 'savings' | 'business';
  name: string;
  value: number;
  purchaseDate: Date;
}
```

### 完整功能

| 功能 | 说明 | Phase |
|------|------|-------|
| 就业系统 | 找工作、面试、晋升、离职 | 2 |
| 银行存款 | 利息计算 | 5 |
| 贷款 | 买房/买车贷款 | 5 |
| 股票 | 买卖股票、价格波动 | 5 |
| 创业 | 创建公司、招聘 Agent | 4 |
| 房产 | 买卖房产 | 5 |
| 公司竞争 | 公司之间竞争市场份额 | 5 |

### Agent 自主经济决策

Agent 的经济行为由 LLM 驱动，不限制：

- Agent 可以决定炒股
- Agent 可以创业
- Agent 可以投资
- Agent 可以决定去另一个城市找工作
- 创业成功的 Agent 可能变成用户的竞争对手

---

> 相关文档：[事件系统](./events.md) | [数据库 Schema](../api/database.md)
