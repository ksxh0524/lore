export interface ILLMProvider {
  readonly name: string;
  generateText(request: LLMCallRequest): Promise<LLMCallResult>;
  streamText(request: LLMCallRequest): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  isModelSupported(model: string): boolean;
}

export interface IImageProvider {
  readonly name: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
  isModelSupported(model: string): boolean;
}

export interface ImageGenerationRequest {
  prompt: string;
  model: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  style?: 'vivid' | 'natural';
  n?: number;
}

export interface ImageGenerationResult {
  images: Array<{ url?: string; base64?: string; revisedPrompt?: string }>;
  model: string;
  latencyMs: number;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMCallRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  temperature?: number;
  tools?: ToolDefinition[];
}

export interface LLMCallResult {
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}

export type LLMCallType = 'user-chat' | 'decision' | 'social' | 'creative' | 'world-event';

export interface LLMRequest {
  agentId: string;
  callType: LLMCallType;
  model: string;
  messages: Array<{ role: string; content: string }>;
  maxTokens?: number;
  tools?: ToolDefinition[];
}

export interface LLMResult {
  content: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
  latencyMs: number;
}
