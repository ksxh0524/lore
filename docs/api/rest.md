# REST API

> 最后更新：2026-04-08 | 版本 v0.02

---

所有端点前缀 `/api`。Phase 1 只实现标记的端点。

## World

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| POST | `/worlds` | 创建世界 | 1 |
| GET | `/worlds/:id` | 获取世界状态 | 1 |
| PUT | `/worlds/:id` | 更新世界配置 | 1 |
| POST | `/worlds/:id/pause` | 暂停世界 | 1 |
| POST | `/worlds/:id/resume` | 恢复世界 | 1 |
| DELETE | `/worlds/:id` | 删除世界 | 1 |

## Initialization

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| POST | `/worlds/init` | 初始化世界（随机/历史模式） | 1 |
| GET | `/worlds/:id/init-status` | 获取初始化进度 | 1 |

## Agent

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/worlds/:id/agents` | 获取世界所有 Agent | 1 |
| GET | `/agents/:id` | 获取 Agent 详情 | 1 |
| POST | `/worlds/:id/agents` | 创建 Agent | 1 |
| PUT | `/agents/:id` | 更新 Agent | 2 |
| DELETE | `/agents/:id` | 删除 Agent | 2 |

## Chat

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/agents/:id/messages` | 获取聊天记录 | 1 |
| POST | `/agents/:id/messages` | 发送消息（非流式） | 1 |
| POST | `/agents/:id/chat` | 流式聊天 | 1 |

## Events

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/worlds/:id/events` | 获取事件列表 | 1 |
| GET | `/events/:id` | 获取事件详情 | 2 |
| POST | `/worlds/:id/events/trigger` | 手动触发事件 | 3 |

## Platform

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/worlds/:id/platforms` | 获取世界平台列表 | 2 |
| GET | `/platforms/:id/feed` | 获取平台内容流 | 2 |
| POST | `/agents/:id/posts` | 发布动态 | 2 |
| POST | `/posts/:id/like` | 点赞 | 2 |
| POST | `/posts/:id/comment` | 评论 | 2 |
| POST | `/user/posts` | 用户发布内容（含图片/视频上传） | 2 |
| GET | `/user/posts/:id/stats` | 用户查看内容数据 | 2 |

## God（上帝模式）

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/god/world/:id/agents` | 查看所有 Agent 完整状态 | 3 |
| GET | `/god/agent/:id` | 查看 Agent 思考过程 | 3 |
| POST | `/god/trigger-event` | 触发世界事件 | 3 |
| GET | `/god/world/:id/world-events` | 查看 World Agent 决策 | 3 |

## Save

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/worlds/:id/saves` | 获取存档列表 | 4 |
| POST | `/worlds/:id/saves` | 创建存档 | 4 |
| POST | `/saves/:id/load` | 加载存档 | 4 |
| DELETE | `/saves/:id` | 删除存档 | 4 |

## Config

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/config` | 获取配置 | 1 |
| PUT | `/config` | 更新配置 | 1 |

## Monitor

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/worlds/:id/monitor` | 世界监控数据 | 3 |
| GET | `/agents/:id/monitor` | Agent 监控数据 | 3 |
| GET | `/worlds/:id/stats` | 世界统计 | 3 |

## Preset

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/presets` | 获取已安装预设 | 4 |
| GET | `/presets/:id` | 获取预设详情 | 4 |
| POST | `/presets/install` | 安装预设 | 4 |
| DELETE | `/presets/:id` | 卸载预设 | 4 |

## Economy

| 方法 | 路径 | 说明 | Phase |
|------|------|------|-------|
| GET | `/agents/:id/economy` | 获取 Agent 经济状态 | 1 |
| POST | `/agents/:id/economy/spend` | Agent 消费 | 1 |
| POST | `/agents/:id/economy/earn` | Agent 获得收入 | 1 |

## 响应格式

```typescript
// 成功
{ data: T }

// 错误
{ error: { code: number, message: string, details?: any } }
```

---

> 相关文档：[WebSocket](./websocket.md) | [数据库 Schema](./database.md)
