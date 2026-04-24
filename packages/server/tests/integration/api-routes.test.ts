import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import { nanoid } from 'nanoid';
import { registerRoutes } from '../../src/api/routes.js';
import type { AppDeps } from '../../src/api/routes.js';
import { loadConfig } from '../../src/config/loader.js';
import { Repository } from '../../src/db/repository.js';
import { LLMScheduler } from '../../src/llm/scheduler.js';
import { AgentManager } from '../../src/agent/agent-manager.js';
import { WorldClock } from '../../src/world/clock.js';
import { TickScheduler } from '../../src/scheduler/tick-scheduler.js';
import { Monitor } from '../../src/monitor/index.js';
import { PushManager } from '../../src/scheduler/push-manager.js';
import { EconomyEngine } from '../../src/world/economy-engine.js';
import { PlatformEngine } from '../../src/world/platform-engine.js';
import { EventEngine } from '../../src/world/event-engine.js';
import { EventChainEngine } from '../../src/world/event-chain-engine.js';
import { FactionSystem } from '../../src/world/faction-system.js';
import { RelationshipManager } from '../../src/agent/relationships.js';
import { SocialEngine } from '../../src/agent/social.js';
import { WorldAgent } from '../../src/world/world-agent.js';
import { WorldPersistence } from '../../src/world/persistence.js';
import { InitAgent } from '../../src/agent/init-agent.js';
import { ModeManager } from '../../src/modes/mode-manager.js';
import { initTables } from '../../src/db/index.js';

const mockConfig = loadConfig();

const createMockDeps = (): AppDeps => {
  initTables();
  const repo = new Repository();
  const llmScheduler = new LLMScheduler(mockConfig);
  const agentManager = new AgentManager(repo, llmScheduler, mockConfig);
  const initAgent = new InitAgent(llmScheduler, repo, mockConfig);
  const worldClock = new WorldClock(new Date(), 1);
  const tickScheduler = new TickScheduler(3000, async () => {});
  const monitor = new Monitor();
  const pushManager = new PushManager();
  const economyEngine = new EconomyEngine(repo);
  const platformEngine = new PlatformEngine(repo);
  const eventEngine = new EventEngine(new WorldAgent(llmScheduler, mockConfig, repo), repo);
  const eventChainEngine = new EventChainEngine(repo);
  const factionSystem = new FactionSystem(repo);
  const relationshipManager = new RelationshipManager(repo);
  const socialEngine = new SocialEngine(llmScheduler, platformEngine, relationshipManager, repo);
  const worldPersistence = new WorldPersistence(repo, agentManager);
  const modeManager = new ModeManager();

  let currentWorldId: string | null = null;

  return {
    core: { config: mockConfig, repo, llmScheduler },
    agents: { agentManager, initAgent, relationshipManager, socialEngine },
    world: { worldClock, tickScheduler, economyEngine, platformEngine, eventEngine, eventChainEngine, factionSystem, worldPersistence },
    ui: { modeManager, pushManager, monitor },
    worldState: {
      getWorldId: () => currentWorldId,
      setWorldId: (id: string | null) => { currentWorldId = id; },
    },
  };
};

describe('API Routes', () => {
  let app: ReturnType<typeof Fastify>;
  let deps: AppDeps;

  beforeAll(async () => {
    app = Fastify();
    deps = createMockDeps();
    registerRoutes(app, deps);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('World endpoints', () => {
    it('should create a world', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/worlds',
        body: { name: 'Test World', type: 'random' },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.name).toBe('Test World');
      expect(body.data.type).toBe('random');
      expect(body.data.status).toBe('initializing');
    });

    it('should list worlds', async () => {
      await deps.core.repo.createWorld({ id: nanoid(), name: 'World 1', type: 'random' });
      await deps.core.repo.createWorld({ id: nanoid(), name: 'World 2', type: 'history' });
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/worlds',
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should get a world by id', async () => {
      const world = await deps.core.repo.createWorld({ id: nanoid(), name: 'Single World', type: 'random' });
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/worlds/${world.id}`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.id).toBe(world.id);
    });

    it('should return 404 for non-existent world', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/worlds/non-existent-id',
      });
      
      expect(response.statusCode).toBe(404);
    });

    it('should update world status', async () => {
      const world = await deps.core.repo.createWorld({ id: nanoid(), name: 'Update World', type: 'random' });
      
      const response = await app.inject({
        method: 'PUT',
        url: `/api/worlds/${world.id}`,
        body: { status: 'paused' },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe('paused');
    });

    it('should validate world type (returns 500 for ZodError)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/worlds',
        body: { name: 'Invalid World', type: 'invalid_type' },
      });
      
      expect(response.statusCode).toBe(500);
    });
  });

  describe('Agent endpoints', () => {
    let worldId: string;

    beforeAll(async () => {
      const world = await deps.core.repo.createWorld({ id: nanoid(), name: 'Agent Test World', type: 'random' });
      worldId = world.id;
      deps.worldState.setWorldId(worldId);
    });

    it('should create an agent', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/worlds/${worldId}/agents`,
        body: {
          type: 'npc',
          profile: {
            name: 'Test Agent',
            age: 25,
            gender: 'female',
            occupation: 'developer',
            personality: 'friendly',
            background: 'A test agent',
            speechStyle: 'casual',
            likes: [],
            dislikes: [],
          },
        },
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.profile.name).toBe('Test Agent');
    });

    it('should list agents for a world', async () => {
      await deps.agents.agentManager.createAgent(worldId, 'npc', {
        name: 'List Agent 1',
        age: 30,
        gender: 'male',
        occupation: 'teacher',
        personality: 'calm',
        background: 'Test',
        speechStyle: 'formal',
        likes: [],
        dislikes: [],
      });
      
      const response = await app.inject({
        method: 'GET',
        url: `/api/worlds/${worldId}/agents`,
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Economy endpoints', () => {
    it('should get shop items', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/shop/items',
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('should get jobs list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/jobs',
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Config endpoints', () => {
    it('should return config structure', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/config',
      });
      
      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.server).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should return 500 for invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/worlds',
        body: { name: '', type: 'random' },
      });
      
      expect(response.statusCode).toBe(500);
    });
  });
});