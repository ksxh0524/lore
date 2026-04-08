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
import { ModeManager } from './modes/mode-manager.js';
import { PushManager } from './scheduler/push-manager.js';
import { Monitor } from './monitor/index.js';
import { registerRoutes } from './api/routes.js';
import { registerWebSocket } from './api/ws.js';

async function main() {
  const config = loadConfig();

  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
      },
    },
  });

  app.log.info('[Lore] Starting...');

  initTables();

  const repo = new Repository();
  const llmScheduler = new LLMScheduler(config);
  const agentManager = new AgentManager(repo, llmScheduler, config);
  const initAgent = new InitAgent(llmScheduler, repo);
  const worldClock = new WorldClock(new Date(), config.world.defaultTimeSpeed);
  const worldAgent = new WorldAgent(llmScheduler);
  const economyEngine = new EconomyEngine(repo);
  const platformEngine = new PlatformEngine(repo);
  const worldPersistence = new WorldPersistence(repo);
  const modeManager = new ModeManager();
  const pushManager = new PushManager();
  const monitor = new Monitor();

  const tickScheduler = new TickScheduler(config.world.defaultTickIntervalMs, async (tick) => {
    worldClock.advance(config.world.defaultTickIntervalMs);
    const worldState = {
      currentTick: tick,
      currentTime: worldClock.getTime().toISOString(),
      day: worldClock.getDay(),
      agentCount: agentManager.getAliveCount(),
    };

    monitor.resetTick();

    const worldEvents = await worldAgent.think(worldState);
    for (const event of worldEvents) {
      await pushManager.push(event, '');
      monitor.recordEvent();
    }

    await agentManager.tickAll(worldState, llmScheduler, config);

    if (tick % 10 === 0) {
      await agentManager.persistAll();
      await worldPersistence.saveWorldState('default');
    }

    if (tick % 30 === 0) {
      pushManager.broadcast({
        type: 'world_state',
        tick,
        worldTime: worldClock.getTime().toISOString(),
        timeSpeed: worldClock.getTimeSpeed(),
        monitor: monitor.getStats(),
      });
    }

    app.log.debug({ tick, events: worldEvents.length }, 'Tick completed');
  });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  const deps = {
    config, agentManager, initAgent, llmScheduler, repo,
    modeManager, pushManager, platformEngine, economyEngine,
    worldClock, tickScheduler, monitor,
  };

  registerRoutes(app, deps);
  registerWebSocket(app, deps);

  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    app.log.info(`[Lore] Server running at http://localhost:${config.server.port}`);
  } catch (err) {
    app.log.error(err, '[Lore] Failed to start');
    process.exit(1);
  }
}

main();
