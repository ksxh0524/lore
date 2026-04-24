import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import type { AgentRuntime } from '../agent/agent-runtime.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('economy');

export class EconomyEngine {
  private repo: Repository;

  constructor(repo: Repository) { this.repo = repo; }

  async initAgentEconomy(worldId: string, agentId: string, balance = 0, income = 0, expenses = 0) {
    logger.debug({ agentId, balance, income, expenses }, 'Agent economy initialized');
    return this.repo.createEconomy({ id: nanoid(), worldId, agentId, balance, income, expenses });
  }

  async spend(agentId: string, amount: number, _reason: string): Promise<boolean> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco || (eco.balance ?? 0) < amount) {
      logger.warn({ agentId, amount, balance: eco?.balance ?? 0 }, 'Insufficient funds for spend');
      return false;
    }
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) - amount });
    logger.debug({ agentId, amount, newBalance: (eco.balance ?? 0) - amount }, 'Spent money');
    return true;
  }

  async earn(agentId: string, amount: number, _reason: string): Promise<void> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco) return;
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) + amount });
    logger.debug({ agentId, amount, newBalance: (eco.balance ?? 0) + amount }, 'Earned money');
  }

  /**
   * Monthly settlement: balance += income - expenses
   * Should be called when world clock advances to new month
   */
  async monthlySettle(worldId: string, agents?: IterableIterator<AgentRuntime>): Promise<void> {
    const agentList = agents ? [...agents] : await this.repo.getWorldAgents(worldId);
    
    logger.info({ worldId, agentCount: agentList.length }, 'Monthly settlement started');
    
    for (const agent of agentList) {
      const eco = await this.repo.getAgentEconomy(agent.id);
      if (!eco) continue;
      
      const oldBalance = eco.balance ?? 0;
      const newBalance = oldBalance + (eco.income ?? 0) - (eco.expenses ?? 0);
      
      await this.repo.updateEconomy(eco.id, { balance: newBalance });
      
      await this.repo.createEvent({
        id: nanoid(),
        worldId,
        type: 'economic',
        description: `Agent ${agent.id} 月度结算：收入${eco.income ?? 0}，支出${eco.expenses ?? 0}，余额从${oldBalance}变为${newBalance}`,
        involvedAgents: [agent.id],
        timestamp: new Date(),
        priority: 30,
      });
    }
    
    logger.info({ worldId }, 'Monthly settlement completed');
  }
}
