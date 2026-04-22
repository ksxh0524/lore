import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// ============================================
// 默认配置
// ============================================

const DEFAULT_CONFIG = {
  // 服务端口 (10000+)
  server: {
    port: 39527,
    host: '0.0.0.0',
  },
  client: {
    port: 39528,
  },
  
  // 数据目录
  dataDir: join(homedir(), '.lore'),
  
  // 加密
  encryption: {
    key: 'lore-default-encryption-key-32-chars',
  },
  
  // 日志
  logLevel: 'info' as const,
  
  // 开发
  enableMockProvider: true,
};

// ============================================
// 配置 Schema
// ============================================

const ConfigSchema = z.object({
  // 服务
  server: z.object({
    port: z.number().min(10000).max(65535).default(DEFAULT_CONFIG.server.port),
    host: z.string().default(DEFAULT_CONFIG.server.host),
  }).default({}),
  
  client: z.object({
    port: z.number().min(10000).max(65535).default(DEFAULT_CONFIG.client.port),
  }).default({}),
  
  // 数据
  dataDir: z.string().default(DEFAULT_CONFIG.dataDir),
  
  // 加密
  encryption: z.object({
    key: z.string().min(32).default(DEFAULT_CONFIG.encryption.key),
  }).default({}),
  
  // 日志
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default(DEFAULT_CONFIG.logLevel),
  
  // 开发
  enableMockProvider: z.boolean().default(DEFAULT_CONFIG.enableMockProvider),
  
  // API Keys (从环境变量读取)
  apiKeys: z.object({
    dashscope: z.string().optional(),
    openai: z.string().optional(),
    gemini: z.string().optional(),
    anthropic: z.string().optional(),
  }).default({}),
});

export type LoreConfig = z.infer<typeof ConfigSchema>;

// ============================================
// 配置加载
// ============================================

let cachedConfig: LoreConfig | null = null;

export function loadConfig(): LoreConfig {
  if (cachedConfig) return cachedConfig;
  
  // 查找 .env 文件
  const envPaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '..', '.env'),
    join(homedir(), '.lore', '.env'),
  ];
  
  // 加载 .env 文件
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      loadEnvFile(envPath);
      break;
    }
  }
  
  // 从环境变量构建配置
  const rawConfig = {
    server: {
      port: parseInt(process.env.LORE_SERVER_PORT || '', 10) || DEFAULT_CONFIG.server.port,
      host: process.env.LORE_SERVER_HOST || DEFAULT_CONFIG.server.host,
    },
    client: {
      port: parseInt(process.env.LORE_CLIENT_PORT || '', 10) || DEFAULT_CONFIG.client.port,
    },
    dataDir: process.env.LORE_DATA_DIR || DEFAULT_CONFIG.dataDir,
    encryption: {
      key: process.env.LORE_ENCRYPTION_KEY || DEFAULT_CONFIG.encryption.key,
    },
    logLevel: (process.env.LOG_LEVEL as any) || DEFAULT_CONFIG.logLevel,
    enableMockProvider: process.env.ENABLE_MOCK_PROVIDER !== 'false',
    apiKeys: {
      dashscope: process.env.DASHSCOPE_API_KEY,
      openai: process.env.OPENAI_API_KEY,
      gemini: process.env.GEMINI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
    },
  };
  
  // 验证配置
  cachedConfig = ConfigSchema.parse(rawConfig);
  
  return cachedConfig;
}

function loadEnvFile(path: string): void {
  try {
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('#') || !trimmed) continue;
      
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key && value && !process.env[key]) {
          process.env[key] = value.replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {
    // 忽略错误
  }
}

// 获取配置（单例）
export const config = loadConfig();

// 重新加载配置
export function reloadConfig(): LoreConfig {
  cachedConfig = null;
  return loadConfig();
}
