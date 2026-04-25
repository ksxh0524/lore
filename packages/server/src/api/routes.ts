import type { FastifyInstance, FastifyReply } from 'fastify';
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
import type { TieredTickScheduler } from '../foundation/scheduler/tiered-tick-scheduler.js';
import type { GeographyDB } from '../foundation/geography/geography-db.js';
import type { AstronomyEngine } from '../foundation/astronomy/astronomy-engine.js';
import type { WeatherEngine } from '../foundation/weather/weather-engine.js';
import type { VirtualityManager } from '../foundation/virtuality/virtuality-manager.js';
import type { ErrorManager } from '../foundation/performance/error-manager.js';
import type { PerformanceMonitor } from '../foundation/performance/performance-monitor.js';
import type { OnDemandGenerator } from '../foundation/virtuality/on-demand-generator.js';
import type { BatchLLMScheduler } from '../foundation/scheduler/batch-llm-scheduler.js';
import type { Monitor } from '../monitor/index.js';
import type { WorldPersistence } from '../world/persistence.js';
import type { EventEngine } from '../world/event-engine.js';
import type { EventChainEngine } from '../world/event-chain-engine.js';
import type { FactionSystem } from '../world/faction-system.js';
import type { RelationshipManager } from '../agent/relationships.js';
import type { SocialEngine } from '../agent/social.js';
import { ErrorCode, LoreError } from '../errors.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('routes');

export interface AppDeps {
  core: {
    config: LoreConfig;
    repo: Repository;
    llmScheduler: LLMScheduler;
  };
  agents: {
    agentManager: AgentManager;
    initAgent: InitAgent;
    relationshipManager: RelationshipManager;
    socialEngine: SocialEngine;
  };
  world: {
    worldClock: WorldClock;
    tickScheduler: TickScheduler | TieredTickScheduler;
    economyEngine: EconomyEngine;
    platformEngine: PlatformEngine;
    eventEngine: EventEngine;
    eventChainEngine: EventChainEngine;
    factionSystem: FactionSystem;
    worldPersistence: WorldPersistence;
  };
  ui: {
    modeManager: ModeManager;
    pushManager: PushManager;
    monitor: Monitor;
  };
  worldState: {
    getWorldId: () => string | null;
    setWorldId: (id: string | null) => void;
  };
  foundation?: {
    geographyDB: GeographyDB;
    astronomyEngine: AstronomyEngine;
    weatherEngine: WeatherEngine;
    virtualityManager: VirtualityManager;
    errorManager: ErrorManager;
    performanceMonitor: PerformanceMonitor;
    onDemandGenerator: OnDemandGenerator;
    batchLLMScheduler: BatchLLMScheduler;
  };
}

export function registerRoutes(app: FastifyInstance, deps: AppDeps) {
  const { config, repo, llmScheduler } = deps.core;
  const { agentManager, initAgent, relationshipManager, socialEngine } = deps.agents;
  const { worldClock, tickScheduler, economyEngine, platformEngine, eventEngine, eventChainEngine, factionSystem, worldPersistence } = deps.world;
  const { modeManager, pushManager, monitor } = deps.ui;
  const { getWorldId, setWorldId } = deps.worldState;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof LoreError) {
      return reply.status(err.statusCode).send({ error: { code: err.code, message: err.message } });
    }
    if (err instanceof Error && 'validation' in err) {
      return reply.status(400).send({ error: { code: ErrorCode.VALIDATION_ERROR, message: err.message } });
    }
    logger.error(err, 'Unhandled error');
    return reply.status(500).send({ error: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' } });
  });

  const initSchema = z.object({
    worldType: z.enum(['history', 'random']),
    randomParams: z.object({
      age: z.number(),
      location: z.string(),
      background: z.string(), // Required for backwards compatibility
      locationData: z.object({
        name: z.string(),
        lat: z.number(),
        lng: z.number(),
        country: z.string(),
        type: z.string(),
        culture: z.string(),
      }).optional(),
      userDescription: z.string().optional(),
    }).optional(),
    historyParams: z.object({ presetName: z.string(), targetCharacter: z.string().optional() }).optional(),
  });

  const worldUpdateSchema = z.object({
    name: z.string().optional(),
    status: z.enum(['initializing', 'running', 'paused', 'stopped']).optional(),
    config: z.any().optional(),
  });

  // ── World ──

  app.get('/api/worlds', async () => {
    const worlds = await repo.getAllWorlds();
    return { data: worlds };
  });

  app.post('/api/worlds', async (req) => {
    const { name, type } = z.object({ name: z.string().min(1), type: z.enum(['history', 'random']) }).parse(req.body);
    const world = await repo.createWorld({ id: nanoid(), name, type });
    return { data: world };
  });

  app.post('/api/worlds/init', async (req, reply) => {
    try {
      const body = initSchema.parse(req.body);
      pushManager.broadcast({ type: 'init_progress', stage: 'generating', progress: 20 });

      const result = await initAgent.initialize(body);
      pushManager.broadcast({ type: 'init_progress', stage: 'creating_agents', progress: 50 });

      for (const agentData of result.agents) {
        const agent = await agentManager.createAgent(result.worldId, 'npc', agentData.profile, agentData.initialStats);
        await economyEngine.initAgentEconomy(result.worldId, agent.id, agentData.initialStats.money);
      }

      const userAvatar = await agentManager.createAgent(result.worldId, 'user-avatar', result.userAvatar.profile, result.userAvatar.initialStats);
      await economyEngine.initAgentEconomy(result.worldId, userAvatar.id, result.userAvatar.initialStats.money, 5000, 2000);
      pushManager.broadcast({ type: 'init_progress', stage: 'building_relationships', progress: 80 });

      await platformEngine.initWorldPlatforms(result.worldId);
      setWorldId(result.worldId);
      await repo.updateWorld(result.worldId, { status: 'running' });
      tickScheduler.start();

      pushManager.broadcast({ type: 'init_complete', worldId: result.worldId, agentCount: result.agents.length });
      return { data: result };
    } catch (err) {
      logger.error(err, 'World init failed');
      return reply.status(500).send({ error: { code: ErrorCode.INIT_GENERATION_FAILED, message: err instanceof Error ? err.message : 'Init failed' } });
    }
  });

  app.get('/api/worlds/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const world = await repo.getWorld(id);
    if (!world) return reply.status(404).send({ error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'World not found' } });
    return { data: world };
  });

  app.put('/api/worlds/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = worldUpdateSchema.parse(req.body);
    const world = await repo.updateWorld(id, body);
    if (!world) return reply.status(404).send({ error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'World not found' } });
    return { data: world };
  });

  app.delete('/api/worlds/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const world = await repo.getWorld(id);
    if (!world) return reply.status(404).send({ error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'World not found' } });
    if (world.status === 'running') tickScheduler.stop();
    await repo.updateWorld(id, { status: 'stopped' });
    if (getWorldId() === id) setWorldId(null);
    return { data: { id, status: 'stopped' } };
  });

  app.post('/api/worlds/:id/pause', async (req) => {
    const { id } = req.params as { id: string };
    tickScheduler.pause();
    await repo.updateWorld(id, { status: 'paused' });
    pushManager.broadcast({ type: 'world_state', tick: tickScheduler.getTickNumber(), worldTime: worldClock.getTime().toISOString(), status: 'paused' });
    return { data: { status: 'paused' } };
  });

  app.post('/api/worlds/:id/resume', async (req) => {
    const { id } = req.params as { id: string };
    tickScheduler.resume();
    await repo.updateWorld(id, { status: 'running' });
    pushManager.broadcast({ type: 'world_state', tick: tickScheduler.getTickNumber(), worldTime: worldClock.getTime().toISOString(), status: 'running' });
    return { data: { status: 'running' } };
  });

  app.get('/api/worlds/:id/init-status', async (req) => {
    const { id } = req.params as { id: string };
    const world = await repo.getWorld(id);
    if (!world) return { data: { stage: 'not_found', progress: 0 } };
    const progress = world.status === 'running' ? 100 : world.status === 'initializing' ? 50 : 0;
    return { data: { stage: world.status, progress } };
  });

  app.post('/api/worlds/:id/save', async (req) => {
    const { id } = req.params as { id: string };
    const { name } = z.object({ name: z.string().min(1) }).optional().default({ name: `save-${Date.now()}` }).parse(req.body);
    const saveId = await worldPersistence.saveSnapshot(id, name);
    return { data: { saveId } };
  });

  app.get('/api/worlds/:id/saves', async (req) => {
    const { id } = req.params as { id: string };
    const saves = await worldPersistence.listSnapshots(id);
    return { data: saves };
  });

  app.post('/api/saves/:id/load', async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = await worldPersistence.loadSnapshot(id);
    if (!result) return reply.status(404).send({ error: { code: ErrorCode.WORLD_NOT_FOUND, message: 'Save not found' } });
    await worldPersistence.restoreSnapshot(id);
    setWorldId(result.worldId);
    return { data: { success: true, worldId: result.worldId } };
  });

  app.delete('/api/saves/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    await repo.deleteSave(id);
    return { data: { success: true } };
  });

  app.post('/api/worlds/:id/speed', async (req) => {
    const { id } = req.params as { id: string };
    const { speed } = z.object({ speed: z.number().min(0).max(100) }).parse(req.body);
    worldClock.setTimeSpeed(speed);
    return { data: { speed } };
  });

  // ── God Mode ──

  app.get('/api/god/world/:id/agents', async (req) => {
    const { id } = req.params as { id: string };
    const agents = await agentManager.getWorldAgents(id);
    return { data: agents.map(a => ({ ...a.serialize(), thoughtFrequency: a.getThoughtFrequency() })) };
  });

  app.get('/api/god/agent/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    const rels = await repo.getAgentRelationships(id);
    const memories = await repo.getAgentMemories(id, 20);
    return { data: { ...agent.serialize(), relationships: rels, recentMemories: memories.map(m => ({ content: m.content, type: m.type, importance: m.importance })) } };
  });

  app.post('/api/god/trigger-event', async (req) => {
    const { category, description, severity } = z.object({
      category: z.enum(['natural_disaster', 'epidemic', 'economic', 'social', 'other']),
      description: z.string().min(1),
      severity: z.number().min(1).max(10).default(5),
    }).parse(req.body);
    const worldId = getWorldId() ?? '';
    const { nanoid: nid } = await import('nanoid');
    const event = {
      id: nid(),
      worldId,
      type: 'world' as const,
      category,
      description,
      involvedAgents: [],
      consequences: [],
      timestamp: new Date(),
      processed: false,
      priority: 50 + severity * 5,
    };
    await repo.createEvent(event);
    pushManager.broadcast({ type: 'event', event });
    return { data: event };
  });

  // ── Agent ──

  app.get('/api/worlds/:id/agents', async (req) => {
    const { id } = req.params as { id: string };
    const agents = await agentManager.getWorldAgents(id);
    return { data: agents.map(a => a.serialize()) };
  });

  app.get('/api/agents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    return { data: agent.serialize() };
  });

  app.post('/api/worlds/:id/agents', async (req) => {
    const { id } = req.params as { id: string };
    const { type, profile } = z.object({
      type: z.enum(['npc', 'system', 'user-avatar']),
      profile: z.object({
        name: z.string(), age: z.number(), gender: z.string(), occupation: z.string(),
        personality: z.string(), background: z.string(), speechStyle: z.string(),
        likes: z.array(z.string()).default([]), dislikes: z.array(z.string()).default([]),
      }),
    }).parse(req.body);
    const agent = await agentManager.createAgent(id, type, profile);
    return { data: agent.serialize() };
  });

  // ── Chat ──

  app.get('/api/agents/:id/messages', async (req) => {
    const { id } = req.params as { id: string };
    const messages = await repo.getAgentMessages(id);
    return { data: messages };
  });

  app.post('/api/agents/:id/messages', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    const response = await agent.chatFull(content, llmScheduler, config);
    await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: id, content, type: 'chat' });
    await repo.createMessage({ id: nanoid(), worldId: agent.worldId, toAgentId: id, content: response, type: 'chat' });
    return { data: { content: response } };
  });

  app.post('/api/agents/:id/chat', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let aborted = false;
    req.raw.on('close', () => { aborted = true; });

    let full = '';
    for await (const chunk of agent.chat(content, llmScheduler, config)) {
      if (aborted) break;
      full += chunk;
      reply.raw.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
    }

    if (!aborted) {
      reply.raw.write(`data: ${JSON.stringify({ chunk: '', done: true })}\n\n`);
      await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: id, content, type: 'chat' });
      await repo.createMessage({ id: nanoid(), worldId: agent.worldId, toAgentId: id, content: full, type: 'chat' });
    }

    reply.raw.end();
  });

  // ── Events ──

  app.get('/api/worlds/:id/events', async (req) => {
    const { id } = req.params as { id: string };
    const events = await repo.getWorldEvents(id);
    return { data: events };
  });

  // ── Economy ──

  app.get('/api/agents/:id/economy', async (req, reply) => {
    const { id } = req.params as { id: string };
    const eco = await repo.getAgentEconomy(id);
    if (!eco) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Economy not found' } });
    return { data: eco };
  });

  app.post('/api/agents/:id/economy/spend', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = z.object({ amount: z.number().positive(), reason: z.string() }).parse(req.body);
    const ok = await economyEngine.spend(id, amount, reason);
    if (!ok) return reply.status(400).send({ error: { code: ErrorCode.VALIDATION_ERROR, message: 'Insufficient funds' } });
    return { data: { success: true } };
  });

  app.post('/api/agents/:id/economy/earn', async (req) => {
    const { id } = req.params as { id: string };
    const { amount, reason } = z.object({ amount: z.number().positive(), reason: z.string() }).parse(req.body);
    await economyEngine.earn(id, amount, reason);
    return { data: { success: true } };
  });

  // ── Shop ──

  app.get('/api/shop/items', async () => {
    return { data: economyEngine.getShopItems() };
  });

  app.get('/api/shop/items/:category', async (req) => {
    const { category } = req.params as { category: string };
    return { data: economyEngine.getShopItemsByCategory(category as any) };
  });

  app.post('/api/agents/:id/buy', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { itemId } = z.object({ itemId: z.string() }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    const success = await economyEngine.buy(agent, itemId);
    if (!success) return reply.status(400).send({ error: { code: ErrorCode.VALIDATION_ERROR, message: 'Purchase failed (insufficient funds or item not found)' } });
    return { data: { success: true, newBalance: agent.stats.money } };
  });

  // ── Jobs ──

  app.get('/api/jobs', async () => {
    return { data: economyEngine.getAllJobs() };
  });

  app.get('/api/jobs/:category', async (req) => {
    const { category } = req.params as { category: string };
    return { data: economyEngine.getJobsByCategory(category as any) };
  });

  app.get('/api/agents/:id/can-apply/:jobId', async (req) => {
    const { id, jobId } = req.params as { id: string; jobId: string };
    const agent = agentManager.get(id);
    if (!agent) return { data: { canApply: false, reason: 'Agent not found' } };
    const canApply = economyEngine.canApplyJob(agent, jobId);
    return { data: { canApply } };
  });

  app.post('/api/agents/:id/apply-job', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { jobId } = z.object({ jobId: z.string() }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    if (!economyEngine.canApplyJob(agent, jobId)) {
      return reply.status(400).send({ error: { code: ErrorCode.VALIDATION_ERROR, message: 'Cannot apply for this job' } });
    }
    const job = economyEngine.getJob(jobId);
    if (!job) return reply.status(404).send({ error: { code: ErrorCode.VALIDATION_ERROR, message: 'Job not found' } });
    agent.profile.occupation = job.name;
    await economyEngine.applyJobEffect(agent, jobId);
    await agentManager.persist(id);
    return { data: { success: true, job } };
  });

  app.post('/api/agents/:id/quit-job', async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    agent.profile.occupation = '无业';
    const eco = await repo.getAgentEconomy(id);
    if (eco) {
      await repo.updateEconomy(eco.id, { income: 0 });
    }
    await agentManager.persist(id);
    return { data: { success: true } };
  });

  // ── Platform ──

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
    const worldId = getWorldId() ?? '';
    const post = await platformEngine.post({ platformId, worldId, authorId: 'user', authorType: 'user', content, imageUrl });
    return { data: post };
  });

  app.post('/api/posts/:id/like', async (req) => {
    const { id } = req.params as { id: string };
    const { agentId } = z.object({ agentId: z.string().optional() }).parse(req.body ?? {});
    await platformEngine.likePost(agentId ?? 'user', id);
    return { data: { success: true } };
  });

  app.post('/api/posts/:id/comment', async (req) => {
    const { id } = req.params as { id: string };
    const { authorId, content } = z.object({ authorId: z.string(), content: z.string().min(1) }).parse(req.body);
    await platformEngine.commentPost(authorId, id, content);
    return { data: { success: true } };
  });

  app.post('/api/agents/:id/posts', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { content, platformId } = z.object({ content: z.string().min(1), platformId: z.string().optional() }).parse(req.body);
    const agent = agentManager.get(id);
    if (!agent) return reply.status(404).send({ error: { code: ErrorCode.AGENT_NOT_FOUND, message: 'Agent not found' } });
    const { SocialEngine } = await import('../agent/social.js');
    const { RelationshipManager } = await import('../agent/relationships.js');
    const rm = new RelationshipManager(repo);
    const se = new SocialEngine(llmScheduler, platformEngine, rm);
    const post = await se.postSocial(agent, content, platformId);
    return { data: post };
  });

  app.get('/api/worlds/:id/platforms/all', async (req) => {
    const { id } = req.params as { id: string };
    const posts = await repo.getAllPlatforms(id);
    return { data: posts };
  });

  // ── Mode ──

  app.post('/api/mode/switch', async (req) => {
    const { mode } = z.object({ mode: z.enum(['character', 'god']) }).parse(req.body);
    await modeManager.switchMode(mode);
    return { data: { mode } };
  });

  // ── Config ──

  app.get('/api/config', async () => {
    const safe = { world: config.world, server: config.server, dataDir: config.dataDir };
    return { data: { ...safe, llm: { ...config.llm, providers: config.llm.providers.map(p => ({ name: p.name, type: p.type ?? 'openai', baseUrl: p.baseUrl, models: p.models, apiKey: '***' })) } } };
  });

  app.put('/api/config', async () => {
    return { data: { message: 'Config update not supported at runtime. Edit ~/.lore/config.json and restart.' } };
  });

  // ── Monitor ──

  app.get('/api/worlds/:id/monitor', async (req) => {
    const agents = await agentManager.getWorldAgents((req.params as { id: string }).id);
    return { data: {
      tick: tickScheduler.getTickNumber(),
      worldTime: worldClock.getTime().toISOString(),
      agentCount: agents.length,
      isRunning: tickScheduler.isRunning(),
      ...monitor.getStats(),
    }};
  });

  // ── Factions ──

  app.get('/api/worlds/:id/factions', async (req) => {
    const { id } = req.params as { id: string };
    return { data: await factionSystem.getWorldFactions(id) };
  });

  app.post('/api/worlds/:id/factions', async (req) => {
    const { id } = req.params as { id: string };
    const { name, description, leaderId } = z.object({
      name: z.string().min(1),
      description: z.string().default(''),
      leaderId: z.string().min(1),
    }).parse(req.body);
    const faction = await factionSystem.createFaction(id, name, description, leaderId);
    return { data: faction };
  });

  app.post('/api/factions/:id/add-member', async (req) => {
    const { id } = req.params as { id: string };
    const { agentId } = z.object({ agentId: z.string().min(1) }).parse(req.body);
    await factionSystem.addMember(id, agentId);
    return { data: { success: true } };
  });

  app.post('/api/factions/:id/remove-member', async (req) => {
    const { id } = req.params as { id: string };
    const { agentId } = z.object({ agentId: z.string().min(1) }).parse(req.body);
    await factionSystem.removeMember(id, agentId);
    return { data: { success: true } };
  });

  // ── Relationships ──

  app.get('/api/agents/:id/relationships', async (req) => {
    const { id } = req.params as { id: string };
    return { data: await relationshipManager.getAll(id) };
  });

  // ── Event Chains ──

  app.post('/api/worlds/:id/event-chains', async (req) => {
    const { id } = req.params as { id: string };
    const { triggerEventId, nextEvent, condition, delayTicks } = z.object({
      triggerEventId: z.string().min(1),
      nextEvent: z.object({
        description: z.string().min(1),
        type: z.enum(['world', 'random', 'social', 'romantic', 'career', 'crisis', 'user', 'routine']).optional(),
        category: z.string().optional(),
        priority: z.number().optional(),
        involvedAgents: z.array(z.string()).optional(),
      }),
      condition: z.record(z.any()).optional(),
      delayTicks: z.number().default(0),
    }).parse(req.body);
    const chainId = await eventChainEngine.registerChain(id, triggerEventId, nextEvent, condition, delayTicks);
    return { data: { chainId } };
  });
}
