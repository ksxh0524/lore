import type { WorldEvent } from './event.js';
import type { AgentStats, AgentState } from './agent.js';

export type WsEventType =
  | 'connected'
  | 'disconnected'
  | 'world_state'
  | 'event'
  | 'agent_update'
  | 'init_progress'
  | 'init_complete'
  | 'chat_stream'
  | 'chat_message'
  | 'mode_switch_ack'
  | 'time_speed_changed'
  | 'platform_new_post'
  | 'error';

export interface WsMessageBase {
  type: WsEventType;
}

export interface WsConnectedMessage extends WsMessageBase {
  type: 'connected';
  tick: number;
  worldTime: string;
  timeSpeed: number;
}

export interface WsDisconnectedMessage extends WsMessageBase {
  type: 'disconnected';
}

export interface WsWorldStateMessage extends WsMessageBase {
  type: 'world_state';
  tick: number;
  worldTime: string;
  status: 'running' | 'paused';
  timeSpeed?: number;
}

export interface WsEventMessage extends WsMessageBase {
  type: 'event';
  event: WorldEvent;
}

export interface WsAgentUpdateMessage extends WsMessageBase {
  type: 'agent_update';
  agentId: string;
  state: AgentState;
  stats: AgentStats;
}

export interface WsInitProgressMessage extends WsMessageBase {
  type: 'init_progress';
  stage: string;
  progress: number;
}

export interface WsInitCompleteMessage extends WsMessageBase {
  type: 'init_complete';
  worldId: string;
  agentCount: number;
}

export interface WsChatStreamMessage extends WsMessageBase {
  type: 'chat_stream';
  agentId: string;
  chunk: string;
  done: boolean;
}

export interface WsChatMessage extends WsMessageBase {
  type: 'chat_message';
  agentId: string;
  content: string;
}

export interface WsModeSwitchAckMessage extends WsMessageBase {
  type: 'mode_switch_ack';
  mode: 'character' | 'god';
}

export interface WsTimeSpeedChangedMessage extends WsMessageBase {
  type: 'time_speed_changed';
  speed: number;
}

export interface WsPlatformNewPostMessage extends WsMessageBase {
  type: 'platform_new_post';
  post: {
    id: string;
    platformId: string;
    authorId: string;
    content: string;
    createdAt: string;
  };
}

export interface WsErrorMessage extends WsMessageBase {
  type: 'error';
  code?: number;
  message: string;
}

export type WsMessage =
  | WsConnectedMessage
  | WsDisconnectedMessage
  | WsWorldStateMessage
  | WsEventMessage
  | WsAgentUpdateMessage
  | WsInitProgressMessage
  | WsInitCompleteMessage
  | WsChatStreamMessage
  | WsChatMessage
  | WsModeSwitchAckMessage
  | WsTimeSpeedChangedMessage
  | WsPlatformNewPostMessage
  | WsErrorMessage;

export interface WsClientMessage {
  type: 'ping' | 'subscribe' | 'unsubscribe' | 'pause' | 'resume' | 'set_time_speed' | 'mode_switch' | 'chat_message' | 'agent_chat' | 'platform_new_post' | 'god_observe_agent';
  eventTypes?: string[];
  speed?: number;
  mode?: 'character' | 'god';
  agentId?: string;
  content?: string;
  fromAgentId?: string;
  toAgentId?: string;
  platformId?: string;
  includeThoughts?: boolean;
  includeMemory?: boolean;
}