import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { LoreConfig } from '../config/loader.js';
import type { AgentManager } from '../agent/agent-manager.js';
import type { InitAgent } from '../agent/init-agent.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { Repository } from '../db/repository.js';
import type { ModeManager } from '../modes/mode-manager.js';
import type { PushManager } from '../scheduler/push-manager.js';
import type { PlatformEngine } from '../world/platform-engine.js';
import type { EconomyEngine } from '../world/economy-engine.js';
import type { WorldClock } from '../world/clock.js';
import type { TickScheduler } from '../scheduler/tick-scheduler.js';

export function registerRoutes(
  app: FastifyInstance,
  deps: {
    config: LoreConfig;
    agentManager: AgentManager;
    initAgent: InitAgent;
    llmScheduler: LLMScheduler;
    repo: Repository;
    modeManager: ModeManager;
    pushManager: PushManager;
    platformEngine: PlatformEngine;
    economyEngine: EconomyEngine;
    worldClock: WorldClock;
    tickScheduler: TickScheduler;
  },
) {
  const { config, agentManager, initAgent, llmScheduler, repo, modeManager, pushManager, platformEngine, economyEngine, worldClock, tickScheduler } = deps;

  const initSchema = z.object({
    worldType: z.enum(['history', 'random']),
    randomParams: z.object({ age: z.number(), location: z.string(), background: z.string() }).optional(),
    historyParams: z.object({ presetName: z.string(), targetCharacter: z.string().optional() }).optional(),
  });

  app.post('/api/worlds/init', async (req, reply) => {
    try {
      const body = initSchema.parse(req.body);
      const result = await initAgent.initialize(body);

      for (const agentData of result.agents) {
        const agent = await agentManager.createAgent(result.worldId, 'npc', agentData.profile);
        agent.stats = agentData.initialStats;
        await economyEngine.initAgentEconomy(result.worldId, agent.id, agentData.initialStats.money);
      }

      const userAvatar = await agentManager.createAgent(result.worldId, 'user-avatar', result.userAvatar.profile);
      userAvatar.stats = result.userAvatar.initialStats;
      await economyEngine.initAgentEconomy(result.worldId, userAvatar.id, result.userAvatar.initialStats.money, 5000, 2000);

      await platformEngine.initWorldPlatforms(result.worldId);
      tickScheduler.start();

      return { data: result };
    } catch (err) {
      console.error('Init failed:', err);
      return reply.status(500).send({ error: { code: 6002, message: err instanceof Error ? err.message : 'Init failed' } });
    }
  });

  app.get('/api/worlds/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const world = await repo.getWorld(id);
    if (!world) return reply.status(404).send({ error: { code: 1001, message: 'World not found' } });
    return { data: world };
  });

  app.post('/api/worlds/:id/pause', async (req) => {
    const { id } = req.params as { id: string };
    tickScheduler.pause();
    await repo.updateWorld(id, { status: 'paused' });
    return { data: { status: 'paused' } };
  });

  app.post('/api/worlds/:id/resume', async (req) => {
    const { id } = req.params as { id: string };
    tickScheduler.resume();
    await repo.updateWorld(id, { status: 'running' });
    return { data: { status: 'running' } };
  });

  app.get('/api/worlds/:id/agents', async (req) => {
    const { id } = req.params as { id: string };
    const agents = await agentManager.getWorldAgents(id);
    return { data: agents.map(a => a.serialize()) };
  });

  app.get('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: 2001, message: 'Agent not found' } });
    return { data: agent.serialize() };
  });

  app.post('/api/agents/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: 2001, message: 'Agent not found' } });
    const response = await agent.chatFull(content, llmScheduler, config);
    return { data: { content: response } };
  });

  app.get('/api/worlds/:id/events', async (req) => {
    const { id } = req.params as { id: string };
    const events = await repo.getWorldEvents(id);
    return { data: events };
  });

  app.get('/api/agents/:id/economy', async (req, reply) => {
    const { id } = req.params as { id: string };
    const eco = await repo.getAgentEconomy(id);
    if (!eco) return reply.status(404).send({ error: { message: 'Economy not found' } });
    return { data: eco };
  });

  app.post('/api/agents/:id/economy/spend', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = z.object({ amount: z.number().positive(), reason: z.string() }).parse(req.body);
    const ok = await economyEngine.spend(id, amount, reason);
    if (!ok) return reply.status(400).send({ error: { message: 'Insufficient funds' } });
    return { data: { success: true } };
  });

  app.post('/api/agents/:id/economy/earn', async (req) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = z.object({ amount: z.number().positive(), reason: z.string() }).parse(req.body);
    await economyEngine.earn(id, amount, reason);
    return { data: { success: true } };
  });

  app.get('/api/worlds/:id/platforms', async (req) => {
    const { id } = req.params as { id: string };
    return { data: await platformEngine.getWorldPlatforms(id) };
  });

  app.get('/api/platforms/:id/feed', async (req) => {
    const { id } = req.params as { id: string };
    return { data: await platformEngine.getFeed(id) };
  });

  app.post('/api/user/posts', async (req) => {
    const { platformId, content, imageUrl } = z.object({
      platformId: z.string(), content: z.string(), imageUrl: z.string().optional(),
    }).parse(req.body);
    const post = await platformEngine.post({ platformId, worldId: '', authorId: 'user', authorType: 'user', content, imageUrl });
    return { data: post };
  });

  app.post('/api/mode/switch', async (req) => {
    const { mode } = z.object({ mode: z.enum(['character', 'god']) }).parse(req.body);
    await modeManager.switchMode(mode);
    return { data: { mode } };
  });

  app.get('/api/config', async () => {
    const safe = { world: config.world, server: config.server, dataDir: config.dataDir };
    return { data: { ...safe, llm: { ...config.llm, providers: config.llm.providers.map(p => ({ name: p.name, type: p.type, baseUrl: p.baseUrl, models: p.models, apiKey: '***' })) } } };
  });

  app.get('/api/worlds/:id/monitor', async (req) => {
    const agents = await agentManager.getWorldAgents((req.params as { id: string }).id);
    return { data: {
      tick: tickScheduler.getTickNumber(),
      worldTime: worldClock.getTime(),
      agentCount: agents.length,
      isRunning: tickScheduler.isRunning(),
    }};
  });
}
