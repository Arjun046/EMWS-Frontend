import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  category: 'GENERAL' | 'POLICY' | 'EVENT' | 'URGENT' | 'MILESTONE';
  authorId: number;
  authorName: string;
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.base}/api/announcements`).pipe(catchError(() => of([])));
  }

  createAnnouncement(data: Partial<Announcement>): Observable<Announcement> {
    return this.http.post<Announcement>(`${this.base}/api/announcements`, data);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/announcements/${id}`);
  }

  pinAnnouncement(id: number, pinned: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/api/announcements/${id}`, { isPinned: pinned });
  }
}
