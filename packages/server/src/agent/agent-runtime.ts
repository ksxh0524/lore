import type {
  AgentType,
  AgentProfile,
  AgentState,
  AgentStats,
  ThoughtFrequency,
  Relationship as RelationshipType,
  SerializedAgent,
} from '@lore/shared';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import { MemoryManager } from './memory.js';
import { ToolRegistry } from './tools.js';
import { registerDefaultTools } from './default-tools.js';
import { AgentStateMachine } from './state-machine.js';
import { agentEventBus } from './event-bus.js';
import { StatsManager, type StatChange } from './stats-manager.js';
import { nanoid } from 'nanoid';
import type { LoreConfig } from '../config/loader.js';
import { buildDecisionPrompt, buildChatPrompt } from '../llm/prompts.js';

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
  private relationshipsMap = new Map<string, RelationshipType>();
  private tools = new ToolRegistry();

  private lastThinkTick = 0;
  private lastDecision: AgentDecision | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3;

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

  get relationships(): Map<string, RelationshipType> {
    return this.relationshipsMap;
  }

  get toolRegistry(): ToolRegistry {
    return this.tools;
  }

  get status() {
    return this.stateMachine.getState();
  }

  getCurrentActivity(): string {
    return this.lastDecision?.action || '空闲';
  }

  getCurrentLocation(): string {
    return '未知地点';
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
      }
    } catch (err) {
      this.consecutiveFailures++;
      console.error(`Agent ${this.id} tick failed:`, err);
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        await this.fallbackBehavior();
        this.consecutiveFailures = 0;
      }
    }
  }

  private handleAutoStateTransitions(): void {
    const currentState = this.stateMachine.getState();
    if (currentState !== 'sleeping' && currentState !== 'dead') {
      if (this.statsManager.shouldSleep()) {
        this.transitionTo('sleeping', '能量耗尽，自动进入睡眠');
      }
    }
    if (currentState === 'sleeping' && this.statsManager.canWakeUp()) {
      this.transitionTo('idle', '精力恢复，自动醒来');
    }
    if (currentState !== 'dead' && this.stats.health <= 0) {
      this.transitionTo('dead', '健康值归零');
    }
  }

  private async makeDecision(
    worldState: { currentTime: string; day: number; currentTick: number },
    llmScheduler: LLMScheduler,
    config: LoreConfig,
  ): Promise<AgentDecision | null> {
    const prompt = buildDecisionPrompt(this, worldState, []);
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
      const parsed = JSON.parse(content);
      return {
        action: String(parsed.action || '思考'),
        target: parsed.target ? String(parsed.target) : undefined,
        reasoning: String(parsed.reasoning || '没有特别的理由'),
        moodChange: Number(parsed.moodChange || 0),
        say: parsed.say ? String(parsed.say) : undefined,
        toolCalls: toolCalls,
        alternativeActions: Array.isArray(parsed.alternativeActions) ? parsed.alternativeActions : undefined,
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence || 0.5))),
      };
    } catch {
      return {
        action: '思考',
        reasoning: content.slice(0, 200),
        moodChange: 0,
        confidence: 0.3,
      };
    }
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

    let toolResult: unknown = null;
    let success = true;

    if (decision.toolCalls && decision.toolCalls.length > 0) {
      for (const call of decision.toolCalls) {
        const tool = this.tools.get(call.name);
        if (tool) {
          try {
            toolResult = await tool.execute(call.args, this);
            await this.memory.add(`执行了 ${call.name}: ${JSON.stringify(toolResult)}`, 'decision', 0.6);
          } catch (err) {
            success = false;
            toolResult = { error: String(err) };
          }
        }
      }
    }

    this.updateStateFromAction(decision.action);
    this.applyStatChanges(statChanges);

    return {
      success,
      action: decision.action,
      result: toolResult,
      statChanges,
      memory: decision.say,
    };
  }

  private updateStateFromAction(action: string): void {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('工作') || actionLower.includes('上班')) {
      this.transitionTo('working', '开始工作');
    } else if (actionLower.includes('休息') || actionLower.includes('睡觉')) {
      this.transitionTo('sleeping', '决定休息');
    } else if (actionLower.includes('社交') || actionLower.includes('聊天')) {
      this.transitionTo('socializing', '开始社交');
    } else if (actionLower.includes('移动') || actionLower.includes('去')) {
      this.transitionTo('traveling', '开始移动');
    } else {
      this.transitionTo('active', '开始活动');
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
      relationships: [...this.relationshipsMap.entries()],
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
    agent.relationshipsMap = new Map(data.relationships as Array<[string, RelationshipType]>);
    return agent;
  }
}
