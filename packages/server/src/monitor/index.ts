import type { AgentRuntime } from '../agent/agent-runtime.js';

export interface MonitorStats {
  llmCallCount: number;
  totalTokens: number;
  totalCost: number;
  droppedRequests: number;
  eventsThisTick: number;
  avgLatencyMs: number;
  queueLength: number;
  activeRequests: number;
  tickDurationMs: number;
}

export class Monitor {
  private llmCallCount = 0;
  private totalTokens = 0;
  private totalCost = 0;
  private droppedRequests = 0;
  private eventsThisTick = 0;
  private latencies: number[] = [];
  private tickStartTime = 0;
  private tickDurationMs = 0;
  private queueLength = 0;
  private activeRequests = 0;

  private costPerToken: Record<string, number> = {
    'gpt-4': 0.03 / 1000,
    'gpt-4-mini': 0.01 / 1000,
    'gpt-3.5-turbo': 0.002 / 1000,
    'mock': 0,
  };

  recordLLMCall(tokens: number, latencyMs: number, model: string): void {
    this.llmCallCount++;
    this.totalTokens += tokens;
    this.latencies.push(latencyMs);
    const cost = this.costPerToken[model] ?? 0;
    this.totalCost += tokens * cost;
  }

  recordDropped(): void {
    this.droppedRequests++;
  }

  recordEvent(): void {
    this.eventsThisTick++;
  }

  setQueueStats(queueLength: number, active: number): void {
    this.queueLength = queueLength;
    this.activeRequests = active;
  }

  startTick(): void {
    this.tickStartTime = Date.now();
  }

  endTick(): void {
    if (this.tickStartTime > 0) {
      this.tickDurationMs = Date.now() - this.tickStartTime;
    }
  }

  resetTick(): void {
    this.eventsThisTick = 0;
    this.startTick();
  }

  getStats(): MonitorStats {
    const avgLatencyMs = this.latencies.length > 0
      ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
      : 0;

    return {
      llmCallCount: this.llmCallCount,
      totalTokens: this.totalTokens,
      totalCost: this.totalCost,
      droppedRequests: this.droppedRequests,
      eventsThisTick: this.eventsThisTick,
      avgLatencyMs,
      queueLength: this.queueLength,
      activeRequests: this.activeRequests,
      tickDurationMs: this.tickDurationMs,
    };
  }

  getAgentHealth(agent: AgentRuntime): {
    id: string;
    name: string;
    status: string;
    mood: number;
    health: number;
    energy: number;
    thoughtFrequency: string;
  } {
    return {
      id: agent.id,
      name: agent.profile.name,
      status: agent.state.status,
      mood: agent.stats.mood,
      health: agent.stats.health,
      energy: agent.stats.energy,
      thoughtFrequency: agent.getThoughtFrequency(),
    };
  }

  reset(): void {
    this.llmCallCount = 0;
    this.totalTokens = 0;
    this.totalCost = 0;
    this.droppedRequests = 0;
    this.latencies = [];
  }
}