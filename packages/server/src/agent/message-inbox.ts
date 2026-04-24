import type { Repository } from '../db/repository.js';
import { nanoid } from 'nanoid';
import { agentEventBus } from './event-bus.js';
import { createLogger } from '../logger/index.js';

const logger = createLogger('message-inbox');

export interface InboxMessage {
  id: string;
  fromAgentId: string;
  fromAgentName: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export class MessageInbox {
  private agentId: string;
  private worldId: string;
  private repo: Repository;
  private messages: InboxMessage[] = [];
  private readonly maxInboxSize = 50;

  constructor(agentId: string, worldId: string, repo: Repository) {
    this.agentId = agentId;
    this.worldId = worldId;
    this.repo = repo;
  }

  async deliverMessage(
    fromAgentId: string,
    fromAgentName: string,
    content: string,
  ): Promise<void> {
    const message: InboxMessage = {
      id: nanoid(),
      fromAgentId,
      fromAgentName,
      content,
      timestamp: new Date(),
      read: false,
    };

    this.messages.push(message);
    if (this.messages.length > this.maxInboxSize) {
      this.messages.shift();
    }

    await this.repo.createMessage({
      id: message.id,
      worldId: this.worldId,
      fromAgentId,
      toAgentId: this.agentId,
      content,
      type: 'chat',
    });

    agentEventBus.emitEvent({
      agentId: this.agentId,
      type: 'social_interaction',
      timestamp: new Date(),
      payload: {
        fromAgentId,
        fromAgentName,
        content,
        messageId: message.id,
      },
    });
  }

  getUnreadMessages(): InboxMessage[] {
    return this.messages.filter((m) => !m.read);
  }

  getAllMessages(): InboxMessage[] {
    return [...this.messages];
  }

  getPendingEvents(): Array<{ description: string }> {
    const unread = this.getUnreadMessages();
    return unread.map((m) => ({
      description: `${m.fromAgentName}给你发了一条消息："${m.content}"`,
    }));
  }

  markAllRead(): void {
    for (const m of this.messages) {
      m.read = true;
    }
  }

  markRead(messageId: string): void {
    const msg = this.messages.find((m) => m.id === messageId);
    if (msg) msg.read = true;
  }

  async restoreFromDb(): Promise<void> {
    try {
      const rows = await this.repo.getAgentMessages(this.agentId, this.maxInboxSize);
      this.messages = rows.map((r) => ({
        id: r.id,
        fromAgentId: r.fromAgentId ?? '',
        fromAgentName: '',
        content: r.content,
        timestamp: r.timestamp,
        read: true,
      }));
    } catch (err) {
      logger.warn({ agentId: this.agentId, err }, 'Failed to restore inbox from DB');
    }
  }
}
