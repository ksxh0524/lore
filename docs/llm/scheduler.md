# LLMScheduler — 请求调度器

> 最后更新：2026-04-08 | 版本 v0.02

---

所有 LLM 调用统一通过 LLMScheduler 排队。**所有 Agent 都由 LLM 驱动思考**，调度器负责优先级排序、并发控制、超载处理。

## 接口定义

```typescript
// packages/server/src/scheduler/llm-scheduler.ts

export interface LLMRequest {
  agentId: string;
  callType: LLMCallType;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: any[];
}

export type LLMCallType = 'user-chat' | 'decision' | 'social' | 'memory' | 'creative' | 'batch';

export interface LLMResult {
  content: string;
  toolCalls?: Array<{ name: string; args: any }>;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}

export class LLMScheduler {
  private queue: PriorityQueue<LLMRequest>;
  private semaphore: Semaphore;
  private providerFactory: ProviderFactory;
  private resilience: LLMResilience;
  private droppedCount: number = 0;

  constructor(config: { maxConcurrent: number; timeoutMs: number }) {
    this.queue = new PriorityQueue();
    this.semaphore = new Semaphore(config.maxConcurrent);
    this.resilience = new LLMResilience(config.timeoutMs);
  }

  async submit(request: LLMRequest): Promise<LLMResult> {
    const priority = this.calculatePriority(request);
    return this.queue.enqueue(request, priority, async () => {
      await this.semaphore.acquire();
      try {
        return await this.resilience.executeWithRetry(() =>
          this.executeRequest(request)
        );
      } finally {
        this.semaphore.release();
      }
    });
  }

  private async executeRequest(request: LLMRequest): Promise<LLMResult> {
    const provider = this.providerFactory.getProvider(request.model);
    return provider.generateText({
      model: request.model,
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });
  }

  private calculatePriority(request: LLMRequest): number {
    const basePriority: Record<LLMCallType, number> = {
      'user-chat': 160,
      'decision': 80,
      'social': 70,
      'memory': 60,
      'creative': 50,
      'batch': 30,
    };
    return basePriority[request.callType] ?? 50;
  }

  getDroppedCount(): number {
    return this.droppedCount;
  }
}
```

## 优先级队列

```
user-chat(160) > decision(80) > social(70) > memory(60) > creative(50) > batch(30)

用户聊天永远最高优先级。
所有 Agent 都调 LLM，按优先级排队。
```

## 并发控制

使用信号量控制同时进行的 LLM 调用数：

```typescript
class Semaphore {
  private current = 0;
  private waitQueue: Array<() => void> = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>(resolve => this.waitQueue.push(resolve));
  }

  release(): void {
    this.current--;
    const next = this.waitQueue.shift();
    if (next) {
      this.current++;
      next();
    }
  }
}
```

默认并发数 = 5，用户可配（1-100）。

## 超载处理

当 LLM 请求量超出并发上限时：

```
1. 优先保证 P0（用户交互）和 P1（核心 Agent）的请求
2. P2 请求排队等待，最多等到本 tick 结束
3. P3 请求在持续超载时丢弃
   - Agent 保持上一 tick 的状态
   - 记录到 Monitor 面板
   - 下次 tick 重新思考
```

```typescript
class LLMRequestDroppedError extends Error {
  constructor(agentId: string) {
    super(`LLM request dropped for agent ${agentId}`);
  }
}
```

## 所有 Agent 都调 LLM

关键设计：**不存在纯规则引擎驱动的 Agent**。所有 Agent 都由 LLM 驱动思考，只是频率不同：

- 高频 Agent：每 tick 思考
- 中频 Agent：每 2-3 tick 思考
- 低频 Agent：每 5-10 tick 思考
- 极低频 Agent：每天一次总结

频率分级 + 请求队列 + 超载丢弃 = 在成本可控的前提下让每个 Agent 都有真实的人生。

---

> 相关文档：[Provider 架构](./providers.md) | [行为引擎](../agent/behavior.md) | [AgentManager](../agent/manager.md)
