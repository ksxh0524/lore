export const PRESET_DEFAULTS: Record<string, { name: string; baseUrl: string; type: 'openai' | 'anthropic'; models?: string[] }> = {
  'dashscope': {
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    type: 'openai',
  },
  'dashscope-coding': {
    name: '阿里云百炼 Coding Plan',
    baseUrl: 'https://coding.dashscope.aliyuncs.com/v1',
    type: 'openai',
    models: ['qwen3.5-plus', 'qwen3-coder-plus', 'glm-5', 'glm-4.7', 'kimi-k2.5', 'minimax-m2.5'],
  },
  'zhipu': {
    name: '智谱 AI',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    type: 'openai',
  },
  'zhipu-coding': {
    name: '智谱 AI Coding',
    baseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    type: 'openai',
    models: ['glm-5.1', 'glm-5', 'glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4-airx', 'glm-4-long'],
  },
  'openai': {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai',
  },
  'gemini': {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    type: 'openai',
  },
  'claude': {
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    type: 'anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
  },
};