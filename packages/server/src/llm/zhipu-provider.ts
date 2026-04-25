import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';
import type { ChatMessage, MessageContent } from '@lore/shared';
import OpenAI from 'openai';
import { createLogger } from '../logger/index.js';

const logger = createLogger('zhipu-provider');

function contentToOpenAI(content: string | MessageContent[]): OpenAI.ChatCompletionContentPart[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }
  return content
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => ({ type: 'text', text: part.text }));
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

export class ZhipuProvider implements ILLMProvider {
  readonly id = 'zhipu';
  readonly name = 'zhipu';
  readonly type: ProviderType = 'zhipu';
  private client: OpenAI;
  private supportedModels: Set<string>;

  constructor(config: { apiKey: string; baseUrl?: string; models?: string[] }) {
    this.supportedModels = new Set(config.models ?? ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4-airx', 'glm-4-long', 'glm-5', 'glm-5.1']);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4',
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

    logger.debug({ model: request.model, tokens: response.usage?.total_tokens }, 'Zhipu call completed');

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
      logger.warn('Zhipu embedding not available, returning empty');
      return {
        embeddings: [],
        model: request.model,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: Date.now() - start,
      };
    }
  }
}