import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';

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

export const agents = sqliteTable('agents', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  type: text('type', { enum: ['npc', 'system', 'user-avatar', 'world', 'init'] }).notNull(),
  profile: text('profile', { mode: 'json' }).notNull(),
  state: text('state', { mode: 'json' }).notNull(),
  stats: text('stats', { mode: 'json' }).notNull(),
  alive: integer('alive', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  diedAt: integer('died_at', { mode: 'timestamp' }),
  userId: text('user_id'),
});

export const memories = sqliteTable('memories', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id),
  type: text('type', { enum: ['working', 'recent', 'long-term'] }).notNull(),
  content: text('content').notNull(),
  embedding: blob('embedding'),
  importance: real('importance').default(0.5),
  memoryType: text('memory_type', { enum: ['chat', 'event', 'decision', 'relationship', 'action', 'system'] }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
});

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
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  fromAgentId: text('from_agent_id'),
  toAgentId: text('to_agent_id'),
  content: text('content').notNull(),
  type: text('type', { enum: ['chat', 'social_action'] }).notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const economy = sqliteTable('economy', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  agentId: text('agent_id').notNull(),
  balance: real('balance').default(0),
  income: real('income').default(0),
  expenses: real('expenses').default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const platforms = sqliteTable('platforms', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['video_short', 'video_long', 'social', 'image', 'forum', 'job', 'dating'] }).notNull(),
  creatorId: text('creator_id'),
  userCount: integer('user_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const platformPosts = sqliteTable('platform_posts', {
  id: text('id').primaryKey(),
  platformId: text('platform_id').notNull(),
  worldId: text('world_id').notNull(),
  authorId: text('author_id').notNull(),
  authorType: text('author_type', { enum: ['agent', 'user'] }).notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  likes: integer('likes').default(0),
  views: integer('views').default(0),
  comments: text('comments', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const saves = sqliteTable('saves', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  name: text('name').notNull(),
  snapshot: text('snapshot', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const monitorLogs = sqliteTable('monitor_logs', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull(),
  tick: integer('tick').notNull(),
  eventType: text('event_type'),
  agentId: text('agent_id'),
  message: text('message'),
  duration: integer('duration'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
});

export const eventChains = sqliteTable('event_chains', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  triggerEventId: text('trigger_event_id').notNull(),
  nextEventId: text('next_event_id'),
  condition: text('condition'),
  delayTicks: integer('delay_ticks').default(0),
  status: text('status', { enum: ['pending', 'triggered', 'expired'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const factions = sqliteTable('factions', {
  id: text('id').primaryKey(),
  worldId: text('world_id').notNull().references(() => worlds.id),
  name: text('name').notNull(),
  description: text('description'),
  leaderId: text('leader_id'),
  members: text('members', { mode: 'json' }),
  reputation: integer('reputation').default(50),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// User configured LLM providers
export const userProviders = sqliteTable('user_providers', {
  id: text('id').primaryKey(),
  presetId: text('preset_id').notNull(), // dashscope, openai, gemini, claude
  name: text('name').notNull(),
  apiKey: text('api_key').notNull(), // encrypted
  baseUrl: text('base_url'), // optional override
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(50),
  models: text('models', { mode: 'json' }).$type<string[]>(), // enabled models
  defaultModel: text('default_model'), // first enabled model
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
