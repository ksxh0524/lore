import type { AgentRuntime } from './agent-runtime.js';
import type { Repository } from '../db/repository.js';
import type { AgentTool } from './tools.js';
import { nanoid } from 'nanoid';

export function createFindJobTool(repo: Repository): AgentTool {
  return {
    name: 'find_job',
    description: '找工作投递简历，需要指定职位类型',
    parameters: {
      type: 'object',
      properties: {
        jobType: { type: 'string', description: '职位类型，如：程序员、销售、服务员等' },
        company: { type: 'string', description: '目标公司名称（可选）' },
      },
      required: ['jobType'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const jobType = String(args.jobType ?? '普通员工');
      const company = args.company ? String(args.company) : '附近的公司';
      
      agent.state.currentActivity = `正在找${jobType}工作`;
      
      const success = Math.random() > 0.3;
      if (success) {
        return {
          success: true,
          message: `你成功获得了一份${company}的${jobType}面试机会！`,
          result: { interviewScheduled: true, company, jobType },
        };
      }
      return {
        success: false,
        message: `很遗憾，${company}暂时没有招聘${jobType}的计划。`,
        result: { interviewScheduled: false },
      };
    },
  };
}

export function createBuyItemTool(repo: Repository): AgentTool {
  return {
    name: 'buy_item',
    description: '购买物品或服务',
    parameters: {
      type: 'object',
      properties: {
        item: { type: 'string', description: '要购买的物品' },
        price: { type: 'number', description: '预计价格' },
        quantity: { type: 'number', description: '数量，默认1' },
      },
      required: ['item', 'price'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const item = String(args.item ?? '东西');
      const price = Number(args.price ?? 100);
      const quantity = Number(args.quantity ?? 1);
      const totalCost = price * quantity;
      
      if (agent.stats.money < totalCost) {
        return {
          success: false,
          message: `钱不够！购买${quantity}个${item}需要${totalCost}元，但你只有${agent.stats.money}元。`,
          result: { purchased: false },
        };
      }
      
      agent.stats.money -= totalCost;
      agent.state.currentActivity = `购买了${quantity}个${item}`;
      
      await repo.createEvent({
        id: nanoid(),
        worldId: agent.worldId,
        type: 'purchase',
        description: `${agent.profile.name}购买了${quantity}个${item}，花费${totalCost}元`,
        involvedAgents: [agent.id],
        priority: 30,
        timestamp: new Date(),
      });
      
      return {
        success: true,
        message: `成功购买${quantity}个${item}，花费${totalCost}元，剩余${agent.stats.money}元。`,
        result: { purchased: true, item, quantity, totalCost },
      };
    },
  };
}

export function createSocializeTool(repo: Repository): AgentTool {
  return {
    name: 'socialize',
    description: '与其他人社交互动',
    parameters: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: '互动对象的名字' },
        action: { type: 'string', description: '互动类型：聊天、邀请、约会等' },
        message: { type: 'string', description: '要说的话' },
      },
      required: ['targetName', 'action'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const targetName = String(args.targetName ?? '某人');
      const action = String(args.action ?? '聊天');
      const message = args.message ? String(args.message) : '';
      
      agent.state.currentActivity = `正在和${targetName}${action}`;
      
      const moodChange = Math.floor(Math.random() * 20) - 5;
      agent.stats.mood = Math.max(0, Math.min(100, agent.stats.mood + moodChange));
      
      return {
        success: true,
        message: `你和${targetName}进行了${action}${message ? `，你说："${message}"` : ''}。心情${moodChange >= 0 ? '变好了' : '变差了'}。`,
        result: { targetName, action, moodChange },
      };
    },
  };
}

export function createRestTool(): AgentTool {
  return {
    name: 'rest',
    description: '休息恢复精力',
    parameters: {
      type: 'object',
      properties: {
        duration: { type: 'number', description: '休息时长（小时）' },
        type: { type: 'string', description: '休息类型：睡觉、小憩、放松' },
      },
      required: ['duration'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const duration = Number(args.duration ?? 1);
      const restType = String(args.type ?? '休息');
      
      const energyRecovery = Math.min(100 - agent.stats.energy, duration * 15);
      agent.stats.energy = Math.min(100, agent.stats.energy + energyRecovery);
      agent.state.currentActivity = `正在${restType}`;
      agent.state.status = 'sleeping';
      
      setTimeout(() => {
        agent.state.status = 'idle';
      }, duration * 1000);
      
      return {
        success: true,
        message: `你${restType}了${duration}小时，恢复了${energyRecovery}点精力。当前精力：${agent.stats.energy}`,
        result: { energyRecovery, duration },
      };
    },
  };
}

export function createWorkTool(repo: Repository): AgentTool {
  return {
    name: 'work',
    description: '工作赚钱',
    parameters: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: '工作时长（小时）' },
        task: { type: 'string', description: '工作内容描述' },
      },
      required: ['hours'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const hours = Number(args.hours ?? 8);
      const task = args.task ? String(args.task) : '日常工作';
      
      const energyCost = Math.min(agent.stats.energy, hours * 5);
      agent.stats.energy -= energyCost;
      
      const baseEarning = hours * 50;
      const bonus = Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0;
      const totalEarning = baseEarning + bonus;
      
      agent.stats.money += totalEarning;
      agent.state.currentActivity = `正在工作：${task}`;
      
      const moodChange = hours > 8 ? -10 : 5;
      agent.stats.mood = Math.max(0, Math.min(100, agent.stats.mood + moodChange));
      
      await repo.createEvent({
        id: nanoid(),
        worldId: agent.worldId,
        type: 'work',
        description: `${agent.profile.name}工作了${hours}小时，赚取了${totalEarning}元`,
        involvedAgents: [agent.id],
        priority: 20,
        timestamp: new Date(),
      });
      
      return {
        success: true,
        message: `你工作了${hours}小时（${task}），消耗${energyCost}精力，赚取${totalEarning}元${bonus > 0 ? `（含奖金${bonus}元）` : ''}。`,
        result: { hours, earning: totalEarning, energyCost },
      };
    },
  };
}

export function registerDefaultTools(registry: { register: (tool: AgentTool) => void }, repo: Repository): void {
  registry.register(createFindJobTool(repo));
  registry.register(createBuyItemTool(repo));
  registry.register(createSocializeTool(repo));
  registry.register(createRestTool());
  registry.register(createWorkTool(repo));
}
