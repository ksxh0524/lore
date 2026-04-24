import type { AgentProfile, AgentState, AgentStats, AgentStatus } from '@lore/shared';
import type { MemoryManager } from './memory.js';
import { z } from 'zod';

export const DecisionSchema = z.object({
  action: z.string().default('思考'),
  target: z.string().optional(),
  reasoning: z.string().default('没有特别的理由'),
  moodChange: z.number().default(0),
  say: z.string().optional(),
  alternativeActions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type DecisionInput = z.infer<typeof DecisionSchema>;

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
  memory: MemoryManager;
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