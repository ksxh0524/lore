import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import type { AgentRuntime } from '../agent/agent-runtime.js';

export class EconomyEngine {
  private repo: Repository;

  constructor(repo: Repository) { this.repo = repo; }

  async initAgentEconomy(worldId: string, agentId: string, balance = 0, income = 0, expenses = 0) {
    return this.repo.createEconomy({ id: nanoid(), worldId, agentId, balance, income, expenses });
  }

  async spend(agentId: string, amount: number, _reason: string): Promise<boolean> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco || (eco.balance ?? 0) < amount) return false;
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) - amount });
    return true;
  }

  async earn(agentId: string, amount: number, _reason: string): Promise<void> {
    const eco = await this.repo.getAgentEconomy(agentId);
    if (!eco) return;
    await this.repo.updateEconomy(eco.id, { balance: (eco.balance ?? 0) + amount });
  }

  /**
   * Monthly settlement: balance += income - expenses
   * Should be called when world clock advances to new month
   */
  async monthlySettle(worldId: string, agents?: IterableIterator<AgentRuntime>): Promise<void> {
    const agentList = agents ? [...agents] : await this.repo.getWorldAgents(worldId);
    
    for (const agent of agentList) {
      const eco = await this.repo.getAgentEconomy(agent.id);
      if (!eco) continue;
      
      const oldBalance = eco.balance ?? 0;
      const newBalance = oldBalance + (eco.income ?? 0) - (eco.expenses ?? 0);
      
      await this.repo.updateEconomy(eco.id, { balance: newBalance });
      
      // Create settlement event for agent
      await this.repo.createEvent({
        id: nanoid(),
        worldId,
        type: 'economic',
        category: 'monthly_settlement',
        description: `${agent.profile?.name ?? 'Agent'}月度结算：收入${eco.income ?? 0}，支出${eco.expenses ?? 0}，余额从${oldBalance}变为${newBalance}`,
        involvedAgents: [agent.id],
        timestamp: new Date(),
        priority: 30,
      });
    }
  }
}
