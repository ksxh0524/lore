export interface AgentMonitorData {
  agentId: string;
  totalLLMCalls: number;
  totalTokens: number;
  totalCost: number;
  avgLatencyMs: number;
  lastDecision: string;
  lastDecisionTime: Date;
  thoughtFrequency: 'high' | 'medium' | 'low';
}

export interface WorldMonitorData {
  tick: number;
  worldTime: Date;
  agentCount: number;
  activeAgentCount: number;
  totalLLMCalls: number;
  totalTokens: number;
  totalCost: number;
  eventsPerTick: number;
  pendingLLMRequests: number;
  droppedRequests: number;
}
