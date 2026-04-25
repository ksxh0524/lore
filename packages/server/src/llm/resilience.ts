import { CircuitBreaker } from './circuit-breaker.js';
import type { LLMResponse, EmbeddingResponse } from './types.js';
import { LoreError, ErrorCode } from '../errors.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('llm-resilience');

export interface ResilienceConfig {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
}

export class LLMResilience {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private config: ResilienceConfig;

  constructor(config?: ResilienceConfig) {
    this.config = {
      maxRetries: config?.maxRetries ?? 3,
      retryDelayMs: config?.retryDelayMs ?? 1000,
      timeoutMs: config?.timeoutMs ?? 60000,
      circuitBreakerThreshold: config?.circuitBreakerThreshold ?? 5,
      circuitBreakerResetMs: config?.circuitBreakerResetMs ?? 60000,
    };
  }

  private getCircuitBreaker(providerId: string): CircuitBreaker {
    if (!this.circuitBreakers.has(providerId)) {
      this.circuitBreakers.set(
        providerId,
        new CircuitBreaker(this.config.circuitBreakerThreshold, this.config.circuitBreakerResetMs)
      );
    }
    return this.circuitBreakers.get(providerId)!;
  }

async execute<T extends LLMResponse | EmbeddingResponse>(
    providerId: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(providerId);
    const maxRetries = this.config.maxRetries ?? 3;
    const timeoutMs = this.config.timeoutMs ?? 60000;

    if (circuitBreaker.isOpen()) {
      throw new LoreError(ErrorCode.LLM_API_ERROR, `Circuit breaker open for provider ${providerId}`, 502);
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.withTimeout(fn(), timeoutMs);
        circuitBreaker.recordSuccess();
        return result;
      } catch (err: unknown) {
        const error = err as Error;

        if (!this.isRetryable(error)) {
          circuitBreaker.recordFailure();
          this.logError(providerId, error, attempt, false);
          throw error;
        }

        if (attempt === maxRetries - 1) {
          circuitBreaker.recordFailure();
          this.logError(providerId, error, attempt, true);
          throw error;
        }

        this.logError(providerId, error, attempt, true);
        await this.backoff(attempt);
      }
    }

    throw new LoreError(ErrorCode.INTERNAL_ERROR, 'LLM resilience unreachable state');
  }

  async executeStream<T>(
    providerId: string,
    fn: () => Promise<AsyncIterable<T>>
  ): Promise<AsyncIterable<T>> {
    const circuitBreaker = this.getCircuitBreaker(providerId);

    if (circuitBreaker.isOpen()) {
      throw new LoreError(ErrorCode.LLM_API_ERROR, `Circuit breaker open for provider ${providerId}`, 502);
    }

    try {
      const stream = await this.withTimeout(fn(), this.config.timeoutMs!);
      circuitBreaker.recordSuccess();
      return stream;
    } catch (err: unknown) {
      circuitBreaker.recordFailure();
      this.logError(providerId, err as Error, 0, false);
      throw err;
    }
  }

  async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeoutMs = ms ?? 60000;
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new LoreError(ErrorCode.LLM_API_ERROR, `Request timeout after ${timeoutMs}ms`, 504)), timeoutMs)
      ),
    ]);
  }

  private backoff(attempt: number): Promise<void> {
    const retryDelayMs = this.config.retryDelayMs ?? 1000;
    const delay = Math.min(retryDelayMs * Math.pow(2, attempt), 10000);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private isRetryable(err: Error): boolean {
    if (err.message.includes('timeout')) return true;
    if (err.message.includes('429')) return true;
    if (err.message.includes('rate limit')) return true;

    const errorLike = err as unknown as Record<string, unknown>;
    if (errorLike['status'] === 429) return true;
    if (errorLike['code'] === 'ECONNRESET' || errorLike['code'] === 'ECONNREFUSED') return true;
    if (errorLike['statusCode'] === 429) return true;

    return false;
  }

  private logError(providerId: string, error: Error, attempt: number, willRetry: boolean): void {
    logger.warn({
      providerId,
      error: error.message,
      attempt: attempt + 1,
      willRetry,
    }, 'LLM call error');
  }

  getCircuitBreakerState(providerId: string): 'closed' | 'open' | 'half-open' {
    return this.getCircuitBreaker(providerId).getState();
  }

  resetCircuitBreaker(providerId: string): void {
    const cb = this.circuitBreakers.get(providerId);
    if (cb) {
      cb.reset();
      logger.info({ providerId }, 'Circuit breaker reset');
    }
  }

  resetAllCircuitBreakers(): void {
    for (const [providerId, cb] of this.circuitBreakers) {
      cb.reset();
      logger.debug({ providerId }, 'Circuit breaker reset');
    }
  }
}