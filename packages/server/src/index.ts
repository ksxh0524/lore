import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { loadConfig } from './config/loader.js';
import { initTables } from './db/index.js';
import { Repository } from './db/repository.js';
import { LLMScheduler } from './llm/scheduler.js';
import { ProviderFactory } from './llm/factory.js';
import { ImageGenerator } from './llm/image-generator.js';
import { AgentManager } from './agent/agent-manager.js';
import { InitAgent } from './agent/init-agent.js';
import { WorldClock } from './world/clock.js';
import { WorldAgent } from './world/world-agent.js';
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
import { initLogger, createLogger } from './logger/index.js';
import { agentEventBus } from './agent/event-bus.js';
import { nanoid } from 'nanoid';

import { 
  TieredTickScheduler, 
  BatchLLMScheduler,
  GeographyDB, 
  AstronomyEngine, 
  WeatherEngine,
  ErrorManager,
  PerformanceMonitor,
  VirtualityManager,
  OnDemandGenerator,
} from './foundation/index.js';

import type { BatchDecisionInput, BatchDecisionOutput } from './foundation/index.js';

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

  logger.info('[Lore Foundation] Starting...');

  initTables();

  const repo = new Repository();
  const providerFactory = new ProviderFactory(config);
  
  const originalLLMScheduler = new LLMScheduler(config);
  const batchLLMScheduler = new BatchLLMScheduler(config);
  
  const imageGenerator = new ImageGenerator(config, providerFactory);
  
  const errorManager = new ErrorManager();
  const performanceMonitor = new PerformanceMonitor();
  performanceMonitor.startMonitoring(60000);
  
  performanceMonitor.registerDegradationCallback('memory', () => {
    logger.warn('Memory degradation triggered - consider reducing agent count');
  });
  performanceMonitor.registerDegradationCallback('llm_queue', () => {
    logger.warn('LLM queue overload - requests may be dropped');
  });
  performanceMonitor.registerDegradationCallback('token_usage', () => {
    logger.warn('Token usage high - switching to cheaper model');
  });
  
  originalLLMScheduler.setMonitor(new Monitor());
  
  const geographyDB = new GeographyDB();
  await geographyDB.loadEssential();
  
  const astronomyEngine = new AstronomyEngine();
  const weatherEngine = new WeatherEngine();
  const virtualityManager = new VirtualityManager();
  virtualityManager.startAutoDowngrade();
  
  const onDemandGenerator = new OnDemandGenerator(originalLLMScheduler, config, repo);
  
  const agentManager = new AgentManager(repo, originalLLMScheduler, config);
  const initAgent = new InitAgent(originalLLMScheduler, repo, config);
  const worldClock = new WorldClock(new Date(), config.world.defaultTimeSpeed);
  const worldAgent = new WorldAgent(originalLLMScheduler, config, repo);
  const economyEngine = new EconomyEngine(repo);
  const platformEngine = new PlatformEngine(repo);
  platformEngine.setLLMScheduler(originalLLMScheduler);
  platformEngine.setImageGenerator(imageGenerator);
  platformEngine.setConfig(config);
  const worldPersistence = new WorldPersistence(repo, agentManager);
  const relationshipManager = new RelationshipManager(repo);
  const eventEngine = new EventEngine(worldAgent, repo);
  eventEngine.setRelationshipManager(relationshipManager);
  eventEngine.setLLMScheduler(originalLLMScheduler);
  eventEngine.setConfig(config);
  const eventChainEngine = new EventChainEngine(repo);
  eventChainEngine.setRelationshipManager(relationshipManager);
  eventChainEngine.setAgentManager(agentManager);
  const factionSystem = new FactionSystem(repo);
  const socialEngine = new SocialEngine(originalLLMScheduler, platformEngine, relationshipManager, repo);
  socialEngine.setConfig(config);
  socialEngine.setAgentManager(agentManager);
  const modeManager = new ModeManager();
  const pushManager = new PushManager();

  let currentWorldId: string | null = null;
  let userCityId: string | null = null;
  let userCountryId: string | null = null;

  const tickLogger = createLogger('tick');
  const monitor = new Monitor();

  const tieredTickScheduler = new TieredTickScheduler();
  
  tieredTickScheduler.registerHandler('level0', async (tick, level) => {
    const startTime = Date.now();
    worldClock.advance(3000);

    const agents = agentManager.getAgentsMap();
    const aliveAgents = [...agents.values()].filter((a) => a.state.status !== 'dead');

    const moodValues = aliveAgents.map(a => a.stats.mood);
    const avgMood = moodValues.length > 0 ? moodValues.reduce((a, b) => a + b, 0) / moodValues.length : 70;
    const avgHealth = aliveAgents.length > 0 
      ? aliveAgents.map(a => a.stats.health).reduce((a, b) => a + b, 0) / aliveAgents.length : 100;
    const avgEnergy = aliveAgents.length > 0 
      ? aliveAgents.map(a => a.stats.energy).reduce((a, b) => a + b, 0) / aliveAgents.length : 100;
    const employedCount = aliveAgents.filter(a => 
      a.profile.occupation && !['无业', '学生', '退休'].includes(a.profile.occupation)
    ).length;

    const worldState = {
      currentTick: tick,
      currentTime: worldClock.getTime().toISOString(),
      day: worldClock.getDay(),
      agentCount: aliveAgents.length,
      worldId: currentWorldId ?? '',
      avgMood,
      avgHealth,
      avgEnergy,
      avgMoney: 1000,
      moodDistribution: {
        happy: moodValues.filter(m => m >= 70).length,
        neutral: moodValues.filter(m => m >= 40 && m < 70).length,
        sad: moodValues.filter(m => m < 40).length,
      },
      employmentRate: aliveAgents.length > 0 ? employedCount / aliveAgents.length : 0,
      recentEvents: [],
    };

    const tickMetrics = {
      tickNumber: tick,
      level,
      startTime,
      endTime: 0,
      durationMs: 0,
      timeoutHit: false,
      agentsProcessed: 0,
      eventsGenerated: 0,
      llmCalls: 0,
      tokensUsed: 0,
    };

    try {
      const worldEvents = await errorManager.executeWithRetry(
        () => eventEngine.generate(worldClock, aliveAgents, worldState, relationshipManager),
        'tick',
        { tick }
      );

      for (const event of worldEvents) {
        if (!event.processed) {
          await eventEngine.applyConsequences(event, agentManager);
        }
        await pushManager.push(event, currentWorldId ?? '');
        tickMetrics.eventsGenerated++;
      }

      const level0Agents = aliveAgents.filter(a => {
        const agentLevel = virtualityManager.getEntityLevel(a.id);
        return agentLevel === 'level0' && a.state.status !== 'sleeping';
      });

      if (level0Agents.length > 0) {
        try {
          const batchInputs: BatchDecisionInput[] = level0Agents.map(a => ({
            agentId: a.id,
            profile: a.profile,
            stats: a.stats,
            state: a.state,
            pendingEvents: [],
          }));

          const batchResults = await batchLLMScheduler.submitBatchDecision(batchInputs, worldState);
          
          for (const result of batchResults) {
            const agent = agentManager.get(result.agentId);
            if (agent && result.action) {
              agent.applyStatChanges([
                { stat: 'mood', delta: result.moodChange, reason: result.action }
              ]);
            }
          }

          tickMetrics.agentsProcessed = level0Agents.length;
          tickMetrics.llmCalls = 1;
          tickMetrics.tokensUsed = batchLLMScheduler.getTotalTokensUsed();
        } catch (err) {
          errorManager.handleError(err instanceof Error ? err : new Error(String(err)), 'llm', { tick });
          await agentManager.tickAll(worldState, originalLLMScheduler, config);
          tickMetrics.agentsProcessed = aliveAgents.length;
        }
      } else {
        await agentManager.tickAll(worldState, originalLLMScheduler, config);
        tickMetrics.agentsProcessed = aliveAgents.length;
      }

      if (tick % 10 === 0) {
        await agentManager.persistAll();
        if (currentWorldId) {
          await worldPersistence.saveWorldState(currentWorldId);
        }
      }

      if (tick % 30 === 0) {
        pushManager.broadcast({
          type: 'world_state',
          tick,
          level,
          worldTime: worldClock.getTime().toISOString(),
          timeSpeed: worldClock.getTimeSpeed(),
          monitor: monitor.getStats(),
          foundation: {
            geography: geographyDB.getStats(),
            virtuality: virtualityManager.getStats(),
            performance: performanceMonitor.getDailyStats(),
          },
        });
      }

      tickMetrics.endTime = Date.now();
      tickMetrics.durationMs = tickMetrics.endTime - startTime;

      performanceMonitor.recordTickMetrics(tickMetrics);
      performanceMonitor.recordTokenUsage(tickMetrics.tokensUsed, tickMetrics.tokensUsed * 0.00001);

      tickLogger.debug({ tick, level, durationMs: tickMetrics.durationMs, agents: tickMetrics.agentsProcessed }, 'Level0 tick completed');

      return tickMetrics;
    } catch (err) {
      const managedError = errorManager.handleError(
        err instanceof Error ? err : new Error(String(err)),
        'tick',
        { tick, level }
      );
      tickMetrics.endTime = Date.now();
      tickMetrics.durationMs = tickMetrics.endTime - startTime;
      tickMetrics.timeoutHit = true;
      
      performanceMonitor.recordTickMetrics(tickMetrics);
      tickLogger.error({ tick, level, err }, 'Level0 tick failed');
      
      return tickMetrics;
    }
  });

  tieredTickScheduler.registerHandler('level1', async (tick, level) => {
    const startTime = Date.now();
    
    const agents = agentManager.getAgentsMap();
    const level1Agents = [...agents.values()].filter(a => {
      const agentLevel = virtualityManager.getEntityLevel(a.id);
      return agentLevel === 'level1' && a.state.status !== 'dead';
    });

    const tickMetrics = {
      tickNumber: tick,
      level,
      startTime,
      endTime: 0,
      durationMs: 0,
      timeoutHit: false,
      agentsProcessed: level1Agents.length,
      eventsGenerated: 0,
      llmCalls: 0,
      tokensUsed: 0,
    };

    for (const agent of level1Agents) {
      try {
        agent.applyStatChanges([
          { stat: 'energy', delta: -1, reason: 'passive_decay' },
        ]);
      } catch {}
    }

    tickMetrics.endTime = Date.now();
    tickMetrics.durationMs = tickMetrics.endTime - startTime;

    tickLogger.debug({ tick, level, agents: level1Agents.length, durationMs: tickMetrics.durationMs }, 'Level1 tick completed');

    return tickMetrics;
  });

  tieredTickScheduler.registerHandler('level2', async (tick, level) => {
    const startTime = Date.now();
    
    if (userCityId && userCountryId) {
      try {
        const city = geographyDB.getCity(userCityId);
        if (city) {
          const climateZone = geographyDB.getClimateZone(city.climateType || 'temperate');
          if (climateZone) {
            const seasonResult = astronomyEngine.getSeason(new Date(), city.lat);
            const weather = weatherEngine.generateWeather(
              climateZone,
              seasonResult.season,
              city.lat,
              city.elevation || 0,
              userCityId
            );
            
            performanceMonitor.recordTokenUsage(50, 0.0001);
          }
        }
      } catch {}
    }

    const errorStats = errorManager.getStats();
    performanceMonitor.recordErrorStats(errorStats);

    const tickMetrics = {
      tickNumber: tick,
      level,
      startTime,
      endTime: Date.now(),
      durationMs: Date.now() - startTime,
      timeoutHit: false,
      agentsProcessed: 0,
      eventsGenerated: 0,
      llmCalls: 0,
      tokensUsed: 50,
    };

    tickLogger.debug({ tick, level, durationMs: tickMetrics.durationMs }, 'Level2 tick completed');

    return tickMetrics;
  });

  tieredTickScheduler.start();

  const corsOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:39528', 'http://localhost:5173', 'http://127.0.0.1:39528', 'http://127.0.0.1:5173'];
  
  await app.register(cors, { 
    origin: corsOrigins,
    credentials: true,
  });
  await app.register(websocket);

  const deps = {
    core: { config, repo, llmScheduler: originalLLMScheduler },
    agents: { agentManager, initAgent, relationshipManager, socialEngine },
    world: { worldClock, tickScheduler: tieredTickScheduler, economyEngine, platformEngine, eventEngine, eventChainEngine, factionSystem, worldPersistence },
    ui: { modeManager, pushManager, monitor },
    worldState: {
      getWorldId: () => currentWorldId,
      setWorldId: (id: string | null) => { currentWorldId = id; },
    },
    foundation: {
      geographyDB,
      astronomyEngine,
      weatherEngine,
      virtualityManager,
      errorManager,
      performanceMonitor,
      onDemandGenerator,
      batchLLMScheduler,
    },
  };

  registerRoutes(app, deps);
  registerWebSocket(app, { agentManager, llmScheduler: originalLLMScheduler, config, pushManager, modeManager, worldClock, tickScheduler: tieredTickScheduler, repo });
  registerProviderRoutes(app, repo);

  app.get('/foundation/stats', async (request, reply) => {
    return {
      geography: geographyDB.getStats(),
      virtuality: virtualityManager.getStats(),
      performance: performanceMonitor.getDailyStats(),
      errors: errorManager.getStats(),
      tick: tieredTickScheduler.getStats(),
      llm: {
        queue: batchLLMScheduler.getQueueStats(),
        batch: batchLLMScheduler.getBatchStats(),
      },
      onDemand: onDemandGenerator.getStats(),
    };
  });

  app.post('/foundation/user-location', async (request, reply) => {
    const body = request.body as { cityId?: string; countryId?: string };
    
    if (body.cityId && body.countryId) {
      userCityId = body.cityId;
      userCountryId = body.countryId;
      
      virtualityManager.updateUserLocation(body.cityId, body.countryId);
      await geographyDB.loadUserCountry(body.countryId);
      
      return { success: true, cityId: body.cityId, countryId: body.countryId };
    }
    
    return { success: false, error: 'Missing cityId or countryId' };
  });

  app.get('/foundation/weather/:cityId', async (request, reply) => {
    const params = request.params as { cityId: string };
    const city = geographyDB.getCity(params.cityId);
    
    if (!city) {
      return { error: 'City not found' };
    }
    
    const climateZone = geographyDB.getClimateZone(city.climateType || 'temperate');
    if (!climateZone) {
      return { error: 'Climate zone not found' };
    }
    
    const season = astronomyEngine.getSeason(new Date(), city.lat);
    const weather = weatherEngine.generateWeather(
      climateZone,
      season.season,
      city.lat,
      city.elevation || 0,
      params.cityId
    );
    
    return {
      city: city.name,
      season: astronomyEngine.getSeasonName(season.season),
      weather,
      astronomy: astronomyEngine.getInfo(new Date(), city.lat, city.lng),
    };
  });

  try {
    await app.listen({ port: config.server.port, host: config.server.host });
    logger.info(`[Lore Foundation] Server running at http://localhost:${config.server.port}`);
    logger.info('Foundation modules initialized:');
    logger.info(`  - TieredTickScheduler: ${tieredTickScheduler.getConfig().level0.intervalMs}ms / ${tieredTickScheduler.getConfig().level1.intervalMs}ms / ${tieredTickScheduler.getConfig().level2.intervalMs}ms`);
    logger.info(`  - GeographyDB: ${geographyDB.getStats().countries} countries loaded`);
    logger.info(`  - VirtualityManager: Auto-downgrade enabled`);
    logger.info(`  - PerformanceMonitor: Checking every 60s`);
  } catch (err) {
    logger.error(err, '[Lore Foundation] Failed to start');
    process.exit(1);
  }
}

main();