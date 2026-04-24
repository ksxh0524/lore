import pino, { type Logger, type LoggerOptions } from 'pino';
import { mkdirSync, existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';

export interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  dir: string;
  maxFiles: number;
  maxSizeMB: number;
  console: boolean;
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: 'info',
  dir: join(homedir(), '.lore', 'logs'),
  maxFiles: 7,
  maxSizeMB: 50,
  console: true,
};

let rootLogger: Logger | null = null;
let currentConfig: LoggerConfig = DEFAULT_CONFIG;

function getLogFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `lore-${year}-${month}-${day}.log`;
}

function ensureLogDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function cleanOldLogs(dir: string, maxFiles: number): void {
  if (!existsSync(dir)) return;
  
  const files = readdirSync(dir)
    .filter(f => f.startsWith('lore-') && f.endsWith('.log'))
    .map(f => ({
      name: f,
      path: join(dir, f),
      time: statSync(join(dir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  while (files.length > maxFiles) {
    const toDelete = files.pop();
    if (toDelete) {
      try {
        unlinkSync(toDelete.path);
      } catch {}
    }
  }
}

export function initLogger(config?: Partial<LoggerConfig>): Logger {
  if (rootLogger) return rootLogger;

  currentConfig = { ...DEFAULT_CONFIG, ...config };
  ensureLogDir(currentConfig.dir);
  cleanOldLogs(currentConfig.dir, currentConfig.maxFiles);

  const logFile = join(currentConfig.dir, getLogFileName());
  
  const transports: Array<{ target: string; level: string; options?: Record<string, unknown> }> = [];

  if (currentConfig.console) {
    transports.push({
      target: 'pino-pretty',
      level: currentConfig.level,
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    });
  }

  transports.push({
    target: 'pino/file',
    level: currentConfig.level,
    options: { destination: logFile },
  });

  const options: LoggerOptions = {
    level: currentConfig.level,
    transport: {
      targets: transports,
    },
  };

  rootLogger = pino(options);
  
  return rootLogger;
}

export function getLogger(): Logger {
  if (!rootLogger) {
    return initLogger();
  }
  return rootLogger;
}

export function createLogger(context: string): Logger {
  const logger = getLogger();
  return logger.child({ context });
}

export function logMetric(name: string, value: number, tags?: Record<string, string | number>): void {
  const logger = getLogger();
  logger.info({ metric: { name, value, tags } }, `METRIC: ${name}`);
}

export function logMonitorStats(stats: {
  llmCallCount: number;
  totalTokens: number;
  totalCost: number;
  droppedRequests: number;
  eventsThisTick: number;
  avgLatencyMs: number;
  queueLength: number;
  activeRequests: number;
  tickDurationMs: number;
}): void {
  const logger = getLogger();
  logger.info(
    {
      monitor: {
        llmCalls: stats.llmCallCount,
        tokens: stats.totalTokens,
        cost: stats.totalCost.toFixed(4),
        dropped: stats.droppedRequests,
        events: stats.eventsThisTick,
        avgLatencyMs: Math.round(stats.avgLatencyMs),
        queue: stats.queueLength,
        active: stats.activeRequests,
        tickMs: stats.tickDurationMs,
      },
    },
    'MONITOR: Stats'
  );
}

export { type Logger };