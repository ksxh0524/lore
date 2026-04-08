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

export function createSendMessageTool(repo: Repository): AgentTool {
  return {
    name: 'send_message',
    description: '给其他 Agent 发消息',
    parameters: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: '接收者名字' },
        content: { type: 'string', description: '消息内容' },
      },
      required: ['targetName', 'content'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const targetName = String(args.targetName ?? '某人');
      const content = String(args.content ?? '');
      
      agent.state.currentActivity = `给${targetName}发消息`;
      agent.stats.energy = Math.max(0, agent.stats.energy - 5);
      
      const moodChange = Math.random() > 0.3 ? 5 : -3;
      agent.stats.mood = Math.max(0, Math.min(100, agent.stats.mood + moodChange));
      
      await repo.createEvent({
        id: nanoid(),
        worldId: agent.worldId,
        type: 'message',
        description: `${agent.profile.name}给${targetName}发了消息："${content.slice(0, 50)}..."`,
        involvedAgents: [agent.id],
        priority: 20,
        timestamp: new Date(),
      });
      
      return {
        success: true,
        message: `你给${targetName}发了一条消息："${content}"`,
        result: { targetName, content, moodChange },
      };
    },
  };
}

export function createChangeLocationTool(repo: Repository): AgentTool {
  return {
    name: 'change_location',
    description: '改变当前位置，从一个地方移动到另一个位置',
    parameters: {
      type: 'object',
      properties: {
        targetLocation: { type: 'string', description: '目标位置' },
        reason: { type: 'string', description: '移动原因（可选）' },
      },
      required: ['targetLocation'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const targetLocation = String(args.targetLocation ?? '某地');
      const reason = args.reason ? String(args.reason) : '';
      
      const oldLocation = agent.state.currentLocation;
      agent.state.currentLocation = targetLocation;
      agent.state.currentActivity = `前往${targetLocation}`;
      agent.stats.energy = Math.max(0, agent.stats.energy - 10);
      
      await repo.createEvent({
        id: nanoid(),
        worldId: agent.worldId,
        type: 'movement',
        description: `${agent.profile.name}从${oldLocation || '某处'}移动到了${targetLocation}${reason ? `，原因：${reason}` : ''}`,
        involvedAgents: [agent.id],
        priority: 20,
        timestamp: new Date(),
      });
      
      return {
        success: true,
        message: `你从${oldLocation || '原地'}移动到了${targetLocation}`,
        result: { oldLocation, newLocation: targetLocation, reason },
      };
    },
  };
}

export function createStartBusinessTool(repo: Repository): AgentTool {
  return {
    name: 'start_business',
    description: '开始创业，创建自己的事业',
    parameters: {
      type: 'object',
      properties: {
        businessName: { type: 'string', description: '企业名称' },
        businessType: { type: 'string', description: '企业类型，如：餐饮、科技、服务等' },
        capital: { type: 'number', description: '启动资金' },
        description: { type: 'string', description: '创业描述' },
      },
      required: ['businessName', 'businessType', 'description'],
    },
    execute: async (args: Record<string, unknown>, agent: AgentRuntime) => {
      const businessName = String(args.businessName ?? '我的企业');
      const businessType = String(args.businessType ?? '服务');
      const capital = Number(args.capital ?? 10000);
      const description = String(args.description ?? '');
      
      if (agent.stats.money < capital) {
        return {
          success: false,
          message: `资金不足！创业需要${capital}元，但你只有${agent.stats.money}元。`,
          result: { started: false },
        };
      }
      
      agent.stats.money -= capital;
      agent.state.currentActivity = `经营${businessName}`;
      agent.stats.mood = Math.min(100, agent.stats.mood + 20);
      agent.stats.energy = Math.max(0, agent.stats.energy - 30);
      
      await repo.createEvent({
        id: nanoid(),
        worldId: agent.worldId,
        type: 'business',
        description: `${agent.profile.name}创办了${businessType}企业"${businessName}"，投入资金${capital}元。${description}`,
        involvedAgents: [agent.id],
        priority: 40,
        timestamp: new Date(),
      });
      
      return {
        success: true,
        message: `恭喜！你成功创办了${businessType}企业"${businessName}"，投入资金${capital}元。`,
        result: { businessName, businessType, capital, started: true },
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
  registry.register(createSendMessageTool(repo));
  registry.register(createChangeLocationTool(repo));
  registry.register(createStartBusinessTool(repo));
}
