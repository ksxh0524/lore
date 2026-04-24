import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentRuntime } from '../../src/agent/agent-runtime.js';
import type { AgentProfile } from '@lore/shared';

const mockRepo: any = {
  getAgentMemories: vi.fn().mockResolvedValue([]),
  insertMemory: vi.fn().mockResolvedValue({ id: 'test' }),
  createEvent: vi.fn().mockResolvedValue({ id: 'evt' }),
};

const mockLLMScheduler: any = {
  submit: vi.fn().mockResolvedValue({
    content: JSON.stringify({ action: 'greet', mood_change: 5, say: 'Hello!' }),
    usage: { promptTokens: 10, completionTokens: 20 },
    model: 'gpt-4',
    latencyMs: 100,
  }),
  submitStream: vi.fn().mockImplementation(async function* () {
    yield 'Hello'; yield ' there'; yield '!';
  }),
};

const mockConfig: any = {
  llm: {
    providers: [],
    defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
    limits: { maxConcurrent: 5, dailyBudget: null, timeoutMs: 30000 },
  },
  world: { defaultTickIntervalMs: 3000, defaultTimeSpeed: 60 },
  server: { port: 3952, host: '0.0.0.0' },
  dataDir: '~/.lore',
};

const profile: AgentProfile = {
  name: 'Test Agent',
  age: 25,
  gender: 'female',
  occupation: 'developer',
  personality: 'friendly',
  background: 'A test agent',
  speechStyle: 'casual',
  likes: ['coding'],
  dislikes: ['bugs'],
};

describe('AgentRuntime', () => {
  let agent: AgentRuntime;

  beforeEach(() => {
    vi.clearAllMocks();
    agent = new AgentRuntime('test-agent', 'test-world', 'npc', profile, mockRepo, mockLLMScheduler, mockConfig);
  });

  it('should initialize with correct values', () => {
    expect(agent.id).toBe('test-agent');
    expect(agent.worldId).toBe('test-world');
    expect(agent.type).toBe('npc');
    expect(agent.profile).toEqual(profile);
    expect(agent.stats.mood).toBe(70);
    expect(agent.stats.health).toBe(100);
    expect(agent.stats.energy).toBe(100);
    expect(agent.stats.money).toBe(1000);
  });

  it('should return minimal thought frequency with no relationships', () => {
    expect(agent.getThoughtFrequency()).toBe('minimal');
  });

  it('should think every 30 ticks for minimal frequency', () => {
    expect(agent.shouldThink(1)).toBe(false);
    expect(agent.shouldThink(30)).toBe(true);
    expect(agent.shouldThink(60)).toBe(true);
  });

  it('should process decision from LLM during tick', async () => {
    const worldState = { currentTime: new Date().toISOString(), day: 1, currentTick: 30 };
    await agent.tick(worldState, mockLLMScheduler, mockConfig);
    expect(mockLLMScheduler.submit).toHaveBeenCalled();
    expect(agent.state.currentActivity).toContain('greet');
  });

  it('should not think when status is dead', async () => {
    // Set health to 0 to trigger death transition
    agent.applyStatChanges([{ stat: 'health', delta: -100, reason: 'test' }]);
    
    // Verify agent is dead
    expect(agent.state.status).toBe('dead');
    
    const worldState = { currentTime: new Date().toISOString(), day: 1, currentTick: 30 };
    await agent.tick(worldState, mockLLMScheduler, mockConfig);
    expect(mockLLMScheduler.submit).not.toHaveBeenCalled();
  });

  it('should stream response during chat', async () => {
    const chunks: string[] = [];
    for await (const chunk of agent.chat('Hello', mockLLMScheduler, mockConfig)) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should serialize and deserialize correctly', () => {
    const serialized = agent.serialize();
    expect(serialized.id).toBe('test-agent');
    expect(serialized.profile).toEqual(profile);
    const deserialized = AgentRuntime.deserialize(serialized, mockRepo, mockLLMScheduler, mockConfig);
    expect(deserialized.id).toBe('test-agent');
    expect(deserialized.stats).toEqual(agent.stats);
  });
});
