import { createLogger } from '../../logger/index.js';
import type { TickMetrics } from '../scheduler/tiered-tick-scheduler.js';
import type { ErrorStats } from './error-manager.js';

const logger = createLogger('performance-monitor');

export interface PerformanceThresholds {
  tickDurationWarningMs: number;
  tickDurationCriticalMs: number;
  memoryWarningMB: number;
  memoryCriticalMB: number;
  llmQueueWarning: number;
  llmQueueCritical: number;
  tokenDailyWarning: number;
  tokenDailyCritical: number;
  costDailyWarning: number;
  costDailyCritical: number;
  errorRateWarning: number;
  errorRateCritical: number;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  tickDurationWarningMs: 1500,
  tickDurationCriticalMs: 2400,
  memoryWarningMB: 400,
  memoryCriticalMB: 500,
  llmQueueWarning: 30,
  llmQueueCritical: 45,
  tokenDailyWarning: 200000000,
  tokenDailyCritical: 250000000,
  costDailyWarning: 8,
  costDailyCritical: 10,
  errorRateWarning: 0.05,
  errorRateCritical: 0.10,
};

export type AlertLevel = 'info' | 'warning' | 'critical';

export interface PerformanceAlert {
  id: string;
  level: AlertLevel;
  type: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  tickMetrics: {
    avgDurationLevel0: number;
    avgDurationLevel1: number;
    avgDurationLevel2: number;
    timeoutRateLevel0: number;
    timeoutRateLevel1: number;
  };
  memoryUsage: {
    heapUsedMB: number;
    heapTotalMB: number;
    externalMB: number;
    rssMB: number;
  };
  llmMetrics: {
    queueLength: number;
    activeRequests: number;
    totalTokensUsed: number;
    batchTokenSaved: number;
  };
  errorMetrics: ErrorStats;
  costMetrics: {
    estimatedDailyCost: number;
  };
}

export class PerformanceMonitor {
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private tokenUsageToday: number = 0;
  private costToday: number = 0;
  private tickHistory: Map<string, TickMetrics[]> = new Map();
  private maxAlertHistory: number = 100;
  private maxSnapshotHistory: number = 24;
  private alertIdCounter: number = 0;
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private degradationCallbacks: Map<string, () => void> = new Map();

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  startMonitoring(checkIntervalMs: number = 60000): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.performCheck();
    }, checkIntervalMs);

    logger.info({ intervalMs: checkIntervalMs }, 'Performance monitoring started');
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      logger.info('Performance monitoring stopped');
    }
  }

  registerDegradationCallback(type: string, callback: () => void): void {
    this.degradationCallbacks.set(type, callback);
    logger.debug({ type }, 'Degradation callback registered');
  }

  recordTickMetrics(metrics: TickMetrics): void {
    const level = metrics.level;
    if (!this.tickHistory.has(level)) {
      this.tickHistory.set(level, []);
    }
    
    const history = this.tickHistory.get(level)!;
    history.push(metrics);
    
    if (history.length > 100) {
      history.shift();
    }

    if (metrics.durationMs > this.thresholds.tickDurationCriticalMs) {
      this.triggerAlert('critical', 'tick_duration', 
        `Tick ${metrics.level} duration critical: ${metrics.durationMs}ms`, 
        metrics.durationMs, this.thresholds.tickDurationCriticalMs);
    } else if (metrics.durationMs > this.thresholds.tickDurationWarningMs) {
      this.triggerAlert('warning', 'tick_duration',
        `Tick ${metrics.level} duration warning: ${metrics.durationMs}ms`,
        metrics.durationMs, this.thresholds.tickDurationWarningMs);
    }
  }

  recordTokenUsage(tokens: number, estimatedCost: number): void {
    this.tokenUsageToday += tokens;
    this.costToday += estimatedCost;

    if (this.tokenUsageToday > this.thresholds.tokenDailyCritical) {
      this.triggerAlert('critical', 'token_usage',
        `Daily token usage critical: ${this.tokenUsageToday}`,
        this.tokenUsageToday, this.thresholds.tokenDailyCritical);
      this.triggerDegradation('token_usage');
    } else if (this.tokenUsageToday > this.thresholds.tokenDailyWarning) {
      this.triggerAlert('warning', 'token_usage',
        `Daily token usage warning: ${this.tokenUsageToday}`,
        this.tokenUsageToday, this.thresholds.tokenDailyWarning);
    }

    if (this.costToday > this.thresholds.costDailyCritical) {
      this.triggerAlert('critical', 'cost',
        `Daily cost critical: $${this.costToday.toFixed(2)}`,
        this.costToday, this.thresholds.costDailyCritical);
      this.triggerDegradation('cost');
    }
  }

  recordLLMQueueStats(queueLength: number, activeRequests: number): void {
    if (queueLength > this.thresholds.llmQueueCritical) {
      this.triggerAlert('critical', 'llm_queue',
        `LLM queue critical: ${queueLength} pending`,
        queueLength, this.thresholds.llmQueueCritical);
      this.triggerDegradation('llm_queue');
    } else if (queueLength > this.thresholds.llmQueueWarning) {
      this.triggerAlert('warning', 'llm_queue',
        `LLM queue warning: ${queueLength} pending`,
        queueLength, this.thresholds.llmQueueWarning);
    }
  }

  recordErrorStats(errorStats: ErrorStats): void {
    const totalOperations = errorStats.totalErrors + (errorStats.retrySuccessRate > 0 ? 100 : 0);
    const errorRate = totalOperations > 0 ? errorStats.totalErrors / totalOperations : 0;

    if (errorRate > this.thresholds.errorRateCritical) {
      this.triggerAlert('critical', 'error_rate',
        `Error rate critical: ${(errorRate * 100).toFixed(1)}%`,
        errorRate, this.thresholds.errorRateCritical);
      this.triggerDegradation('error_rate');
    } else if (errorRate > this.thresholds.errorRateWarning) {
      this.triggerAlert('warning', 'error_rate',
        `Error rate warning: ${(errorRate * 100).toFixed(1)}%`,
        errorRate, this.thresholds.errorRateWarning);
    }

    if (errorStats.criticalErrors > 0) {
      this.triggerAlert('critical', 'critical_errors',
        `${errorStats.criticalErrors} critical errors occurred`,
        errorStats.criticalErrors, 1);
    }
  }

  private performCheck(): void {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
    const heapTotalMB = memoryUsage.heapTotal / (1024 * 1024);
    const rssMB = memoryUsage.rss / (1024 * 1024);

    if (heapUsedMB > this.thresholds.memoryCriticalMB) {
      this.triggerAlert('critical', 'memory',
        `Memory usage critical: ${heapUsedMB.toFixed(1)}MB`,
        heapUsedMB, this.thresholds.memoryCriticalMB);
      this.triggerDegradation('memory');
    } else if (heapUsedMB > this.thresholds.memoryWarningMB) {
      this.triggerAlert('warning', 'memory',
        `Memory usage warning: ${heapUsedMB.toFixed(1)}MB`,
        heapUsedMB, this.thresholds.memoryWarningMB);
    }

    const tickMetrics = {
      avgDurationLevel0: this.calculateAvgDuration('level0'),
      avgDurationLevel1: this.calculateAvgDuration('level1'),
      avgDurationLevel2: this.calculateAvgDuration('level2'),
      timeoutRateLevel0: this.calculateTimeoutRate('level0'),
      timeoutRateLevel1: this.calculateTimeoutRate('level1'),
    };

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      tickMetrics,
      memoryUsage: {
        heapUsedMB,
        heapTotalMB,
        externalMB: memoryUsage.external / (1024 * 1024),
        rssMB,
      },
      llmMetrics: {
        queueLength: 0,
        activeRequests: 0,
        totalTokensUsed: this.tokenUsageToday,
        batchTokenSaved: 0,
      },
      errorMetrics: {
        totalErrors: 0,
        errorsByCategory: { llm: 0, calculation: 0, data: 0, push: 0, tick: 0, unknown: 0 },
        errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        recentErrors: [],
        retrySuccessRate: 0,
        criticalErrors: 0,
      },
      costMetrics: {
        estimatedDailyCost: this.costToday,
      },
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshotHistory) {
      this.snapshots.shift();
    }

    logger.debug({
      heapUsedMB: heapUsedMB.toFixed(1),
      tokenUsage: this.tokenUsageToday,
      costToday: this.costToday.toFixed(2),
      avgTickLevel0: tickMetrics.avgDurationLevel0.toFixed(0),
    }, 'Performance check completed');

    this.resolveOldAlerts();
  }

  private calculateAvgDuration(level: string): number {
    const history = this.tickHistory.get(level);
    if (!history || history.length === 0) return 0;
    
    const recent = history.slice(-10);
    return recent.reduce((sum, m) => sum + m.durationMs, 0) / recent.length;
  }

  private calculateTimeoutRate(level: string): number {
    const history = this.tickHistory.get(level);
    if (!history || history.length === 0) return 0;
    
    const recent = history.slice(-20);
    return recent.filter(m => m.timeoutHit).length / recent.length;
  }

  private triggerAlert(level: AlertLevel, type: string, message: string, value: number, threshold: number): void {
    const existingAlert = this.alerts.find(a => a.type === type && !a.resolved);
    
    if (existingAlert && existingAlert.level === level) {
      existingAlert.value = value;
      existingAlert.timestamp = new Date();
      return;
    }

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${this.alertIdCounter++}`,
      level,
      type,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlertHistory) {
      this.alerts.shift();
    }

    if (level === 'critical') {
      logger.error({ type, value, threshold, message }, 'Critical performance alert');
    } else if (level === 'warning') {
      logger.warn({ type, value, threshold, message }, 'Performance warning');
    }
  }

  private triggerDegradation(type: string): void {
    const callback = this.degradationCallbacks.get(type);
    if (callback) {
      logger.info({ type }, 'Triggering degradation callback');
      callback();
    }
  }

  private resolveOldAlerts(): void {
    const now = Date.now();
    const resolveThresholdMs = 5 * 60 * 1000;

    for (const alert of this.alerts) {
      if (!alert.resolved && now - alert.timestamp.getTime() > resolveThresholdMs) {
        alert.resolved = true;
        alert.resolvedAt = new Date();
        logger.debug({ type: alert.type, level: alert.level }, 'Alert auto-resolved');
      }
    }
  }

  getAlerts(level?: AlertLevel, limit?: number): PerformanceAlert[] {
    let filtered = this.alerts;
    if (level) {
      filtered = filtered.filter(a => a.level === level);
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  getSnapshots(limit?: number): PerformanceSnapshot[] {
    return limit ? this.snapshots.slice(-limit) : [...this.snapshots];
  }

  getLatestSnapshot(): PerformanceSnapshot | undefined {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : undefined;
  }

  getDailyStats(): {
    tokenUsage: number;
    estimatedCost: number;
    avgTickDuration: number;
    errorCount: number;
  } {
    return {
      tokenUsage: this.tokenUsageToday,
      estimatedCost: this.costToday,
      avgTickDuration: this.calculateAvgDuration('level0'),
      errorCount: this.alerts.filter(a => a.type === 'error_rate').length,
    };
  }

  resetDailyStats(): void {
    this.tokenUsageToday = 0;
    this.costToday = 0;
    logger.info('Daily stats reset');
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info({ newThresholds }, 'Performance thresholds updated');
  }

  getReport(): string {
    const latest = this.getLatestSnapshot();
    const activeAlerts = this.getActiveAlerts();

    let report = '=== Performance Report ===\n';
    report += `Time: ${new Date().toISOString()}\n\n`;

    if (latest) {
      report += 'Tick Performance:\n';
      report += `  Level0 avg: ${latest.tickMetrics.avgDurationLevel0.toFixed(0)}ms\n`;
      report += `  Level1 avg: ${latest.tickMetrics.avgDurationLevel1.toFixed(0)}ms\n`;
      report += `  Level2 avg: ${latest.tickMetrics.avgDurationLevel2.toFixed(0)}ms\n`;
      report += `  Timeout rate: ${(latest.tickMetrics.timeoutRateLevel0 * 100).toFixed(1)}%\n\n`;

      report += 'Memory Usage:\n';
      report += `  Heap: ${latest.memoryUsage.heapUsedMB.toFixed(1)}/${latest.memoryUsage.heapTotalMB.toFixed(1)}MB\n`;
      report += `  RSS: ${latest.memoryUsage.rssMB.toFixed(1)}MB\n\n`;

      report += 'Daily Usage:\n';
      report += `  Tokens: ${latest.llmMetrics.totalTokensUsed}\n`;
      report += `  Estimated Cost: $${latest.costMetrics.estimatedDailyCost.toFixed(2)}\n\n`;
    }

    if (activeAlerts.length > 0) {
      report += 'Active Alerts:\n';
      for (const alert of activeAlerts) {
        report += `  [${alert.level}] ${alert.type}: ${alert.message}\n`;
      }
    } else {
      report += 'No active alerts.\n';
    }

    return report;
  }
}