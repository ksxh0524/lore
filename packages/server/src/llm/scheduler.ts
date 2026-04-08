import type { LLMRequest, LLMResult, ILLMProvider } from './types.js';
import { ProviderFactory } from './factory.js';
import { LLMResilience } from './resilience.js';
import type { LoreConfig } from '../config/loader.js';
import type { Monitor } from '../monitor/index.js';

const priorityMap: Record<string, number> = {
  'user-chat': 160,
  'decision': 80,
  'social': 70,
  'creative': 50,
};

export class LLMScheduler {
  private factory: ProviderFactory;
  private resilience: LLMResilience;
  private maxConcurrent: number;
  private active = 0;
  private monitor: Monitor | null = null;

  constructor(config: LoreConfig) {
    this.factory = new ProviderFactory(config);
    this.resilience = new LLMResilience(config);
    this.maxConcurrent = config.llm.limits.maxConcurrent;
  }

  setMonitor(monitor: Monitor): void {
    this.monitor = monitor;
  }

  getProvider(model: string): ILLMProvider {
    return this.factory.getProvider(model);
  }

  private async waitForSlot(): Promise<void> {
    while (this.active >= this.maxConcurrent) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  async submit(request: LLMRequest): Promise<LLMResult> {
    await this.waitForSlot();
    this.active++;
    try {
      const provider = this.factory.getProvider(request.model);
      const result = await this.resilience.executeWithRetry(() =>
        provider.generateText({
          model: request.model,
          messages: request.messages,
          maxTokens: request.maxTokens,
          tools: request.tools,
        }),
      );
      this.monitor?.recordLLMCall(
        result.usage.promptTokens + result.usage.completionTokens,
        result.latencyMs,
        result.model,
      );
      return result;
    } catch (err) {
      this.monitor?.recordDropped();
      throw err;
    } finally {
      this.active--;
    }
  }

  async *submitStream(request: LLMRequest): AsyncIterable<string> {
    await this.waitForSlot();
    this.active++;
    try {
      const provider = this.factory.getProvider(request.model);
      yield* provider.streamText({
        model: request.model,
        messages: request.messages,
      });
    } finally {
      this.active--;
    }
  }
}
