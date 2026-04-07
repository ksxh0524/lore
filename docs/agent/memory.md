# 记忆系统 (MemoryManager)

> 最后更新：2026-04-08 | 版本 v0.01

---

借鉴 Letta（原 MemGPT）的三层记忆架构。

## 三层架构

| 层级 | 说明 | 存储 | 容量 | 加载方式 |
|------|------|------|------|----------|
| 工作记忆 | 当前对话/事件上下文 | 内存 | 最近 20 条 | 始终加载 |
| 近期记忆 | 最近 7 天的事件摘要 | SQLite | 7 天内所有 | 每次交互加载 |
| 长期记忆 | 重要事件、关系、偏好 | SQLite + vec0 | 无限制 | 语义检索 Top-K |

## 记忆类型

```typescript
export type MemoryType = 'working' | 'recent' | 'long-term';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];        // vec0 向量（仅 long-term）
  importance: number;          // 0-1，决定是否存入长期记忆
  memoryType: 'chat' | 'event' | 'decision' | 'relationship';
  timestamp: Date;
  expiresAt?: Date;            // 仅 recent 记忆有过期时间
}
```

## MemoryManager 接口

```typescript
// packages/server/src/agent/memory.ts

export class MemoryManager {
  private agentId: string;
  private workingMemory: string[] = [];  // 内存中，最近 20 条
  private db: Repository;

  constructor(agentId: string, db: Repository) {
    this.agentId = agentId;
    this.db = db;
  }

  /** 添加记忆 */
  async add(content: string, type: 'chat' | 'event' | 'decision', importance: number): Promise<void> {
    // 1. 写入工作记忆
    this.workingMemory.push(content);
    if (this.workingMemory.length > 20) this.workingMemory.shift();

    // 2. 写入近期记忆（SQLite，7 天过期）
    await this.db.insertMemory({
      agentId: this.agentId,
      type: 'recent',
      content,
      importance,
      memoryType: type,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 3. 重要记忆写入长期记忆（生成 embedding）
    if (importance >= 0.7) {
      const embedding = await this.generateEmbedding(content);
      await this.db.insertMemory({
        agentId: this.agentId,
        type: 'long-term',
        content,
        embedding,
        importance,
        memoryType: type,
        timestamp: new Date(),
      });
    }
  }

  /** 获取上下文（给 LLM 用） */
  getContext(maxTokens: number): MemoryContext {
    let tokensUsed = 0;
    const result: MemoryContext = {
      working: [],
      recent: [],
      longTerm: [],
    };

    // 1. 工作记忆（最高优先级，始终加载）
    for (const entry of this.workingMemory) {
      const tokens = estimateTokens(entry);
      if (tokensUsed + tokens > maxTokens) break;
      result.working.push(entry);
      tokensUsed += tokens;
    }

    // 2. 近期记忆（按时间倒序，填满剩余预算）
    // 3. 长期记忆（如果有剩余预算）
    return result;
  }

  /** 语义检索长期记忆 */
  async search(query: string, topK: number = 5): Promise<MemoryEntry[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    return this.db.vectorSearch(this.agentId, queryEmbedding, topK);
  }

  /** 清理过期近期记忆 */
  async cleanup(): Promise<void> {
    await this.db.deleteExpiredMemories(this.agentId);
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // 调 embedModel 生成向量
    return [];
  }
}
```

## 记忆加载策略

每次 Agent 需要做决策时，从三层记忆中加载上下文。token 预算分配：

```
总预算 = 4096 tokens（可配置）

分配策略：
├── 系统提示词（人格 + 当前状态）  ~500 tokens
├── 工作记忆（最近 20 条）         ~1000 tokens
├── 近期记忆（7 天内相关事件）      ~1500 tokens
├── 长期记忆（语义检索 Top-5）      ~1000 tokens
└── 当前场景/事件                  ~剩余 tokens
```

**加载优先级**（预算不够时按此顺序裁剪）：

1. 当前场景/事件（必须保留）
2. 工作记忆（最新上下文）
3. 近期记忆（按相关度排序）
4. 长期记忆（语义匹配度）

## 记忆重要性判断

```typescript
function calculateImportance(entry: {
  type: 'chat' | 'event' | 'decision';
  involvesUser: boolean;
  emotionalImpact: number;  // 0-1
  relationshipChange: boolean;
}): number {
  let importance = 0.3; // 基础值

  // 涉及用户 -> 更重要
  if (entry.involvesUser) importance += 0.2;

  // 感情冲击大的事件 -> 更重要
  importance += entry.emotionalImpact * 0.3;

  // 关系变化 -> 更重要
  if (entry.relationshipChange) importance += 0.2;

  return Math.min(importance, 1.0);
}
```

**示例**：
- 日常聊天 "吃了吗" → importance = 0.2 → 只存近期记忆
- 分手事件 → importance = 0.9 → 存入长期记忆 + 生成 embedding
- 升职加薪 → importance = 0.7 → 存入长期记忆

## 记忆压缩

当近期记忆超过 7 天未清理时：

```
7 天内的记忆 --> 保留为近期记忆
7-30 天且 importance >= 0.5 --> 摘要压缩后存入长期记忆
30 天以上且 importance < 0.5 --> 删除
```

---

> 相关文档：[AgentRuntime](./runtime.md) | [行为引擎](./behavior.md) | [数据库 Schema](../api/database.md)
