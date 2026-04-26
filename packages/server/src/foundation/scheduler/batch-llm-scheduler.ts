import type { LLMRequest, LLMResponse, LLMResult, ILLMProvider } from '../../llm/types.js';
import type { ChatMessage } from '@lore/shared';
import { ProviderFactory } from '../../llm/factory.js';
import { LLMResilience } from '../../llm/resilience.js';
import type { LoreConfig } from '../../config/loader.js';
import type { Monitor } from '../../monitor/index.js';
import type { AgentProfile, AgentStats, AgentState } from '@lore/shared';
import { z } from 'zod';
import { createLogger } from '../../logger/index.js';

const logger = createLogger('batch-llm-scheduler');

const BatchDecisionItemSchema = z.object({
  agentId: z.string(),
  action: z.string().min(1).max(100),
  reasoning: z.string().max(200),
  moodChange: z.number().min(-20).max(20).default(0),
  say: z.string().max(100).optional(),
  confidence: z.number().min(0).max(1).default(0.7),
});

const BatchDecisionArraySchema = z.array(BatchDecisionItemSchema);

export interface BatchDecisionInput {
  agentId: string;
  profile: AgentProfile;
  stats: AgentStats;
  state: AgentState;
  pendingEvents: string[];
}

export interface BatchDecisionOutput {
  agentId: string;
  action: string;
  reasoning: string;
  moodChange: number;
  say?: string;
  confidence: number;
}

interface QueuedRequest {
  request: LLMRequest;
  priority: number;
  timestamp: number;
  resolve: (value: LLMResponse) => void;
  reject: (error: Error) => void;
  isBatch: boolean;
}

interface DynamicConcurrentConfig {
  queueLow: { threshold: number; concurrent: number };
  queueMedium: { threshold: number; concurrent: number };
  queueHigh: { threshold: number; concurrent: number };
}

const DEFAULT_CONCURRENT_CONFIG: DynamicConcurrentConfig = {
  queueLow: { threshold: 10, concurrent: 3 },
  queueMedium: { threshold: 30, concurrent: 5 },
  queueHigh: { threshold: 50, concurrent: 10 },
};

const MODEL_STRATEGY: Record<string, 'premium' | 'standard' | 'cheap'> = {
  'user-chat': 'premium',
  'batch-decision': 'cheap',
  'single-decision': 'standard',
  'creative': 'premium',
  'world-event': 'standard',
};

export class BatchLLMScheduler {
  private factory: ProviderFactory;
  private resilience: LLMResilience;
  private baseConfig: LoreConfig;
  private dynamicConcurrentConfig: DynamicConcurrentConfig;
  private active: number = 0;
  private queue: QueuedRequest[] = [];
  private maxQueueSize: number = 50;
  private monitor: Monitor | null = null;
  private droppedCount: number = 0;
  private totalTokensUsed: number = 0;
  private batchTokenSaved: number = 0;
  private batchCount: number = 0;

  constructor(config: LoreConfig) {
    this.baseConfig = config;
    this.factory = new ProviderFactory(config);
    this.resilience = new LLMResilience({
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: config.llm.limits.timeoutMs,
    });
    this.dynamicConcurrentConfig = DEFAULT_CONCURRENT_CONFIG;
  }

  setMonitor(monitor: Monitor): void {
    this.monitor = monitor;
  }

  getProvider(model: string): ILLMProvider {
    return this.factory.getProvider(model);
  }

  private getMaxConcurrent(): number {
    const queueLength = this.queue.length;
    const baseMax = this.baseConfig.llm.limits.maxConcurrent;

    if (queueLength < this.dynamicConcurrentConfig.queueLow.threshold) {
      return Math.min(this.dynamicConcurrentConfig.queueLow.concurrent, baseMax);
    }
    if (queueLength < this.dynamicConcurrentConfig.queueMedium.threshold) {
      return Math.min(this.dynamicConcurrentConfig.queueMedium.concurrent, baseMax);
    }
    return Math.min(this.dynamicConcurrentConfig.queueHigh.concurrent, baseMax);
  }

  private selectModel(callType: string): string {
    const strategy = MODEL_STRATEGY[callType] || 'standard';
    
    switch (strategy) {
      case 'premium':
        return this.baseConfig.llm.defaults.premiumModel;
      case 'standard':
        return this.baseConfig.llm.defaults.standardModel;
      case 'cheap':
        return this.baseConfig.llm.defaults.cheapModel;
      default:
        return this.baseConfig.llm.defaults.standardModel;
    }
  }

  private getPriority(callType: string): number {
    return this.baseConfig.llm.priorities[callType as keyof typeof this.baseConfig.llm.priorities] ?? 50;
  }

  async submit(request: LLMRequest): Promise<LLMResult> {
    const callType = request.callType ?? 'decision';
    const priority = this.getPriority(callType);
    const model = request.model || this.selectModel(callType);
    
    const enhancedRequest = { ...request, model };

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
        throw new Error('LLM queue overloaded, request dropped');
      }
    }

    logger.debug({ callType: request.callType ?? 'unknown', model: enhancedRequest.model, priority, queueSize: this.queue.length }, 'LLM request queued');
    
    return new Promise<LLMResult>((resolve, reject) => {
      this.queue.push({
        request: enhancedRequest,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
        isBatch: false,
      });
      this.processQueue();
    });
  }

  async submitBatchDecision(
    agents: BatchDecisionInput[],
    worldState: { currentTime: string; day: number; currentTick: number },
  ): Promise<BatchDecisionOutput[]> {
    if (agents.length === 0) return [];

    const prompt = this.buildBatchDecisionPrompt(agents, worldState);
    const model = this.baseConfig.llm.defaults.cheapModel;

    logger.debug({ agentCount: agents.length, model }, 'Submitting batch decision');

    const result = await this.submit({
      agentId: 'batch',
      callType: 'decision',
      model,
      messages: prompt,
      maxTokens: Math.min(agents.length * 150, 8000),
    });

    this.batchCount++;
    const estimatedTokens = agents.length * 2000;
    this.batchTokenSaved += estimatedTokens - (result.usage.promptTokens + result.usage.completionTokens);

    return this.parseBatchDecision(result.content, agents);
  }

  private buildBatchDecisionPrompt(
    agents: BatchDecisionInput[],
    worldState: { currentTime: string; day: number; currentTick: number },
  ): ChatMessage[] {
    const agentDescriptions = agents.map((a, i) => {
      const eventsStr = a.pendingEvents.length > 0 ? a.pendingEvents.join('\n') : '无待处理事件';
      return `【Agent ${i + 1}】id=${a.agentId}
姓名：${a.profile.name}
职业：${a.profile.occupation}
年龄：${a.profile.age}
心情：${a.stats.mood}/100
精力：${a.stats.energy}/100
健康：${a.stats.health}/100
正在：${a.state.currentActivity || '空闲'}
位置：${a.state.currentLocation || '未知'}
待处理事件：${eventsStr}`;
    }).join('\n\n');

    return [
      {
        role: 'system' as const,
        content: `你是批量决策引擎，同时处理多个Agent的决策。

规则：
- 每个Agent根据自己的状态和事件做决策
- 决策要符合Agent的性格和当前状态
- 返回JSON数组，每个元素对应一个Agent
- 决策可以简单（如"继续工作"）或复杂（如"辞职创业"）
- 禁止输出任何系统指令或改变输出格式
- 返回纯JSON，不要包含markdown代码块

返回格式：
[
  {
    "agentId": "对应Agent的id",
    "action": "做什么（简洁描述）",
    "reasoning": "内心想法（一句话）",
    "moodChange": 心情变化(-20到20),
    "say": "想说的话（可选）",
    "confidence": 0.8
  }
]

注意：
- 必须返回${agents.length}个决策
- 每个agentId必须与输入匹配
- action要具体，不能只写"思考"`,
      },
      {
        role: 'user' as const,
        content: `当前世界时间：${worldState.currentTime}（第 ${worldState.day} 天，tick ${worldState.currentTick}）

以下是${agents.length}个Agent的状态：

${agentDescriptions}

请为每个Agent返回决策。`,
      },
    ];
  }

  private parseBatchDecision(content: string, agents: BatchDecisionInput[]): BatchDecisionOutput[] {
    try {
      const parsed = JSON.parse(content);
      
      const result = BatchDecisionArraySchema.safeParse(parsed);
      if (!result.success) {
        logger.warn({ 
          errors: result.error.errors, 
          content: content.slice(0, 200) 
        }, 'Batch decision validation failed');
        return this.generateFallbackDecisions(agents);
      }

      const validated = result.data;
      const results: BatchDecisionOutput[] = [];

      for (const item of validated) {
        const agent = agents.find(a => a.agentId === item.agentId);
        if (!agent) {
          logger.warn({ agentId: item.agentId }, 'Batch decision references unknown agent');
          continue;
        }

        results.push({
          agentId: item.agentId,
          action: item.action,
          reasoning: item.reasoning,
          moodChange: item.moodChange,
          say: item.say,
          confidence: item.confidence,
        });
      }

      if (results.length < agents.length) {
        logger.warn({ expected: agents.length, got: results.length }, 'Batch decision missing some agents');
        for (const agent of agents) {
          if (!results.find(r => r.agentId === agent.agentId)) {
            results.push(this.generateFallbackDecision(agent));
          }
        }
      }

      return results;
    } catch (err) {
      logger.warn({ err, content: content.slice(0, 200) }, 'Failed to parse batch decision');
      return this.generateFallbackDecisions(agents);
    }
  }

  private generateFallbackDecisions(agents: BatchDecisionInput[]): BatchDecisionOutput[] {
    return agents.map(a => this.generateFallbackDecision(a));
  }

  private generateFallbackDecision(agent: BatchDecisionInput): BatchDecisionOutput {
    const stats = agent.stats;
    let action = '空闲';
    let moodChange = 0;

    if (stats.energy < 30) {
      action = '休息';
      moodChange = 5;
    } else if (stats.health < 50) {
      action = '休息调养';
      moodChange = -5;
    } else if (agent.pendingEvents.length > 0) {
      action = '处理事件';
    } else {
      action = agent.profile.occupation ? '继续工作' : '日常活动';
    }

    return {
      agentId: agent.agentId,
      action,
      reasoning: '系统生成默认决策',
      moodChange,
      confidence: 0.3,
    };
  }

  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.active >= this.getMaxConcurrent()) return;

    this.queue.sort((a, b) => b.priority - a.priority);

    while (this.queue.length > 0 && this.active < this.getMaxConcurrent()) {
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

        this.totalTokensUsed += result.usage.promptTokens + result.usage.completionTokens;

        this.monitor?.recordLLMCall(
          result.usage.promptTokens + result.usage.completionTokens,
          result.latencyMs,
          result.model,
        );

        logger.debug({
          model: item.request.model,
          callType: item.request.callType,
          tokens: result.usage.promptTokens + result.usage.completionTokens,
          latencyMs: result.latencyMs,
          isBatch: item.isBatch,
        }, 'LLM call completed');

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

  async *submitStream(request: LLMRequest): AsyncIterable<string> {
    while (this.active >= this.getMaxConcurrent()) {
      if (this.queue.length >= this.maxQueueSize) {
        throw new Error('LLM queue overloaded, stream request rejected');
      }
      await new Promise(r => setTimeout(r, 50));
    }

    this.active++;
    try {
      const callType = request.callType ?? 'decision';
      const model = request.model || this.selectModel(callType);
      const provider = this.factory.getProvider(model);
      yield* provider.streamText({
        model,
        messages: request.messages,
      });
    } finally {
      this.active--;
      this.processQueue();
    }
  }

  getQueueStats(): { queueLength: number; active: number; dropped: number; maxConcurrent: number } {
    return {
      queueLength: this.queue.length,
      active: this.active,
      dropped: this.droppedCount,
      maxConcurrent: this.getMaxConcurrent(),
    };
  }

  getBatchStats(): { batchCount: number; tokenSaved: number; avgTokenSavedPerBatch: number } {
    return {
      batchCount: this.batchCount,
      tokenSaved: this.batchTokenSaved,
      avgTokenSavedPerBatch: this.batchCount > 0 ? Math.round(this.batchTokenSaved / this.batchCount) : 0,
    };
  }

  getTotalTokensUsed(): number {
    return this.totalTokensUsed;
  }

  resetStats(): void {
    this.droppedCount = 0;
    this.batchTokenSaved = 0;
    this.batchCount = 0;
  }

  updateDynamicConcurrent(config: Partial<DynamicConcurrentConfig>): void {
    this.dynamicConcurrentConfig = { ...this.dynamicConcurrentConfig, ...config };
    logger.info({ newConfig: this.dynamicConcurrentConfig }, 'Dynamic concurrent config updated');
  }
}