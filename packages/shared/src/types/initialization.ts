export interface RandomInitParams {
  age: number;
  location: string;
  background: string;
}

export interface HistoryInitParams {
  presetName: string;
  targetCharacter?: string;
}

export interface InitRequest {
  worldType: import('./mode').WorldType;
  randomParams?: RandomInitParams;
  historyParams?: HistoryInitParams;
}

export interface AgentInitData {
  name: string;
  profile: import('./agent').AgentProfile;
  initialStats: import('./agent').AgentStats;
  backstory: string;
}

export interface InitResult {
  worldId: string;
  worldConfig: {
    name: string;
    startTime: string;
    location: string;
  };
  userAvatar: AgentInitData;
  agents: AgentInitData[];
}
