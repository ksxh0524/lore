# LLM Provider 架构

> 最后更新：2026-04-08 | 版本 v0.02

---

## 分层架构

```
LLM 调用层
├── Vercel AI SDK（统一接口）
│   ├── streamText / generateText / embed
│   ├── 内置 Provider: OpenAI, Anthropic, Google
│   └── 自定义 Provider: createOpenAI() 改 baseURL
│
├── OpenAI 兼容层（国内厂商）
│   ├── 只改 baseURL + apiKey + model
│   └── 覆盖 DeepSeek、Kimi、千问、豆包、智谱等
│
├── 原生 SDK 适配层
│   ├── Anthropic Claude → @anthropic-ai/sdk
│   └── Google Gemini → @google/generative-ai
│
└── 多模态
    ├── 图片生成 → DALL-E / Stable Diffusion / Midjourney API
    └── TTS / 视频生成（远期）
```

## LLMProvider 统一接口

```typescript
// packages/server/src/llm/llm-provider.ts

export interface ILLMProvider {
  readonly name: string;
  generateText(request: LLMCallRequest): Promise<LLMCallResult>;
  streamText(request: LLMCallRequest): AsyncIterable<string>;
  embed(text: string): Promise<number[]>;
  isModelSupported(model: string): boolean;
}
```

## OpenAI 兼容实现

```typescript
// packages/server/src/llm/openai-compatible.ts

import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

export class OpenAICompatibleProvider implements ILLMProvider {
  private client;
  readonly name: string;

  constructor(config: LLMProviderConfig) {
    this.name = config.name;
    this.client = createOpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
    });
  }

  async generateText(request: LLMCallRequest): Promise<LLMCallResult> {
    const start = Date.now();
    const result = await generateText({
      model: this.client(request.model),
      messages: request.messages,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
    });
    return {
      content: result.text,
      usage: {
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
      },
      model: request.model,
      latencyMs: Date.now() - start,
    };
  }

  async *streamText(request: LLMCallRequest): AsyncIterable<string> {
    const stream = await streamText({
      model: this.client(request.model),
      messages: request.messages,
      maxTokens: request.maxTokens,
    });
    for await (const chunk of stream.textStream) {
      yield chunk;
    }
  }

  isModelSupported(model: string): boolean {
    return true;
  }
}
```

## 图片生成

Agent 可以调用生图模型生成图片（发自拍、发到平台等）。

```typescript
// packages/server/src/llm/image-provider.ts

export interface IImageProvider {
  readonly name: string;
  generateImage(prompt: string, options?: ImageGenOptions): Promise<ImageResult>;
}

export interface ImageGenOptions {
  size?: '256x256' | '512x512' | '1024x1024';
  style?: string;
}

export interface ImageResult {
  url: string;
  localPath: string;
}
```

支持的图片生成服务：

| 服务 | 说明 | Phase |
|------|------|-------|
| DALL-E | OpenAI 图片生成 | 2 |
| Stable Diffusion | 开源图片生成 | 2 |
| 其他兼容 API | 用户可配置 | 2 |

## ProviderFactory

```typescript
// packages/server/src/llm/factory.ts

export class ProviderFactory {
  private providers: Map<string, ILLMProvider> = new Map();
  private imageProvider?: IImageProvider;

  registerAll(configs: LLMProviderConfig[]): void {
    for (const config of configs) {
      const provider = this.createProvider(config);
      for (const model of config.models) {
        this.providers.set(model, provider);
      }
    }
  }

  getProvider(model: string): ILLMProvider {
    const provider = this.providers.get(model);
    if (!provider) throw new Error(`No provider for model: ${model}`);
    return provider;
  }

  getImageProvider(): IImageProvider | undefined {
    return this.imageProvider;
  }

  private createProvider(config: LLMProviderConfig): ILLMProvider {
    switch (config.type) {
      case 'openai-compatible':
        return new OpenAICompatibleProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      case 'google':
        return new GoogleProvider(config);
    }
  }
}
```

## 国内厂商兼容性

| 厂商 | Base URL | 兼容程度 |
|------|----------|---------|
| DeepSeek | `api.deepseek.com/v1` | 100% |
| Kimi（月之暗面） | `api.moonshot.cn/v1` | 100% |
| 阿里百炼（千问） | `dashscope.aliyuncs.com/compatible-mode/v1` | 高 |
| 火山方舟（豆包） | `ark.cn-beijing.volces.com/api/v3` | 高 |
| 智谱 GLM | `open.bigmodel.cn/api/paas/v4` | 高 |
| MiniMax | `api.minimax.chat/v1` | 部分 |

---

> 相关文档：[LLM 调度器](./scheduler.md) | [技术决策](../TECH-DECISIONS.md)
