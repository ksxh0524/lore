import { describe, it, expect, test, vi } from 'vitest';
import { AgentRuntime } from '../../src/agent/agent-runtime.js';
import { MockLLMProvider } from '../../src/llm/mock-provider.js';
import { Repository } from '../../src/db/repository.js';
import type { LoreConfig } from '../../src/config/loader.js';

import type { AgentProfile } from '@lore/shared';

import { LLMScheduler } from '../../src/llm/scheduler.js';
import { ProviderFactory } from '../../src/llm/factory.js';

import { nanoid } from 'nanoid';

vi.mock('../../src/db/repository.js');
vi.mock('../../src/llm/scheduler.js');
vi.mock('../../src/llm/factory.js');

vi.mock('../../src/config/loader.js', () => ({
  loadConfig: vi.fn((): LoreConfig => ({
    llm: {
      providers: [],
      defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
      limits: { maxConcurrent: 5, dailyBudget: null, timeoutMs: 30000 },
    },
    world: { defaultTickIntervalMs: 3000, defaultTimeSpeed: 60 },
    server: { port: 3952, host: '0.0.0.0' },
    dataDir: '~/.lore',
  })),
}));

const mockRepo = {
  getAgentMemories: vi.fn().mockResolved([]),
  insertMemory: vi.fn().mockResolved({ id: 'test' }),
} as unknown as Repository;

const mockLLMScheduler = {
  submit: vi.fn().mockResolved({
    content: JSON.stringify({ action: 'greet', mood_change: 5, say: 'Hello!' }),
    usage: { promptTokens: 10, completionTokens: 20 },
    model: 'gpt-4',
    latencyMs: 100,
  }),
  submitStream: vi.fn().mockImplementation(async function* () {
    yield 'Hello'; yield ' there'; yield '!';
  }),
} as unknown as LLMScheduler;

const mockConfig = {
  llm: {
    providers: [],
    defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
    limits: { maxConcurrent: 5, dailyBudget: null, timeoutMs: 30000 },
  },
  world: { defaultTickIntervalMs: 3000, defaultTimeSpeed: 60 },
  server: { port: 3952, host: '0.0.0.0' },
  dataDir: '~/.lore',
} as LoreConfig;

describe('AgentRuntime', () => {
  let agent: AgentRuntime;
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

  beforeEach(() => {
    vi.mocked(Repository).mockImplementation(() => mockRepo);
    vi.mocked(LLMScheduler).mockImplementation(() => mockLLMScheduler);
    
    agent = new AgentRuntime(
      'test-agent',
      'test-world',
      'npc',
      profile,
      mockRepo as any,
      mockLLMScheduler as any,
      mockConfig as any,
    );
  });

  describe('constructor', () => {
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
  });

  describe('getThoughtFrequency', () => {
    it('should return minimal when no relationships', () => {
      expect(agent.getThoughtFrequency()).toBe('minimal');
    });
  });

  describe('shouldThink', () => {
    it('should think every 30 ticks for minimal frequency', () => {
      expect(agent.shouldThink(0)).toBe(false);
      expect(agent.shouldThink(30)).toBe(true);
      expect(agent.shouldThink(60)).toBe(true);
    });
  });

  describe('tick', () => {
    it('should process decision from LLM', async () => {
        const worldState = { currentTime: new Date().toISOString(), day: 1, currentTick: 30 };
        await agent.tick(worldState, mockLLMScheduler as any, mockConfig as any);
        
        expect(mockLLMScheduler.submit).toHaveBeenCalled();
        expect(agent.state.currentActivity).toContain('greet');
      });

    it('should not think when status is dead', async () => {
        agent.state.status = 'dead';
        const worldState = { currentTime: new Date().toISOString(), day: 1, currentTick: 30 };
        await agent.tick(worldState, mockLLMScheduler as any, mockConfig as any);
        
        expect(mockLLMScheduler.submit).not.toHaveBeenCalled();
      });
  });

  describe('chat', () => {
    it('should stream response and save to memory', async () => {
        const chunks: string[] = [];
        for await (const chunk of agent.chat('Hello', mockLLMScheduler as any, mockConfig as any)) {
          chunks.push(chunk);
        }
        
        expect(chunks.length).toBeGreaterThan(0);
        expect(mockRepo.insertMemory).toHaveBeenCalledTimes(2);
      });
  });

  describe('serialize/deserialize', () => {
    it('should serialize and deserialize correctly', () => {
        const serialized = agent.serialize();
        expect(serialized.id).toBe('test-agent');
        expect(serialized.profile).toEqual(profile);
        
        const deserialized = AgentRuntime.deserialize(
          serialized,
          mockRepo as any,
          mockLLMScheduler as any,
          mockConfig as any,
        );
        expect(deserialized.id).toBe('test-agent');
        expect(deserialized.stats).toEqual(agent.stats);
      });
  });
});
