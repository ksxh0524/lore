# 势力系统 (FactionEngine)

> 最后更新：2026-04-08 | 版本 v0.01

---

## 数据结构

```typescript
export interface Faction {
  id: string;
  worldId: string;
  name: string;
  type: 'political' | 'military' | 'business' | 'criminal' | 'religious';
  members: string[];           // Agent IDs
  leader: string;              // Agent ID
  resources: number;           // 资源/财富
  territory: string[];         // 控制区域
  relations: Map<string, FactionRelation>;
}

export interface FactionRelation {
  targetFactionId: string;
  type: 'ally' | 'neutral' | 'hostile' | 'vassal';
  trust: number;               // 0-100
}
```

## 势力交互

| 交互类型 | 说明 |
|---------|------|
| 结盟 | 两个势力合作，共享资源 |
| 战争 | 攻击对方，争夺领土和资源 |
| 贸易 | 交换资源，互利互惠 |
| 外交 | 谈判、威胁、拉拢 |
| 吞并 | 战胜方吸收战败方 |

## FactionEngine 接口

```typescript
// packages/server/src/world/faction-engine.ts

export class FactionEngine {
  /** 创建势力 */
  async create(faction: Faction): Promise<void>;

  /** 势力间交互（LLM 生成结果） */
  async interact(fromId: string, toId: string, action: string): Promise<void>;

  /** 成员加入/退出 */
  async joinMember(factionId: string, agentId: string): Promise<void>;
  async leaveMember(factionId: string, agentId: string): Promise<void>;

  /** 获取势力关系 */
  async getRelation(factionIdA: string, factionIdB: string): Promise<FactionRelation>;
}
```

> Phase 4 实现。

---

> 相关文档：[事件系统](./events.md) | [ROADMAP](../ROADMAP.md)
