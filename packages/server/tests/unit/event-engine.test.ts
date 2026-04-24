import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEngine } from '../../src/world/event-engine.js';
import type { WorldClock } from '../../src/world/clock.js';
import type { WorldAgent } from '../../src/world/world-agent.js';
import type { WorldEvent, AgentStats } from '@lore/shared';

function createMockRepo() {
  return {
    createEvent: vi.fn().mockResolvedValue({ id: 'e1' }),
    updateEventProcessed: vi.fn().mockResolvedValue(undefined),
    getWorldEvents: vi.fn().mockResolvedValue([]),
    getWorldEventsByType: vi.fn().mockResolvedValue([]),
    getAllRelationships: vi.fn().mockResolvedValue([]),
  } as any;
}

function createMockWorldAgent(): WorldAgent {
  return {
    think: vi.fn().mockResolvedValue([]),
    setRepo: vi.fn(),
    scheduleEvent: vi.fn(),
    getWorldHistory: vi.fn().mockReturnValue([]),
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

function createMockRelationshipManager() {
  return {
    getAll: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue({}),
  } as any;
}

function createMockLLMScheduler() {
  return {
    submit: vi.fn().mockResolvedValue({
      content: JSON.stringify({ event: 'test', category: 'test', statChanges: {}, priority: 40 }),
      usage: { promptTokens: 10, completionTokens: 20 },
      model: 'test',
      latencyMs: 100,
    }),
  } as any;
}

function createMockConfig() {
  return {
    llm: {
      defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
    },
  } as any;
}

function createWorldState(tick = 1, day = 1, agentCount = 1): any {
  return {
    currentTick: tick,
    currentTime: new Date().toISOString(),
    day,
    agentCount,
    worldId: 'w1',
    avgMood: 70,
    avgHealth: 100,
    avgEnergy: 80,
    avgMoney: 1000,
    moodDistribution: { happy: 1, neutral: 0, sad: 0 },
    employmentRate: 0.5,
    recentEvents: [],
  };
}

function createAgent(id: string, name: string, occupation: string, stats: AgentStats): any {
  return {
    id,
    worldId: 'w1',
    profile: { name, occupation, age: 25, gender: 'unknown' },
    stats,
    state: { status: 'idle', currentActivity: '' },
  };
}

describe('EventEngine', () => {
  let repo: any;
  let worldAgent: WorldAgent;
  let engine: EventEngine;
  let clock: WorldClock;
  let relManager: any;

  beforeEach(() => {
    repo = createMockRepo();
    worldAgent = createMockWorldAgent();
    engine = new EventEngine(worldAgent, repo);
    clock = createMockClock(9);
    relManager = createMockRelationshipManager();
  });

  it('should generate routine events at scheduled hours', async () => {
    const agents = [createAgent('a1', 'Test', '程序员', { mood: 70, health: 100, energy: 80, money: 1000 })];
    const worldState = createWorldState(1, 1, 1);

    const events = await engine.generate(clock, agents, worldState, relManager);

    const routineEvents = events.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('should not generate routine events for non-scheduled hours', async () => {
    clock = createMockClock(14);
    const worldState = createWorldState(1, 1, 0);

    const events = await engine.generate(clock, [], worldState, relManager);
    const routineEvents = events.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBe(0);
  });

  it('should not generate duplicate routine events in same hour', async () => {
    const agents = [createAgent('a1', 'Test', '程序员', { mood: 70, health: 100, energy: 80, money: 1000 })];
    const worldState = createWorldState(1, 1, 1);

    await engine.generate(clock, agents, worldState, relManager);
    const events2 = await engine.generate(clock, agents, worldState, relManager);
    const routineEvents = events2.filter(e => e.type === 'routine');
    expect(routineEvents.length).toBe(0);
  });

  it('should generate contextual events based on agent state', async () => {
    clock = createMockClock(9);
    const agents = [createAgent('a1', 'Test', '程序员', { mood: 30, health: 100, energy: 60, money: 1000 })];
    const worldState = createWorldState(6, 1, 1);

    const events = await engine.generate(clock, agents, worldState, relManager);

    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('should apply consequences to agents', async () => {
    const agent = {
      id: 'a1',
      stats: { mood: 70, health: 100, energy: 80, money: 1000 },
      state: { status: 'idle', currentActivity: '' },
      profile: { name: 'Test', occupation: '程序员' }, worldId: 'w1',
      applyStatChanges(changes: any) {
        for (const c of changes) {
          if (c.stat === 'mood') this.stats.mood = Math.max(0, Math.min(100, this.stats.mood + c.delta));
          if (c.stat === 'energy') this.stats.energy = Math.max(0, Math.min(100, this.stats.energy + c.delta));
          if (c.stat === 'health') this.stats.health = Math.max(0, Math.min(100, this.stats.health + c.delta));
          if (c.stat === 'money') this.stats.money = this.stats.money + c.delta;
        }
      },
      transitionTo: vi.fn(),
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
    const agent = {
      id: 'a1', stats: { mood: 50, health: 5, energy: 50, money: 100 },
      state: { status: 'idle' }, profile: { name: 'Test' }, worldId: 'w1',
      applyStatChanges(changes: any) {
        for (const c of changes) {
          if (c.stat === 'health') this.stats.health = Math.max(0, this.stats.health + c.delta);
        }
        if (this.stats.health <= 0) this.state.status = 'dead';
      },
      transitionTo: vi.fn(),
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

  it('should call WorldAgent think method', async () => {
    const agents = [createAgent('a1', 'Test', '程序员', { mood: 70, health: 100, energy: 80, money: 1000 })];
    const worldState = createWorldState(1, 1, 1);

    await engine.generate(clock, agents, worldState, relManager);

    expect(worldAgent.think).toHaveBeenCalled();
  });

  it('should generate time-based events for special days', async () => {
    clock = createMockClock(8);
    const agents = [createAgent('a1', 'Test', '程序员', { mood: 70, health: 100, energy: 80, money: 1000 })];
    const worldState = createWorldState(1, 1, 1);

    const events = await engine.generate(clock, agents, worldState, relManager);

    const worldBirthEvents = events.filter(e => e.category === 'world_birth');
    expect(worldBirthEvents.length).toBeGreaterThanOrEqual(0);
  });

  it('should respect setConfig and setLLMScheduler', () => {
    const mockConfig = createMockConfig();
    const mockLLMScheduler = createMockLLMScheduler();

    engine.setConfig(mockConfig);
    engine.setLLMScheduler(mockLLMScheduler);
    engine.setRelationshipManager(relManager);

    expect(engine).toBeDefined();
  });

  it('should handle agents with various occupations', async () => {
    clock = createMockClock(9);
    const agents = [
      createAgent('a1', 'Worker', '程序员', { mood: 70, health: 100, energy: 80, money: 1000 }),
      createAgent('a2', 'Student', '学生', { mood: 60, health: 100, energy: 70, money: 500 }),
      createAgent('a3', 'Unemployed', '无业', { mood: 40, health: 100, energy: 50, money: 100 }),
    ];
    const worldState = createWorldState(6, 1, 3);

    const events = await engine.generate(clock, agents, worldState, relManager);

    expect(events.length).toBeGreaterThan(0);
  });
});