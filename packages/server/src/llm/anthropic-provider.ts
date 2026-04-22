import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements ILLMProvider {
  readonly name: string;
  private client: Anthropic;
  private supportedModels: Set<string>;

  constructor(config: { name: string; baseUrl?: string; apiKey: string; models: string[] }) {
    this.name = config.name;
    this.supportedModels = new Set(config.models);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.anthropic.com/v1',
    });
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.has(model);
  }

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    const start = Date.now();

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: this.convertMessages(request.messages),
    };

    if (request.temperature !== undefined) {
      (params as any).temperature = request.temperature;
    }

    // Handle tools if provided
    if (request.tools && request.tools.length > 0) {
      (params as any).tools = request.tools.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const response = await this.client.messages.create(params);

    const content = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map(c => c.text)
      .join('');

    const toolCalls = response.content
      .filter((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use')
      .map(tc => ({
        name: tc.name,
        args: tc.input as Record<string, unknown>,
      }));

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
      },
      model: response.model,
      latencyMs: Date.now() - start,
    };
  }

  async *streamText(request: LLMCallRequest): AsyncIterable<string> {
    const stream = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: this.convertMessages(request.messages),
      stream: true,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === 'content_block_delta' &&
        chunk.delta.type === 'text_delta'
      ) {
        yield chunk.delta.text;
      }
    }
  }

  async embed(_text: string): Promise<number[]> {
    // Claude does not have embedding functionality
    throw new Error('Claude does not support embeddings. Please use OpenAI-compatible provider for embeddings.');
  }

  private convertMessages(messages: Array<{ role: string; content: string }>): Anthropic.MessageParam[] {
    return messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));
  }
}
