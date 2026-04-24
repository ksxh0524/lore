import type { IImageProvider, ImageGenerationRequest, ImageGenerationResult } from './types.js';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('image-provider');

export class OpenAIImageProvider implements IImageProvider {
  readonly name: string;
  private client: OpenAI;
  private supportedModels: Set<string>;

  constructor(config: { name: string; baseUrl?: string; apiKey: string; models: string[] }) {
    this.name = config.name;
    this.supportedModels = new Set(config.models);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.has(model);
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const start = Date.now();

    const params: OpenAI.Images.ImageGenerateParams = {
      prompt: request.prompt,
      model: request.model,
      size: request.size ?? '1024x1024',
      quality: request.quality ?? 'standard',
      n: request.n ?? 1,
      response_format: 'url',
    };

    if (request.style) {
      (params as any).style = request.style;
    }

    const response = await this.client.images.generate(params);

    const images = response.data?.map(img => ({
      url: img.url,
      revisedPrompt: img.revised_prompt,
    })) ?? [];

    logger.info({ model: request.model, latencyMs: Date.now() - start }, 'Image generated');

    return {
      images,
      model: request.model,
      latencyMs: Date.now() - start,
    };
  }
}

export class MockImageProvider implements IImageProvider {
  readonly name = 'mock-image';

  isModelSupported(_model: string): boolean {
    return true;
  }

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const start = Date.now();
    
    await new Promise(resolve => setTimeout(resolve, 100));

    const mockImageUrl = `https://picsum.photos/seed/${Buffer.from(request.prompt).toString('base64').slice(0, 10)}/1024/1024`;

    return {
      images: [{ url: mockImageUrl, revisedPrompt: request.prompt }],
      model: request.model,
      latencyMs: Date.now() - start,
    };
  }
}