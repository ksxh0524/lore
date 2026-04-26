import { db } from '../db/index.js';
import { llmUsageLogs, llmDailyStats, modelPricing } from '../db/schema.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';
import type { LLMResponse, ProviderType } from '../llm/types.js';
import type { LLMCallType } from './types.js';
import { eq, and, sql } from 'drizzle-orm';

const logger = createLogger('stats-manager');

export interface UsageRecord {
  worldId?: string;
  providerId: string;
  providerType: ProviderType;
  model: string;
  agentId?: string;
  callType?: LLMCallType;
  response: LLMResponse;
  success: boolean;
  errorMessage?: string;
}

export interface DailyStats {
  providerId: string;
  providerType: ProviderType;
  model: string;
  date: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHits: number;
  cacheMisses: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  minLatencyMs: number;
  errorCount: number;
  estimatedCost: number;
}

export interface ModelPrice {
  promptPricePerMillion: number;
  completionPricePerMillion: number;
  currency: string;
}

const DEFAULT_PRICING: Record<string, ModelPrice> = {
  'gpt-4': { promptPricePerMillion: 30, completionPricePerMillion: 60, currency: 'USD' },
  'gpt-4-turbo': { promptPricePerMillion: 10, completionPricePerMillion: 30, currency: 'USD' },
  'gpt-3.5-turbo': { promptPricePerMillion: 0.5, completionPricePerMillion: 1.5, currency: 'USD' },
  'claude-3-opus': { promptPricePerMillion: 15, completionPricePerMillion: 75, currency: 'USD' },
  'claude-3-sonnet': { promptPricePerMillion: 3, completionPricePerMillion: 15, currency: 'USD' },
  'claude-3-haiku': { promptPricePerMillion: 0.25, completionPricePerMillion: 1.25, currency: 'USD' },
  'claude-sonnet-4': { promptPricePerMillion: 3, completionPricePerMillion: 15, currency: 'USD' },
  'claude-opus-4': { promptPricePerMillion: 15, completionPricePerMillion: 75, currency: 'USD' },
  'gemini-1.5-pro': { promptPricePerMillion: 1.25, completionPricePerMillion: 5, currency: 'USD' },
  'gemini-1.5-flash': { promptPricePerMillion: 0.075, completionPricePerMillion: 0.3, currency: 'USD' },
  'gemini-2.0-flash': { promptPricePerMillion: 0.1, completionPricePerMillion: 0.4, currency: 'USD' },
  'deepseek-chat': { promptPricePerMillion: 0.14, completionPricePerMillion: 0.28, currency: 'USD' },
  'deepseek-coder': { promptPricePerMillion: 0.14, completionPricePerMillion: 0.28, currency: 'USD' },
  'glm-4': { promptPricePerMillion: 0.1, completionPricePerMillion: 0.1, currency: 'CNY' },
  'glm-4-flash': { promptPricePerMillion: 0.001, completionPricePerMillion: 0.001, currency: 'CNY' },
  'qwen-turbo': { promptPricePerMillion: 0.002, completionPricePerMillion: 0.006, currency: 'CNY' },
  'qwen-plus': { promptPricePerMillion: 0.004, completionPricePerMillion: 0.012, currency: 'CNY' },
  'qwen-max': { promptPricePerMillion: 0.04, completionPricePerMillion: 0.12, currency: 'CNY' },
};

export class StatsManager {
  private pendingRecords: UsageRecord[] = [];
  private flushInterval: ReturnType<typeof setInterval>;
  private flushBatchSize: number = 100;

  constructor() {
    this.flushInterval = setInterval(() => this.flush(), 60000);
  }

  recordUsage(record: UsageRecord): void {
    this.pendingRecords.push(record);

    if (this.pendingRecords.length >= this.flushBatchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.pendingRecords.length === 0) return;

    const records = [...this.pendingRecords];
    this.pendingRecords = [];

    try {
      const timestamp = Date.now();
      const logEntries = records.map(r => ({
        id: nanoid(),
        worldId: r.worldId,
        providerId: r.providerId,
        providerType: r.providerType,
        model: r.model,
        agentId: r.agentId,
        callType: r.callType,
        promptTokens: r.response.usage.promptTokens,
        completionTokens: r.response.usage.completionTokens,
        totalTokens: r.response.usage.totalTokens ?? r.response.usage.promptTokens + r.response.usage.completionTokens,
        latencyMs: r.response.latencyMs,
        cached: r.response.cached ?? false,
        success: r.success,
        errorMessage: r.errorMessage,
        timestamp: new Date(timestamp),
      }));

      await db.insert(llmUsageLogs).values(logEntries);

      for (const record of records) {
        await this.updateDailyStats(record);
      }

      logger.debug({ count: records.length }, 'Flushed usage records');
    } catch (error) {
      logger.error({ error, count: records.length }, 'Failed to flush usage records');
    }
  }

  private async updateDailyStats(record: UsageRecord): Promise<void> {
    const date = new Date().toISOString().split('T')[0];
    const statsId = `${record.providerId}:${record.model}:${date}`;

    const existing = await db
      .select()
      .from(llmDailyStats)
      .where(and(eq(llmDailyStats.id, statsId)))
      .limit(1);

    const totalTokens = record.response.usage.totalTokens ?? record.response.usage.promptTokens + record.response.usage.completionTokens;
    const isCached = record.response.cached ?? false;
    const cost = this.calculateCost(record.model, record.response.usage);

    if (existing.length > 0) {
      const current = existing[0]!;
      const newCount = current.requestCount + 1;
      const newPromptTokens = current.promptTokens + record.response.usage.promptTokens;
      const newCompletionTokens = current.completionTokens + record.response.usage.completionTokens;
      const newTotalTokens = current.totalTokens + totalTokens;
      const newCacheHits = (current.cacheHits ?? 0) + (isCached ? 1 : 0);
      const newCacheMisses = (current.cacheMisses ?? 0) + (isCached ? 0 : 1);
      const newAvgLatency = (current.avgLatencyMs * current.requestCount + record.response.latencyMs) / newCount;
      const newMaxLatency = Math.max(current.maxLatencyMs, record.response.latencyMs);
      const newMinLatency = Math.min(current.minLatencyMs, record.response.latencyMs);
      const newErrorCount = (current.errorCount ?? 0) + (record.success ? 0 : 1);
      const newCost = (current.estimatedCost ?? 0) + cost;

      await db
        .update(llmDailyStats)
        .set({
          requestCount: newCount,
          promptTokens: newPromptTokens,
          completionTokens: newCompletionTokens,
          totalTokens: newTotalTokens,
          cacheHits: newCacheHits,
          cacheMisses: newCacheMisses,
          avgLatencyMs: newAvgLatency,
          maxLatencyMs: newMaxLatency,
          minLatencyMs: newMinLatency,
          errorCount: newErrorCount,
          estimatedCost: newCost,
          updatedAt: new Date(),
        })
        .where(eq(llmDailyStats.id, statsId));
    } else {
      await db.insert(llmDailyStats).values({
        id: statsId!,
        providerId: record.providerId,
        providerType: record.providerType,
        model: record.model,
        date: date!,
        requestCount: 1,
        promptTokens: record.response.usage.promptTokens,
        completionTokens: record.response.usage.completionTokens,
        totalTokens: totalTokens,
        cacheHits: isCached ? 1 : 0,
        cacheMisses: isCached ? 0 : 1,
        avgLatencyMs: record.response.latencyMs,
        maxLatencyMs: record.response.latencyMs,
        minLatencyMs: record.response.latencyMs,
        errorCount: record.success ? 0 : 1,
        estimatedCost: cost,
        updatedAt: new Date(),
      });
    }
  }

  calculateCost(model: string, usage: { promptTokens: number; completionTokens: number }): number {
    const pricing = DEFAULT_PRICING[model] ?? { promptPricePerMillion: 0, completionPricePerMillion: 0 };
    const promptCost = (usage.promptTokens / 1_000_000) * pricing.promptPricePerMillion;
    const completionCost = (usage.completionTokens / 1_000_000) * pricing.completionPricePerMillion;
    return promptCost + completionCost;
  }

  async getDailyStats(providerId?: string, model?: string, days?: number): Promise<DailyStats[]> {
    const conditions = [];
    if (providerId) conditions.push(eq(llmDailyStats.providerId, providerId));
    if (model) conditions.push(eq(llmDailyStats.model, model));

    const baseQuery = db.select().from(llmDailyStats);
    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    const results = await query;

    const typedResults: DailyStats[] = results.map(r => ({
      providerId: r.providerId,
      providerType: r.providerType as ProviderType,
      model: r.model,
      date: r.date,
      requestCount: r.requestCount,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      cacheHits: r.cacheHits ?? 0,
      cacheMisses: r.cacheMisses ?? 0,
      avgLatencyMs: r.avgLatencyMs,
      maxLatencyMs: r.maxLatencyMs,
      minLatencyMs: r.minLatencyMs,
      errorCount: r.errorCount ?? 0,
      estimatedCost: r.estimatedCost ?? 0,
    }));

    if (days) {
      return typedResults.slice(0, days);
    }
    return typedResults;
  }

  async getTotalStats(providerId?: string, model?: string): Promise<{
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCacheHits: number;
    totalCacheMisses: number;
    avgLatencyMs: number;
    totalErrors: number;
    totalCost: number;
  }> {
    const conditions = [];
    if (providerId) conditions.push(eq(llmDailyStats.providerId, providerId));
    if (model) conditions.push(eq(llmDailyStats.model, model));

    const baseQuery = db.select().from(llmDailyStats);
    const query = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

    const results = await query;

    return {
      totalRequests: results.reduce((sum, r) => sum + r.requestCount, 0),
      totalPromptTokens: results.reduce((sum, r) => sum + r.promptTokens, 0),
      totalCompletionTokens: results.reduce((sum, r) => sum + r.completionTokens, 0),
      totalTokens: results.reduce((sum, r) => sum + r.totalTokens, 0),
      totalCacheHits: results.reduce((sum, r) => sum + (r.cacheHits ?? 0), 0),
      totalCacheMisses: results.reduce((sum, r) => sum + (r.cacheMisses ?? 0), 0),
      avgLatencyMs: results.length > 0 ? results.reduce((sum, r) => sum + r.avgLatencyMs * r.requestCount, 0) / results.reduce((sum, r) => sum + r.requestCount, 0) : 0,
      totalErrors: results.reduce((sum, r) => sum + (r.errorCount ?? 0), 0),
      totalCost: results.reduce((sum, r) => sum + (r.estimatedCost ?? 0), 0),
    };
  }

  async setModelPricing(providerType: ProviderType, model: string, promptPrice: number, completionPrice: number, currency: string = 'USD'): Promise<void> {
    const id = `${providerType}:${model}`;

    await db
      .insert(modelPricing)
      .values({
        id,
        providerType,
        model,
        promptPricePerMillion: promptPrice,
        completionPricePerMillion: completionPrice,
        currency,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: modelPricing.id,
        set: {
          promptPricePerMillion: promptPrice,
          completionPricePerMillion: completionPrice,
          currency,
          updatedAt: new Date(),
        },
      });

    DEFAULT_PRICING[model] = { promptPricePerMillion: promptPrice, completionPricePerMillion: completionPrice, currency };
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}