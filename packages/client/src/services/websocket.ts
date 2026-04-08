type WSMessageHandler = (data: any) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, WSMessageHandler[]>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${window.location.host}/ws`;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.emit('connected', {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch {}
      };

      this.ws.onclose = () => {
        this.emit('disconnected', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  on(type: string, handler: WSMessageHandler): void {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }

  off(type: string, handler: WSMessageHandler): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      this.handlers.set(type, handlers.filter(h => h !== handler));
    }
  }

  send(type: string, data: Record<string, any> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, ...data }));
    }
  }

  subscribe(eventTypes: string[]): void {
    this.send('subscribe', { eventTypes });
  }

  private emit(type: string, data: any): void {
    const handlers = this.handlers.get(type) ?? [];
    for (const h of handlers) h(data);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

export const wsClient = new WebSocketClient();
