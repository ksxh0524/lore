import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from './config/loader.js';
import { initTables } from './db/index.js';
import { Repository } from './db/repository.js';
import { LLMScheduler } from './llm/scheduler.js';
import { AgentManager } from './agent/agent-manager.js';
import { InitAgent } from './agent/init-agent.js';
import { WorldClock } from './world/clock.js';
import { WorldAgent } from './world/world-agent.js';
import { TickScheduler } from './scheduler/tick-scheduler.js';
import { EconomyEngine } from './world/economy-engine.js';
import { PlatformEngine } from './world/platform-engine.js';
import { WorldPersistence } from './world/persistence.js';
import { EventEngine } from './world/event-engine.js';
import { EventChainEngine } from './world/event-chain-engine.js';
import { FactionSystem } from './world/faction-system.js';
import { RelationshipManager } from './agent/relationships.js';
import { SocialEngine } from './agent/social.js';
import { ModeManager } from './modes/mode-manager.js';
import { PushManager } from './scheduler/push-manager.js';
import { Monitor } from './monitor/index.js';
import { registerRoutes } from './api/routes.js';
import { registerWebSocket } from './api/ws.js';
import { registerProviderRoutes } from './api/provider-routes.js';
import { initLogger, createLogger, logMonitorStats } from './logger/index.js';
import { nanoid } from 'nanoid';

async function main() {
  const config = loadConfig();

  initLogger({
    level: config.log.level,
    dir: config.dataDir + '/logs',
    maxFiles: config.log.maxFiles,
    maxSizeMB: config.log.maxSizeMB,
    console: config.log.console,
  });

  const logger = createLogger('server');

  if (!process.env.LORE_ENCRYPTION_KEY) {
    logger.warn('No encryption key set (LORE_ENCRYPTION_KEY)');
    logger.warn('API Keys stored in database will NOT be securely encrypted');
    logger.warn('For production use, set a secure 32+ character key');
  }

  const app = Fastify({
    logger: false,
  });

  logger.info('[Lore] Starting...');

  initTables();

  const repo = new Repository();
  const llmScheduler = new LLMScheduler(config);
  const monitor = new Monitor();
  llmScheduler.setMonitor(monitor);
  const agentManager = new AgentManager(repo, llmScheduler, config);
  const initAgent = new InitAgent(llmScheduler, repo, config);
  const worldClock = new WorldClock(new Date(), config.world.defaultTimeSpeed);
  const worldAgent = new WorldAgent(llmScheduler);
  const economyEngine = new EconomyEngine(repo);
  const platformEngine = new PlatformEngine(repo);
  const worldPersistence = new WorldPersistence(repo, agentManager);
  const eventEngine = new EventEngine(worldAgent, repo);
  const eventChainEngine = new EventChainEngine(repo);
  const factionSystem = new FactionSystem(repo);
  const relationshipManager = new RelationshipManager(repo);
  const socialEngine = new SocialEngine(llmScheduler, platformEngine, relationshipManager);
  const modeManager = new ModeManager();
  const pushManager = new PushManager();

  let currentWorldId: string | null = null;

  const tickLogger = createLogger('tick');

  const tickScheduler = new TickScheduler(config.world.defaultTickIntervalMs, async (tick) => {
    worldClock.advance(config.world.defaultTickIntervalMs);
    const worldState = {
      currentTick: tick,
      currentTime: worldClock.getTime().toISOString(),
      day: worldClock.getDay(),
      agentCount: agentManager.getAliveCount(),
      worldId: currentWorldId,
    };

    monitor.resetTick();
    monitor.startTick();

    const agents = agentManager.getAgentsMap();
    const aliveAgents = [...agents.values()]
      .filter((a) => a.state.status !== 'dead');

    tickLogger.debug({ tick, aliveCount: aliveAgents.length }, 'Tick started');

    const worldEvents = await eventEngine.generate(worldClock, aliveAgents, worldState);
    for (const event of worldEvents) {
      if (!event.processed) {
        await eventEngine.applyConsequences(event, agentManager);
      }
      await pushManager.push(event, currentWorldId ?? '');
      monitor.recordEvent();

      if (currentWorldId) {
        const chainEvents = await eventChainEngine.checkChains(event, currentWorldId);
        for (const ce of chainEvents) {
          await eventEngine.applyConsequences(ce, agentManager);
          await repo.createEvent(ce);
          await pushManager.push(ce, currentWorldId);
          monitor.recordEvent();
        }
      }
    }

    const prevAlive = aliveAgents.length;
    await agentManager.tickAll(worldState, llmScheduler, config);
    const nowAlive = [...agents.values()].filter((a) => a.state.status !== 'dead');

    if (nowAlive.length < prevAlive) {
      const deadAgents = aliveAgents.filter((a) => a.state.status === 'dead');
      for (const dead of deadAgents) {
        pushManager.broadcast({
          type: 'agent_died',
          agentId: dead.id,
          name: dead.profile?.name ?? 'Unknown',
          worldId: currentWorldId,
          timestamp: new Date().toISOString(),
        });

        const known = await relationshipManager.getAll(dead.id);
        for (const rel of known) {
          if (rel.type !== 'stranger') {
            const survivor = agentManager.get(rel.targetAgentId);
            if (survivor) {
              survivor.stats.mood = Math.max(0, survivor.stats.mood - 15);
              await survivor.memory.add(
                `${dead.profile?.name ?? '某人'}去世了，我很难过。`,
                'event', 0.9,
              );
            }
          }
        }

        tickLogger.info({ agentId: dead.id, name: dead.profile?.name }, 'Agent died');
      }
    }

    if (tick % 20 === 0 && aliveAgents.length > 0) {
      const activeAgents = aliveAgents.filter((a) =>
        a.state.status !== 'sleeping' && a.type === 'npc' && Math.random() < 0.15,
      );

      for (const agent of activeAgents.slice(0, 3)) {
        try {
          await socialEngine.postSocial(agent);
        } catch {}
      }
    }

    if (tick % 50 === 0 && aliveAgents.length > 1) {
      const socialCandidates = aliveAgents.filter((a) =>
        a.state.status !== 'sleeping' && a.type === 'npc' && Math.random() < 0.1,
      );

      for (const agent of socialCandidates.slice(0, 2)) {
        try {
          const rels = await relationshipManager.getAll(agent.id);
          const friends = rels.filter((r) => r.type === 'friend' || r.type === 'close_friend');
          if (friends.length > 0) {
            const target = friends[Math.floor(Math.random() * friends.length)]!;
            await relationshipManager.update(agent.id, target.targetAgentId, {
              intimacy: 1,
              historyEntry: '日常闲聊',
            });
          }
        } catch {}
      }
    }

    if (tick % 10 === 0) {
      await agentManager.persistAll();
      if (currentWorldId) {
        await worldPersistence.saveWorldState(currentWorldId);
        await relationshipManager.decayInactive(currentWorldId);
      }
      tickLogger.debug({ tick }, 'Persisted world state');
    }

    if (tick % 100 === 0 && currentWorldId) {
      await eventChainEngine.cleanupExpired(currentWorldId);
    }

    if (tick % 30 === 0) {
      pushManager.broadcast({
        type: 'world_state',
        tick,
        worldTime: worldClock.getTime().toISOString(),
        timeSpeed: worldClock.getTimeSpeed(),
        monitor: monitor.getStats(),
      });
      logMonitorStats(monitor.getStats());
    }

    monitor.endTick();
    tickLogger.debug({ tick, events: worldEvents.length, durationMs: monitor.getStats().tickDurationMs }, 'Tick completed');
  });

  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:39528', 'http://localhost:5173', 'http://127.0.0.1:39528', 'http://127.0.0.1:5173'];
  
  await app.register(cors, { 
    origin: corsOrigins,
    credentials: true,
  });
  await app.register(websocket);

  const deps = {
    config, agentManager, initAgent, llmScheduler, repo,
    modeManager, pushManager, platformEngine, economyEngine,
    worldClock, tickScheduler, monitor, worldPersistence,
    eventEngine, eventChainEngine, factionSystem,
    relationshipManager, socialEngine,
    getWorldId: () => currentWorldId,
    setWorldId: (id: string | null) => { currentWorldId = id; },
  };

  registerRoutes(app, deps);
  registerWebSocket(app, deps);
  registerProviderRoutes(app, repo);

  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    logger.info(`[Lore] Server running at http://localhost:${config.server.port}`);
  } catch (err) {
    logger.error(err, '[Lore] Failed to start');
    process.exit(1);
  }
}

main();