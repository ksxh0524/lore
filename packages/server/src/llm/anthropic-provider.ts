import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';
import type { ChatMessage, MessageContent } from '@lore/shared';
import Anthropic from '@anthropic-ai/sdk';
import { LoreError, ErrorCode } from '../errors.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('anthropic-provider');

function contentToAnthropic(content: string | MessageContent[]): Anthropic.ContentBlockParam[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  return content.map((part): Anthropic.ContentBlockParam => {
    switch (part.type) {
      case 'text':
        return { type: 'text', text: part.text };
      case 'image':
        if (part.source === 'base64') {
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (part.mediaType ?? 'image/png') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: part.data,
            },
          };
        }
        return {
          type: 'image',
          source: { type: 'url', url: part.data },
        };
      case 'audio':
        logger.warn('Anthropic API does not support audio content in chat, skipping');
        return { type: 'text', text: `[audio content: ${part.mediaType ?? 'unknown'}]` };
      case 'video':
        logger.warn('Anthropic API does not support video content in chat, skipping');
        return { type: 'text', text: `[video content: ${part.mediaType ?? 'unknown'}]` };
      case 'file':
        logger.warn('Anthropic API does not support file content in chat, skipping');
        return { type: 'text', text: `[file: ${part.filename ?? 'unknown'}]` };
      default:
        return { type: 'text', text: '' };
    }
  });
}

function messageToAnthropic(msg: ChatMessage): Anthropic.MessageParam {
  const content = contentToAnthropic(msg.content);

  switch (msg.role) {
    case 'system':
      return { role: 'user', content };
    case 'user':
      return { role: 'user', content };
    case 'assistant':
      return { role: 'assistant', content };
    case 'tool':
      return { role: 'user', content: [{ type: 'tool_result', tool_use_id: msg.toolCallId ?? '', content: typeof msg.content === 'string' ? msg.content : '' }] };
    default:
      return { role: 'user', content };
  }
}

export class AnthropicProvider implements ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType = 'anthropic';
  private client: Anthropic;
  private supportedModels: Set<string>;

  constructor(config: { id: string; name: string; baseUrl?: string; apiKey: string; models: string[] }) {
    this.id = config.id;
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

  getSupportedModels(): string[] {
    return Array.from(this.supportedModels);
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    const systemMessage = request.messages.find((m: ChatMessage) => m.role === 'system');
    const nonSystemMessages = request.messages.filter((m: ChatMessage) => m.role !== 'system');

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: nonSystemMessages.map(messageToAnthropic),
      system: systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : systemMessage.content.filter((c: MessageContent): c is { type: 'text'; text: string } => c.type === 'text').map((c: { type: 'text'; text: string }) => c.text).join('\n')) : undefined,
    };

    if (request.temperature !== undefined) {
      params.temperature = request.temperature;
    }

    if (request.topP !== undefined) {
      params.top_p = request.topP;
    }

    if (request.stopSequences && request.stopSequences.length > 0) {
      params.stop_sequences = request.stopSequences;
    }

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map((t: { name: string; description: string; parameters: Record<string, unknown> }) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool.InputSchema,
      }));
    }

    const response = await this.client.messages.create(params);

    const content = response.content
      .filter((c: Anthropic.ContentBlock): c is Anthropic.TextBlock => c.type === 'text')
      .map((c: Anthropic.TextBlock) => c.text)
      .join('');

    const toolCalls = response.content
      .filter((c: Anthropic.ContentBlock): c is Anthropic.ToolUseBlock => c.type === 'tool_use')
      .map((tc: Anthropic.ToolUseBlock) => ({
        id: tc.id,
        name: tc.name,
        args: tc.input as Record<string, unknown>,
      }));

    const inputTokens = response.usage?.input_tokens ?? 0;
    const outputTokens = response.usage?.output_tokens ?? 0;

    return {
      id: response.id,
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      model: response.model,
      latencyMs: Date.now() - start,
      finishReason: this.mapFinishReason(response.stop_reason),
    };
  }

  async *streamText(request: LLMRequest): AsyncIterable<string> {
    const systemMessage = request.messages.find((m: ChatMessage) => m.role === 'system');
    const nonSystemMessages = request.messages.filter((m: ChatMessage) => m.role !== 'system');

    const stream = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      messages: nonSystemMessages.map(messageToAnthropic),
      system: systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : systemMessage.content.filter((c: MessageContent): c is { type: 'text'; text: string } => c.type === 'text').map((c: { type: 'text'; text: string }) => c.text).join('\n')) : undefined,
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text;
      }
    }
  }

  async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new LoreError(
      ErrorCode.LLM_API_ERROR,
      'Claude does not support embeddings. Please use OpenAI-compatible provider for embeddings.',
      502
    );
  }

  private mapFinishReason(reason: string | null | undefined): LLMResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_use';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }
}