import { nanoid } from 'nanoid';
import type { AgentType, AgentProfile, AgentState, AgentStats, SerializedAgent, SimplifiedRelationship } from '@lore/shared';
import { AgentRuntime } from './agent-runtime.js';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';
import { z } from 'zod';

const logger = createLogger('agent-manager');

const AgentProfileSchema = z.object({
  name: z.string(),
  age: z.number(),
  gender: z.string(),
  occupation: z.string(),
  personality: z.string(),
  background: z.string(),
  speechStyle: z.string(),
  likes: z.array(z.string()),
  dislikes: z.array(z.string()),
  avatarUrl: z.string().optional(),
});

const AgentStateSchema = z.object({
  status: z.enum(['idle', 'active', 'sleeping', 'dead', 'traveling', 'working', 'socializing']),
  currentActivity: z.string(),
  currentLocation: z.string(),
  lastActiveTick: z.number(),
});

const AgentStatsSchema = z.object({
  mood: z.number().min(0).max(100),
  health: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  money: z.number().min(0),
});

const AgentRowSchema = z.object({
  id: z.string(),
  worldId: z.string(),
  type: z.string(),
  profile: AgentProfileSchema,
  state: AgentStateSchema,
  stats: AgentStatsSchema,
});

const RelationshipSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  targetAgentId: z.string(),
  type: z.string(),
  intimacy: z.number().optional(),
});

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
    agent.setAgentManager(this);

    return agent;
  }

  get(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  /** Get all agents (for iteration) */
  getAllAgents(): IterableIterator<AgentRuntime> {
    return this.agents.values();
  }

  /** Get agents map (read-only access) */
  getAgentsMap(): ReadonlyMap<string, AgentRuntime> {
    return this.agents;
  }

  private async loadRelationships(agentId: string): Promise<Array<[string, SimplifiedRelationship]>> {
    try {
      const rels = await this.repo.getAgentRelationships(agentId);
      const validated: Array<[string, SimplifiedRelationship]> = [];
      
      for (const r of rels) {
        const result = RelationshipSchema.safeParse(r);
        if (result.success) {
          validated.push([
            result.data.targetAgentId,
            {
              type: result.data.type,
              intimacy: result.data.intimacy ?? 0,
            }
          ] as [string, SimplifiedRelationship]);
        } else {
          logger.warn({ agentId, relId: r.id, errors: result.error.errors }, 'Invalid relationship data');
        }
      }
      
      return validated;
    } catch (err) {
      logger.warn({ agentId, err }, 'Failed to load relationships');
      return [];
    }
  }

  async getWorldAgents(worldId: string): Promise<AgentRuntime[]> {
    const cached = [...this.agents.values()].filter((a) => a.worldId === worldId);
    if (cached.length > 0) return cached;

    const rows = await this.repo.getWorldAgents(worldId);
    const result: AgentRuntime[] = [];

    for (const row of rows) {
      let agent = this.agents.get(row.id);
      if (!agent) {
        const validationResult = AgentRowSchema.safeParse(row);
        if (!validationResult.success) {
          logger.warn({ agentId: row.id, errors: validationResult.error.errors }, 'Invalid agent row data');
          continue;
        }

        const validated = validationResult.data;
        const relationships = await this.loadRelationships(row.id);
        
        agent = AgentRuntime.deserialize(
          {
            id: validated.id,
            worldId: validated.worldId,
            type: validated.type as AgentType,
            profile: validated.profile,
            state: validated.state,
            stats: validated.stats,
            relationships,
          },
          this.repo,
          this.llmScheduler,
          this.config,
        );
        this.agents.set(validated.id, agent);
        agent.setAgentManager(this);
      }
      result.push(agent);
    }

    return result;
  }

  async tickAll(
    worldState: { currentTime: string; day: number; currentTick: number },
    llmScheduler: LLMScheduler,
    config: LoreConfig,
    maxConcurrent = 5,
  ): Promise<void> {
    const all = [...this.agents.values()].filter((a) => a.status !== 'dead');
    const results: Promise<void>[] = [];

    for (let i = 0; i < all.length; i += maxConcurrent) {
      const batch = all.slice(i, i + maxConcurrent);
      const batchResults = batch.map((agent) => agent.tick(worldState, llmScheduler, config));
      await Promise.allSettled(batchResults);
    }
  }

  async persistAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      try {
        await this.repo.updateAgent(agent.id, {
          state: {
            ...agent.state,
            currentLocation: agent.state.currentLocation,
          },
          stats: agent.stats,
        });
        for (const [targetId, rel] of agent.relationships) {
          try {
            const existing = await this.repo.getAgentRelationships(agent.id);
            const found = existing.find((r) => r.targetAgentId === targetId);
            if (found) {
              await this.repo.updateRelationship(found.id, {
                type: rel.type,
                intimacy: rel.intimacy,
              });
            }
          } catch (relErr) {
            logger.warn({ agentId: agent.id, targetId, err: relErr }, 'Persist relationship failed');
          }
        }
      } catch (err) {
        logger.error({ agentId: agent.id, err }, 'Persist agent failed');
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
        const relationships = await this.loadRelationships(match.id);
        agent = AgentRuntime.deserialize(
          {
            id: match.id,
            worldId: match.worldId,
            type: match.type as AgentType,
            profile: match.profile as AgentProfile,
            state: match.state as AgentState,
            stats: match.stats as AgentStats,
            relationships,
          },
          this.repo,
          this.llmScheduler,
          this.config,
        );
        this.agents.set(match.id, agent);
        agent.setAgentManager(this);
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

    const relationships = await this.loadRelationships(id);
    const agent = AgentRuntime.deserialize(
      {
        id: row.id,
        worldId: row.worldId,
        type: row.type as AgentType,
        profile: row.profile as AgentProfile,
        state: row.state as AgentState,
        stats: row.stats as AgentStats,
        relationships,
      },
      this.repo,
      this.llmScheduler,
      this.config,
    );

    this.agents.set(id, agent);
    return agent;
  }
}
