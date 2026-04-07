# WebSocket 协议

> 最后更新：2026-04-08 | 版本 v0.02

---

连接地址：`ws://localhost:3952/ws`

## 客户端 -> 服务端

```typescript
export type ClientMessage =
  | { type: 'chat_message'; agentId: string; content: string }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'set_time_speed'; speed: number }
  | { type: 'subscribe'; eventTypes: string[] }
  | { type: 'unsubscribe'; eventTypes: string[] }
  | { type: 'mode_switch'; mode: ControlMode }
  // 平台互动
  | { type: 'platform_post'; platformId: string; content: string; imageUrl?: string; videoUrl?: string }
  | { type: 'platform_like'; postId: string }
  | { type: 'platform_comment'; postId: string; content: string }
  // 上帝模式
  | { type: 'god_trigger_event'; event: { category: string; description: string; severity: number; location?: string } }
  | { type: 'god_observe_agent'; agentId: string; includeMemory?: boolean; includeThoughts?: boolean };
```

## 服务端 -> 客户端

```typescript
export type ServerMessage =
  // 连接
  | { type: 'connected'; worldId: string; tick: number; worldTime: string }
  // 世界状态
  | { type: 'world_state'; tick: number; worldTime: string; timeSpeed: number }
  | { type: 'time_speed_changed'; speed: number }
  // 聊天
  | { type: 'chat_stream'; agentId: string; chunk: string; done: boolean }
  | { type: 'chat_message'; fromAgentId: string; content: string }
  // 事件
  | { type: 'event'; event: WorldEvent }
  // Agent 更新
  | { type: 'agent_update'; agentId: string; state: AgentState; stats: AgentStats }
  // 模式切换
  | { type: 'mode_switch_ack'; mode: ControlMode }
  // 初始化
  | { type: 'init_progress'; stage: string; progress: number }
  | { type: 'init_complete'; worldId: string; agentCount: number }
  // 平台
  | { type: 'platform_new_post'; post: PlatformPost }
  | { type: 'platform_reaction'; postId: string; agentId: string; type: 'like' | 'comment'; content?: string }
  | { type: 'platform_stats'; postId: string; views: number; likes: number; comments: number }
  // 上帝模式
  | { type: 'god_event_result'; event: WorldEvent; agentReactions: Array<{ agentId: string; thoughtProcess: string; tokensUsed: number }> }
  | { type: 'god_agent_observation'; agentId: string; fullState: any; thoughts: any[]; memories: any; relationships: any[] }
  // 错误
  | { type: 'error'; message: string; code?: number };
```

## 流式聊天流程

```
客户端                              服务端
  |                                   |
  | -- chat_message -----------------> |
  |                                   | 构建 prompt
  |                                   | 调 LLM (stream)
  | <-- chat_stream(chunk="你") ----- |
  | <-- chat_stream(chunk="好") ----- |
  | <-- chat_stream(chunk="！") ----- |
  | <-- chat_stream(done=true) ------ |
```

## 初始化流程

```
客户端                              服务端
  |                                   |
  | -- POST /worlds/init -----------> |
  | <-- init_progress(20%) ---------  | 生成世界设定
  | <-- init_progress(50%) ---------  | 创建 Agent
  | <-- init_progress(80%) ---------  | 建立关系
  | <-- init_complete --------------  | 初始化完成
```

## 心跳

客户端每 30 秒发送 ping，服务端回复 pong。超时 60 秒断开连接。

---

> 相关文档：[REST API](./rest.md) | [数据库 Schema](./database.md) | [玩家模式](../architecture/player-modes.md)
