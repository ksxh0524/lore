import type { Repository } from '../db/repository.js';
import type { AgentRuntime } from '../agent/agent-runtime.js';
import type { AgentStats } from '@lore/shared';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('economy');

export interface ShopItem {
  id: string;
  name: string;
  category: 'food' | 'entertainment' | 'health' | 'transport' | 'housing' | 'luxury' | 'education' | 'gift';
  price: number;
  effect: Partial<AgentStats>;
  description: string;
}

export interface Job {
  id: string;
  name: string;
  category: 'fulltime' | 'parttime' | 'freelance' | 'intern';
  salary: number;
  salaryFrequency: 'daily' | 'weekly' | 'monthly';
  energyCost: number;
  moodEffect: number;
  requirements?: {
    minAge?: number;
    maxAge?: number;
    minEducation?: string;
    occupationMatch?: string[];
  };
}

const defaultShopItems: ShopItem[] = [
  { id: 'food_cheap', name: '便宜餐食', category: 'food', price: 15, effect: { energy: 15, mood: 2 }, description: '普通餐厅一顿饭' },
  { id: 'food_good', name: '美味餐食', category: 'food', price: 50, effect: { energy: 25, mood: 10 }, description: '不错的餐厅' },
  { id: 'food_fast', name: '快餐', category: 'food', price: 20, effect: { energy: 10, mood: -2 }, description: '快餐店' },
  { id: 'entertainment_movie', name: '看电影', category: 'entertainment', price: 60, effect: { mood: 15, energy: -5 }, description: '电影票' },
  { id: 'entertainment_game', name: '玩游戏', category: 'entertainment', price: 100, effect: { mood: 20, energy: -10 }, description: '买游戏' },
  { id: 'entertainment_travel', name: '短途旅行', category: 'entertainment', price: 500, effect: { mood: 30, energy: -20 }, description: '周末旅行' },
  { id: 'health_checkup', name: '体检', category: 'health', price: 300, effect: { health: 10 }, description: '健康检查' },
  { id: 'health_medicine', name: '药品', category: 'health', price: 50, effect: { health: 20, mood: -5 }, description: '买药' },
  { id: 'health_spa', name: '养生SPA', category: 'health', price: 200, effect: { health: 5, mood: 15, energy: 20 }, description: '放松身心' },
  { id: 'transport_bus', name: '公交卡', category: 'transport', price: 100, effect: {}, description: '月度公交卡' },
  { id: 'transport_taxi', name: '打车', category: 'transport', price: 30, effect: { energy: 5 }, description: '单次打车' },
  { id: 'housing_rent', name: '房租', category: 'housing', price: 2000, effect: {}, description: '月租金' },
  { id: 'housing_improve', name: '改善居住', category: 'housing', price: 500, effect: { mood: 10 }, description: '装修/添置家具' },
  { id: 'luxury_phone', name: '新手机', category: 'luxury', price: 3000, effect: { mood: 25 }, description: '买新手机' },
  { id: 'luxury_clothes', name: '名牌衣服', category: 'luxury', price: 800, effect: { mood: 15 }, description: '买衣服' },
  { id: 'education_course', name: '培训课程', category: 'education', price: 1000, effect: { mood: 5 }, description: '职业技能培训' },
  { id: 'education_book', name: '书籍', category: 'education', price: 50, effect: { mood: 5 }, description: '买书学习' },
  { id: 'gift_small', name: '小礼物', category: 'gift', price: 50, effect: {}, description: '送朋友的小礼物' },
  { id: 'gift_big', name: '贵重礼物', category: 'gift', price: 500, effect: {}, description: '重要场合的礼物' },
];

const defaultJobs: Job[] = [
  { id: 'job_programmer', name: '程序员', category: 'fulltime', salary: 15000, salaryFrequency: 'monthly', energyCost: 40, moodEffect: 0 },
  { id: 'job_designer', name: '设计师', category: 'fulltime', salary: 12000, salaryFrequency: 'monthly', energyCost: 35, moodEffect: 5 },
  { id: 'job_teacher', name: '老师', category: 'fulltime', salary: 8000, salaryFrequency: 'monthly', energyCost: 30, moodEffect: 10 },
  { id: 'job_sales', name: '销售', category: 'fulltime', salary: 10000, salaryFrequency: 'monthly', energyCost: 45, moodEffect: -5 },
  { id: 'job_waiter', name: '服务员', category: 'parttime', salary: 80, salaryFrequency: 'daily', energyCost: 20, moodEffect: -10 },
  { id: 'job_delivery', name: '外卖员', category: 'parttime', salary: 150, salaryFrequency: 'daily', energyCost: 30, moodEffect: -5 },
  { id: 'job_freelance', name: '自由职业', category: 'freelance', salary: 500, salaryFrequency: 'weekly', energyCost: 25, moodEffect: 15 },
  { id: 'job_intern', name: '实习生', category: 'intern', salary: 3000, salaryFrequency: 'monthly', energyCost: 35, moodEffect: 5 },
];

export class EconomyEngine {
  private repo: Repository;
  private shopItems: Map<string, ShopItem> = new Map();
  private jobs: Map<string, Job> = new Map();

  constructor(repo: Repository) {
    this.repo = repo;
    this.initDefaultItems();
  }

  private initDefaultItems(): void {
    for (const item of defaultShopItems) {
      this.shopItems.set(item.id, item);
    }
    for (const job of defaultJobs) {
      this.jobs.set(job.id, job);
    }
  }

  async initAgentEconomy(worldId: string, agentId: string, balance = 0, income = 0, expenses = 0) {
    logger.debug({ agentId, balance, income, expenses }, 'Agent economy initialized');
    return this.repo.createEconomy({ id: nanoid(), worldId, agentId, balance, income, expenses });
  }

  async spend(agentId: string, amount: number, reason: string): Promise<boolean> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco || (eco.balance ?? 0) < amount) {
      logger.warn({ agentId, amount, balance: eco?.balance ?? 0 }, 'Insufficient funds for spend');
      return false;
    }
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) - amount });
    logger.debug({ agentId, amount, reason, newBalance: (eco.balance ?? 0) - amount }, 'Spent money');
    return true;
  }

  async earn(agentId: string, amount: number, reason: string): Promise<void> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco) return;
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) + amount });
    logger.debug({ agentId, amount, reason, newBalance: (eco.balance ?? 0) + amount }, 'Earned money');
  }

  async buy(agent: AgentRuntime, itemId: string): Promise<boolean> {
    const item = this.shopItems.get(itemId);
    if (!item) {
      logger.warn({ agentId: agent.id, itemId }, 'Item not found');
      return false;
    }

    const success = await this.spend(agent.id, item.price, `购买${item.name}`);
    if (!success) return false;

    if (item.effect) {
      const statChanges = Object.entries(item.effect).map(([stat, delta]) => ({
        stat: stat as keyof AgentStats,
        delta: delta as number,
        reason: `购买${item.name}`,
      }));
      agent.applyStatChanges(statChanges);
    }

    await agent.memory.add(`购买了${item.name}`, 'action', 0.4);

    logger.info({ agentId: agent.id, item: item.name, price: item.price }, 'Purchase completed');
    return true;
  }

  getShopItems(): ShopItem[] {
    return [...this.shopItems.values()];
  }

  getShopItemsByCategory(category: ShopItem['category']): ShopItem[] {
    return [...this.shopItems.values()].filter(item => item.category === category);
  }

  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): Job[] {
    return [...this.jobs.values()];
  }

  getJobsByCategory(category: Job['category']): Job[] {
    return [...this.jobs.values()].filter(job => job.category === category);
  }

  canApplyJob(agent: AgentRuntime, jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.requirements) {
      if (job.requirements.minAge && agent.profile.age < job.requirements.minAge) return false;
      if (job.requirements.maxAge && agent.profile.age > job.requirements.maxAge) return false;
      if (job.requirements.occupationMatch && !job.requirements.occupationMatch.some(o =>
        agent.profile.occupation.toLowerCase().includes(o.toLowerCase())
      )) return false;
    }

    return true;
  }

  async applyJobEffect(agent: AgentRuntime, jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    agent.stats.energy -= job.energyCost;
    agent.stats.mood += job.moodEffect;

    const eco = await this.repo.getAgentEconomy(agent.id);
    if (eco) {
      await this.repo.updateEconomy(eco.id, {
        income: job.salary,
      });
    }

    await agent.memory.add(`今天工作了：${job.name}`, 'action', 0.5);

    logger.debug({ agentId: agent.id, job: job.name, salary: job.salary }, 'Job effect applied');
  }

  async payDailyIncome(worldId: string, agents?: IterableIterator<AgentRuntime>): Promise<void> {
    const agentList = agents ? [...agents] : [];
    if (agentList.length === 0) {
      const rawAgents = await this.repo.getWorldAgents(worldId);
      for (const raw of rawAgents) {
        const eco = await this.repo.getAgentEconomy(raw.id);
        if (!eco || (eco.income ?? 0) <= 0) continue;

        const occupation = (raw.profile as { occupation?: string })?.occupation ?? '';
        const dailyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'daily');
        for (const job of dailyJobs) {
          if (occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(raw.id, job.salary, `${job.name}日薪`);
          }
        }
      }
    } else {
      for (const agent of agentList) {
        const eco = await this.repo.getAgentEconomy(agent.id);
        if (!eco || (eco.income ?? 0) <= 0) continue;

        const dailyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'daily');
        for (const job of dailyJobs) {
          if (agent.profile.occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(agent.id, job.salary, `${job.name}日薪`);
          }
        }
      }
    }

    logger.debug({ worldId }, 'Daily income paid');
  }

  async payWeeklyIncome(worldId: string, agents?: IterableIterator<AgentRuntime>): Promise<void> {
    const agentList = agents ? [...agents] : [];
    if (agentList.length === 0) {
      const rawAgents = await this.repo.getWorldAgents(worldId);
      for (const raw of rawAgents) {
        const eco = await this.repo.getAgentEconomy(raw.id);
        if (!eco) continue;

        const occupation = (raw.profile as { occupation?: string })?.occupation ?? '';
        const weeklyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'weekly');
        for (const job of weeklyJobs) {
          if (occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(raw.id, job.salary, `${job.name}周薪`);
          }
        }
      }
    } else {
      for (const agent of agentList) {
        const eco = await this.repo.getAgentEconomy(agent.id);
        if (!eco) continue;

        const weeklyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'weekly');
        for (const job of weeklyJobs) {
          if (agent.profile.occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(agent.id, job.salary, `${job.name}周薪`);
          }
        }
      }
    }

    logger.debug({ worldId }, 'Weekly income paid');
  }

  async monthlySettle(worldId: string, agents?: IterableIterator<AgentRuntime>): Promise<void> {
    const agentList = agents ? [...agents] : [];
    if (agentList.length === 0) {
      const rawAgents = await this.repo.getWorldAgents(worldId);
      logger.info({ worldId, agentCount: rawAgents.length }, 'Monthly settlement started');
      for (const raw of rawAgents) {
        const eco = await this.repo.getAgentEconomy(raw.id);
        if (!eco) continue;

        const profile = raw.profile as { name?: string; occupation?: string };
        const stats = raw.stats as { mood?: number };
        const occupation = profile?.occupation ?? '';

        const monthlyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'monthly');
        for (const job of monthlyJobs) {
          if (occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(raw.id, job.salary, `${job.name}月薪`);
          }
        }

        const baseExpenses = 500;
        await this.spend(raw.id, baseExpenses, '月度生活费');

        const oldBalance = eco.balance ?? 0;
        const income = eco.income ?? 0;
        const expenses = eco.expenses ?? 0;
        const newBalance = oldBalance + income - expenses;

        await this.repo.updateEconomy(eco.id, { balance: newBalance });

        await this.repo.createEvent({
          id: nanoid(),
          worldId,
          type: 'economic',
          description: `${profile?.name ?? raw.id} 月度结算：收入${income}，支出${expenses}，余额${newBalance}`,
          involvedAgents: [raw.id],
          timestamp: new Date(),
          priority: 30,
        });
      }
    } else {
      logger.info({ worldId, agentCount: agentList.length }, 'Monthly settlement started');
      for (const agent of agentList) {
        const eco = await this.repo.getAgentEconomy(agent.id);
        if (!eco) continue;

        const monthlyJobs = [...this.jobs.values()].filter(j => j.salaryFrequency === 'monthly');
        for (const job of monthlyJobs) {
          if (agent.profile.occupation.toLowerCase().includes(job.name.toLowerCase())) {
            await this.earn(agent.id, job.salary, `${job.name}月薪`);
          }
        }

        const baseExpenses = 500;
        await this.spend(agent.id, baseExpenses, '月度生活费');

        const oldBalance = eco.balance ?? 0;
        const income = eco.income ?? 0;
        const expenses = eco.expenses ?? 0;
        const newBalance = oldBalance + income - expenses;

        await this.repo.updateEconomy(eco.id, { balance: newBalance });

        await this.repo.createEvent({
          id: nanoid(),
          worldId,
          type: 'economic',
          description: `${agent.profile.name} 月度结算：收入${income}，支出${expenses}，余额${newBalance}`,
          involvedAgents: [agent.id],
          timestamp: new Date(),
          priority: 30,
        });

        if (newBalance < 0 && agent.stats.mood > 20) {
          agent.stats.mood -= 15;
          await agent.memory.add('这个月入不敷出，感到压力', 'event', 0.6);
        }

        if (newBalance > 10000 && agent.stats.mood < 80) {
          agent.stats.mood += 5;
          await agent.memory.add('这个月收入不错，心情好', 'event', 0.5);
        }
      }
    }

    logger.info({ worldId }, 'Monthly settlement completed');
  }

  async transfer(fromAgentId: string, toAgentId: string, amount: number, reason: string): Promise<boolean> {
    const success = await this.spend(fromAgentId, amount, `转账给${toAgentId}: ${reason}`);
    if (!success) return false;

    await this.earn(toAgentId, amount, `收到${fromAgentId}转账: ${reason}`);

    logger.info({ from: fromAgentId, to: toAgentId, amount, reason }, 'Transfer completed');
    return true;
  }

  async getBalance(agentId: string): Promise<number> {
    const eco = await this.repo.getAgentEconomy(agentId);
    return eco?.balance ?? 0;
  }

  addShopItem(item: ShopItem): void {
    this.shopItems.set(item.id, item);
  }

  addJob(job: Job): void {
    this.jobs.set(job.id, job);
  }

  removeShopItem(itemId: string): void {
    this.shopItems.delete(itemId);
  }

  removeJob(jobId: string): void {
    this.jobs.delete(jobId);
  }
}