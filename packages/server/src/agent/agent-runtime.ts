import type {
  AgentType,
  AgentProfile,
  AgentState,
  AgentStats,
  ThoughtFrequency,
  SerializedAgent,
  SimplifiedRelationship,
} from '@lore/shared';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { ToolContext, ToolResult, StatChange, StateChange, DecisionInput } from './types.js';
import { DecisionSchema } from './types.js';
import { MemoryManager } from './memory.js';
import { ToolRegistry } from './tools.js';
import { registerDefaultTools } from './default-tools.js';
import { AgentStateMachine } from './state-machine.js';
import { agentEventBus } from './event-bus.js';
import { StatsManager } from './stats-manager.js';
import { MessageInbox } from './message-inbox.js';
import { nanoid } from 'nanoid';
import type { LoreConfig } from '../config/loader.js';
import { buildDecisionPrompt, buildChatPrompt } from '../llm/prompts.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('agent-runtime');

export interface ActionResult {
  success: boolean;
  action: string;
  result: unknown;
  statChanges: StatChange[];
  memory?: string;
}

export interface AgentDecision {
  action: string;
  target?: string;
  reasoning: string;
  moodChange: number;
  say?: string;
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  alternativeActions?: string[];
  confidence: number;
}

export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType;

  profile: AgentProfile;
  private stateMachine: AgentStateMachine;
  private statsManager: StatsManager;
  private memoryInstance: MemoryManager;
  private relationshipsMap = new Map<string, SimplifiedRelationship>();
  private tools = new ToolRegistry();
  private inbox: MessageInbox;
  private currentLocation = '家';

  private lastThinkTick = 0;
  private lastDecision: AgentDecision | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;
  private agentManager: { get: (id: string) => AgentRuntime | undefined; getAgentsMap: () => ReadonlyMap<string, AgentRuntime> } | null = null;

  private repo: Repository;
  private llmScheduler: LLMScheduler;
  private config: LoreConfig;

  constructor(
    id: string,
    worldId: string,
    type: AgentType,
    profile: AgentProfile,
    repo: Repository,
    llmScheduler: LLMScheduler,
    config: LoreConfig,
    initialStats?: AgentStats,
  ) {
    this.id = id;
    this.worldId = worldId;
    this.type = type;
    this.profile = profile;
    this.repo = repo;
    this.llmScheduler = llmScheduler;
    this.config = config;

    this.stateMachine = new AgentStateMachine(id);
    this.statsManager = new StatsManager(
      id,
      initialStats || { mood: 70, health: 100, energy: 100, money: 1000 },
    );
    this.memoryInstance = new MemoryManager(id, repo, llmScheduler, config);
    this.inbox = new MessageInbox(id, worldId, repo);
    registerDefaultTools(this.tools, repo);

    this.stateMachine.on('stateChange', (event) => {
      agentEventBus.emitEvent({
        agentId: this.id,
        type: 'state_changed',
        timestamp: new Date(),
        payload: {
          from: event.from,
          to: event.to,
          reason: event.reason,
          data: event.data,
        },
      });
    });
  }

  get state(): AgentState {
    return {
      status: this.stateMachine.getState(),
      currentActivity: this.getCurrentActivity(),
      currentLocation: this.getCurrentLocation(),
      lastActiveTick: this.lastThinkTick,
    };
  }

  get stats(): AgentStats {
    return this.statsManager.getStats();
  }

  get memory(): MemoryManager {
    return this.memoryInstance;
  }

  get relationships(): Map<string, SimplifiedRelationship> {
    return this.relationshipsMap;
  }

  get toolRegistry(): ToolRegistry {
    return this.tools;
  }

  getInbox(): MessageInbox {
    return this.inbox;
  }

  async deliverMessage(fromAgentId: string, fromAgentName: string, content: string): Promise<void> {
    await this.inbox.deliverMessage(fromAgentId, fromAgentName, content);
    await this.memory.add(`收到${fromAgentName}的消息："${content}"`, 'chat', 0.6);
  }

  setAgentManager(manager: { get: (id: string) => AgentRuntime | undefined; getAgentsMap: () => ReadonlyMap<string, AgentRuntime> }): void {
    this.agentManager = manager;
  }

  get status() {
    return this.stateMachine.getState();
  }

  getToolContext(): ToolContext {
    return {
      id: this.id,
      worldId: this.worldId,
      profile: this.profile,
      stats: this.stats,
      state: this.state,
      memory: this.memoryInstance,
    };
  }

  getCurrentActivity(): string {
    return this.lastDecision?.action || '空闲';
  }

  getCurrentLocation(): string {
    return this.currentLocation;
  }

  setCurrentLocation(location: string): void {
    const oldLocation = this.currentLocation;
    this.currentLocation = location;
    if (oldLocation !== location) {
      agentEventBus.emitEvent({
        agentId: this.id,
        type: 'location_changed',
        timestamp: new Date(),
        payload: { from: oldLocation, to: location },
      });
    }
  }

  canTransitionTo(status: ReturnType<AgentStateMachine['getState']>): boolean {
    return this.stateMachine.canTransition(status, {
      energy: this.stats.energy,
      health: this.stats.health,
      mood: this.stats.mood,
      currentActivity: this.getCurrentActivity(),
      currentLocation: this.getCurrentLocation(),
    });
  }

  transitionTo(status: ReturnType<AgentStateMachine['getState']>, reason?: string, data?: unknown): boolean {
    return this.stateMachine.transition(
      status,
      {
        energy: this.stats.energy,
        health: this.stats.health,
        mood: this.stats.mood,
        currentActivity: this.getCurrentActivity(),
        currentLocation: this.getCurrentLocation(),
      },
      reason,
      data,
    );
  }

  applyStatChanges(changes: StatChange[]): void {
    this.statsManager.applyChanges(changes);

    if (this.statsManager.getStat('health') <= 0 && this.stateMachine.getState() !== 'dead') {
      this.transitionTo('dead', '生命值耗尽');
      agentEventBus.emitEvent({
        agentId: this.id,
        type: 'agent_died',
        timestamp: new Date(),
        payload: { reason: 'health_depleted' },
      });
    }
  }

  applyStateChanges(changes: StateChange[]): void {
    for (const change of changes) {
      if (change.status) {
        this.transitionTo(change.status, 'tool_effect');
      }
      if (change.activity) {
        this.lastDecision = {
          action: change.activity,
          reasoning: 'tool_effect',
          moodChange: 0,
          confidence: 0.8,
        };
      }
      if (change.location) {
        this.setCurrentLocation(change.location);
      }
    }
  }

  applyToolResult(result: ToolResult): void {
    if (result.statChanges && result.statChanges.length > 0) {
      this.applyStatChanges(result.statChanges);
    }
    if (result.stateChanges && result.stateChanges.length > 0) {
      this.applyStateChanges(result.stateChanges);
    }
    if (result.memory) {
      this.memoryInstance.add(result.memory, 'action', 0.5);
    }
  }

  getThoughtFrequency(): ThoughtFrequency {
    const rels = [...this.relationshipsMap.values()];
    if (rels.some((r) => r.type !== 'stranger' && r.intimacy > 60)) return 'high';
    if (rels.some((r) => r.type !== 'stranger')) return 'medium';
    if (rels.length > 0) return 'low';
    return 'minimal';
  }

  shouldThink(currentTick: number): boolean {
    if (this.stateMachine.isFinal()) return false;
    switch (this.getThoughtFrequency()) {
      case 'high':
        return true;
      case 'medium':
        return currentTick % 3 === 0;
      case 'low':
        return currentTick % 8 === 0;
      case 'minimal':
        return currentTick % 30 === 0;
    }
  }

  getRequiredModel(): string {
    switch (this.getThoughtFrequency()) {
      case 'high':
        return this.config.llm.defaults.premiumModel;
      case 'medium':
        return this.config.llm.defaults.standardModel;
      default:
        return this.config.llm.defaults.cheapModel;
    }
  }

  async tick(
    worldState: { currentTime: string; day: number; currentTick: number },
    llmScheduler: LLMScheduler,
    config: LoreConfig,
  ): Promise<void> {
    if (this.stateMachine.isFinal()) return;

    const isSleeping = this.stateMachine.getState() === 'sleeping';
    this.statsManager.update(isSleeping);
    this.handleAutoStateTransitions();

    if (!this.shouldThink(worldState.currentTick)) return;

    try {
      const decision = await this.makeDecision(worldState, llmScheduler, config);
      if (decision) {
        const result = await this.executeDecision(decision);
        this.consecutiveFailures = 0;
        this.lastDecision = decision;
        this.lastThinkTick = worldState.currentTick;
        this.emitDecisionEvent(decision);
        this.emitActionEvent(result);
        this.inbox.markAllRead();
      }
    } catch (err) {
      this.consecutiveFailures++;
      logger.error({ agentId: this.id, err }, 'Agent tick failed');
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.fallbackBehavior();
        this.consecutiveFailures = 0;
      }
    }
  }

  private handleAutoStateTransitions(): void {
    const currentState = this.stateMachine.getState();

    if (currentState === 'dead') return;

    if (this.statsManager.getStat('health') <= 0) {
      this.transitionTo('dead', '健康值归零');
      agentEventBus.emitEvent({
        agentId: this.id,
        type: 'agent_died',
        timestamp: new Date(),
        payload: { reason: 'health_depleted' },
      });
      return;
    }

    if (currentState !== 'sleeping') {
      if (this.statsManager.shouldSleep()) {
        this.transitionTo('sleeping', '能量耗尽，自动进入睡眠');
      }
    }

    if (currentState === 'sleeping' && this.statsManager.canWakeUp()) {
      this.transitionTo('idle', '精力恢复，自动醒来');
    }
  }

  private async makeDecision(
    worldState: { currentTime: string; day: number; currentTick: number },
    llmScheduler: LLMScheduler,
    config: LoreConfig,
  ): Promise<AgentDecision | null> {
    const inboxEvents = this.inbox.getPendingEvents();
    const prompt = buildDecisionPrompt(this, worldState, inboxEvents);
    const toolDefs = this.tools.toFunctionDefinitions();

    const result = await llmScheduler.submit({
      agentId: this.id,
      callType: 'decision',
      model: this.getRequiredModel(),
      messages: prompt,
      tools: toolDefs,
    });

    return this.parseDecision(result.content, result.toolCalls);
  }

  private parseDecision(
    content: string,
    toolCalls?: Array<{ name: string; args: Record<string, unknown> }>,
  ): AgentDecision | null {
    try {
      const rawParsed = JSON.parse(content);
      const result = DecisionSchema.safeParse(rawParsed);
      
      if (result.success) {
        return {
          action: result.data.action,
          target: result.data.target,
          reasoning: result.data.reasoning,
          moodChange: Math.max(-20, Math.min(20, result.data.moodChange)),
          say: result.data.say,
          toolCalls: toolCalls,
          alternativeActions: result.data.alternativeActions,
          confidence: Math.max(0.1, Math.min(1, result.data.confidence)),
        };
      }
      
      logger.warn({ 
        agentId: this.id, 
        errors: result.error.errors,
        rawContent: content.slice(0, 100) 
      }, 'Decision parse validation failed');
      
      return this.createSafeFallbackDecision();
    } catch (err) {
      logger.warn({ agentId: this.id, err, content: content.slice(0, 100) }, 'Decision JSON parse failed');
      return this.createSafeFallbackDecision();
    }
  }

  private createSafeFallbackDecision(): AgentDecision {
    const stats = this.stats;
    if (stats.energy < 30) {
      return {
        action: '休息',
        reasoning: '精力不足，系统建议休息',
        moodChange: 5,
        confidence: 0.4,
      };
    }
    if (stats.health < 50) {
      return {
        action: '调养身体',
        reasoning: '健康状态不佳，系统建议休息',
        moodChange: -5,
        confidence: 0.4,
      };
    }
    return {
      action: '日常活动',
      reasoning: '系统生成默认决策',
      moodChange: 0,
      confidence: 0.3,
    };
  }

  private async executeDecision(decision: AgentDecision): Promise<ActionResult> {
    const statChanges: StatChange[] = [];

    if (decision.moodChange !== 0) {
      statChanges.push({
        stat: 'mood',
        delta: decision.moodChange,
        reason: '决策影响',
      });
    }

    const toolResults: unknown[] = [];
    let success = true;

    if (decision.toolCalls && decision.toolCalls.length > 0) {
      const context = this.getToolContext();
      
      const executionPromises = decision.toolCalls.map(async (call) => {
        const tool = this.tools.get(call.name);
        if (!tool) {
          return { call, result: null, error: `Tool ${call.name} not found` };
        }
        
        try {
          const result = await tool.execute(call.args, context);
          return { call, result, error: null };
        } catch (err) {
          return { call, result: null, error: String(err) };
        }
      });

      const settled = await Promise.allSettled(executionPromises);
      
      for (const outcome of settled) {
        if (outcome.status === 'fulfilled') {
          const { call, result, error } = outcome.value;
          
          if (error) {
            success = false;
            toolResults.push({ error });
            continue;
          }
          
          if (result) {
            this.applyToolResult(result);
            toolResults.push(result.result);
            
            if (!result.success) {
              success = false;
            }
          }
          
          if (call.name === 'send_message' && this.agentManager) {
            try {
              await this.handleMessageDelivery(call.args);
            } catch (err) {
              logger.warn({ agentId: this.id, call, err }, 'Message delivery failed');
            }
          }
        } else {
          success = false;
          toolResults.push({ error: outcome.reason });
        }
      }
    }

    this.updateStateFromAction(decision.action);
    this.applyStatChanges(statChanges);

    return {
      success,
      action: decision.action,
      result: toolResults.length > 0 ? toolResults : null,
      statChanges,
      memory: decision.say,
    };
  }

  private updateStateFromAction(action: string): void {
    const keywords = this.extractActionKeywords(action);
    
    if (keywords.work) {
      this.transitionTo('working', '开始工作');
    } else if (keywords.rest) {
      this.transitionTo('sleeping', '决定休息');
    } else if (keywords.social) {
      this.transitionTo('socializing', '开始社交');
    } else if (keywords.travel) {
      this.transitionTo('traveling', '开始移动');
    } else if (keywords.active) {
      this.transitionTo('active', '开始活动');
    }
  }

  private extractActionKeywords(action: string): {
    work: boolean;
    rest: boolean;
    social: boolean;
    travel: boolean;
    active: boolean;
  } {
    const actionLower = action.toLowerCase();
    
    return {
      work: actionLower.includes('工作') || actionLower.includes('上班') || 
            actionLower.includes('加班') || actionLower.includes('开会') ||
            actionLower.includes('写代码') || actionLower.includes('开发'),
      rest: actionLower.includes('睡觉') || actionLower.includes('休息') || 
            actionLower.includes('小憩') || actionLower.includes('躺下'),
      social: actionLower.includes('社交') || actionLower.includes('聊天') || 
              actionLower.includes('约会') || actionLower.includes('聚会') ||
              actionLower.includes('吃饭') && !actionLower.includes('独自'),
      travel: actionLower.includes('移动') || actionLower.includes('前往') || 
              actionLower.includes('去') && !actionLower.includes('去工作') ||
              actionLower.includes('出发') || actionLower.includes('到达'),
      active: !actionLower.includes('空闲') && actionLower.includes('活动') || 
              actionLower.includes('运动') || actionLower.includes('散步'),
    };
  }

  private async handleMessageDelivery(args: Record<string, unknown>): Promise<void> {
    if (!this.agentManager) return;
    const targetName = String(args.targetName ?? '');
    const content = String(args.content ?? '');
    if (!targetName || !content) return;

    const agentMap = this.agentManager.getAgentsMap?.();
    if (!agentMap) return;

    for (const agent of agentMap.values()) {
      if (agent.profile.name === targetName && agent.id !== this.id) {
        await agent.deliverMessage(this.id, this.profile.name, content);
        break;
      }
    }
  }

  private async fallbackBehavior(): Promise<void> {
    if (this.stats.energy < 30) {
      this.transitionTo('sleeping', 'LLM失败，自动休息');
      this.applyStatChanges([{ stat: 'energy', delta: 20, reason: 'fallback_recovery' }]);
    } else {
      this.transitionTo('idle', 'LLM失败，进入空闲');
    }
    await this.memory.add('系统执行了默认行为', 'decision', 0.3);
  }

  async *chat(userMessage: string, llmScheduler: LLMScheduler, config: LoreConfig): AsyncGenerator<string> {
    const ctx = await this.memory.getContext(2000);
    const messages = buildChatPrompt(this, userMessage, ctx.working);

    let fullResponse = '';
    const stream = llmScheduler.submitStream({
      agentId: this.id,
      callType: 'user-chat',
      model: config.llm.defaults.premiumModel,
      messages,
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
      yield chunk;
    }

    await this.memory.add(`User: ${userMessage}`, 'chat', 0.5);
    await this.memory.add(`Me: ${fullResponse}`, 'chat', 0.5);
  }

  async chatFull(userMessage: string, llmScheduler: LLMScheduler, config: LoreConfig): Promise<string> {
    const ctx = await this.memory.getContext(2000);
    const messages = buildChatPrompt(this, userMessage, ctx.working);

    let fullResponse = '';
    const stream = llmScheduler.submitStream({
      agentId: this.id,
      callType: 'user-chat',
      model: config.llm.defaults.premiumModel,
      messages,
    });

    for await (const chunk of stream) {
      fullResponse += chunk;
    }

    await this.memory.add(`User: ${userMessage}`, 'chat', 0.5);
    await this.memory.add(`Me: ${fullResponse}`, 'chat', 0.5);
    return fullResponse;
  }

  private emitDecisionEvent(decision: AgentDecision): void {
    agentEventBus.emitEvent({
      agentId: this.id,
      type: 'decision_made',
      timestamp: new Date(),
      payload: {
        decision: decision.action,
        reasoning: decision.reasoning,
        alternatives: decision.alternativeActions,
        confidence: decision.confidence,
      },
    });
  }

  private emitActionEvent(result: ActionResult): void {
    agentEventBus.emitEvent({
      agentId: this.id,
      type: 'action_executed',
      timestamp: new Date(),
      payload: {
        action: result.action,
        result: result.result,
        success: result.success,
        duration: 0,
      },
    });
  }

  serialize(): SerializedAgent {
    return {
      id: this.id,
      worldId: this.worldId,
      type: this.type,
      profile: this.profile,
      state: this.state,
      stats: this.stats,
      relationships: [...this.relationshipsMap.entries()].map(([id, rel]) => [
        id,
        { type: rel.type, intimacy: rel.intimacy }
      ] as [string, SimplifiedRelationship]),
    };
  }

  static deserialize(
    data: SerializedAgent,
    repo: Repository,
    llmScheduler: LLMScheduler,
    config: LoreConfig,
  ): AgentRuntime {
    const agent = new AgentRuntime(
      data.id,
      data.worldId,
      data.type,
      data.profile,
      repo,
      llmScheduler,
      config,
      data.stats,
    );
    agent.relationshipsMap = new Map(data.relationships);
    if (data.state.currentLocation) {
      agent.setCurrentLocation(data.state.currentLocation);
    }
    return agent;
  }
}