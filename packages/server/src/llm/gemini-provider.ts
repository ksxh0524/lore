import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';
import type { ChatMessage, MessageContent } from '@lore/shared';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('gemini-provider');

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
        return {
          type: 'image_url',
          image_url: { url: `data:${part.mediaType ?? 'audio/mp3'};base64,${part.data}` },
        };
      case 'video':
        return {
          type: 'image_url',
          image_url: { url: `data:${part.mediaType ?? 'video/mp4'};base64,${part.data}` },
        };
      case 'file':
        return { type: 'text', text: `[file: ${part.filename ?? 'unknown'}]` };
      default:
        return { type: 'text', text: '' };
    }
  });
}

function messageToOpenAI(msg: ChatMessage): OpenAI.ChatCompletionMessageParam {
  switch (msg.role) {
    case 'system':
      return { role: 'system', content: typeof msg.content === 'string' ? msg.content : msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map(c => c.text).join('\n') };
    case 'user':
      return { role: 'user', content: contentToOpenAI(msg.content) };
    case 'assistant':
      return { role: 'assistant', content: typeof msg.content === 'string' ? msg.content : msg.content.filter((c): c is { type: 'text'; text: string } => c.type === 'text').map(c => c.text).join('\n') };
    case 'tool':
      return { role: 'tool', content: typeof msg.content === 'string' ? msg.content : '', tool_call_id: msg.toolCallId ?? '' };
    default:
      return { role: 'user', content: contentToOpenAI(msg.content) };
  }
}

export class GeminiProvider implements ILLMProvider {
  readonly id = 'gemini';
  readonly name = 'gemini';
  readonly type: ProviderType = 'google';
  private client: OpenAI;
  private supportedModels: Set<string>;

  constructor(config: { apiKey: string; models?: string[] }) {
    this.supportedModels = new Set(config.models ?? ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro-preview', 'gemini-1.5-pro', 'gemini-1.5-flash']);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
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
    };

    if (request.tools && request.tools.length > 0) {
      params.tools = request.tools.map((t) => ({
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
    const toolCalls = choice?.message?.tool_calls
      ?.filter((tc): tc is OpenAI.ChatCompletionMessageFunctionToolCall => tc.type === 'function')
      .map((tc: OpenAI.ChatCompletionMessageFunctionToolCall) => {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments || '{}');
        } catch {
          logger.warn({ args: tc.function.arguments }, 'Invalid tool arguments JSON');
        }
        return {
          id: tc.id,
          name: tc.function.name ?? '',
          args,
        };
      });

    const promptTokens = response.usage?.prompt_tokens ?? 0;
    const completionTokens = response.usage?.completion_tokens ?? 0;

    logger.debug({ model: request.model, tokens: response.usage?.total_tokens }, 'Gemini call completed');

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
      finishReason: choice?.finish_reason === 'stop' ? 'stop' : choice?.finish_reason === 'length' ? 'length' : 'stop',
    };
  }

  async *streamText(request: LLMRequest): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages.map(messageToOpenAI),
      stream: true,
      temperature: request.temperature,
      top_p: request.topP,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    try {
      const input = Array.isArray(request.input) ? request.input : [request.input];
      const response = await this.client.embeddings.create({
        model: request.model,
        input,
      });

      const promptTokens = response.usage?.prompt_tokens ?? 0;

      return {
        embeddings: response.data.map((d) => d.embedding),
        model: response.model,
        usage: {
          promptTokens,
          completionTokens: 0,
          totalTokens: response.usage?.total_tokens ?? promptTokens,
        },
        latencyMs: Date.now() - start,
      };
    } catch {
      logger.warn('Gemini embedding not available, returning empty');
      return {
        embeddings: [],
        model: request.model,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - start,
      };
    }
  }
}