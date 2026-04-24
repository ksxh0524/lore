# LLM Provider 架构

## 分层架构

```
LLM 调用层
├── 原生 SDK（底层）
│   ├── OpenAI SDK → openai 包
│   └── Anthropic SDK → @anthropic-ai/sdk
│
├── Provider 统一接口（中间层）
│   ├── OpenAICompatibleProvider（支持 OpenAI + 国内厂商）
│   └── AnthropicProvider（Claude 系列）
│
└── LLMScheduler（上层）
│   ├── 优先级队列、并发控制
│   └── 熔断器、重试机制
```

## ILLMProvider 统一接口

```typescript
// packages/server/src/llm/types.ts

export interface ILLMProvider {
  readonly name: string;
  generateText(request: LLMCallRequest): Promise<LLMCallResult>;
  streamText(request: LLMCallRequest): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  isModelSupported(model: string): boolean;
}
```

## OpenAI Compatible Provider

支持 OpenAI 及国内厂商（DeepSeek、Kimi、千问、豆包等）。

```typescript
// packages/server/src/llm/openai-provider.ts

import OpenAI from 'openai';

export class OpenAICompatibleProvider implements ILLMProvider {
  constructor(config: { name: string; baseUrl?: string; apiKey: string; models: string[] }) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
  }

  async generateText(request) {
    const response = await this.client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      tools: request.tools, // 支持 function calling
    });
    return { content, toolCalls, usage };
  }

  async *streamText(request) {
    const stream = await this.client.chat.completions.create({ stream: true });
    for await (const chunk of stream) yield chunk.content;
  }

  async embed(text) {
    return this.client.embeddings.create({ model, input: text });
  }
}
```

## Anthropic Provider

```typescript
// packages/server/src/llm/anthropic-provider.ts

import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider implements ILLMProvider {
  async generateText(request) {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens,
      messages: this.convertMessages(request.messages),
      tools: request.tools,
    });
    return { content, toolCalls, usage };
  }

  async embed() {
    throw new LoreError('Claude does not support embeddings');
  }
}
```

## 国内厂商兼容性

| 厂商 | Base URL | 兼容程度 |
|------|----------|---------|
| DeepSeek | `api.deepseek.com/v1` | 100% |
| Kimi | `api.moonshot.cn/v1` | 100% |
| 阿里百炼 | `dashscope.aliyuncs.com/compatible-mode/v1` | 高 |
| 火山方舟 | `ark.cn-beijing.volces.com/api/v3` | 高 |
| 智谱 GLM | `open.bigmodel.cn/api/paas/v4` | 高 |