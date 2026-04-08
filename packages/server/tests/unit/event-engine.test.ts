import { describe, it, expect, vi } from 'vitest';
import { EventEngine } from '../../src/world/event-engine.js';
import type { WorldClock } from '../../src/world/clock.js';
import type { WorldEvent } from '@lore/shared';

function createMockRepo() {
  return {
    createEvent: vi.fn().mockResolvedValue({ id: 'e1' }),
    updateEventProcessed: vi.fn().mockResolvedValue(undefined),
    getWorldEvents: vi.fn().mockResolvedValue([]),
    getWorldEventsByType: vi.fn().mockResolvedValue([]),
  } as any;
}

function createMockWorldAgent() {
  return {
    think: vi.fn().mockResolvedValue([]),
  } as any;
}

function createMockClock(hour = 12): WorldClock {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return {
    getTime: vi.fn().mockReturnValue(date),
    getDay: vi.fn().mockReturnValue(1),
    advance: vi.fn(),
    getTimeSpeed: vi.fn().mockReturnValue(60),
    setTimeSpeed: vi.fn(),
  } as any;
}

describe('EventEngine', () => {
  it('should generate routine events at scheduled hours', async () => {
    const repo = createMockRepo();
    const worldAgent = createMockWorldAgent();
    const engine = new EventEngine(worldAgent, repo);
    const clock = createMockClock(7);

    const agents = [{ id: 'a1', worldId: 'w1', profile: { name: 'Test' }, stats: { mood: 70, health: 100, energy: 80 }, state: { status: 'idle', currentActivity: '' } }];
    const events = await engine.generate(clock, agents, { currentTick: 1, currentTime: clock.getTime().toISOString(), day: 1, agentCount: 1, worldId: 'w1' });

    const routineEvents = events.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBeGreaterThanOrEqual(1);
    expect(routineEvents[0].category).toBe('morning');
  });

  it('should not generate routine events for non-scheduled hours', async () => {
    const repo = createMockRepo();
    const worldAgent = createMockWorldAgent();
    const engine = new EventEngine(worldAgent, repo);
    const clock = createMockClock(14);

    const events = await engine.generate(clock, [], { currentTick: 1, currentTime: '', day: 1, agentCount: 0, worldId: 'w1' });
    const routineEvents = events.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBe(0);
  });

  it('should not generate duplicate routine events in same hour', async () => {
    const repo = createMockRepo();
    const worldAgent = createMockWorldAgent();
    const engine = new EventEngine(worldAgent, repo);
    const clock = createMockClock(9);
    const state = { currentTick: 1, currentTime: '', day: 1, agentCount: 0, worldId: 'w1' };

    await engine.generate(clock, [], state);
    const events2 = await engine.generate(clock, [], state);
    const routineEvents = events2.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBe(0);
  });

  it('should apply consequences to agents', async () => {
    const repo = createMockRepo();
    const worldAgent = createMockWorldAgent();
    const engine = new EventEngine(worldAgent, repo);

    const agent = {
      id: 'a1',
      stats: { mood: 70, health: 100, energy: 80, money: 1000 },
      state: { status: 'idle', currentActivity: '' },
      profile: { name: 'Test' }, worldId: 'w1',
      applyStatChanges(changes: any) {
        if (changes.mood !== undefined) this.stats.mood = Math.max(0, Math.min(100, this.stats.mood + changes.mood));
        if (changes.energy !== undefined) this.stats.energy = Math.max(0, Math.min(100, this.stats.energy + changes.energy));
        if (changes.health !== undefined) this.stats.health = Math.max(0, Math.min(100, this.stats.health + changes.health));
      },
    };

    const mockAgentManager = {
      get: vi.fn().mockReturnValue(agent),
      destroy: vi.fn(),
    } as any;

    const event: WorldEvent = {
      id: 'e1', worldId: 'w1', type: 'random', category: 'test',
      description: 'test event', involvedAgents: ['a1'], timestamp: new Date(),
      processed: false, priority: 50,
      consequences: [{ agentId: 'a1', statChanges: { mood: -10, energy: -5 } }],
    };

    await engine.applyConsequences(event, mockAgentManager);
    expect(agent.stats.mood).toBe(60);
    expect(agent.stats.energy).toBe(75);
    expect(event.processed).toBe(true);
    expect(repo.updateEventProcessed).toHaveBeenCalledWith('e1');
  });

  it('should destroy agent when health reaches 0', async () => {
    const repo = createMockRepo();
    const worldAgent = createMockWorldAgent();
    const engine = new EventEngine(worldAgent, repo);

    const agent = {
      id: 'a1', stats: { mood: 50, health: 5, energy: 50, money: 100 },
      state: { status: 'idle' }, profile: { name: 'Test' }, worldId: 'w1',
      applyStatChanges(changes: any) {
        if (changes.mood !== undefined) this.stats.mood = Math.max(0, Math.min(100, this.stats.mood + changes.mood));
        if (changes.energy !== undefined) this.stats.energy = Math.max(0, Math.min(100, this.stats.energy + changes.energy));
        if (changes.health !== undefined) this.stats.health = Math.max(0, Math.min(100, this.stats.health + changes.health));
        if (this.stats.health <= 0) this.state.status = 'dead';
      },
    };
    const mockAgentManager = {
      get: vi.fn().mockReturnValue(agent),
      destroy: vi.fn(),
    } as any;

    const event: WorldEvent = {
      id: 'e1', worldId: 'w1', type: 'random', category: 'illness',
      description: 'test', involvedAgents: ['a1'], timestamp: new Date(),
      processed: false, priority: 60,
      consequences: [{ agentId: 'a1', statChanges: { health: -20 } }],
    };

    await engine.applyConsequences(event, mockAgentManager);
    expect(agent.state.status).toBe('dead');
    expect(mockAgentManager.destroy).toHaveBeenCalledWith('a1');
  });
});
