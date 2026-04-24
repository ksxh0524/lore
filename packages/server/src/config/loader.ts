import { z } from 'zod';

const ProviderSchema = z.object({
  name: z.string(),
  apiKey: z.string(),
  type: z.string().optional(),
  baseUrl: z.string().optional(),
  models: z.array(z.string()).default([]),
  imageModels: z.array(z.string()).default([]),
  embeddingModel: z.string().optional(),
  priority: z.number().default(50),
  enabled: z.boolean().default(true),
});

const LLMConfigSchema = z.object({
  providers: z.array(ProviderSchema).default([]),
  defaults: z.object({
    premiumModel: z.string().default('gpt-4'),
    standardModel: z.string().default('gpt-3.5-turbo'),
    cheapModel: z.string().default('gpt-3.5-turbo'),
  }).default({}),
  limits: z.object({
    maxConcurrent: z.number().default(5),
    maxQueueSize: z.number().default(50),
    maxRetries: z.number().default(3),
    retryBaseDelayMs: z.number().default(1000),
    maxRetryDelayMs: z.number().default(10000),
    circuitBreakerThreshold: z.number().default(5),
    circuitBreakerResetMs: z.number().default(60000),
    timeoutMs: z.number().default(30000),
  }).default({}),
  prompts: z.object({
    maxMessageLength: z.number().default(2000),
    maxMessageContext: z.number().default(500),
    maxReasoningLength: z.number().default(200),
    contextTokenLimit: z.number().default(2000),
    defaultMaxTokens: z.number().default(1024),
    initMaxTokens: z.number().default(4096),
  }).default({}),
  priorities: z.object({
    userChat: z.number().default(160),
    decision: z.number().default(80),
    social: z.number().default(70),
    creative: z.number().default(50),
    worldEvent: z.number().default(40),
  }).default({}),
}).default({});

const WorldSchema = z.object({
  tickIntervalMs: z.number().default(3000),
  maxAgents: z.number().default(100),
  autoSave: z.boolean().default(true),
  autoSaveIntervalMs: z.number().default(60000),
  persistenceIntervalMs: z.number().default(10000),
  defaultTickIntervalMs: z.number().default(3000),
  tickTimeoutMs: z.number().default(30000),
  defaultTimeSpeed: z.number().default(1),
}).default({});

const AgentSchema = z.object({
  initialStats: z.object({
    mood: z.number().default(70),
    health: z.number().default(100),
    energy: z.number().default(100),
    money: z.number().default(1000),
  }).default({}),
  moneyRanges: z.object({
    userAvatar: z.number().default(5000),
    agent: z.number().default(1000),
    randomMax: z.number().default(5000),
  }).default({}),
  limits: z.object({
    maxEventHistoryPerAgent: z.number().default(1000),
    maxStateHistorySize: z.number().default(100),
    maxMemoryLimit: z.number().default(100),
  }).default({}),
}).default({});

const StatsSchema = z.object({
  bounds: z.object({
    mood: z.object({ min: z.number().default(0), max: z.number().default(100) }).default({}),
    health: z.object({ min: z.number().default(0), max: z.number().default(100) }).default({}),
    energy: z.object({ min: z.number().default(0), max: z.number().default(100) }).default({}),
  }).default({}),
  money: z.object({
    baselineForHappiness: z.number().default(5000),
  }).default({}),
}).default({});

const ApiSchema = z.object({
  defaults: z.object({
    eventLimit: z.number().default(100),
    messageLimit: z.number().default(100),
  }).default({}),
  websocket: z.object({
    heartbeatIntervalMs: z.number().default(30000),
    heartbeatTimeoutMs: z.number().default(60000),
  }).default({}),
}).default({});

const LogSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  maxFiles: z.number().default(7),
  maxSizeMB: z.number().default(50),
  console: z.boolean().default(true),
}).default({});

const ConfigSchema = z.object({
  world: WorldSchema,
  llm: LLMConfigSchema,
  agent: AgentSchema,
  stats: StatsSchema,
  api: ApiSchema,
  server: z.object({
    port: z.number().default(3952),
    host: z.string().default('localhost'),
  }),
  client: z.object({
    port: z.number().default(39528),
    host: z.string().default('localhost'),
  }),
  dataDir: z.string().default(`${process.env.HOME ?? '~'}/.lore`),
  encryption: z.object({
    key: z.string().optional(),
  }).default({}).optional(),
  log: LogSchema,
  enableMockProvider: z.boolean().default(true),
});

export type LoreConfig = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderSchema>;

export function loadConfig(): LoreConfig {
  const dataDir = process.env.LORE_DATA_DIR ?? `${process.env.HOME ?? '~'}/.lore`;
  
  return ConfigSchema.parse({
    dataDir,
    server: {
      port: process.env.LORE_SERVER_PORT ? parseInt(process.env.LORE_SERVER_PORT, 10) : undefined,
      host: process.env.LORE_SERVER_HOST,
    },
    client: {
      port: process.env.LORE_CLIENT_PORT ? parseInt(process.env.LORE_CLIENT_PORT, 10) : undefined,
    },
    encryption: process.env.LORE_ENCRYPTION_KEY ? { key: process.env.LORE_ENCRYPTION_KEY } : undefined,
    log: {
      level: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined,
      maxFiles: process.env.LOG_MAX_FILES ? parseInt(process.env.LOG_MAX_FILES, 10) : undefined,
      maxSizeMB: process.env.LOG_MAX_SIZE_MB ? parseInt(process.env.LOG_MAX_SIZE_MB, 10) : undefined,
      console: process.env.LOG_CONSOLE === 'false' ? false : undefined,
    },
    enableMockProvider: process.env.ENABLE_MOCK_PROVIDER === 'true' ? true : undefined,
  });
}

export function createDefaultConfig(): LoreConfig {
  return ConfigSchema.parse({});
}

export function validateConfig(data: unknown): LoreConfig {
  return ConfigSchema.parse(data);
}

export function mergeConfig(...configs: Partial<LoreConfig>[]): LoreConfig {
  const merged = configs.reduce((acc: LoreConfig, config: Partial<LoreConfig>) => ({
    ...acc,
    ...config,
    world: { ...acc.world, ...config.world },
    llm: {
      ...acc.llm,
      ...config.llm,
      defaults: { ...acc.llm.defaults, ...config.llm?.defaults },
      limits: { ...acc.llm.limits, ...config.llm?.limits },
      prompts: { ...acc.llm.prompts, ...config.llm?.prompts },
      priorities: { ...acc.llm.priorities, ...config.llm?.priorities },
    },
    agent: {
      ...acc.agent,
      ...config.agent,
      initialStats: { ...acc.agent.initialStats, ...config.agent?.initialStats },
      moneyRanges: { ...acc.agent.moneyRanges, ...config.agent?.moneyRanges },
      limits: { ...acc.agent.limits, ...config.agent?.limits },
    },
    stats: {
      ...acc.stats,
      ...config.stats,
      bounds: { ...acc.stats.bounds, ...config.stats?.bounds },
      money: { ...acc.stats.money, ...config.stats?.money },
    },
    api: {
      ...acc.api,
      ...config.api,
      defaults: { ...acc.api.defaults, ...config.api?.defaults },
      websocket: { ...acc.api.websocket, ...config.api?.websocket },
    },
    log: { ...acc.log, ...config.log },
  }), createDefaultConfig());
  
  return validateConfig(merged);
}