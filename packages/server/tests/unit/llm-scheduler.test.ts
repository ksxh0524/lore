import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMScheduler } from '../../src/llm/scheduler.js';

const mockConfig: any = {
  llm: {
    providers: [{ name: 'mock', type: 'mock', models: ['mock', 'mock-premium', 'mock-standard', 'mock-cheap'] }],
    defaults: { premiumModel: 'mock-premium', standardModel: 'mock-standard', cheapModel: 'mock-cheap' },
    limits: { maxConcurrent: 3, dailyBudget: null, timeoutMs: 30000 },
  },
};

describe('LLMScheduler', () => {
  let scheduler: LLMScheduler;

  beforeEach(() => {
    scheduler = new LLMScheduler(mockConfig);
  });

  it('should get provider for model', () => {
    const provider = scheduler.getProvider('mock-model');
    expect(provider).toBeDefined();
    expect(provider.name).toBe('mock');
  });

  it('should submit LLM requests', async () => {
    const result = await scheduler.submit({
      agentId: 'test-agent',
      callType: 'decision',
      model: 'mock-premium',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    });

    expect(result.content).toBeDefined();
    expect(result.usage).toBeDefined();
  });

  it('should stream LLM responses', async () => {
    const chunks: string[] = [];
    for await (const chunk of scheduler.submitStream({
      agentId: 'test-agent',
      callType: 'user-chat',
      model: 'mock-standard',
      messages: [{ role: 'user' as const, content: 'Hello' }],
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should respect concurrent limits', async () => {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(scheduler.submit({
        agentId: `agent-${i}`,
        callType: 'decision',
        model: 'mock-cheap',
        messages: [{ role: 'user' as const, content: `Request ${i}` }],
      }));
    }

    const results = await Promise.all(promises);
    expect(results.length).toBe(5);
    expect(results.every(r => r.content)).toBe(true);
  });

  it('should handle any model with mock provider', async () => {
    // Mock provider supports all models
    const result = await scheduler.submit({
      agentId: 'test',
      callType: 'decision',
      model: 'unknown-model',
      messages: [{ role: 'user', content: 'test' }],
    });
    
    expect(result.content).toBeDefined();
  });
});