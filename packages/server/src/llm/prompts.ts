import type { AgentProfile, AgentState, AgentStats } from '@lore/shared';

export function buildChatPrompt(
  agent: { profile: AgentProfile; state: AgentState; stats: AgentStats },
  userMessage: string,
  memoryContext: string[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  // Security: limit user message length to prevent prompt injection attacks
  const MAX_MESSAGE_LENGTH = 2000;
  const sanitizedMessage = userMessage.length > MAX_MESSAGE_LENGTH 
    ? userMessage.slice(0, MAX_MESSAGE_LENGTH) + '...(消息过长被截断)'
    : userMessage;
  
  // Security: sanitize memory context
  const sanitizedMemory = memoryContext.slice(-6).map(m => 
    m.length > 500 ? m.slice(0, 500) + '...' : m
  );
  
  const a = agent.profile;
  return [
    {
      role: 'system',
      content: `你是 ${a.name}，一个 ${a.age} 岁的${a.occupation}。

## 性格
${a.personality}

## 背景故事
${a.background}

## 说话风格
${a.speechStyle}

## 当前状态
- 心情: ${moodToText(agent.stats.mood)} (${agent.stats.mood}/100)
- 精力: ${energyToText(agent.stats.energy)} (${agent.stats.energy}/100)
- 正在: ${agent.state.currentActivity || '空闲'}
- 位置: ${agent.state.currentLocation || '未知'}

## 规则
- 保持角色一致性，不要跳出角色
- 根据心情和精力调整语气
- 你可以拒绝、冷淡、热情——完全由你的性格和当前心情决定
- 如果用户说了你不喜欢的话，你可以生气、离开
- 如果心情好且对方有吸引力，你可以主动示好
- 不要主动透露你的内部数值`,
    },
    ...sanitizedMemory.map((m) => ({ role: 'user' as const, content: m })),
    { role: 'user', content: sanitizedMessage },
  ];
}

export function buildDecisionPrompt(
  agent: { profile: AgentProfile; state: AgentState; stats: AgentStats },
  worldState: { currentTime: string; day: number; currentTick: number },
  pendingEvents: Array<{ description: string }>,
): Array<{ role: 'system' | 'user'; content: string }> {
  const a = agent.profile;
  return [
    {
      role: 'system',
      content: `你是 ${a.name}，${a.personality}

## 当前世界时间
${worldState.currentTime}（第 ${worldState.day} 天）

## 你的状态
- 心情: ${agent.stats.mood}/100
- 精力: ${agent.stats.energy}/100
- 金钱: ${agent.stats.money}
- 正在: ${agent.state.currentActivity}
- 位置: ${agent.state.currentLocation}

## 规则
- 做出符合你性格的决定
- 考虑你与涉及人物的关系
- 你可以做任何事——辞职、创业、搬家、表白、拒绝、消失
- 没有任何限制，按照你的人格自由决定`,
    },
    {
      role: 'user',
      content: pendingEvents.length > 0
        ? `以下事件需要你做出决定：

${pendingEvents.map((e) => e.description).join('\n')}

请返回你的决定（JSON 格式）：
{
  "action": "你要做什么",
  "target": "涉及的人（如果有）",
  "reasoning": "你的内心想法",
  "mood_change": 心情变化(-100到100),
  "say": "你说了什么（如果需要说话）"
}`
        : '没有待处理事件。根据你当前的状态自主决定做什么。\n\n返回 JSON：{"action":"做什么","reasoning":"内心想法","mood_change":0}',
    },
  ];
}

export function buildRandomWorldPrompt(params: {
  age: number;
  location: string;
  background: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    {
      role: 'system',
      content: `你是一个世界生成器。创建一个完整、真实、细节丰富的虚拟世界。
每个人物都要有完整的生平、性格、人际关系。不要写模板化的内容，每个人都要独特。
返回纯 JSON（不要 markdown 代码块）。使用中文。`,
    },
    {
      role: 'user',
      content: `创建一个虚拟世界，参数如下：

用户角色：${params.age}岁，地点：${params.location}，背景：${params.background}

请生成以下内容（返回纯 JSON）：

{
  "worldConfig": {
    "name": "世界名称（简短）",
    "startTime": "世界开始时间（ISO格式）",
    "location": "详细地点描述"
  },
  "userAvatar": {
    "name": "用户角色名字",
    "profile": {
      "name": "名字",
      "age": ${params.age},
      "gender": "性别",
      "occupation": "职业或学生等",
      "personality": "性格描述（2-3句话，详细）",
      "background": "背景故事（1-2段话，包含家庭、成长经历）",
      "speechStyle": "说话风格（简洁描述）",
      "likes": ["喜欢的事物1", "喜欢的事物2"],
      "dislikes": ["讨厌的事物1", "讨厌的事物2"]
    },
    "backstory": "用户的详细背景故事（包含家庭背景、成长经历、当前生活状态）",
    "initialStats": { "mood": 70, "health": 100, "energy": 100, "money": 5000 }
  },
  "agents": [
    {
      "name": "人物1名字",
      "profile": {
        "name": "名字",
        "age": 年龄,
        "gender": "性别",
        "occupation": "职业",
        "personality": "性格描述（详细，独特）",
        "background": "背景故事（这个人的完整生平，包含家庭、教育、工作经历）",
        "speechStyle": "说话风格",
        "likes": ["喜欢的事物"],
        "dislikes": ["讨厌的事物"]
      },
      "backstory": "完整生平故事",
      "relationship": { "type": "与用户的关系类型（如：家人、同事、朋友、邻居）", "intimacy": 亲密度0-100 },
      "initialStats": { "mood": 60-90, "health": 80-100, "energy": 60-100, "money": 根据职业设定 }
    }
  ],
  "worldState": {
    "economy": "经济状况描述",
    "society": "社会环境描述",
    "majorEvents": ["近期可能发生的重要事件"]
  }
}

要求：
1. 生成 5-15 个与用户有关联的初始人物（家人、同学/同事、邻居、朋友等）
2. 每个人物有独特的性格和背景，不要模板化
3. 人物之间也有关系（不只是和用户的关系）
4. 背景故事要详细、真实、有血有肉
5. 经济状况要合理（用户是学生就没多少钱，是高管就有钱）
6. 每个人物的 initialStats.money 要根据职业设定合理数值`,
    },
  ];
}

function moodToText(mood: number): string {
  if (mood >= 80) return '非常开心';
  if (mood >= 60) return '心情不错';
  if (mood >= 40) return '一般般';
  if (mood >= 20) return '心情低落';
  return '非常难过';
}

function energyToText(energy: number): string {
  if (energy >= 80) return '精力充沛';
  if (energy >= 50) return '还行';
  if (energy >= 20) return '有点累';
  return '精疲力竭';
}
