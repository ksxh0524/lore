# 记忆系统 (MemoryManager)

借鉴 Letta（原 MemGPT）的三层记忆架构。

## 三层架构

| 层级 | 说明 | 存储 | 容量 |
|------|------|------|------|
| 工作记忆 | 当前上下文 | 内存 | 最近 20 条 |
| 近期记忆 | 最近 7 天事件 | SQLite | 7 天内 |
| 长期记忆 | 重要事件/关系 | SQLite + vec0 | 无限 |

## 构造函数

```typescript
constructor(
  agentId: string,
  repo: Repository,
  llmScheduler: LLMScheduler,  // 用于生成 embedding
  config: LoreConfig,
)
```

## add() 添加记忆

```typescript
async add(content: string, type: MemoryContentType, importance: number): void {
  // 1. 工作记忆（内存，最多20条）
  this.workingMemory.push(content);
  if (this.workingMemory.length > 20) shift();

  // 2. 近期记忆（SQLite，7天过期）
  await repo.insertMemory({ type: 'recent', expiresAt: 7天 });

  // 3. 长期记忆（importance >= 0.7，生成 embedding）
  if (importance >= 0.7) {
    const embedding = await this.generateEmbedding(content);
    await storeEmbedding(memoryId, embedding); // vec0
  }
}
```

## getContext() 加载策略

按 token 预算加载：

```typescript
async getContext(maxTokens: number): MemoryContext {
  // 优先级：working → recent → longTerm（语义检索）
  let tokensUsed = 0;
  
  // 1. 工作记忆（全部）
  for (entry of workingMemory) { ... }
  
  // 2. 近期记忆（按时间排序）
  for (entry of await getRecent(50)) { ... }
  
  // 3. 长期记忆（语义检索 Top-K）
  if (tokensUsed < maxTokens * 0.3) {
    const relevant = await searchSimilar(embedding, 10);
    ...
  }
}
```

## 向量检索

```typescript
// packages/server/src/db/vector.ts

export async function searchSimilar(id: string, embedding: number[], limit: number): Promise<MemoryMatch[]>;
export async function storeEmbedding(id: string, embedding: number[]): Promise<void>;
```

使用 SQLite vec0 扩展进行向量检索。