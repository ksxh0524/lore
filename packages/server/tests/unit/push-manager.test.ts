import { describe, it, expect, beforeEach } from 'vitest';
import { PushManager } from '../../src/scheduler/push-manager.js';

describe('PushManager', () => {
  let pushManager: PushManager;
  
  beforeEach(() => {
    pushManager = new PushManager();
  });

  describe('Client management', () => {
    it('should add client', () => {
      const mockClient = { send: () => {} };
      pushManager.addClient(mockClient as any);
    });

    it('should remove client', () => {
      const mockClient = { send: () => {} } as any;
      pushManager.addClient(mockClient);
      pushManager.removeClient(mockClient);
    });

    it('should not fail when removing non-existent client', () => {
      pushManager.removeClient({} as any);
    });
  });

  describe('Push event', () => {
    it('should push event to clients', async () => {
      let receivedMessage = '';
      const mockClient = {
        send: (msg: string) => { receivedMessage = msg; },
      } as any;
      
      pushManager.addClient(mockClient);
      
      await pushManager.push({
        id: 'test-event',
        worldId: 'world-1',
        type: 'social',
        description: 'Test content',
        priority: 1,
        timestamp: new Date(),
        processed: false,
      }, 'world-1');
      
      const parsed = JSON.parse(receivedMessage);
      expect(parsed.type).toBe('event');
      expect(parsed.event.id).toBe('test-event');
    });

    it('should only push to subscribed clients', async () => {
      let received = false;
      const subscribedClient = {
        send: () => { received = true; },
        _subscribedEvents: new Set(['event']),
      } as any;
      
      const unsubscribedClient = {
        send: () => {},
        _subscribedEvents: new Set(['other']),
      } as any;
      
      pushManager.addClient(subscribedClient);
      pushManager.addClient(unsubscribedClient);
      
      await pushManager.push({
        id: 'test', worldId: 'w', type: 'social', description: 'test', priority: 1, timestamp: new Date(), processed: false,
      }, 'world-1');
      
      expect(received).toBe(true);
    });

    it('should remove dead clients', async () => {
      const deadClient = {
        send: () => { throw new Error('dead'); },
      } as any;
      
      pushManager.addClient(deadClient);
      
      await pushManager.push({
        id: 'test', worldId: 'w', type: 'social', description: 'test', priority: 1, timestamp: new Date(), processed: false,
      }, 'world-1');
    });
  });

  describe('Broadcast message', () => {
    it('should broadcast message with correct format', () => {
      let received = '';
      const mockClient = {
        send: (msg: string) => { received = msg; },
      } as any;
      
      pushManager.addClient(mockClient);
      
      pushManager.broadcast({
        type: 'world_state',
        tick: 100,
        worldTime: new Date().toISOString(),
      });
      
      const parsed = JSON.parse(received);
      expect(parsed.type).toBe('world_state');
      expect(parsed.tick).toBe(100);
    });

    it('should broadcast to wildcard subscribers', () => {
      let received = false;
      const wildcardClient = {
        send: () => { received = true; },
        _subscribedEvents: new Set(['*']),
      } as any;
      
      pushManager.addClient(wildcardClient);
      
      pushManager.broadcast({ type: 'anything' });
      
      expect(received).toBe(true);
    });
  });
});