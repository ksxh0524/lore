import { createLogger } from '../../logger/index.js';

const logger = createLogger('error-manager');

export type ErrorCategory = 'llm' | 'calculation' | 'data' | 'push' | 'tick' | 'unknown';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ManagedError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  timestamp: Date;
  context?: Record<string, unknown>;
  retryCount: number;
  handled: boolean;
  resolution?: string;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: ManagedError[];
  retrySuccessRate: number;
  criticalErrors: number;
}

export interface ErrorHandlerConfig {
  maxRetryCount: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetMs: number;
  logCriticalErrors: boolean;
  maxErrorHistory: number;
}

const DEFAULT_CONFIG: ErrorHandlerConfig = {
  maxRetryCount: 3,
  retryDelayMs: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 60000,
  logCriticalErrors: true,
  maxErrorHistory: 1000,
};

export class ErrorManager {
  private config: ErrorHandlerConfig;
  private errorHistory: ManagedError[] = [];
  private circuitBreakerState: Map<ErrorCategory, { open: boolean; failureCount: number; lastFailureTime: number }> = new Map();
  private retrySuccessCount: number = 0;
  private retryTotalCount: number = 0;
  private errorIdCounter: number = 0;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    const categories: ErrorCategory[] = ['llm', 'calculation', 'data', 'push', 'tick', 'unknown'];
    for (const cat of categories) {
      this.circuitBreakerState.set(cat, { open: false, failureCount: 0, lastFailureTime: 0 });
    }
  }

  handleError(error: Error, category: ErrorCategory, context?: Record<string, unknown>): ManagedError {
    const severity = this.determineSeverity(error, category);
    const managedError: ManagedError = {
      id: `err-${Date.now()}-${this.errorIdCounter++}`,
      category,
      severity,
      message: error.message,
      originalError: error,
      timestamp: new Date(),
      context,
      retryCount: 0,
      handled: false,
    };

    this.recordError(managedError);
    this.updateCircuitBreaker(category, severity);

    if (severity === 'critical' && this.config.logCriticalErrors) {
      logger.error({
        errorId: managedError.id,
        category,
        severity,
        message: error.message,
        context,
      }, 'Critical error occurred');
    }

    return managedError;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context?: Record<string, unknown>,
  ): Promise<T> {
    if (this.isCircuitBreakerOpen(category)) {
      throw new Error(`Circuit breaker open for category: ${category}`);
    }

    let lastError: ManagedError | null = null;

    for (let attempt = 0; attempt < this.config.maxRetryCount; attempt++) {
      try {
        const result = await operation();
        
        this.resetCircuitBreaker(category);
        if (attempt > 0) {
          this.retrySuccessCount++;
          this.retryTotalCount++;
          logger.debug({ category, attempt }, 'Retry succeeded');
        }
        
        return result;
      } catch (err) {
        const managedError = this.handleError(
          err instanceof Error ? err : new Error(String(err)),
          category,
          { ...context, attempt },
        );
        managedError.retryCount = attempt;
        lastError = managedError;

        if (attempt < this.config.maxRetryCount - 1) {
          await this.delay(this.config.retryDelayMs * Math.pow(2, attempt));
        }
      }
    }

    if (lastError) {
      this.retryTotalCount++;
      lastError.handled = true;
      lastError.resolution = 'retry_failed';
      throw lastError.originalError;
    }

    throw new Error('Unexpected state in retry logic');
  }

  executeWithFallback<T>(
    operation: () => Promise<T>,
    fallback: () => T,
    category: ErrorCategory,
    context?: Record<string, unknown>,
  ): Promise<T> {
    return this.executeWithRetry(operation, category, context)
      .catch(err => {
        const managedError = this.handleError(err instanceof Error ? err : new Error(String(err)), category, context);
        managedError.handled = true;
        managedError.resolution = 'fallback_used';
        
        logger.warn({ category, errorId: managedError.id }, 'Using fallback due to error');
        
        return fallback();
      });
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    if (category === 'tick' && error.message.includes('timeout')) {
      return 'high';
    }

    if (category === 'llm') {
      if (error.message.includes('rate limit') || error.message.includes('429')) {
        return 'medium';
      }
      if (error.message.includes('timeout')) {
        return 'medium';
      }
      if (error.message.includes('circuit breaker')) {
        return 'high';
      }
    }

    if (category === 'data') {
      if (error.message.includes('not found') || error.message.includes('missing')) {
        return 'medium';
      }
    }

    if (error.message.includes('critical') || error.message.includes('fatal')) {
      return 'critical';
    }

    return 'low';
  }

  private recordError(error: ManagedError): void {
    this.errorHistory.push(error);
    
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift();
    }
  }

  private updateCircuitBreaker(category: ErrorCategory, severity: ErrorSeverity): void {
    const state = this.circuitBreakerState.get(category);
    if (!state) return;

    if (severity === 'high' || severity === 'critical') {
      state.failureCount++;
      state.lastFailureTime = Date.now();

      if (state.failureCount >= this.config.circuitBreakerThreshold) {
        state.open = true;
        logger.warn({ category, failureCount: state.failureCount }, 'Circuit breaker opened');
      }
    }
  }

  private resetCircuitBreaker(category: ErrorCategory): void {
    const state = this.circuitBreakerState.get(category);
    if (!state) return;

    state.failureCount = 0;
    
    if (state.open) {
      state.open = false;
      logger.info({ category }, 'Circuit breaker reset');
    }
  }

  isCircuitBreakerOpen(category: ErrorCategory): boolean {
    const state = this.circuitBreakerState.get(category);
    if (!state) return false;

    if (state.open && Date.now() - state.lastFailureTime > this.config.circuitBreakerResetMs) {
      state.open = false;
      state.failureCount = 0;
      logger.info({ category }, 'Circuit breaker auto-reset after timeout');
      return false;
    }

    return state.open;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStats(): ErrorStats {
    const errorsByCategory: Record<ErrorCategory, number> = {
      llm: 0,
      calculation: 0,
      data: 0,
      push: 0,
      tick: 0,
      unknown: 0,
    };

    const errorsBySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const err of this.errorHistory) {
      errorsByCategory[err.category]++;
      errorsBySeverity[err.severity]++;
    }

    const criticalErrors = this.errorHistory.filter(e => e.severity === 'critical').length;
    const recentErrors = this.errorHistory.slice(-20);
    const retrySuccessRate = this.retryTotalCount > 0 ? this.retrySuccessCount / this.retryTotalCount : 0;

    return {
      totalErrors: this.errorHistory.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors,
      retrySuccessRate,
      criticalErrors,
    };
  }

  getRecentErrors(limit: number = 50): ManagedError[] {
    return this.errorHistory.slice(-limit);
  }

  getErrorsByCategory(category: ErrorCategory, limit?: number): ManagedError[] {
    const filtered = this.errorHistory.filter(e => e.category === category);
    return limit ? filtered.slice(-limit) : filtered;
  }

  getUnhandledErrors(): ManagedError[] {
    return this.errorHistory.filter(e => !e.handled);
  }

  clearHistory(): void {
    this.errorHistory = [];
    logger.info('Error history cleared');
  }

  resetCircuitBreakers(): void {
    for (const [category, state] of this.circuitBreakerState) {
      state.open = false;
      state.failureCount = 0;
      logger.debug({ category }, 'Circuit breaker reset');
    }
  }

  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info({ newConfig }, 'Error handler config updated');
  }
}