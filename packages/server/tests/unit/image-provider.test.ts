import { describe, it, expect } from 'vitest';
import { MockImageProvider } from '../../src/llm/image-provider.js';
import type { ImageGenerationRequest } from '../../src/llm/types.js';

describe('Image Providers', () => {
  describe('MockImageProvider', () => {
    const provider = new MockImageProvider();

    it('should support any model', () => {
      expect(provider.isModelSupported('any-model')).toBe(true);
      expect(provider.isModelSupported('dall-e-3')).toBe(true);
    });

    it('should generate mock image', async () => {
      const request: ImageGenerationRequest = {
        prompt: 'A beautiful sunset',
        model: 'mock-model',
        size: '1024x1024',
      };

      const result = await provider.generateImage(request);
      
      expect(result.images.length).toBeGreaterThan(0);
      expect(result.images[0]?.url).toBeDefined();
      expect(result.model).toBe('mock-model');
      expect(result.latencyMs).toBeGreaterThanOrEqual(100);
    });

    it('should generate different URLs for different prompts', async () => {
      const result1 = await provider.generateImage({
        prompt: 'sunset',
        model: 'mock',
      });
      
      const result2 = await provider.generateImage({
        prompt: 'mountain',
        model: 'mock',
      });
      
      expect(result1.images[0]?.url).not.toBe(result2.images[0]?.url);
    });

    it('should handle multiple images', async () => {
      const result = await provider.generateImage({
        prompt: 'test',
        model: 'mock',
        n: 1,
      });
      
      expect(result.images.length).toBe(1);
    });

    it('should include revised prompt', async () => {
      const result = await provider.generateImage({
        prompt: 'original prompt',
        model: 'mock',
      });
      
      expect(result.images[0]?.revisedPrompt).toBe('original prompt');
    });

    it('should have correct provider name', () => {
      expect(provider.name).toBe('mock-image');
    });
  });

  describe('ImageGenerationRequest', () => {
    it('should accept various sizes', async () => {
      const provider = new MockImageProvider();
      
      const sizes = ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'];
      
      for (const size of sizes) {
        const result = await provider.generateImage({
          prompt: 'test',
          model: 'mock',
          size: size as any,
        });
        expect(result.images.length).toBeGreaterThan(0);
      }
    });

    it('should accept quality options', async () => {
      const provider = new MockImageProvider();
      
      const result = await provider.generateImage({
        prompt: 'test',
        model: 'mock',
        quality: 'hd',
      });
      
      expect(result.images.length).toBeGreaterThan(0);
    });

    it('should accept style options', async () => {
      const provider = new MockImageProvider();
      
      const result = await provider.generateImage({
        prompt: 'test',
        model: 'mock',
        style: 'vivid',
      });
      
      expect(result.images.length).toBeGreaterThan(0);
    });
  });
});