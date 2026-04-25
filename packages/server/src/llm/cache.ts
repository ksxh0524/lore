import type { LLMRequest, LLMResponse, CacheConfig } from './types.js';
import type { LLMCacheEntry } from '@lore/shared';
import crypto from 'crypto';
import { createLogger } from '../logger/index.js';

const logger = createLogger('llm-cache');

export class LLMCache {
  private cache: Map<string, LLMCacheEntry> = new Map();
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      ttlMs: config?.ttlMs ?? 3600000,
      maxSize: config?.maxSize ?? 1000,
      hashAlgorithm: config?.hashAlgorithm ?? 'sha256',
    };
  }

  generateKey(request: LLMRequest): string {
    const normalizedRequest = {
      model: request.model,
      messages: request.messages.map((m: { role: string; content: string | import('@lore/shared').MessageContent[] }) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      topP: request.topP,
      stopSequences: request.stopSequences,
      tools: request.tools?.map((t: { name: string; description: string; parameters: Record<string, unknown> }) => ({ name: t.name, description: t.description, parameters: t.parameters })),
    };

    const hash = crypto
      .createHash(this.config.hashAlgorithm)
      .update(JSON.stringify(normalizedRequest))
      .digest('hex');

    return hash;
  }

  get(request: LLMRequest): LLMResponse | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug({ key }, 'Cache miss');
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      logger.debug({ key }, 'Cache entry expired');
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    logger.debug({ key, hitCount: entry.hitCount }, 'Cache hit');

    return {
      ...entry.response,
      cached: true,
    };
  }

  set(request: LLMRequest, response: LLMResponse, ttlMs?: number): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(request);
    const ttl = ttlMs ?? this.config.ttlMs;

    const entry: LLMCacheEntry = {
      key,
      request,
      response: { ...response, cached: false },
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    logger.debug({ key, ttlMs: ttl }, 'Cache entry set');
  }

  delete(request: LLMRequest): boolean {
    const key = this.generateKey(request);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    totalMisses: number;
    hitRate: number;
    avgHitCount: number;
  } {
    let totalHits = 0;
    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
    }

    const entries = Array.from(this.cache.values());
    const avgHitCount = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      totalMisses: 0,
      hitRate: 0,
      avgHitCount,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug({ key: oldestKey }, 'Evicted oldest cache entry');
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info({ enabled }, 'Cache enabled state changed');
  }

  setTTL(ttlMs: number): void {
    this.config.ttlMs = ttlMs;
    logger.info({ ttlMs }, 'Cache TTL updated');
  }

  setMaxSize(maxSize: number): void {
    this.config.maxSize = maxSize;
    while (this.cache.size > maxSize) {
      this.evictOldest();
    }
    logger.info({ maxSize }, 'Cache max size updated');
  }

  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        pruned++;
      }
    }

    logger.debug({ pruned }, 'Pruned expired cache entries');
    return pruned;
  }
}