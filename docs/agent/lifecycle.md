# Agent 生命周期

> 最后更新：2026-04-08 | 版本 v0.02

---

## 生命周期状态

```
懒加载创建 --> 运行(idle/active/sleeping) --> 死亡 --> 归档
  ^                                         |
  |                                         v
  +---------- 新生（新角色替代） <------------+
```

## 创建

Agent 的创建是**渐进式**的，不是一次性全部生成。

### 创建时机

| 时机 | 说明 | 例子 |
|------|------|------|
| 世界初始化 | InitAgent 创建用户身边的核心 Agent | 家人、同学/同事 |
| 用户探索新区域 | 用户的生活圈扩大，按需创建新 Agent | 用户上高中 → 创建同学和老师 |
| Agent 扩展社交 | 已有 Agent 的社交圈涉及不存在的 Agent | Agent A 提到朋友 B → 创建 B |
| 世界自然发展 | 新公司成立、新学校开学等 | 新公司需要员工 |
| 预判创建 | 系统预测用户即将接触新场景 | 用户快毕业了 → 预创建大学的人 |

### 创建方式

| 方式 | 说明 | 触发 |
|------|------|------|
| InitAgent 初始化 | 世界首次创建时的核心角色 | 新建世界 |
| 懒加载创建 | 按需创建，LLM 生成完整生平 | 用户探索 / Agent 社交扩展 |
| 预判创建 | 系统预测后提前创建，避免用户等待 | 场景切换前 |
| 上帝模式创建 | 用户在上帝模式下请求创建 | 用户操作 |

### 懒加载创建流程

```typescript
async function lazyCreateAgent(
  context: {
    worldId: string;
    reason: string;
    relatedAgents: string[];
    location: string;
    era?: string;
  },
  llmScheduler: LLMScheduler,
): Promise<AgentRuntime> {
  // 1. 用 LLM 根据上下文生成 Agent 的完整生平
  const prompt = buildLazyCreatePrompt(context);
  const result = await llmScheduler.submit({
    agentId: 'system',
    callType: 'creative',
    model: config.llm.defaults.premiumModel,
    messages: prompt,
  });

  // 2. 解析 Agent 数据
  const agentData = parseAgentData(result.content);

  // 3. 生成冷启动记忆（"这段时间经历了什么"）
  const backstoryPrompt = buildBackstoryPrompt(agentData, context);
  const backstory = await llmScheduler.submit({
    agentId: 'system',
    callType: 'creative',
    model: config.llm.defaults.cheapModel,
    messages: backstoryPrompt,
  });

  // 4. 创建 AgentRuntime
  const agent = new AgentRuntime(
    generateId(),
    context.worldId,
    'npc',
    agentData.profile,
  );
  agent.stats = agentData.initialStats;

  // 5. 注入冷启动记忆
  for (const memory of parseBackstoryMemories(backstory.content)) {
    await agent.memory.add(memory.content, memory.type, memory.importance);
  }

  // 6. 注册到 AgentManager
  return agent;
}
```

### 冷启动问题

懒加载创建的 Agent 没有"过去"的记忆。解决方案：

1. **创建时生成记忆回溯**：用 LLM 为新 Agent 生成"到今天为止的人生经历"
2. **记忆摘要注入**：将生成的经历以记忆条目的形式注入 Agent 的记忆系统
3. **渐进式完善**：初次生成的记忆是简略版，后续每次思考时逐步丰富

## 运行

Agent 的日常运行状态：

| 状态 | 说明 | 能做什么 |
|------|------|---------|
| `idle` | 空闲 | 可以被事件激活 |
| `active` | 活跃 | 正在做某事/与人交互 |
| `sleeping` | 睡眠 | 不处理事件（世界时间夜间） |

所有 Agent 都由 LLM 驱动思考，只是频率不同。详见 [行为引擎](./behavior.md)。

## 死亡

Agent 可能因为以下原因死亡：

| 原因 | 触发条件 |
|------|---------|
| 疾病 | health 降到 0 |
| 意外 | 概率事件（车祸、天灾等） |
| 老年 | 年龄超过阈值 |
| LLM 决策 | Agent 自主选择冒险行为导致死亡 |
| World Agent | 天灾、战争等宏观事件 |

死亡后：
- 状态标记为 `dead`
- 从活跃 Agent 列表移除
- 数据保留（关系、记忆不删除）
- 其他 Agent 收到死亡通知，可能触发悲伤反应
- 关系中的 partner 触发丧偶事件

## 归档

死亡的 Agent 数据归档，不参与 tick 循环，但数据保留用于：
- 时间线回溯查看
- 其他 Agent 的记忆中引用
- 关系历史记录

## UserAvatar

用户在世界中的化身，是特殊的 Agent：

```typescript
export class UserAvatar extends AgentRuntime {
  readonly userId: string;
  // 用户化身不参与自动 tick（用户不操作时不自主行动）
  // 用户可以上传照片、视频
  // 可以在虚拟平台发内容
}
```

---

> 相关文档：[AgentManager](./manager.md) | [AgentRuntime](./runtime.md) | [初始化 Agent](./init-agent.md) | [行为引擎](./behavior.md)
