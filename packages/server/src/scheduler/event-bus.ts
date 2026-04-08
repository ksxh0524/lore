export class EventBus {
  private handlers = new Map<string, Set<(data: any) => void>>();
  private static instance: EventBus;

  static getInstance(): EventBus {
    if (!EventBus.instance) EventBus.instance = new EventBus();
    return EventBus.instance;
  }

  on(event: string, handler: (data: any) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data: any): void {
    this.handlers.get(event)?.forEach(h => { try { h(data); } catch (e) { console.error('EventBus error:', e); } });
  }
}
