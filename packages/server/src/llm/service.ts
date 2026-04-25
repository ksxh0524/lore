import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, LLMCallType } from './types.js';
import { LLMCache } from './cache.js';
import { EmbeddingCache } from './embedding-cache.js';
import { StatsManager, UsageRecord } from './stats-manager.js';
import { LLMResilience } from './resilience.js';
import { ProviderFactory } from './factory.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('llm-service');

export interface LLMServiceConfig {
  cacheEnabled?: boolean;
  cacheTTL?: number;
  embeddingCacheEnabled?: boolean;
  embeddingCacheTTL?: number;
  statsEnabled?: boolean;
  resilienceEnabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export class LLMService {
  private factory: ProviderFactory;
  private cache: LLMCache;
  private embeddingCache: EmbeddingCache;
  private stats: StatsManager;
  private resilience: LLMResilience;
  private config: LLMServiceConfig;

  constructor(loreConfig: LoreConfig, serviceConfig?: LLMServiceConfig) {
    this.factory = new ProviderFactory(loreConfig);
    this.config = {
      cacheEnabled: serviceConfig?.cacheEnabled ?? true,
      cacheTTL: serviceConfig?.cacheTTL ?? 3600000,
      embeddingCacheEnabled: serviceConfig?.embeddingCacheEnabled ?? true,
      embeddingCacheTTL: serviceConfig?.embeddingCacheTTL ?? 86400000,
      statsEnabled: serviceConfig?.statsEnabled ?? true,
      resilienceEnabled: serviceConfig?.resilienceEnabled ?? true,
      maxRetries: serviceConfig?.maxRetries ?? 3,
      retryDelay: serviceConfig?.retryDelay ?? 1000,
    };

    this.cache = new LLMCache({
      enabled: this.config.cacheEnabled,
      ttlMs: this.config.cacheTTL,
    });

    this.embeddingCache = new EmbeddingCache({
      enabled: this.config.embeddingCacheEnabled,
      ttlMs: this.config.embeddingCacheTTL,
    });

    this.stats = new StatsManager();
    this.resilience = new LLMResilience({
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelay,
    });
  }

  async generateText(
    request: LLMRequest,
    options?: {
      worldId?: string;
      agentId?: string;
      callType?: LLMCallType;
      useCache?: boolean;
      cacheTTL?: number;
    }
  ): Promise<LLMResponse> {
    const provider = this.factory.getProvider(request.model);
    const useCache = options?.useCache ?? this.config.cacheEnabled;

    if (useCache) {
      const cached = this.cache.get(request);
      if (cached) {
        logger.debug({ model: request.model, cached: true }, 'LLM response from cache');
        if (this.config.statsEnabled) {
          this.stats.recordUsage({
            worldId: options?.worldId,
            providerId: provider.id,
            providerType: provider.type,
            model: request.model,
            agentId: options?.agentId,
            callType: options?.callType,
            response: cached,
            success: true,
          });
        }
        return cached;
      }
    }

    const executeCall = async (): Promise<LLMResponse> => {
      return provider.generateText(request);
    };

    const response = this.config.resilienceEnabled
      ? await this.resilience.execute(provider.id, executeCall)
      : await executeCall();

    if (useCache) {
      this.cache.set(request, response, options?.cacheTTL);
    }

    if (this.config.statsEnabled) {
      this.stats.recordUsage({
        worldId: options?.worldId,
        providerId: provider.id,
        providerType: provider.type,
        model: request.model,
        agentId: options?.agentId,
        callType: options?.callType,
        response,
        success: true,
      });
    }

    logger.debug({
      model: request.model,
      provider: provider.name,
      tokens: response.usage.totalTokens,
      latency: response.latencyMs,
      cached: false,
    }, 'LLM call completed');

    return response;
  }

  async *streamText(request: LLMRequest): AsyncIterable<string> {
    const provider = this.factory.getProvider(request.model);

    if (this.config.resilienceEnabled) {
      yield* await this.resilience.executeStream(provider.id, async () => provider.streamText(request));
    } else {
      yield* provider.streamText(request);
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const provider = this.factory.getProvider(request.model);
    const input = Array.isArray(request.input) ? request.input : [request.input];

    if (this.config.embeddingCacheEnabled && input.length === 1) {
      const firstInput = input[0];
      if (firstInput !== undefined) {
        const cached = this.embeddingCache.get(firstInput, request.model);
        if (cached) {
          logger.debug({ model: request.model, cached: true }, 'Embedding from cache');
          return {
            embeddings: [cached],
            model: request.model,
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            latencyMs: 0,
          };
        }
      }
    }

    const executeEmbed = async (): Promise<EmbeddingResponse> => {
      return provider.embed(request);
    };

    const response = this.config.resilienceEnabled
      ? await this.resilience.execute(provider.id, executeEmbed)
      : await executeEmbed();

    if (this.config.embeddingCacheEnabled) {
      this.embeddingCache.setBatch(input, request.model, response.embeddings, this.config.embeddingCacheTTL);
    }

    logger.debug({
      model: request.model,
      provider: provider.name,
      count: response.embeddings.length,
      latency: response.latencyMs,
    }, 'Embedding completed');

    return response;
  }

  async embedBatch(texts: string[], model: string): Promise<number[][]> {
    if (this.config.embeddingCacheEnabled) {
      const { embeddings, uncachedIndices } = this.embeddingCache.getBatch(texts, model);

      if (uncachedIndices.length === 0) {
        logger.debug({ model, cached: true, count: texts.length }, 'All embeddings from cache');
        return embeddings as number[][];
      }

      const uncachedTexts = uncachedIndices.map(i => texts[i]).filter((t): t is string => t !== undefined);
      const provider = this.factory.getProvider(model);

      const response = this.config.resilienceEnabled
        ? await this.resilience.execute(provider.id, async () => provider.embed({ model, input: uncachedTexts }))
        : await provider.embed({ model, input: uncachedTexts });

      this.embeddingCache.setBatch(uncachedTexts, model, response.embeddings, this.config.embeddingCacheTTL);

      for (let i = 0; i < uncachedIndices.length; i++) {
        const idx = uncachedIndices[i];
        const emb = response.embeddings[i];
        if (idx !== undefined && emb !== undefined) {
          embeddings[idx] = emb;
        }
      }

      logger.debug({
        model,
        cached: texts.length - uncachedIndices.length,
        fresh: uncachedIndices.length,
      }, 'Embedding batch completed');

      return embeddings as number[][];
    }

    const provider = this.factory.getProvider(model);
    const response = await provider.embed({ model, input: texts });
    return response.embeddings;
  }

  getProvider(model: string): ILLMProvider {
    return this.factory.getProvider(model);
  }

  listModels(): string[] {
    return this.factory.listModels();
  }

  getCacheStats(): { size: number; maxSize: number; totalHits: number; avgHitCount: number } {
    return this.cache.getStats();
  }

  getEmbeddingCacheStats(): { size: number; maxSize: number; totalHits: number; avgHitCount: number } {
    return this.embeddingCache.getStats();
  }

  async getUsageStats(providerId?: string, model?: string, days?: number) {
    return this.stats.getDailyStats(providerId, model, days);
  }

  async getTotalUsageStats(providerId?: string, model?: string) {
    return this.stats.getTotalStats(providerId, model);
  }

  clearCache(): void {
    this.cache.clear();
    this.embeddingCache.clear();
    logger.info('All caches cleared');
  }

  setCacheEnabled(enabled: boolean): void {
    this.cache.setEnabled(enabled);
    this.config.cacheEnabled = enabled;
  }

  setEmbeddingCacheEnabled(enabled: boolean): void {
    this.embeddingCache.setEnabled(enabled);
    this.config.embeddingCacheEnabled = enabled;
  }

  setCacheTTL(ttlMs: number): void {
    this.cache.setTTL(ttlMs);
    this.config.cacheTTL = ttlMs;
  }

  pruneExpiredCache(): { llmCache: number; embeddingCache: number } {
    return {
      llmCache: this.cache.pruneExpired(),
      embeddingCache: this.embeddingCache.pruneExpired(),
    };
  }

  destroy(): void {
    this.stats.destroy();
    this.cache.clear();
    this.embeddingCache.clear();
    logger.info('LLM service destroyed');
  }
}

let globalLLMService: LLMService | null = null;

export function initLLMService(config: LoreConfig, serviceConfig?: LLMServiceConfig): LLMService {
  globalLLMService = new LLMService(config, serviceConfig);
  return globalLLMService;
}

export function getLLMService(): LLMService {
  if (!globalLLMService) {
    throw new Error('LLM service not initialized. Call initLLMService first.');
  }
  return globalLLMService;
}