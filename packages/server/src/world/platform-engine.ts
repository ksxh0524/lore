import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import type { PlatformPost } from '@lore/shared';
import { createLogger } from '../logger/index.js';

const logger = createLogger('platform');

export class PlatformEngine {
  private repo: Repository;

  constructor(repo: Repository) { this.repo = repo; }

  async initWorldPlatforms(worldId: string) {
    const defaults = [
      { name: 'TikTok', type: 'video_short' as const },
      { name: 'YouTube', type: 'video_long' as const },
      { name: 'Twitter', type: 'social' as const },
      { name: 'Instagram', type: 'image' as const },
    ];
    for (const p of defaults) {
      await this.repo.createPlatform({ id: nanoid(), worldId, ...p });
    }
    logger.info({ worldId, platforms: defaults.map(p => p.name) }, 'World platforms initialized');
  }

  async post(data: {
    platformId: string; worldId: string; authorId: string;
    authorType: 'agent' | 'user'; content: string; imageUrl?: string;
  }): Promise<PlatformPost> {
    const post = await this.repo.createPlatformPost({
      id: nanoid(), ...data,
    });
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
      comments: (post.comments as any[])?.length ?? 0,
      views: post.views ?? 0,
      timestamp: post.timestamp,
    };
  }

  async likePost(agentId: string, postId: string): Promise<void> {
    const post = await this.repo.getPlatformPost(postId);
    if (post) {
      await this.repo.updatePlatformPost(postId, { likes: (post.likes ?? 0) + 1 });
      logger.debug({ postId, agentId }, 'Post liked');
    }
  }

  async commentPost(agentId: string, postId: string, content: string): Promise<void> {
    const post = await this.repo.getPlatformPost(postId);
    if (!post) return;
    const comments = (post.comments as any[]) ?? [];
    comments.push({ id: nanoid(), authorId: agentId, content, timestamp: new Date().toISOString() });
    await this.repo.updatePlatformPost(postId, { comments });
    logger.debug({ postId, agentId }, 'Comment added');
  }

  async getFeed(platformId: string) {
    return this.repo.getPlatformPosts(platformId);
  }

  async getWorldPlatforms(worldId: string) {
    return this.repo.getWorldPlatforms(worldId);
  }

  async getContentStats(postId: string) {
    const post = await this.repo.getPlatformPost(postId);
    if (!post) return null;
    return { views: post.views ?? 0, likes: post.likes ?? 0, comments: ((post.comments as any[]) ?? []).length };
  }
}
