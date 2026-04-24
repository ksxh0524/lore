import { nanoid } from 'nanoid';
import type { Repository } from '../db/repository.js';
import type { AgentManager } from '../agent/agent-manager.js';
import type { WorldSnapshot } from '@lore/shared';
import { LoreError, ErrorCode } from '../errors.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('persistence');

export class WorldPersistence {
  private repo: Repository;
  private agentManager: AgentManager;

  constructor(repo: Repository, agentManager: AgentManager) {
    this.repo = repo;
    this.agentManager = agentManager;
  }

  async saveSnapshot(worldId: string, name: string): Promise<string> {
    const agents = await this.agentManager.getWorldAgents(worldId);
    const events = await this.repo.getWorldEvents(worldId);
    const world = await this.repo.getWorld(worldId);
    const snapshot: WorldSnapshot = {
      world: world ? {
        id: world.id,
        name: world.name,
        type: world.type,
        status: world.status,
        currentTick: world.currentTick ?? 0,
        worldTime: world.worldTime?.toISOString() ?? null,
      } : null,
      agents: agents.map((a) => a.serialize()),
      events: events as WorldSnapshot['events'],
      savedAt: new Date().toISOString(),
    };
    const saveId = nanoid();
    await this.repo.createSave({ id: saveId, worldId, name, snapshot });
    return saveId;
  }

  async loadSnapshot(saveId: string): Promise<{ worldId: string; snapshot: WorldSnapshot } | null> {
    const save = await this.repo.getSave(saveId);
    if (!save) return null;
    return { worldId: save.worldId, snapshot: save.snapshot as WorldSnapshot };
  }

  async restoreSnapshot(saveId: string): Promise<void> {
    const save = await this.repo.getSave(saveId);
    if (!save) throw new LoreError(ErrorCode.NOT_FOUND, `Save ${saveId} not found`, 404);

    const data = typeof save.snapshot === 'string' ? JSON.parse(save.snapshot) : save.snapshot;

    if (data.world) {
      await this.repo.updateWorld(data.world.id, {
        status: data.world.status,
        currentTick: data.world.currentTick,
        worldTime: data.world.worldTime ? new Date(data.world.worldTime) : new Date(),
      });
    }

    if (data.agents && Array.isArray(data.agents)) {
      for (const agentData of data.agents) {
        try {
          await this.repo.updateAgent(agentData.id, {
            state: agentData.state,
            stats: agentData.stats,
          });
        } catch (err) {
          logger.warn({ agentId: agentData.id, err }, 'Failed to restore agent');
        }
      }
    }
  }

  async listSnapshots(worldId: string) {
    return this.repo.getSaves(worldId);
  }

  async saveWorldState(worldId: string): Promise<void> {
    await this.repo.updateWorld(worldId, { worldTime: new Date() });
  }
}
