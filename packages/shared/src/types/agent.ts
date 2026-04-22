export type AgentType = 'npc' | 'system' | 'user-avatar' | 'world' | 'init';

export interface AgentProfile {
  name: string;
  age: number;
  gender: string;
  occupation: string;
  personality: string;
  background: string;
  speechStyle: string;
  likes: string[];
  dislikes: string[];
  avatarUrl?: string;
}

export type AgentStatus = 'idle' | 'active' | 'sleeping' | 'dead' | 'working' | 'traveling' | 'socializing';

export interface AgentState {
  status: AgentStatus;
  currentActivity: string;
  currentLocation: string;
  lastActiveTick: number;
}

export interface AgentStats {
  mood: number;
  health: number;
  energy: number;
  money: number;
}

export type ThoughtFrequency = 'high' | 'medium' | 'low' | 'minimal';

export interface SerializedAgent {
  id: string;
  worldId: string;
  type: AgentType;
  profile: AgentProfile;
  state: AgentState;
  stats: AgentStats;
  relationships: Array<[string, import('./relationship').Relationship]>;
}
