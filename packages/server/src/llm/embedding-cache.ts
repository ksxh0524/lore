import type { EmbeddingRequest, EmbeddingResponse } from './types.js';
import crypto from 'crypto';
import { createLogger } from '../logger/index.js';

const logger = createLogger('embedding-cache');

interface EmbeddingCacheEntry {
  key: string;
  input: string;
  embedding: number[];
  model: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface EmbeddingCacheConfig {
  enabled: boolean;
  ttlMs: number;
  maxSize: number;
}

export class EmbeddingCache {
  private cache: Map<string, EmbeddingCacheEntry> = new Map();
  private config: EmbeddingCacheConfig;

  constructor(config?: Partial<EmbeddingCacheConfig>) {
    this.config = {
      enabled: config?.enabled ?? true,
      ttlMs: config?.ttlMs ?? 86400000,
      maxSize: config?.maxSize ?? 5000,
    };
  }

  generateKey(text: string, model: string): string {
    const normalized = text.trim().toLowerCase();
    return crypto
      .createHash('sha256')
      .update(`${model}:${normalized}`)
      .digest('hex');
  }

  get(text: string, model: string): number[] | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(text, model);
    const entry = this.cache.get(key);

    if (!entry) {
      logger.debug({ key }, 'Embedding cache miss');
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      logger.debug({ key }, 'Embedding cache entry expired');
      this.cache.delete(key);
      return null;
    }

    entry.hitCount++;
    logger.debug({ key, hitCount: entry.hitCount }, 'Embedding cache hit');

    return entry.embedding;
  }

  getBatch(inputs: string[], model: string): { embeddings: (number[] | null)[]; uncachedIndices: number[] } {
    const embeddings: (number[] | null)[] = new Array(inputs.length).fill(null);
    const uncachedIndices: number[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      if (input !== undefined) {
        const cached = this.get(input, model);
        if (cached) {
          embeddings[i] = cached;
        } else {
          uncachedIndices.push(i);
        }
      }
    }

    logger.debug({
      total: inputs.length,
      cached: inputs.length - uncachedIndices.length,
      uncached: uncachedIndices.length,
    }, 'Batch embedding cache lookup');

    return { embeddings, uncachedIndices };
  }

  set(text: string, model: string, embedding: number[], ttlMs?: number): void {
    if (!this.config.enabled) {
      return;
    }

    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(text, model);
    const ttl = ttlMs ?? this.config.ttlMs;

    const entry: EmbeddingCacheEntry = {
      key,
      input: text,
      embedding,
      model,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    logger.debug({ key, ttlMs: ttl }, 'Embedding cache entry set');
  }

  setBatch(inputs: string[], model: string, embeddings: number[][], ttlMs?: number): void {
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const embedding = embeddings[i];
      if (input !== undefined && embedding !== undefined) {
        this.set(input, model, embedding, ttlMs);
      }
    }
    logger.debug({ count: inputs.length }, 'Batch embedding cache set');
  }

  delete(text: string, model: string): boolean {
    const key = this.generateKey(text, model);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    logger.info('Embedding cache cleared');
  }

  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    avgHitCount: number;
    oldestEntryAge: number;
  } {
    let totalHits = 0;
    let oldestTime = Infinity;

    for (const entry of this.cache.values()) {
      totalHits += entry.hitCount;
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
      }
    }

    const entries = Array.from(this.cache.values());
    const avgHitCount = entries.length > 0 ? totalHits / entries.length : 0;
    const oldestEntryAge = oldestTime === Infinity ? 0 : Date.now() - oldestTime;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      totalHits,
      avgHitCount,
      oldestEntryAge,
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
      logger.debug({ key: oldestKey }, 'Evicted oldest embedding cache entry');
    }
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    logger.info({ enabled }, 'Embedding cache enabled state changed');
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

    logger.debug({ pruned }, 'Pruned expired embedding cache entries');
    return pruned;
  }

  estimateMemoryUsage(): number {
    let totalBytes = 0;

    for (const entry of this.cache.values()) {
      const embeddingBytes = entry.embedding.length * 4;
      const textBytes = Buffer.byteLength(entry.input, 'utf8');
      totalBytes += embeddingBytes + textBytes + 100;
    }

    return totalBytes;
  }
}