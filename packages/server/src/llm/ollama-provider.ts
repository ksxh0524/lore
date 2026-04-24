import type { ILLMProvider, LLMCallRequest, LLMCallResult } from './types.js';
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

export class OllamaProvider implements ILLMProvider {
  readonly name = 'ollama';
  private baseUrl: string;
  private supportedModels: Set<string>;
  private embeddingModel: string;

  constructor(config: { baseUrl?: string; models?: string[]; embeddingModel?: string }) {
    this.baseUrl = config.baseUrl ?? 'http://localhost:11434';
    this.supportedModels = new Set(config.models ?? ['llama3', 'llama3.1', 'llama3.2', 'mistral', 'qwen2']);
    this.embeddingModel = config.embeddingModel ?? 'nomic-embed-text';
  }

  isModelSupported(model: string): boolean {
    return this.supportedModels.has(model);
  }

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    const start = Date.now();

    const body = {
      model: request.model,
      messages: request.messages,
      stream: false,
      options: {
        num_predict: request.maxTokens ?? 1024,
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

    logger.debug({ model: request.model, tokens: (data.prompt_eval_count ?? 0) + (data.eval_count ?? 0) }, 'Ollama call completed');

    return {
      content: data.message?.content ?? '',
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
      },
      model: data.model ?? request.model,
      latencyMs: Date.now() - start,
    };
  }

  async *streamText(request: LLMCallRequest): AsyncIterable<string> {
    const body = {
      model: request.model,
      messages: request.messages,
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

  async embed(text: string): Promise<number[]> {
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
      return [];
    }

    const data = await response.json() as { embedding?: number[] };
    return data.embedding ?? [];
  }
}