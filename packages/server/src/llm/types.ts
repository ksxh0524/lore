export interface ILLMProvider {
  readonly name: string;
  generateText(request: LLMCallRequest): Promise<LLMCallResult>;
  streamText(request: LLMCallRequest): AsyncIterable<string>;
  isModelSupported(model: string): boolean;
}

export interface LLMCallRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCallResult {
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}

export type LLMCallType = 'user-chat' | 'decision' | 'social' | 'creative';

export interface LLMRequest {
  agentId: string;
  callType: LLMCallType;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
}

export interface LLMResult {
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}
