import { describe, it, expect, vi } from 'vitest';
import { EventChainEngine } from '../../src/world/event-chain-engine.js';

function createMockRepo(chains: any[] = []) {
  return {
    getPendingEventChains: vi.fn().mockResolvedValue(chains),
    createEventChain: vi.fn().mockResolvedValue({ id: 'chain-1' }),
    updateEventChain: vi.fn().mockResolvedValue({}),
    createEvent: vi.fn().mockResolvedValue({ id: 'e-next' }),
    getWorldEvents: vi.fn().mockResolvedValue([]),
  } as any;
}

describe('EventChainEngine', () => {
  it('should trigger chained event when trigger matches', async () => {
    const chains = [{
      id: 'c1', worldId: 'w1', triggerEventId: 'e1', nextEventId: 'e-next',
      condition: null, status: 'pending', createdAt: new Date(),
    }];
    const repo = createMockRepo(chains);
    repo.getWorldEvents = vi.fn().mockResolvedValue([{ id: 'e-next', type: 'world', description: 'Aftermath', category: 'chain' }]);
    const engine = new EventChainEngine(repo);

    const triggerEvent = {
      id: 'e1', worldId: 'w1', type: 'random' as const, category: 'test',
      description: 'test', involvedAgents: [], timestamp: new Date(),
      processed: false, priority: 50,
    };

    const result = await engine.checkChains(triggerEvent, 'w1');
    expect(result.length).toBe(1);
    expect(repo.updateEventChain).toHaveBeenCalledWith('c1', { status: 'triggered' });
  });

  it('should not trigger when trigger event ID does not match', async () => {
    const chains = [{
      id: 'c1', worldId: 'w1', triggerEventId: 'e-other', nextEventId: 'e-next',
      condition: null, status: 'pending', createdAt: new Date(),
    }];
    const repo = createMockRepo(chains);
    const engine = new EventChainEngine(repo);

    const triggerEvent = {
      id: 'e1', worldId: 'w1', type: 'random' as const, category: 'test',
      description: 'test', involvedAgents: [], timestamp: new Date(),
      processed: false, priority: 50,
    };

    const result = await engine.checkChains(triggerEvent, 'w1');
    expect(result.length).toBe(0);
  });

  it('should filter by condition category', async () => {
    const chains = [{
      id: 'c1', worldId: 'w1', triggerEventId: 'e1', nextEventId: 'e-next',
      condition: JSON.stringify({ category: 'illness' }), status: 'pending', createdAt: new Date(),
    }];
    const repo = createMockRepo(chains);
    const engine = new EventChainEngine(repo);

    const triggerEvent = {
      id: 'e1', worldId: 'w1', type: 'random' as const, category: 'good_luck',
      description: 'test', involvedAgents: [], timestamp: new Date(),
      processed: false, priority: 50,
    };

    const result = await engine.checkChains(triggerEvent, 'w1');
    expect(result.length).toBe(0);
  });

  it('should register a new event chain', async () => {
    const repo = createMockRepo([]);
    const engine = new EventChainEngine(repo);

    const chainId = await engine.registerChain('w1', 'e1', {
      description: 'Aftermath event',
      type: 'world' as const,
      priority: 60,
    });

    expect(chainId).toBeTruthy();
    expect(repo.createEventChain).toHaveBeenCalled();
    expect(repo.createEvent).toHaveBeenCalled();
  });
});
