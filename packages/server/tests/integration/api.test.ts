import { describe, it, expect, from 'vitest';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { registerRoutes } from '../api/routes';
import { Repository } from '../db/repository';
import { InitAgent } from '../agent/init-agent';
import { LLMScheduler } from '../llm/scheduler';
import { EconomyEngine } from '../world/economy-engine';
import { PlatformEngine } from '../world/platform-engine';
import { WorldClock } from '../world/clock';
import { TickScheduler } from '../scheduler/tick-scheduler';
import { ModeManager } from '../modes/mode-manager';
import { PushManager } from '../scheduler/push-manager';
import type { LoreConfig } from '../config/loader.js';

vi.mock('../db/repository.js');
vi.mock('../agent/init-agent.js');
vi.mock('../llm/scheduler.js');
vi.mock('../world/economy-engine.js');
vi.mock('../world/platform-engine.js');
vi.mock('../world/clock.js');
vi.mock('../scheduler/tick-scheduler.js');
vi.mock('../modes/mode-manager.js');
vi.mock('../scheduler/push-manager.js');
vi.mock('../config/loader.js', () => ({
  llm: {
    providers: [],
    defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
    limits: { maxConcurrent: 5, dailyBudget: null, timeoutMs: 30000 },
  },
  world: { defaultTickIntervalMs: 3000, defaultTimeSpeed: 60 },
  server: { port: 3952, host: '0.0.0.0' },
  dataDir: '~/.lore',
}));

const mockRepo: Repository = vi.mocked(),
const mockInitAgent: InitAgent = vi.mocked(),
const mockLlmScheduler: LLMScheduler = vi.mocked(),
const mockEconomyEngine: EconomyEngine = vi.mocked(),
const mockPlatformEngine: PlatformEngine = vi.mocked(),
const mockWorldClock: WorldClock = vi.mocked(),
const mockTickScheduler: TickScheduler = vi.mocked(),
const mockModeManager: ModeManager = vi.mocked(),
const mockPushManager: PushManager = vi.mocked();

const mockConfig: LoreConfig = {
  llm: {
    providers: [],
    defaults: { premiumModel: 'gpt-4', standardModel: 'gpt-4-mini', cheapModel: 'gpt-3.5-turbo' },
    limits: { maxConcurrent: 5, dailyBudget: null, timeoutMs: 30000 },
  },
  world: { defaultTickIntervalMs: 3000, defaultTimeSpeed: 60 },
  server: { port: 3952, host: '0.0.0.0' },
  dataDir: '~/.lore',
};

function createMockApp() {
  return {
    registerRoutes: vi.fn() as any,
  } as FastifyInstance;
}

describe('API Routes', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = createMockApp();
  });

  describe('POST /api/worlds/init', () => {
    it('should initialize world and return result', async () => {
    const body = {
      worldType: 'random',
      randomParams: { age: 25, location: '上海', background: '程序员' },
    };

    
    mockInitAgent.initialize.mockResolvedValue({
      worldId: 'test-world',
      worldConfig: { name: 'Test World', startTime: new Date().toISOString(), location: '上海' },
      userAvatar: {
        name: '玩家',
        profile: { name: '玩家', age: 25, gender: 'unknown', occupation: '程序员', personality: '由你定义', background: '', speechStyle: '随意', likes: [], dislikes: [] },
        initialStats: { mood: 70, health: 100, energy: 100, money: 5000 },
        backstory: '',
      },
      agents: [],
    });

    
    const response = await app.inject({
      method: 'POST',
      url: '/api/worlds/init',
      body,
    });
    
    expect(response.statusCode).toBe(200);
    expect(response.json).toMatchObject({
      data: {
        worldId: 'test-world',
      worldConfig: expect.any(Object),
        userAvatar: expect.any(Object),
        agents: expect.any(Array),
      },
    });
    
    expect(mockInitAgent.initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        worldType: 'random',
        randomParams: body.randomParams,
      })
    );
  });

  describe('POST /api/agents/:id/messages', () => {
    it('should send message and return response', async () => {
    const body = { content: 'Hello!' };
    
    mockRepo.getAgent.mockReturnValue({ id: 'agent-1', profile: { name: 'Agent' } });
    
    const response = await app.inject({
      method: 'POST',
      url: '/api/agents/agent-1/messages',
      body,
    });
    
    expect(response.statusCode).toBe(200);
  });
});
