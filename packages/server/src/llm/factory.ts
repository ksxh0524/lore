import type { ILLMProvider, IImageProvider } from './types.js';
import { MockLLMProvider } from './mock-provider.js';
import { OpenAICompatibleProvider } from './openai-provider.js';
import { DeepSeekProvider } from './deepseek-provider.js';
import { KimiProvider } from './kimi-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { OpenAIImageProvider, MockImageProvider } from './image-provider.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('provider-factory');

export class ProviderFactory {
  private providers = new Map<string, ILLMProvider>();
  private imageProviders = new Map<string, IImageProvider>();
  private defaultProvider: ILLMProvider;
  private defaultImageProvider: IImageProvider;

  constructor(config: LoreConfig) {
    this.defaultProvider = new MockLLMProvider();
    this.defaultImageProvider = new MockImageProvider();
    
    for (const pc of config.llm.providers) {
      if (!pc.apiKey && pc.type !== 'ollama') {
        logger.warn({ provider: pc.name }, 'Provider has no API key, skipping');
        continue;
      }

      let provider: ILLMProvider;

      if (pc.type === 'deepseek' || pc.name.toLowerCase().includes('deepseek')) {
        provider = new DeepSeekProvider({
          apiKey: pc.apiKey ?? '',
          models: pc.models,
          embeddingModel: pc.embeddingModel,
        });
      } else if (pc.type === 'kimi' || pc.name.toLowerCase().includes('kimi') || pc.name.toLowerCase().includes('moonshot')) {
        provider = new KimiProvider({
          apiKey: pc.apiKey ?? '',
          models: pc.models,
          embeddingModel: pc.embeddingModel,
        });
      } else if (pc.type === 'ollama' || pc.name.toLowerCase().includes('ollama') || pc.baseUrl?.includes('11434')) {
        provider = new OllamaProvider({
          baseUrl: pc.baseUrl,
          models: pc.models,
          embeddingModel: pc.embeddingModel,
        });
      } else {
        provider = new OpenAICompatibleProvider({
          name: pc.name,
          baseUrl: pc.baseUrl,
          apiKey: pc.apiKey ?? '',
          models: pc.models,
          embeddingModel: pc.embeddingModel,
        });
      }
      
      for (const model of pc.models) {
        this.providers.set(model, provider);
      }

      if (pc.imageModels && pc.imageModels.length > 0) {
        const imageProvider = new OpenAIImageProvider({
          name: pc.name,
          baseUrl: pc.baseUrl,
          apiKey: pc.apiKey ?? '',
          models: pc.imageModels,
        });
        
        for (const model of pc.imageModels) {
          this.imageProviders.set(model, imageProvider);
        }
      }
    }
  }

  getProvider(model: string): ILLMProvider {
    return this.providers.get(model) ?? this.defaultProvider;
  }

  getImageProvider(model: string): IImageProvider {
    return this.imageProviders.get(model) ?? this.defaultImageProvider;
  }
}
