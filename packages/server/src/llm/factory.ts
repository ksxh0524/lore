import type { ILLMProvider } from './types.js';
import { MockLLMProvider } from './mock-provider.js';
import { OpenAICompatibleProvider } from './openai-provider.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('provider-factory');

export class ProviderFactory {
  private providers = new Map<string, ILLMProvider>();
  private defaultProvider: ILLMProvider;

  constructor(config: LoreConfig) {
    this.defaultProvider = new MockLLMProvider();
    
    for (const pc of config.llm.providers) {
      if (!pc.apiKey) {
        logger.warn({ provider: pc.name }, 'Provider has no API key, skipping');
        continue;
      }
      
      const provider = new OpenAICompatibleProvider({
        name: pc.name,
        baseUrl: pc.baseUrl,
        apiKey: pc.apiKey,
        models: pc.models,
        embeddingModel: pc.embeddingModel,
      });
      
      for (const model of pc.models) {
        this.providers.set(model, provider);
      }
    }
  }

  getProvider(model: string): ILLMProvider {
    return this.providers.get(model) ?? this.defaultProvider;
  }
}
