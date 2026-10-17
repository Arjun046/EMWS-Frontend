import { Injectable, signal } from '@angular/core';
import type { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { WidgetEvent } from '../../shared/models/ui.models';

const WIDGET_TOPICS = [
  '/topic/widgets/attendance',
  '/topic/widgets/scheduling',
  '/topic/widgets/leaves',
  '/topic/widgets/payroll',
  '/topic/widgets/admin-alerts',
  '/topic/inbox'
];

@Injectable({ providedIn: 'root' })
export class WidgetSocketService {
  private client: Client | null = null;
  private readonly pendingTopics: string[] = [];
  private readonly eventsState = signal<WidgetEvent[]>([]);
  private readonly statusState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');

  readonly events = this.eventsState.asReadonly();
  readonly status = this.statusState.asReadonly();

  /**
   * Lazily imports the STOMP client on first connect so the library rides a
   * deferred chunk instead of the initial bundle.
   */
  async connect(): Promise<void> {
    if (this.client?.active || this.statusState() === 'connecting') {
      return;
    }

    this.statusState.set('connecting');
    const { Client } = await import('@stomp/stompjs');
    if (this.statusState() !== 'connecting') {
      return;
    }
    this.client = new Client({
      brokerURL: environment.widgetSocketUrl,
      reconnectDelay: 4000,
      onConnect: () => {
        this.statusState.set('connected');
        WIDGET_TOPICS.forEach((topic) => this.client?.subscribe(topic, (message) => this.handleMessage(topic, message)));
        this.pendingTopics.splice(0).forEach((topic) => this.subscribe(topic));
      },
      onStompError: () => this.statusState.set('disconnected'),
      onWebSocketClose: () => this.statusState.set('disconnected')
    });

    this.client.activate();
  }

  subscribe(topic: string): void {
    if (this.client?.connected) {
      this.client.subscribe(topic, (message) => this.handleMessage(topic, message));
    } else if (!this.pendingTopics.includes(topic)) {
      this.pendingTopics.push(topic);
    }
  }

  private handleMessage(topic: string, message: IMessage): void {
    let payload: unknown = message.body;
    try {
      payload = JSON.parse(message.body);
    } catch {
      payload = message.body;
    }
    this.eventsState.update((events) => [{ topic, payload, receivedAt: new Date().toISOString() }, ...events].slice(0, 20));
  }
}
