import type { ILLMProvider } from './types.js';
import { MockLLMProvider } from './mock-provider.js';
import { OpenAICompatibleProvider } from './openai-provider.js';
import type { LoreConfig } from '../config/loader.js';

export class ProviderFactory {
  private providers = new Map<string, ILLMProvider>();
  private defaultProvider: ILLMProvider;

  constructor(config: LoreConfig) {
    this.defaultProvider = new MockLLMProvider();
    
    for (const pc of config.llm.providers) {
      if (!pc.apiKey) {
        console.warn(`[Lore] Provider ${pc.name} has no API key, skipping`);
        continue;
      }
      
      let provider: ILLMProvider;
      switch (pc.type) {
        case 'openai':
        case 'deepseek':
        case 'kimi':
        case 'anthropic':
        case 'google':
        default:
          provider = new OpenAICompatibleProvider({
            name: pc.name,
            baseUrl: pc.baseUrl,
            apiKey: pc.apiKey,
            models: pc.models,
          });
      }
      
      for (const model of pc.models) {
        this.providers.set(model, provider);
      }
    }
  }

  getProvider(model: string): ILLMProvider {
    return this.providers.get(model) ?? this.defaultProvider;
  }
}
