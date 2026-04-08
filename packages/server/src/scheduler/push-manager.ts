import type { WorldEvent } from '@lore/shared';

interface Client {
  send: (data: string) => void;
  _subscribedEvents?: Set<string>;
}

export class PushManager {
  private clients = new Set<Client>();

  addClient(client: Client) { this.clients.add(client); }
  removeClient(client: Client) { this.clients.delete(client); }

  async push(event: WorldEvent, _worldId: string): Promise<void> {
    const msg = JSON.stringify({ type: 'event', event });
    const dead: Client[] = [];
    for (const client of this.clients) {
      if (client._subscribedEvents && !client._subscribedEvents.has('event') && !client._subscribedEvents.has('*')) {
        continue;
      }
      try { client.send(msg); } catch { dead.push(client); }
    }
    for (const c of dead) this.clients.delete(c);
  }

  broadcast(message: Record<string, any>): void {
    const data = JSON.stringify(message);
    const dead: Client[] = [];
    for (const client of this.clients) {
      if (client._subscribedEvents && !client._subscribedEvents.has(message.type) && !client._subscribedEvents.has('*')) {
        continue;
      }
      try { client.send(data); } catch { dead.push(client); }
    }
    for (const c of dead) this.clients.delete(c);
  }
}
