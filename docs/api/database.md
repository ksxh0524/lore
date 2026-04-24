# 数据库 Schema

使用 Drizzle ORM + SQLite。定义在 `packages/server/src/db/schema.ts`。

## 核心表

### worlds
```typescript
worlds: { id, name, type, historyPreset, status, config, currentTick, worldTime, createdAt }
```

### agents
```typescript
agents: { id, worldId, type, profile, state, stats, alive, createdAt, diedAt, userId }
// type: 'npc' | 'system' | 'user-avatar' | 'world' | 'init'
// profile/state/stats: JSON
```

### memories
```typescript
memories: { id, agentId, type, content, embedding, importance, memoryType, timestamp, expiresAt }
// type: 'working' | 'recent' | 'long-term'
// memoryType: 'chat' | 'event' | 'decision' | 'relationship' | 'action' | 'system'
```

### events
```typescript
events: { id, worldId, type, category, description, involvedAgents, consequences, timestamp, processed, priority }
```

### messages
```typescript
messages: { id, worldId, fromAgentId, toAgentId, content, type, timestamp }
```

## 经济与平台

### economy
```typescript
economy: { id, worldId, agentId, balance, income, expenses, updatedAt }
```

### platforms
```typescript
platforms: { id, worldId, name, type, creatorId, userCount, createdAt }
// type: 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job'
```

### platformPosts
```typescript
platformPosts: { id, platformId, worldId, authorId, authorType, content, imageUrl, likes, views, comments, timestamp }
```

## 系统

### relationships
```typescript
relationships: { id, agentId, targetAgentId, worldId, type, intimacy, history, updatedAt }
```

### saves
```typescript
saves: { id, worldId, name, snapshot, createdAt }
```

### eventChains
```typescript
eventChains: { id, worldId, triggerEventId, nextEventId, condition, delayTicks, status, createdAt }
```

### factions
```typescript
factions: { id, worldId, name, description, leaderId, members, reputation, createdAt }
```

### userProviders
```typescript
userProviders: { id, presetId, name, apiKey, baseUrl, enabled, priority, models, defaultModel, createdAt, updatedAt }
// apiKey: encrypted with AES-256-GCM
```

### monitorLogs
```typescript
monitorLogs: { id, worldId, tick, eventType, agentId, message, duration, timestamp }
```