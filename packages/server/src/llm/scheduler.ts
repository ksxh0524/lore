import type { LLMRequest, LLMResult, ILLMProvider } from './types.js';
import { ProviderFactory } from './factory.js';
import { LLMResilience } from './resilience.js';
import type { LoreConfig } from '../config/loader.js';
import type { Monitor } from '../monitor/index.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('llm-scheduler');

const DEFAULT_PRIORITY_MAP: Record<string, number> = {
  'user-chat': 160,
  'decision': 80,
  'social': 70,
  'creative': 50,
  'world-event': 40,
};

interface QueuedRequest {
  request: LLMRequest;
  priority: number;
  timestamp: number;
  resolve: (value: LLMResult) => void;
  reject: (error: Error) => void;
}

export class LLMScheduler {
  private factory: ProviderFactory;
  private resilience: LLMResilience;
  private maxConcurrent: number;
  private maxQueueSize: number;
  private priorityMap: Record<string, number>;
  private active = 0;
  private queue: QueuedRequest[] = [];
  private monitor: Monitor | null = null;
  private droppedCount = 0;

  constructor(config: LoreConfig) {
    this.factory = new ProviderFactory(config);
    this.resilience = new LLMResilience({
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: config.llm.limits.timeoutMs,
    });
    this.maxConcurrent = config.llm.limits.maxConcurrent;
    this.maxQueueSize = 50;
    this.priorityMap = DEFAULT_PRIORITY_MAP;
  }

  setMonitor(monitor: Monitor): void {
    this.monitor = monitor;
  }

  getProvider(model: string): ILLMProvider {
    return this.factory.getProvider(model);
  }

  getQueueStats(): { queueLength: number; active: number; dropped: number } {
    return {
      queueLength: this.queue.length,
      active: this.active,
      dropped: this.droppedCount,
    };
  }

  private getPriority(callType: string): number {
    return this.priorityMap[callType] ?? 50;
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.active >= this.maxConcurrent) return;

    this.queue.sort((a, b) => b.priority - a.priority);
    
    while (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) break;
      
      this.active++;
      try {
        const provider = this.factory.getProvider(item.request.model);
        const result = await this.resilience.execute(provider.id, () =>
          provider.generateText({
            model: item.request.model,
            messages: item.request.messages,
            maxTokens: item.request.maxTokens,
            tools: item.request.tools,
          }),
        );
        this.monitor?.recordLLMCall(
          result.usage.promptTokens + result.usage.completionTokens,
          result.latencyMs,
          result.model,
        );
        logger.debug({ model: item.request.model, callType: item.request.callType, tokens: result.usage.promptTokens + result.usage.completionTokens, latencyMs: result.latencyMs }, 'LLM call completed');
        item.resolve(result);
      } catch (err) {
        this.monitor?.recordDropped();
        logger.error({ model: item.request.model, callType: item.request.callType, err }, 'LLM call failed');
        item.reject(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        this.active--;
        this.processQueue();
      }
    }
  }

  async submit(request: LLMRequest): Promise<LLMResult> {
    const callType = request.callType ?? 'decision';
    const priority = this.getPriority(callType);

    if (this.queue.length >= this.maxQueueSize) {
      const lowestPriority = this.queue.reduce((min, item) => Math.min(min, item.priority), Infinity);
      
      if (priority > lowestPriority) {
        const lowestIndex = this.queue.findIndex(item => item.priority === lowestPriority);
        if (lowestIndex !== -1) {
          const dropped = this.queue.splice(lowestIndex, 1)[0];
          if (dropped) {
            dropped.reject(new Error('Request dropped due to queue overload'));
            this.droppedCount++;
            this.monitor?.recordDropped();
            logger.warn({ callType: dropped.request.callType, priority: dropped.priority }, 'Request dropped (queue overload)');
          }
        }
      } else {
        this.droppedCount++;
        this.monitor?.recordDropped();
        logger.warn({ callType: request.callType, priority, queueSize: this.queue.length }, 'Request rejected (queue full)');
        throw new Error('LLM queue overloaded, request dropped');
      }
    }

    logger.debug({ callType: request.callType, model: request.model, priority, queueSize: this.queue.length }, 'LLM request queued');
    
    return new Promise<LLMResult>((resolve, reject) => {
      this.queue.push({
        request,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  async *submitStream(request: LLMRequest): AsyncIterable<string> {
    while (this.active >= this.maxConcurrent) {
      if (this.queue.length >= this.maxQueueSize) {
        throw new Error('LLM queue overloaded, stream request rejected');
      }
      await new Promise(r => setTimeout(r, 50));
    }

    this.active++;
    try {
      const provider = this.factory.getProvider(request.model);
      yield* provider.streamText({
        model: request.model,
        messages: request.messages,
      });
    } finally {
      this.active--;
      this.processQueue();
    }
  }
}