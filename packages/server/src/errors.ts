export enum ErrorCode {
  WORLD_NOT_FOUND = 1001,
  WORLD_ALREADY_RUNNING = 1002,
  WORLD_PAUSED = 1003,

  AGENT_NOT_FOUND = 2001,
  AGENT_DEAD = 2002,
  AGENT_BUSY = 2003,
  AGENT_INIT_FAILED = 2004,

  LLM_API_ERROR = 3001,
  LLM_RATE_LIMITED = 3002,
  LLM_TIMEOUT = 3003,
  LLM_CONTENT_FILTERED = 3004,
  LLM_NO_PROVIDER = 3005,
  LLM_BUDGET_EXCEEDED = 3006,

  CONFIG_INVALID = 4001,
  CONFIG_API_KEY_MISSING = 4002,

  DB_ERROR = 5001,
  DB_MIGRATION_FAILED = 5002,

  INIT_PRESET_NOT_FOUND = 6001,
  INIT_GENERATION_FAILED = 6002,

  INTERNAL_ERROR = 9001,
  VALIDATION_ERROR = 9002,
}

export class LoreError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: any;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = 'LoreError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function toHttpError(code: ErrorCode): number {
  if (code >= 1000 && code < 2000) return 404;
  if (code >= 2000 && code < 3000) return 404;
  if (code >= 3000 && code < 4000) return 502;
  if (code >= 4000 && code < 5000) return 400;
  if (code >= 5000 && code < 6000) return 500;
  if (code >= 6000 && code < 7000) return 400;
  if (code === ErrorCode.VALIDATION_ERROR) return 400;
  return 500;
}
