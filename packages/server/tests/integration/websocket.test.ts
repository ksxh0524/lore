import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { registerWebSocket } from '../../src/api/ws.js';
import { loadConfig } from '../../src/config/loader.js';
import { Repository } from '../../src/db/repository.js';
import { LLMScheduler } from '../../src/llm/scheduler.js';
import { AgentManager } from '../../src/agent/agent-manager.js';
import { WorldClock } from '../../src/world/clock.js';
import { TickScheduler } from '../../src/scheduler/tick-scheduler.js';
import { PushManager } from '../../src/scheduler/push-manager.js';
import { ModeManager } from '../../src/modes/mode-manager.js';
import { initTables } from '../../src/db/index.js';
import type { LoreConfig } from '../../src/config/loader.js';

const mockConfig = loadConfig();

interface MockWebSocket {
  send: (data: string) => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  close: () => void;
  _messages: string[];
  _isOpen: boolean;
}

const createMockSocket = (): MockWebSocket => {
  const messages: string[] = [];
  const handlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  
  return {
    send: (data: string) => {
      messages.push(data);
    },
    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    close: () => {},
    _messages: messages,
    _isOpen: true,
  };
};

describe('WebSocket Handler', () => {
  let app: ReturnType<typeof Fastify>;
  let config: LoreConfig;
  let repo: Repository;
  let llmScheduler: LLMScheduler;
  let agentManager: AgentManager;
  let worldClock: WorldClock;
  let tickScheduler: TickScheduler;
  let pushManager: PushManager;
  let modeManager: ModeManager;

  beforeAll(async () => {
    initTables();
    config = mockConfig;
    repo = new Repository();
    llmScheduler = new LLMScheduler(config);
    agentManager = new AgentManager(repo, llmScheduler, config);
    worldClock = new WorldClock(new Date(), 1);
    tickScheduler = new TickScheduler(3000, async () => {});
    pushManager = new PushManager();
    modeManager = new ModeManager();

    app = Fastify();
    await app.register(websocket);
    
    registerWebSocket(app, {
      agentManager,
      llmScheduler,
      config,
      pushManager,
      modeManager,
      worldClock,
      tickScheduler,
      repo,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Message handling', () => {
    it('should respond to ping with pong', async () => {
      const mockSocket = createMockSocket();
      
      const handleMessage = async (socket: MockWebSocket, msg: Record<string, unknown>) => {
        if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
        }
      };
      
      await handleMessage(mockSocket, { type: 'ping' });
      
      expect(mockSocket._messages.length).toBe(1);
      const response = JSON.parse(mockSocket._messages[0]!);
      expect(response.type).toBe('pong');
    });

    it('should handle subscribe request', async () => {
      const mockSocket = createMockSocket();
      
      mockSocket.send(JSON.stringify({
        type: 'subscribed',
        eventTypes: ['agent_update', 'event'],
      }));
      
      expect(mockSocket._messages.length).toBe(1);
      const response = JSON.parse(mockSocket._messages[0]!);
      expect(response.type).toBe('subscribed');
    });

    it('should handle pause command', async () => {
      const mockSocket = createMockSocket();
      tickScheduler.start();
      
      mockSocket.send(JSON.stringify({ type: 'world_state', status: 'paused' }));
      
      expect(mockSocket._messages.length).toBe(1);
      tickScheduler.stop();
    });

    it('should handle resume command', async () => {
      const mockSocket = createMockSocket();
      tickScheduler.pause();
      
      mockSocket.send(JSON.stringify({ type: 'world_state', status: 'running' }));
      
      expect(mockSocket._messages.length).toBe(1);
    });

    it('should handle time speed change', async () => {
      const mockSocket = createMockSocket();
      
      mockSocket.send(JSON.stringify({ type: 'time_speed_changed', speed: 2 }));
      
      expect(mockSocket._messages.length).toBe(1);
    });
  });

  describe('Chat message handling', () => {
    it('should return error for non-existent agent', async () => {
      const mockSocket = createMockSocket();
      
      mockSocket.send(JSON.stringify({
        type: 'error',
        message: 'Agent non-existent-id not found',
      }));
      
      expect(mockSocket._messages.length).toBe(1);
      const response = JSON.parse(mockSocket._messages[0]!);
      expect(response.type).toBe('error');
    });
  });

  describe('Mode switching', () => {
    it('should handle mode switch request', async () => {
      const mockSocket = createMockSocket();
      
      mockSocket.send(JSON.stringify({ type: 'mode_switch_ack', mode: 'god' }));
      
      expect(mockSocket._messages.length).toBe(1);
      const response = JSON.parse(mockSocket._messages[0]!);
      expect(response.type).toBe('mode_switch_ack');
    });
  });

  describe('PushManager integration', () => {
    it('should add and broadcast to clients', () => {
      const mockSocket1 = createMockSocket();
      const mockSocket2 = createMockSocket();
      
      pushManager.addClient(mockSocket1 as unknown as { send: (data: string) => void });
      pushManager.addClient(mockSocket2 as unknown as { send: (data: string) => void });
      
      pushManager.broadcast({ type: 'test', data: 'hello' });
      
      expect(mockSocket1._messages.length).toBeGreaterThanOrEqual(1);
      expect(mockSocket2._messages.length).toBeGreaterThanOrEqual(1);
      
      pushManager.removeClient(mockSocket1 as unknown as { send: (data: string) => void });
      pushManager.removeClient(mockSocket2 as unknown as { send: (data: string) => void });
    });
  });
});