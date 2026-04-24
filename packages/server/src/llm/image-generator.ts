import type { ImageGenerationRequest, ImageGenerationResult, IImageProvider } from './types.js';
import { ProviderFactory } from './factory.js';
import type { LoreConfig } from '../config/loader.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('image-generator');

const DEFAULT_IMAGE_MODEL = 'dall-e-3';

export class ImageGenerator {
  private factory: ProviderFactory;
  private defaultModel: string;

  constructor(config: LoreConfig, factory: ProviderFactory) {
    this.factory = factory;
    this.defaultModel = DEFAULT_IMAGE_MODEL;
  }

  getImageProvider(model: string): IImageProvider {
    return this.factory.getImageProvider(model);
  }

  async generateSelfie(
    agentProfile: { name: string; age: number; occupation: string; traits: string[] },
    context?: string,
  ): Promise<ImageGenerationResult> {
    const traitsDesc = agentProfile.traits.slice(0, 3).join(', ');
    const prompt = context
      ? `Portrait photo of ${agentProfile.name}, a ${agentProfile.age} year old ${agentProfile.occupation} with ${traitsDesc} personality traits. Context: ${context}. Natural lighting, realistic style, looking at camera, warm expression.`
      : `Portrait photo of ${agentProfile.name}, a ${agentProfile.age} year old ${agentProfile.occupation} with ${traitsDesc} personality traits. Natural lighting, realistic style, looking at camera, warm expression.`;

    return this.generate({
      prompt,
      model: this.defaultModel,
      size: '1024x1024',
      quality: 'standard',
      style: 'natural',
    });
  }

  async generateScene(
    description: string,
    style?: 'vivid' | 'natural',
  ): Promise<ImageGenerationResult> {
    return this.generate({
      prompt: description,
      model: this.defaultModel,
      size: '1024x1024',
      quality: 'standard',
      style: style ?? 'natural',
    });
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const model = request.model ?? this.defaultModel;
    const provider = this.getImageProvider(model);

    logger.info({ model, promptLength: request.prompt.length }, 'Generating image');

    try {
      const result = await provider.generateImage({
        ...request,
        model,
      });

      logger.info({ model, latencyMs: result.latencyMs, imageCount: result.images.length }, 'Image generated');

      return result;
    } catch (error) {
      logger.error({ model, error }, 'Image generation failed');
      throw error;
    }
  }
}