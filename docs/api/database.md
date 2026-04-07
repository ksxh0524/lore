# 数据库 Schema

> 最后更新：2026-04-08 | 版本 v0.02

---

使用 Drizzle ORM + SQLite。所有表定义在 `packages/server/src/db/schema.ts`。

## 表结构

### worlds

```typescript
export const worlds = sqliteTable('worlds', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type', { enum: ['history', 'random'] }).notNull(),
  historyPreset: text('history_preset'),
  status: text('status', { enum: ['initializing', 'running', 'paused', 'stopped'] }).notNull(),
  config: text('config', { mode: 'json' }),
  currentTick: integer('current_tick').default(0),
  worldTime: integer('world_time', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### agents

```typescript
export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  type: text('type', { enum: ['npc', 'system', 'user-avatar', 'world', 'init'] }).notNull(),
  profile: text('profile', { mode: 'json' }).notNull(),
  state: text('state', { mode: 'json' }).notNull(),
  stats: text('stats', { mode: 'json' }).notNull(),
  currentActivity: text('current_activity'),
  currentLocation: text('current_location'),
  alive: integer('alive', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  diedAt: integer('died_at', { mode: 'timestamp' }),
  userId: text('user_id'),
  thoughtFrequency: text('thought_frequency', { enum: ['high', 'medium', 'low', 'minimal'] }).default('medium'),
  lastThinkTick: integer('last_think_tick').default(0),
});
```

### memories

```typescript
export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  type: text('type', { enum: ['working', 'recent', 'long-term'] }).notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  importance: real('importance').default(0.5),
  memoryType: text('memory_type', { enum: ['chat', 'event', 'decision', 'relationship'] }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
});
```

### relationships

```typescript
export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull(),
  targetAgentId: text('target_agent_id').notNull(),
  worldId: text('world_id').notNull(),
  type: text('type').notNull(),
  intimacy: integer('intimacy').default(0),
  history: text('history', { mode: 'json' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

### events

```typescript
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  type: text('type').notNull(),
  category: text('category'),
  description: text('description').notNull(),
  involvedAgents: text('involved_agents', { mode: 'json' }),
  consequences: text('consequences', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  processed: integer('processed', { mode: 'boolean' }).default(false),
  priority: integer('priority').default(50),
  source: text('source', { enum: ['routine', 'random', 'agent', 'world_agent', 'user', 'god'] }),
});
```

### messages

```typescript
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  fromAgentId: text('from_agent_id'),
  toAgentId: text('to_agent_id'),
  content: text('content').notNull(),
  type: text('type', { enum: ['chat', 'social_action'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
```

### economy

```typescript
export const economy = sqliteTable('economy', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  agentId: text('agent_id').notNull(),
  balance: real('balance').default(0),
  income: real('income').default(0),
  expenses: real('expenses').default(0),
  assets: text('assets', { mode: 'json' }),
  job: text('job', { mode: 'json' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});
```

### platform_posts

```typescript
export const platformPosts = sqliteTable('platform_posts', {
  id: text('id').primaryKey(),
  platformId: text('platform_id').notNull(),
  worldId: text('world_id').notNull(),
  authorId: text('author_id').notNull(),
  authorType: text('author_type', { enum: ['agent', 'user'] }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  likes: integer('likes').default(0),
  views: integer('views').default(0),
  comments: text('comments', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});
```

### platforms

```typescript
export const platforms = sqliteTable('platforms', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['video_short', 'video_long', 'social', 'image', 'forum', 'job'] }).notNull(),
  creatorId: text('creator_id'),
  userCount: integer('user_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

### 其他表

| 表名 | 说明 |
|------|------|
| `platforms` | 虚拟平台（Phase 2+，Phase 1 用内置默认平台） |
| `factions` | 势力（id, worldId, name, type, members JSON, resources JSON） |
| `saves` | 存档（id, worldId, name, snapshot JSON, createdAt） |
| `event_chains` | 事件链（id, worldId, type, state JSON, currentNodeId, participants JSON） |
| `monitor_logs` | 监控日志（id, worldId, agentId, eventType, data JSON, timestamp） |
| `config` | 配置（id, key, value JSON） |
| `presets` | 已安装预设（id, name, version, manifest JSON, installedAt） |

---

> 相关文档：[REST API](./rest.md) | [WebSocket](./websocket.md)
