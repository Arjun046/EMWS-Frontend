import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: number;
  recipientId: number;
  title: string;
  message: string;
  status: string; // UNREAD, READ
  type: string; // SYSTEM, SHIFT, LEAVE, PAYROLL
  createdAt: string;
  subject?: string;
  content?: string;
  sentAt?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getNotifications(userId: number): Observable<Notification[]> {
    return this.api.get<Notification[]>(`/api/notifications/recipient/${userId}`, [], this.baseUrl);
  }

  getAllNotifications(): Observable<Notification[]> {
    return this.api.get<Notification[]>('/api/notifications/all', [], this.baseUrl);
  }

  markAsRead(id: number): Observable<Notification> {
    return this.api.patch<Notification>(`/api/notifications/${id}/read`, {}, undefined, this.baseUrl);
  }

  deleteNotification(id: number): Observable<void> {
    return this.api.delete<void>(`/api/notifications/${id}`, undefined, this.baseUrl);
  }
}
