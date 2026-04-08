import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';

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

  async monthlySettle(worldId: string): Promise<void> {
    // TODO: implement when tick system tracks months
  }
}
