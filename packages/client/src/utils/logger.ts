export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn';

const REPORT_ENDPOINT = '/api/client-logs';
const REPORT_THROTTLE_MS = 5000;
const REPORT_MAX_BATCH = 20;

let lastReportTime = 0;
let reportCount = 0;

interface LogEntry {
  level: LogLevel;
  context: string;
  message: string;
  data?: unknown;
  timestamp: string;
  url: string;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[currentLevel];
}

function sendReport(entry: Omit<LogEntry, 'url'> & { error?: string; stack?: string }): void {
  const now = Date.now();
  if (now - lastReportTime < REPORT_THROTTLE_MS) {
    reportCount++;
    if (reportCount > REPORT_MAX_BATCH) return;
  } else {
    lastReportTime = now;
    reportCount = 1;
  }

  const payload = {
    ...entry,
    url: window.location.href,
  };

  try {
    navigator.sendBeacon?.(
      REPORT_ENDPOINT,
      JSON.stringify(payload),
    );
  } catch {}
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

export function createLogger(context: string): Logger {
  return {
    debug(message: string, data?: unknown) {
      if (!shouldLog('debug')) return;
      console.debug(`[${context}]`, message, data ?? '');
    },
    info(message: string, data?: unknown) {
      if (!shouldLog('info')) return;
      console.info(`[${context}]`, message, data ?? '');
    },
    warn(message: string, data?: unknown) {
      if (!shouldLog('warn')) return;
      console.warn(`[${context}]`, message, data ?? '');
    },
    error(message: string, data?: unknown) {
      if (!shouldLog('error')) return;
      console.error(`[${context}]`, message, data ?? '');

      sendReport({
        level: 'error',
        context,
        message,
        data: data instanceof Error ? undefined : data,
        timestamp: new Date().toISOString(),
        error: data instanceof Error ? data.message : String(data ?? ''),
        stack: data instanceof Error ? data.stack : undefined,
      });
    },
  };
}
