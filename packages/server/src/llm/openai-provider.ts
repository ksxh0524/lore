import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('openai-provider');

export class OpenAICompatibleProvider implements ILLMProvider {
  readonly name: string;
  private client: OpenAI;
  private supportedModels: Set<string>;
  private embeddingModel: string;

  constructor(config: { name: string; baseUrl?: string; apiKey: string; models: string[]; embeddingModel?: string }) {
    this.name = config.name;
    this.supportedModels = new Set(config.models);
    this.embeddingModel = config.embeddingModel ?? 'text-embedding-3-small';
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
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
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return response.data[0]?.embedding ?? [];
  }
}
