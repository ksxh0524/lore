import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Repository } from '../db/repository.js';
import { PROVIDER_PRESETS, getAllPresets, getPresetById } from '../llm/presets.js';
import { maskApiKey } from '../utils/encryption.js';
import { ErrorCode, LoreError } from '../errors.js';

export function registerProviderRoutes(app: FastifyInstance, repo: Repository) {
  // Validation schemas
  const createProviderSchema = z.object({
    presetId: z.string().min(1),
    name: z.string().min(1),
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).max(100).default(50),
    models: z.array(z.string()).default([]),
    defaultModel: z.string().optional(),
  });

  const updateProviderSchema = z.object({
    name: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
    baseUrl: z.string().optional(),
    enabled: z.boolean().optional(),
    priority: z.number().int().min(0).max(100).optional(),
    models: z.array(z.string()).optional(),
    defaultModel: z.string().optional(),
  });

  // Helper function to mask API key for response
  const maskProviderApiKey = (provider: any) => ({
    ...provider,
    apiKey: maskApiKey(provider.apiKey),
  });

  // GET /api/providers - Get all user configured providers (masked API keys)
  app.get('/api/providers', async () => {
    const providers = await repo.getAllUserProviders();
    return { data: providers.map(maskProviderApiKey) };
  });

  // POST /api/providers - Create new provider
  app.post('/api/providers', async (req, reply) => {
    const body = createProviderSchema.parse(req.body);

    // Validate preset exists
    const preset = getPresetById(body.presetId);
    if (!preset) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid preset ID' },
      });
    }

    // Validate that at least one model is selected
    if (!body.models || body.models.length === 0) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'At least one model must be selected' },
      });
    }

    // Validate all selected models are from the preset
    const invalidModels = body.models.filter(m => !preset.defaultModels.includes(m));
    if (invalidModels.length > 0) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: `Invalid models: ${invalidModels.join(', ')}` },
      });
    }

    // Set default model if not provided
    const defaultModel = body.defaultModel || body.models[0];

    const provider = await repo.createUserProvider({
      id: nanoid(),
      presetId: body.presetId,
      name: body.name,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      enabled: body.enabled,
      priority: body.priority,
      models: body.models,
      defaultModel,
    });

    return { data: maskProviderApiKey(provider) };
  });

  // GET /api/providers/:id - Get single provider
  app.get('/api/providers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const provider = await repo.getUserProvider(id);
    if (!provider) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Provider not found' },
      });
    }
    return { data: maskProviderApiKey(provider) };
  });

  // PUT /api/providers/:id - Update provider
  app.put('/api/providers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateProviderSchema.parse(req.body);

    const existing = await repo.getUserProvider(id);
    if (!existing) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Provider not found' },
      });
    }

    // Validate models if provided
    if (body.models !== undefined) {
      const preset = getPresetById(existing.presetId);
      if (preset) {
        const invalidModels = body.models.filter(m => !preset.defaultModels.includes(m));
        if (invalidModels.length > 0) {
          return reply.status(400).send({
            error: { code: ErrorCode.VALIDATION_ERROR, message: `Invalid models: ${invalidModels.join(', ')}` },
          });
        }
      }
    }

    // Validate default model if provided
    if (body.defaultModel && body.models) {
      if (!body.models.includes(body.defaultModel)) {
        return reply.status(400).send({
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Default model must be in the enabled models list' },
        });
      }
    }

    const provider = await repo.updateUserProvider(id, body);
    return { data: provider ? maskProviderApiKey(provider) : null };
  });

  // DELETE /api/providers/:id - Delete provider
  app.delete('/api/providers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await repo.getUserProvider(id);
    if (!existing) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Provider not found' },
      });
    }
    await repo.deleteUserProvider(id);
    return { data: { success: true } };
  });

  // POST /api/providers/:id/test - Test provider connection
  app.post('/api/providers/:id/test', async (req, reply) => {
    const { id } = req.params as { id: string };
    const provider = await repo.getUserProvider(id);
    if (!provider) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Provider not found' },
      });
    }

    const preset = getPresetById(provider.presetId);
    if (!preset) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid preset configuration' },
      });
    }

    try {
      // Import the appropriate provider based on preset type
      let testProvider;
      if (preset.type === 'anthropic') {
        const { AnthropicProvider } = await import('../llm/anthropic-provider.js');
        testProvider = new AnthropicProvider({
          name: provider.name,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl || undefined,
          models: provider.models || [],
        });
      } else {
        const { OpenAICompatibleProvider } = await import('../llm/openai-provider.js');
        testProvider = new OpenAICompatibleProvider({
          name: provider.name,
          apiKey: provider.apiKey,
          baseUrl: provider.baseUrl || preset.baseUrl,
          models: provider.models || [],
          embeddingModel: preset.embeddingModel,
        });
      }

      // Test with a simple prompt
      const model = provider.defaultModel || provider.models?.[0] || preset.defaultModels[0];
      if (!model) {
        return reply.status(400).send({
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'No model available for testing' },
        });
      }
      const result = await testProvider.generateText({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });

      return {
        data: {
          success: true,
          model: result.model,
          latencyMs: result.latencyMs,
          usage: result.usage,
        },
      };
    } catch (error) {
      app.log.error(error, 'Provider test failed');
      return reply.status(400).send({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: error instanceof Error ? error.message : 'Connection test failed',
        },
      });
    }
  });

  // GET /api/provider-presets - Get all presets
  app.get('/api/provider-presets', async () => {
    return { data: getAllPresets() };
  });
}
