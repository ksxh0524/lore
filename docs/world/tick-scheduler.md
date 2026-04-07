# TickScheduler — 世界主循环

> 最后更新：2026-04-08 | 版本 v0.02

---

TickScheduler 是世界引擎的心跳，基于 `setInterval` 每隔 N 秒触发一个 tick。

## 接口定义

```typescript
// packages/server/src/scheduler/tick-scheduler.ts

export class TickScheduler {
  private interval: NodeJS.Timeout | null = null;
  private tickNumber = 0;
  private paused = false;

  constructor(
    private tickIntervalMs: number,  // 默认 3000ms
    private onTick: (tickNumber: number) => Promise<void>,
  ) {}

  start(): void {
    this.interval = setInterval(async () => {
      if (this.paused) return;
      this.tickNumber++;
      await this.onTick(this.tickNumber);
    }, this.tickIntervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }

  getTickNumber(): number { return this.tickNumber; }
  isRunning(): boolean { return this.interval !== null && !this.paused; }
}
```

## 单个 Tick 流程

```
onTick(tickNumber)
  |
  v
1. WorldClock.advance()          -- 时间推进
  |
  v
2. WorldAgent.think()            -- 世界级事件（天灾、宏观事件）
  |
  v
3. EventEngine.generate()        -- 生成事件（日常 + 概率 + 世界事件）
  |
  v
4. AgentManager.tickAll()         -- 遍历 Agent（所有 Agent LLM 驱动思考，频率分级）
  |
  v
5. PushManager.push()            -- 重要事件推送给前端
  |
  v
6. 每 10 tick: AgentManager.persistAll()  -- 批量持久化
```

## 配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `tickIntervalMs` | 3000 | tick 间隔（毫秒），可配置 |
| `paused` | false | 是否暂停 |

tickIntervalMs 可以在运行时动态调整（普通模式和上帝模式都可以）。

---

> 相关文档：[时间系统](./clock.md) | [事件系统](./events.md) | [持久化](./persistence.md)
