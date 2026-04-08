import type { FastifyInstance } from 'fastify';
import type { AgentManager } from '../agent/agent-manager.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { LoreConfig } from '../config/loader.js';
import type { PushManager } from '../scheduler/push-manager.js';
import type { ModeManager } from '../modes/mode-manager.js';
import type { WorldClock } from '../world/clock.js';
import type { TickScheduler } from '../scheduler/tick-scheduler.js';
import { nanoid } from 'nanoid';

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
  },
) {
  const { agentManager, llmScheduler, config, pushManager, modeManager, worldClock, tickScheduler } = deps;

  app.get('/ws', { websocket: true }, (socket: any) => {
    pushManager.addClient(socket);

    socket.send(JSON.stringify({
      type: 'connected',
      worldId: 'default',
      tick: tickScheduler.getTickNumber(),
      worldTime: worldClock.getTime().toISOString(),
    }));

    socket.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(socket, msg);
      } catch (err) {
        console.error('WS message error:', err);
        socket.send(JSON.stringify({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' }));
      }
    });

    socket.on('close', () => { pushManager.removeClient(socket); });
    socket.on('error', () => { pushManager.removeClient(socket); });
  });

  async function handleMessage(socket: any, msg: Record<string, any>) {
    switch (msg.type) {
      case 'pause':
        tickScheduler.pause();
        socket.send(JSON.stringify({ type: 'paused' }));
        break;

      case 'resume':
        tickScheduler.resume();
        socket.send(JSON.stringify({ type: 'resumed' }));
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
        break;
      }

      case 'god_observe_agent': {
        if (!modeManager.isGodMode()) {
          socket.send(JSON.stringify({ type: 'error', message: 'God mode not active' }));
          break;
        }
        const agent = agentManager.get(msg.agentId);
        if (agent) {
          const recent = await agent.memory.getRecent(10);
          socket.send(JSON.stringify({
            type: 'god_agent_observation',
            agentId: agent.id,
            fullState: agent.stats,
            thoughts: recent.map(r => r.content),
            relationships: [...agent.relationships.entries()].map(([id, r]) => ({ targetId: id, type: r.type, intimacy: r.intimacy })),
          }));
        }
        break;
      }

      default:
        socket.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
    }
  }
}
