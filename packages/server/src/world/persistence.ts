import type { Repository } from '../db/repository.js';

export class WorldPersistence {
  private repo: Repository;

  constructor(repo: Repository) { this.repo = repo; }

  async saveWorldState(worldId: string): Promise<void> {
    // auto-persist handled by AgentManager.persistAll()
    await this.repo.updateWorld(worldId, { worldTime: new Date() });
  }
}
