import type { ILLMProvider, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse, ProviderType } from './types.js';
import type { ChatMessage } from '@lore/shared';
import { createLogger } from '../logger/index.js';

const logger = createLogger('ollama-provider');

interface OllamaResponse {
  model: string;
  message?: {
    content: string;
    tool_calls?: Array<{
      function: {
        name: string;
        arguments: string;
      };
    }>;
  };
  done: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

function messageToOllama(msg: ChatMessage): { role: string; content: string } {
  const content = typeof msg.content === 'string' 
    ? msg.content 
    : msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
  
  return {
    role: msg.role,
    content,
  };
}

export class OllamaProvider implements ILLMProvider {
  readonly id = 'ollama';
  readonly name = 'ollama';
  readonly type: ProviderType = 'ollama';
  private baseUrl: string;
  private supportedModels: Set<string>;
  private embeddingModel: string;

  constructor(config: { baseUrl?: string; models?: string[]; embeddingModel?: string }) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.supportedModels = new Set(config.models ?? ['llama3', 'llama3.1', 'llama3.2', 'mistral', 'qwen2', 'qwen2.5']);
    this.embeddingModel = config.embeddingModel ?? 'nomic-embed-text';
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.has(model);
  }

  getSupportedModels(): string[] {
    return Array.from(this.supportedModels);
  }

  async generateText(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();

    const body = {
      model: request.model,
      messages: request.messages.map(messageToOllama),
      stream: false,
      options: {
        num_predict: request.maxTokens ?? 1024,
        temperature: request.temperature,
      },
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as OllamaResponse;

    const toolCalls = data.message?.tool_calls?.map(tc => {
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        logger.warn({ args: tc.function.arguments }, 'Invalid tool arguments JSON');
      }
      return {
        name: tc.function.name,
        args,
      };
    });

    const promptTokens = data.prompt_eval_count ?? 0;
    const completionTokens = data.eval_count ?? 0;

    logger.debug({ model: request.model, tokens: promptTokens + completionTokens }, 'Ollama call completed');

    return {
      content: data.message?.content ?? '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: data.model ?? request.model,
      latencyMs: Date.now() - start,
      finishReason: 'stop',
    };
  }

  async *streamText(request: LLMRequest): AsyncIterable<string> {
    const body = {
      model: request.model,
      messages: request.messages.map(messageToOllama),
      stream: true,
    };

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              yield data.message.content;
            }
          } catch {
            continue;
          }
        }
      }
    }
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    const start = Date.now();
    const input = Array.isArray(request.input) ? request.input : [request.input];

    const embeddings: number[][] = [];
    let totalTokens = 0;

    for (const text of input) {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text,
        }),
      });

      if (!response.ok) {
        logger.warn('Ollama embedding failed');
        embeddings.push([]);
        continue;
      }

      const data = await response.json() as { embedding?: number[] };
      embeddings.push(data.embedding ?? []);
      totalTokens += text.length / 4;
    }

    return {
      embeddings,
      model: this.embeddingModel,
      usage: {
        promptTokens: totalTokens,
        completionTokens: 0,
        totalTokens: totalTokens,
      },
      latencyMs: Date.now() - start,
    };
  }
}