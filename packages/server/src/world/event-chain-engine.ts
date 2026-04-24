import type { Repository } from '../db/repository.js';
import type { RelationshipManager } from '../agent/relationships.js';
import type { AgentManager } from '../agent/agent-manager.js';
import type { WorldEvent, AgentStats } from '@lore/shared';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('event-chain');

export interface EventPropagationRule {
  sourceCategory: string;
  propagateTo: 'family' | 'close_friends' | 'colleagues' | 'all_relations';
  statChanges: Partial<AgentStats>;
  relationshipEffect?: number;
  probability: number;
  delayTicks: number;
  descriptionTemplate: string;
}

const propagationRules: EventPropagationRule[] = [
  {
    sourceCategory: 'job_loss',
    propagateTo: 'family',
    statChanges: { mood: -15 },
    relationshipEffect: 5,
    probability: 0.8,
    delayTicks: 1,
    descriptionTemplate: '{name}的家人得知了失业的消息，感到担忧',
  },
  {
    sourceCategory: 'romantic_encounter',
    propagateTo: 'close_friends',
    statChanges: { mood: 5 },
    probability: 0.6,
    delayTicks: 2,
    descriptionTemplate: '{name}的朋友听说了这件事，也感到开心',
  },
  {
    sourceCategory: 'relationship_conflict',
    propagateTo: 'close_friends',
    statChanges: { mood: -5 },
    probability: 0.5,
    delayTicks: 1,
    descriptionTemplate: '{name}的朋友听闻了争执，感到有些担心',
  },
  {
    sourceCategory: 'health_issue',
    propagateTo: 'family',
    statChanges: { mood: -10 },
    relationshipEffect: 3,
    probability: 0.7,
    delayTicks: 0,
    descriptionTemplate: '{name}的家人得知身体不适，很关心',
  },
  {
    sourceCategory: 'career_success',
    propagateTo: 'colleagues',
    statChanges: { mood: 3 },
    probability: 0.4,
    delayTicks: 1,
    descriptionTemplate: '{name}的同事也感受到了积极的氛围',
  },
  {
    sourceCategory: 'illness',
    propagateTo: 'family',
    statChanges: { mood: -20 },
    probability: 0.9,
    delayTicks: 0,
    descriptionTemplate: '{name}的家人很担心',
  },
  {
    sourceCategory: 'death',
    propagateTo: 'all_relations',
    statChanges: { mood: -30 },
    relationshipEffect: -10,
    probability: 1.0,
    delayTicks: 0,
    descriptionTemplate: '{name}的离去让所有人悲伤',
  },
];

export class EventChainEngine {
  private repo: Repository;
  private relationshipManager: RelationshipManager | null = null;
  private agentManager: AgentManager | null = null;
  private pendingPropagations: Map<string, { tick: number; event: WorldEvent }> = new Map();

  constructor(repo: Repository) {
    this.repo = repo;
  }

  setRelationshipManager(manager: RelationshipManager): void {
    this.relationshipManager = manager;
  }

  setAgentManager(manager: AgentManager): void {
    this.agentManager = manager;
  }

  async checkChains(event: WorldEvent, worldId: string, currentTick?: number): Promise<WorldEvent[]> {
    const triggered: WorldEvent[] = [];

    const dbPending = await this.repo.getPendingEventChains(worldId);
    for (const chain of dbPending) {
      if (chain.triggerEventId !== event.id) continue;

      if (chain.condition) {
        try {
          const cond = JSON.parse(chain.condition);
          if (cond.category && cond.category !== event.category) continue;
          if (cond.minPriority && event.priority < cond.minPriority) continue;
        } catch {
          continue;
        }
      }

      if (chain.nextEventId) {
        const nextEvent = await this.buildChainEvent(chain.nextEventId, worldId, event);
        if (nextEvent) triggered.push(nextEvent);
      }

      await this.repo.updateEventChain(chain.id, { status: 'triggered' });
    }

    const propagations = await this.checkPropagations(event, worldId, currentTick);
    triggered.push(...propagations);

    if (currentTick !== undefined) {
      for (const [key, pending] of this.pendingPropagations) {
        if (pending.tick <= currentTick) {
          triggered.push(pending.event);
          this.pendingPropagations.delete(key);
        }
      }
    }

    logger.debug({
      eventId: event.id,
      category: event.category,
      triggeredCount: triggered.length,
    }, 'Event chains checked');

    return triggered;
  }

  private async checkPropagations(event: WorldEvent, worldId: string, currentTick?: number): Promise<WorldEvent[]> {
    if (!this.relationshipManager || event.involvedAgents.length === 0) {
      return [];
    }

    const propagations: WorldEvent[] = [];

    for (const rule of propagationRules) {
      if (!this.matchesCategory(event.category, rule.sourceCategory)) continue;

      for (const agentId of event.involvedAgents) {
        const agent = this.agentManager?.get(agentId);
        if (!agent) continue;

        const relatedAgents = await this.getRelatedAgents(agentId, rule.propagateTo);
        if (relatedAgents.length === 0) continue;

        for (const related of relatedAgents) {
          if (Math.random() > rule.probability) continue;

          const description = rule.descriptionTemplate.replace('{name}', agent.profile.name);

          const propagatedEvent: WorldEvent = {
            id: nanoid(),
            worldId,
            type: 'random',
            category: `${event.category}_propagation`,
            description,
            involvedAgents: [related.targetAgentId],
            consequences: [{
              agentId: related.targetAgentId,
              statChanges: rule.statChanges,
              relationshipChange: rule.relationshipEffect ? {
                targetId: agentId,
                delta: rule.relationshipEffect,
              } : undefined,
            }],
            timestamp: new Date(),
            processed: false,
            priority: event.priority - 10,
          };

          if (rule.delayTicks > 0) {
            const key = `${event.id}_${related.targetAgentId}_${rule.sourceCategory}`;
            this.pendingPropagations.set(key, {
              tick: (currentTick ?? 0) + rule.delayTicks,
              event: propagatedEvent,
            });
          } else {
            propagations.push(propagatedEvent);
          }

          logger.info({
            sourceEvent: event.id,
            sourceAgent: agentId,
            targetAgent: related.targetAgentId,
            rule: rule.sourceCategory,
          }, 'Event propagation created');
        }
      }
    }

    return propagations;
  }

  private matchesCategory(eventCategory: string, ruleCategory: string): boolean {
    if (eventCategory === ruleCategory) return true;
    if (eventCategory.includes(ruleCategory)) return true;
    if (ruleCategory === 'illness' && eventCategory.includes('health')) return true;
    if (ruleCategory === 'health_issue' && eventCategory.includes('health')) return true;
    if (ruleCategory === 'death' && eventCategory.includes('died')) return true;
    return false;
  }

private async getRelatedAgents(
    agentId: string,
    relationType: 'family' | 'close_friends' | 'colleagues' | 'all_relations',
  ): Promise<Array<{ targetAgentId: string; type: string; intimacy: number }>> {
    if (!this.relationshipManager) return [];

    const allRelations = await this.relationshipManager.getAll(agentId);
    const mapped = allRelations.map(r => ({
      targetAgentId: r.targetAgentId,
      type: r.type,
      intimacy: r.intimacy ?? 0,
    }));

    switch (relationType) {
      case 'family':
        return mapped.filter(r =>
          ['family', 'parent', 'child', 'sibling', 'spouse'].includes(r.type) && r.intimacy > 20,
        );

      case 'close_friends':
        return mapped.filter(r =>
          ['friend', 'close_friend', 'best_friend'].includes(r.type) && r.intimacy > 40,
        );

      case 'colleagues':
        return mapped.filter(r =>
          r.type === 'colleague' || r.type === 'coworker',
        );

      case 'all_relations':
        return mapped.filter(r => r.intimacy > 10);

      default:
        return mapped;
    }
  }

  async registerChain(
    worldId: string,
    triggerEventId: string,
    nextEvent: Partial<WorldEvent>,
    condition?: Record<string, unknown>,
    delayTicks = 0,
  ): Promise<string> {
    const chainId = nanoid();
    const nextEventId = nanoid();

    await this.repo.createEventChain({
      id: chainId,
      worldId,
      triggerEventId,
      nextEventId,
      condition: condition ? JSON.stringify(condition) : undefined,
      delayTicks,
      status: 'pending',
    });

    if (nextEvent.description) {
      await this.repo.createEvent({
        id: nextEventId,
        worldId,
        type: 'world',
        description: nextEvent.description,
        involvedAgents: nextEvent.involvedAgents ?? [],
        priority: nextEvent.priority ?? 50,
        timestamp: new Date(),
      });
    }

    logger.info({
      chainId,
      triggerEventId,
      nextEventId,
      delayTicks,
    }, 'Event chain registered');

    return chainId;
  }

  async registerAutomaticChain(
    worldId: string,
    sourceCategory: string,
    delayTicks: number,
    followUpDescription: string,
    condition?: Record<string, unknown>,
  ): Promise<void> {
    const pending = await this.repo.getWorldEventsByType(worldId, 'random');
    const matches = pending.filter(e => (e.category ?? '').includes(sourceCategory));

    for (const event of matches) {
      if (!event.processed) {
        await this.registerChain(worldId, event.id, {
          description: followUpDescription,
          involvedAgents: (event.involvedAgents as string[]) ?? [],
          priority: (event.priority ?? 50) + 5,
        }, condition, delayTicks);
      }
    }
  }

  async cleanupExpired(worldId: string): Promise<void> {
    const pending = await this.repo.getPendingEventChains(worldId);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const chain of pending) {
      if (chain.createdAt < cutoff) {
        await this.repo.updateEventChain(chain.id, { status: 'expired' });
        logger.debug({ chainId: chain.id }, 'Event chain expired');
      }
    }

    for (const [key, pending] of this.pendingPropagations) {
      if (pending.event.timestamp < cutoff) {
        this.pendingPropagations.delete(key);
      }
    }
  }

  private async buildChainEvent(
    nextEventId: string,
    worldId: string,
    triggerEvent: WorldEvent,
  ): Promise<WorldEvent | null> {
    const existingEvents = await this.repo.getWorldEvents(worldId, 1000);
    const existing = existingEvents.find(e => e.id === nextEventId);
    if (!existing) return null;

    return {
      id: nanoid(),
      worldId,
      type: (existing.type as WorldEvent['type']) ?? 'world',
      category: existing.category ?? 'chain',
      description: existing.description ?? '',
      involvedAgents: (triggerEvent.involvedAgents as string[]) ?? [],
      consequences: triggerEvent.consequences ?? [],
      timestamp: new Date(),
      processed: false,
      priority: (triggerEvent.priority ?? 50) + 10,
    };
  }

  getPendingPropagationsCount(): number {
    return this.pendingPropagations.size;
  }

  clearPendingPropagations(): void {
    this.pendingPropagations.clear();
  }
}