export interface WorldEvent {
  id: string;
  worldId: string;
  type: 'routine' | 'random' | 'social' | 'romantic' | 'career' | 'crisis' | 'user' | 'world';
  category: string;
  description: string;
  involvedAgents: string[];
  consequences?: EventConsequence[];
  timestamp: Date;
  processed: boolean;
  userChoices?: string[];
  priority: number;
}

export interface EventConsequence {
  agentId: string;
  statChanges: Partial<import('./agent').AgentStats>;
  relationshipChange?: { targetId: string; delta: number };
}
