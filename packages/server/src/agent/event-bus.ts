import { EventEmitter } from 'events';

export type AgentEventType =
  | 'stat_changed'
  | 'state_changed'
  | 'memory_added'
  | 'relationship_changed'
  | 'action_executed'
  | 'decision_made'
  | 'goal_completed'
  | 'goal_failed'
  | 'emotion_changed'
  | 'location_changed'
  | 'social_interaction'
  | 'agent_died';

export interface AgentEvent {
  agentId: string;
  type: AgentEventType;
  timestamp: Date;
  payload: unknown;
}

export interface StatChangeEvent extends AgentEvent {
  type: 'stat_changed';
  payload: {
    stat: 'mood' | 'health' | 'energy' | 'money';
    oldValue: number;
    newValue: number;
    delta: number;
    reason?: string;
  };
}

export interface StateChangeEvent extends AgentEvent {
  type: 'state_changed';
  payload: {
    from: string;
    to: string;
    reason?: string;
    data?: unknown;
  };
}

export class AgentEventBus extends EventEmitter {
  private static instance: AgentEventBus;
  private eventHistory: Map<string, AgentEvent[]> = new Map();
  private readonly maxHistoryPerAgent = 1000;

  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }

  emitEvent(event: AgentEvent): void {
    this.emit(event.type, event);
    this.emit(`agent:${event.agentId}`, event);
    this.emit('*', event);

    if (!this.eventHistory.has(event.agentId)) {
      this.eventHistory.set(event.agentId, []);
    }
    const history = this.eventHistory.get(event.agentId)!;
    history.push(event);
    if (history.length > this.maxHistoryPerAgent) {
      history.shift();
    }
  }

  getHistory(agentId: string, limit?: number, types?: AgentEventType[]): AgentEvent[] {
    const history = this.eventHistory.get(agentId) || [];
    let filtered = history;
    if (types && types.length > 0) {
      filtered = history.filter((e) => types.includes(e.type));
    }
    return limit ? filtered.slice(-limit) : filtered;
  }

  subscribe(agentId: string, callback: (event: AgentEvent) => void): () => void {
    this.on(`agent:${agentId}`, callback);
    return () => this.off(`agent:${agentId}`, callback);
  }

  subscribeToType(type: AgentEventType, callback: (event: AgentEvent) => void): () => void {
    this.on(type, callback);
    return () => this.off(type, callback);
  }

  clearHistory(agentId?: string): void {
    if (agentId) {
      this.eventHistory.delete(agentId);
    } else {
      this.eventHistory.clear();
    }
  }
}

export const agentEventBus = AgentEventBus.getInstance();
