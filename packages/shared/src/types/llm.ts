export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: 'url' | 'base64';
  mediaType?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
  data: string;
}

export interface AudioContent {
  type: 'audio';
  source: 'url' | 'base64';
  mediaType?: 'audio/mp3' | 'audio/wav' | 'audio/ogg' | 'audio/m4a';
  data: string;
}

export interface VideoContent {
  type: 'video';
  source: 'url' | 'base64';
  mediaType?: 'video/mp4' | 'video/webm' | 'video/quicktime';
  data: string;
}

export interface FileContent {
  type: 'file';
  source: 'url' | 'base64';
  mediaType?: string;
  filename?: string;
  data: string;
}

export type MessageContent = TextContent | ImageContent | AudioContent | VideoContent | FileContent;

export interface ChatMessage {
  role: MessageRole;
  content: string | MessageContent[];
  name?: string;
  toolCallId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens?: number;
}

export interface ToolCall {
  id?: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  metadata?: Record<string, unknown>;
  agentId?: string;
  callType?: 'user-chat' | 'decision' | 'social' | 'creative' | 'world-event' | 'batch-decision' | 'single-decision';
}

export interface LLMResponse {
  id?: string;
  content: string;
  toolCalls?: ToolCall[];
  usage: LLMUsage;
  model: string;
  latencyMs: number;
  cached?: boolean;
  finishReason?: 'stop' | 'length' | 'tool_use' | 'content_filter' | 'error';
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: LLMUsage;
  latencyMs: number;
}

export interface LLMCacheEntry {
  key: string;
  request: LLMRequest;
  response: LLMResponse;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface LLMStats {
  providerId: string;
  model: string;
  requestCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cacheHits: number;
  cacheMisses: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  errorCount: number;
  lastRequestAt?: number;
}

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  apiKey: string;
  models: string[];
  defaultModel?: string;
  embeddingModel?: string;
  enabled: boolean;
  priority: number;
  metadata?: Record<string, unknown>;
}

export type ProviderType = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'gemini'
  | 'zhipu' 
  | 'moonshot' 
  | 'kimi'
  | 'minimax' 
  | 'dashscope' 
  | 'deepseek' 
  | 'ollama'
  | 'mock';