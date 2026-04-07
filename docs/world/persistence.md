# 持久化与存档

> 最后更新：2026-04-08 | 版本 v0.01

---

## 持久化策略

### 实时持久化

每 10 个 tick 自动将所有 Agent 状态写入 SQLite：

```typescript
// 在 TickScheduler 的 onTick 中
if (tickNumber % 10 === 0) {
  await agentManager.persistAll();
  await worldPersistence.saveWorldState(worldId);
}
```

写入内容：
- 所有 Agent 的 state、stats
- 世界当前时间
- 事件队列状态
- 关系变化

### 快照存档

用户可以手动创建存档，系统也会定期自动存档。

```typescript
// packages/server/src/world/persistence.ts

export class WorldPersistence {
  /** 创建快照 */
  async createSnapshot(worldId: string, name: string): Promise<SaveEntry> {
    const world = await this.db.getWorld(worldId);
    const agents = await this.db.getAgents(worldId);
    const events = await this.db.getEvents(worldId);

    const snapshot = {
      id: generateId(),
      worldId,
      name,
      data: JSON.stringify({ world, agents, events }),
      createdAt: new Date(),
    };

    await this.db.insertSave(snapshot);
    return snapshot;
  }

  /** 加载快照 */
  async loadSnapshot(saveId: string): Promise<void> {
    const save = await this.db.getSave(saveId);
    const data = JSON.parse(save.data);

    // 恢复世界状态
    await this.db.updateWorld(data.world);
    // 恢复所有 Agent
    for (const agent of data.agents) {
      await this.db.updateAgent(agent.id, agent);
    }
  }

  /** 列出存档 */
  async listSaves(worldId: string): Promise<SaveEntry[]>;

  /** 删除存档 */
  async deleteSave(saveId: string): Promise<void>;
}
```

## 自动存档

| 触发条件 | 说明 |
|---------|------|
| 每 5 分钟 | 自动快照（可配置 `autoSaveIntervalMin`） |
| 重大事件前 | Agent 死亡、战争等不可逆事件前自动存档 |
| 退出时 | 用户关闭应用时自动存档 |

## 存档管理

```
~/.lore/saves/
+-- auto_2026-04-08_14-30.save    # 自动存档
+-- auto_2026-04-08_13-25.save
+-- 我的好日子.save               # 手动存档
```

---

> 相关文档：[TickScheduler](./tick-scheduler.md) | [数据库 Schema](../api/database.md)
