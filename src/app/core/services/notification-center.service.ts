import { Injectable, computed, inject, signal, effect } from '@angular/core';
import { WidgetSocketService } from './widget-socket.service';
import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { NotificationItem } from '../../shared/models/ui.models';

@Injectable({ providedIn: 'root' })
export class NotificationCenterService {
  private readonly widgetSocket = inject(WidgetSocketService);
  private readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly manualNotifications = signal<NotificationItem[]>([]);

  private readonly seed: NotificationItem[] = [
    { id: 1, title: 'Payroll review', content: 'Finance has 12 payroll exceptions pending approval.', category: 'Payroll', when: '10m ago', status: 'Unread', isRead: false },
    { id: 2, title: 'Leave overlap', content: 'Two supervisors requested the same date block.', category: 'Leave', when: '45m ago', status: 'Unread', isRead: false }
  ];

  readonly items = computed(() => {
    const socketItems = this.widgetSocket.events()
      .filter(e => e.topic.includes('notifications'))
      .map((event, index) => {
        const payload = event.payload as any;
        return {
          id: 1000 + index,
          title: payload.title || 'System Alert',
          content: payload.message || payload.content || 'New event received.',
          category: payload.type || 'Chat',
          when: 'Just now',
          status: 'Unread' as const,
          isRead: false
        } as NotificationItem;
      });

    return [...this.manualNotifications(), ...socketItems, ...this.seed];
  });

  readonly unreadCount = computed(() => this.items().filter((item) => item.status === 'Unread').length);

  constructor() {
    this.loadHistory();
    // Automatically subscribe to personal notifications when logged in
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.widgetSocket.subscribe(`/topic/notifications/${user.id}`);
      }
    });
  }

  private loadHistory(): void {
    const user = this.auth.user();
    if (!user) return;

    // Call via API Gateway (Port 8080)
    const url = `http://localhost:8080/api/notifications/logs/${user.id}`;
    this.api.get<any[]>(url, []).subscribe(logs => {
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
}
