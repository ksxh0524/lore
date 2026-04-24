import type { AgentProfile, AgentState, AgentStats, AgentStatus } from '@lore/shared';

export interface StatChange {
  stat: keyof AgentStats;
  delta: number;
  reason?: string;
}

export interface StateChange {
  status?: AgentStatus;
  activity?: string;
  location?: string;
}

export interface ToolContext {
  id: string;
  worldId: string;
  profile: AgentProfile;
  stats: AgentStats;
  state: AgentState;
}

export interface ToolResult {
  success: boolean;
  message?: string;
  result?: unknown;
  statChanges?: StatChange[];
  stateChanges?: StateChange[];
  duration?: number;
  memory?: string;
}

export interface WorldConfig {
  name?: string;
  startTime?: string;
  location?: string;
}

export interface AgentInitData {
  name?: string;
  age?: number;
  gender?: string;
  occupation?: string;
  personality?: string;
  backstory?: string;
  background?: string;
  speechStyle?: string;
  likes?: string[];
  dislikes?: string[];
  profile?: Omit<AgentProfile, 'occupation'> & { occupation?: string };
  initialStats?: AgentStats;
}

export interface UserAvatarData {
  name?: string;
  profile?: AgentProfile;
  initialStats?: AgentStats;
  backstory?: string;
}

export interface WorldData {
  worldConfig?: WorldConfig;
  userAvatar?: UserAvatarData;
  agents?: AgentInitData[];
  worldState?: {
    economy?: string;
    society?: string;
    majorEvents?: string[];
  };
}