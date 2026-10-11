import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
  private readonly api = inject(ApiService);

  getAnnouncements(): Observable<Announcement[]> {
    return this.api.get<Announcement[]>('/api/communication/news', []);
  }

  createAnnouncement(data: Partial<Announcement>): Observable<Announcement> {
    return this.api.post<Announcement>('/api/communication/news', data);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.api.delete<void>(`/api/communication/news/${id}`);
  }

  /**
   * BE PUT blind-overwrites title/content/category/pinned, so pinning does a
   * read-modify-write instead of sending a partial body (which would wipe
   * the post). There is no PATCH route.
   */
  pinAnnouncement(id: number, pinned: boolean): Observable<void> {
    return new Observable<void>((observer) => {
      this.api.get<Announcement>(`/api/communication/news/${id}`).subscribe({
        next: (current) => {
          this.api.put<void>(`/api/communication/news/${id}`, { ...current, isPinned: pinned }).subscribe({
            next: () => {
              observer.next();
              observer.complete();
            },
            error: (err) => observer.error(err)
          });
        },
        error: (err) => observer.error(err)
      });
    });
  }
}
