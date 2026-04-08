import { describe, it, expect, vi } from 'vitest';
import { AgentRuntime } from '../../src/agent/agent-runtime.js';
import type { AgentProfile } from '@lore/shared';

const mockRepo: any = {
  getAgentMemories: vi.fn().mockResolvedValue([]),
  insertMemory: vi.fn().mockResolvedValue({ id: 'test' }),
  createEvent: vi.fn().mockResolvedValue({ id: 'evt' }),
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
  name: 'Test Agent', age: 25, gender: 'female', occupation: 'developer',
  personality: 'friendly', background: 'A test agent', speechStyle: 'casual',
  likes: ['coding'], dislikes: ['bugs'],
};

describe('AgentRuntime - applyStatChanges', () => {
  it('should apply positive stat changes', () => {
    const agent = new AgentRuntime('a1', 'w1', 'npc', profile, mockRepo, {} as any, mockConfig);
    agent.applyStatChanges({ mood: 10, energy: 5 });
    expect(agent.stats.mood).toBe(80);
    expect(agent.stats.energy).toBe(100);
  });

  it('should clamp stats to 0-100 range', () => {
    const agent = new AgentRuntime('a1', 'w1', 'npc', profile, mockRepo, {} as any, mockConfig);
    agent.applyStatChanges({ mood: -200 });
    expect(agent.stats.mood).toBe(0);
  });

  it('should detect death when health reaches 0', () => {
    const agent = new AgentRuntime('a1', 'w1', 'npc', profile, mockRepo, {} as any, mockConfig);
    agent.stats.health = 5;
    agent.applyStatChanges({ health: -10 });
    expect(agent.state.status).toBe('dead');
  });

  it('should not die when health stays positive', () => {
    const agent = new AgentRuntime('a1', 'w1', 'npc', profile, mockRepo, {} as any, mockConfig);
    agent.applyStatChanges({ health: -5 });
    expect(agent.state.status).toBe('idle');
    expect(agent.stats.health).toBe(95);
  });
});
