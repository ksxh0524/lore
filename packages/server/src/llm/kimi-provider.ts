import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('kimi-provider');

export class KimiProvider implements ILLMProvider {
  readonly name = 'kimi';
  private client: OpenAI;
  private supportedModels: Set<string>;
  private embeddingModel: string;

  constructor(config: { apiKey: string; models?: string[]; embeddingModel?: string }) {
    this.supportedModels = new Set(config.models ?? ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']);
    this.embeddingModel = config.embeddingModel ?? 'moonshot-embedding';
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://api.moonshot.cn/v1',
    });
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.has(model);
  }

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    const start = Date.now();

    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: request.model,
      messages: request.messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: request.maxTokens,
      temperature: request.temperature ?? 0.7,
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters as OpenAI.FunctionDefinition['parameters'],
        },
      }));
    }

    const response = await this.client.chat.completions.create(params);

    const choice = response.choices[0];
    const toolCalls = choice?.message?.tool_calls?.map((tc: any) => {
      let args = {};
      try {
        args = JSON.parse(tc.function?.arguments || '{}');
      } catch {
        logger.warn({ args: tc.function?.arguments }, 'Invalid tool arguments JSON');
      }
      return {
        name: tc.function?.name ?? '',
        args,
      };
    });

    logger.debug({ model: request.model, tokens: response.usage?.total_tokens }, 'Kimi call completed');

    return {
      content: choice?.message?.content || '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async *streamText(request: LLMCallRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as OpenAI.ChatCompletionMessageParam[],
      stream: true,
      temperature: request.temperature ?? 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0]?.embedding ?? [];
    } catch {
      logger.warn('Kimi embedding not available, returning empty');
      return [];
    }
  }
}