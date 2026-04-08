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

    if (request.worldType === 'history' && request.historyParams) {
      return this.initHistoryWorld(worldId, request.historyParams);
    }

    if (request.worldType === 'random' && request.randomParams) {
      return this.initRandomWorld(worldId, request.randomParams);
    }

    return this.initRandomWorld(worldId, { age: 25, location: '上海', background: '上班族' });
  }

  private async initHistoryWorld(worldId: string, params: { presetName: string; targetCharacter?: string }): Promise<InitResult> {
    const prompt = [
      { role: 'system' as const, content: `你是一个历史世界构建大师。用户要求穿越到"${params.presetName}"时代。请生成一个符合该时代的完整世界，包括5-8个历史人物。输出JSON格式：{"worldConfig":{"name":"...","startTime":"ISO时间","location":"..."},"agents":[{"name":"...","age":25,"gender":"男/女","occupation":"...","personality":"...","backstory":"...","speechStyle":"...","initialStats":{"mood":70,"health":100,"energy":100,"money":500}}],"userAvatar":{"name":"玩家","profile":{"name":"玩家","age":20,"gender":"unknown","occupation":"...","personality":"由你定义","background":"","speechStyle":"随意","likes":[],"dislikes":[]},"initialStats":{"mood":70,"health":100,"energy":100,"money":1000},"backstory":"..."}}` },
      { role: 'user' as const, content: `请生成"${params.presetName}"的历史世界。${params.targetCharacter ? `用户想成为：${params.targetCharacter}` : ''}` },
    ];

    let worldData: any;
    try {
      const result = await this.llmScheduler.submit({
        agentId: 'init-agent',
        callType: 'creative',
        model: this.config.llm.defaults.premiumModel,
        messages: prompt,
        maxTokens: 4096,
      });
      worldData = JSON.parse(result.content);
    } catch {
      worldData = this.generateHistoryFallback(params.presetName);
    }

    await this.repo.createWorld({
      id: worldId,
      name: worldData.worldConfig?.name ?? `${params.presetName}`,
      type: 'history',
      historyPreset: params.presetName,
    });

    const agents: InitResult['agents'] = [];
    for (const raw of worldData.agents ?? []) {
      const profile: AgentProfile = raw.profile ?? {
        name: raw.name ?? 'NPC', age: raw.age ?? 25, gender: raw.gender ?? 'unknown',
        occupation: raw.occupation ?? '平民', personality: raw.personality ?? '普通',
        background: raw.backstory ?? raw.background ?? '', speechStyle: raw.speechStyle ?? '文言风',
        likes: raw.likes ?? [], dislikes: raw.dislikes ?? [],
      };
      const stats: AgentStats = raw.initialStats ?? { mood: 70, health: 100, energy: 100, money: 500 };
      agents.push({ name: profile.name, profile, initialStats: stats, backstory: raw.backstory ?? '' });
    }

    const userAvatar: InitResult['userAvatar'] = {
      name: worldData.userAvatar?.name ?? '玩家',
      profile: worldData.userAvatar?.profile ?? {
        name: '玩家', age: 20, gender: 'unknown', occupation: params.targetCharacter ?? '穿越者',
        personality: '由你定义', background: '', speechStyle: '随意', likes: [], dislikes: [],
      },
      initialStats: worldData.userAvatar?.initialStats ?? { mood: 70, health: 100, energy: 100, money: 1000 },
      backstory: worldData.userAvatar?.backstory ?? '',
    };

    await this.repo.updateWorld(worldId, { status: 'running' });

    return {
      worldId,
      worldConfig: {
        name: worldData.worldConfig?.name ?? params.presetName,
        startTime: worldData.worldConfig?.startTime ?? new Date().toISOString(),
        location: worldData.worldConfig?.location ?? '中国',
      },
      userAvatar,
      agents,
    };
  }

  private generateHistoryFallback(presetName: string): any {
    const names = ['李明', '赵云', '张华', '王昭', '陈安', '刘禅', '杨妃'];
    const occupations = ['将军', '文官', '商人', '农夫', '工匠', '书生', '宫女'];
    return {
      worldConfig: { name: `${presetName}`, startTime: new Date().toISOString(), location: '中国' },
      userAvatar: {
        name: '玩家', profile: { name: '玩家', age: 20, gender: 'unknown', occupation: '穿越者', personality: '由你定义', background: '', speechStyle: '随意', likes: [], dislikes: [] },
        initialStats: { mood: 70, health: 100, energy: 100, money: 1000 }, backstory: '',
      },
      agents: names.map((name, i) => ({
        name, age: 20 + Math.floor(Math.random() * 30), gender: i % 2 === 0 ? '男' : '女',
        occupation: occupations[i], personality: '沉稳',
        backstory: `${name}是${presetName}时代的一个${occupations[i]}`,
        speechStyle: '文雅',
        profile: { name, age: 25, gender: i % 2 === 0 ? '男' : '女', occupation: occupations[i], personality: '沉稳', background: '', speechStyle: '文雅', likes: [], dislikes: [] },
        initialStats: { mood: 70, health: 100, energy: 100, money: 500 },
      })),
    };
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
