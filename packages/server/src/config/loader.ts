import { z } from 'zod';

const ProviderSchema = z.object({
  name: z.string(),
  apiKey: z.string(),
  baseUrl: z.string().optional(),
  models: z.array(z.object({
    name: z.string(),
    tier: z.enum(['premium', 'standard', 'cheap']),
    maxTokens: z.number(),
    cost: z.number().optional(),
  })),
  priority: z.number().default(50),
  enabled: z.boolean().default(true),
});

const WorldSchema = z.object({
  tickIntervalMs: z.number().default(3000),
  maxAgents: z.number().default(100),
  autoSave: z.boolean().default(true),
  autoSaveIntervalMs: z.number().default(60000),
  persistenceIntervalMs: z.number().default(10000),
  defaultTickIntervalMs: z.number().default(3000),
  tickTimeoutMs: z.number().default(30000),
});

const LLMConfigSchema = z.object({
  limits: z.object({
    maxConcurrent: z.number().default(5),
    maxQueueSize: z.number().default(50),
    maxRetries: z.number().default(3),
    retryBaseDelayMs: z.number().default(1000),
    maxRetryDelayMs: z.number().default(10000),
    circuitBreakerThreshold: z.number().default(5),
    circuitBreakerResetMs: z.number().default(60000),
  }),
  prompts: z.object({
    maxMessageLength: z.number().default(2000),
    maxMessageContext: z.number().default(500),
    maxReasoningLength: z.number().default(200),
    contextTokenLimit: z.number().default(2000),
    defaultMaxTokens: z.number().default(1024),
    initMaxTokens: z.number().default(4096),
  }),
  priorities: z.object({
    userChat: z.number().default(160),
    decision: z.number().default(80),
    social: z.number().default(70),
    creative: z.number().default(50),
    worldEvent: z.number().default(40),
  }),
});

const AgentSchema = z.object({
  initialStats: z.object({
    mood: z.number().default(70),
    health: z.number().default(100),
    energy: z.number().default(100),
    money: z.number().default(1000),
  }),
  moneyRanges: z.object({
    userAvatar: z.number().default(5000),
    agent: z.number().default(1000),
    randomMax: z.number().default(5000),
  }),
  limits: z.object({
    maxEventHistoryPerAgent: z.number().default(1000),
    maxStateHistorySize: z.number().default(100),
    maxMemoryLimit: z.number().default(100),
  }),
});

const StatsSchema = z.object({
  bounds: z.object({
    mood: z.object({ min: z.number().default(0), max: z.number().default(100) }),
    health: z.object({ min: z.number().default(0), max: z.number().default(100) }),
    energy: z.object({ min: z.number().default(0), max: z.number().default(100) }),
  }),
  money: z.object({
    baselineForHappiness: z.number().default(5000),
  }),
});

const ApiSchema = z.object({
  defaults: z.object({
    eventLimit: z.number().default(100),
    messageLimit: z.number().default(100),
  }),
  websocket: z.object({
    heartbeatIntervalMs: z.number().default(30000),
    heartbeatTimeoutMs: z.number().default(60000),
  }),
});

const ConfigSchema = z.object({
  providers: z.array(ProviderSchema).default([]),
  world: WorldSchema.default({}),
  llm: LLMConfigSchema.default({}),
  agent: AgentSchema.default({}),
  stats: StatsSchema.default({}),
  api: ApiSchema.default({}),
  server: z.object({
    port: z.number().default(3952),
    host: z.string().default('localhost'),
  }).default({}),
  client: z.object({
    port: z.number().default(39528),
    host: z.string().default('localhost'),
  }).default({}),
  dataDir: z.string().default('./data'),
  encryption: z.object({
    key: z.string().optional(),
  }).default({}),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  enableMockProvider: z.boolean().default(true),
});

export type LoreConfig = z.infer<typeof ConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderSchema>;

export function createDefaultConfig(): LoreConfig {
  return ConfigSchema.parse({
    providers: [],
    world: {},
    llm: {},
    agent: {},
    stats: {},
    api: {},
    server: {},
    client: {},
    dataDir: './data',
    logLevel: 'info',
    enableMockProvider: true,
  });
}

export function validateConfig(data: unknown): LoreConfig {
  return ConfigSchema.parse(data);
}

export function mergeConfig(...configs: Partial<LoreConfig>[]): LoreConfig {
  const merged = configs.reduce((acc, config) => ({
    ...acc,
    ...config,
    world: { ...acc.world, ...config.world },
    llm: {
      ...acc.llm,
      ...config.llm,
      limits: { ...acc.llm?.limits, ...config.llm?.limits },
      prompts: { ...acc.llm?.prompts, ...config.llm?.prompts },
      priorities: { ...acc.llm?.priorities, ...config.llm?.priorities },
    },
    agent: {
      ...acc.agent,
      ...config.agent,
      initialStats: { ...acc.agent?.initialStats, ...config.agent?.initialStats },
      moneyRanges: { ...acc.agent?.moneyRanges, ...config.agent?.moneyRanges },
      limits: { ...acc.agent?.limits, ...config.agent?.limits },
    },
    stats: {
      ...acc.stats,
      ...config.stats,
      bounds: { ...acc.stats?.bounds, ...config.stats?.bounds },
      money: { ...acc.stats?.money, ...config.stats?.money },
    },
    api: {
      ...acc.api,
      ...config.api,
      defaults: { ...acc.api?.defaults, ...config.api?.defaults },
      websocket: { ...acc.api?.websocket, ...config.api?.websocket },
    },
  }), createDefaultConfig());
  
  return validateConfig(merged);
}