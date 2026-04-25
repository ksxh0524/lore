import type { WsMessage, WsEventType, WsClientMessage } from '@lore/shared';

type MessageHandler<T extends WsEventType> = (data: Extract<WsMessage, { type: T }> extends never ? Record<string, unknown> : Extract<WsMessage, { type: T }>) => void;

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 30000;
const RECONNECT_MAX_ATTEMPTS = 10;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, Array<(data: unknown) => void>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

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
          const data = JSON.parse(event.data) as WsMessage;
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch {
          console.warn('WebSocket message parse error');
        }
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
    this.reconnectAttempts = 0;
    this.ws?.close();
    this.ws = null;
  }

  on<T extends WsEventType>(type: T, handler: MessageHandler<T>): void {
    const handlers = this.handlers.get(type) ?? [];
    handlers.push(handler as (data: unknown) => void);
    this.handlers.set(type, handlers);
  }

  off<T extends WsEventType>(type: T, handler: MessageHandler<T>): void {
    const handlers = this.handlers.get(type);
    if (handlers) {
      this.handlers.set(type, handlers.filter(h => h !== handler));
    }
  }

  send(message: WsClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  subscribe(eventTypes: string[]): void {
    this.send({ type: 'subscribe', eventTypes });
  }

  unsubscribe(eventTypes: string[]): void {
    this.send({ type: 'unsubscribe', eventTypes });
  }

  private emit(type: string, data: unknown): void {
    const handlers = this.handlers.get(type) ?? [];
    for (const h of handlers) h(data);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= RECONNECT_MAX_ATTEMPTS) return;
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts), RECONNECT_MAX_DELAY);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }
}

export const wsClient = new WebSocketClient();