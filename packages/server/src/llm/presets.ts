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

export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  dashscope: {
    id: 'dashscope',
    name: '阿里云百炼 (DashScope)',
    description: '阿里云通义千问大模型服务，OpenAI API 兼容',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
    type: 'openai',
    defaultModels: [
      'qwen-plus',
      'qwen-turbo',
      'qwen-max',
      'qwen-coder-plus',
    ],
    embeddingModel: 'text-embedding-v3',
    requiresApiKey: true,
    apiKeyEnvVar: 'DASHSCOPE_API_KEY',
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'OpenAI GPT 系列模型',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    embeddingModel: 'text-embedding-3-small',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    apiKeyPlaceholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxx',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google Gemini 系列模型（OpenAI 兼容模式）',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    type: 'openai',
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    embeddingModel: 'text-embedding-004',
    requiresApiKey: true,
    apiKeyEnvVar: 'GEMINI_API_KEY',
    apiKeyPlaceholder: 'AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx',
  },
  claude: {
    id: 'claude',
    name: 'Anthropic Claude',
    description: 'Anthropic Claude 系列模型',
    baseUrl: 'https://api.anthropic.com/v1',
    type: 'anthropic',
    defaultModels: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    embeddingModel: undefined, // Claude 没有 embedding 服务
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    apiKeyPlaceholder: 'sk-ant-xxxxx',
  },
};

export function getPresetById(id: string): ProviderPreset | undefined {
  return PROVIDER_PRESETS[id];
}

export function getAllPresets(): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS);
}
