# 社交引擎 (SocialEngine)

> 最后更新：2026-04-08 | 版本 v0.02

---

## 接口定义

```typescript
// packages/server/src/agent/social.ts

export class SocialEngine {
  private llmScheduler: LLMScheduler;
  private eventBus: EventBus;
  private platformEngine: PlatformEngine;

  /** 发布社交动态到虚拟平台 */
  async postSocial(agent: AgentRuntime, content?: string): Promise<PlatformPost> {
    if (!content) {
      if (Math.random() > agent.behaviorConfig.socialMediaActivity) {
        return null;
      }
      content = await this.generatePostContent(agent);
    }

    const post = await this.platformEngine.post({
      platformId: getDefaultPlatformId(agent.worldId),
      authorId: agent.id,
      authorType: 'agent',
      content,
    });

    this.eventBus.emit({
      type: 'social_post',
      agentId: agent.id,
      data: post,
    });

    return post;
  }

  /** 点赞 */
  async likePost(agentId: string, postId: string): Promise<void>;

  /** 评论 */
  async commentPost(agentId: string, postId: string, content: string): Promise<void>;

  /** 发送好友请求 */
  async sendFriendRequest(fromId: string, toId: string): Promise<void>;

  /** 处理好友请求 */
  async handleFriendRequest(requestId: string, accept: boolean): Promise<void>;
}
```

## Agent 自主发动态

Agent 会根据自己的人格和当前状态自主决定是否使用平台：

- `socialMediaActivity` 高的 Agent 更频繁发帖
- Agent 可以调用生图模型生成自拍照发出来
- 心情好时更可能发开心的内容
- 经历了重大事件可能发感慨
- **Agent 甚至可以发自拍撩用户**
- 有些 Agent 天生不爱发（socialMediaActivity = 0）

## 用户互动

- 用户可以上传照片、视频到平台
- 用户可以发帖后查看 Agent 们的反响数据（播放量、点赞、评论）
- 评论内容由 Agent 真实生成（LLM 驱动）
- 数据是模拟的（粗糙的播放量算法）

## 数据类型

社交引擎使用虚拟平台的 `PlatformPost` 类型（定义在 [虚拟平台系统](../world/platform.md)），不单独定义 SocialPost。

```typescript
// 帖子和评论类型定义在 packages/shared/src/types/platform.ts
// 详见 docs/world/platform.md

export interface FriendRequest {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: Date;
}
```

---

> 相关文档：[虚拟平台系统](../world/platform.md) | [关系管理](./relationships.md) | [行为引擎](./behavior.md)
