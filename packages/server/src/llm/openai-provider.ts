import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';
import type { ChatMessage, MessageContent, ToolCall } from '@lore/shared';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('openai-provider');

function contentToOpenAI(content: string | MessageContent[]): OpenAI.ChatCompletionContentPart[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  return content.map((part): OpenAI.ChatCompletionContentPart => {
    switch (part.type) {
      case 'text':
        return { type: 'text', text: part.text };
      case 'image':
        if (part.source === 'url') {
          return { type: 'image_url', image_url: { url: part.data } };
        }
        return {
          type: 'image_url',
          image_url: { url: `data:${part.mediaType ?? 'image/png'};base64,${part.data}` },
        };
      case 'audio':
        logger.warn('OpenAI API does not support audio content in chat, skipping');
        return { type: 'text', text: `[audio content: ${part.mediaType}]` };
      case 'video':
        logger.warn('OpenAI API does not support video content in chat, skipping');
        return { type: 'text', text: `[video content: ${part.mediaType}]` };
      case 'file':
        logger.warn('OpenAI API does not support file content in chat, skipping');
        return { type: 'text', text: `[file: ${part.filename ?? 'unknown'}]` };
      default:
        return { type: 'text', text: '' };
    }
  });
}

function messageToOpenAI(msg: ChatMessage): OpenAI.ChatCompletionMessageParam {
  const content = contentToOpenAI(msg.content);

  switch (msg.role) {
    case 'system':
      return { role: 'system', content: typeof msg.content === 'string' ? msg.content : msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map(c => c.text).join('\n') };
    case 'user':
      return { role: 'user', content, name: msg.name };
    case 'assistant':
      return { role: 'assistant', content: typeof msg.content === 'string' ? msg.content : msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map(c => c.text).join('\n'), name: msg.name };
    case 'tool':
      return { role: 'tool', content: typeof msg.content === 'string' ? msg.content : '', tool_call_id: msg.toolCallId ?? '' };
    default:
      return { role: 'user', content };
  }
}

export class OpenAICompatibleProvider implements ILLMProvider {
  readonly id: string;
  readonly name: string;
  readonly type: ProviderType;
  private client: OpenAI;
  private supportedModels: Set<string>;
  private embeddingModel: string;

  constructor(config: { id: string; name: string; type: ProviderType; baseUrl?: string; apiKey: string; models: string[]; embeddingModel?: string }) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
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

  getSupportedModels(): string[] {
    return Array.from(this.supportedModels);
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: request.model,
      messages: request.messages.map(messageToOpenAI),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      stop: request.stopSequences,
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
    const toolCalls: ToolCall[] | undefined = choice?.message?.tool_calls
      ?.filter((tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function')
      .map((tc: OpenAI.ChatCompletionMessageFunctionToolCall) => {
        let args = {};
        try {
          args = JSON.parse(tc.function?.arguments || '{}');
        } catch {
          logger.warn({ args: tc.function?.arguments }, 'Invalid tool arguments JSON');
        }
        return {
          id: tc.id,
          name: tc.function?.name ?? '',
          args,
        };
      });

    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;

    return {
      id: response.id,
      content: choice?.message?.content || '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: response.usage?.total_tokens ?? promptTokens + completionTokens,
      },
      model: response.model,
      latencyMs: Date.now() - start,
      finishReason: this.mapFinishReason(choice?.finish_reason),
    };
  }

  async *streamText(request: LLMRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages.map(messageToOpenAI),
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const input = Array.isArray(request.input) ? request.input : [request.input];

    const response = await this.client.embeddings.create({
      model: request.model,
      input,
    });

    const promptTokens = response.usage?.prompt_tokens ?? 0;

    return {
      embeddings: response.data.map(d => d.embedding),
      model: response.model,
      usage: {
        promptTokens,
        completionTokens: 0,
        totalTokens: response.usage?.total_tokens ?? promptTokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  private mapFinishReason(reason: string | null | undefined): LLMResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
        return 'tool_use';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'stop';
    }
  }
}