import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { Repository } from '../db/repository.js';
import { getAllPresets, getPresetById } from '../llm/presets.js';
import { maskApiKey } from '../utils/encryption.js';
import { ErrorCode, LoreError } from '../errors.js';

export function registerProviderRoutes(app: FastifyInstance, repo: Repository) {
  const createProviderSchema = z.object({
    presetId: z.string().min(1),
    name: z.string().min(1),
    apiKey: z.string().min(1),
    baseUrl: z.string().optional(),
    enabled: z.boolean().default(true),
    priority: z.number().int().min(0).max(100).default(50),
    models: z.array(z.string()).min(1),
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

  const maskProviderApiKey = (provider: any) => ({
    ...provider,
    apiKey: maskApiKey(provider.apiKey),
  });

  app.get('/api/providers', async () => {
    const providers = await repo.getAllUserProviders();
    return { data: providers.map(maskProviderApiKey) };
  });

  app.post('/api/providers', async (req, reply) => {
    const body = createProviderSchema.parse(req.body);

    const preset = getPresetById(body.presetId);
    if (!preset) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid preset ID' },
      });
    }

    const defaultModel = body.defaultModel || body.models[0];

    const provider = await repo.createUserProvider({
      id: nanoid(),
      presetId: body.presetId,
      name: body.name,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl || preset.baseUrl,
      enabled: body.enabled,
      priority: body.priority,
      models: body.models,
      defaultModel,
    });

    return { data: maskProviderApiKey(provider) };
  });

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

  app.put('/api/providers/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = updateProviderSchema.parse(req.body);

    const existing = await repo.getUserProvider(id);
    if (!existing) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Provider not found' },
      });
    }

    if (body.defaultModel && body.models && !body.models.includes(body.defaultModel)) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Default model must be in enabled models' },
      });
    }

    const provider = await repo.updateUserProvider(id, body);
    return { data: provider ? maskProviderApiKey(provider) : null };
  });

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
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'Invalid preset' },
      });
    }

    try {
      const model = provider.defaultModel || provider.models?.[0];
      if (!model) {
        return reply.status(400).send({
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'No model configured' },
        });
      }

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
          message: `连接成功 (${result.latencyMs}ms)`,
          latencyMs: result.latencyMs,
        },
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error instanceof Error ? error.message : '连接失败',
        },
      };
    }
  });

  app.get('/api/provider-presets', async () => {
    return { data: getAllPresets() };
  });

  app.post('/api/provider-presets/:id/fetch-models', async (req, reply) => {
    const { id } = req.params as { id: string };
    const { apiKey } = req.body as { apiKey?: string };

    const preset = getPresetById(id);
    if (!preset) {
      return reply.status(404).send({
        error: { code: ErrorCode.NOT_FOUND, message: 'Preset not found' },
      });
    }

    if (!apiKey) {
      return reply.status(400).send({
        error: { code: ErrorCode.VALIDATION_ERROR, message: 'API Key required' },
      });
    }

    try {
      const response = await fetch(`${preset.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        return reply.status(400).send({
          error: { code: ErrorCode.VALIDATION_ERROR, message: 'Failed to fetch models' },
        });
      }

      const data = await response.json() as { data?: Array<{ id: string }> };
      const models = data.data?.map((m) => m.id) || [];

      return { data: { models } };
    } catch (error) {
      return reply.status(400).send({
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: error instanceof Error ? error.message : 'Failed to fetch models',
        },
      });
    }
  });
}