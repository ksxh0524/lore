import type { LLMScheduler } from '../llm/scheduler.js';
import type { Repository } from '../db/repository.js';
import type { PlatformEngine } from '../world/platform-engine.js';
import type { RelationshipManager } from './relationships.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('social');

interface AgentLike {
  id: string;
  worldId: string;
  profile: { name: string; personality: string; speechStyle: string };
  stats: { mood: number };
}

interface FriendRequestData {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}

export class SocialEngine {
  private llmScheduler: LLMScheduler;
  private platformEngine: PlatformEngine;
  private relationshipManager: RelationshipManager;
  private friendRequests: Map<string, FriendRequestData> = new Map();

  constructor(llmScheduler: LLMScheduler, platformEngine: PlatformEngine, relationshipManager: RelationshipManager) {
    this.llmScheduler = llmScheduler;
    this.platformEngine = platformEngine;
    this.relationshipManager = relationshipManager;
  }

  async postSocial(agent: AgentLike, content?: string, platformId?: string): Promise<any> {
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
      ? platforms.find((p: any) => p.id === platformId)
      : platforms[0];

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

    logger.debug({ agentId: agent.id, platform: targetPlatform.name ?? 'unknown' }, 'Social post created');
    return post;
  }

  async likePost(agentId: string, postId: string): Promise<void> {
    await this.platformEngine.likePost(agentId, postId);
  }

  async commentPost(agentId: string, postId: string, content: string): Promise<void> {
    await this.platformEngine.commentPost(agentId, postId, content);
  }

  async sendFriendRequest(fromId: string, toId: string): Promise<FriendRequestData> {
    const request: FriendRequestData = {
      id: nanoid(),
      fromAgentId: fromId,
      toAgentId: toId,
      status: 'pending',
      timestamp: new Date(),
    };
    this.friendRequests.set(request.id, request);
    return request;
  }

  async handleFriendRequest(requestId: string, accept: boolean): Promise<void> {
    const request = this.friendRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      logger.warn({ requestId, status: request?.status }, 'Friend request not found or already handled');
      return;
    }

    request.status = accept ? 'accepted' : 'rejected';

    if (accept) {
      await this.relationshipManager.update(request.fromAgentId, request.toAgentId, {
        intimacy: 10,
        type: 'acquaintance',
        historyEntry: '成为好友',
      });
      logger.info({ fromAgentId: request.fromAgentId, toAgentId: request.toAgentId }, 'Friend request accepted');
    } else {
      logger.debug({ fromAgentId: request.fromAgentId, toAgentId: request.toAgentId }, 'Friend request rejected');
    }
  }

  private async generatePostContent(agent: AgentLike): Promise<string | null> {
    try {
      const provider = this.llmScheduler.getProvider('');
      if (!provider) return null;

      const result = await provider.generateText({
        model: '',
        messages: [
          { role: 'system', content: `你是${agent.profile.name}，性格：${agent.profile.personality}，说话风格：${agent.profile.speechStyle}。当前心情：${agent.stats.mood}/100。请生成一条适合发在社交媒体上的简短动态（1-2句话），只输出动态内容，不要加引号。` },
          { role: 'user', content: '发一条动态' },
        ],
      });

      return result.content.trim() || null;
    } catch {
      return null;
    }
  }
}
