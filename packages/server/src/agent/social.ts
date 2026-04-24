import type { LLMScheduler } from '../llm/scheduler.js';
import type { Repository } from '../db/repository.js';
import type { PlatformEngine } from '../world/platform-engine.js';
import type { RelationshipManager } from './relationships.js';
import type { AgentRuntime } from './agent-runtime.js';
import type { platformPosts } from '../db/schema.js';
import type { LoreConfig } from '../config/loader.js';
import type { RelationshipType } from '@lore/shared';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';
import { agentEventBus } from './event-bus.js';

const logger = createLogger('social');

type PlatformPostInsert = typeof platformPosts.$inferInsert;

interface AgentLike {
  id: string;
  worldId: string;
  profile: { name: string; personality: string; speechStyle: string; occupation: string; age: number };
  stats: { mood: number; energy: number; money: number };
  state: { status: string; currentActivity: string };
}

interface SocialInteraction {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  type: 'chat' | 'meet' | 'date' | 'confess' | 'argue' | 'apologize' | 'gift' | 'invite';
  content?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  timestamp: Date;
}

interface SocialDecision {
  shouldInteract: boolean;
  interactionType: SocialInteraction['type'];
  targetAgentId?: string;
  content?: string;
  reasoning: string;
}

interface SocialInteractionTemplate {
  type: 'chat' | 'meet' | 'date' | 'confess' | 'argue' | 'apologize' | 'gift' | 'invite';
  probabilityBase: number;
  minIntimacy: number;
  moodThreshold: number;
  energyCost: number;
  moneyCost?: number;
}

const socialInteractionTemplates: SocialInteractionTemplate[] = [
  { type: 'chat', probabilityBase: 0.15, minIntimacy: 10, moodThreshold: 50, energyCost: 5 },
  { type: 'meet', probabilityBase: 0.08, minIntimacy: 30, moodThreshold: 60, energyCost: 15 },
  { type: 'date', probabilityBase: 0.03, minIntimacy: 50, moodThreshold: 70, energyCost: 25 },
  { type: 'confess', probabilityBase: 0.01, minIntimacy: 60, moodThreshold: 75, energyCost: 10 },
  { type: 'argue', probabilityBase: 0.05, minIntimacy: 20, moodThreshold: 30, energyCost: 15 },
  { type: 'apologize', probabilityBase: 0.02, minIntimacy: 30, moodThreshold: 40, energyCost: 5 },
  { type: 'gift', probabilityBase: 0.02, minIntimacy: 40, moodThreshold: 65, energyCost: 0, moneyCost: 50 },
  { type: 'invite', probabilityBase: 0.05, minIntimacy: 35, moodThreshold: 55, energyCost: 10 },
];

export class SocialEngine {
  private llmScheduler: LLMScheduler;
  private platformEngine: PlatformEngine;
  private relationshipManager: RelationshipManager;
  private repo: Repository;
  private config: LoreConfig | null = null;
  private agentManager: { get: (id: string) => AgentRuntime | undefined } | null = null;
  private pendingInteractions: Map<string, SocialInteraction> = new Map();

  constructor(
    llmScheduler: LLMScheduler,
    platformEngine: PlatformEngine,
    relationshipManager: RelationshipManager,
    repo?: Repository,
  ) {
    this.llmScheduler = llmScheduler;
    this.platformEngine = platformEngine;
    this.relationshipManager = relationshipManager;
    this.repo = repo ?? ({} as Repository);
  }

  setConfig(config: LoreConfig): void {
    this.config = config;
  }

  setRepo(repo: Repository): void {
    this.repo = repo;
  }

  setAgentManager(manager: { get: (id: string) => AgentRuntime | undefined }): void {
    this.agentManager = manager;
  }

  async processSocialTick(agent: AgentLike): Promise<void> {
    if (agent.state.status === 'dead' || agent.state.status === 'sleeping') return;
    if (agent.stats.energy < 30) return;

    const relationships = await this.relationshipManager.getAll(agent.id);
    const nonStrangers = relationships.filter(r => r.type !== 'stranger');

    for (const rel of nonStrangers) {
      const template = socialInteractionTemplates.find(t => {
        if (rel.type === 'enemy' && t.type !== 'argue') return false;
        if ((rel.intimacy ?? 0) < t.minIntimacy) return false;
        if (agent.stats.mood < t.moodThreshold && t.type !== 'argue') return false;
        return true;
      });

      if (!template) continue;

      const adjustedProb = template.probabilityBase * this.getProbabilityMultiplier(rel.type, agent.stats.mood);
      if (Math.random() > adjustedProb) continue;

      const targetAgent = this.agentManager?.get(rel.targetAgentId);
      if (!targetAgent || targetAgent.state.status === 'dead') continue;

      await this.executeSocialInteraction(agent, targetAgent, template.type);
    }

    await this.processPendingInteractions(agent);
    await this.checkPlatformBrowsing(agent);
  }

  private getProbabilityMultiplier(relType: string, mood: number): number {
    const typeMultiplier: Record<string, number> = {
      'close_friend': 2.0,
      'friend': 1.5,
      'dating': 2.5,
      'partner': 3.0,
      'acquaintance': 1.0,
      'enemy': 0.5,
    };
    const moodMultiplier = mood > 70 ? 1.2 : mood < 40 ? 0.8 : 1.0;
    return (typeMultiplier[relType] ?? 1.0) * moodMultiplier;
  }

  private async executeSocialInteraction(
    agent: AgentLike,
    target: AgentRuntime,
    type: SocialInteraction['type'],
  ): Promise<void> {
    const interaction: SocialInteraction = {
      id: nanoid(),
      fromAgentId: agent.id,
      toAgentId: target.id,
      type,
      status: 'pending',
      timestamp: new Date(),
    };

    const template = socialInteractionTemplates.find(t => t.type === type);
    if (!template) return;

    let content: string | undefined;

    switch (type) {
      case 'chat':
        content = await this.generateChatContent(agent, target);
        if (content) {
          await target.deliverMessage(agent.id, agent.profile.name, content);
          await this.relationshipManager.update(agent.id, target.id, {
            intimacy: 2,
            historyEntry: `聊了天`,
          });
          agent.stats.energy -= template.energyCost;
          agent.stats.mood += 5;
          logger.info({ from: agent.id, to: target.id }, 'Agent chat completed');
        }
        break;

      case 'meet':
        content = `${agent.profile.name}想和${target.profile.name}见面`;
        this.pendingInteractions.set(interaction.id, interaction);
        agent.stats.energy -= template.energyCost;
        break;

      case 'date':
        if (target.state.status !== 'idle' && target.state.status !== 'active') {
          logger.debug({ agent: agent.id, target: target.id }, 'Target busy, date postponed');
          return;
        }
        content = await this.generateDateContent(agent, target);
        if (content) {
          agent.stats.energy -= template.energyCost;
          agent.stats.mood += 15;
          target.stats.mood += 10;
          await this.relationshipManager.update(agent.id, target.id, {
            intimacy: 8,
            historyEntry: `约会`,
          });
          logger.info({ from: agent.id, to: target.id }, 'Agent date completed');
        }
        break;

      case 'confess':
        const rel = await this.relationshipManager.get(agent.id, target.id);
        if ((rel?.intimacy ?? 0) < 60) {
          logger.debug({ agent: agent.id, target: target.id }, 'Intimacy too low for confession');
          return;
        }
        content = await this.generateConfessionContent(agent, target);
        if (content) {
          const acceptProbability = await this.calculateConfessionAcceptProbability(agent, target);
          const accepted = Math.random() < acceptProbability;

          if (accepted) {
            await this.relationshipManager.update(agent.id, target.id, {
              type: 'dating',
              intimacy: 15,
              historyEntry: `表白成功，开始恋爱`,
            });
            agent.stats.mood += 25;
            target.stats.mood += 20;
            logger.info({ from: agent.id, to: target.id }, 'Confession accepted');
          } else {
            await this.relationshipManager.update(agent.id, target.id, {
              intimacy: -20,
              historyEntry: `表白被拒绝`,
            });
            agent.stats.mood -= 30;
            target.stats.mood -= 5;
            logger.info({ from: agent.id, to: target.id }, 'Confession rejected');
          }
        }
        break;

      case 'argue':
        content = await this.generateArgueContent(agent, target);
        if (content) {
          agent.stats.mood -= 15;
          target.stats.mood -= 15;
          agent.stats.energy -= template.energyCost;
          await this.relationshipManager.update(agent.id, target.id, {
            intimacy: -15,
            historyEntry: `发生了争执`,
          });
          logger.info({ from: agent.id, to: target.id }, 'Agent argue completed');
        }
        break;

      case 'apologize':
        const argRel = await this.relationshipManager.get(agent.id, target.id);
        if ((argRel?.intimacy ?? 0) < 20) {
          content = await this.generateApologizeContent(agent, target);
          if (content) {
            await this.relationshipManager.update(agent.id, target.id, {
              intimacy: 10,
              historyEntry: `道歉`,
            });
            agent.stats.mood += 5;
            target.stats.mood += 10;
          }
        }
        break;

      case 'gift':
        if (agent.stats.money >= (template.moneyCost ?? 50)) {
          agent.stats.money -= template.moneyCost ?? 50;
          target.stats.mood += 15;
          await this.relationshipManager.update(agent.id, target.id, {
            intimacy: 8,
            historyEntry: `送了礼物`,
          });
          logger.info({ from: agent.id, to: target.id, gift: 'gift' }, 'Gift sent');
        }
        break;

      case 'invite':
        content = await this.generateInviteContent(agent, target);
        if (content) {
          this.pendingInteractions.set(interaction.id, { ...interaction, content });
          agent.stats.energy -= template.energyCost;
        }
        break;
    }

    agentEventBus.emitEvent({
      agentId: agent.id,
      type: 'social_interaction',
      timestamp: new Date(),
      payload: { type, targetId: target.id, content },
    });
  }

  private async calculateConfessionAcceptProbability(agent: AgentLike, target: AgentRuntime): Promise<number> {
    const rel = await this.relationshipManager.get(agent.id, target.id);
    const intimacy = rel?.intimacy ?? 0;
    const targetMood = target.stats.mood;
    const ageCompatibility = Math.abs(agent.profile.age - target.profile.age) < 15 ? 0.1 : -0.1;

    const base = intimacy / 100;
    const moodFactor = targetMood > 70 ? 0.15 : targetMood < 40 ? -0.2 : 0;
    return Math.max(0.1, Math.min(0.9, base + moodFactor + ageCompatibility));
  }

  private async processPendingInteractions(agent: AgentLike): Promise<void> {
    for (const [id, interaction] of this.pendingInteractions) {
      if (interaction.toAgentId === agent.id && interaction.status === 'pending') {
        const shouldAccept = await this.decideInteractionResponse(agent, interaction);
        interaction.status = shouldAccept ? 'accepted' : 'rejected';

        if (shouldAccept) {
          const initiator = this.agentManager?.get(interaction.fromAgentId);
          if (initiator) {
            initiator.stats.mood += 10;
            agent.stats.mood += 8;
            await this.relationshipManager.update(interaction.fromAgentId, agent.id, {
              intimacy: 5,
              historyEntry: `接受邀请`,
            });
          }
        } else {
          const initiator = this.agentManager?.get(interaction.fromAgentId);
          if (initiator) {
            initiator.stats.mood -= 10;
            await this.relationshipManager.update(interaction.fromAgentId, agent.id, {
              intimacy: -5,
              historyEntry: `拒绝邀请`,
            });
          }
        }

        this.pendingInteractions.delete(id);
        logger.debug({ interactionId: id, accepted: shouldAccept }, 'Pending interaction processed');
      }
    }
  }

  private async decideInteractionResponse(agent: AgentLike, interaction: SocialInteraction): Promise<boolean> {
    const rel = await this.relationshipManager.get(agent.id, interaction.fromAgentId);
    if (!rel) return false;

    if (rel.type === 'enemy') return false;

    const intimacy = rel.intimacy ?? 0;
    const moodFactor = agent.stats.mood / 100;
    const energyFactor = agent.stats.energy > 50 ? 0.1 : -0.2;

    const acceptProbability = (intimacy / 100) * 0.7 + moodFactor * 0.2 + energyFactor;
    return Math.random() < acceptProbability;
  }

  async checkPlatformBrowsing(agent: AgentLike): Promise<void> {
    if (Math.random() > 0.1) return;
    if (agent.stats.energy < 40) return;

    const platforms = await this.platformEngine.getWorldPlatforms(agent.worldId);
    if (platforms.length === 0) return;

    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    if (!platform) return;

    const posts = await this.platformEngine.getFeed(platform.id);
    if (posts.length === 0) return;

    const browseCount = Math.min(3, Math.floor(agent.stats.energy / 20));
    for (let i = 0; i < browseCount; i++) {
      const post = posts[Math.floor(Math.random() * posts.length)];
      if (!post) continue;

      if (Math.random() < 0.3) {
        await this.platformEngine.likePost(agent.id, post.id);
        agent.stats.mood += 2;
      }

      if (Math.random() < 0.1 && agent.stats.energy > 50) {
        const comment = await this.generateCommentContent(agent, post.content ?? '');
        if (comment) {
          await this.platformEngine.commentPost(agent.id, post.id, comment);
          agent.stats.energy -= 5;
        }
      }
    }

    agent.stats.energy -= browseCount * 3;
    logger.debug({ agentId: agent.id, browsed: browseCount }, 'Agent browsed platform');
  }

  async postSocial(agent: AgentLike, content?: string, platformId?: string): Promise<PlatformPostInsert | null> {
    let postContent = content;
    if (!postContent) {
      postContent = await this.generatePostContent(agent) ?? undefined;
      if (!postContent) {
        logger.warn({ agentId: agent.id }, 'Failed to generate social post content');
        return null;
      }
    }

    const platforms = await this.platformEngine.getWorldPlatforms(agent.worldId);
    const targetPlatform = platformId
      ? platforms.find((p) => p.id === platformId)
      : platforms[Math.floor(Math.random() * platforms.length)];

    if (!targetPlatform) {
      logger.warn({ agentId: agent.id, worldId: agent.worldId }, 'No platform available for post');
      return null;
    }

    const post = await this.platformEngine.post({
      platformId: targetPlatform.id,
      worldId: agent.worldId,
      authorId: agent.id,
      authorType: 'agent',
      content: postContent,
    });

    agent.stats.energy -= 5;
    agent.stats.mood += 3;

    logger.debug({ agentId: agent.id, platform: targetPlatform.name ?? 'unknown' }, 'Social post created');
    return post;
  }

  async likePost(agentId: string, postId: string): Promise<void> {
    await this.platformEngine.likePost(agentId, postId);
  }

  async commentPost(agentId: string, postId: string, content: string): Promise<void> {
    await this.platformEngine.commentPost(agentId, postId, content);
  }

  private async generateChatContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}和${target.profile.name}聊了聊`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，性格：${agent.profile.personality}，说话风格：${agent.profile.speechStyle}。
你要给${target.profile.name}发一条简短的消息。心情：${agent.stats.mood}/100。只输出消息内容，不要加引号。`,
          },
          { role: 'user', content: '发一条消息给对方' },
        ],
        maxTokens: 100,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}发了一条消息`;
    }
  }

  private async generateDateContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}和${target.profile.name}约会了`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.standardModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.standardModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，正在和${target.profile.name}约会。
描述约会场景（1-2句话）。性格：${agent.profile.personality}。心情：${agent.stats.mood}/100。`,
          },
          { role: 'user', content: '描述约会' },
        ],
        maxTokens: 150,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}和${target.profile.name}一起度过时光`;
    }
  }

  private async generateConfessionContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}向${target.profile.name}表白了`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.standardModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.standardModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，要向${target.profile.name}表白。
生成表白的话（真诚、符合你的性格）。说话风格：${agent.profile.speechStyle}。`,
          },
          { role: 'user', content: '表白' },
        ],
        maxTokens: 100,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}表白了`;
    }
  }

  private async generateArgueContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}和${target.profile.name}争吵了`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，心情不好(${agent.stats.mood}/100)，对${target.profile.name}发火。
生成一句带情绪的话。说话风格：${agent.profile.speechStyle}。`,
          },
          { role: 'user', content: '表达不满' },
        ],
        maxTokens: 80,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}生气了`;
    }
  }

  private async generateApologizeContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}向${target.profile.name}道歉了`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，要向${target.profile.name}道歉。
生成道歉的话。说话风格：${agent.profile.speechStyle}。`,
          },
          { role: 'user', content: '道歉' },
        ],
        maxTokens: 80,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}道歉了`;
    }
  }

  private async generateInviteContent(agent: AgentLike, target: AgentRuntime): Promise<string | undefined> {
    if (!this.config) return `${agent.profile.name}邀请${target.profile.name}一起活动`;

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return undefined;

      const activities = ['吃饭', '看电影', '逛街', '运动', '喝咖啡'];
      const activity = activities[Math.floor(Math.random() * activities.length)];

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，想邀请${target.profile.name}${activity}。
生成邀请的话。说话风格：${agent.profile.speechStyle}。`,
          },
          { role: 'user', content: '邀请对方' },
        ],
        maxTokens: 80,
      });

      return result.content.trim();
    } catch {
      return `${agent.profile.name}发出邀请`;
    }
  }

  private async generateCommentContent(agent: AgentLike, postContent: string): Promise<string | undefined> {
    if (!this.config) return '不错';

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return undefined;

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，性格：${agent.profile.personality}。
看到这条动态：「${postContent.slice(0, 100)}」
生成一条简短评论（1-2句话）。`,
          },
          { role: 'user', content: '评论' },
        ],
        maxTokens: 60,
      });

      return result.content.trim();
    } catch {
      return '挺好的';
    }
  }

  private async generatePostContent(agent: AgentLike): Promise<string | null> {
    if (!this.config) {
      const templates = ['今天心情不错', '有点累了', '遇到一些有趣的事', '分享一下'];
      return templates[Math.floor(Math.random() * templates.length)] ?? null;
    }

    try {
      const provider = this.llmScheduler.getProvider(this.config.llm.defaults.cheapModel);
      if (!provider) return null;

      const result = await provider.generateText({
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system',
            content: `你是${agent.profile.name}，性格：${agent.profile.personality}，说话风格：${agent.profile.speechStyle}。
当前心情：${agent.stats.mood}/100，正在：${agent.state.currentActivity}。
生成一条适合发在社交媒体上的简短动态（1-2句话），只输出动态内容，不要加引号。`,
          },
          { role: 'user', content: '发一条动态' },
        ],
        maxTokens: 100,
      });

      return result.content.trim() || null;
    } catch {
      return null;
    }
  }

  getPendingInteractionsCount(): number {
    return this.pendingInteractions.size;
  }

  clearPendingInteractions(): void {
    this.pendingInteractions.clear();
  }
}