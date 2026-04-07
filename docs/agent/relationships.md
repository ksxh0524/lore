# 关系管理 (RelationshipManager)

> 最后更新：2026-04-08 | 版本 v0.01

---

## 关系类型

```typescript
export type RelationshipType =
  | 'stranger'        // 陌生人
  | 'acquaintance'    // 熟人
  | 'friend'          // 朋友
  | 'close_friend'    // 好友
  | 'partner'         // 恋人/伴侣
  | 'ex'              // 前任
  | 'enemy'           // 敌人
  | 'rival'           // 竞争对手
  | 'family'          // 家人
  | 'colleague'       // 同事
  | 'boss'            // 上级
  | 'subordinate';    // 下级
```

## 关系数据结构

```typescript
export interface Relationship {
  agentId: string;
  targetAgentId: string;
  worldId: string;
  type: RelationshipType;
  intimacy: number;        // 0-100 亲密度
  history: string[];       // 关键事件历史
  updatedAt: Date;
}
```

## 亲密度变化规则

| 事件 | 亲密度变化 | 说明 |
|------|-----------|------|
| 日常聊天 | +1~+3 | 每次对话微量增加 |
| 深度聊天 | +5~+10 | 涉及个人话题 |
| 一起吃饭/聚会 | +5 | 共同活动 |
| 帮忙 | +10 | 主动帮助对方 |
| 送礼物 | +5~+15 | 取决于礼物价值 |
| 表白成功 | +30 | 确认恋人关系 |
| 吵架 | -10~-20 | 严重程度不同 |
| 背叛 | -40 | 大幅下降 |
| 分手 | -30 | 关系类型变为 ex |
| 长期不联系 | -1/天 | 缓慢下降 |

## 关系类型转换

```
stranger (0-10) --> acquaintance (11-30) --> friend (31-60) --> close_friend (61-80) --> partner (81+)
                                                                    |
                                                                    v
                                                              ex (分手后)
```

转换规则：

| 当前类型 | 下一类型 | 条件 |
|---------|---------|------|
| stranger | acquaintance | intimacy >= 11 |
| acquaintance | friend | intimacy >= 31 |
| friend | close_friend | intimacy >= 61 |
| close_friend | partner | 双方 intimacy >= 75 + 一方表白 + 另一方接受 |
| partner | ex | 分手事件 |
| any | enemy | 亲密度降到 0 以下 |

## RelationshipManager 接口

```typescript
// packages/server/src/agent/relationships.ts

export class RelationshipManager {
  private db: Repository;

  /** 获取两个 Agent 之间的关系 */
  async get(agentId: string, targetId: string): Promise<Relationship | null>;

  /** 更新关系（事件触发） */
  async update(agentId: string, targetId: string, delta: Partial<Relationship>): Promise<void>;

  /** 获取 Agent 的所有关系 */
  async getAll(agentId: string): Promise<Relationship[]>;

  /** 获取认识的人（关系 != stranger） */
  async getKnownAgents(agentId: string): Promise<string[]>;

  /** 检查关系类型转换 */
  async checkTypeTransition(agentId: string, targetId: string): Promise<void>;

  /** 衰减长期不联系的关系 */
  async decayInactive(worldId: string): Promise<void>;
}
```

## 关系对行为的影响

- **亲密度高**：Agent 更愿意主动联系、分享私人信息、帮忙
- **亲密度低**：回复简短、拒绝请求、社交距离远
- **enemy**：可能说坏话、制造麻烦
- **colleague**：工作场景优先互动
- **partner**：更频繁联系、情感更敏感

---

> 相关文档：[社交引擎](./social.md) | [AgentRuntime](./runtime.md)
