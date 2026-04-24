import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('faction');

export class FactionSystem {
  private repo: Repository;

  constructor(repo: Repository) {
    this.repo = repo;
  }

  async createFaction(worldId: string, name: string, description: string, leaderId: string): Promise<any> {
    const faction = await this.repo.createFaction({
      id: nanoid(),
      worldId,
      name,
      description,
      leaderId,
      members: [leaderId],
    });
    logger.info({ factionId: faction.id, worldId, name, leaderId }, 'Faction created');
    return faction;
  }

  async addMember(factionId: string, agentId: string): Promise<void> {
    const factions = await this.repo.getWorldFactions('');
    const faction = factions.find(f => f.id === factionId);
    if (!faction) {
      logger.warn({ factionId }, 'Faction not found for add member');
      return;
    }

    const members = (faction.members as string[]) ?? [];
    if (members.includes(agentId)) return;

    members.push(agentId);
    await this.repo.updateFaction(factionId, { members });
    logger.debug({ factionId, agentId, memberCount: members.length }, 'Member added to faction');
  }

  async removeMember(factionId: string, agentId: string): Promise<void> {
    const factions = await this.repo.getWorldFactions('');
    const faction = factions.find(f => f.id === factionId);
    if (!faction) {
      logger.warn({ factionId }, 'Faction not found for remove member');
      return;
    }

    const members = ((faction.members as string[]) ?? []).filter(m => m !== agentId);
    await this.repo.updateFaction(factionId, { members });
    logger.debug({ factionId, agentId, memberCount: members.length }, 'Member removed from faction');
  }

  async getWorldFactions(worldId: string): Promise<any[]> {
    return this.repo.getWorldFactions(worldId);
  }

  async getAgentFactions(agentId: string): Promise<any[]> {
    const allFactions = await this.repo.getWorldFactions('');
    return allFactions.filter(f => {
      const members = (f.members as string[]) ?? [];
      return members.includes(agentId);
    });
  }

  async updateReputation(factionId: string, delta: number): Promise<void> {
    const factions = await this.repo.getWorldFactions('');
    const faction = factions.find(f => f.id === factionId);
    if (!faction) return;

    const newRep = Math.max(0, Math.min(100, (faction.reputation ?? 50) + delta));
    await this.repo.updateFaction(factionId, { reputation: newRep });
  }
}
