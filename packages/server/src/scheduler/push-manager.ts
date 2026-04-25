import type { WorldEvent } from '@lore/shared';

interface Client {
  send: (data: string) => void;
  _subscribedEvents?: Set<string>;
}

const MAX_CLIENTS = 50;

export class PushManager {
  private clients = new Set<Client>();

  addClient(client: Client): boolean {
    if (this.clients.size >= MAX_CLIENTS) {
      return false;
    }
    this.clients.add(client);
    return true;
  }

  removeClient(client: Client): void {
    this.clients.delete(client);
  }

  getStats(): { count: number; max: number } {
    return { count: this.clients.size, max: MAX_CLIENTS };
  }

  async push(event: WorldEvent, _worldId: string): Promise<void> {
    const msg = JSON.stringify({ type: 'event', event });
    this.broadcastToSubscribers(msg, 'event');
  }

  broadcast(message: Record<string, unknown>): void {
    const eventType = typeof message.type === 'string' ? message.type : '';
    const data = JSON.stringify(message);
    this.broadcastToSubscribers(data, eventType);
  }

  private broadcastToSubscribers(data: string, eventType: string): void {
    const dead: Client[] = [];
    for (const client of this.clients) {
      if (client._subscribedEvents && !client._subscribedEvents.has(eventType) && !client._subscribedEvents.has('*')) {
        continue;
      }
      try {
        client.send(data);
      } catch {
        dead.push(client);
      }
    }
    for (const c of dead) this.clients.delete(c);
  }
}