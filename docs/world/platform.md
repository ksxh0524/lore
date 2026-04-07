# 虚拟平台系统

> 最后更新：2026-04-08 | 版本 v0.02

---

虚拟平台是世界内部的"基础设施"——YouTube、TikTok、Twitter 等模拟平台。Agent 们会使用这些平台，用户也可以在这些平台上发内容。

## 核心概念

世界内部存在虚拟的平台生态。这些平台和现实世界中的平台类似，但内部的内容完全由 Agent 和用户生成。

### 平台类型

| 平台类型 | 说明 | Agent 行为 |
|---------|------|-----------|
| 短视频（TikTok） | 短视频内容平台 | Agent 发布短视频、刷视频、点赞评论 |
| 长视频（YouTube） | 长视频内容平台 | Agent 发布视频内容、订阅、评论 |
| 社交（Twitter/微博） | 短文字社交平台 | Agent 发推、转发、评论 |
| 图片（Instagram） | 图片分享平台 | Agent 发自拍、风景照（调用生图模型） |
| 论坛（Reddit/贴吧） | 讨论社区 | Agent 参与讨论、发帖 |
| 求职（LinkedIn/BOSS） | 职业社交 | Agent 找工作、发布职位 |

### 平台本身也可以是 Agent 创建的

- Agent 可以创业创建新的平台
- 用户也可以创业创建新平台
- 平台有用户量、活跃度等模拟数据

## Phase 1 基础版

Phase 1 实现最基础的社交平台功能：

| 能力 | 说明 |
|------|------|
| Agent 发帖 | Agent 可以发布文字内容 |
| Agent 点赞/评论 | Agent 可以互动 |
| 用户发帖 | 用户可以发布内容 |
| 用户上传图片 | 用户可以上传照片 |
| 模拟数据 | 播放量、点赞数等基础数据 |
| 用户查看反响 | 用户发内容后看 Agent 们的反应 |

## Phase 2+ 扩展

| 能力 | 说明 | Phase |
|------|------|-------|
| Agent 调用生图模型发自拍 | Agent 生成图片发到平台 | 2 |
| Agent 发布视频内容 | 文字描述的视频内容模拟 | 2 |
| 用户上传视频 | 用户上传真实视频 | 3 |
| 平台模拟播放量/推荐算法 | 粗糙模拟推荐系统 | 3 |
| Agent 创业创建平台 | Agent 创建新的平台产品 | 4 |
| 完整的平台生态 | 多个平台竞争、用户迁移 | 5 |

## 接口定义

```typescript
// packages/server/src/world/platform.ts

export interface VirtualPlatform {
  id: string;
  worldId: string;
  name: string;
  type: 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job';
  creator?: string;              // 创建者 Agent ID（如果是 Agent 创业创建的）
  userCount: number;             // 模拟用户数
  posts: PlatformPost[];
}

export interface PlatformPost {
  id: string;
  platformId: string;
  authorId: string;              // Agent ID 或 'user'
  authorType: 'agent' | 'user';
  content: string;
  imageUrl?: string;             // 生成的图片或用户上传的图片
  videoUrl?: string;             // 用户上传的视频
  likes: number;
  comments: PlatformComment[];
  views: number;                 // 模拟播放量
  timestamp: Date;
}

export interface PlatformComment {
  id: string;
  authorId: string;
  authorType: 'agent' | 'user';
  content: string;
  timestamp: Date;
}

export class PlatformEngine {
  private platforms: Map<string, VirtualPlatform> = new Map();
  private llmScheduler: LLMScheduler;

  /** 发布内容 */
  async post(request: {
    platformId: string;
    authorId: string;
    authorType: 'agent' | 'user';
    content: string;
    imageUrl?: string;
    videoUrl?: string;
  }): Promise<PlatformPost> {
    const post: PlatformPost = {
      id: generateId(),
      platformId: request.platformId,
      authorId: request.authorId,
      authorType: request.authorType,
      content: request.content,
      imageUrl: request.imageUrl,
      videoUrl: request.videoUrl,
      likes: 0,
      comments: [],
      views: Math.floor(Math.random() * 100),
      timestamp: new Date(),
    };

    await this.db.insertPost(post);

    this.eventBus.emit({
      type: 'platform_post',
      data: post,
    });

    return post;
  }

  /** Agent 生成对内容的反应（点赞/评论/忽略） */
  async generateAgentReaction(agentId: string, post: PlatformPost): Promise<void> {
    // Agent 根据自己的人格决定是否点赞/评论
    // 由 LLM 驱动
  }

  /** 模拟播放量增长 */
  simulateViews(postId: string): void {
    // 粗糙的播放量模拟算法
  }

  /** 用户查看自己内容的数据 */
  async getContentStats(postId: string): Promise<ContentStats> {
    const post = await this.db.getPost(postId);
    return {
      views: post.views,
      likes: post.likes,
      comments: post.comments.length,
      agentReactions: post.comments.filter(c => c.authorType === 'agent'),
    };
  }
}
```

## Agent 自主使用平台

Agent 会根据自己的行为配置自主决定是否使用平台：

- `socialMediaActivity` 高的 Agent 更频繁发帖
- Agent 可以调用生图模型生成自拍照发出来
- Agent 会浏览平台、点赞、评论
- Agent 发的内容完全由 LLM 生成，体现其人格
- **Agent 甚至可以发自拍撩用户**——"哥哥，你觉得我今天好看吗？"

## 用户使用平台

用户在平台上的行为：

- 发布文字、上传照片/视频
- 浏览 Agent 们发的内容
- 点赞、评论
- **投放测试**：发一条内容，看 Agent 们的反响数据
- 数据是粗糙的模拟，但评论内容是 Agent 真实生成的

## 模拟数据

平台数据是模拟的，不需要真正实现推荐算法：

```typescript
function simulateViewCount(post: PlatformPost, worldTime: Date): number {
  const hoursSincePost = (worldTime.getTime() - post.timestamp.getTime()) / 3600000;
  const baseViews = Math.floor(Math.random() * 1000);
  const decay = Math.exp(-hoursSincePost / 24);
  return Math.floor(baseViews * decay);
}
```

- 播放量：基于时间衰减的随机数
- 点赞数：播放量的一定比例
- 评论：由 Agent 真实生成
- 不需要真正的推荐算法，粗糙模拟即可

---

> 相关文档：[项目概述](../architecture/overview.md) | [社交引擎](../agent/social.md) | [多模态](../llm/providers.md)
