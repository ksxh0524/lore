import { createLogger } from '../../logger/index.js';

const logger = createLogger('tiered-tick-scheduler');

export interface TickLevelConfig {
  intervalMs: number;
  timeoutMs: number;
  name: string;
}

export interface TieredTickConfig {
  level0: TickLevelConfig;
  level1: TickLevelConfig;
  level2: TickLevelConfig;
  degradationThreshold: number;
  recoveryThreshold: number;
  maxMemoryMB: number;
}

const DEFAULT_CONFIG: TieredTickConfig = {
  level0: { intervalMs: 3000, timeoutMs: 2400, name: 'level0' },
  level1: { intervalMs: 15000, timeoutMs: 12000, name: 'level1' },
  level2: { intervalMs: 60000, timeoutMs: 48000, name: 'level2' },
  degradationThreshold: 3,
  recoveryThreshold: 5,
  maxMemoryMB: 500,
};

export interface TickMetrics {
  tickNumber: number;
  level: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  timeoutHit: boolean;
  agentsProcessed: number;
  eventsGenerated: number;
  llmCalls: number;
  tokensUsed: number;
}

export interface DegradationState {
  level0: { degraded: boolean; consecutiveTimeouts: number; adjustedIntervalMs: number };
  level1: { degraded: boolean; consecutiveTimeouts: number; adjustedIntervalMs: number };
  level2: { degraded: boolean; consecutiveTimeouts: number; adjustedIntervalMs: number };
}

export type TickHandler = (tick: number, level: string) => Promise<{ agentsProcessed: number; eventsGenerated: number; llmCalls: number; tokensUsed: number }>;

export class TieredTickScheduler {
  private config: TieredTickConfig;
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private tickNumbers: Map<string, number> = new Map();
  private paused: boolean = false;
  private handlers: Map<string, TickHandler> = new Map();
  private degradationState: DegradationState;
  private metricsHistory: TickMetrics[] = [];
  private readonly maxMetricsHistory = 100;

  constructor(config?: Partial<TieredTickConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.degradationState = {
      level0: { degraded: false, consecutiveTimeouts: 0, adjustedIntervalMs: this.config.level0.intervalMs },
      level1: { degraded: false, consecutiveTimeouts: 0, adjustedIntervalMs: this.config.level1.intervalMs },
      level2: { degraded: false, consecutiveTimeouts: 0, adjustedIntervalMs: this.config.level2.intervalMs },
    };
  }

  registerHandler(level: string, handler: TickHandler): void {
    this.handlers.set(level, handler);
  }

  start(): void {
    if (this.intervals.size > 0) return;

    this.startLevelTick('level0', this.degradationState.level0.adjustedIntervalMs);
    this.startLevelTick('level1', this.degradationState.level1.adjustedIntervalMs);
    this.startLevelTick('level2', this.degradationState.level2.adjustedIntervalMs);

    logger.info({
      level0Interval: this.degradationState.level0.adjustedIntervalMs,
      level1Interval: this.degradationState.level1.adjustedIntervalMs,
      level2Interval: this.degradationState.level2.adjustedIntervalMs,
    }, 'Tiered tick scheduler started');
  }

  private startLevelTick(level: string, intervalMs: number): void {
    const levelConfig = this.config[level as keyof TieredTickConfig] as TickLevelConfig;
    
    const interval = setInterval(async () => {
      if (this.paused) return;

      const tickNumber = (this.tickNumbers.get(level) || 0) + 1;
      this.tickNumbers.set(level, tickNumber);

      const startTime = Date.now();
      let timeoutHit = false;
      let result = { agentsProcessed: 0, eventsGenerated: 0, llmCalls: 0, tokensUsed: 0 };

      try {
        const handler = this.handlers.get(level);
        if (!handler) {
          logger.debug({ level, tickNumber }, 'No handler registered for level');
          return;
        }

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tick ${tickNumber} timeout`)), levelConfig.timeoutMs)
        );

        result = await Promise.race([
          handler(tickNumber, level),
          timeoutPromise,
        ]);
      } catch (err) {
        timeoutHit = true;
        logger.warn({ level, tickNumber, err }, `Tick timeout or error`);
        this.handleTimeout(level);
      }

      const endTime = Date.now();
      const durationMs = endTime - startTime;

      if (!timeoutHit) {
        this.handleSuccess(level);
      }

      const metrics: TickMetrics = {
        tickNumber,
        level,
        startTime,
        endTime,
        durationMs,
        timeoutHit,
        ...result,
      };

      this.recordMetrics(metrics);

      if (durationMs > levelConfig.timeoutMs * 0.8) {
        logger.warn({ level, tickNumber, durationMs, threshold: levelConfig.timeoutMs * 0.8 }, 'Tick took > 80% of timeout');
      }

      logger.debug({ level, tickNumber, durationMs, timeoutHit, ...result }, 'Tick completed');
    }, intervalMs);

    this.intervals.set(level, interval);
  }

  private handleTimeout(level: string): void {
    const state = this.degradationState[level as keyof DegradationState];
    state.consecutiveTimeouts++;

    if (state.consecutiveTimeouts >= this.config.degradationThreshold && !state.degraded) {
      state.degraded = true;
      const originalInterval = this.config[level as keyof TieredTickConfig] as TickLevelConfig;
      state.adjustedIntervalMs = originalInterval.intervalMs * 2;

      this.restartLevelTick(level, state.adjustedIntervalMs);

      logger.warn({
        level,
        consecutiveTimeouts: state.consecutiveTimeouts,
        newInterval: state.adjustedIntervalMs,
      }, 'Level degraded due to consecutive timeouts');
    }
  }

  private handleSuccess(level: string): void {
    const state = this.degradationState[level as keyof DegradationState];
    const wasDegraded = state.degraded;

    state.consecutiveTimeouts = 0;

    if (state.degraded) {
      state.degraded = false;
      const originalInterval = this.config[level as keyof TieredTickConfig] as TickLevelConfig;
      state.adjustedIntervalMs = originalInterval.intervalMs;

      this.restartLevelTick(level, state.adjustedIntervalMs);

      logger.info({ level, newInterval: state.adjustedIntervalMs }, 'Level recovered from degradation');
    }
  }

  private restartLevelTick(level: string, newIntervalMs: number): void {
    const existingInterval = this.intervals.get(level);
    if (existingInterval) {
      clearInterval(existingInterval);
      this.intervals.delete(level);
    }
    this.startLevelTick(level, newIntervalMs);
  }

  private recordMetrics(metrics: TickMetrics): void {
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.maxMetricsHistory) {
      this.metricsHistory.shift();
    }
  }

  stop(): void {
    for (const [level, interval] of this.intervals) {
      clearInterval(interval);
      logger.debug({ level }, 'Level tick stopped');
    }
    this.intervals.clear();
  }

  pause(): void {
    this.paused = true;
    logger.info('Scheduler paused');
  }

  resume(): void {
    this.paused = false;
    logger.info('Scheduler resumed');
  }

  getTickNumber(level?: string): number {
    if (level) {
      return this.tickNumbers.get(level) || 0;
    }
    return this.tickNumbers.get('level0') || 0;
  }

  getAllTickNumbers(): Record<string, number> {
    return {
      level0: this.tickNumbers.get('level0') || 0,
      level1: this.tickNumbers.get('level1') || 0,
      level2: this.tickNumbers.get('level2') || 0,
    };
  }

  getDegradationState(): DegradationState {
    return { ...this.degradationState };
  }

  getMetricsHistory(limit?: number): TickMetrics[] {
    return limit ? this.metricsHistory.slice(-limit) : [...this.metricsHistory];
  }

  getRecentMetrics(level: string, count: number = 10): TickMetrics[] {
    return this.metricsHistory
      .filter(m => m.level === level)
      .slice(-count);
  }

  getAverageDuration(level: string, count: number = 10): number {
    const recent = this.getRecentMetrics(level, count);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.durationMs, 0) / recent.length;
  }

  getTimeoutRate(level: string, count: number = 10): number {
    const recent = this.getRecentMetrics(level, count);
    if (recent.length === 0) return 0;
    return recent.filter(m => m.timeoutHit).length / recent.length;
  }

  isRunning(): boolean {
    return this.intervals.size > 0 && !this.paused;
  }

  getConfig(): TieredTickConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<TieredTickConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info({ newConfig }, 'Config updated');
  }

  getStats(): {
    tickNumbers: Record<string, number>;
    degradationState: DegradationState;
    recentMetrics: TickMetrics[];
    averageDurations: Record<string, number>;
    timeoutRates: Record<string, number>;
  } {
    return {
      tickNumbers: this.getAllTickNumbers(),
      degradationState: this.getDegradationState(),
      recentMetrics: this.metricsHistory.slice(-20),
      averageDurations: {
        level0: this.getAverageDuration('level0'),
        level1: this.getAverageDuration('level1'),
        level2: this.getAverageDuration('level2'),
      },
      timeoutRates: {
        level0: this.getTimeoutRate('level0'),
        level1: this.getTimeoutRate('level1'),
        level2: this.getTimeoutRate('level2'),
      },
    };
  }
}