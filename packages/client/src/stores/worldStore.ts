import { create } from 'zustand';
import type { AgentInfo, WorldInfo, EventInfo } from '../lib/types';

interface WorldState {
  worldId: string | null;
  world: WorldInfo | null;
  agents: AgentInfo[];
  events: EventInfo[];
  tick: number;
  isRunning: boolean;
  selectedAgentId: string | null;
  messages: Array<{ role: 'user' | 'agent'; content: string }>;
  initializing: boolean;
}

interface WorldActions {
  setWorldId: (id: string) => void;
  setWorld: (w: WorldInfo) => void;
  setAgents: (a: AgentInfo[]) => void;
  addEvent: (e: EventInfo) => void;
  setTick: (t: number) => void;
  setRunning: (r: boolean) => void;
  selectAgent: (id: string | null) => void;
  addMessage: (role: 'user' | 'agent', content: string) => void;
  setInitializing: (v: boolean) => void;
  reset: () => void;
}

type WorldStore = WorldState & WorldActions;

const initial: WorldState = {
  worldId: null, world: null, agents: [], events: [],
  tick: 0, isRunning: false, selectedAgentId: null,
  messages: [], initializing: false,
};

export const useWorldStore = create<WorldStore>((set) => ({
  ...initial,
  setWorldId: (id) => set({ worldId: id }),
  setWorld: (w) => set({ world: w }),
  setAgents: (a) => set({ agents: a }),
  addEvent: (e) => set((s) => ({ events: [e, ...s.events].slice(0, 100) })),
  setTick: (t) => set({ tick: t }),
  setRunning: (r) => set({ isRunning: r }),
  selectAgent: (id) => set({ selectedAgentId: id, messages: [] }),
  addMessage: (role, content) => set((s) => ({ messages: [...s.messages, { role, content }] })),
  setInitializing: (v) => set({ initializing: v }),
  reset: () => set(initial),
}));
