import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ChatMessage, NewsPost } from '../../shared/models/ui.models';

export interface ChatSummary {
  id: number;
  name: string;
  avatar?: string;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number;
  type: 'PRIVATE' | 'GROUP';
  status?: string;
  imageUrl?: string;
  muted?: boolean;
  archived?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getChatHistory(userId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/history/${userId}`, [], this.baseUrl);
  }

  getPrivateThread(peerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/private/thread?peerId=${peerId}`, [], this.baseUrl);
  }

  getGroupThread(groupId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/group/${groupId}`, [], this.baseUrl);
  }

  getChatSummaries(): Observable<ChatSummary[]> {
    return this.api.get<ChatSummary[]>('/api/communication/chat/summary', [], this.baseUrl);
  }

  sendMessage(msg: Partial<ChatMessage>): Observable<ChatMessage> {
    return this.api.post<ChatMessage>('/api/communication/chat/send', msg, undefined, this.baseUrl);
  }

  editMessage(id: number, content: string): Observable<ChatMessage> {
    return this.api.put<ChatMessage>(`/api/communication/chat/messages/${id}`, { content }, undefined, this.baseUrl);
  }

  deleteMessage(id: number): Observable<void> {
    return this.api.delete<void>(`/api/communication/chat/messages/${id}`, undefined, this.baseUrl);
  }

  applyReaction(messageId: number, emoji: string): Observable<ChatMessage> {
    const payload = { emoji, userId: 0, companyId: 0 }; 
    return this.api.post<ChatMessage>(`/api/communication/chat/messages/${messageId}/reactions`, payload, undefined, this.baseUrl);
  }

  // --- Group Management ---

  getGroups(): Observable<any[]> {
    return this.api.get<any[]>('/api/communication/groups', [], this.baseUrl);
  }

  createGroup(name: string, description: string, memberIds: number[]): Observable<any> {
    const payload = { name, description, memberIds: memberIds.join(',') };
    return this.api.post<any>('/api/communication/groups', payload, undefined, this.baseUrl);
  }

  getGroupMembers(groupId: number): Observable<any[]> {
    return this.api.get<any[]>(`/api/communication/groups/${groupId}/members`, [], this.baseUrl);
  }

  addGroupMember(groupId: number, userId: number): Observable<any> {
    return this.api.post<any>(`/api/communication/groups/${groupId}/members`, { userId }, undefined, this.baseUrl);
  }

  removeGroupMember(groupId: number, userId: number): Observable<any> {
    return this.api.delete<any>(`/api/communication/groups/${groupId}/members/${userId}`, undefined, this.baseUrl);
  }

  getNews(): Observable<NewsPost[]> {
    return this.api.get<NewsPost[]>('/api/communication/news', [], this.baseUrl);
  }
}
