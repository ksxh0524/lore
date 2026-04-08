import { nanoid } from 'nanoid';
import type { Repository } from '../db/repository.js';
import type { AgentManager } from '../agent/agent-manager.js';

export class WorldPersistence {
  private repo: Repository;

  constructor(repo: Repository) { this.repo = repo; }

  async saveSnapshot(worldId: string, agentManager: AgentManager, name: string): Promise<string> {
    const agents = await agentManager.getWorldAgents(worldId);
    const events = await this.repo.getWorldEvents(worldId);
    const world = await this.repo.getWorld(worldId);
    const snapshot = {
      world: world ?? null,
      agents: agents.map((a) => a.serialize()),
      events,
      savedAt: new Date().toISOString(),
    };
    const saveId = nanoid();
    await this.repo.createSave({ id: saveId, worldId, name, snapshot });
    return saveId;
  }

  async loadSnapshot(saveId: string): Promise<{ worldId: string; snapshot: any } | null> {
    const rows = await this.repo.getSaves('');
    const save = rows.find((s) => s.id === saveId);
    if (!save) return null;
    return { worldId: save.worldId, snapshot: save.snapshot };
  }

  async listSnapshots(worldId: string) {
    return this.repo.getSaves(worldId);
  }

  async saveWorldState(worldId: string): Promise<void> {
    await this.repo.updateWorld(worldId, { worldTime: new Date() });
  }
}
