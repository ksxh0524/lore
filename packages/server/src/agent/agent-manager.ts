import { nanoid } from 'nanoid';
import type { AgentType, AgentProfile, AgentState, AgentStats } from '@lore/shared';
import type { AgentRuntime } from './agent-runtime.js';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { LoreConfig } from '../config/loader.js';

export class AgentManager {
  private agents = new Map<string, AgentRuntime>();
  private repo: Repository;
  private llmScheduler: LLMScheduler;
  private config: LoreConfig;

  constructor(repo: Repository, llmScheduler: LLMScheduler, config: LoreConfig) {
    this.repo = repo;
    this.llmScheduler = llmScheduler;
    this.config = config;
  }

  async createAgent(worldId: string, type: AgentType, profile: AgentProfile): Promise<AgentRuntime> {
    const { AgentRuntime: AR } = await import('./agent-runtime.js');
    const id = nanoid();
    const agent = new AR(id, worldId, type, profile, this.repo, this.llmScheduler, this.config);
    this.agents.set(id, agent);
    await this.repo.createAgent({
      id, worldId, type, profile,
      state: agent.state,
      stats: agent.stats,
    });
    return agent;
  }

  get(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  async getWorldAgents(worldId: string): Promise<AgentRuntime[]> {
    const cached = [...this.agents.values()].filter(a => a.worldId === worldId);
    if (cached.length > 0) return cached;

    const rows = await this.repo.getWorldAgents(worldId);
    const { AgentRuntime: AR } = await import('./agent-runtime.js');
    const result: AgentRuntime[] = [];
    for (const row of rows) {
      let agent = this.agents.get(row.id);
      if (!agent) {
        agent = AR.deserialize({
          id: row.id, worldId: row.worldId, type: row.type,
          profile: row.profile as AgentProfile,
          state: row.state as AgentState,
          stats: row.stats as AgentStats,
          relationships: [],
        }, this.repo, this.llmScheduler, this.config);
        this.agents.set(row.id, agent);
      }
      result.push(agent);
    }
    return result;
  }

  async tickAll(worldState: { currentTime: string; day: number; currentTick: number }, llmScheduler: LLMScheduler, config: LoreConfig): Promise<void> {
    const all = [...this.agents.values()].filter(a => a.state.status !== 'dead');
    for (const agent of all) {
      try {
        await agent.tick(worldState, llmScheduler, config);
      } catch (err) {
        console.error(`Agent ${agent.id} tick failed:`, err);
      }
    }
  }

  async persistAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      try {
        await this.repo.updateAgent(agent.id, {
          state: agent.state,
          stats: agent.stats,
        });
      } catch (err) {
        console.error(`Persist agent ${agent.id} failed:`, err);
      }
    }
  }

  async destroy(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      agent.state.status = 'dead';
      await this.repo.updateAgent(id, { state: agent.state });
      this.agents.delete(id);
    }
  }
}
