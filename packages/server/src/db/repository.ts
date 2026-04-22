import { eq, desc, and, or, sql, lt } from 'drizzle-orm';
import { db } from './index.js';
import * as s from './schema.js';
import type { WorldType, AgentType, AgentProfile, AgentState, AgentStats } from '@lore/shared';
import { encryptApiKey, decryptApiKey } from '../utils/encryption.js';

export class Repository {
  async createWorld(data: { id: string; name: string; type: WorldType; historyPreset?: string }) {
    const result = await db.insert(s.worlds).values({
      ...data,
      status: 'initializing',
      currentTick: 0,
      worldTime: new Date(),
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getWorld(id: string) {
    const rows = await db.select().from(s.worlds).where(eq(s.worlds.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async updateWorld(id: string, data: Partial<typeof s.worlds.$inferInsert>) {
    const result = await db.update(s.worlds).set(data).where(eq(s.worlds.id, id)).returning();
    return result[0] ?? null;
  }

  async createAgent(data: {
    id: string; worldId: string; type: AgentType;
    profile: AgentProfile; state: AgentState; stats: AgentStats; userId?: string;
  }) {
    const result = await db.insert(s.agents).values({
      ...data,
      alive: true,
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getAgent(id: string) {
    const rows = await db.select().from(s.agents).where(eq(s.agents.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async getWorldAgents(worldId: string) {
    return db.select().from(s.agents).where(eq(s.agents.worldId, worldId));
  }

  async updateAgent(id: string, data: Partial<typeof s.agents.$inferInsert>) {
    const result = await db.update(s.agents).set(data).where(eq(s.agents.id, id)).returning();
    return result[0] ?? null;
  }

  async insertMemory(data: {
    id: string; agentId: string; type: 'working' | 'recent' | 'long-term';
    content: string; importance?: number; memoryType?: 'chat' | 'event' | 'decision' | 'relationship' | 'action' | 'system'; timestamp: Date; expiresAt?: Date;
  }) {
    const result = await db.insert(s.memories).values({
      ...data,
      importance: data.importance ?? 0.5,
    }).returning();
    return result[0]!;
  }

  async getAgentMemories(agentId: string, limit = 20) {
    return db.select().from(s.memories)
      .where(eq(s.memories.agentId, agentId))
      .orderBy(desc(s.memories.timestamp))
      .limit(limit);
  }

  async createRelationship(data: {
    id: string; agentId: string; targetAgentId: string; worldId: string;
    type: string; intimacy?: number;
  }) {
    const result = await db.insert(s.relationships).values({
      ...data,
      intimacy: data.intimacy ?? 0,
      history: [],
      updatedAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getAgentRelationships(agentId: string) {
    return db.select().from(s.relationships).where(eq(s.relationships.agentId, agentId));
  }

  async updateRelationship(id: string, data: Partial<typeof s.relationships.$inferInsert>) {
    const result = await db.update(s.relationships)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(s.relationships.id, id)).returning();
    return result[0] ?? null;
  }

  async createEvent(data: {
    id: string; worldId: string; type: string; description: string;
    involvedAgents?: string[]; priority?: number; timestamp: Date;
  }) {
    const result = await db.insert(s.events).values({
      ...data,
      processed: false,
      priority: data.priority ?? 50,
      involvedAgents: data.involvedAgents ?? [],
    }).returning();
    return result[0]!;
  }

  async getWorldEvents(worldId: string, limit = 100) {
    return db.select().from(s.events)
      .where(eq(s.events.worldId, worldId))
      .orderBy(desc(s.events.timestamp))
      .limit(limit);
  }

  async createMessage(data: {
    id: string; worldId: string; fromAgentId?: string; toAgentId?: string;
    content: string; type: 'chat' | 'social_action';
  }) {
    const result = await db.insert(s.messages).values({
      ...data,
      timestamp: new Date(),
    }).returning();
    return result[0]!;
  }

  async getAgentMessages(agentId: string, limit = 100) {
    return db.select().from(s.messages)
      .where(or(eq(s.messages.toAgentId, agentId), eq(s.messages.fromAgentId, agentId)))
      .orderBy(desc(s.messages.timestamp))
      .limit(limit);
  }

  async createEconomy(data: {
    id: string; worldId: string; agentId: string;
    balance?: number; income?: number; expenses?: number;
  }) {
    const result = await db.insert(s.economy).values({
      ...data,
      balance: data.balance ?? 0,
      income: data.income ?? 0,
      expenses: data.expenses ?? 0,
      updatedAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getAgentEconomy(agentId: string) {
    const rows = await db.select().from(s.economy).where(eq(s.economy.agentId, agentId)).limit(1);
    return rows[0] ?? null;
  }

  async updateEconomy(id: string, data: Partial<typeof s.economy.$inferInsert>) {
    const result = await db.update(s.economy)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(s.economy.id, id)).returning();
    return result[0] ?? null;
  }

  async createPlatform(data: { id: string; worldId: string; name: string; type: 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job' }) {
    const result = await db.insert(s.platforms).values({
      ...data,
      userCount: 0,
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getWorldPlatforms(worldId: string) {
    return db.select().from(s.platforms).where(eq(s.platforms.worldId, worldId));
  }

  async createPlatformPost(data: {
    id: string; platformId: string; worldId: string; authorId: string;
    authorType: 'agent' | 'user'; content: string; imageUrl?: string;
  }) {
    const result = await db.insert(s.platformPosts).values({
      ...data,
      likes: 0,
      views: 0,
      comments: [],
      timestamp: new Date(),
    }).returning();
    return result[0]!;
  }

  async getPlatformPosts(platformId: string, limit = 50) {
    return db.select().from(s.platformPosts)
      .where(eq(s.platformPosts.platformId, platformId))
      .orderBy(desc(s.platformPosts.timestamp))
      .limit(limit);
  }

  async updatePlatformPost(id: string, data: Partial<typeof s.platformPosts.$inferInsert>) {
    const result = await db.update(s.platformPosts)
      .set(data)
      .where(eq(s.platformPosts.id, id)).returning();
    return result[0] ?? null;
  }

  async getPlatformPost(id: string) {
    const rows = await db.select().from(s.platformPosts).where(eq(s.platformPosts.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async createSave(data: { id: string; worldId: string; name: string; snapshot: any }) {
    const result = await db.insert(s.saves).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getSaves(worldId: string) {
    const query = db.select().from(s.saves);
    if (worldId) {
      return query.where(eq(s.saves.worldId, worldId));
    }
    return query;
  }

 async getSave(id: string) {
    const rows = await db.select().from(s.saves).where(eq(s.saves.id, id)).limit(1);
    return rows[0] ?? null;
  }

  
  async deleteExpiredMemories(agentId: string, cutoff: Date): Promise<void> {
    await db.delete(s.memories)
      .where(and(eq(s.memories.agentId, agentId), lt(s.memories.expiresAt, cutoff)));
  }

  async updateEventProcessed(id: string): Promise<void> {
    await db.update(s.events).set({ processed: true }).where(eq(s.events.id, id));
  }

  async deleteSave(id: string): Promise<void> {
    await db.delete(s.saves).where(eq(s.saves.id, id));
  }

  async getWorldEventsByType(worldId: string, type: string, limit = 50) {
    return db.select().from(s.events)
      .where(and(eq(s.events.worldId, worldId), eq(s.events.type, type)))
      .orderBy(desc(s.events.timestamp))
      .limit(limit);
  }

  async getAllPlatforms(worldId: string) {
    return db.select().from(s.platformPosts)
      .where(eq(s.platformPosts.worldId, worldId))
      .orderBy(desc(s.platformPosts.timestamp))
      .limit(100);
  }

  async createMonitorLog(data: {
    id: string; worldId: string; tick: number;
    eventType?: string; agentId?: string; message?: string; duration?: number;
  }) {
    const result = await db.insert(s.monitorLogs).values({
      ...data,
      timestamp: new Date(),
    }).returning();
    return result[0]!;
  }

  async getMonitorLogs(worldId: string, limit = 50) {
    return db.select().from(s.monitorLogs)
      .where(eq(s.monitorLogs.worldId, worldId))
      .orderBy(desc(s.monitorLogs.timestamp))
      .limit(limit);
  }

  async createEventChain(data: {
    id: string; worldId: string; triggerEventId: string; nextEventId?: string;
    condition?: string; delayTicks?: number; status: 'pending' | 'triggered' | 'expired';
  }) {
    const result = await db.insert(s.eventChains).values({
      ...data,
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getPendingEventChains(worldId: string) {
    return db.select().from(s.eventChains)
      .where(and(eq(s.eventChains.worldId, worldId), eq(s.eventChains.status, 'pending')));
  }

  async updateEventChain(id: string, data: Partial<typeof s.eventChains.$inferInsert>) {
    const result = await db.update(s.eventChains).set(data).where(eq(s.eventChains.id, id)).returning();
    return result[0] ?? null;
  }

  async createFaction(data: {
    id: string; worldId: string; name: string; description?: string;
    leaderId?: string; members?: string[];
  }) {
    const result = await db.insert(s.factions).values({
      ...data,
      members: data.members ?? [],
      createdAt: new Date(),
    }).returning();
    return result[0]!;
  }

  async getWorldFactions(worldId: string) {
    return db.select().from(s.factions).where(eq(s.factions.worldId, worldId));
  }

  async updateFaction(id: string, data: Partial<typeof s.factions.$inferInsert>) {
    const result = await db.update(s.factions).set(data).where(eq(s.factions.id, id)).returning();
    return result[0] ?? null;
  }

  // ── User Providers ──

  async createUserProvider(data: {
    id: string;
    presetId: string;
    name: string;
    apiKey: string;
    baseUrl?: string;
    enabled?: boolean;
    priority?: number;
    models?: string[];
    defaultModel?: string;
  }) {
    const encryptedApiKey = encryptApiKey(data.apiKey);
    const now = new Date();
    const result = await db.insert(s.userProviders).values({
      ...data,
      apiKey: encryptedApiKey,
      enabled: data.enabled ?? true,
      priority: data.priority ?? 50,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return result[0]!;
  }

  async getUserProvider(id: string) {
    const rows = await db.select().from(s.userProviders).where(eq(s.userProviders.id, id)).limit(1);
    const provider = rows[0] ?? null;
    if (provider) {
      return {
        ...provider,
        apiKey: decryptApiKey(provider.apiKey),
      };
    }
    return null;
  }

  async getAllUserProviders() {
    const rows = await db.select().from(s.userProviders).orderBy(desc(s.userProviders.priority));
    return rows.map(provider => ({
      ...provider,
      apiKey: decryptApiKey(provider.apiKey),
    }));
  }

  async updateUserProvider(id: string, data: Partial<Omit<typeof s.userProviders.$inferInsert, 'id' | 'createdAt'>>) {
    const updateData: Partial<typeof s.userProviders.$inferInsert> = {
      ...data,
      updatedAt: new Date(),
    };
    if (data.apiKey) {
      updateData.apiKey = encryptApiKey(data.apiKey);
    }
    const result = await db.update(s.userProviders)
      .set(updateData)
      .where(eq(s.userProviders.id, id))
      .returning();
    return result[0] ?? null;
  }

  async deleteUserProvider(id: string): Promise<void> {
    await db.delete(s.userProviders).where(eq(s.userProviders.id, id));
  }

  async getUserProviderByPresetId(presetId: string) {
    const rows = await db.select().from(s.userProviders)
      .where(eq(s.userProviders.presetId, presetId))
      .limit(1);
    const provider = rows[0] ?? null;
    if (provider) {
      return {
        ...provider,
        apiKey: decryptApiKey(provider.apiKey),
      };
    }
    return null;
  }
}
