export type WorldEventType = 'routine' | 'random' | 'social' | 'romantic' | 'career' | 'crisis' | 'user' | 'world' | 'economic' | 'disaster' | 'political' | 'health';

export interface WorldEvent {
  id: string;
  worldId: string;
  type: WorldEventType;
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

export type EventSeverity = 'minor' | 'moderate' | 'major' | 'catastrophic';

export interface WorldEventConfig {
  eventType: 'disaster' | 'economic' | 'social' | 'political' | 'health' | 'weather';
  category: string;
  description: string;
  severity: EventSeverity;
  affectedCriteria: {
    occupation?: string[];
    moodRange?: [number, number];
    random?: number;
    all?: boolean;
  };
  consequences: {
    statChanges: Partial<import('./agent').AgentStats>;
    relationshipModifier?: number;
  };
}
