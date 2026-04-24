import type { SerializedAgent } from './agent.js';
import type { WorldEvent } from './event.js';

export interface WorldSnapshot {
  world: {
    id: string;
    name: string;
    type: 'history' | 'random';
    status: 'initializing' | 'running' | 'paused' | 'stopped';
    currentTick: number;
    worldTime: string | null;
  } | null;
  agents: SerializedAgent[];
  events: WorldEvent[];
  savedAt: string;
}

export interface WorldData {
  worldConfig?: {
    name?: string;
    startTime?: string;
    location?: string;
  };
  agents?: Array<{
    name?: string;
    profile?: import('./agent.js').AgentProfile;
    backstory?: string;
    background?: string;
    initialStats?: import('./agent.js').AgentStats;
    relationship?: {
      type?: string;
      intimacy?: number;
    };
  }>;
  userAvatar?: {
    name?: string;
    profile?: import('./agent.js').AgentProfile;
    backstory?: string;
    initialStats?: import('./agent.js').AgentStats;
  };
  worldState?: {
    economy?: string;
    society?: string;
    majorEvents?: string[];
  };
}