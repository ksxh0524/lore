import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';

export class MockLLMProvider implements ILLMProvider {
  readonly id = 'mock';
  readonly name = 'mock';
  readonly type: ProviderType = 'mock';

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    return {
      id: `mock-${Date.now()}`,
      content: JSON.stringify({
        action: 'greet',
        reasoning: '模拟思考',
        mood_change: 0,
        say: `你好！当前未配置LLM Provider。收到: ${typeof request.messages[request.messages.length - 1]?.content === 'string' ? request.messages[request.messages.length - 1]?.content?.slice(0, 30) ?? '' : '[multimodal content]'}`,
      }),
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      model: request.model,
      latencyMs: 50,
      cached: false,
      finishReason: 'stop',
    };
  }

  async *streamText(_request: LLMRequest): AsyncIterable<string> {
    const text = '你好！当前未配置LLM Provider，这是模拟回复。';
    for (const ch of text) {
      yield ch;
      await new Promise(r => setTimeout(r, 20));
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const input = Array.isArray(request.input) ? request.input : [request.input];
    const embeddingSize = 1536;
    
    return {
      embeddings: input.map(() => Array(embeddingSize).fill(0)),
      model: request.model,
      usage: {
        promptTokens: input.reduce((sum, t) => sum + t.length / 4, 0),
        completionTokens: 0,
        totalTokens: input.reduce((sum, t) => sum + t.length / 4, 0),
      },
      latencyMs: 10,
    };
  }

  isModelSupported(): boolean { 
    return true; 
  }

  getSupportedModels(): string[] {
    return ['mock-model'];
  }
}