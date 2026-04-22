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
  messages: Array<{ id: string; role: 'user' | 'agent' | 'agent_stream'; content: string; timestamp: string }>;
  initializing: boolean;
  godMode: boolean;
  speed: number;
}

interface WorldActions {
  setWorldId: (id: string) => void;
  setWorld: (w: WorldInfo) => void;
  setAgents: (a: AgentInfo[]) => void;
  addEvent: (e: EventInfo) => void;
  setTick: (t: number) => void;
  setRunning: (r: boolean) => void;
  selectAgent: (id: string | null) => void;
  addMessage: (role: 'user' | 'agent' | 'agent_stream', content: string) => void;
  setInitializing: (v: boolean) => void;
  setGodMode: (v: boolean) => void;
  setSpeed: (v: number) => void;
  reset: () => void;
}

type WorldStore = WorldState & WorldActions;

const initial: WorldState = {
  worldId: null,
  world: null,
  agents: [],
  events: [],
  tick: 0,
  isRunning: false,
  selectedAgentId: null,
  messages: [] as Array<{ id: string; role: 'user' | 'agent' | 'agent_stream'; content: string; timestamp: string }>,
  initializing: false,
  godMode: false,
  speed: 1,
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
  addMessage: (role: 'user' | 'agent' | 'agent_stream', content: string) => set((s) => {
    const id = Math.random().toString(36).substring(7);
    const timestamp = new Date().toISOString();
    if (role === 'agent_stream') {
      const last = s.messages[s.messages.length - 1];
      if (last && last.role === 'agent_stream') {
        return { messages: [...s.messages.slice(0, -1), { id: last.id, role: 'agent_stream', content: last.content + content, timestamp }] };
      }
      return { messages: [...s.messages, { id, role: 'agent_stream', content, timestamp }] };
    }
    const filtered = s.messages.filter(m => m.role !== 'agent_stream');
    return { messages: [...filtered, { id, role, content, timestamp }] };
  }),
  setInitializing: (v) => set({ initializing: v }),
  setGodMode: (v) => set({ godMode: v }),
  setSpeed: (v) => set({ speed: v }),
  reset: () => set(initial),
}));
