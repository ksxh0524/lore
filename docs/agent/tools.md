# Tools / Skills 框架

> 最后更新：2026-04-08 | 版本 v0.02

---

Agent 可以通过 LLM function calling 使用工具。工具是 Agent 在世界中执行行动的途径——不限制 Agent 使用什么工具，LLM 自主决定。

## ToolRegistry

```typescript
// packages/server/src/agent/tools.ts

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any, agent: AgentRuntime) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  toFunctionDefinitions(): Array<{ name: string; description: string; parameters: any }> {
    return this.getAll().map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}
```

## LLM Function Calling 集成

```typescript
const tools = toolRegistry.toFunctionDefinitions();
const result = await llmProvider.generateText({
  model: agent.getRequiredModel(),
  messages: prompt,
  tools: tools,
});

if (result.toolCalls) {
  for (const call of result.toolCalls) {
    const tool = toolRegistry.get(call.name);
    if (tool) {
      const output = await tool.execute(call.args, agent);
      agent.processToolResult(call.name, output);
    }
  }
}
```

LLM 根据场景自主决定是否使用工具，系统不限制。

## 内置工具

### Phase 1

| 工具 | 说明 |
|------|------|
| `send_message` | 给其他 Agent 发消息 |
| `find_job` | 寻找工作 |
| `buy_item` | 购买东西 |
| `change_location` | 改变当前位置 |
| `start_business` | 基础创业 |

### Phase 2

| 工具 | 说明 |
|------|------|
| `post_social` | 发布社交动态到平台 |
| `generate_selfie` | 生成自拍照（调用生图模型） |
| `check_relationship` | 查看与某人的关系 |
| `send_friend_request` | 发送好友请求 |
| `search_memory` | 搜索自己的记忆 |

### Phase 3+

| 工具 | 说明 |
|------|------|
| `create_company` | 创建公司 |
| `hire_agent` | 招聘 Agent |
| `buy_stock` | 买卖股票 |
| `invest` | 投资 |
| `create_platform` | 创建虚拟平台 |
| `write_code` | 在沙盒中写代码 |

## 工具执行示例

```typescript
const findJobTool: AgentTool = {
  name: 'find_job',
  description: '寻找工作机会。根据你的技能和偏好搜索合适的职位。',
  parameters: {
    type: 'object',
    properties: {
      industry: { type: 'string', description: '目标行业' },
      position: { type: 'string', description: '目标职位' },
      salary_range: { type: 'string', description: '期望薪资范围' },
    },
  },
  execute: async (args, agent) => {
    // 用 LLM 生成面试场景
    // 返回面试结果（通过/不通过）
    // 通过则更新 Agent 的 job 和 income
  },
};

const generateSelfieTool: AgentTool = {
  name: 'generate_selfie',
  description: '生成一张自拍照。可以发到社交平台上。',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: '自拍描述（穿着、场景、表情等）' },
    },
  },
  execute: async (args, agent) => {
    const imageProvider = providerFactory.getImageProvider();
    if (!imageProvider) return { error: 'No image provider configured' };

    const prompt = `${agent.profile.name}的自拍：${args.description}`;
    const result = await imageProvider.generateImage(prompt);
    return { imageUrl: result.url };
  },
};
```

---

> 相关文档：[行为引擎](./behavior.md) | [LLM 调度器](../llm/scheduler.md) | [虚拟平台](../world/platform.md)
