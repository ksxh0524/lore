import { nanoid } from 'nanoid';
import type {
  AgentType, AgentProfile, AgentState, AgentStats,
  ThoughtFrequency, Relationship as RelationshipType, SerializedAgent,
} from '@lore/shared';
import type { Repository } from '../db/repository.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import { MemoryManager } from './memory.js';
import { ToolRegistry } from './tools.js';
import { registerDefaultTools } from './default-tools.js';
import { buildChatPrompt, buildDecisionPrompt } from '../llm/prompts.js';
import type { LoreConfig } from '../config/loader.js';

export class AgentRuntime {
  readonly id: string;
  readonly worldId: string;
  readonly type: AgentType;

  profile: AgentProfile;
  state: AgentState;
  stats: AgentStats;

  private memoryInstance: MemoryManager;
  private relationshipsMap = new Map<string, RelationshipType>();
  private tools = new ToolRegistry();
  private lastThinkTick = 0;
  private repo: Repository;

  constructor(
    id: string, worldId: string, type: AgentType, profile: AgentProfile,
    repo: Repository, llmScheduler: LLMScheduler, config: LoreConfig,
  ) {
    this.id = id;
    this.worldId = worldId;
    this.type = type;
    this.profile = profile;
    this.state = { status: 'idle', currentActivity: '', currentLocation: '', lastActiveTick: 0 };
    this.stats = { mood: 70, health: 100, energy: 100, money: 1000 };
    this.memoryInstance = new MemoryManager(id, repo, llmScheduler);
    this.repo = repo;
    registerDefaultTools(this.tools, repo);
  }

  get memory(): MemoryManager { return this.memoryInstance; }
  get relationships(): Map<string, RelationshipType> { return this.relationshipsMap; }
  get toolRegistry(): ToolRegistry { return this.tools; }

  getThoughtFrequency(): ThoughtFrequency {
    const rels = [...this.relationshipsMap.values()];
    if (rels.some(r => r.type !== 'stranger' && r.intimacy > 60)) return 'high';
    if (rels.some(r => r.type !== 'stranger')) return 'medium';
    if (rels.length > 0) return 'low';
    return 'minimal';
  }

  shouldThink(currentTick: number): boolean {
    switch (this.getThoughtFrequency()) {
      case 'high': return true;
      case 'medium': return currentTick % 3 === 0;
      case 'low': return currentTick % 8 === 0;
      case 'minimal': return currentTick % 30 === 0;
    }
  }

  getRequiredModel(config: LoreConfig): string {
    switch (this.getThoughtFrequency()) {
      case 'high': return config.llm.defaults.premiumModel;
      case 'medium': return config.llm.defaults.standardModel;
      default: return config.llm.defaults.cheapModel;
    }
  }

  updateStats(): void {
    if (this.state.status === 'sleeping') {
      this.stats.energy = Math.min(100, this.stats.energy + 5);
      if (this.stats.energy >= 80) {
        this.state.status = 'idle';
        this.state.currentActivity = '';
      }
      return;
    }

    this.stats.energy = Math.max(0, this.stats.energy - 0.5);
    if (this.state.status === 'active') {
      this.stats.energy = Math.max(0, this.stats.energy - 0.5);
    }

    const moodBaseline = 50;
    if (this.stats.mood > moodBaseline) {
      this.stats.mood = Math.max(moodBaseline, this.stats.mood - 0.3);
    } else if (this.stats.mood < moodBaseline) {
      this.stats.mood = Math.min(moodBaseline, this.stats.mood + 0.2);
    }

    if (this.stats.energy <= 10) {
      this.state.status = 'sleeping';
      this.state.currentActivity = '休息中';
    }

    this.stats.mood = Math.round(this.stats.mood * 10) / 10;
    this.stats.energy = Math.round(this.stats.energy * 10) / 10;
  }

  async tick(worldState: { currentTime: string; day: number; currentTick: number }, llmScheduler: LLMScheduler, config: LoreConfig): Promise<void> {
    if (this.state.status === 'dead') return;

    this.updateStats();

    if (!this.shouldThink(worldState.currentTick)) return;

    const prompt = buildDecisionPrompt(this, worldState, []);
    const toolDefs = this.tools.toFunctionDefinitions();

    try {
      const result = await llmScheduler.submit({
        agentId: this.id,
        callType: 'decision',
        model: this.getRequiredModel(config),
        messages: prompt,
        tools: toolDefs,
      });

      if (result.toolCalls && result.toolCalls.length > 0) {
        for (const call of result.toolCalls) {
          const tool = this.tools.get(call.name);
          if (tool) {
            const toolResult = await tool.execute(call.args, this);
            await this.memory.add(`执行工具 ${call.name}: ${JSON.stringify(toolResult)}`, 'decision', 0.6);
          }
        }
      } else {
        this.processDecision(result.content);
        await this.memory.add(result.content, 'decision', 0.7);
      }

      this.lastThinkTick = worldState.currentTick;
    } catch (err) {
      console.error(`Agent ${this.id} tick failed:`, err);
    }
  }

  async *chat(userMessage: string, llmScheduler: LLMScheduler, config: LoreConfig): AsyncGenerator<string> {
    const context = this.memory.getContext(2000);
    const messages = buildChatPrompt(this, userMessage, context);
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
    const context = this.memory.getContext(2000);
    const messages = buildChatPrompt(this, userMessage, context);
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

  private processDecision(raw: string): void {
    try {
      const d = JSON.parse(raw);
      if (typeof d.mood_change === 'number') {
        this.stats.mood = Math.max(0, Math.min(100, this.stats.mood + d.mood_change));
      }
      if (d.action) this.state.currentActivity = String(d.action);
      if (d.say) {
        this.state.currentActivity += ` | 说了: ${String(d.say).slice(0, 100)}`;
      }
    } catch {
      this.state.currentActivity = 'thinking';
    }
  }

  serialize(): SerializedAgent {
    return {
      id: this.id, worldId: this.worldId, type: this.type,
      profile: this.profile, state: this.state, stats: this.stats,
      relationships: [...this.relationshipsMap.entries()],
    };
  }

  static deserialize(data: SerializedAgent, repo: Repository, llmScheduler: LLMScheduler, config: LoreConfig): AgentRuntime {
    const agent = new AgentRuntime(data.id, data.worldId, data.type, data.profile, repo, llmScheduler, config);
    agent.state = data.state;
    agent.stats = data.stats;
    agent.relationshipsMap = new Map(data.relationships as Array<[string, RelationshipType]>);
    return agent;
  }
}
