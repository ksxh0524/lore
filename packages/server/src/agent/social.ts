import type { LLMScheduler } from '../llm/scheduler.js';
import type { Repository } from '../db/repository.js';
import type { PlatformEngine } from '../world/platform-engine.js';
import type { RelationshipManager } from './relationships.js';
import { nanoid } from 'nanoid';

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
      if (!postContent) return null;
    }

    const platforms = await this.platformEngine.getWorldPlatforms(agent.worldId);
    const targetPlatform = platformId
      ? platforms.find((p: any) => p.id === platformId)
      : platforms[0];

    if (!targetPlatform) return null;

    const post = await this.platformEngine.post({
      platformId: targetPlatform.id,
      worldId: agent.worldId,
      authorId: agent.id,
      authorType: 'agent',
      content: postContent,
    });

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
    if (!request || request.status !== 'pending') return;

    request.status = accept ? 'accepted' : 'rejected';

    if (accept) {
      await this.relationshipManager.update(request.fromAgentId, request.toAgentId, {
        intimacy: 10,
        type: 'acquaintance',
        historyEntry: '成为好友',
      });
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
