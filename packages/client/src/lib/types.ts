export interface AgentInfo {
  id: string;
  profile: { name: string; age: number; occupation: string };
  stats: { mood: number; health: number; energy: number; money: number };
  state: { status: string; currentActivity: string };
}

export interface WorldInfo {
  id: string;
  name: string;
  type: string;
  status: string;
  currentTick: number;
  worldTime: string | null;
}

export interface EventOption {
  id: string;
  text: string;
}

export interface EventInfo {
  id: string;
  type: 'world' | 'social' | 'work' | 'random' | 'relationship' | 'health' | 'money';
  category?: string;
  title?: string;
  description: string;
  priority: number;
  timestamp: string;
  options?: EventOption[];
  processed?: boolean;
}
