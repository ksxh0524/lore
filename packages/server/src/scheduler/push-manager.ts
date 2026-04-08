import type { WorldEvent } from '@lore/shared';

export class PushManager {
  private clients = new Set<{ send: (data: string) => void }>();

  addClient(client: { send: (data: string) => void }) { this.clients.add(client); }
  removeClient(client: { send: (data: string) => void }) { this.clients.delete(client); }

  async push(event: WorldEvent, _worldId: string): Promise<void> {
    const msg = JSON.stringify({ type: 'event', event });
    for (const client of this.clients) {
      try { client.send(msg); } catch { this.clients.delete(client); }
    }
  }

  broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const client of this.clients) {
      try { client.send(data); } catch { this.clients.delete(client); }
    }
  }
}
