import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const ProviderSchema = z.object({
  name: z.string(),
  type: z.enum(['openai', 'deepseek', 'kimi', 'anthropic', 'google', 'mock']),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  models: z.array(z.string()),
});

export const ConfigSchema = z.object({
  llm: z.object({
    providers: z.array(ProviderSchema).default([]),
    defaults: z.object({
      premiumModel: z.string().default('gpt-4o'),
      standardModel: z.string().default('gpt-4o-mini'),
      cheapModel: z.string().default('gpt-3.5-turbo'),
    }).default({}),
    limits: z.object({
      maxConcurrent: z.number().default(5),
      dailyBudget: z.number().nullable().default(null),
      timeoutMs: z.number().default(30000),
    }).default({}),
  }).default({}),
  world: z.object({
    defaultTickIntervalMs: z.number().default(3000),
    defaultTimeSpeed: z.number().default(60),
  }).default({}),
  server: z.object({
    port: z.number().default(3952),
    host: z.string().default('0.0.0.0'),
  }).default({}),
  dataDir: z.string().default(join(homedir(), '.lore')),
});

export type LoreConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): LoreConfig {
  const configPath = process.env.LORE_CONFIG_PATH || join(homedir(), '.lore', 'config.json');
  let raw: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try { 
      raw = JSON.parse(readFileSync(configPath, 'utf-8')); 
    } catch { /* use defaults */ }
  }
  
  const config = ConfigSchema.parse(raw);
  
  for (const provider of config.llm.providers) {
    if (!provider.apiKey) {
      const envKey = `${provider.name.toUpperCase().replace(/-/g, '_')}_API_KEY`;
      provider.apiKey = process.env[envKey] || process.env.OPENAI_API_KEY || '';
    }
  }
  
  return config;
}
