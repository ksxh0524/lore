import { EventEmitter } from 'events';

export type AgentStatus = 'idle' | 'active' | 'sleeping' | 'dead' | 'traveling' | 'working' | 'socializing';

export interface StateTransition {
  from: AgentStatus | AgentStatus[];
  to: AgentStatus;
  guard?: (context: StateContext) => boolean;
  action?: (context: StateContext, data?: unknown) => void;
}

export interface StateContext {
  energy: number;
  health: number;
  mood: number;
  currentActivity: string;
  currentLocation: string;
}

export interface StateChangeEvent {
  agentId: string;
  from: AgentStatus;
  to: AgentStatus;
  timestamp: Date;
  reason?: string;
  data?: unknown;
}

export class AgentStateMachine extends EventEmitter {
  private currentState: AgentStatus = 'idle';
  private transitions: Map<string, StateTransition[]> = new Map();
  private history: StateChangeEvent[] = [];
  private readonly maxHistorySize = 100;

  constructor(private agentId: string) {
    super();
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    this.addTransition({
      from: 'idle',
      to: 'active',
      guard: (ctx) => ctx.energy > 20 && ctx.health > 30,
    });
    this.addTransition({
      from: 'idle',
      to: 'sleeping',
      guard: (ctx) => ctx.energy < 30,
    });
    this.addTransition({ from: 'idle', to: 'traveling' });
    this.addTransition({
      from: 'idle',
      to: 'working',
      guard: (ctx) => ctx.energy > 30,
    });
    this.addTransition({
      from: 'idle',
      to: 'socializing',
      guard: (ctx) => ctx.mood > 20 && ctx.energy > 25,
    });

    this.addTransition({
      from: 'active',
      to: 'idle',
      guard: (ctx) => ctx.energy < 40,
    });
    this.addTransition({
      from: 'active',
      to: 'sleeping',
      guard: (ctx) => ctx.energy < 20,
    });

    this.addTransition({
      from: 'sleeping',
      to: 'idle',
      guard: (ctx) => ctx.energy >= 80,
    });
    this.addTransition({
      from: 'sleeping',
      to: 'active',
      guard: (ctx) => ctx.energy >= 90,
    });

    this.addTransition({
      from: 'traveling',
      to: 'idle',
      guard: (ctx) => ctx.energy > 10,
    });
    this.addTransition({
      from: 'traveling',
      to: 'sleeping',
      guard: (ctx) => ctx.energy <= 10,
    });

    this.addTransition({
      from: 'working',
      to: 'idle',
      guard: (ctx) => ctx.energy < 30,
    });
    this.addTransition({
      from: 'working',
      to: 'sleeping',
      guard: (ctx) => ctx.energy < 15,
    });

    this.addTransition({
      from: 'socializing',
      to: 'idle',
      guard: (ctx) => ctx.energy < 20 || ctx.mood < 10,
    });

    this.addTransition({
      from: ['idle', 'active', 'sleeping', 'traveling', 'working', 'socializing'],
      to: 'dead',
      guard: (ctx) => ctx.health <= 0,
    });
  }

  private addTransition(transition: StateTransition): void {
    const fromStates = Array.isArray(transition.from) ? transition.from : [transition.from];
    for (const from of fromStates) {
      const key = `${from}->${transition.to}`;
      if (!this.transitions.has(key)) {
        this.transitions.set(key, []);
      }
      this.transitions.get(key)!.push(transition);
    }
  }

  getState(): AgentStatus {
    return this.currentState;
  }

  canTransition(to: AgentStatus, context: StateContext): boolean {
    if (this.currentState === to) return true;
    const key = `${this.currentState}->${to}`;
    const transitions = this.transitions.get(key);
    if (!transitions || transitions.length === 0) return false;
    return transitions.some((t) => !t.guard || t.guard(context));
  }

  transition(to: AgentStatus, context: StateContext, reason?: string, data?: unknown): boolean {
    if (!this.canTransition(to, context)) {
      return false;
    }

    const from = this.currentState;
    this.currentState = to;

    const key = `${from}->${to}`;
    const transitions = this.transitions.get(key);
    if (transitions) {
      for (const t of transitions) {
        if (t.action && (!t.guard || t.guard(context))) {
          t.action(context, data);
        }
      }
    }

    const event: StateChangeEvent = {
      agentId: this.agentId,
      from,
      to,
      timestamp: new Date(),
      reason,
      data,
    };
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    this.emit('stateChange', event);
    return true;
  }

  getHistory(limit: number = 20): StateChangeEvent[] {
    return this.history.slice(-limit);
  }

  isFinal(): boolean {
    return this.currentState === 'dead';
  }

  dispose(): void {
    this.removeAllListeners();
    this.transitions.clear();
    this.history = [];
  }
}
