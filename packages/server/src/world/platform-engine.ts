import type { Repository } from '../db/repository.js';
import type { AgentRuntime } from '../agent/agent-runtime.js';
import type { PlatformPost, ChatMessage } from '@lore/shared';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { ImageGenerator } from '../llm/image-generator.js';
import type { LoreConfig } from '../config/loader.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('platform');

export interface Platform {
  id: string;
  worldId: string;
  name: string;
  type: 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job' | 'dating';
  creatorId?: string;
  userCount: number;
  createdAt: Date;
}

export interface PostReaction {
  postId: string;
  agentId: string;
  type: 'like' | 'dislike' | 'share' | 'save';
  timestamp: Date;
}

export interface PlatformFeed {
  platformId: string;
  posts: PlatformPost[];
  totalCount: number;
}

const platformContentTemplates: Record<string, string[]> = {
  video_short: ['分享日常', '吐槽一下', '晒自拍', '展示才艺', '搞笑视频'],
  video_long: ['旅行vlog', '美食探店', '教程分享', '游戏解说', '纪录片'],
  social: ['心情动态', '分享想法', '转发新闻', '提问求助', '吐槽'],
  image: ['自拍', '风景照', '美食', '宠物', '穿搭'],
  forum: ['讨论话题', '分享经验', '求助问题', '公告通知', '资源分享'],
  job: ['求职', '招聘', '职场分享', '面试经验', '薪资讨论'],
  dating: ['交友', '相亲', '约会心得', '情感故事', '恋爱技巧'],
};

export class PlatformEngine {
  private repo: Repository;
  private llmScheduler: LLMScheduler | null = null;
  private imageGenerator: ImageGenerator | null = null;
  private config: LoreConfig | null = null;
  private reactions: Map<string, PostReaction[]> = new Map();

  constructor(repo: Repository) {
    this.repo = repo;
  }

  setLLMScheduler(scheduler: LLMScheduler): void {
    this.llmScheduler = scheduler;
  }

  setImageGenerator(generator: ImageGenerator): void {
    this.imageGenerator = generator;
  }

  setConfig(config: LoreConfig): void {
    this.config = config;
  }

  async initWorldPlatforms(worldId: string): Promise<void> {
    const defaults: Array<{ name: string; type: Platform['type'] }> = [
      { name: '短视频平台', type: 'video_short' },
      { name: '视频网站', type: 'video_long' },
      { name: '社交网络', type: 'social' },
      { name: '图片分享', type: 'image' },
      { name: '论坛社区', type: 'forum' },
    ];

    for (const p of defaults) {
      try {
        await this.repo.createPlatform({
          id: nanoid(),
          worldId,
          ...p,
        });
      } catch {
        continue;
      }
    }

    logger.info({ worldId, platforms: defaults.map(p => p.name) }, 'World platforms initialized');
  }

  async post(data: {
    platformId: string;
    worldId: string;
    authorId: string;
    authorType: 'agent' | 'user';
    content: string;
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<PlatformPost> {
    const postData = {
      id: nanoid(),
      platformId: data.platformId,
      worldId: data.worldId,
      authorId: data.authorId,
      authorType: data.authorType,
      content: data.content,
      imageUrl: data.imageUrl,
      likes: 0,
      views: Math.floor(Math.random() * 100),
      comments: [],
      timestamp: new Date(),
    };
    const post = await this.repo.createPlatformPost(postData);

    logger.debug({ postId: post.id, authorId: data.authorId, platformId: data.platformId }, 'Post created');

    return {
      id: post.id,
      platformId: post.platformId,
      worldId: post.worldId,
      authorId: post.authorId,
      authorType: post.authorType,
      content: post.content,
      imageUrl: post.imageUrl ?? undefined,
      likes: post.likes ?? 0,
      comments: ((post.comments as unknown[]) ?? []).length,
      views: post.views ?? 0,
      timestamp: post.timestamp,
    };
  }

  async likePost(agentId: string, postId: string): Promise<void> {
    const post = await this.repo.getPlatformPost(postId);
    if (!post) return;

    await this.repo.updatePlatformPost(postId, { likes: (post.likes ?? 0) + 1 });

    const reaction: PostReaction = {
      postId,
      agentId,
      type: 'like',
      timestamp: new Date(),
    };

    if (!this.reactions.has(postId)) {
      this.reactions.set(postId, []);
    }
    this.reactions.get(postId)?.push(reaction);

    logger.debug({ postId, agentId }, 'Post liked');
  }

  async unlikePost(agentId: string, postId: string): Promise<void> {
    const post = await this.repo.getPlatformPost(postId);
    if (!post || (post.likes ?? 0) <= 0) return;

    await this.repo.updatePlatformPost(postId, { likes: (post.likes ?? 0) - 1 });

    const reactions = this.reactions.get(postId);
    if (reactions) {
      const index = reactions.findIndex(r => r.agentId === agentId && r.type === 'like');
      if (index !== -1) {
        reactions.splice(index, 1);
      }
    }

    logger.debug({ postId, agentId }, 'Post unliked');
  }

  async commentPost(agentId: string, postId: string, content: string): Promise<void> {
    const post = await this.repo.getPlatformPost(postId);
    if (!post) return;

    const comments = (post.comments as unknown[]) ?? [];
    comments.push({
      id: nanoid(),
      authorId: agentId,
      content: content,
      timestamp: new Date().toISOString(),
      likes: 0,
    });

    await this.repo.updatePlatformPost(postId, { comments });

    logger.debug({ postId, agentId }, 'Comment added');
  }

  async sharePost(agentId: string, postId: string): Promise<PlatformPost | null> {
    const original = await this.repo.getPlatformPost(postId);
    if (!original) return null;

    const sharedPost = await this.post({
      platformId: original.platformId,
      worldId: original.worldId,
      authorId: agentId,
      authorType: 'agent',
      content: `转发：${original.content}`,
    });

    await this.repo.updatePlatformPost(postId, { views: (original.views ?? 0) + 50 });

    logger.debug({ originalPostId: postId, sharedPostId: sharedPost.id, agentId }, 'Post shared');
    return sharedPost;
  }

  async getFeed(platformId: string, limit = 50): Promise<PlatformPost[]> {
    const posts = await this.repo.getPlatformPosts(platformId, limit);
    return posts.map(p => ({
      id: p.id,
      platformId: p.platformId,
      worldId: p.worldId,
      authorId: p.authorId,
      authorType: p.authorType,
      content: p.content,
      imageUrl: p.imageUrl ?? undefined,
      likes: p.likes ?? 0,
      comments: ((p.comments as unknown[]) ?? []).length,
      views: p.views ?? 0,
      timestamp: p.timestamp,
    }));
  }

  async getWorldPlatforms(worldId: string): Promise<Platform[]> {
    const platforms = await this.repo.getWorldPlatforms(worldId);
    return platforms.map(p => ({
      id: p.id,
      worldId: p.worldId,
      name: p.name,
      type: p.type as Platform['type'],
      creatorId: p.creatorId ?? undefined,
      userCount: p.userCount ?? 0,
      createdAt: p.createdAt,
    }));
  }

  async getContentStats(postId: string) {
    const post = await this.repo.getPlatformPost(postId);
    if (!post) return null;
    return {
      views: post.views ?? 0,
      likes: post.likes ?? 0,
      comments: ((post.comments as unknown[]) ?? []).length,
      reactions: this.reactions.get(postId)?.length ?? 0,
    };
  }

  async browsePlatform(agent: AgentRuntime, platformId: string, browseCount = 5): Promise<void> {
    const posts = await this.getFeed(platformId, 20);
    if (posts.length === 0) return;

    const toBrowse = posts.sort(() => Math.random() - 0.5).slice(0, browseCount);

    for (const post of toBrowse) {
      await this.repo.updatePlatformPost(post.id, { views: (post.views ?? 0) + 1 });

      const likeProbability = this.calculateLikeProbability(agent, post);
      if (Math.random() < likeProbability) {
        await this.likePost(agent.id, post.id);
        agent.stats.mood += 3;
      }

      const commentProbability = this.calculateCommentProbability(agent, post);
      if (Math.random() < commentProbability && agent.stats.energy > 50) {
        const comment = await this.generateComment(agent, post);
        if (comment) {
          await this.commentPost(agent.id, post.id, comment);
          agent.stats.energy -= 5;
        }
      }

      agent.stats.energy -= 2;
    }

    await agent.memory.add(`在平台看了${toBrowse.length}条内容`, 'action', 0.3);
    logger.debug({ agentId: agent.id, platformId, browsed: toBrowse.length }, 'Platform browsed');
  }

  private calculateLikeProbability(agent: AgentRuntime, post: PlatformPost): number {
    let probability = 0.2;

    if (post.likes > 100) probability += 0.1;
    if (agent.stats.mood > 70) probability += 0.1;
    if (agent.stats.mood < 40) probability -= 0.1;

    return probability;
  }

  private calculateCommentProbability(agent: AgentRuntime, post: PlatformPost): number {
    let probability = 0.05;

    if (post.content.includes('?') || post.content.includes('？')) probability += 0.1;
    if (agent.stats.mood > 80) probability += 0.05;

    return probability;
  }

  async generateSelfiePrompt(agent: AgentRuntime): Promise<string> {
    const contexts = [
      '在阳光下',
      '在咖啡店',
      '下班后',
      '周末出游',
      '健身之后',
      '庆祝时刻',
      '日常自拍',
    ];

    const context = contexts[Math.floor(Math.random() * contexts.length)]!;
    
    if (this.imageGenerator) {
      try {
        const result = await this.imageGenerator.generateSelfie(
          {
            name: agent.profile.name,
            age: agent.profile.age ?? 25,
            occupation: agent.profile.occupation ?? '未知职业',
            traits: agent.profile.personality?.split(',').slice(0, 3) ?? [],
          },
          context,
        );
        
        if (result.images[0]?.url) {
          logger.info({ agentId: agent.id, context }, 'Selfie image generated');
          return result.images[0].url;
        }
      } catch (error) {
        logger.warn({ agentId: agent.id, error }, 'Selfie generation failed, using fallback');
      }
    }
    
    return `${agent.profile.name}的${context}自拍`;
  }

  async createAgentPost(agent: AgentRuntime, platformId?: string): Promise<PlatformPost | null> {
    const platforms = await this.getWorldPlatforms(agent.worldId);
    if (platforms.length === 0) return null;

    const targetPlatform = platformId
      ? platforms.find(p => p.id === platformId)
      : platforms[Math.floor(Math.random() * platforms.length)];

    if (!targetPlatform) return null;

    const templates = platformContentTemplates[targetPlatform.type] ?? platformContentTemplates.social;
    const template = templates![Math.floor(Math.random() * templates!.length)] ?? '分享';

    const content = await this.generatePostContent(agent, template);
    if (!content) return null;

    const imageUrl = targetPlatform.type === 'image'
      ? (await this.generateSelfiePrompt(agent)) ?? undefined
      : undefined;

    const post = await this.post({
      platformId: targetPlatform.id,
      worldId: agent.worldId,
      authorId: agent.id,
      authorType: 'agent',
      content,
      imageUrl,
    });

    agent.stats.mood += 5;
    agent.stats.energy -= 8;
    await agent.memory.add(`在${targetPlatform.name}发了动态`, 'action', 0.4);

    logger.info({ agentId: agent.id, platform: targetPlatform.name, postId: post.id }, 'Agent post created');
    return post;
  }

  private async generatePostContent(agent: AgentRuntime, template: string): Promise<string | null> {
    if (!this.config || !this.llmScheduler) {
      return `${agent.profile.name}${template}`;
    }

    try {
      const result = await this.llmScheduler.submit({
        agentId: agent.id,
        callType: 'social',
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system' as const,
            content: `你是${agent.profile.name}，性格：${agent.profile.personality}，说话风格：${agent.profile.speechStyle}。
心情：${agent.stats.mood}/100。要发一条社交媒体动态，主题是"${template}"。
只输出动态内容，不要加引号，简短有趣。`,
          },
          { role: 'user' as const, content: '发动态' },
        ],
        maxTokens: 100,
      });

      return result.content.trim() || null;
    } catch {
      return `${agent.profile.name}${template}`;
    }
  }

  private async generateComment(agent: AgentRuntime, post: PlatformPost): Promise<string | null> {
    if (!this.config || !this.llmScheduler) {
      const comments = ['不错', '有意思', '赞同', '支持', '加油'];
      return comments[Math.floor(Math.random() * comments.length)] ?? null;
    }

    try {
      const result = await this.llmScheduler.submit({
        agentId: agent.id,
        callType: 'social',
        model: this.config.llm.defaults.cheapModel,
        messages: [
          {
            role: 'system' as const,
            content: `你是${agent.profile.name}，性格：${agent.profile.personality}。
看到这条动态：「${post.content.slice(0, 100)}」
生成一条简短评论（1-2句话）。`,
          },
          { role: 'user' as const, content: '评论' },
        ],
        maxTokens: 50,
      });

      return result.content.trim() || null;
    } catch {
      return '不错的分享';
    }
  }

  async getHotPosts(worldId: string, limit = 10): Promise<PlatformPost[]> {
    const allPosts = await this.repo.getAllPlatforms(worldId);
    const sorted = allPosts
      .sort((a, b) => ((b.likes ?? 0) + (b.views ?? 0)) - ((a.likes ?? 0) + (a.views ?? 0)))
      .slice(0, limit);

    return sorted.map(p => ({
      id: p.id,
      platformId: p.platformId,
      worldId: p.worldId,
      authorId: p.authorId,
      authorType: p.authorType,
      content: p.content,
      imageUrl: p.imageUrl ?? undefined,
      likes: p.likes ?? 0,
      comments: ((p.comments as unknown[]) ?? []).length,
      views: p.views ?? 0,
      timestamp: p.timestamp,
    }));
  }

  async createPlatform(data: { worldId: string; name: string; type: Platform['type']; creatorId?: string }): Promise<Platform> {
    const platform = await this.repo.createPlatform({
      id: nanoid(),
      worldId: data.worldId,
      name: data.name,
      type: data.type as 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job' | 'dating',
    });

    logger.info({ platformId: platform.id, name: data.name, type: data.type }, 'Platform created');
    return {
      id: platform.id,
      worldId: platform.worldId,
      name: platform.name,
      type: platform.type as Platform['type'],
      creatorId: platform.creatorId ?? undefined,
      userCount: platform.userCount ?? 0,
      createdAt: platform.createdAt,
    };
  }

  getReactions(postId: string): PostReaction[] {
    return this.reactions.get(postId) ?? [];
  }

  hasLiked(postId: string, agentId: string): boolean {
    const reactions = this.reactions.get(postId);
    return reactions?.some(r => r.agentId === agentId && r.type === 'like') ?? false;
  }
}