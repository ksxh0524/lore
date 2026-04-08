import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';
import OpenAI from 'openai';

export class OpenAICompatibleProvider implements ILLMProvider {
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

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages as OpenAI.ChatCompletionMessageParam[],
      max_tokens: request.maxTokens,
    });

    const choice = response.choices[0];
    return {
      content: choice?.message?.content || '',
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
}
