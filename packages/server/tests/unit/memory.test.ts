import { describe, it, expect, vi } from 'vitest';
import { MemoryManager } from '../../src/agent/memory.js';

function createMockRepo() {
  const memories: any[] = [];
  return {
    insertMemory: vi.fn(async (data: any) => {
      memories.push(data);
      return data;
    }),
    getAgentMemories: vi.fn(async (agentId: string, limit: number) => {
      return memories
        .filter(m => m.agentId === agentId)
        .slice(-limit)
        .reverse();
    }),
  };
}

function createMockLlmScheduler() {
  return {
    schedule: vi.fn(),
    getProvider: vi.fn(() => ({
      embed: vi.fn(async () => []),
    })),
  } as any;
}

function createMockConfig() {
  return {} as any;
}

describe('MemoryManager', () => {
  it('should add memory and persist via repo', async () => {
    const repo = createMockRepo();
    const mm = new MemoryManager('agent-1', repo as any, createMockLlmScheduler(), createMockConfig());
    await mm.add('hello world', 'chat', 0.5);
    expect(repo.insertMemory).toHaveBeenCalledTimes(1);
    expect(repo.insertMemory.mock.calls[0][0].content).toBe('hello world');
    expect(repo.insertMemory.mock.calls[0][0].agentId).toBe('agent-1');
  });

  it('should return context within maxTokens', async () => {
    const repo = createMockRepo();
    const mm = new MemoryManager('agent-1', repo as any, createMockLlmScheduler(), createMockConfig());
    await mm.add('short', 'chat', 0.5);
    await mm.add('a bit longer entry here', 'event', 0.7);
    const ctx = await mm.getContext(10);
    expect(ctx.working.length).toBeGreaterThanOrEqual(1);
    expect(ctx.working.length).toBeLessThanOrEqual(2);
  });

  it('should limit working memory to 20 entries', async () => {
    const repo = createMockRepo();
    const mm = new MemoryManager('agent-1', repo as any, createMockLlmScheduler(), createMockConfig());
    for (let i = 0; i < 25; i++) {
      await mm.add(`entry ${i}`, 'chat', 0.5);
    }
    const ctx = await mm.getContext(10000);
    expect(ctx.working.length).toBe(20);
  });

  it('should retrieve recent memories from repo', async () => {
    const repo = createMockRepo();
    const mm = new MemoryManager('agent-1', repo as any, createMockLlmScheduler(), createMockConfig());
    await mm.add('mem1', 'chat', 0.5);
    await mm.add('mem2', 'event', 0.7);
    const recent = await mm.getRecent(5);
    expect(recent.length).toBe(2);
    expect(recent[0].content).toBe('mem2');
  });
});
