import type { RelationshipType } from '@lore/shared';
import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import { createLogger } from '../logger/index.js';

const logger = createLogger('relationships');

const transitionThresholds: Array<{ from: RelationshipType; to: RelationshipType; minIntimacy: number }> = [
  { from: 'stranger', to: 'acquaintance', minIntimacy: 11 },
  { from: 'acquaintance', to: 'friend', minIntimacy: 31 },
  { from: 'friend', to: 'close_friend', minIntimacy: 61 },
  { from: 'close_friend', to: 'partner', minIntimacy: 81 },
];

export class RelationshipManager {
  private repo: Repository;

  constructor(repo: Repository) {
    this.repo = repo;
  }

  async get(agentId: string, targetId: string) {
    const all = await this.repo.getAgentRelationships(agentId);
    return all.find(r => r.targetAgentId === targetId) ?? null;
  }

  async getAll(agentId: string) {
    return this.repo.getAgentRelationships(agentId);
  }

  async getKnownAgents(agentId: string): Promise<string[]> {
    const rels = await this.repo.getAgentRelationships(agentId);
    return rels.filter(r => r.type !== 'stranger').map(r => r.targetAgentId);
  }

  async update(agentId: string, targetId: string, delta: { intimacy?: number; type?: RelationshipType; historyEntry?: string }): Promise<void> {
    let rel = await this.get(agentId, targetId);

    if (!rel) {
      await this.repo.createRelationship({
        id: nanoid(),
        agentId,
        targetAgentId: targetId,
        worldId: '',
        type: delta.type ?? 'stranger',
        intimacy: delta.intimacy ?? 0,
      });

      await this.repo.createRelationship({
        id: nanoid(),
        agentId: targetId,
        targetAgentId: agentId,
        worldId: '',
        type: delta.type ?? 'stranger',
        intimacy: delta.intimacy ?? 0,
      });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (delta.intimacy !== undefined) {
      updateData.intimacy = Math.max(-50, Math.min(100, (rel.intimacy ?? 0) + delta.intimacy));
    }
    if (delta.type !== undefined) {
      updateData.type = delta.type;
    }
    if (delta.historyEntry) {
      const history = (rel.history as string[]) ?? [];
      history.push(delta.historyEntry);
      updateData.history = history.slice(-20);
    }

    await this.repo.updateRelationship(rel.id, updateData);

    const reverseRel = (await this.repo.getAgentRelationships(targetId)).find(r => r.targetAgentId === agentId);
    if (reverseRel && delta.intimacy !== undefined) {
      await this.repo.updateRelationship(reverseRel.id, {
        intimacy: Math.max(-50, Math.min(100, (reverseRel.intimacy ?? 0) + Math.floor(delta.intimacy * 0.6))),
      });
    }

    await this.checkTypeTransition(agentId, targetId);
  }

  async checkTypeTransition(agentId: string, targetId: string): Promise<void> {
    const rel = await this.get(agentId, targetId);
    if (!rel) return;

    const intimacy = rel.intimacy ?? 0;
    const currentType = rel.type as RelationshipType;

    if (intimacy <= 0 && currentType !== 'enemy') {
      await this.repo.updateRelationship(rel.id, { type: 'enemy' });
      return;
    }

    for (const t of transitionThresholds) {
      if (currentType === t.from && intimacy >= t.minIntimacy) {
        await this.repo.updateRelationship(rel.id, { type: t.to });
        const reverseRel = (await this.repo.getAgentRelationships(targetId)).find(r => r.targetAgentId === agentId);
        if (reverseRel && (reverseRel.type as RelationshipType) === t.from) {
          await this.repo.updateRelationship(reverseRel.id, { type: t.to });
        }
        break;
      }
    }
  }

  async decayInactive(worldId: string): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      await this.repo.decayInactiveRelationships(cutoff);
    } catch (err) {
      logger.warn({ worldId, err }, 'Failed to decay inactive relationships');
    }
  }
}
