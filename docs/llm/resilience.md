# 错误处理与弹性

> 最后更新：2026-04-08 | 版本 v0.02

---

## LLMResilience

```typescript
// packages/server/src/llm/resilience.ts

export class LLMResilience {
  private circuitBreaker: CircuitBreaker;

  constructor(private timeoutMs: number = 30000) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,    // 连续 5 次失败 -> 熔断
      resetTimeoutMs: 60000,  // 60 秒后尝试恢复
    });
  }

  /** 带重试的执行 */
  async executeWithRetry(fn: () => Promise<LLMResult>): Promise<LLMResult> {
    // 1. 检查熔断器
    if (this.circuitBreaker.isOpen()) {
      throw new Error('Circuit breaker is open');
    }

    // 2. 带超时的执行
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.withTimeout(fn(), this.timeoutMs);
      } catch (err) {
        if (!this.isRetryable(err)) throw err;
        if (attempt === 2) {
          this.circuitBreaker.recordFailure();
          throw err;
        }
        await this.backoff(attempt);
      }
    }
    throw new Error('Unreachable');
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      ),
    ]);
  }

  private backoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private isRetryable(err: any): boolean {
    // 限流(429)、超时、网络错误 -> 可重试
    // 内容审核、参数错误 -> 不重试
    return err.status === 429 || err.message === 'Timeout';
  }
}
```

## 熔断器

```
关闭（正常）-- 连续 5 次失败 --> 打开（熔断）
                                      |
                                   60 秒后
                                      v
                                  半开（试探）
                                      |
                              成功 --> 关闭
                              失败 --> 打开
```

## 降级链

当 premiumModel 不可用时，自动降级：

```
premiumModel --> standardModel --> cheapModel --> 报错（不降级到规则引擎）
```

## 错误分类

| 错误 | 处理方式 |
|------|---------|
| 429 限流 | 降级到便宜模型，逐步恢复 |
| 超时 | 重试 1 次，失败跳过本次决策 |
| 内容审核 | 跳过，记录日志 |
| API Key 无效 | 直接报错，提示用户配置 |
| 网络错误 | 重试 3 次（指数退避） |
| 预算耗尽 | 降级到 cheapModel |

---

> 相关文档：[LLM 调度器](./scheduler.md) | [成本控制](./cost-control.md)
