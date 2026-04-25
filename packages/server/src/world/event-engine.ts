import type { WorldEvent, EventConsequence, AgentStats, ChatMessage } from '@lore/shared';
import type { WorldClock } from './clock.js';
import type { WorldAgent, WorldStateSummary } from './world-agent.js';
import type { AgentManager } from '../agent/agent-manager.js';
import type { Repository } from '../db/repository.js';
import type { RelationshipManager } from '../agent/relationships.js';
import type { LoreConfig } from '../config/loader.js';
import type { LLMScheduler } from '../llm/scheduler.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('event-engine');

interface AgentLike {
  id: string;
  worldId: string;
  profile: { name: string; occupation: string; age: number; gender: string };
  stats: AgentStats;
  state: { status: string; currentActivity: string };
}

interface RelationshipInfo {
  agentId: string;
  targetId: string;
  type: string;
  intimacy: number;
}

interface ContextualEvent {
  category: string;
  description: string;
  probability: number;
  priority: number;
  conditions: (agent: AgentLike, relationships: RelationshipInfo[], time: Date) => boolean;
  statChanges: Partial<AgentStats>;
  relationshipEffect?: { targetCondition: string; delta: number };
  generateDescription?: (agent: AgentLike) => string;
}

const contextualEvents: ContextualEvent[] = [
  {
    category: 'career_success',
    description: '工作表现出色，得到了认可',
    probability: 0.08,
    priority: 45,
    conditions: (agent, _, time) => {
      const hour = time.getHours();
      return hour >= 9 && hour <= 18 &&
        agent.profile.occupation !== '' &&
        agent.stats.mood > 50 &&
        !['无业', '学生', '退休'].includes(agent.profile.occupation);
    },
    statChanges: { mood: 15, money: 200 },
  },
  {
    category: 'career_failure',
    description: '工作中遇到了挫折',
    probability: 0.06,
    priority: 50,
    conditions: (agent, _, time) => {
      const hour = time.getHours();
      return hour >= 9 && hour <= 18 &&
        agent.profile.occupation !== '' &&
        agent.stats.energy < 60;
    },
    statChanges: { mood: -15, energy: -10 },
  },
  {
    category: 'job_loss',
    description: '突然收到了裁员通知',
    probability: 0.01,
    priority: 70,
    conditions: (agent) => {
      return agent.stats.mood < 40 &&
        agent.profile.occupation !== '' &&
        !['无业', '学生', '退休'].includes(agent.profile.occupation) &&
        Math.random() < 0.3;
    },
    statChanges: { mood: -30, money: -500 },
  },
  {
    category: 'relationship_conflict',
    description: '和重要的人发生了争执',
    probability: 0.05,
    priority: 55,
    conditions: (agent, relationships) => {
      const closeRels = relationships.filter(r => r.agentId === agent.id && r.intimacy > 50);
      return closeRels.length > 0 && agent.stats.mood < 60;
    },
    statChanges: { mood: -20 },
    relationshipEffect: { targetCondition: 'close', delta: -10 },
    generateDescription: (agent) => `${agent.profile.name}和亲近的人发生了争执`,
  },
  {
    category: 'relationship_bond',
    description: '和某人度过了一段美好的时光',
    probability: 0.06,
    priority: 40,
    conditions: (agent, relationships, time) => {
      const hour = time.getHours();
      const closeRels = relationships.filter(r => r.agentId === agent.id && r.intimacy > 40);
      return hour >= 18 && closeRels.length > 0 && agent.stats.mood > 50;
    },
    statChanges: { mood: 12 },
    relationshipEffect: { targetCondition: 'close', delta: 5 },
  },
  {
    category: 'romantic_encounter',
    description: '偶遇了心动的人',
    probability: 0.03,
    priority: 60,
    conditions: (agent, relationships) => {
      const romantic = relationships.filter(r =>
        r.agentId === agent.id &&
        ['friend', 'close_friend', 'dating'].includes(r.type) &&
        r.intimacy > 30
      );
      return romantic.length > 0 &&
        agent.profile.age >= 18 &&
        agent.profile.age <= 45 &&
        agent.stats.mood > 60;
    },
    statChanges: { mood: 20 },
    relationshipEffect: { targetCondition: 'romantic_potential', delta: 10 },
    generateDescription: (agent) => `${agent.profile.name}心动了`,
  },
  {
    category: 'health_issue',
    description: '身体出现了不适',
    probability: 0.04,
    priority: 65,
    conditions: (agent) => {
      return agent.stats.health < 80 || agent.stats.energy < 30;
    },
    statChanges: { health: -15, energy: -20, mood: -10 },
  },
  {
    category: 'health_recovery',
    description: '身体状况好转了',
    probability: 0.05,
    priority: 35,
    conditions: (agent, _, time) => {
      const hour = time.getHours();
      return hour >= 7 && hour <= 9 &&
        agent.stats.health < 100 &&
        (agent.state.status === 'sleeping' || agent.stats.energy > 70);
    },
    statChanges: { health: 10, energy: 15 },
  },
  {
    category: 'financial_stress',
    description: '经济上遇到了压力',
    probability: 0.05,
    priority: 55,
    conditions: (agent) => {
      return agent.stats.money < 500;
    },
    statChanges: { mood: -15, money: -100 },
  },
  {
    category: 'financial_windfall',
    description: '意外获得了一些收入',
    probability: 0.02,
    priority: 45,
    conditions: (agent) => {
      return agent.stats.money < 2000 && Math.random() < 0.5;
    },
    statChanges: { mood: 10, money: 500 },
  },
  {
    category: 'social_invitation',
    description: '收到了聚会邀请',
    probability: 0.04,
    priority: 40,
    conditions: (agent, relationships, time) => {
      const hour = time.getHours();
      const friends = relationships.filter(r => r.agentId === agent.id && r.type === 'friend');
      return hour >= 17 && hour <= 20 && friends.length > 0 && agent.stats.energy > 50;
    },
    statChanges: { mood: 8 },
  },
  {
    category: 'alone_reflection',
    description: '独自思考人生',
    probability: 0.03,
    priority: 30,
    conditions: (agent, relationships, time) => {
      const hour = time.getHours();
      const closeRels = relationships.filter(r => r.agentId === agent.id && r.intimacy > 30);
      return hour >= 22 && closeRels.length === 0 && agent.stats.mood < 50;
    },
    statChanges: { mood: 5 },
    generateDescription: (agent) => `${agent.profile.name}独自思考着`,
  },
  {
    category: 'family_time',
    description: '和家人度过温馨时光',
    probability: 0.05,
    priority: 40,
    conditions: (agent, relationships, time) => {
      const hour = time.getHours();
      const family = relationships.filter(r =>
        r.agentId === agent.id &&
        ['family', 'parent', 'child', 'sibling', 'spouse'].includes(r.type)
      );
      return hour >= 18 && hour <= 22 && family.length > 0;
    },
    statChanges: { mood: 10, energy: 5 },
    relationshipEffect: { targetCondition: 'family', delta: 3 },
  },
  {
    category: 'creative_inspiration',
    description: '灵感迸发',
    probability: 0.03,
    priority: 35,
    conditions: (agent) => {
      const creativeOccs = ['设计师', '艺术家', '作家', '程序员', '音乐家', '摄影师'];
      return creativeOccs.some(occ => agent.profile.occupation?.includes(occ)) &&
        agent.stats.mood > 60;
    },
    statChanges: { mood: 15 },
  },
  {
    category: 'unexpected_news',
    description: '收到了意外的消息',
    probability: 0.02,
    priority: 50,
    conditions: () => Math.random() < 0.02,
    statChanges: { mood: Math.random() > 0.5 ? 10 : -10 },
    generateDescription: (agent) => `${agent.profile.name}收到了意外消息`,
  },
];

const routineSchedule = [
  { hour: 7, category: 'morning_rise', description: '新的一天开始了', priority: 15, statChanges: { energy: 20, mood: 5 } },
  { hour: 9, category: 'work_start', description: '开始一天的工作', priority: 20, statChanges: { energy: -5 } },
  { hour: 12, category: 'lunch_break', description: '午休时间', priority: 15, statChanges: { energy: 10, mood: 5 } },
  { hour: 14, category: 'afternoon_work', description: '下午继续工作', priority: 18, statChanges: { energy: -10 } },
  { hour: 18, category: 'work_end', description: '下班了', priority: 20, statChanges: { mood: 5 } },
  { hour: 19, category: 'dinner_time', description: '晚餐时间', priority: 15, statChanges: { energy: 5, mood: 3 } },
  { hour: 22, category: 'night_prep', description: '准备休息', priority: 15, statChanges: { energy: -5 } },
];

export class EventEngine {
  private worldAgent: WorldAgent;
  private repo: Repository;
  private relationshipManager: RelationshipManager | null = null;
  private llmScheduler: LLMScheduler | null = null;
  private config: LoreConfig | null = null;
  private lastRoutineHour = -1;
  private lastContextualCheck = 0;

  constructor(worldAgent: WorldAgent, repo: Repository) {
    this.worldAgent = worldAgent;
    this.repo = repo;
  }

  setRelationshipManager(manager: RelationshipManager): void {
    this.relationshipManager = manager;
  }

  setLLMScheduler(scheduler: LLMScheduler): void {
    this.llmScheduler = scheduler;
  }

  setConfig(config: LoreConfig): void {
    this.config = config;
  }

  async generate(
    clock: WorldClock,
    agents: AgentLike[],
    worldState: WorldStateSummary,
    relationshipManager?: RelationshipManager,
  ): Promise<WorldEvent[]> {
    const events: WorldEvent[] = [];
    const worldId = worldState.worldId;

    events.push(...this.generateRoutineEvents(clock, agents, worldId));

    if (worldState.currentTick - this.lastContextualCheck >= 5) {
      this.lastContextualCheck = worldState.currentTick;
      events.push(...await this.generateContextualEvents(agents, worldId, clock, relationshipManager));
    }

    events.push(...this.generateTimeBasedEvents(clock, agents, worldId));

    const worldEvents = await this.worldAgent.think(worldState, agents);
    events.push(...worldEvents);

    for (const event of events) {
      if (!event.processed) {
        await this.repo.createEvent(event);
      }
    }

    logger.debug({
      tick: worldState.currentTick,
      eventCount: events.length,
      routine: this.lastRoutineHour,
    }, 'Events generated');

    return events;
  }

  async applyConsequences(event: WorldEvent, agentManager: AgentManager): Promise<void> {
    if (!event.consequences || event.processed) return;

    for (const c of event.consequences) {
      const agent = agentManager.get(c.agentId);
      if (!agent) continue;

      if (c.statChanges) {
        const statChangesArray = Object.entries(c.statChanges).map(([stat, delta]) => ({
          stat: stat as keyof AgentStats,
          delta: delta as number,
          reason: event.category,
        }));

        agent.applyStatChanges(statChangesArray);
        logger.info({
          eventId: event.id,
          agentId: c.agentId,
          category: event.category,
          statChanges: c.statChanges,
        }, 'Event consequence applied');

        if (agent.stats.health <= 0) {
          agent.transitionTo('dead', '事件导致死亡');
          await agentManager.destroy(agent.id);
          logger.warn({ eventId: event.id, agentId: c.agentId }, 'Agent died from event');
        }
      }

      if (c.relationshipChange && this.relationshipManager) {
        await this.relationshipManager.update(
          c.agentId,
          c.relationshipChange.targetId,
          { intimacy: c.relationshipChange.delta },
        );
      }
    }

    event.processed = true;
    await this.repo.updateEventProcessed(event.id);
  }

  private generateRoutineEvents(clock: WorldClock, agents: AgentLike[], worldId: string): WorldEvent[] {
    const events: WorldEvent[] = [];
    const time = clock.getTime();
    const currentHour = time.getHours();

    if (currentHour === this.lastRoutineHour) return events;
    this.lastRoutineHour = currentHour;

    const match = routineSchedule.find(r => r.hour === currentHour);
    if (!match) return events;

    const applicableAgents = agents.filter(a => {
      if (a.state.status === 'dead') return false;
      if (match.hour === 9 || match.hour === 14) {
        return a.profile.occupation && !['无业', '学生', '退休'].includes(a.profile.occupation);
      }
      return true;
    });

    if (applicableAgents.length === 0) return events;

    for (const agent of applicableAgents) {
      events.push({
        id: nanoid(),
        worldId,
        type: 'routine',
        category: match.category,
        description: `${agent.profile.name}：${match.description}`,
        involvedAgents: [agent.id],
        consequences: [{
          agentId: agent.id,
          statChanges: match.statChanges,
        }],
        timestamp: new Date(),
        processed: false,
        priority: match.priority,
      });
    }

    return events;
  }

  private async generateContextualEvents(
    agents: AgentLike[],
    worldId: string,
    clock: WorldClock,
    relationshipManager?: RelationshipManager,
  ): Promise<WorldEvent[]> {
    const events: WorldEvent[] = [];
    const time = clock.getTime();
    const relationships = await this.getRelationships(agents, relationshipManager);

    for (const agent of agents) {
      if (agent.state.status === 'dead') continue;

      const agentRelations = relationships.filter(r => r.agentId === agent.id);

      for (const eventTemplate of contextualEvents) {
        if (Math.random() > eventTemplate.probability) continue;

        try {
          const meetsConditions = eventTemplate.conditions(agent, agentRelations, time);
          if (!meetsConditions) continue;

          const description = eventTemplate.generateDescription
            ? eventTemplate.generateDescription(agent)
            : `${agent.profile.name}${eventTemplate.description}`;

          const consequence: EventConsequence = {
            agentId: agent.id,
            statChanges: eventTemplate.statChanges,
          };

          if (eventTemplate.relationshipEffect) {
            const targets = agentRelations.filter(r => {
              if (eventTemplate.relationshipEffect!.targetCondition === 'close') {
                return r.intimacy > 50;
              }
              if (eventTemplate.relationshipEffect!.targetCondition === 'family') {
                return ['family', 'parent', 'child', 'sibling', 'spouse'].includes(r.type);
              }
              if (eventTemplate.relationshipEffect!.targetCondition === 'romantic_potential') {
                return ['friend', 'close_friend', 'dating'].includes(r.type) && r.intimacy > 30;
              }
              return false;
            });

            if (targets.length > 0) {
              const target = targets[Math.floor(Math.random() * targets.length)]!;
              consequence.relationshipChange = {
                targetId: target.targetId,
                delta: eventTemplate.relationshipEffect.delta,
              };
            }
          }

          events.push({
            id: nanoid(),
            worldId,
            type: this.mapCategoryToType(eventTemplate.category),
            category: eventTemplate.category,
            description,
            involvedAgents: [agent.id],
            consequences: [consequence],
            timestamp: new Date(),
            processed: false,
            priority: eventTemplate.priority,
          });

          logger.debug({
            agentId: agent.id,
            category: eventTemplate.category,
            description,
          }, 'Contextual event generated');
        } catch (err) {
          logger.warn({ agentId: agent.id, category: eventTemplate.category, err }, 'Contextual event condition check failed');
        }
      }
    }

    return events;
  }

  private generateTimeBasedEvents(clock: WorldClock, agents: AgentLike[], worldId: string): WorldEvent[] {
    const events: WorldEvent[] = [];
    const time = clock.getTime();
    const day = clock.getDay();
    const hour = time.getHours();

    if (day === 1 && hour === 8 && Math.random() < 0.5) {
      events.push(this.createNewWorldEvent(worldId, agents));
    }

    if (day % 7 === 0 && hour === 10 && Math.random() < 0.3) {
      events.push(this.createWeeklyEvent(worldId, agents));
    }

    if (day % 30 === 0 && hour === 12 && Math.random() < 0.4) {
      events.push(this.createMonthlyEvent(worldId, agents));
    }

    return events;
  }

  private createNewWorldEvent(worldId: string, agents: AgentLike[]): WorldEvent {
    const descriptions = [
      '这个世界刚刚诞生，一切都充满可能',
      '新的一天，新的故事即将展开',
      '每个人都在开始自己的人生旅程',
    ];

    return {
      id: nanoid(),
      worldId,
      type: 'world',
      category: 'world_birth',
      description: descriptions[Math.floor(Math.random() * descriptions.length)]!,
      involvedAgents: agents.filter(a => a.state.status !== 'dead').map(a => a.id),
      consequences: agents
        .filter(a => a.state.status !== 'dead')
        .map(a => ({
          agentId: a.id,
          statChanges: { mood: 5 },
        })),
      timestamp: new Date(),
      processed: false,
      priority: 25,
    };
  }

  private createWeeklyEvent(worldId: string, agents: AgentLike[]): WorldEvent {
    const descriptions = [
      '一周过去了，有人收获，有人失落',
      '周末的氛围弥漫开来',
      '这一周的总结时刻',
    ];

    const aliveAgents = agents.filter(a => a.state.status !== 'dead');
    const affected = aliveAgents
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.ceil(aliveAgents.length * 0.3));

    return {
      id: nanoid(),
      worldId,
      type: 'world',
      category: 'weekly_summary',
      description: descriptions[Math.floor(Math.random() * descriptions.length)]!,
      involvedAgents: affected.map(a => a.id),
      consequences: affected.map(a => ({
        agentId: a.id,
        statChanges: {
          mood: a.stats.mood > 60 ? -5 : 5,
        },
      })),
      timestamp: new Date(),
      processed: false,
      priority: 30,
    };
  }

  private createMonthlyEvent(worldId: string, agents: AgentLike[]): WorldEvent {
    const descriptions = [
      '一个月过去了，季节在变化',
      '时光流逝，故事在延续',
      '月末的反思时刻',
    ];

    const aliveAgents = agents.filter(a => a.state.status !== 'dead');

    return {
      id: nanoid(),
      worldId,
      type: 'world',
      category: 'monthly_transition',
      description: descriptions[Math.floor(Math.random() * descriptions.length)]!,
      involvedAgents: aliveAgents.map(a => a.id),
      consequences: aliveAgents.map(a => ({
        agentId: a.id,
        statChanges: { mood: a.stats.mood > 70 ? -3 : 3 },
      })),
      timestamp: new Date(),
      processed: false,
      priority: 35,
    };
  }

  private async getRelationships(
    agents: AgentLike[],
    relationshipManager?: RelationshipManager,
  ): Promise<RelationshipInfo[]> {
    if (!relationshipManager) {
      try {
        const allRelations = await this.repo.getAllRelationships();
        return allRelations.map(r => ({
          agentId: r.agentId,
          targetId: r.targetAgentId,
          type: r.type,
          intimacy: r.intimacy ?? 0,
        }));
      } catch {
        return [];
      }
    }

    const relationships: RelationshipInfo[] = [];
    for (const agent of agents) {
      try {
        const rels = await relationshipManager.getAll(agent.id);
        for (const r of rels) {
          relationships.push({
            agentId: agent.id,
            targetId: r.targetAgentId,
            type: r.type,
            intimacy: r.intimacy ?? 0,
          });
        }
      } catch {
        continue;
      }
    }
    return relationships;
  }

  private mapCategoryToType(category: string): WorldEvent['type'] {
    if (category.includes('career') || category.includes('job')) return 'career';
    if (category.includes('relationship') || category.includes('romantic') || category.includes('family')) return 'romantic';
    if (category.includes('health')) return 'crisis';
    if (category.includes('social')) return 'social';
    if (category.includes('financial')) return 'crisis';
    return 'random';
  }

  async generateLLMEnhancedEvent(
    agent: AgentLike,
    worldState: WorldStateSummary,
    relationships: RelationshipInfo[],
  ): Promise<WorldEvent | null> {
    if (!this.llmScheduler || !this.config) return null;

    const prompt = this.buildAgentEventPrompt(agent, worldState, relationships);

    try {
      const result = await this.llmScheduler.submit({
        agentId: agent.id,
        callType: 'decision',
        model: this.config.llm.defaults.cheapModel,
        messages: prompt,
        maxTokens: 256,
      });

      const parsed = JSON.parse(result.content);
      if (!parsed.event) return null;

      return {
        id: nanoid(),
        worldId: worldState.worldId,
        type: 'random',
        category: parsed.category || 'personal',
        description: parsed.event,
        involvedAgents: [agent.id],
        consequences: [{
          agentId: agent.id,
          statChanges: parsed.statChanges || {},
        }],
        timestamp: new Date(),
        processed: false,
        priority: parsed.priority || 40,
      };
    } catch {
      return null;
    }
  }

  private buildAgentEventPrompt(
    agent: AgentLike,
    worldState: WorldStateSummary,
    relationships: RelationshipInfo[],
  ): ChatMessage[] {
    const relSummary = relationships
      .filter(r => r.agentId === agent.id)
      .map(r => `${r.type}(${r.intimacy})`)
      .join(', ');

    return [
      {
        role: 'system' as const,
        content: `为这个角色生成一个今天可能发生的个人事件。
事件要符合角色的当前状态、职业、性格、关系。

返回 JSON：
{
  "event": "事件描述（一句话）",
  "category": "事件类别",
  "statChanges": { "mood": 数值, "health": 数值, "energy": 数值, "money": 数值 },
  "priority": 优先级30-60
}`,
      },
      {
        role: 'user' as const,
        content: `角色：${agent.profile.name}，${agent.profile.age}岁${agent.profile.gender}，${agent.profile.occupation}
状态：心情${agent.stats.mood}/100，健康${agent.stats.health}/100，精力${agent.stats.energy}/100，金钱${agent.stats.money}
关系：${relSummary || '无密切关系'}
当前活动：${agent.state.currentActivity}
时间：第${worldState.day}天`,
      },
    ];
  }
}