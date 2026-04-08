import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';

export class MockLLMProvider implements ILLMProvider {
  readonly name = 'mock';

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    return {
      content: JSON.stringify({
        action: 'greet',
        reasoning: '模拟思考',
        mood_change: 0,
        say: `你好！当前未配置LLM Provider。收到: ${request.messages.at(-1)?.content?.slice(0, 30) ?? ''}`,
      }),
      usage: { promptTokens: 100, completionTokens: 50 },
      model: request.model,
      latencyMs: 50,
    };
  }

  async *streamText(request: LLMCallRequest): AsyncIterable<string> {
    const text = '你好！当前未配置LLM Provider，这是模拟回复。';
    for (const ch of text) {
      yield ch;
      await new Promise(r => setTimeout(r, 20));
    }
  }

  isModelSupported(): boolean { return true; }
}
