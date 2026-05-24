import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WidgetSocketService } from './widget-socket.service';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { NotificationItem } from '../../shared/models/ui.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly widgetSocket = inject(WidgetSocketService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.apiBaseUrl;
  
  private readonly manualNotifications = signal<NotificationItem[]>([]);

  readonly items = computed(() => {
    const socketItems = this.widgetSocket.events()
      .filter(e => e.topic.includes('notifications.'))
      .map((event, index) => {
        const payload = event.payload as any;
        return {
          id: payload.id || (2000 + index),
          title: payload.title || 'Live Alert',
          content: payload.message || payload.content || 'New event received.',
          category: payload.type || 'System',
          when: 'Just now',
          status: 'Unread' as const,
          isRead: false
        } as NotificationItem;
      });

    // Combine historical logs with real-time socket events
    return [...socketItems, ...this.manualNotifications()].sort((a,b) => b.id - a.id);
  });

  readonly unreadCount = computed(() => this.items().filter((item) => !item.isRead).length);

  constructor() {
    this.init();
  }

  private init(): void {
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.loadHistory();
        this.widgetSocket.subscribe(`/topic/notifications.${user.id}`);
      }
    });
  }

  loadHistory(): void {
    this.api.get<any[]>(`${this.baseUrl}/api/notifications/me`, []).subscribe(logs => {
      const mapped = logs.map((l: any) => ({
        id: l.id,
        title: l.title || 'System Notification',
        content: l.message || l.content,
        category: l.type || 'Alert',
        when: 'Earlier',
        status: (l.status === 'READ' ? 'Read' : 'Unread') as any,
        isRead: l.status === 'READ'
      } as NotificationItem));

      this.manualNotifications.set(mapped);
    });
  }

  markAllAsRead(): void {
    this.api.patch(`${this.baseUrl}/api/notifications/me/read-all`, {}).subscribe(() => {
      this.loadHistory();
    });
  }

  markAsRead(id: number): void {
    this.api.patch(`${this.baseUrl}/api/notifications/${id}/read`, {}).subscribe(() => {
      this.loadHistory();
    });
  }
}
