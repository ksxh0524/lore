import type { ILLMProvider, IImageProvider, ProviderType } from './types.js';
import { MockLLMProvider } from './mock-provider.js';
import { OpenAICompatibleProvider } from './openai-provider.js';
import { AnthropicProvider } from './anthropic-provider.js';
import { DeepSeekProvider } from './deepseek-provider.js';
import { KimiProvider } from './kimi-provider.js';
import { ZhipuProvider } from './zhipu-provider.js';
import { MinimaxProvider } from './minimax-provider.js';
import { GeminiProvider } from './gemini-provider.js';
import { DashscopeProvider } from './dashscope-provider.js';
import { OllamaProvider } from './ollama-provider.js';
import { OpenAIImageProvider, MockImageProvider } from './image-provider.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('provider-factory');

interface ProviderConfigEntry {
  name: string;
  type: ProviderType;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  embeddingModel?: string;
  imageModels?: string[];
}

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

      const providerConfig: ProviderConfigEntry = {
        name: pc.name,
        type: pc.type as ProviderType,
        apiKey: pc.apiKey,
        baseUrl: pc.baseUrl,
        models: pc.models,
        embeddingModel: pc.embeddingModel,
        imageModels: pc.imageModels,
      };

      const provider = this.createProvider(providerConfig);

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

  private createProvider(config: ProviderConfigEntry): ILLMProvider {
    const type = config.type || this.detectProviderType(config);
    const id = config.name.toLowerCase();

    switch (type) {
      case 'anthropic':
        return new AnthropicProvider({
          id,
          name: config.name,
          apiKey: config.apiKey ?? '',
          baseUrl: config.baseUrl,
          models: config.models,
        });

      case 'deepseek':
        return new DeepSeekProvider({
          apiKey: config.apiKey ?? '',
          models: config.models,
        });

      case 'moonshot':
      case 'kimi':
        return new KimiProvider({
          apiKey: config.apiKey ?? '',
          models: config.models,
        });

      case 'zhipu':
        return new ZhipuProvider({
          apiKey: config.apiKey ?? '',
          baseUrl: config.baseUrl,
          models: config.models,
        });

      case 'minimax':
        return new MinimaxProvider({
          apiKey: config.apiKey ?? '',
          baseUrl: config.baseUrl,
          models: config.models,
        });

      case 'google':
      case 'gemini':
        return new GeminiProvider({
          apiKey: config.apiKey ?? '',
          models: config.models,
        });

      case 'dashscope':
        return new DashscopeProvider({
          apiKey: config.apiKey ?? '',
          models: config.models,
        });

      case 'ollama':
        return new OllamaProvider({
          baseUrl: config.baseUrl,
          models: config.models,
          embeddingModel: config.embeddingModel,
        });

      case 'mock':
        return new MockLLMProvider();

      default:
        return new OpenAICompatibleProvider({
          id,
          name: config.name,
          type: type || 'openai',
          baseUrl: config.baseUrl,
          apiKey: config.apiKey ?? '',
          models: config.models,
          embeddingModel: config.embeddingModel,
        });
    }
  }

  private detectProviderType(config: ProviderConfigEntry): ProviderType {
    const name = config.name.toLowerCase();
    const baseUrl = config.baseUrl?.toLowerCase() ?? '';

    if (name.includes('deepseek') || baseUrl.includes('deepseek')) return 'deepseek';
    if (name.includes('kimi') || name.includes('moonshot') || baseUrl.includes('moonshot')) return 'moonshot';
    if (name.includes('zhipu') || baseUrl.includes('bigmodel')) return 'zhipu';
    if (name.includes('minimax') || baseUrl.includes('minimax')) return 'minimax';
    if (name.includes('gemini') || name.includes('google') || baseUrl.includes('generativelanguage')) return 'google';
    if (name.includes('dashscope') || name.includes('百炼') || baseUrl.includes('dashscope')) return 'dashscope';
    if (name.includes('claude') || name.includes('anthropic') || baseUrl.includes('anthropic')) return 'anthropic';
    if (name.includes('ollama') || baseUrl.includes('11434')) return 'ollama';
    if (name.includes('mock')) return 'mock';

    return 'openai';
  }

  getProvider(model: string): ILLMProvider {
    return this.providers.get(model) ?? this.defaultProvider;
  }

  getImageProvider(model: string): IImageProvider {
    return this.imageProviders.get(model) ?? this.defaultImageProvider;
  }

  getAllProviders(): Map<string, ILLMProvider> {
    return this.providers;
  }

  getProviderByModel(model: string): ILLMProvider | undefined {
    return this.providers.get(model);
  }

  listModels(): string[] {
    return Array.from(this.providers.keys());
  }
}