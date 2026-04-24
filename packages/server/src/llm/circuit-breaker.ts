import { createLogger } from '../logger/index.js';

const logger = createLogger('circuit-breaker');

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly failureThreshold = 5,
    private readonly resetTimeoutMs = 60000,
  ) {}

  isOpen(): boolean {
    if (this.state === 'closed') return false;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    if (this.state !== 'closed') {
      logger.info({ prevState: this.state }, 'Circuit breaker recovered');
    }
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold && this.state !== 'open') {
      this.state = 'open';
      logger.warn({ failures: this.failures, threshold: this.failureThreshold }, 'Circuit breaker opened');
    }
  }

  getState(): string { return this.state; }
}
