import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE Notification (subject/content, UNREAD/READ). */
export interface Notification {
  id: number;
  recipientId: number;
  companyId?: number;
  type: string;
  category?: string; // LEAVE, ATTENDANCE, SCHEDULE, TIMESHEET, PAYROLL, SYSTEM
  subject: string;
  content: string;
  status: string; // UNREAD, READ (+ legacy SENT/FAILED/PENDING)
  sentAt?: string;
}

/** Mirrors BE NotificationPreference. Absent rows mean defaults (in-app on). */
export interface NotificationPreference {
  id?: number;
  category: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
}

export const NOTIFICATION_CATEGORIES = ['LEAVE', 'ATTENDANCE', 'SCHEDULE', 'TIMESHEET', 'PAYROLL', 'SYSTEM'];

export interface NotificationInput {
  recipientId: number;
  type: string;
  subject: string;
  content: string;
}

/**
 * Matches NotificationController (/api/notifications):
 *  POST / (DASHBOARD_OPS_READ) | GET /me | GET /me/unread-count |
 *  PATCH /me/read-all | PATCH /{id}/read | DELETE /templates/{id} |
 *  GET /me/preferences | PUT /me/preferences
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getMyNotifications(): Observable<Notification[]> {
    return this.api.get<Notification[]>('/api/notifications/me', [], this.baseUrl);
  }

  getUnreadCount(): Observable<number> {
    return this.api.get<number>('/api/notifications/me/unread-count', 0, this.baseUrl);
  }

  markAllAsRead(): Observable<void> {
    return this.api.patch<void>('/api/notifications/me/read-all', {}, undefined, this.baseUrl);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.api.patch<Notification>(`/api/notifications/${id}/read`, {}, undefined, this.baseUrl);
  }

  sendNotification(input: NotificationInput): Observable<Notification> {
    return this.api.post<Notification>('/api/notifications', input, undefined, this.baseUrl);
  }

  deleteTemplate(id: number): Observable<void> {
    return this.api.delete<void>(`/api/notifications/templates/${id}`, undefined, this.baseUrl);
  }

  getMyPreferences(): Observable<NotificationPreference[]> {
    return this.api.get<NotificationPreference[]>('/api/notifications/me/preferences', undefined, this.baseUrl);
  }

  savePreferences(prefs: NotificationPreference[]): Observable<NotificationPreference[]> {
    return this.api.put<NotificationPreference[]>('/api/notifications/me/preferences', prefs, undefined, this.baseUrl);
  }
}
