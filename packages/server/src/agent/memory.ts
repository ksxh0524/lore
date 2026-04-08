import type { AgentProfile, AgentState, AgentStats, MemoryContentType } from '@lore/shared';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';

export class MemoryManager {
  private workingMemory: string[] = [];
  private agentId: string;
  private repo: Repository;
  private llmScheduler: LLMScheduler;

  constructor(agentId: string, repo: Repository, llmScheduler: LLMScheduler) {
    this.agentId = agentId;
    this.repo = repo;
    this.llmScheduler = llmScheduler;
  }

  async add(content: string, type: MemoryContentType, importance: number): Promise<void> {
    this.workingMemory.push(content);
    if (this.workingMemory.length > 20) this.workingMemory.shift();

    const { nanoid } = await import('nanoid');
    await this.repo.insertMemory({
      id: nanoid(),
      agentId: this.agentId,
      type: 'recent',
      content,
      importance,
      memoryType: type,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  }

  getContext(maxTokens: number): string[] {
    const result: string[] = [];
    let tokens = 0;
    for (const entry of this.workingMemory) {
      const est = Math.ceil(entry.length / 4);
      if (tokens + est > maxTokens) break;
      result.push(entry);
      tokens += est;
    }
    return result;
  }

  async getRecent(limit = 10): Promise<Array<{ content: string; timestamp: Date }>> {
    const mems = await this.repo.getAgentMemories(this.agentId, limit);
    return mems.map(m => ({ content: m.content, timestamp: m.timestamp }));
  }
}
