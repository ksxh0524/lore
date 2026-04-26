import type { ToolContext, ToolResult, StatChange, StateChange } from './types.js';
import type { Repository } from '../db/repository.js';
import type { AgentTool } from './tools.js';
import { nanoid } from 'nanoid';

export function createCreateCompanyTool(repo: Repository): AgentTool {
  return {
    name: 'create_company',
    description: '创建一家公司，成为企业主',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '公司名称' },
        type: { type: 'string', description: '公司类型：tech/retail/service/finance/manufacturing/entertainment/other' },
        description: { type: 'string', description: '公司描述' },
        capital: { type: 'number', description: '启动资金' },
      },
      required: ['name', 'type'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const name = String(args.name ?? '我的公司');
      const type = String(args.type ?? 'other') as 'tech' | 'retail' | 'service' | 'finance' | 'manufacturing' | 'entertainment' | 'other';
      const description = args.description ? String(args.description) : '';
      const capital = Number(args.capital ?? 5000);

      if (context.stats.money < capital) {
        return {
          success: false,
          message: `资金不足！创建公司需要${capital}元，但你只有${context.stats.money}元。`,
          result: { created: false },
        };
      }

      const company = await repo.createCompany({
        id: nanoid(),
        worldId: context.worldId,
        name,
        type,
        ownerId: context.id,
        employees: [context.id],
        valuation: capital * 2,
        description,
      });

      await repo.createStock({
        id: nanoid(),
        worldId: context.worldId,
        companyId: company.id,
        symbol: name.slice(0, 4).toUpperCase(),
        price: capital / 100,
      });

      await repo.createStockHolding({
        id: nanoid(),
        worldId: context.worldId,
        agentId: context.id,
        companyId: company.id,
        shares: 1000,
        averagePrice: capital / 100,
      });

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'company_created',
        description: `${context.profile.name}创建了公司"${name}"（${type}），投入资金${capital}元`,
        involvedAgents: [context.id],
        priority: 40,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `恭喜！你创建了公司"${name}"，投入资金${capital}元。你拥有100%的股份。`,
        result: { companyId: company.id, name, type, shares: 1000 },
        statChanges: [
          { stat: 'money', delta: -capital, reason: 'create_company' },
          { stat: 'mood', delta: 15, reason: 'create_company' },
        ],
        stateChanges: [{ activity: `经营${name}`, status: 'working' }],
      };
    },
  };
}

export function createHireAgentTool(repo: Repository): AgentTool {
  return {
    name: 'hire_agent',
    description: '招聘员工到你的公司',
    parameters: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: '公司ID（可选，默认为你拥有的公司）' },
        targetName: { type: 'string', description: '招聘对象的名字' },
        position: { type: 'string', description: '职位' },
        salary: { type: 'number', description: '月薪' },
      },
      required: ['targetName', 'position'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetName = String(args.targetName ?? '');
      const position = String(args.position ?? '员工');
      const salary = Number(args.salary ?? 3000);

      let companyId = args.companyId ? String(args.companyId) : null;
      if (!companyId) {
        const companies = await repo.getWorldCompanies(context.worldId);
        const myCompany = companies.find(c => c.ownerId === context.id);
        if (!myCompany) {
          return {
            success: false,
            message: '你没有公司！请先使用 create_company 创建公司。',
            result: { hired: false },
          };
        }
        companyId = myCompany.id;
      }

      const company = await repo.getCompany(companyId);
      if (!company) {
        return { success: false, message: '公司不存在', result: { hired: false } };
      }

      if (company.ownerId !== context.id) {
        return { success: false, message: '你不是这家公司的老板', result: { hired: false } };
      }

      await repo.createJobApplication({
        id: nanoid(),
        worldId: context.worldId,
        companyId,
        applicantId: targetName,
        position,
        salary,
      });

      const employees = company.employees as string[] ?? [];
      await repo.updateCompany(companyId, { employees: [...employees, targetName] });

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'hire',
        description: `${context.profile.name}招聘了${targetName}加入公司"${company.name}"，职位：${position}，月薪：${salary}元`,
        involvedAgents: [context.id],
        priority: 30,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `你向${targetName}发送了招聘邀请，职位：${position}，月薪：${salary}元`,
        result: { hired: true, companyId, targetName, position, salary },
        stateChanges: [{ activity: `招聘${targetName}` }],
      };
    },
  };
}

export function createBuyStockTool(repo: Repository): AgentTool {
  return {
    name: 'buy_stock',
    description: '购买股票',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: '股票代码' },
        shares: { type: 'number', description: '购买股数' },
        companyId: { type: 'string', description: '公司ID（可选）' },
      },
      required: ['shares'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const shares = Number(args.shares ?? 10);
      const symbol = args.symbol ? String(args.symbol) : null;
      const companyId = args.companyId ? String(args.companyId) : null;

      let stock;
      if (companyId) {
        stock = await repo.getStock(companyId);
      } else if (symbol) {
        const stocks = await repo.getWorldStocks(context.worldId);
        stock = stocks.find(s => s.symbol === symbol);
      } else {
        const stocks = await repo.getWorldStocks(context.worldId);
        stock = stocks[0];
      }

      if (!stock || stock.price === null) {
        return { success: false, message: '找不到对应的股票或价格无效', result: { purchased: false } };
      }

      const company = await repo.getCompany(stock.companyId);
      if (!company || !company.public) {
        return { success: false, message: '这家公司还未上市，无法公开交易', result: { purchased: false } };
      }

      const price = stock.price;
      const totalCost = price * shares;
      if (context.stats.money < totalCost) {
        return {
          success: false,
          message: `资金不足！购买${shares}股需要${totalCost.toFixed(2)}元，但你只有${context.stats.money}元。`,
          result: { purchased: false },
        };
      }

      const holding = await repo.getStockHolding(context.id, stock.companyId);
      if (holding) {
        const newShares = (holding.shares ?? 0) + shares;
        const newAvgPrice = ((holding.averagePrice ?? 0) * (holding.shares ?? 0) + totalCost) / newShares;
        await repo.updateStockHolding(holding.id, { shares: newShares, averagePrice: newAvgPrice });
      } else {
        await repo.createStockHolding({
          id: nanoid(),
          worldId: context.worldId,
          agentId: context.id,
          companyId: stock.companyId,
          shares,
          averagePrice: price,
        });
      }

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'stock_purchase',
        description: `${context.profile.name}购买了${shares}股${company.name}股票，花费${totalCost.toFixed(2)}元`,
        involvedAgents: [context.id],
        priority: 25,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `成功购买${shares}股${company.name}股票，每股${price.toFixed(2)}元，花费${totalCost.toFixed(2)}元`,
        result: { purchased: true, shares, price, companyId: stock.companyId },
        statChanges: [{ stat: 'money', delta: -totalCost, reason: 'buy_stock' }],
        stateChanges: [{ activity: '投资股票' }],
      };
    },
  };
}

export function createSellStockTool(repo: Repository): AgentTool {
  return {
    name: 'sell_stock',
    description: '卖出股票',
    parameters: {
      type: 'object',
      properties: {
        companyId: { type: 'string', description: '公司ID' },
        shares: { type: 'number', description: '卖出股数' },
      },
      required: ['companyId', 'shares'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const companyId = String(args.companyId ?? '');
      const shares = Number(args.shares ?? 0);

      const holding = await repo.getStockHolding(context.id, companyId);
      if (!holding || (holding.shares ?? 0) < shares) {
        return {
          success: false,
          message: `持股不足！你只有${holding?.shares ?? 0}股`,
          result: { sold: false },
        };
      }

      const stock = await repo.getStock(companyId);
      if (!stock || stock.price === null) {
        return { success: false, message: '股票不存在', result: { sold: false } };
      }

      const company = await repo.getCompany(companyId);
      const price = stock.price;
      const totalValue = price * shares;
      const profit = totalValue - (holding.averagePrice ?? 0) * shares;

      const newShares = (holding.shares ?? 0) - shares;
      if (newShares <= 0) {
        await repo.updateStockHolding(holding.id, { shares: 0 });
      } else {
        await repo.updateStockHolding(holding.id, { shares: newShares });
      }

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'stock_sale',
        description: `${context.profile.name}卖出${shares}股${company?.name ?? '股票'}，获得${totalValue.toFixed(2)}元${profit > 0 ? `，盈利${profit.toFixed(2)}元` : ''}`,
        involvedAgents: [context.id],
        priority: 25,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `成功卖出${shares}股${company?.name ?? ''}股票，获得${totalValue.toFixed(2)}元${profit > 0 ? `，盈利${profit.toFixed(2)}元！` : profit < 0 ? `，亏损${Math.abs(profit).toFixed(2)}元` : ''}`,
        result: { sold: true, shares, price, totalValue, profit },
        statChanges: [
          { stat: 'money', delta: totalValue, reason: 'sell_stock' },
          { stat: 'mood', delta: profit > 0 ? 10 : profit < 0 ? -5 : 0, reason: 'sell_stock' },
        ],
        stateChanges: [{ activity: '卖出股票' }],
      };
    },
  };
}

export function createInvestTool(repo: Repository): AgentTool {
  return {
    name: 'invest',
    description: '投资项目、公司或其他人',
    parameters: {
      type: 'object',
      properties: {
        targetId: { type: 'string', description: '投资目标ID' },
        targetType: { type: 'string', description: '投资类型：company/agent/project' },
        amount: { type: 'number', description: '投资金额' },
        description: { type: 'string', description: '投资说明' },
      },
      required: ['targetId', 'targetType', 'amount'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetId = String(args.targetId ?? '');
      const targetType = String(args.targetType ?? 'company') as 'company' | 'agent' | 'project';
      const amount = Number(args.amount ?? 1000);
      const description = args.description ? String(args.description) : '';

      if (context.stats.money < amount) {
        return {
          success: false,
          message: `资金不足！投资需要${amount}元，但你只有${context.stats.money}元。`,
          result: { invested: false },
        };
      }

      await repo.createInvestment({
        id: nanoid(),
        worldId: context.worldId,
        investorId: context.id,
        targetId,
        targetType,
        amount,
      });

      if (targetType === 'company') {
        const company = await repo.getCompany(targetId);
        if (company) {
          const newValuation = (company.valuation ?? 0) + amount;
          await repo.updateCompany(targetId, { valuation: newValuation });
        }
      }

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'investment',
        description: `${context.profile.name}投资${targetType}"${targetId}"${amount}元${description ? `：${description}` : ''}`,
        involvedAgents: [context.id],
        priority: 35,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `成功投资${amount}元到${targetType}"${targetId}"`,
        result: { invested: true, targetId, targetType, amount },
        statChanges: [{ stat: 'money', delta: -amount, reason: 'invest' }],
        stateChanges: [{ activity: `投资${targetType}` }],
      };
    },
  };
}

export function createCreatePlatformTool(repo: Repository): AgentTool {
  return {
    name: 'create_platform',
    description: '创建虚拟社交/媒体平台',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '平台名称' },
        type: { type: 'string', description: '平台类型：video_short/video_long/social/image/forum/job/dating' },
        description: { type: 'string', description: '平台描述' },
      },
      required: ['name', 'type'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const name = String(args.name ?? '新平台');
      const type = String(args.type ?? 'social') as 'video_short' | 'video_long' | 'social' | 'image' | 'forum' | 'job' | 'dating';
      const description = args.description ? String(args.description) : '';

      const cost = 10000;
      if (context.stats.money < cost) {
        return {
          success: false,
          message: `资金不足！创建平台需要${cost}元，但你只有${context.stats.money}元。`,
          result: { created: false },
        };
      }

      const platform = await repo.createPlatform({
        id: nanoid(),
        worldId: context.worldId,
        name,
        type,
      });

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'platform_created',
        description: `${context.profile.name}创建了${type}平台"${name}"${description ? `：${description}` : ''}`,
        involvedAgents: [context.id],
        priority: 45,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `成功创建平台"${name}"（${type}），投入${cost}元`,
        result: { platformId: platform.id, name, type },
        statChanges: [{ stat: 'money', delta: -cost, reason: 'create_platform' }],
        stateChanges: [{ activity: `运营平台${name}` }],
      };
    },
  };
}

export function createWriteCodeTool(repo: Repository): AgentTool {
  return {
    name: 'write_code',
    description: '在沙盒中编写代码',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: '代码内容' },
        language: { type: 'string', description: '语言：javascript/python/typescript' },
        description: { type: 'string', description: '代码用途说明' },
      },
      required: ['code'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const code = String(args.code ?? '');
      const language = String(args.language ?? 'javascript') as 'javascript' | 'python' | 'typescript';
      const description = args.description ? String(args.description) : '';

      if (code.length > 5000) {
        return { success: false, message: '代码太长（限制5000字符）', result: { written: false } };
      }

      const dangerousPatterns = [
        /eval\s*\(/,
        /exec\s*\(/,
        /require\s*\(\s*['"]child_process/,
        /import\s+.*child_process/,
        /process\.env/,
        /fs\.(read|write|unlink)/,
        /__dirname|__filename/,
        /os\./,
        /system\s*\(/,
        /subprocess/,
      ];

      const hasDangerousCode = dangerousPatterns.some(p => p.test(code));
      if (hasDangerousCode) {
        return {
          success: false,
          message: '代码包含潜在危险操作，已拒绝提交。沙盒环境不允许访问系统资源。',
          result: { written: false, reason: 'security_check_failed' },
        };
      }

      const sandbox = await repo.createSandboxCode({
        id: nanoid(),
        worldId: context.worldId,
        agentId: context.id,
        code,
        language,
      });

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'code_written',
        description: `${context.profile.name}编写了${language}代码${description ? `：${description}` : ''}`,
        involvedAgents: [context.id],
        priority: 20,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `代码已提交到沙盒，等待执行。ID: ${sandbox.id}`,
        result: { sandboxId: sandbox.id, language },
        statChanges: [{ stat: 'energy', delta: -15, reason: 'write_code' }],
        stateChanges: [{ activity: '编写代码' }],
      };
    },
  };
}

export function createFindJobTool(): AgentTool {
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const jobType = String(args.jobType ?? '普通员工');
      const company = args.company ? String(args.company) : '附近的公司';

      const stateChanges: StateChange = { activity: `正在找${jobType}工作` };

      const baseSuccessRate = 0.5;
      const moodModifier = Math.max(0, Math.min(0.3, (context.stats.mood - 50) / 100));
      const energyModifier = Math.max(0, Math.min(0.2, (context.stats.energy - 30) / 100));
      const successRate = Math.min(0.9, baseSuccessRate + moodModifier + energyModifier);
      
      const success = Math.random() < successRate;

      if (success) {
        return {
          success: true,
          message: `你成功获得了一份${company}的${jobType}面试机会！`,
          result: { interviewScheduled: true, company, jobType, successRate },
          statChanges: [{ stat: 'energy', delta: -10, reason: 'job_search' }],
          stateChanges: [stateChanges],
        };
      }
      return {
        success: false,
        message: `很遗憾，${company}暂时没有招聘${jobType}的计划。继续提升能力吧！`,
        result: { interviewScheduled: false, successRate },
        statChanges: [{ stat: 'mood', delta: -5, reason: 'job_search_failed' }],
        stateChanges: [stateChanges],
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const item = String(args.item ?? '东西');
      const price = Number(args.price ?? 100);
      const quantity = Number(args.quantity ?? 1);
      const totalCost = price * quantity;

      if (context.stats.money < totalCost) {
        return {
          success: false,
          message: `钱不够！购买${quantity}个${item}需要${totalCost}元，但你只有${context.stats.money}元。`,
          result: { purchased: false },
        };
      }

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'purchase',
        description: `${context.profile.name}购买了${quantity}个${item}，花费${totalCost}元`,
        involvedAgents: [context.id],
        priority: 30,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `成功购买${quantity}个${item}，花费${totalCost}元。`,
        result: { purchased: true, item, quantity, totalCost },
        statChanges: [{ stat: 'money', delta: -totalCost, reason: 'purchase' }],
        stateChanges: [{ activity: `购买了${quantity}个${item}` }],
      };
    },
  };
}

export function createSocializeTool(): AgentTool {
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetName = String(args.targetName ?? '某人');
      const action = String(args.action ?? '聊天');
      const message = args.message ? String(args.message) : '';

      const baseMoodChange = Math.floor(Math.random() * 20) - 5;
      const contextModifier = context.stats.mood > 70 ? 5 : context.stats.mood < 30 ? -5 : 0;
      const moodChange = Math.max(-15, Math.min(15, baseMoodChange + contextModifier));

      return {
        success: true,
        message: `你和${targetName}进行了${action}${message ? `，你说："${message}"` : ''}。心情${moodChange >= 0 ? '变好了' : '变差了'}。`,
        result: { targetName, action, moodChange },
        statChanges: [{ stat: 'mood', delta: moodChange, reason: 'social_interaction' }],
        stateChanges: [{ activity: `正在和${targetName}${action}`, status: 'socializing' }],
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const duration = Number(args.duration ?? 1);
      const restType = String(args.type ?? '休息');

      const energyRecovery = Math.min(100 - context.stats.energy, duration * 15);

      return {
        success: true,
        message: `你${restType}了${duration}小时，恢复了${energyRecovery}点精力。`,
        result: { energyRecovery, duration },
        statChanges: [{ stat: 'energy', delta: energyRecovery, reason: 'rest' }],
        stateChanges: [{ activity: `正在${restType}`, status: 'sleeping' }],
        duration: duration * 60,
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const hours = Number(args.hours ?? 8);
      const task = args.task ? String(args.task) : '日常工作';

      const energyCost = Math.min(context.stats.energy, hours * 5);
      const baseEarning = hours * 50;
      const bonus = Math.random() > 0.8 ? Math.floor(Math.random() * 100) : 0;
      const totalEarning = baseEarning + bonus;
      const moodChange = hours > 8 ? -10 : 5;

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'work',
        description: `${context.profile.name}工作了${hours}小时，赚取了${totalEarning}元`,
        involvedAgents: [context.id],
        priority: 20,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `你工作了${hours}小时（${task}），消耗${energyCost}精力，赚取${totalEarning}元${bonus > 0 ? `（含奖金${bonus}元）` : ''}。`,
        result: { hours, earning: totalEarning, energyCost },
        statChanges: [
          { stat: 'energy', delta: -energyCost, reason: 'work' },
          { stat: 'money', delta: totalEarning, reason: 'work' },
          { stat: 'mood', delta: moodChange, reason: 'work' },
        ],
        stateChanges: [{ activity: `正在工作：${task}`, status: 'working' }],
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetName = String(args.targetName ?? '某人');
      const content = String(args.content ?? '');

      const moodChange = Math.random() > 0.3 ? 5 : -3;

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'message',
        description: `${context.profile.name}给${targetName}发了消息："${content.slice(0, 50)}..."`,
        involvedAgents: [context.id],
        priority: 20,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `你给${targetName}发了一条消息："${content}"`,
        result: { targetName, content, moodChange },
        statChanges: [
          { stat: 'energy', delta: -5, reason: 'send_message' },
          { stat: 'mood', delta: moodChange, reason: 'send_message' },
        ],
        stateChanges: [{ activity: `给${targetName}发消息` }],
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetLocation = String(args.targetLocation ?? '某地');
      const reason = args.reason ? String(args.reason) : '';
      const oldLocation = context.state.currentLocation;

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'movement',
        description: `${context.profile.name}从${oldLocation || '某处'}移动到了${targetLocation}${reason ? `，原因：${reason}` : ''}`,
        involvedAgents: [context.id],
        priority: 20,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `你从${oldLocation || '原地'}移动到了${targetLocation}`,
        result: { oldLocation, newLocation: targetLocation, reason },
        statChanges: [{ stat: 'energy', delta: -10, reason: 'movement' }],
        stateChanges: [{ activity: `前往${targetLocation}`, location: targetLocation, status: 'traveling' }],
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
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const businessName = String(args.businessName ?? '我的企业');
      const businessType = String(args.businessType ?? '服务');
      const capital = Number(args.capital ?? 10000);
      const description = String(args.description ?? '');

      if (context.stats.money < capital) {
        return {
          success: false,
          message: `资金不足！创业需要${capital}元，但你只有${context.stats.money}元。`,
          result: { started: false },
        };
      }

      await repo.createEvent({
        id: nanoid(),
        worldId: context.worldId,
        type: 'business',
        description: `${context.profile.name}创办了${businessType}企业"${businessName}"，投入资金${capital}元。${description}`,
        involvedAgents: [context.id],
        priority: 40,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `恭喜！你成功创办了${businessType}企业"${businessName}"，投入资金${capital}元。`,
        result: { businessName, businessType, capital, started: true },
        statChanges: [
          { stat: 'money', delta: -capital, reason: 'business_startup' },
          { stat: 'mood', delta: 20, reason: 'business_startup' },
          { stat: 'energy', delta: -30, reason: 'business_startup' },
        ],
        stateChanges: [{ activity: `经营${businessName}` }],
      };
    },
  };
}

export function createPostSocialTool(): AgentTool {
  return {
    name: 'post_social',
    description: '在虚拟社交媒体平台发布动态',
    parameters: {
      type: 'object',
      properties: {
        content: { type: 'string', description: '动态内容' },
        platform: { type: 'string', description: '平台名称（可选）' },
      },
      required: ['content'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const content = String(args.content ?? '');
      return {
        success: true,
        message: `你在社交平台发布了："${content}"`,
        result: { content },
        stateChanges: [{ activity: '发动态' }],
      };
    },
  };
}

export function createCheckRelationshipTool(repo: Repository): AgentTool {
  return {
    name: 'check_relationship',
    description: '查看与某人的关系状态',
    parameters: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: '对方的名字' },
      },
      required: ['targetName'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetName = String(args.targetName ?? '某人');
      const rels = await repo.getAgentRelationships(context.id);
      const rel = rels.find(
        (r) =>
          (r.targetAgentId as unknown as string) === targetName ||
          (r.type as unknown as string) === targetName
      );
      if (rel) {
        return {
          success: true,
          message: `你和${targetName}的关系：${rel.type as string}，亲密度：${rel.intimacy ?? 0}`,
          result: rel,
        };
      }
      return {
        success: true,
        message: `你和${targetName}还不认识`,
        result: { type: 'stranger', intimacy: 0 },
      };
    },
  };
}

export function createSendFriendRequestTool(): AgentTool {
  return {
    name: 'send_friend_request',
    description: '发送好友请求',
    parameters: {
      type: 'object',
      properties: {
        targetName: { type: 'string', description: '对方的名字' },
        message: { type: 'string', description: '附加消息（可选）' },
      },
      required: ['targetName'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const targetName = String(args.targetName ?? '某人');
      return {
        success: true,
        message: `你向${targetName}发送了好友请求`,
        result: { targetName },
        statChanges: [{ stat: 'mood', delta: 3, reason: 'friend_request' }],
      };
    },
  };
}

export function createSearchMemoryTool(): AgentTool {
  return {
    name: 'search_memory',
    description: '搜索自己的记忆，查找相关信息',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
      },
      required: ['query'],
    },
    execute: async (args: Record<string, unknown>, context: ToolContext): Promise<ToolResult> => {
      const query = String(args.query ?? '');
      const results = await context.memory.search(query, 5);
      return {
        success: true,
        message: results.length > 0
          ? `找到了${results.length}条相关记忆`
          : '没有找到相关记忆',
        result: { query, results },
      };
    },
  };
}

export function registerDefaultTools(registry: { register: (tool: AgentTool) => void }, repo: Repository): void {
  registry.register(createFindJobTool());
  registry.register(createBuyItemTool(repo));
  registry.register(createSocializeTool());
  registry.register(createRestTool());
  registry.register(createWorkTool(repo));
  registry.register(createSendMessageTool(repo));
  registry.register(createChangeLocationTool(repo));
  registry.register(createStartBusinessTool(repo));
  registry.register(createPostSocialTool());
  registry.register(createCheckRelationshipTool(repo));
  registry.register(createSendFriendRequestTool());
  registry.register(createSearchMemoryTool());
  registry.register(createCreateCompanyTool(repo));
  registry.register(createHireAgentTool(repo));
  registry.register(createBuyStockTool(repo));
  registry.register(createSellStockTool(repo));
  registry.register(createInvestTool(repo));
  registry.register(createCreatePlatformTool(repo));
  registry.register(createWriteCodeTool(repo));
}