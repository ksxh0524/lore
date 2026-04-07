# 时间系统 (WorldClock)

> 最后更新：2026-04-08 | 版本 v0.01

---

## 接口定义

```typescript
// packages/server/src/world/clock.ts

export class WorldClock {
  private worldTime: Date;
  private timeSpeed: number;          // 流速倍率
  private lastTickTime: number;

  constructor(startTime: Date, timeSpeed: number = 1) {
    this.worldTime = startTime;
    this.timeSpeed = timeSpeed;
    this.lastTickTime = Date.now();
  }

  /** 每 tick 推进世界时间 */
  advance(tickIntervalMs: number): void {
    const elapsed = tickIntervalMs * this.timeSpeed;
    this.worldTime = new Date(this.worldTime.getTime() + elapsed);
  }

  getTime(): Date { return this.worldTime; }
  getDay(): number { /* 返回世界第几天 */ }

  /** 设置流速 -- 任何模式都可以随时调整 */
  setTimeSpeed(speed: number): void {
    this.timeSpeed = Math.max(0.1, Math.min(100, speed));
  }
  getTimeSpeed(): number { return this.timeSpeed; }

  /** 跳到指定时间（上帝模式） */
  jumpTo(targetTime: Date): void {
    this.worldTime = targetTime;
  }
}
```

## 流速控制

**任何模式都可以随时调整时间流速**，不限于上帝模式。

| 流速 | 说明 | 场景 |
|------|------|------|
| 0（暂停） | 世界停止 | 离开时暂停 |
| 1x | 实时 | 细致体验 |
| 5x | 5 倍速 | 日常游玩 |
| 10x | 10 倍速 | 快速推进 |
| 50x | 50 倍速 | 跳过无聊时段 |
| 100x | 100 倍速 | 上帝模式快速推演 |

**前端控件**：顶部导航栏的时间显示旁边有流速调节按钮（暂停/1x/5x/10x/50x/100x）。

## 离线加速

用户关闭应用后，世界暂停。下次打开时：

```typescript
function handleReconnect(lastOnlineTime: Date, currentTime: Date, clock: WorldClock) {
  const offlineMinutes = (currentTime - lastOnlineTime) / 60000;

  if (offlineMinutes > 30) {
    // 离线超过 30 分钟，自动模拟离线期间的世界事件
    // 用批量 LLM 调用生成摘要
    // 推送给用户："你离线期间发生了这些事..."
  }
}
```

---

> 相关文档：[TickScheduler](./tick-scheduler.md) | [事件系统](./events.md)
