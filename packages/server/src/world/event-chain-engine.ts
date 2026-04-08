import type { Repository } from '../db/repository.js';
import type { WorldEvent } from '@lore/shared';
import { nanoid } from 'nanoid';

export class EventChainEngine {
  private repo: Repository;

  constructor(repo: Repository) {
    this.repo = repo;
  }

  async checkChains(event: WorldEvent, worldId: string): Promise<WorldEvent[]> {
    const pending = await this.repo.getPendingEventChains(worldId);
    const triggered: WorldEvent[] = [];

    for (const chain of pending) {
      if (chain.triggerEventId !== event.id) continue;

      if (chain.condition) {
        try {
          const cond = JSON.parse(chain.condition);
          if (cond.category && cond.category !== event.category) continue;
          if (cond.minPriority && event.priority < cond.minPriority) continue;
        } catch { continue; }
      }

      if (chain.nextEventId) {
        const nextEvent = await this.buildChainEvent(chain.nextEventId, worldId, event);
        if (nextEvent) triggered.push(nextEvent);
      }

      await this.repo.updateEventChain(chain.id, { status: 'triggered' });
    }

    return triggered;
  }

  async registerChain(worldId: string, triggerEventId: string, nextEvent: Partial<WorldEvent>, condition?: Record<string, any>, delayTicks = 0): Promise<string> {
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
      type: (nextEvent as any).type ?? 'world',
      description: nextEvent.description ?? 'Chained event',
      involvedAgents: nextEvent.involvedAgents ?? [],
      priority: nextEvent.priority ?? 50,
      timestamp: new Date(),
    });
    }

    return chainId;
  }

  async cleanupExpired(worldId: string): Promise<void> {
    const pending = await this.repo.getPendingEventChains(worldId);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const chain of pending) {
      if (chain.createdAt < cutoff) {
        await this.repo.updateEventChain(chain.id, { status: 'expired' });
      }
    }
  }

  private async buildChainEvent(nextEventId: string, worldId: string, triggerEvent: WorldEvent): Promise<WorldEvent | null> {
    const existingEvents = await this.repo.getWorldEvents(worldId, 1000);
    const existing = existingEvents.find(e => e.id === nextEventId);
    if (!existing) return null;

    return {
      id: nanoid(),
      worldId,
      type: (existing.type as WorldEvent['type']) ?? 'world',
      category: existing.category ?? 'chain',
      description: existing.description,
      involvedAgents: triggerEvent.involvedAgents,
      consequences: triggerEvent.consequences,
      timestamp: new Date(),
      processed: false,
      priority: triggerEvent.priority + 10,
    };
  }
}
