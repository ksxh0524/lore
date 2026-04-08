import type { InitRequest, InitResult, AgentProfile, AgentStats } from '@lore/shared';
import { nanoid } from 'nanoid';
import type { LLMScheduler } from '../llm/scheduler.js';
import type { Repository } from '../db/repository.js';
import { buildRandomWorldPrompt } from '../llm/prompts.js';
import type { LoreConfig } from '../config/loader.js';

export class InitAgent {
  private llmScheduler: LLMScheduler;
  private repo: Repository;
  private config: LoreConfig;

  constructor(llmScheduler: LLMScheduler, repo: Repository, config: LoreConfig) {
    this.llmScheduler = llmScheduler;
    this.repo = repo;
    this.config = config;
  }

  async initialize(request: InitRequest): Promise<InitResult> {
    const worldId = nanoid();

    if (request.worldType === 'random' && request.randomParams) {
      return this.initRandomWorld(worldId, request.randomParams);
    }

    return this.initRandomWorld(worldId, { age: 25, location: '上海', background: '上班族' });
  }

  private async initRandomWorld(worldId: string, params: { age: number; location: string; background: string }): Promise<InitResult> {
    const prompt = buildRandomWorldPrompt(params);

    let worldData: any;
    try {
      const result = await this.llmScheduler.submit({
        agentId: 'init-agent',
        callType: 'creative',
        model: this.config.llm.defaults.premiumModel,
        messages: prompt,
        maxTokens: 4096,
      });
      const parsed = JSON.parse(result.content);
      if (parsed.agents && Array.isArray(parsed.agents)) {
        worldData = parsed;
      } else {
        worldData = this.generateFallbackWorld(params);
      }
    } catch {
      worldData = this.generateFallbackWorld(params);
    }

    await this.repo.createWorld({
      id: worldId,
      name: worldData.worldConfig?.name ?? `随机世界-${worldId.slice(0, 6)}`,
      type: 'random',
    });

    const agents: InitResult['agents'] = [];
    const rawAgents = worldData.agents ?? [];
    for (const raw of rawAgents) {
      const profile: AgentProfile = raw.profile ?? {
        name: raw.name ?? 'NPC',
        age: raw.age ?? 25,
        gender: raw.gender ?? 'unknown',
        occupation: raw.occupation ?? '无业',
        personality: raw.personality ?? '普通',
        background: raw.backstory ?? raw.background ?? '',
        speechStyle: raw.speechStyle ?? '随意',
        likes: raw.likes ?? [],
        dislikes: raw.dislikes ?? [],
      };
      const stats: AgentStats = raw.initialStats ?? { mood: 70, health: 100, energy: 100, money: 1000 };
      agents.push({ name: profile.name, profile, initialStats: stats, backstory: raw.backstory ?? '' });
    }

    const userAvatar: InitResult['userAvatar'] = {
      name: worldData.userAvatar?.name ?? '玩家',
      profile: worldData.userAvatar?.profile ?? {
        name: '玩家', age: params.age, gender: 'unknown',
        occupation: params.background, personality: '由你定义',
        background: '', speechStyle: '随意', likes: [], dislikes: [],
      },
      initialStats: worldData.userAvatar?.initialStats ?? { mood: 70, health: 100, energy: 100, money: 5000 },
      backstory: worldData.userAvatar?.backstory ?? '',
    };

    await this.repo.updateWorld(worldId, { status: 'running' });

    return {
      worldId,
      worldConfig: {
        name: worldData.worldConfig?.name ?? '随机世界',
        startTime: worldData.worldConfig?.startTime ?? new Date().toISOString(),
        location: worldData.worldConfig?.location ?? params.location,
      },
      userAvatar,
      agents,
    };
  }

  private generateFallbackWorld(params: { age: number; location: string; background: string }): any {
    const names = ['小美', '阿杰', '王姐', '老陈', '小李', '张伟', '小芳'];
    const occupations = ['程序员', '设计师', '老师', '外卖员', '销售', '学生', '厨师'];
    const personalities = ['热情开朗', '沉默寡言', '温柔体贴', '古灵精怪', '稳重踏实', '活泼好动', '淡定从容'];

    const agents = names.map((name, i) => ({
      name,
      age: 20 + Math.floor(Math.random() * 30),
      gender: i % 2 === 0 ? '女' : '男',
      occupation: occupations[i] ?? '无业',
      personality: personalities[i] ?? '普通',
      backstory: `${name}是一个生活在${params.location}的普通人。`,
      speechStyle: '随意',
      profile: {
        name, age: 20 + Math.floor(Math.random() * 30),
        gender: i % 2 === 0 ? '女' : '男',
        occupation: occupations[i] ?? '无业',
        personality: personalities[i] ?? '普通',
        background: `${name}是一个生活在${params.location}的普通人。`,
        speechStyle: '随意', likes: [], dislikes: [],
      },
      initialStats: { mood: 60 + Math.floor(Math.random() * 30), health: 100, energy: 80, money: 1000 + Math.floor(Math.random() * 5000) },
    }));

    return {
      worldConfig: { name: `${params.location}的世界`, startTime: new Date().toISOString(), location: params.location },
      userAvatar: {
        name: '玩家',
        profile: { name: '玩家', age: params.age, gender: 'unknown', occupation: params.background, personality: '由你定义', background: '', speechStyle: '随意', likes: [], dislikes: [] },
        initialStats: { mood: 70, health: 100, energy: 100, money: 5000 },
        backstory: `一个${params.age}岁的${params.background}，生活在${params.location}。`,
      },
      agents,
    };
  }
}
