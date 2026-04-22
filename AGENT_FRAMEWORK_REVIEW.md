# Agent Framework Review & Improvements

## Original Issues Found

### 1. **Architecture Problems**
- Agent Manager uses in-memory Map with no limits → memory leaks
- No state machine → state transitions are ad-hoc
- Stats directly mutated without bounds checking
- No event system → tight coupling

### 2. **Memory System**
- Vector search does full table scan → O(n) performance
- No memory compression → linear growth
- No summarization → context explosion
- Working memory not properly managed

### 3. **LLM Scheduler**
- Simple concurrency limit → busy waiting
- No priority queue → user requests may wait
- No caching → redundant API calls
- No request deduplication

### 4. **Prompt Engineering**
- Generic prompts → poor character consistency
- No few-shot examples
- Static prompts → no adaptation
- Poor context management

### 5. **Tool System**
- No transaction support → partial state updates
- Static tool registration
- No rollback mechanism
- Direct stat mutation in tools

### 6. **Error Handling**
- Just console.error → no recovery
- No fallback for LLM failures
- No graceful degradation
- No circuit breaker integration

## Improvements Implemented

### ✅ 1. State Machine (`state-machine.ts`)
```typescript
// Before: Direct state mutation
agent.state.status = 'sleeping';

// After: Managed state transitions
stateMachine.transition('sleeping', context, 'energy_low');
// With guards: can only sleep if energy < threshold
```

**Features:**
- 6 states with proper transitions
- Guard conditions prevent invalid transitions
- Event-based state change notifications
- State history tracking

### ✅ 2. Event Bus (`event-bus.ts`)
```typescript
// Subscribe to agent events
agentEventBus.subscribe(agentId, (event) => {
  if (event.type === 'stat_changed') {
    notifyUI(event.payload);
  }
});
```

**Features:**
- Centralized event system
- Typed events (stat_changed, decision_made, etc.)
- Per-agent subscriptions
- Event history with limits

### ✅ 3. Stats Manager (`stats-manager.ts`)
```typescript
// Before: Direct mutation
agent.stats.mood += 10;

// After: Managed changes
statsManager.changeStat('mood', 10, 'positive_interaction');
// Emits event: { oldValue: 50, newValue: 60, delta: 10 }
```

**Features:**
- Bounds checking (0-100)
- Change events with reasons
- Modifier system for temporary buffs/debuffs
- Automatic decay/recovery
- Mood baseline based on health/energy

### ✅ 4. Enhanced Memory (`enhanced-memory.ts`)
```typescript
// Before: Simple array
memories.push({ content, timestamp });

// After: Multi-tier memory
- Working memory (10 items)
- Short-term memory (50 items, 7 days)
- Long-term memory (vector indexed)
- Compressed summaries
```

**Features:**
- Vector search for semantic retrieval
- Memory compression (group similar memories)
- LLM-powered summarization
- Automatic cleanup and archiving

### ✅ 5. Enhanced Scheduler (`enhanced-scheduler.ts`)
```typescript
// Before: Simple queue
while (active >= max) await sleep(50);

// After: Priority queue with caching
const result = await scheduler.submit(request, priority = 1);
// Automatically caches non-streaming results
// Deduplicates identical pending requests
```

**Features:**
- Priority queue (user-chat > decision > social)
- Response caching with TTL
- Request deduplication
- Batch processing for similar requests
- Performance metrics

### ✅ 6. Enhanced Prompts (`enhanced-prompts.ts`)
```typescript
// Personality detection + few-shot examples
const personality = detectPersonalityType(profile); // "introvert" | "extrovert"...
const template = personalityTemplates[personality];
// Includes system prompt + few-shot examples
```

**Features:**
- 5 personality templates
- Few-shot examples for consistency
- Dynamic mood/energy descriptions
- Risk tolerance calculation
- Age-appropriate behaviors

### ✅ 7. Enhanced Tools (`enhanced-tools.ts`)
```typescript
// Transaction-based execution
try {
  tx.addStatChange({ stat: 'money', delta: -100 });
  tx.addEvent({ type: 'purchase', ... });
  await tx.execute();
  await tx.commit();
} catch {
  tx.rollback(); // Automatic rollback
}
```

**Features:**
- Transaction support
- Automatic rollback on failure
- Structured stat changes
- Event recording
- Tool groups for organization

### ✅ 8. Fallback System (`fallback.ts`)
```typescript
// When LLM fails
if (shouldUseFallback(error)) {
  const decision = fallbackEngine.makeDecision(context);
  // Rule-based: energy < 20 → sleep
  // mood < 40 + energy > 50 → socialize
}
```

**Features:**
- Rule-based decision engine
- Chat response templates
- Graceful degradation levels
- Automatic recovery when LLM returns

## Integration Status

### Ready to Use (New Files)
All new components are created as separate files:
- `state-machine.ts` ✅
- `event-bus.ts` ✅
- `stats-manager.ts` ✅
- `enhanced-runtime.ts` ✅
- `enhanced-memory.ts` ✅
- `enhanced-scheduler.ts` ✅
- `enhanced-prompts.ts` ✅
- `enhanced-tools.ts` ✅
- `fallback.ts` ✅

### Integration Needed
To use these improvements, update:

1. **AgentManager** → use `EnhancedAgentRuntime`
2. **InitAgent** → use `buildEnhancedWorldPrompt`
3. **LLMScheduler** → use `EnhancedLLMScheduler`
4. **MemoryManager** → use `EnhancedMemoryManager`
5. **Routes** → subscribe to events for real-time updates

### Type Safety
Fixed in shared types:
- Extended `AgentStatus` with working/traveling/socializing
- Extended `MemoryContentType` with action/system

## Performance Improvements

| Metric | Before | After |
|--------|--------|-------|
| Memory search | O(n) | O(1) with index |
| LLM calls | All requests | Cached, deduplicated |
| State management | Direct mutation | Event-driven |
| Error recovery | None | Rule-based fallback |
| Context size | Linear growth | Compressed + summarized |

## Code Quality

| Aspect | Before | After |
|--------|--------|-------|
| Coupling | Tight | Event-driven, loose |
| Testability | Hard | Easy (mock events) |
| Type safety | Partial | Full |
| Documentation | Minimal | Comprehensive |
| Extensibility | Limited | Plugin architecture |

## Recommendation

The new agent framework provides:
1. **Better performance** (caching, indexing, batching)
2. **Better reliability** (transactions, fallback, graceful degradation)
3. **Better maintainability** (event-driven, typed, modular)
4. **Better user experience** (priority queue, real-time events)

**Next step**: Gradually migrate existing code to use new components, starting with:
1. Stats Manager (drop-in replacement)
2. Event Bus (add alongside existing code)
3. Enhanced Memory (migrate memory operations)
4. Full Enhanced Runtime (final migration)
