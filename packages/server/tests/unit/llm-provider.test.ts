import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockLLMProvider } from '../../src/llm/mock-provider.js';

describe('MockLLMProvider', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  it('should have correct name', () => {
    expect(provider.name).toBe('mock');
  });

  it('should generate text', async () => {
    const result = await provider.generateText({
      messages: [{ role: 'user' as const, content: 'Hello' }],
      model: 'mock-model',
    });

    expect(result.content).toContain('greet');
    expect(result.usage.promptTokens).toBeDefined();
    expect(result.usage.completionTokens).toBeDefined();
    expect(result.model).toBe('mock-model');
    expect(result.latencyMs).toBeGreaterThan(0);
  });

  it('should stream text', async () => {
    const chunks: string[] = [];
    for await (const chunk of provider.streamText({
      messages: [{ role: 'user' as const, content: 'Hello' }],
      model: 'mock-model',
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join('')).toContain('LLM');
  });

  it('should embed text', async () => {
    const result = await provider.embed({ 
      input: 'Hello world', 
      model: 'mock-model' 
    });
    
    expect(result.embeddings[0]?.length).toBe(1536);
    expect(result.embeddings.every(e => e.every(v => v === 0))).toBe(true);
    expect(result.model).toBe('mock-model');
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it('should support any model', () => {
    expect(provider.isModelSupported('gpt-4')).toBe(true);
    expect(provider.isModelSupported('unknown-model')).toBe(true);
  });
});