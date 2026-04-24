import { db } from './index.js';
import { memories } from './schema.js';
import { eq, and } from 'drizzle-orm';
import type { MemoryType, MemoryContentType } from '@lore/shared';

export async function storeEmbedding(memoryId: string, embedding: number[]): Promise<void> {
  const buffer = Buffer.from(new Float32Array(embedding).buffer);
  await db.update(memories).set({ embedding: buffer }).where(eq(memories.id, memoryId));
}

export async function searchSimilar(
  agentId: string,
  queryEmbedding: number[],
  limit = 10,
  options?: { type?: MemoryType; memoryType?: MemoryContentType },
): Promise<Array<{ id: string; content: string; importance: number; similarity: number }>> {
  const conditions = [eq(memories.agentId, agentId)];
  if (options?.type) {
    conditions.push(eq(memories.type, options.type));
  }
  if (options?.memoryType) {
    conditions.push(eq(memories.memoryType, options.memoryType));
  }

  const rows = await db
    .select({
      id: memories.id,
      content: memories.content,
      importance: memories.importance,
      embedding: memories.embedding,
    })
    .from(memories)
    .where(and(...conditions));

  const scored = rows
    .map((r) => {
      let similarity = 0;
      if (r.embedding) {
        const buf = r.embedding as Buffer;
        const storedEmbedding: number[] = Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4));
        similarity = cosineSimilarity(queryEmbedding, storedEmbedding);
      }
      return {
        id: r.id,
        content: r.content,
        importance: r.importance ?? 0.5,
        similarity,
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  return scored;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
