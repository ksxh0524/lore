# 世界初始化系统

> 最后更新：2026-04-08 | 版本 v0.02

---

世界初始化是用户进入 Lore 的第一步。系统根据用户选择的模式，通过**初始化 Agent** 生成完整的世界和角色。

## 初始化模式

### 历史模式

基于真实历史时间点创建世界。

**用户输入**：
- 选择历史时期（如"康熙年间"、"2020 年硅谷"、"2017 年北京"）
- 选择魂穿的目标人物（如"八阿哥"、"乔布斯"、"一个普通高中生"）
- 或者选择"自定义人物"进入该时代

**初始化 Agent 做的事**：
1. 加载对应的历史预设包（人物数据、社会背景、重大事件时间线）
2. 根据预设创建该时期的核心 Agent（历史人物、重要角色）
3. 为每个 Agent 生成符合历史背景的完整生平
4. 设定初始世界状态（经济、政治、社会环境）
5. 创建用户角色（魂穿目标），赋予初始状态

**关键点**：
- 初始参数是真实的，但用户进入后历史就分叉了
- 不要求后续发展符合真实历史——用户已经改变了历史
- 历史预设包依赖社区贡献

### 随机模式

完全随机生成一个世界。

**用户输入**：
- 年龄
- 地点（中国、美国、英国、2080 年的火星……）
- 大致背景（学生、上班族、无业……）

**用户不能设定的**：
- 父母是谁
- 家庭背景
- 人际关系
- 周围有哪些人

**初始化 Agent 做的事**：
1. 根据用户设定的基础参数，用 LLM 生成完整的世界设定
2. 生成用户角色的家庭、成长背景
3. 生成初始关联 Agent（父母、同学/同事、邻居等）
4. 为每个 Agent 生成完整的生平
5. 随着用户探索世界扩大，更多 Agent 会被**懒加载创建**

## 初始化 Agent (InitAgent)

初始化 Agent 是一个特殊的系统 Agent，只在世界首次创建时运行。

### 核心职责

只做一件事：**世界首次初始化**。包括生成世界设定、创建初始角色、赋予每个角色完整生平。

### 接口定义

```typescript
// packages/server/src/agent/init-agent.ts

export interface InitRequest {
  worldType: 'history' | 'random';
  historyPreset?: string;        // 历史模式：预设包名称
  targetCharacter?: string;      // 魂穿目标人物
  randomParams?: {
    age: number;
    location: string;
    background: string;
  };
}

export interface InitResult {
  worldId: string;
  worldConfig: WorldConfig;
  userAvatar: AgentProfile;
  agents: Array<{
    profile: AgentProfile;
    initialStats: AgentStats;
    initialRelationships: Array<{ targetId: string; type: RelationshipType; intimacy: number }>;
  }>;
  worldState: {
    time: Date;
    economy: any;
    majorEvents: Array<{ time: Date; description: string }>;
  };
}

export class InitAgent {
  private llmScheduler: LLMScheduler;

  constructor(llmScheduler: LLMScheduler) {
    this.llmScheduler = llmScheduler;
  }

  async initialize(request: InitRequest): Promise<InitResult> {
    if (request.worldType === 'history') {
      return this.initHistoryWorld(request);
    }
    return this.initRandomWorld(request);
  }

  private async initHistoryWorld(request: InitRequest): Promise<InitResult> {
    // 1. 加载历史预设包
    const preset = await this.loadPreset(request.historyPreset);
    // 2. 用 LLM 补充预设中没有的细节
    // 3. 创建历史人物 Agent
    // 4. 创建用户魂穿角色
    // 5. 设定初始世界状态
  }

  private async initRandomWorld(request: InitRequest): Promise<InitResult> {
    // 1. 用 LLM 根据用户参数生成完整世界设定
    // 2. 生成用户角色背景
    // 3. 生成关联 Agent（家人、同学/同事等）
    // 4. 为每个 Agent 生成完整生平
    // 5. 设定初始世界状态
  }
}
```

### Prompt 模板（随机模式）

```typescript
const RANDOM_WORLD_INIT_PROMPT = `你是一个世界生成器。根据以下参数生成一个完整的虚拟世界。

用户参数：
- 年龄：{age}
- 地点：{location}
- 背景：{background}

请生成：
1. 用户角色的完整背景（家庭、成长经历、性格特点）
2. 用户身边的人物（至少 5-10 个有关联的人：家人、同学/同事、邻居、朋友等）
3. 每个人物的完整生平（姓名、年龄、性格、职业、和用户的关系）
4. 当前世界的状态（时间、社会环境、经济状况）

返回 JSON 格式。每个人物要有丰富但合理的细节。`;
```

### Prompt 模板（历史模式）

```typescript
const HISTORY_WORLD_INIT_PROMPT = `你是一个历史世界生成器。根据以下历史时期创建虚拟世界。

历史时期：{era}
用户魂穿目标：{targetCharacter}

请基于真实历史数据：
1. 生成该时期的核心历史人物
2. 为每个人物生成符合历史背景的生平
3. 设定用户角色的初始状态
4. 描述该时期的社会、经济、政治环境

注意：
- 初始数据要尽量符合历史
- 但用户进入后历史会分叉，不需要控制后续发展
- 人物性格要基于历史记载，但可以合理推断补充

返回 JSON 格式。`;
```

## 懒加载 Agent 创建

不是所有 Agent 在世界初始化时都创建。Agent 的创建是渐进式的：

### 创建时机

| 场景 | 说明 |
|------|------|
| 世界初始化 | 创建用户身边的核心 Agent（家人、同学/同事） |
| 用户探索新区域 | 用户上高中 → 创建高中的同学和老师 |
| 用户认识新的人 | 用户去新公司 → 创建同事和老板 |
| Agent 扩展社交 | Agent A 认识了 Agent B（B 尚不存在）→ 按需创建 B |
| 世界自然发展 | 新公司成立、新学校开学等 |

### 创建流程

```typescript
async function lazyCreateAgent(
  context: AgentCreationContext,
  llmScheduler: LLMScheduler,
): Promise<AgentRuntime> {
  // 1. 用 LLM 根据上下文生成完整的 Agent 生平
  //    "这是一个高中的同学，用户15岁，在中国某城市……"
  // 2. 创建 AgentRuntime
  // 3. 设定初始关系
  // 4. 注册到 AgentManager
  // 5. 返回
}
```

### 关键挑战

- **冷启动问题**：用户遇到一个刚创建的 Agent，这个 Agent 没有"过去"的记忆。需要在创建时生成合理的记忆回溯。
- **性能**：懒加载的 Agent 创建需要 LLM 调用，可能有延迟。可以提前预判（用户快到高中了，预先创建同学）。
- **数量控制**：最终可能有上万个 Agent，需要资源管理和回收机制。

## 历史预设包

### 来源

- **社区贡献**：开发者/历史爱好者编写，提交到项目或 GitHub
- **官方内置**：随项目一起分发的几个热门预设
- **动态加载**：从 GitHub 仓库动态下载社区预设

### 预设包结构

```
presets/大明·建文元年/
+-- manifest.yaml       # 元信息
+-- config.yaml         # 世界配置
+-- agents.yaml         # 历史人物列表
+-- events.yaml         # 历史事件时间线
+-- society.yaml        # 社会背景、制度、文化
+-- economy.yaml        # 经济配置
+-- rules.yaml          # 时代特殊规则
+-- assets/             # 图片资源
```

### 社区贡献机制

- 预设使用 YAML 格式，方便非程序员编写
- 内部加载后用 Zod 做校验
- 社区可以提交 PR 到项目仓库
- 未来可以在预设市场浏览、下载、评分

---

> 相关文档：[项目概述](../architecture/overview.md) | [玩家模式](../architecture/player-modes.md) | [预设系统](./presets.md) | [Agent 生命周期](../agent/lifecycle.md)
