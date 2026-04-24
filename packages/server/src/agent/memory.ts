import type { AgentProfile, AgentState, AgentStats, MemoryContentType } from '@lore/shared';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import { searchSimilar } from '../db/vector.js';
import { storeEmbedding } from '../db/vector.js';
import { nanoid } from 'nanoid';

import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('memory');

export interface MemoryContext {
  working: string[];
  recent: Array<{ content: string; importance: number; timestamp: Date }>;
  longTerm: Array<{ content: string; importance: number; similarity: number }>;
}

export class MemoryManager {
  private workingMemory: string[] = [];
  private agentId: string;
  private repo: Repository;
  private llmScheduler: LLMScheduler;
  private config: LoreConfig;

  constructor(agentId: string, repo: Repository, llmScheduler: LLMScheduler, config: LoreConfig) {
    this.agentId = agentId;
    this.repo = repo;
    this.llmScheduler = llmScheduler;
    this.config = config;
  }

  async add(content: string, type: MemoryContentType, importance: number): Promise<void> {
    this.workingMemory.push(content);
    if (this.workingMemory.length > 20) this.workingMemory.shift();

    const now = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    await this.repo.insertMemory({
      id: nanoid(),
      agentId: this.agentId,
      type: 'recent',
      content,
      importance,
      memoryType: type,
      timestamp: now,
      expiresAt
    });

    if (importance >= 0.7) {
      try {
        const embedding = await this.generateEmbedding(content);
        if (embedding && embedding.length > 0) {
          const longTermId = nanoid();
          await this.repo.insertMemory({
            id: longTermId,
            agentId: this.agentId,
            type: 'long-term',
            content,
            importance,
            memoryType: type,
            timestamp: now,
          });
          await storeEmbedding(longTermId, embedding);
        }
      } catch (err) {
        logger.warn({ agentId: this.agentId, err }, 'Failed to store embedding');
      }
    }
  }

  async getRecent(limit: number = 20): Promise<Array<{ content: string; importance: number; timestamp: Date }>> {
    const mems = await this.repo.getAgentMemories(this.agentId, limit);
    return mems.map(m => ({
      content: m.content,
      importance: m.importance ?? 0.5,
      timestamp: m.timestamp,
    }));
  }

  async getContext(maxTokens: number, query?: string): Promise<MemoryContext> {
    const result: MemoryContext = {
      working: [],
      recent: [],
      longTerm: [],
    };

    let tokensUsed = 0;

    for (const entry of this.workingMemory) {
      const tokens = this.estimateTokens(entry);
      if (tokensUsed + tokens > maxTokens) break;
      result.working.push(entry);
      tokensUsed += tokens;
    }

    const recent = await this.getRecent(50);
    for (const r of recent) {
      const tokens = this.estimateTokens(r.content);
      if (tokensUsed + tokens > maxTokens) break;
      result.recent.push(r);
      tokensUsed += tokens;
    }

    if (query && tokensUsed < maxTokens * 0.8) {
      try {
        const longTerm = await this.search(query, 5);
        for (const lt of longTerm) {
          const tokens = this.estimateTokens(lt.content);
          if (tokensUsed + tokens > maxTokens) break;
          result.longTerm.push(lt);
          tokensUsed += tokens;
        }
      } catch (err) {
        logger.warn({ agentId: this.agentId, err }, 'Failed to get long-term memories');
      }
    }

    return result;
  }

  async search(query: string, topK: number = 5): Promise<Array<{ content: string; importance: number; similarity: number }>> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      if (!queryEmbedding || queryEmbedding.length === 0) {
        return [];
      }
      const results = await searchSimilar(this.agentId, queryEmbedding, topK);
      return results.map(r => ({
        content: r.content,
        importance: r.importance ?? 0.5,
        similarity: r.similarity,
      }));
    } catch (err) {
      logger.warn({ agentId: this.agentId, err }, 'Memory search error');
      return [];
    }
  }

  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      await this.repo.deleteExpiredMemories(this.agentId, cutoff);
    } catch (err) {
      logger.warn({ agentId: this.agentId, err }, 'Memory cleanup error');
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const provider = this.llmScheduler.getProvider('');
      if (!provider) {
        return [];
      }
      return await provider.embed(text);
    } catch (err) {
      logger.warn({ agentId: this.agentId, err }, 'Failed to generate embedding');
      return [];
    }
  }
}
