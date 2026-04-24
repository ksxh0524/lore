import { CircuitBreaker } from './circuit-breaker.js';
import type { LLMResult } from './types.js';
import type { LoreConfig } from '../config/loader.js';
import { LoreError, ErrorCode } from '../errors.js';

export class LLMResilience {
  private circuitBreaker: CircuitBreaker;
  private timeoutMs: number;

  constructor(config: LoreConfig) {
    this.timeoutMs = config.llm.limits.timeoutMs;
    this.circuitBreaker = new CircuitBreaker(5, 60000);
  }

  async executeWithRetry(fn: () => Promise<LLMResult>): Promise<LLMResult> {
    if (this.circuitBreaker.isOpen()) {
      throw new LoreError(ErrorCode.LLM_API_ERROR, 'Circuit breaker is open - too many failures', 502);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await this.withTimeout(fn(), this.timeoutMs);
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (err: any) {
        if (!this.isRetryable(err)) {
          this.circuitBreaker.recordFailure();
          throw err;
        }
        if (attempt === 2) {
          this.circuitBreaker.recordFailure();
          throw err;
        }
        await this.backoff(attempt);
      }
    }
    throw new LoreError(ErrorCode.INTERNAL_ERROR, 'LLM retry logic unreachable state');
  }

  async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), ms)
      ),
    ]);
  }

  private backoff(attempt: number): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private isRetryable(err: any): boolean {
    if (err.status === 429) return true;
    if (err.message === 'LLM_TIMEOUT') return true;
    if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED') return true;
    return false;
  }
}
