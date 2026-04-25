import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { AgentManager } from '../agent/agent-manager.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { LoreConfig } from '../config/loader.js';
import type { PushManager } from '../scheduler/push-manager.js';
import type { ModeManager } from '../modes/mode-manager.js';
import type { WorldClock } from '../world/clock.js';
import type { TickScheduler } from '../scheduler/tick-scheduler.js';
import type { TieredTickScheduler } from '../foundation/scheduler/tiered-tick-scheduler.js';
import type { Repository } from '../db/repository.js';
import { ErrorCode } from '../errors.js';
import { createLogger } from '../logger/index.js';
import { validateWsMessage } from './ws-schemas.js';

const logger = createLogger('websocket');

const HEARTBEAT_INTERVAL = 30000;
const HEARTBEAT_TIMEOUT = 90000;

interface ClientSocket {
  send: (data: string) => void;
  _subscribedEvents?: Set<string>;
  terminate: () => void;
  ping: () => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
}

function sendError(socket: ClientSocket, message: string, code?: number) {
  socket.send(JSON.stringify({ type: 'error', code, message }));
}

type WsMessage =
  | { type: 'ping' }
  | { type: 'subscribe'; eventTypes?: string[] }
  | { type: 'unsubscribe'; eventTypes?: string[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'set_time_speed'; speed: number }
  | { type: 'mode_switch'; mode: 'character' | 'god' }
  | { type: 'chat_message'; agentId: string; content: string }
  | { type: 'god_observe_agent'; agentId: string; includeThoughts?: boolean; includeMemory?: boolean }
  | { type: 'agent_chat'; fromAgentId: string; toAgentId: string; content: string }
  | { type: 'platform_new_post'; agentId: string; platformId: string; content: string };

export function registerWebSocket(
  app: FastifyInstance,
  deps: {
    agentManager: AgentManager;
    llmScheduler: LLMScheduler;
    config: LoreConfig;
    pushManager: PushManager;
    modeManager: ModeManager;
    worldClock: WorldClock;
    tickScheduler: TickScheduler | TieredTickScheduler;
    repo: Repository;
  },
) {
  const { agentManager, llmScheduler, config, pushManager, modeManager, worldClock, tickScheduler, repo } = deps;

  app.get('/ws', { websocket: true }, (socket: ClientSocket, req: any) => {
    const authToken = req.query?.token || req.headers?.['x-ws-token'];
    const expectedToken = process.env.WS_TOKEN;

    if (expectedToken && authToken !== expectedToken) {
      sendError(socket, 'Invalid token', ErrorCode.VALIDATION_ERROR);
      socket.terminate();
      return;
    }

    if (!pushManager.addClient(socket)) {
      sendError(socket, 'Max connections reached', ErrorCode.VALIDATION_ERROR);
      socket.terminate();
      return;
    }

    logger.info('WebSocket client connected');

    let lastPing = Date.now();

    socket.send(JSON.stringify({
      type: 'connected',
      tick: tickScheduler.getTickNumber(),
      worldTime: worldClock.getTime().toISOString(),
      timeSpeed: worldClock.getTimeSpeed(),
    }));

    const heartbeat = setInterval(() => {
      if (Date.now() - lastPing > HEARTBEAT_TIMEOUT) {
        logger.warn('WebSocket heartbeat timeout');
        socket.terminate();
        return;
      }
      socket.ping();
    }, HEARTBEAT_INTERVAL);

    socket.on('pong', () => { lastPing = Date.now(); });

    socket.on('message', async (raw: Buffer) => {
      lastPing = Date.now();
      const rawStr = raw.toString();

      const validation = validateWsMessage(rawStr);
      if (!validation.success) {
        logger.warn({ error: validation.error.message }, 'Invalid WS message');
        sendError(socket, validation.error.message, ErrorCode.VALIDATION_ERROR);
        return;
      }

      const msg = validation.data as WsMessage;

      try {
        await handleMessage(socket, msg);
      } catch (err) {
        logger.error(err, 'WS message handling error');
        sendError(socket, err instanceof Error ? err.message : 'Unknown error', ErrorCode.INTERNAL_ERROR);
      }
    });

    socket.on('close', () => {
      clearInterval(heartbeat);
      pushManager.removeClient(socket);
      logger.info('WebSocket client disconnected');
    });

    socket.on('error', (err: Error) => {
      clearInterval(heartbeat);
      pushManager.removeClient(socket);
      logger.error(err, 'WebSocket error');
    });
  });

  async function handleMessage(socket: ClientSocket, msg: WsMessage) {
    switch (msg.type) {
      case 'ping':
        socket.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'subscribe': {
        const eventTypes = msg.eventTypes ?? [];
        socket._subscribedEvents = new Set(eventTypes);
        socket.send(JSON.stringify({ type: 'subscribed', eventTypes }));
        break;
      }

      case 'unsubscribe': {
        if (socket._subscribedEvents && msg.eventTypes) {
          for (const et of msg.eventTypes) socket._subscribedEvents.delete(et);
          socket.send(JSON.stringify({ type: 'unsubscribed', eventTypes: msg.eventTypes }));
        }
        break;
      }

      case 'pause':
        tickScheduler.pause();
        pushManager.broadcast({
          type: 'world_state',
          tick: tickScheduler.getTickNumber(),
          worldTime: worldClock.getTime().toISOString(),
          timeSpeed: worldClock.getTimeSpeed(),
          status: 'paused',
        });
        break;

      case 'resume':
        tickScheduler.resume();
        pushManager.broadcast({
          type: 'world_state',
          tick: tickScheduler.getTickNumber(),
          worldTime: worldClock.getTime().toISOString(),
          timeSpeed: worldClock.getTimeSpeed(),
          status: 'running',
        });
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
        const agent = agentManager.get(msg.agentId);
        if (!agent) {
          sendError(socket, `Agent ${msg.agentId} not found`, ErrorCode.AGENT_NOT_FOUND);
          break;
        }

        let full = '';
        const chunks: string[] = [];
        for await (const chunk of agent.chat(msg.content, llmScheduler, config)) {
          full += chunk;
          chunks.push(chunk);
        }

        for (let i = 0; i < chunks.length; i++) {
          socket.send(JSON.stringify({
            type: 'chat_stream',
            agentId: msg.agentId,
            chunk: chunks[i],
            done: i === chunks.length - 1,
          }));
        }
        if (chunks.length === 0) {
          socket.send(JSON.stringify({ type: 'chat_stream', agentId: msg.agentId, chunk: '', done: true }));
        }

        await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: 'user', toAgentId: msg.agentId, content: msg.content, type: 'chat' });
        await repo.createMessage({ id: nanoid(), worldId: agent.worldId, fromAgentId: msg.agentId, content: full, type: 'chat' });

        await agent.memory.add(`User: ${msg.content}`, 'chat', 0.5);
        await agent.memory.add(`Me: ${full}`, 'chat', 0.5);

        pushManager.broadcast({ type: 'agent_update', agentId: agent.id, state: agent.state, stats: agent.stats });
        break;
      }

      case 'god_observe_agent': {
        if (!modeManager.isGodMode()) {
          sendError(socket, 'God mode not active', ErrorCode.VALIDATION_ERROR);
          break;
        }
        const agent = agentManager.get(msg.agentId);
        if (!agent) {
          sendError(socket, `Agent ${msg.agentId} not found`, ErrorCode.AGENT_NOT_FOUND);
          break;
        }
        const recent = await agent.memory.getRecent(msg.includeThoughts ? 20 : 10);
        socket.send(JSON.stringify({
          type: 'god_agent_observation',
          agentId: agent.id,
          fullState: { ...agent.stats, ...agent.state },
          thoughts: msg.includeThoughts ? recent.map(r => r.content) : [],
          memories: msg.includeMemory ? recent.slice(0, 5) : [],
          relationships: [...agent.relationships.entries()].map(([id, r]) => ({ targetId: id, type: r.type, intimacy: r.intimacy })),
        }));
        break;
      }

      case 'agent_chat': {
        const fromAgent = agentManager.get(msg.fromAgentId);
        const toAgent = agentManager.get(msg.toAgentId);
        if (!fromAgent || !toAgent) {
          sendError(socket, 'Agent not found', ErrorCode.AGENT_NOT_FOUND);
          break;
        }
        await repo.createMessage({ id: nanoid(), worldId: fromAgent.worldId, fromAgentId: msg.fromAgentId, toAgentId: msg.toAgentId, content: msg.content, type: 'chat' });
        pushManager.broadcast({
          type: 'agent_chat',
          fromAgentId: msg.fromAgentId,
          toAgentId: msg.toAgentId,
          content: msg.content,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'platform_new_post': {
        const agent = agentManager.get(msg.agentId);
        if (!agent) {
          sendError(socket, `Agent ${msg.agentId} not found`, ErrorCode.AGENT_NOT_FOUND);
          break;
        }
        const postId = nanoid();
        const post = await repo.createPlatformPost({ id: postId, platformId: msg.platformId, worldId: agent.worldId, authorId: msg.agentId, authorType: 'agent', content: msg.content });
        pushManager.broadcast({ type: 'platform_new_post', post });
        break;
      }
    }
  }
}