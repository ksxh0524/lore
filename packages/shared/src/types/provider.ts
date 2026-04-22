export interface ProviderPreset {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  type: 'openai' | 'anthropic';
  defaultModels: string[];
  embeddingModel?: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  apiKeyPlaceholder?: string;
}

export interface UserProvider {
  id: string;
  presetId: string;
  name: string;
  apiKey: string; // masked like 'sk-****xxxx'
  baseUrl?: string;
  enabled: boolean;
  priority: number;
  models: string[];
  defaultModel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderRequest {
  presetId: string;
  name?: string;
  apiKey: string;
  baseUrl?: string;
  models?: string[];
  defaultModel?: string;
}

export interface UpdateProviderRequest {
  name?: string;
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
  priority?: number;
  models?: string[];
  defaultModel?: string;
}

export interface TestProviderResponse {
  success: boolean;
  message: string;
  latency?: number;
}
