# 初始化 Agent (InitAgent)

> 最后更新：2026-04-08 | 版本 v0.02

---

初始化 Agent 是一个特殊的系统 Agent，**只在世界首次创建时运行**，负责生成完整的世界和所有角色的生平。

## 定位

InitAgent 不参与世界的日常 tick 循环。它只在创建世界时被调用一次，生成完成后退出。

## 职责

只做一件事：**世界首次初始化**。

| 模式 | 做什么 |
|------|--------|
| 随机模式 | 根据用户的基础参数（年龄、地点、背景），用 LLM 生成完整的世界设定、用户背景、周围的人物及其生平 |
| 历史模式 | 加载历史预设包，用 LLM 补充细节，生成历史人物的完整生平，创建用户魂穿角色 |

**不负责**：后续新增 Agent 的创建（由懒加载机制负责）。

## 接口定义

```typescript
// packages/server/src/agent/init-agent.ts

export type WorldType = 'history' | 'random';

export interface RandomInitParams {
  age: number;
  location: string;
  background: string;
}

export interface HistoryInitParams {
  presetName: string;
  targetCharacter?: string;
}

export interface InitRequest {
  worldType: WorldType;
  randomParams?: RandomInitParams;
  historyParams?: HistoryInitParams;
}

export interface AgentInitData {
  profile: AgentProfile;
  initialStats: AgentStats;
  initialRelationships: Array<{
    targetId: string;
    targetName: string;
    type: RelationshipType;
    intimacy: number;
  }>;
  backstory: string;
}

export interface InitResult {
  worldId: string;
  worldConfig: {
    name: string;
    startTime: Date;
    timeSpeed: number;
    location: string;
    era?: string;
  };
  userAvatar: AgentInitData;
  agents: AgentInitData[];
  worldState: {
    economy: string;
    society: string;
    majorEvents: string[];
  };
}

export class InitAgent {
  private llmScheduler: LLMScheduler;

  constructor(llmScheduler: LLMScheduler) {
    this.llmScheduler = llmScheduler;
  }

  async initialize(request: InitRequest): Promise<InitResult> {
    if (request.worldType === 'history') {
      return this.initHistoryWorld(request.historyParams!);
    }
    return this.initRandomWorld(request.randomParams!);
  }

  private async initRandomWorld(params: RandomInitParams): Promise<InitResult> {
    const prompt = this.buildRandomWorldPrompt(params);
    const result = await this.llmScheduler.submit({
      agentId: 'init-agent',
      callType: 'creative',
      model: config.llm.defaults.premiumModel,
      messages: prompt,
      maxTokens: 8192,
    });
    return this.parseRandomResult(result.content, params);
  }

  private async initHistoryWorld(params: HistoryInitParams): Promise<InitResult> {
    const preset = await this.loadPreset(params.presetName);
    const prompt = this.buildHistoryWorldPrompt(preset, params.targetCharacter);
    const result = await this.llmScheduler.submit({
      agentId: 'init-agent',
      callType: 'creative',
      model: config.llm.defaults.premiumModel,
      messages: prompt,
      maxTokens: 8192,
    });
    return this.parseHistoryResult(result.content, preset);
  }
}
```

## Prompt 模板

### 随机模式

```typescript
private buildRandomWorldPrompt(params: RandomInitParams): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `你是一个世界生成器。你需要创建一个完整、真实、细节丰富的虚拟世界。
生成的每个人物都要有完整的生平、性格、人际关系。不要写模板化的内容，每个人都要独特。`,
    },
    {
      role: 'user',
      content: `请创建一个虚拟世界，参数如下：

用户角色：
- 年龄：${params.age} 岁
- 地点：${params.location}
- 背景：${params.background}

请生成以下内容（JSON 格式）：

{
  "worldConfig": {
    "name": "世界名称",
    "startTime": "世界开始时间",
    "location": "详细地点描述",
    "economy": "经济状况描述",
    "society": "社会环境描述"
  },
  "userAvatar": {
    "name": "用户角色名字",
    "profile": { 完整的 AgentProfile },
    "backstory": "用户的详细背景故事（家庭、成长经历等）",
    "initialStats": { mood, health, energy, money }
  },
  "agents": [
    {
      "name": "人物名字",
      "profile": { 完整的 AgentProfile（含 personality、background、speechStyle、likes、dislikes） },
      "backstory": "这个人物的完整生平",
      "relationship": { "与用户的关系类型", "亲密度" },
      "initialStats": { mood, health, energy, money }
    }
  ],
  "majorEvents": ["近期可能发生的重要事件"]
}

要求：
1. 生成 5-15 个与用户有关联的初始人物（家人、同学/同事、邻居、朋友等）
2. 每个人物有独特的性格和背景，不要模板化
3. 人物之间也有关系（不只是和用户的关系）
4. 背景故事要详细、真实、有血有肉
5. 经济状况要合理（用户是学生就没多少钱，是高管就有钱）`,
    },
  ];
}
```

### 历史模式

```typescript
private buildHistoryWorldPrompt(preset: HistoryPreset, targetCharacter?: string): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `你是一个历史世界生成器。你需要基于真实历史创建一个虚拟世界。
初始数据要尽量符合历史事实，人物性格要基于历史记载。`,
    },
    {
      role: 'user',
      content: `请基于以下历史时期创建虚拟世界：

历史时期：${preset.era}
社会背景：${preset.society}
${targetCharacter ? `用户魂穿目标：${targetCharacter}` : '用户将以自定义身份进入该时代'}

预设人物：
${preset.agents.map(a => `- ${a.name}：${a.description}`).join('\n')}

历史事件：
${preset.events.map(e => `- ${e.time}：${e.description}`).join('\n')}

请生成 JSON 格式的世界数据，包含所有历史人物的完整生平。
用户进入后历史会分叉，不需要控制后续发展符合真实历史。`,
    },
  ];
}
```

## 调用流程

```
用户选择模式 + 设定参数
  |
  v
InitAgent.initialize(request)
  |
  +-- 随机模式:
  |     构建随机世界 Prompt
  |     调 LLM (premiumModel)
  |     解析 JSON 结果
  |
  +-- 历史模式:
        加载预设包
        构建历史世界 Prompt（含预设数据）
        调 LLM (premiumModel)
        解析 JSON 结果
        与预设数据合并
  |
  v
创建 World 记录
创建所有 AgentRuntime
建立关系网络
存入 SQLite
返回 InitResult
```

## 注意事项

- InitAgent 的 LLM 调用使用 **premiumModel**，因为世界初始化的质量直接影响体验
- 生成内容需要做 JSON 格式校验（Zod），失败时重试
- 历史模式下，预设包提供骨架，LLM 补充血肉
- 初始化完成后 InitAgent 不再参与运行

---

> 相关文档：[世界初始化系统](../world/initialization.md) | [Agent 生命周期](./lifecycle.md) | [AgentManager](./manager.md)
