import type { AgentProfile, AgentStats } from './agent.js';

export interface WorldData {
  worldConfig?: {
    name?: string;
    startTime?: string;
    location?: string;
  };
  agents?: Array<{
    name?: string;
    profile?: AgentProfile;
    backstory?: string;
    background?: string;
    initialStats?: AgentStats;
    relationship?: {
      type?: string;
      intimacy?: number;
    };
  }>;
  userAvatar?: {
    name?: string;
    profile?: AgentProfile;
    backstory?: string;
    initialStats?: AgentStats;
  };
  worldState?: {
    economy?: string;
    society?: string;
    majorEvents?: string[];
  };
}