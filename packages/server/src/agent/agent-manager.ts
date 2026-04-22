import { nanoid } from 'nanoid';
import type { AgentType, AgentProfile, AgentState, AgentStats } from '@lore/shared';
import { AgentRuntime } from './agent-runtime.js';
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

  async createAgent(
    worldId: string,
    type: AgentType,
    profile: AgentProfile,
    initialStats?: AgentStats,
  ): Promise<AgentRuntime> {
    const id = nanoid();
    const agent = new AgentRuntime(id, worldId, type, profile, this.repo, this.llmScheduler, this.config, initialStats);
    this.agents.set(id, agent);

    await this.repo.createAgent({
      id,
      worldId,
      type,
      profile,
      state: agent.state,
      stats: agent.stats,
    });

    return agent;
  }

  get(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  async getWorldAgents(worldId: string): Promise<AgentRuntime[]> {
    const cached = [...this.agents.values()].filter((a) => a.worldId === worldId);
    if (cached.length > 0) return cached;

    const rows = await this.repo.getWorldAgents(worldId);
    const result: AgentRuntime[] = [];

    for (const row of rows) {
      let agent = this.agents.get(row.id);
      if (!agent) {
        agent = AgentRuntime.deserialize(
          {
            id: row.id,
            worldId: row.worldId,
            type: row.type as AgentType,
            profile: row.profile as AgentProfile,
            state: row.state as AgentState,
            stats: row.stats as AgentStats,
            relationships: [],
          },
          this.repo,
          this.llmScheduler,
          this.config,
        );
        this.agents.set(row.id, agent);
      }
      result.push(agent);
    }

    return result;
  }

  async tickAll(
    worldState: { currentTime: string; day: number; currentTick: number },
    llmScheduler: LLMScheduler,
    config: LoreConfig,
  ): Promise<void> {
    const all = [...this.agents.values()].filter((a) => a.status !== 'dead');
    const batchSize = 3;

    for (let i = 0; i < all.length; i += batchSize) {
      const batch = all.slice(i, i + batchSize);
      await Promise.allSettled(batch.map((agent) => agent.tick(worldState, llmScheduler, config)));
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

  getAliveCount(): number {
    return [...this.agents.values()].filter((a) => a.status !== 'dead').length;
  }

  async destroy(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      agent.transitionTo('dead', 'explicit_destroy');
      await this.repo.updateAgent(id, {
        state: agent.state,
        alive: false,
        diedAt: new Date(),
      });
      this.agents.delete(id);
    }
  }

  async lazyCreateAgent(
    worldId: string,
    type: AgentType,
    profile: AgentProfile,
    initialStats?: AgentStats,
  ): Promise<AgentRuntime> {
    const existing = await this.repo.getWorldAgents(worldId);
    const match = existing.find((a) => (a.profile as AgentProfile).name === profile.name);

    if (match) {
      let agent = this.agents.get(match.id);
      if (!agent) {
        agent = AgentRuntime.deserialize(
          {
            id: match.id,
            worldId: match.worldId,
            type: match.type as AgentType,
            profile: match.profile as AgentProfile,
            state: match.state as AgentState,
            stats: match.stats as AgentStats,
            relationships: [],
          },
          this.repo,
          this.llmScheduler,
          this.config,
        );
        this.agents.set(match.id, agent);
      }
      return agent;
    }

    return this.createAgent(worldId, type, profile, initialStats);
  }

  async persist(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (agent) {
      await this.repo.updateAgent(id, { state: agent.state, stats: agent.stats });
    }
  }

  async restore(id: string): Promise<AgentRuntime | null> {
    if (this.agents.has(id)) return this.agents.get(id)!;

    const row = await this.repo.getAgent(id);
    if (!row) return null;

    const agent = AgentRuntime.deserialize(
      {
        id: row.id,
        worldId: row.worldId,
        type: row.type as AgentType,
        profile: row.profile as AgentProfile,
        state: row.state as AgentState,
        stats: row.stats as AgentStats,
        relationships: [],
      },
      this.repo,
      this.llmScheduler,
      this.config,
    );

    this.agents.set(id, agent);
    return agent;
  }
}
