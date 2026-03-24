import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: string;
}

export interface NewsPost {
  id: number;
  title: string;
  content: string;
  authorId: number;
  publishDate: string;
}

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getChatHistory(userId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/history/${userId}`, [], this.baseUrl);
  }

  sendMessage(msg: Partial<ChatMessage>): Observable<ChatMessage> {
    return this.api.post<ChatMessage>('/api/communication/chat/send', msg, undefined, this.baseUrl);
  }

  getNews(): Observable<NewsPost[]> {
    return this.api.get<NewsPost[]>('/api/communication/news', [], this.baseUrl);
  }
}
