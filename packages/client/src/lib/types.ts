export interface AgentInfo {
  id: string;
  profile: { name: string; age: number; occupation: string };
  stats: { mood: number; health: number; energy: number; money: number };
  state: { currentActivity: string };
}

export interface WorldInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  currentTick: number;
  worldTime: string | null;
}

export interface EventInfo {
  id: string;
  type: string;
  description: string;
  priority: number;
  timestamp: string;
}
