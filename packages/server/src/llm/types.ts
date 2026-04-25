import type {
  ChatMessage,
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ToolDefinition,
  ProviderConfig,
  ProviderType,
  LLMUsage,
  ToolCall,
  MessageContent,
} from '@lore/shared';

export {
  ChatMessage,
  LLMRequest,
  LLMResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ToolDefinition,
  ProviderConfig,
  ProviderType,
  LLMUsage,
  ToolCall,
  MessageContent,
};

export type LLMResult = LLMResponse;

export interface ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  generateText(request: LLMRequest): Promise<LLMResponse>;
  streamText(request: LLMRequest): AsyncIterable<string>;
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
  isModelSupported(model: string): boolean;
  getSupportedModels(): string[];
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

export type LLMCallType = 'user-chat' | 'decision' | 'social' | 'creative' | 'world-event';

export interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
  maxSize: number;
  hashAlgorithm: 'sha256' | 'md5';
}

export interface ProviderPresetConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  models: string[];
  defaultModel?: string;
  embeddingModel?: string;
}