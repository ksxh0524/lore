import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { AgentManager } from '../agent/agent-manager.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { LoreConfig } from '../config/loader.js';
import type { PushManager } from '../scheduler/push-manager.js';
import type { ModeManager } from '../modes/mode-manager.js';
import type { WorldClock } from '../world/clock.js';
import type { TickScheduler } from '../scheduler/tick-scheduler.js';
import type { Repository } from '../db/repository.js';

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 60000;

interface ClientSocket {
  send: (data: string) => void;
  _subscribedEvents?: Set<string>;
  terminate: () => void;
  ping: () => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

export function registerWebSocket(
  app: FastifyInstance,
  deps: {
    agentManager: AgentManager;
    llmScheduler: LLMScheduler;
    config: LoreConfig;
    pushManager: PushManager;
    modeManager: ModeManager;
    worldClock: WorldClock;
    tickScheduler: TickScheduler;
    repo: Repository;
  },
) {
  const { agentManager, llmScheduler, config, pushManager, modeManager, worldClock, tickScheduler, repo } = deps;

  app.get('/ws', { websocket: true }, (socket: ClientSocket, req: any) => {
    // Basic validation: check for optional auth token in query or headers
    // For production, implement proper authentication (JWT, session, etc.)
    const authToken = req.query?.token || req.headers?.['x-ws-token'];
    
    // Optional: enforce auth token in production mode
    if (process.env.NODE_ENV === 'production' && !authToken) {
      socket.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
      socket.terminate();
      return;
    }
    
    // Log connection for monitoring
    app.log.info({ hasToken: !!authToken }, 'WebSocket client connected');
    
    pushManager.addClient(socket);
    let lastPing = Date.now();

    socket.send(JSON.stringify({
      type: 'connected',
      tick: tickScheduler.getTickNumber(),
      worldTime: worldClock.getTime().toISOString(),
      timeSpeed: worldClock.getTimeSpeed(),
    }));

    const heartbeat = setInterval(() => {
      if (Date.now() - lastPing > HEARTBEAT_TIMEOUT) {
        socket.terminate();
        return;
      }
      socket.ping();
    }, HEARTBEAT_INTERVAL);

    socket.on('pong', () => { lastPing = Date.now(); });

    socket.on('message', async (raw: Buffer) => {
      lastPing = Date.now();
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(socket, msg);
      } catch (err) {
        app.log.error(err, 'WS message error');
        socket.send(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }));
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      pushManager.removeClient(socket);
    });
    socket.on('error', () => {
      clearInterval(heartbeat);
      pushManager.removeClient(socket);
    });
  });

  async function handleMessage(socket: ClientSocket, msg: Record<string, any>) {
    switch (msg.type) {
      case 'ping':
        socket.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe': {
        const eventTypes = msg.eventTypes || [];
        socket._subscribedEvents = new Set(eventTypes);
        socket.send(JSON.stringify({ type: 'subscribed', eventTypes }));
        break;
      }

      case 'unsubscribe': {
        if (socket._subscribedEvents) {
          for (const et of (msg.eventTypes || [])) socket._subscribedEvents.delete(et);
          socket.send(JSON.stringify({ type: 'unsubscribed', eventTypes: msg.eventTypes }));
        }
        break;
      }

      case 'pause':
        tickScheduler.pause();
        pushManager.broadcast({ type: 'world_state', tick: tickScheduler.getTickNumber(), worldTime: worldClock.getTime().toISOString(), timeSpeed: worldClock.getTimeSpeed(), status: 'paused' });
        break;

      case 'resume':
        tickScheduler.resume();
        pushManager.broadcast({ type: 'world_state', tick: tickScheduler.getTickNumber(), worldTime: worldClock.getTime().toISOString(), timeSpeed: worldClock.getTimeSpeed(), status: 'running' });
        break;

      case 'set_time_speed':
        worldClock.setTimeSpeed(msg.speed);
        pushManager.broadcast({ type: 'time_speed_changed', speed: msg.speed });
        break;

      case 'mode_switch':
        await modeManager.switchMode(msg.mode);
        pushManager.broadcast({ type: 'mode_switch_ack', mode: msg.mode });
        break;

      case 'chat_message': {
        const { agentId, content } = msg;
        const agent = agentManager.get(agentId);
        if (!agent) {
          socket.send(JSON.stringify({ type: 'error', message: `Agent ${agentId} not found` }));
          break;
        }

        let full = '';
        for await (const chunk of agent.chat(content, llmScheduler, config)) {
          full += chunk;
          socket.send(JSON.stringify({ type: 'chat_stream', agentId, chunk, done: false }));
        }
        socket.send(JSON.stringify({ type: 'chat_stream', agentId, chunk: '', done: true }));

        await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: 'user', toAgentId: agentId, content, type: 'chat' });
        await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: agentId, content: full, type: 'chat' });

        await agent.memory.add(`User: ${content}`, 'chat', 0.5);
        await agent.memory.add(`Me: ${full}`, 'chat', 0.5);

        pushManager.broadcast({
          type: 'agent_update',
          agentId: agent.id,
          state: agent.state,
          stats: agent.stats,
        });
        break;
      }

      case 'god_observe_agent': {
        if (!modeManager.isGodMode()) {
          socket.send(JSON.stringify({ type: 'error', message: 'God mode not active' }));
          break;
        }
        const agent = agentManager.get(msg.agentId);
        if (agent) {
          const recent = await agent.memory.getRecent(msg.includeThoughts ? 20 : 10);
          socket.send(JSON.stringify({
            type: 'god_agent_observation',
            agentId: agent.id,
            fullState: { ...agent.stats, ...agent.state },
            thoughts: msg.includeThoughts ? recent.map(r => r.content) : [],
            memories: msg.includeMemory ? recent.slice(0, 5) : [],
            relationships: [...agent.relationships.entries()].map(([id, r]) => ({ targetId: id, type: r.type, intimacy: r.intimacy })),
          }));
        }
        break;
      }

      case 'agent_chat': {
        const { fromAgentId, toAgentId, content } = msg;
        const fromAgent = agentManager.get(fromAgentId);
        const toAgent = agentManager.get(toAgentId);
        if (!fromAgent || !toAgent) {
          socket.send(JSON.stringify({ type: 'error', message: 'Agent not found' }));
          break;
        }
        await repo.createMessage({ id: nanoid(), worldId: fromAgent.worldId, fromAgentId, toAgentId, content, type: 'chat' });
        pushManager.broadcast({
          type: 'agent_chat',
          fromAgentId,
          toAgentId,
          content,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'platform_new_post': {
        const { agentId, platformId, content } = msg;
        const agent = agentManager.get(agentId);
        if (!agent) {
          socket.send(JSON.stringify({ type: 'error', message: `Agent ${agentId} not found` }));
          break;
        }
        const postId = nanoid();
        const post = await repo.createPlatformPost({ id: postId, platformId, worldId: agent.worldId, authorId: agentId, authorType: 'agent', content });
        pushManager.broadcast({ type: 'platform_new_post', post });
        break;
      }

      default:
        socket.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    }
  }
}
