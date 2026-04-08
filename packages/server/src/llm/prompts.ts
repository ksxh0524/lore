import type { AgentProfile, AgentState, AgentStats } from '@lore/shared';

export function buildChatPrompt(
  agent: { profile: AgentProfile; state: AgentState; stats: AgentStats },
  userMessage: string,
  memoryContext: string[],
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
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
- 心情: ${agent.stats.mood}/100
- 精力: ${agent.stats.energy}/100
- 正在: ${agent.state.currentActivity || '空闲'}
- 位置: ${agent.state.currentLocation || '未知'}

## 最近记忆
${memoryContext.join('\n')}

## 规则
- 保持角色一致性
- 根据心情和精力调整语气
- 你可以拒绝、冷淡、热情——完全由你的性格和当前心情决定
- 不要主动透露你的内部数值`,
    },
    ...memoryContext.slice(-4).map(m => ({ role: 'user' as const, content: m })),
    { role: 'user', content: userMessage },
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
- 你可以做任何事——辞职、创业、搬家、表白、拒绝、消失
- 没有任何限制`,
    },
    {
      role: 'user',
      content: pendingEvents.length > 0
        ? `以下事件需要你做出决定：\n${pendingEvents.map(e => e.description).join('\n')}\n\n请返回 JSON：{"action":"做什么","target":"涉及的人","reasoning":"内心想法","mood_change":0,"say":"说了什么"}`
        : '没有待处理事件。根据你当前的状态自主决定做什么。返回 JSON：{"action":"做什么","reasoning":"内心想法","mood_change":0}',
    },
  ];
}

export function buildRandomWorldPrompt(params: { age: number; location: string; background: string }): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: '你是一个世界生成器。创建一个完整、真实、细节丰富的虚拟世界。每个人物都要有完整的生平、性格、人际关系。返回 JSON。' },
    { role: 'user', content: `创建一个虚拟世界：
用户角色：${params.age}岁，地点：${params.location}，背景：${params.background}

返回 JSON 格式：
{
  "worldConfig": { "name": "世界名称", "startTime": "2024-01-01T08:00:00", "location": "详细地点" },
  "userAvatar": { "name": "用户名", "profile": {完整AgentProfile}, "backstory": "背景故事", "initialStats": {mood,health,energy,money} },
  "agents": [{ "name": "人物名", "profile": {完整AgentProfile}, "backstory": "生平", "initialStats": {...} }]
}
生成 5-10 个与用户有关联的初始人物。每个人有独特的性格。` },
  ];
}
