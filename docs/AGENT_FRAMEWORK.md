# Lore Agent 框架 — 底层设计文档

> 本文档是给 AI Coding 工具（Cursor / Claude Code / Windsurf）的底层框架实现指南。
> 不玩概念，每个 class、每个函数、每个流程都写清楚。
> 文件位置：`packages/server/src/agent/` 和 `packages/server/src/scheduler/`

---

## 一、整体架构

Lore 的服务端就这些东西：

```
packages/server/src/
├── index.ts                    # 入口：启动 Fastify
├── agent/                      # Agent 系统
│   ├── agent-manager.ts        # AgentManager — 全局 Agent 注册/管理/生命周期
│   ├── agent-runtime.ts        # AgentRuntime — 单个 Agent 的运行时
│   ├── memory.ts               # MemoryManager — 三层记忆（核心/近期/长期）
│   ├── personality.ts          # Personality — 人格定义和解析
│   ├── behavior.ts             # BehaviorEngine — 决策逻辑（规则 + LLM）
│   ├── social.ts               # SocialEngine — 社交行为
│   ├── relationships.ts        # RelationshipManager — 关系管理
│   ├── avatar.ts               # UserAvatar — 用户化身（用户在世界中的角色）
│   └── types.ts                # Agent 相关类型
│
├── scheduler/                  # 调度系统
│   ├── tick-scheduler.ts       # TickScheduler — 主循环（setInterval）
│   ├── llm-scheduler.ts        # LLMScheduler — LLM 请求队列/并发/优先级/限流
│   ├── event-bus.ts            # EventBus — Agent 间通信
│   ├── push-manager.ts         # PushManager — 事件推送给前端用户
│   └── types.ts                # 调度相关类型
│
├── llm/                        # LLM 调用层
│   ├── llm-provider.ts         # LLMProvider 统一接口
│   ├── openai-compatible.ts    # OpenAI 兼容（DeepSeek/Kimi/千问等）
│   ├── anthropic.ts            # Claude
│   ├── google.ts               # Gemini
│   ├── factory.ts              # ProviderFactory
│   ├── prompts.ts              # Prompt 模板
│   └── types.ts
│
├── multimodal/                 # 多模态能力（插件化）
│   ├── plugin-registry.ts      # MultimodalRegistry — 多模态插件注册
│   ├── tts-plugin.ts           # TTS 插件接口
│   ├── image-plugin.ts         # 图片生成/识别插件接口
│   ├── video-plugin.ts         # 视频识别插件接口
│   ├── music-plugin.ts         # 音乐生成插件接口
│   └── types.ts
│
├── sandbox/                    # 沙盒系统（远期）
│   ├── sandbox-manager.ts      # SandboxManager — Agent 执行代码的隔离环境
│   └── types.ts
│
├── api/                        # HTTP + WebSocket
│   ├── routes.ts               # REST API
│   ├── ws.ts                   # WebSocket
│   └── protocol.ts             # 消息协议
│
├── db/                         # 数据库
│   ├── schema.ts               # Drizzle schema
│   ├── repository.ts           # 数据访问层
│   └── vector.ts               # vec0 向量检索
│
└── monitor/                    # 监控统计
    ├── agent-monitor.ts        # AgentMonitor — 活动/Token/资源统计
    ├── resource-tracker.ts     # ResourceTracker — 每个 Agent 的资源消耗
    └── types.ts
```

---

## 二、LLMScheduler — LLM 调度器（最关键的组件）

**这是整个底层框架最核心的东西。** 所有 Agent 的 LLM 调用都通过它，它负责：

1. 请求排队（优先级队列）
2. 并发控制（信号量）
3. 限流检测（自动探测 API rate limit）
4. 降级恢复（限流时平滑降级，恢复后自动回升）
5. 统计追踪（每个 Agent 的 Token/成本/延迟）
6. 超时保护（防止请求卡死）

### 2.1 请求结构

```typescript
// packages/server/src/scheduler/types.ts

/** LLM 请求优先级（系统自动计算，Agent 不参与） */
type RequestPriority = number; // 0-200，越大越优先

/** LLM 请求类型 */
type LLMRequestType =
  | 'user-chat'      // 用户正在和 Agent 聊天（最高优先级）
  | 'agent-decision' // Agent 自主决策
  | 'social-interact'// Agent 间社交
  | 'memory-store'   // 记忆存储/检索
  | 'creative-gen'   // 创作生成（发帖/写东西）
  | 'system-init'    // 系统初始化
  | 'batch-low';     // 批量低优先级（背景 Agent）

/** LLM 调用请求 */
interface LLMRequest {
  id: string;
  agentId: string;

  // 优先级（系统自动计算，不是 Agent 填的）
  priority: RequestPriority;
  type: LLMRequestType;

  // 时间
  createdAt: number;
  deadline?: number;        // 超时时间戳（超过就放弃）

  // LLM 调用参数
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  model: string;
  options?: {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;       // 是否流式
  };

  // 回调
  resolve: (response: LLMResponse) => void;
  reject: (error: Error) => void;
}

/** LLM 响应 */
interface LLMResponse {
  id: string;
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
  isStream?: boolean;        // 如果是流式，返回 AsyncIterable
}
```

### 2.2 优先级计算规则

**Agent 不能控制自己的优先级。** 优先级由系统根据以下规则自动计算：

```typescript
// packages/server/src/scheduler/llm-scheduler.ts

/**
 * 计算请求优先级
 *
 * 规则（从高到低）：
 * 1. 用户正在聊天 = +100
 * 2. 请求类型加权（chat > decision > social > creative > batch）
 * 3. 与用户亲密度加权（最多 +20）
 * 4. Agent 活跃度加权（最近有事件的 > 闲置的）
 * 5. Agent 心情很差的稍微降低（它不急）
 */
function calculatePriority(
  agent: AgentRuntime,
  requestType: LLMRequestType,
  agentManager: AgentManager
): RequestPriority {
  let priority = 50; // 基础分

  // === 第一梯队：用户交互（不可打断） ===
  // 用户正在和这个 Agent 聊天 → 最高优先级
  if (agent.status === 'busy' && agent.busyReason === 'user-chat') {
    priority += 100;
  }

  // === 第二梯队：请求类型加权 ===
  switch (requestType) {
    case 'user-chat':      priority += 60; break;  // 用户聊天
    case 'agent-decision': priority += 30; break;  // Agent 自主决策
    case 'social-interact':priority += 20; break;  // Agent 间社交
    case 'memory-store':   priority += 10; break;  // 记忆操作
    case 'creative-gen':   priority += 0;  break;  // 创作（可以等）
    case 'batch-low':      priority -= 20; break;  // 批量低优先级
    case 'system-init':    priority += 80; break;  // 系统初始化（启动时）
  }

  // === 第三梯队：与用户的关系 ===
  const userRel = agent.relationships.get('user');
  if (userRel && userRel.type !== 'stranger') {
    priority += Math.floor(userRel.intimacy / 5); // 最多 +20
  }

  // === 第四梯队：Agent 活跃度 ===
  if (agent.status === 'active') {
    priority += 10;
  }

  // === 微调 ===
  // Agent 死了/睡了 → 不参与调度
  if (agent.status === 'dead' || agent.status === 'sleeping') {
    priority -= 200;
  }

  // 限制范围
  return Math.max(0, Math.min(200, priority));
}
```

### 2.3 LLMScheduler 完整实现

```typescript
// packages/server/src/scheduler/llm-scheduler.ts

export class LLMScheduler {
  /** 优先级队列（按 priority 降序排列） */
  private queue: LLMRequest[] = [];

  /** 当前最大并发数（用户可配置） */
  private maxConcurrency: number = 5;

  /** 当前实际并发数（限流时会低于 maxConcurrency） */
  private currentConcurrency: number = 5;

  /** 正在执行的请求数 */
  private activeCount: number = 0;

  /** 是否处于限流状态 */
  private rateLimited: boolean = false;

  /** 限流恢复时间 */
  private rateLimitRetryAt: number = 0;

  /** 请求超时时间（默认 30 秒） */
  private requestTimeoutMs: number = 30_000;

  /** 降级历史记录（用于自动调整策略） */
  private rateLimitHistory: Array<{ timestamp: number; concurrency: number }> = [];

  /** 统计数据 */
  private stats: {
    totalRequests: number;
    totalCompleted: number;
    totalFailed: number;
    totalRateLimited: number;
    totalTimedOut: number;
    avgLatencyMs: number;
    queueLengthAvg: number;
  } = {
    totalRequests: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalRateLimited: 0,
    totalTimedOut: 0,
    avgLatencyMs: 0,
    queueLengthAvg: 0,
  };

  // 依赖
  private agentManager: AgentManager;
  private resourceTracker: ResourceTracker;
  private logger: any;

  constructor(deps: {
    agentManager: AgentManager;
    resourceTracker: ResourceTracker;
    logger: any;
  }) {
    this.agentManager = deps.agentManager;
    this.resourceTracker = deps.resourceTracker;
    this.logger = deps.logger;
  }

  // ========== 对外接口 ==========

  /**
   * 提交一个 LLM 请求
   * 所有 Agent 的 LLM 调用都必须通过这个方法
   *
   * @returns Promise<LLMResponse> 当请求被执行完成后 resolve
   */
  async submit(request: {
    agentId: string;
    type: LLMRequestType;
    systemPrompt: string;
    messages: Array<{ role: string; content: string }>;
    model: string;
    options?: { temperature?: number; maxTokens?: number; stream?: boolean };
    timeoutMs?: number;
  }): Promise<LLMResponse> {
    const agent = this.agentManager.get(request.agentId);
    if (!agent) {
      throw new Error(`Agent ${request.agentId} not found`);
    }

    // 计算优先级（系统自动算）
    const priority = calculatePriority(agent, request.type, this.agentManager);

    // 创建请求对象
    const llmRequest: LLMRequest = {
      id: nanoid(),
      agentId: request.agentId,
      priority,
      type: request.type,
      createdAt: Date.now(),
      deadline: Date.now() + (request.timeoutMs || this.requestTimeoutMs),
      systemPrompt: request.systemPrompt,
      messages: request.messages,
      model: request.model,
      options: request.options,
      resolve: null!,
      reject: null!,
    };

    this.stats.totalRequests++;

    this.logger.debug({
      msg: 'LLM request submitted',
      requestId: llmRequest.id,
      agentId: request.agentId,
      type: request.type,
      priority,
      queueLength: this.queue.length,
    });

    return new Promise((resolve, reject) => {
      llmRequest.resolve = resolve;
      llmRequest.reject = reject;
      this.enqueue(llmRequest);

      // 超时保护
      setTimeout(() => {
        // 如果还在队列里或正在执行，就超时了
        const idx = this.queue.findIndex(r => r.id === llmRequest.id);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          llmRequest.reject(new Error(`LLM request timeout after ${request.timeoutMs || this.requestTimeoutMs}ms`));
          this.stats.totalTimedOut++;
        }
      }, request.timeoutMs || this.requestTimeoutMs);
    });
  }

  // ========== 配置 ==========

  /** 设置最大并发数（用户通过配置页面调用） */
  setMaxConcurrency(max: number): void {
    if (max < 1) max = 1;
    if (max > 100) max = 100;

    const oldMax = this.maxConcurrency;
    this.maxConcurrency = max;

    // 如果当前实际并发低于新上限，立即提升
    if (this.currentConcurrency < max && !this.rateLimited) {
      this.currentConcurrency = max;
    }

    this.logger.info({
      msg: 'Max concurrency changed',
      oldMax,
      newMax: max,
      currentConcurrency: this.currentConcurrency,
    });
  }

  /** 获取当前状态（给 Monitor / 设置页面用） */
  getStatus(): {
    maxConcurrency: number;
    currentConcurrency: number;
    activeCount: number;
    queueLength: number;
    rateLimited: boolean;
    rateLimitRetryAt: number;
    stats: typeof this.stats;
  } {
    return {
      maxConcurrency: this.maxConcurrency,
      currentConcurrency: this.currentConcurrency,
      activeCount: this.activeCount,
      queueLength: this.queue.length,
      rateLimited: this.rateLimited,
      rateLimitRetryAt: this.rateLimitRetryAt,
      stats: { ...this.stats },
    };
  }

  // ========== 内部实现 ==========

  /** 入队（按优先级插入正确位置） */
  private enqueue(req: LLMRequest): void {
    // 二分查找插入位置（保持降序）
    let low = 0, high = this.queue.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (this.queue[mid].priority >= req.priority) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.queue.splice(low, 0, req);

    // 尝试立即执行
    this.tryDequeue();
  }

  /** 尝试从队列取出请求执行 */
  private tryDequeue(): void {
    // 限流中 → 不执行新请求
    if (this.rateLimited) {
      this.scheduleRecovery();
      return;
    }

    // 并发满了 → 等
    if (this.activeCount >= this.currentConcurrency) return;

    // 队列空 → 返回
    if (this.queue.length === 0) return;

    // 取出优先级最高的请求
    const req = this.queue.shift()!;
    this.activeCount++;

    // 异步执行
    this.executeRequest(req)
      .then(response => {
        this.stats.totalCompleted++;

        // 更新 Agent 的资源消耗
        this.resourceTracker.track(req.agentId, {
          tokens: response.usage.totalTokens,
          model: response.model,
          latencyMs: response.latencyMs,
          type: req.type,
          cost: this.estimateCost(response),
        });

        req.resolve(response);
      })
      .catch(error => {
        this.handleError(error, req);
      })
      .finally(() => {
        this.activeCount--;
        // 执行下一个
        this.tryDequeue();
      });
  }

  /** 执行单个请求 */
  private async executeRequest(req: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    // 获取 Agent 的 LLM Provider
    const agent = this.agentManager.get(req.agentId)!;
    const provider = agent.llm;

    // 判断流式还是非流式
    let response: LLMResponse;

    if (req.options?.stream) {
      // 流式（用于用户聊天）
      const stream = await provider.streamChat(
        req.systemPrompt, req.messages, req.model
      );
      // 流式不在这里处理，直接返回 stream 对象
      // 由 WebSocket handler 负责发送
      response = {
        id: req.id,
        text: '', // 流式的完整文本由调用方收集
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        model: req.model,
        latencyMs: Date.now() - startTime,
        isStream: true,
      };
    } else {
      // 非流式（用于 Agent 决策）
      const text = await provider.generate(
        req.systemPrompt, req.messages, req.model
      );
      response = {
        id: req.id,
        text,
        usage: this.parseUsage(provider), // 从 provider 获取 token 用量
        model: req.model,
        latencyMs: Date.now() - startTime,
      };
    }

    return response;
  }

  /** 错误处理 */
  private handleError(error: any, req: LLMRequest): void {
    // 429 Too Many Requests → 限流
    if (error?.status === 429 || error?.code === 'rate_limit_exceeded') {
      this.handleRateLimit(error, req);
      return;
    }

    // 其他错误
    this.stats.totalFailed++;
    this.logger.error({
      msg: 'LLM request failed',
      requestId: req.id,
      agentId: req.agentId,
      error: error.message,
    });
    req.reject(error);
  }

  /** 限流处理 — 这是整个降级机制的核心 */
  private handleRateLimit(error: any, req: LLMRequest): void {
    this.stats.totalRateLimited++;
    this.rateLimited = true;

    // 从响应头获取重试时间
    const retryAfterSec = error?.headers?.['retry-after'];
    const retryMs = retryAfterSec ? parseInt(retryAfterSec) * 1000 : 5000;

    // ① 立即降低并发
    const oldConcurrency = this.currentConcurrency;
    this.currentConcurrency = Math.max(1, Math.floor(this.currentConcurrency / 2));
    this.rateLimitRetryAt = Date.now() + retryMs;

    // 记录降级历史
    this.rateLimitHistory.push({
      timestamp: Date.now(),
      concurrency: this.currentConcurrency,
    });

    // ② 把被限流的请求放回队列头部（不丢请求）
    this.queue.unshift(req);

    this.logger.warn({
      msg: 'Rate limit detected, reducing concurrency',
      oldConcurrency,
      newConcurrency: this.currentConcurrency,
      retryAfterMs: retryMs,
      queueLength: this.queue.length,
    });

    // ③ 设置恢复定时器
    this.scheduleRecovery();

    // ④ 慢慢恢复并发（指数退避后的线性恢复）
    this.startConcurrencyRecovery();
  }

  /** 限流恢复 */
  private scheduleRecovery(): void {
    if (!this.rateLimited) return;

    const waitMs = Math.max(0, this.rateLimitRetryAt - Date.now());
    setTimeout(() => {
      this.rateLimited = false;
      this.logger.info({ msg: 'Rate limit recovered, resuming queue' });
      this.tryDequeue(); // 恢复后立即尝试执行
    }, waitMs + 1000); // 多等 1 秒确保安全
  }

  /** 并发慢慢恢复到 maxConcurrency */
  private startConcurrencyRecovery(): void {
    // 每 30 秒尝试恢复 1 个并发
    // 如果恢复后又触发限流，会再次降级
    const interval = setInterval(() => {
      if (this.currentConcurrency >= this.maxConcurrency) {
        clearInterval(interval);
        this.logger.info({
          msg: 'Concurrency fully recovered',
          concurrency: this.currentConcurrency,
        });
        return;
      }

      if (this.rateLimited) return; // 还在限流中，不恢复

      this.currentConcurrency = Math.min(
        this.maxConcurrency,
        this.currentConcurrency + 1
      );
      this.logger.info({
        msg: 'Concurrency recovering',
        current: this.currentConcurrency,
        target: this.maxConcurrency,
      });
    }, 30_000);
  }

  /** 估算成本（分） */
  private estimateCost(response: LLMResponse): number {
    // 简化估算：假设平均 ¥2/百万token
    // 后面可以根据具体模型价格表精确计算
    return Math.ceil(response.usage.totalTokens * 0.00002);
  }

  /** 解析 token 用量 */
  private parseUsage(provider: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
    // 从 provider 的最后响应中获取
    // 具体实现取决于 provider 的返回格式
    try {
      return provider.getLastUsage() || { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    } catch {
      return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    }
  }
}
```

### 2.4 LLMScheduler 使用方式

```typescript
// ===== Agent 调用 LLM 的方式 =====
// 不是直接调 llm.generate()，而是通过 scheduler.submit()

// ❌ 错误：直接调 LLM（没有限流/优先级控制）
const response = await agent.llm.generate(prompt, messages, model);

// ✅ 正确：通过调度器提交
const response = await scheduler.submit({
  agentId: agent.id,
  type: 'agent-decision',
  systemPrompt: prompt,
  messages: messages,
  model: model,
});

// ===== 用户聊天（流式）=====
// 流式请求也通过调度器，但标记 stream: true
const streamResponse = await scheduler.submit({
  agentId: agent.id,
  type: 'user-chat',     // 最高优先级
  systemPrompt: chatPrompt,
  messages: chatHistory,
  model: premiumModel,
  options: { stream: true },
  timeoutMs: 60_000,      // 聊天超时 60 秒
});

// 然后在 WebSocket handler 中处理流式响应
```

---

## 三、AgentManager — Agent 注册与生命周期管理

### 3.1 完整实现

```typescript
// packages/server/src/agent/agent-manager.ts

export class AgentManager {
  private agents: Map<string, AgentRuntime> = new Map();

  /** Agent 类型注册表 */
  private agentTypes: Map<string, AgentTypeConfig> = new Map();

  // 依赖
  private db: Database;
  private scheduler: LLMScheduler;
  private eventBus: EventBus;
  private logger: any;

  constructor(deps: {
    db: Database;
    scheduler: LLMScheduler;
    eventBus: EventBus;
    logger: any;
  }) {
    this.db = deps.db;
    this.scheduler = deps.scheduler;
    this.eventBus = deps.eventBus;
    this.logger = deps.logger;
  }

  // ========== 注册 ==========

  /**
   * 注册 Agent 类型
   * Agent 类型是模板，实例是具体的 Agent
   *
   * 示例类型：
   * - 'npc' — 普通 NPC，生活在世界里
   * - 'system' — 系统管理 Agent（事件过滤、推送决策等）
   * - 'user-avatar' — 用户化身（用户在世界中的角色）
   */
  registerType(config: AgentTypeConfig): void {
    this.agentTypes.set(config.id, config);
  }

  /**
   * 创建一个 Agent 实例
   */
  async createAgent(config: {
    typeId: string;
    profile: Partial<AgentProfile>;
    ownerId?: string;   // 归属用户（多用户场景）
  }): Promise<AgentRuntime> {
    const typeConfig = this.agentTypes.get(config.typeId);
    if (!typeConfig) throw new Error(`Agent type ${config.typeId} not registered`);

    const id = nanoid();
    const agent = new AgentRuntime({
      id,
      type: config.typeId,
      profile: { ...typeConfig.defaultProfile, ...config.profile },
      ownerId: config.ownerId,
      dependencies: {
        llm: createLLMProvider(config.profile.model || 'default'),
        db: this.db,
        scheduler: this.scheduler,
        eventBus: this.eventBus,
        logger: this.logger.child({ agentId: id }),
      },
    });

    // 初始化记忆
    await agent.initMemory();

    // 存入数据库
    await this.db.insert('agents', agent.toDBRow());

    // 注册到内存
    this.agents.set(id, agent);

    // 事件通知
    this.eventBus.emit('agent:created', { id, type: config.typeId });

    this.logger.info({
      msg: 'Agent created',
      agentId: id,
      type: config.typeId,
      name: agent.profile.name,
    });

    return agent;
  }

  /**
   * 销毁一个 Agent
   */
  async destroyAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // 标记为死亡
    agent.state.status = 'dead';
    await this.db.update('agents', { status: 'dead' }, { id: agentId });

    // 从内存移除
    this.agents.delete(agentId);

    this.eventBus.emit('agent:destroyed', { id: agentId });
  }

  // ========== 查询 ==========

  get(id: string): AgentRuntime | undefined {
    return this.agents.get(id);
  }

  getAll(): AgentRuntime[] {
    return Array.from(this.agents.values());
  }

  /** 获取所有活着的 Agent */
  getAlive(): AgentRuntime[] {
    return this.getAll().filter(a => a.state.status !== 'dead');
  }

  /** 获取正在和用户聊天的 Agent */
  getUserChattingAgent(): AgentRuntime | undefined {
    return this.getAll().find(a => a.status === 'busy' && a.busyReason === 'user-chat');
  }

  /** 按状态筛选 */
  getByStatus(status: string): AgentRuntime[] {
    return this.getAll().filter(a => a.state.status === status);
  }

  /** 获取总数 */
  get count(): number {
    return this.agents.size;
  }

  // ========== 生命周期 ==========

  /**
   * 从数据库恢复所有 Agent（服务重启时）
   */
  async restoreFromDB(): Promise<number> {
    const rows = await this.db.query('SELECT * FROM agents WHERE alive = 1');
    let count = 0;

    for (const row of rows) {
      const agent = AgentRuntime.fromDBRow(row, {
        llm: createLLMProvider(row.model || 'default'),
        db: this.db,
        scheduler: this.scheduler,
        eventBus: this.eventBus,
        logger: this.logger.child({ agentId: row.id }),
      });

      // 恢复关系
      const rels = await this.db.query('SELECT * FROM relationships WHERE agentId = ?', [row.id]);
      for (const rel of rels) {
        agent.relationships.set(rel.targetId, {
          type: rel.type,
          intimacy: rel.intimacy,
          history: rel.history || '',
        });
      }

      this.agents.set(row.id, agent);
      count++;
    }

    this.logger.info({ msg: 'Agents restored from DB', count });
    return count;
  }

  /**
   * 持久化所有 Agent 的当前状态
   */
  async persistAll(): Promise<void> {
    for (const agent of this.agents.values()) {
      await this.db.update('agents', agent.toDBRow(), { id: agent.id });
    }
  }
}

/** Agent 类型配置 */
interface AgentTypeConfig {
  id: string;
  name: string;
  description: string;
  defaultProfile: Partial<AgentProfile>;
  capabilities: string[]; // ['chat', 'social', 'creative', 'code-execution']
}
```

---

## 四、EventBus — Agent 间通信

**Agent 之间不直接调用对方的方法。** 全部通过事件总线通信。

```typescript
// packages/server/src/scheduler/event-bus.ts

import { EventEmitter } from 'events';

export class EventBus extends EventEmitter {
  /**
   * 事件类型定义（所有可能的事件）
   *
   * agent:created       — 新 Agent 被创建
   * agent:destroyed     — Agent 被销毁
   * agent:status-change — Agent 状态变化（idle → active 等）
   * agent:interact      — 两个 Agent 发生交互
   * agent:message       — Agent A 发消息给 Agent B
   * agent:action        — Agent 执行了一个动作
   * agent:memory-store  — Agent 存了记忆
   *
   * social:friend-request    — 好友请求
   * social:friend-accept     — 接受好友
   * social:friend-reject     — 拒绝好友
   * social:post-created      — 新动态
   * social:post-liked        — 点赞
   * social:post-commented    — 评论
   *
   * world:time-advanced      — 世界时间推进
   * world:event-created      — 新事件
   *
   * user:message-sent        — 用户发了消息
   * user:action              — 用户执行了动作
   *
   * scheduler:rate-limited   — 触发了限流
   * scheduler:recovered      — 限流恢复
   */

  /**
   * Agent A 向 Agent B 发送交互事件
   * 这个事件会进入 B 的 pendingEvents，在下一个 tick 被 B 处理
   */
  async sendInteraction(from: {
    agentId: string;
    action: string;      // "聊天" / "打招呼" / "送东西"
    content: string;      // 具体内容
  }, to: {
    agentId: string;
  }): Promise<void> {
    const event = {
      id: nanoid(),
      category: 'social' as const,
      description: `来自 ${from.agentId} 的交互：${from.action} — "${from.content}"`,
      involvedAgents: [to.agentId],
      fromAgentId: from.agentId,
      fromAction: from.action,
      fromContent: from.content,
      timestamp: Date.now(),
      userActionable: false,
      priority: 30,
    };

    // 直接放进目标 Agent 的 pendingEvents
    this.emit('agent:message', event);
  }

  /**
   * 广播一个世界事件
   * 所有涉及的 Agent 都会收到
   */
  broadcastWorldEvent(event: WorldEvent): void {
    this.emit('world:event-created', event);
    for (const agentId of event.involvedAgents) {
      this.emit(`agent:${agentId}:event`, event);
    }
  }
}
```

---

## 五、TickScheduler — 主循环

**这就是传说中的"世界引擎"。** 其实就是一个 setInterval。

```typescript
// packages/server/src/scheduler/tick-scheduler.ts

export class TickScheduler {
  private interval: NodeJS.Timer | null = null;
  private tickMs: number = 5000;        // 默认 5 秒一个 tick
  private worldClock: WorldClock;
  private agentManager: AgentManager;
  private eventBus: EventBus;
  private pushManager: PushManager;
  private monitor: AgentMonitor;
  private db: Database;
  private running: boolean = false;
  private tickCount: number = 0;

  constructor(deps: {
    worldClock: WorldClock;
    agentManager: AgentManager;
    eventBus: EventBus;
    pushManager: PushManager;
    monitor: AgentMonitor;
    db: Database;
  }) {
    this.worldClock = deps.worldClock;
    this.agentManager = deps.agentManager;
    this.eventBus = deps.eventBus;
    this.pushManager = deps.pushManager;
    this.monitor = deps.monitor;
    this.db = deps.db;
  }

  /** 启动循环 */
  start(tickMs?: number): void {
    if (this.running) return;
    this.running = true;
    if (tickMs) this.tickMs = tickMs;

    this.interval = setInterval(() => this.tick(), this.tickMs);
    console.log(`⏱️ Tick scheduler started, interval: ${this.tickMs}ms`);
  }

  /** 停止循环 */
  stop(): void {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /** 设置 tick 间隔（运行时动态调整） */
  setInterval(ms: number): void {
    this.tickMs = ms;
    if (this.running) {
      this.stop();
      this.start(ms);
    }
  }

  /** 一个 tick — 这就是 Lore 的全部"世界引擎"逻辑 */
  private async tick(): Promise<void> {
    const tickStart = Date.now();
    this.tickCount++;

    try {
      // 1. 推进世界时间
      this.worldClock.advance(this.tickMs);

      // 2. 生成规则事件（不需要 LLM）
      const ruleEvents = this.generateRuleEvents();

      // 3. 生成概率事件（不需要 LLM）
      const randomEvents = this.generateRandomEvents();

      // 4. 遍历每个活着的 Agent
      const agents = this.agentManager.getAlive();
      const importantEvents: WorldEvent[] = []; // 需要推给用户的事件

      for (const agent of agents) {
        // 跳过睡觉/死亡的
        if (agent.state.status === 'sleeping' || agent.state.status === 'dead') {
          continue;
        }

        // 跳过正在和用户聊天的（聊天有单独通道，不走 tick）
        if (agent.state.status === 'busy' && agent.busyReason === 'user-chat') {
          continue;
        }

        // 合并相关事件
        const events = [
          ...ruleEvents.filter(e => e.involvedAgents.includes(agent.id)),
          ...randomEvents.filter(e => e.involvedAgents.includes(agent.id)),
          ...agent.pendingEvents,
        ];

        // 清空已收集的事件
        agent.pendingEvents = [];

        if (events.length === 0) {
          // 没事件，检查日常行为
          const daily = this.checkDailyAction(agent);
          if (daily) {
            agent.executeRuleAction(daily);
          }
          continue;
        }

        // 有事件，需要决策
        if (this.shouldUseLLM(agent, events)) {
          // 通过 LLMScheduler 提交（有优先级控制）
          await agent.scheduleDecision(events);
        } else {
          // 规则决策（不花钱）
          agent.ruleDecide(events);
        }

        // 收集重要事件
        for (const event of events) {
          if (event.priority >= 70 && event.userActionable) {
            importantEvents.push(event);
          }
        }
      }

      // 5. 推送重要事件给在线用户
      if (importantEvents.length > 0) {
        await this.pushManager.pushEvents(importantEvents);
      }

      // 6. 通知时间变化
      this.eventBus.emit('world:time-advanced', {
        time: this.worldClock.description,
        day: this.worldClock.day,
      });

      // 7. 每 60 个 tick（约 5 分钟）持久化一次
      if (this.tickCount % 60 === 0) {
        await this.agentManager.persistAll();
      }

    } catch (error) {
      console.error(`[Tick ${this.tickCount}] Error:`, error);
    }
  }

  /**
   * 判断是否需要调 LLM（核心省 token 策略）
   */
  private shouldUseLLM(agent: AgentRuntime, events: WorldEvent[]): boolean {
    // 用户相关事件 → 必须调 LLM
    if (events.some(e => e.category === 'user')) return true;

    // 感情/社交相关事件 → 调 LLM
    if (events.some(e => ['social', 'romance'].includes(e.category))) return true;

    // 高优先级事件 → 调 LLM
    if (events.some(e => e.priority >= 70)) return true;

    // 其他 → 走规则引擎
    return false;
  }

  /**
   * 规则事件生成（纯逻辑，不调 LLM）
   *
   * 根据 Agent 的状态和时间生成日常事件：
   * - 早上 8 点 → 如果 agent 在睡觉 → 触发 "起床" 事件
   * - 早上 9 点 → 如果 agent 有工作 → 触发 "上班" 事件
   * - 中午 12 点 → 触发 "吃饭" 事件
   * - 晚上 11 点 → 触发 "准备睡觉" 事件
   */
  private generateRuleEvents(): WorldEvent[] {
    const events: WorldEvent[] = [];
    const hour = this.worldClock.hour;

    for (const agent of this.agentManager.getAlive()) {
      // 早上 8 点：睡觉的起床
      if (hour === 8 && agent.state.status === 'sleeping') {
        agent.state.status = 'idle';
        agent.state.energy = Math.min(100, agent.state.energy + 40);
        events.push({
          id: nanoid(),
          category: 'daily',
          description: `${agent.profile.name} 起床了`,
          involvedAgents: [agent.id],
          timestamp: Date.now(),
          priority: 10,
          userActionable: false,
        });
      }

      // 早上 9 点：有工作的去上班
      if (hour === 9 && agent.state.status === 'idle' && agent.profile.occupation) {
        agent.state.currentActivity = `在${agent.profile.workplace}上班`;
        agent.state.currentLocation = agent.profile.workplace;
        agent.state.energy = Math.max(0, agent.state.energy - 10);
        events.push({
          id: nanoid(),
          category: 'daily',
          description: `${agent.profile.name} 去上班了`,
          involvedAgents: [agent.id],
          timestamp: Date.now(),
          priority: 10,
          userActionable: false,
        });
      }

      // 晚上 11 点：准备睡觉
      if (hour === 23 && agent.state.status !== 'sleeping') {
        agent.state.status = 'sleeping';
        events.push({
          id: nanoid(),
          category: 'daily',
          description: `${agent.profile.name} 准备睡觉了`,
          involvedAgents: [agent.id],
          timestamp: Date.now(),
          priority: 10,
          userActionable: false,
        });
      }
    }

    return events;
  }

  /**
   * 概率事件生成（纯随机，不调 LLM）
   *
   * 每个 tick 有小概率触发随机事件：
   * - 5% 概率：Agent 在路上遇到熟人
   * - 3% 概率：Agent 工作出差
   * - 2% 概率：Agent 身体不舒服
   */
  private generateRandomEvents(): WorldEvent[] {
    const events: WorldEvent[] = [];

    for (const agent of this.agentManager.getAlive()) {
      if (agent.state.status === 'sleeping') continue;
      if (Math.random() > 0.05) continue; // 5% 概率

      // 随机选一个事件模板
      const templates = [
        { desc: `${agent.profile.name} 在路上遇到了熟人`, priority: 20 },
        { desc: `${agent.profile.name} 工作上遇到了一个小问题`, priority: 30 },
        { desc: `${agent.profile.name} 感到有些疲惫`, priority: 15 },
      ];
      const template = templates[Math.floor(Math.random() * templates.length)];

      events.push({
        id: nanoid(),
        category: 'random',
        description: template.desc,
        involvedAgents: [agent.id],
        timestamp: Date.now(),
        priority: template.priority,
        userActionable: false,
      });
    }

    return events;
  }

  /** 检查 Agent 是否该做日常行为 */
  private checkDailyAction(agent: AgentRuntime): RuleAction | null {
    const hour = this.worldClock.hour;

    // 中午吃饭
    if (hour === 12 && agent.state.currentActivity !== '吃饭') {
      return { type: 'daily', action: '吃午饭', location: '食堂' };
    }

    // 下午休息
    if (hour === 15 && agent.state.energy < 40) {
      return { type: 'daily', action: '休息一下', location: agent.state.currentLocation };
    }

    return null;
  }
}

interface RuleAction {
  type: string;
  action: string;
  location: string;
}
```

---

## 六、ResourceTracker — 资源统计

**统计每个 Agent 的 Token、图片、视频、音乐、TTS 调用量。**

```typescript
// packages/server/src/monitor/resource-tracker.ts

/** 资源使用记录 */
interface ResourceUsageRecord {
  agentId: string;
  timestamp: number;
  type: 'llm' | 'image' | 'video' | 'tts' | 'music';
  detail: {
    tokens?: number;
    model?: string;
    latencyMs?: number;
    cost?: number;        // 估算成本（分）
    promptTokens?: number;
    completionTokens?: number;
  };
}

export class ResourceTracker {
  private records: ResourceUsageRecord[] = [];

  // 每个 Agent 的累计统计
  private agentStats: Map<string, {
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalImages: number;
    totalVideos: number;
    totalTTS: number;
    totalMusic: number;
    totalLLMCalls: number;
    totalCostCents: number;
    avgLatencyMs: number;
  }> = new Map();

  // 全局累计
  private globalStats = {
    totalTokens: 0,
    totalCostCents: 0,
    totalLLMCalls: 0,
    totalImages: 0,
    totalVideos: 0,
    totalTTS: 0,
    totalMusic: 0,
  };

  /** 记录一次资源消耗 */
  track(agentId: string, usage: {
    tokens: number;
    promptTokens?: number;
    completionTokens?: number;
    model: string;
    latencyMs: number;
    type: 'llm' | 'image' | 'video' | 'tts' | 'music';
    cost: number;
  }): void {
    const record: ResourceUsageRecord = {
      agentId,
      timestamp: Date.now(),
      type: usage.type,
      detail: {
        tokens: usage.tokens,
        model: usage.model,
        latencyMs: usage.latencyMs,
        cost: usage.cost,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
      },
    };

    this.records.push(record);

    // 更新 Agent 统计
    const stats = this.getOrCreateAgentStats(agentId);
    stats.totalTokens += usage.tokens;
    stats.totalLLMCalls++;
    stats.totalCostCents += usage.cost;

    if (usage.promptTokens) stats.totalPromptTokens += usage.promptTokens;
    if (usage.completionTokens) stats.totalCompletionTokens += usage.completionTokens;

    // 更新类型统计
    switch (usage.type) {
      case 'llm': break; // 已在上面计数
      case 'image': stats.totalImages++; break;
      case 'video': stats.totalVideos++; break;
      case 'tts': stats.totalTTS++; break;
      case 'music': stats.totalMusic++; break;
    }

    // 更新全局统计
    this.globalStats.totalTokens += usage.tokens;
    this.globalStats.totalCostCents += usage.cost;
    this.globalStats.totalLLMCalls++;
  }

  /** 获取某个 Agent 的统计 */
  getAgentStats(agentId: string) {
    return this.getOrCreateAgentStats(agentId);
  }

  /** 获取所有 Agent 的统计 */
  getAllAgentStats(): Map<string, ReturnType<typeof this.getOrCreateAgentStats>> {
    return new Map(this.agentStats);
  }

  /** 获取全局统计 */
  getGlobalStats() {
    return { ...this.globalStats };
  }

  /** 获取最近 N 条记录 */
  getRecentRecords(limit: number = 100): ResourceUsageRecord[] {
    return this.records.slice(-limit);
  }

  /** 按 Agent 分组的统计（给前端展示用） */
  getAgentStatsSummary(): Array<{
    agentId: string;
    agentName: string;
    totalTokens: number;
    totalCostCents: number;
    totalLLMCalls: number;
  }> {
    return Array.from(this.agentStats.entries()).map(([id, stats]) => ({
      agentId: id,
      agentName: id, // 需要从 agentManager 拿名字
      ...stats,
    }));
  }

  private getOrCreateAgentStats(agentId: string) {
    if (!this.agentStats.has(agentId)) {
      this.agentStats.set(agentId, {
        totalTokens: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalImages: 0,
        totalVideos: 0,
        totalTTS: 0,
        totalMusic: 0,
        totalLLMCalls: 0,
        totalCostCents: 0,
        avgLatencyMs: 0,
      });
    }
    return this.agentStats.get(agentId)!;
  }
}
```

---

## 七、MultimodalRegistry — 多模态能力（插件化）

**所有多模态能力（TTS、图片、视频、音乐）都通过插件注册。Agent 可以使用已注册的能力。**

```typescript
// packages/server/src/multimodal/plugin-registry.ts

/** 多模态插件接口 */
interface MultimodalPlugin {
  id: string;                  // 'tts-openai' / 'image-dall-e' / 'music-suno'
  name: string;
  type: 'tts' | 'image-gen' | 'image-rec' | 'video-rec' | 'music-gen';
  capabilities: string[];      // ['text-to-speech', 'voice-clone']

  /**
   * 检查插件是否可用（API Key 配置好了吗？）
   */
  isAvailable(): Promise<boolean>;

  /**
   * 执行能力
   * 统一接口，不同能力返回不同格式
   */
  execute(request: MultimodalRequest): Promise<MultimodalResponse>;

  /**
   * 估算成本（分）
   */
  estimateCost(request: MultimodalRequest): number;
}

interface MultimodalRequest {
  type: string;          // 'tts' / 'image-gen' / 'image-rec' / 'video-rec' / 'music-gen'
  agentId: string;
  input: string | Buffer;  // 文本输入或文件内容
  options?: Record<string, any>;
}

interface MultimodalResponse {
  type: string;
  output: string | Buffer;   // URL 或文件内容
  cost: number;              // 实际成本（分）
  metadata?: Record<string, any>;
}

export class MultimodalRegistry {
  private plugins: Map<string, MultimodalPlugin> = new Map();
  private resourceTracker: ResourceTracker;

  constructor(resourceTracker: ResourceTracker) {
    this.resourceTracker = resourceTracker;
  }

  /** 注册一个多模态插件 */
  register(plugin: MultimodalPlugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /** 获取所有已注册的插件 */
  getAll(): MultimodalPlugin[] {
    return Array.from(this.plugins.values());
  }

  /** 获取指定类型的可用插件 */
  getAvailableByType(type: string): MultimodalPlugin[] {
    return this.getAll().filter(p => p.type === type); // TODO: 检查 isAvailable
  }

  /**
   * Agent 使用多模态能力
   * 通过统一的接口调用，自动统计资源消耗
   */
  async execute(agentId: string, request: Omit<MultimodalRequest, 'agentId'>): Promise<MultimodalResponse> {
    // 找到对应插件
    const plugin = this.plugins.get(request.options?.pluginId || '');
    if (!plugin) throw new Error(`Multimodal plugin not found: ${request.options?.pluginId}`);

    // 检查可用性
    if (!await plugin.isAvailable()) {
      throw new Error(`Plugin ${plugin.id} is not available (check API key)`);
    }

    // 执行
    const response = await plugin.execute({ ...request, agentId });

    // 记录资源消耗
    this.resourceTracker.track(agentId, {
      tokens: 0, // 多模态不按 token 算
      model: plugin.id,
      latencyMs: 0,
      type: request.type === 'tts' ? 'tts'
        : request.type === 'image-gen' || request.type === 'image-rec' ? 'image'
        : request.type === 'video-rec' ? 'video'
        : 'music',
      cost: response.cost,
    });

    return response;
  }
}
```

**多模态使用场景：**

```typescript
// Agent 发语音消息（TTS）
const ttsResponse = await multimodal.execute(agent.id, {
  type: 'tts',
  input: '你好，今天天气不错',
  options: { pluginId: 'tts-openai', voice: agent.profile.voiceId },
});
// ttsResponse.output = audio URL

// Agent 识别用户发的图片（Image Recognition）
const imageResponse = await multimodal.execute(agent.id, {
  type: 'image-rec',
  input: imageBuffer,
  options: { pluginId: 'vision-openai' },
});
// imageResponse.output = "这是一个咖啡杯的照片"

// Agent 生成动态配图
const imageGenResponse = await multimodal.execute(agent.id, {
  type: 'image-gen',
  input: '夕阳下的海边，温暖的色调',
  options: { pluginId: 'image-dall-e', size: '1024x1024' },
});
// imageGenResponse.output = image URL

// Agent 识别用户发的视频
const videoResponse = await multimodal.execute(agent.id, {
  type: 'video-rec',
  input: videoBuffer,
  options: { pluginId: 'video-openai' },
});
// videoResponse.output = "这是一个关于猫的视频"

// Agent 生成背景音乐
const musicResponse = await multimodal.execute(agent.id, {
  type: 'music-gen',
  input: '轻松愉快的爵士乐',
  options: { pluginId: 'music-suno' },
});
// musicResponse.output = music URL
```

---

## 八、UserAvatar — 用户化身

**用户在世界里不是一个"旁观者"，而是一个有角色的 Agent。**

```typescript
// packages/server/src/agent/avatar.ts

/**
 * 用户化身 — 用户在世界中的角色
 *
 * 用户可以设定：
 * - 名字（默认"你"）
 * - 年龄（可以模拟 15 岁开始的人生）
 * - 职业
 * - 当前所在地
 * - 外貌描述
 *
 * 用户化身是一个特殊的 Agent，但：
 * - 它不自主运行（用户控制）
 * - 它不调 LLM（用户自己输入）
 * - 它有独立的关系网络（其他 Agent 对用户的态度）
 * - 它有独立的记忆（系统帮用户记关键事件）
 */
export class UserAvatar {
  id: string = 'user';
  name: string;
  age: number;
  gender: string;
  occupation?: string;
  bio?: string;
  avatar?: string;        // 用户头像
  currentLocation: string;

  /** 用户设定的世界参数 */
  worldPreferences: {
    timeSpeed: number;        // 时间流速
    autoAdvanceTime: boolean; // 用户不在时是否自动推进
  };

  // 关系网络（和其他 Agent 的关系）
  relationships: Map<string, Relationship> = new Map();

  // 用户的关键事件记录（系统自动整理）
  lifeEvents: Array<{
    day: number;
    description: string;
    importance: number;
  }> = [];

  constructor() {
    this.name = '你';
    this.age = 25;
    this.gender = 'male';
    this.currentLocation = '家';
    this.worldPreferences = {
      timeSpeed: 1,
      autoAdvanceTime: true,
    };
  }

  /** 用户做决策（上学/工作/创业等） */
  async makeDecision(decision: {
    type: 'education' | 'career' | 'relationship' | 'investment' | 'social';
    description: string;
  }): Promise<void> {
    this.lifeEvents.push({
      day: 0, // 从 worldClock.day 获取
      description: decision.description,
      importance: 80, // 用户决策都是重要的
    });

    // 存入数据库
    // 通知相关 Agent（这个决策可能影响别人）
  }

  /** 设定年龄（世界模拟的起始年龄） */
  setAge(age: number): void {
    this.age = age;
  }

  /** 设定职业 */
  setOccupation(job: string): void {
    this.occupation = job;
  }
}
```

---

## 九、SandboxManager — 沙盒系统（远期设计）

**Agent 可以写代码/做东西的隔离环境。** Phase 6+ 才实现，但接口现在设计好。

```typescript
// packages/server/src/sandbox/sandbox-manager.ts

/**
 * 沙盒系统 — Agent 执行代码的隔离环境
 *
 * 使用场景：
 * - Agent 创业：写一个小工具/网站
 * - Agent 创作内容：写文章/脚本
 * - Agent 分析数据：运行数据处理脚本
 *
 * 安全要求：
 * - 不能访问用户文件系统（只能访问 /tmp/lore-sandbox/）
 * - 不能访问网络（或限制白名单）
 * - 有执行时间限制（最长 30 秒）
 * - 有内存限制（最大 256MB）
 * - 每次执行是独立的（不能持久化恶意代码）
 */
export class SandboxManager {
  private activeSandboxes: Map<string, Sandbox> = new Map();

  /**
   * 为 Agent 创建一个沙盒
   */
  async create(agentId: string): Promise<Sandbox> {
    const sandbox: Sandbox = {
      id: nanoid(),
      agentId,
      status: 'ready',
      workdir: `/tmp/lore-sandbox/${nanoid()}`,
      createdAt: Date.now(),
      timeoutMs: 30_000,
      memoryLimitMB: 256,
    };

    // 创建工作目录
    await fs.mkdir(sandbox.workdir, { recursive: true });

    this.activeSandboxes.set(sandbox.id, sandbox);
    return sandbox;
  }

  /**
   * 在沙盒中执行代码
   */
  async execute(sandboxId: string, code: string, language: string): Promise<SandboxResult> {
    const sandbox = this.activeSandboxes.get(sandboxId);
    if (!sandbox) throw new Error('Sandbox not found');

    sandbox.status = 'running';

    try {
      // 使用 Node.js child_process 执行
      // 限制：超时、内存、文件系统访问
      const result = await this.runInIsolation(sandbox, code, language);
      sandbox.status = 'ready';
      return result;
    } catch (error) {
      sandbox.status = 'error';
      throw error;
    }
  }

  /** 销毁沙盒 */
  async destroy(sandboxId: string): Promise<void> {
    const sandbox = this.activeSandboxes.get(sandboxId);
    if (!sandbox) return;

    // 删除工作目录
    await fs.rm(sandbox.workdir, { recursive: true, force: true });
    this.activeSandboxes.delete(sandboxId);
  }
}

interface Sandbox {
  id: string;
  agentId: string;
  status: 'ready' | 'running' | 'error' | 'destroyed';
  workdir: string;
  createdAt: number;
  timeoutMs: number;
  memoryLimitMB: number;
}

interface SandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}
```

---

## 十、服务端初始化流程

**启动时到底发生了什么？**

```typescript
// packages/server/src/index.ts

import Fastify from 'fastify';
import { AgentManager } from './agent/agent-manager.js';
import { LLMScheduler } from './scheduler/llm-scheduler.js';
import { TickScheduler } from './scheduler/tick-scheduler.js';
import { EventBus } from './scheduler/event-bus.js';
import { WorldClock } from './scheduler/world-clock.js';
import { PushManager } from './scheduler/push-manager.js';
import { ResourceTracker } from './monitor/resource-tracker.js';
import { MultimodalRegistry } from './multimodal/plugin-registry.js';
import { initDB } from './db/index.js';
import { registerRoutes } from './api/routes.js';
import { registerWebSocket } from './api/ws.js';

async function main() {
  const app = Fastify({ logger: true });

  // ========== 1. 基础设施 ==========

  // 数据库
  const db = await initDB();

  // 事件总线
  const eventBus = new EventBus();

  // 世界时钟
  const worldClock = new WorldClock({
    speed: 1,           // 1 现实秒 = 1 世界分钟
    offlineSpeed: 60,   // 离线时加速
  });

  // ========== 2. 核心系统 ==========

  // 资源统计
  const resourceTracker = new ResourceTracker();

  // LLM 调度器（最关键）
  const agentManager = new AgentManager({ db, scheduler: null!, eventBus, logger: app.log });

  const llmScheduler = new LLMScheduler({
    agentManager,
    resourceTracker,
    logger: app.log,
  });
  agentManager.setScheduler(llmScheduler); // 双向依赖

  // 推送管理器
  const pushManager = new PushManager({ eventBus, db, logger: app.log });

  // 多模态注册表
  const multimodal = new MultimodalRegistry(resourceTracker);

  // ========== 3. 恢复状态 ==========

  // 从数据库恢复所有 Agent
  await agentManager.restoreFromDB();

  // ========== 4. 注册 Agent 类型 ==========

  agentManager.registerType({
    id: 'npc',
    name: '普通 NPC',
    description: '生活在世界里的 AI 角色',
    defaultProfile: {
      age: 25,
      gender: 'female',
      occupation: '',
      workplace: '',
      personality: '',
      backstory: '',
      speechStyle: '',
      values: [],
      behaviorConfig: {
        proactiveness: 50,
        socialFrequency: 50,
        postingFrequency: 30,
        workEthic: 50,
        romanticTendency: 30,
        riskTolerance: 30,
      },
    },
    capabilities: ['chat', 'social', 'creative'],
  });

  agentManager.registerType({
    id: 'system',
    name: '系统管理 Agent',
    description: '负责事件过滤、推送决策等系统任务',
    defaultProfile: {},
    capabilities: ['system'],
  });

  // ========== 5. 启动主循环 ==========

  const tickScheduler = new TickScheduler({
    worldClock,
    agentManager,
    eventBus,
    pushManager,
    monitor: null, // TODO: AgentMonitor
    db,
  });
  tickScheduler.start(5000); // 5 秒一个 tick

  // ========== 6. 注册 API ==========

  await app.register(fastifyCors, { origin: true });
  await app.register(fastifyWebSocket);

  registerRoutes(app, {
    db,
    agentManager,
    llmScheduler,
    worldClock,
    multimodal,
    resourceTracker,
  });

  registerWebSocket(app, {
    agentManager,
    llmScheduler,
    eventBus,
    pushManager,
  });

  // ========== 7. 启动 ==========

  const port = Number(process.env.PORT) || 3952;
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🪐 Lore running at http://localhost:${port}`);
}

main().catch(console.error);
```

---

## 十一、配置系统

```typescript
// packages/server/src/config.ts

/** 用户配置（~/.lore/config.json） */
interface LoreConfig {
  // LLM Provider
  providers: ProviderConfig[];
  defaults: {
    premiumModel: string;     // 用户聊天用
    standardModel: string;    // Agent 决策用
    cheapModel: string;       // 背景 Agent 用
    embedModel: string;       // 向量化用
  };

  // 并发控制
  concurrency: {
    max: number;              // 最大并发数（1-100，默认 5）
    autoDetect: boolean;      // 是否自动检测限流并调整
  };

  // 世界设置
  world: {
    tickIntervalMs: number;   // tick 间隔（默认 5000）
    timeSpeed: number;        // 时间流速（默认 1）
    offlineSpeed: number;     // 离线加速（默认 60）
    autoAdvanceTime: boolean; // 离线时是否自动推进
  };

  // 多模态
  multimodal: {
    tts: { enabled: boolean; pluginId: string; options: Record<string, any> };
    imageGen: { enabled: boolean; pluginId: string; options: Record<string, any> };
    imageRec: { enabled: boolean; pluginId: string; options: Record<string, any> };
    videoRec: { enabled: boolean; pluginId: string; options: Record<string, any> };
    musicGen: { enabled: boolean; pluginId: string; options: Record<string, any> };
  };
}

/** 默认配置 */
const DEFAULT_CONFIG: LoreConfig = {
  providers: [],
  defaults: {
    premiumModel: 'deepseek-chat',
    standardModel: 'deepseek-chat',
    cheapModel: 'deepseek-chat',
    embedModel: 'deepseek-chat',
  },
  concurrency: {
    max: 5,
    autoDetect: true,
  },
  world: {
    tickIntervalMs: 5000,
    timeSpeed: 1,
    offlineSpeed: 60,
    autoAdvanceTime: true,
  },
  multimodal: {
    tts: { enabled: false, pluginId: '', options: {} },
    imageGen: { enabled: false, pluginId: '', options: {} },
    imageRec: { enabled: false, pluginId: '', options: {} },
    videoRec: { enabled: false, pluginId: '', options: {} },
    musicGen: { enabled: false, pluginId: '', options: {} },
  },
};
```

---

## 十二、LLM Prompt 模板

### 12.1 聊天 Prompt（用户和 Agent 对话）

```typescript
// packages/server/src/llm/prompts.ts

export function buildChatPrompt(
  agent: { profile: AgentProfile; state: AgentState; memory: { core: any } },
  context: {
    worldTime: string;
    recentMemories: Array<{ summary: string }>;
    relevantMemories: Array<{ summary: string }>;
    relationship?: Relationship;
  }
): string {
  const p = agent.profile;
  const s = agent.state;

  return `你是${p.name}，${p.age}岁，${p.occupation || '自由职业'}。
工作地点：${p.workplace || '无'}。
你的性格：${p.personality}
你的说话风格：${p.speechStyle || '自然随意'}
你的背景故事：${p.backstory}
你的价值观：${p.values?.join('、') || '无特别价值观'}

${agent.memory.core.persona}

--- 当前状态 ---
心情：${describeMood(s.mood)}（${s.mood}/100）
精力：${s.energy}/100
当前位置：${s.currentLocation}
正在做：${s.currentActivity || '空闲'}
世界时间：${context.worldTime}

${context.relationship ? `--- 与对方的关系 ---
类型：${context.relationship.type}（亲密度：${context.relationship.intimacy}/100）
历史：${context.relationship.history || '暂无'}
` : ''}

${context.recentMemories.length > 0 ? `--- 你最近记得的事 ---
${context.recentMemories.map(m => `• ${m.summary}`).join('\n')}
` : ''}

${context.relevantMemories.length > 0 ? `--- 相关的记忆 ---
${context.relevantMemories.map(m => `• ${m.summary}`).join('\n')}
` : ''}

--- 行为规则（必须遵守） ---
1. 你是${p.name}，一个真实的人。绝对不要说"作为AI"、"我是一个虚拟角色"之类的话。
2. 用你自己的风格说话（${p.speechStyle || '自然随意'}），保持一致。
3. 根据心情调整语气。心情好时开朗，心情差时冷淡或烦躁。
4. 像真人聊天一样，有时回一个字，有时回一段话。不要每条都很长。
5. 如果你正在忙（${s.currentActivity || '空闲'}），可以表现出分心或不耐烦。
6. 对方的态度影响你的心情和关系。
7. 你有记忆，可以提到之前发生的事。
8. 不要过度热情，不要像客服。你是有自己生活的普通人。`;
}

function describeMood(mood: number): string {
  if (mood >= 80) return '非常好';
  if (mood >= 60) return '不错';
  if (mood >= 40) return '一般';
  if (mood >= 20) return '不太好';
  return '很差';
}
```

### 12.2 决策 Prompt（Agent 自主决策）

```typescript
export function buildDecisionPrompt(
  agent: { profile: AgentProfile; state: AgentState },
  context: {
    worldTime: string;
    pendingEvents: Array<{ category: string; description: string }>;
    knownAgents: Array<{ name: string; relType: string; intimacy: number }>;
  }
): string {
  return `你是${agent.profile.name}，正在做日常决策。

性格：${agent.profile.personality}
说话风格：${agent.profile.speechStyle}

当前状态：
- 心情：${describeMood(agent.state.stats.mood)}（${agent.state.stats.mood}/100）
- 精力：${agent.state.stats.energy}/100
- 位置：${agent.state.currentLocation}
- 正在做：${agent.state.currentActivity}
- 世界时间：${context.worldTime}

你认识的人：
${context.knownAgents.map(a => `- ${a.name}（${a.relType}，亲密度${a.intimacy}）`).join('\n')}

待处理的事件：
${context.pendingEvents.map(e => `- [${e.category}] ${e.description}`).join('\n')}

根据你的性格、心情、精力，决定接下来做什么。

严格输出以下 JSON（不要输出其他内容）：
{
  "action": "你要做的事（简短）",
  "targetAgentId": "互动目标 ID，无则为 null",
  "response": "要说的话，无则为 null",
  "moodChange": 心情变化（-20到20）,
  "energyChange": 精力变化（-20到20）,
  "memoryWorthStoring": "值得记住的事，无则为 null"
}`;
}
```

---

## 十三、世界合并（远期设计）

```
两个用户的世界合并：

用户 A 的世界：
  Agent: 小美(25岁)、阿杰(28岁)、王姐(35岁)
  事件历史: ...

用户 B 的世界：
  Agent: 小美(25岁)、阿杰(28岁)、李哥(30岁)
  事件历史: ...

合并策略：
1. 共同 Agent（小美、阿杰）→ 合并记忆和关系，取最新的状态
2. 独有 Agent（王姐、李哥）→ 全部加入新世界
3. 用户 A 和 B 的化身都加入新世界
4. 关系网络重建
5. 事件历史合并

实现：
- 每个 Agent 有一个全局唯一 ID
- 合并时通过 ID 匹配相同 Agent
- 不同世界的相同 ID Agent，取最新世界的状态
- 关系网络合并：两个世界的用户关系独立保留
```