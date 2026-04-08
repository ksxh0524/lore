import type { LLMRequest, LLMResult, ILLMProvider } from './types.js';
import { ProviderFactory } from './factory.js';
import type { LoreConfig } from '../config/loader.js';

const priorityMap: Record<string, number> = {
  'user-chat': 160,
  'decision': 80,
  'social': 70,
  'creative': 50,
};

export class LLMScheduler {
  private factory: ProviderFactory;
  private maxConcurrent: number;
  private active = 0;

  constructor(config: LoreConfig) {
    this.factory = new ProviderFactory(config);
    this.maxConcurrent = config.llm.limits.maxConcurrent;
  }

  async submit(request: LLMRequest): Promise<LLMResult> {
    while (this.active >= this.maxConcurrent) {
      await new Promise(r => setTimeout(r, 50));
    }
    this.active++;
    try {
      const provider = this.factory.getProvider(request.model);
      const start = Date.now();
      const result = await provider.generateText({
        model: request.model,
        messages: request.messages,
        maxTokens: request.maxTokens,
      });
      return { ...result, latencyMs: Date.now() - start };
    } finally {
      this.active--;
    }
  }

  async *submitStream(request: LLMRequest): AsyncIterable<string> {
    const provider = this.factory.getProvider(request.model);
    yield* provider.streamText({
      model: request.model,
      messages: request.messages,
    });
  }
}
