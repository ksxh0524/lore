export type MemoryType = 'working' | 'recent' | 'long-term';
export type MemoryContentType = 'chat' | 'event' | 'decision' | 'relationship';

export interface MemoryEntry {
  id: string;
  agentId: string;
  type: MemoryType;
  content: string;
  importance: number;
  memoryType: MemoryContentType;
  timestamp: Date;
  expiresAt?: Date;
}
