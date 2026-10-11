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

  /** BE has no /history/{userId} — this reads the caller's private inbox. */
  getChatHistory(userId: number): Observable<ChatMessage[]> {
    void userId;
    return this.api.get<ChatMessage[]>('/api/communication/chat/private', [], this.baseUrl);
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

  getContacts(): Observable<ChatSummary[]> {
    return this.api.get<ChatSummary[]>('/api/communication/chat/contacts', [], this.baseUrl);
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

  applyReaction(messageId: number, emoji: string, userId: number, companyId: number): Observable<ChatMessage> {
    const payload = { emoji, userId, companyId }; 
    return this.api.post<ChatMessage>(`/api/communication/chat/messages/${messageId}/reactions`, payload, undefined, this.baseUrl);
  }

  removeReaction(messageId: number, userId: number): Observable<ChatMessage> {
    return this.api.delete<ChatMessage>(`/api/communication/chat/messages/${messageId}/reactions?userId=${userId}`, undefined, this.baseUrl);
  }

  // --- WhatsApp Security & E2E Keys ---

  publishPublicKey(userId: number, companyId: number, publicKey: string): Observable<any> {
    const payload = { userId, companyId, publicKey };
    return this.api.post<any>('/api/communication/keys', payload, undefined, this.baseUrl);
  }

  getPublicKey(userId: number): Observable<any> {
    return this.api.get<any>(`/api/communication/keys/${userId}`, [], this.baseUrl);
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

  addGroupMember(groupId: number, userId: number, actorUserId: number): Observable<any> {
    return this.api.post<any>(`/api/communication/groups/${groupId}/members`, { userId, actorUserId }, undefined, this.baseUrl);
  }

  removeGroupMember(groupId: number, userId: number): Observable<any> {
    return this.api.delete<any>(`/api/communication/groups/${groupId}/members/${userId}`, undefined, this.baseUrl);
  }

  getNews(): Observable<NewsPost[]> {
    return this.api.get<NewsPost[]>('/api/communication/news', [], this.baseUrl);
  }

  // --- Smart inbox / handover / search / threads (ChatMessageController) ---

  getSmartInbox(): Observable<any> {
    return this.api.get<any>('/api/communication/chat/inbox', null, this.baseUrl);
  }

  getShiftHandover(groupId: number): Observable<any> {
    return this.api.get<any>(`/api/communication/chat/group/${groupId}/handover`, null, this.baseUrl);
  }

  searchMessages(query: string): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(
      `/api/communication/chat/search?query=${encodeURIComponent(query)}`,
      [],
      this.baseUrl
    );
  }

  acknowledgeMessage(messageId: number): Observable<void> {
    return this.api.post<void>(
      `/api/communication/chat/acknowledge/${messageId}`,
      {},
      undefined,
      this.baseUrl
    );
  }

  getThreadMessages(parentMessageId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(
      `/api/communication/chat/thread/${parentMessageId}`,
      [],
      this.baseUrl
    );
  }

  getAuditEvents(): Observable<any[]> {
    return this.api.get<any[]>('/api/communication/chat/audit', [], this.baseUrl);
  }

  // --- Threads / moderation / export (ChatMessageController — exact signatures) ---

  /** BE: POST /messages/{id}/pin?status= (void, CHAT_CHANNEL_CREATE). */
  pinMessage(id: number, status = true): Observable<void> {
    return this.api.post<void>(
      `/api/communication/chat/messages/${id}/pin?status=${status}`,
      {},
      undefined,
      this.baseUrl
    );
  }

  /** BE: POST /mark-read?peerId=&groupId= (void). */
  markRead(peerId?: number | null, groupId?: number | null): Observable<void> {
    const q = groupId != null ? `groupId=${groupId}` : peerId != null ? `peerId=${peerId}` : '';
    return this.api.post<void>(`/api/communication/chat/mark-read?${q}`, {}, undefined, this.baseUrl);
  }

  /** BE: PATCH /messages/{id}/delivery-status?status= (void). */
  updateDeliveryStatus(id: number, status: string): Observable<void> {
    return this.api.patch<void>(
      `/api/communication/chat/messages/${id}/delivery-status?status=${encodeURIComponent(status)}`,
      {},
      undefined,
      this.baseUrl
    );
  }

  /** BE: GET /export?start=&end= (ISO instants, CHAT_ANALYTICS_READ). */
  exportHistory(start: string, end: string): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(
      `/api/communication/chat/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      [],
      this.baseUrl
    );
  }

  /** BE: POST /extract-tasks {messageId, assigneeId?, shiftId?, createTask?} → AI action extraction, optionally creates a task-service task. */
  extractTasks(messageId: number, opts?: { assigneeId?: number | null; shiftId?: number | null; createTask?: boolean }): Observable<{
    actionDetected: boolean; suggestedTitle?: string; suggestedDescription?: string; createdTaskId?: number;
  }> {
    return this.api.post<any>(
      '/api/communication/chat/extract-tasks',
      { messageId, assigneeId: opts?.assigneeId ?? null, shiftId: opts?.shiftId ?? null, createTask: opts?.createTask ?? true },
      undefined,
      this.baseUrl
    );
  }

  translateMessage(content: string, targetLanguage: string): Observable<any> {
    return this.api.post<any>(
      '/api/ai/translate',
      { text: content, targetLanguage },
      undefined,
      this.baseUrl
    );
  }

  // Generic passthroughs used by the communication page for ad-hoc calls.
  get<T>(path: string, fallback?: T): Observable<T> {
    return this.api.get<T>(path, fallback, this.baseUrl);
  }

  post<T>(path: string, body: unknown, fallback?: T): Observable<T> {
    return this.api.post<T>(path, body, fallback, this.baseUrl);
  }
}
