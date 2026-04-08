export class Monitor {
  private llmCallCount = 0;
  private totalTokens = 0;
  private totalCost = 0;
  private droppedRequests = 0;
  private eventsThisTick = 0;

  recordLLMCall(tokens: number, latencyMs: number, model: string): void {
    this.llmCallCount++;
    this.totalTokens += tokens;
    const costPerToken: Record<string, number> = {
      'gpt-4o': 0.00003,
      'gpt-4o-mini': 0.000002,
      'gpt-3.5-turbo': 0.000001,
    };
    this.totalCost += tokens * (costPerToken[model] ?? 0.000001);
  }

  recordDropped(): void {
    this.droppedRequests++;
  }

  recordEvent(): void {
    this.eventsThisTick++;
  }

  resetTick(): void {
    this.eventsThisTick = 0;
  }

  getStats() {
    return {
      totalLLMCalls: this.llmCallCount,
      totalTokens: this.totalTokens,
      totalCost: Math.round(this.totalCost * 100) / 100,
      droppedRequests: this.droppedRequests,
      eventsThisTick: this.eventsThisTick,
    };
  }
}
