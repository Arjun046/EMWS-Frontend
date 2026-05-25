import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ChatMessage,
  ConversationContact,
  ConversationGroup,
  StatusStory
} from '../../shared/models/ui.models';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

const DEFAULT_CONTACTS: ConversationContact[] = [
  { id: 2, name: 'Priya Shah', role: 'Operations Lead', status: 'Online', avatar: 'PS' },
  { id: 3, name: 'Liam Kelly', role: 'Engineering Manager', status: 'Focus', avatar: 'LK' },
  { id: 4, name: 'Sara Khan', role: 'Support Manager', status: 'Online', avatar: 'SK' }
];

export const DEFAULT_GROUPS: ConversationGroup[] = [
  { id: 10, name: 'Team Ops', description: 'Daily staffing and incident flow', members: 18, accent: 'linear-gradient(135deg, #2563eb, #14b8a6)' },
  { id: 20, name: 'Payroll Coordination', description: 'Cycle exceptions and approvals', members: 6, accent: 'linear-gradient(135deg, #7c3aed, #ec4899)' },
  { id: 30, name: 'Leadership Room', description: 'Cross-functional operating review', members: 9, accent: 'linear-gradient(135deg, #f97316, #ef4444)' }
];

@Injectable({ providedIn: 'root' })
export class CommunicationDataService {
  private readonly commsUrl = environment.apiBaseUrl;
  private readonly empUrl = environment.apiBaseUrl;
  
  constructor(private readonly api: ApiService) {}

  loadChatSummaries(): Observable<any[]> {
    return this.api.get<any[]>('/api/communication/chat/summary', [], this.commsUrl);
  }

  getChatSummaries(): Observable<any[]> {
    return this.loadChatSummaries();
  }

  getMessages(chatId: number, isGroup: boolean, beforeId?: number): Observable<ChatMessage[]> {
    let url = isGroup 
      ? `/api/communication/chat/group/${chatId}`
      : `/api/communication/chat/private/thread?peerId=${chatId}`;
    
    if (beforeId) {
      url += isGroup ? `?beforeMessageId=${beforeId}` : `&beforeMessageId=${beforeId}`;
    }
    return this.api.get<ChatMessage[]>(url, [], this.commsUrl);
  }

  loadAllEmployees(): Observable<ConversationContact[]> {
    return this.api.get<any[]>('/api/employees', [], this.empUrl).pipe(
      map((employees) => {
        return employees.map((emp) => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.jobTitle || 'Team Member',
          status: emp.status || 'ACTIVE',
          avatar: (emp.firstName?.charAt(0) || '') + (emp.lastName?.charAt(0) || ''),
          imageUrl: emp.imageUrl || null
        }));
      })
    );
  }

  loadContacts(): Observable<ConversationContact[]> {
    return this.api.get<any[]>('/api/employees', [], this.empUrl).pipe(
      map((employees) => {
        if (!employees.length) {
          return DEFAULT_CONTACTS;
        }

        return employees.map((employee) => ({
          id: Number(employee.id),
          name: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || `Employee ${employee.id}`,
          role: employee.jobTitle ?? employee.department ?? 'Team Member',
          status: employee.status ?? 'ACTIVE',
          avatar: `${employee.firstName?.[0] ?? 'E'}${employee.lastName?.[0] ?? 'W'}`.toUpperCase()
        }));
      })
    );
  }

  loadGroups(): Observable<ConversationGroup[]> {
    return this.api.get<any[]>('/api/communication/groups', [], this.commsUrl).pipe(
      map((groups) => {
        if (!groups.length) {
          return DEFAULT_GROUPS;
        }

        return groups.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          members: item.members ?? 1,
          accent: item.accent ?? 'linear-gradient(135deg, #2563eb, #14b8a6)',
          imageUrl: item.imageUrl ?? null
        }));
      })
    );
  }

  createGroup(group: Partial<ConversationGroup>): Observable<ConversationGroup> {
    return this.api.post<ConversationGroup>('/api/communication/groups', group, undefined, this.commsUrl);
  }

  markThreadAsRead(peerId?: number, groupId?: number): Observable<void> {
    let url = '/api/communication/chat/mark-read';
    const params = [];
    if (peerId) params.push(`peerId=${peerId}`);
    if (groupId) params.push(`groupId=${groupId}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.api.post<void>(url, {}, undefined, this.commsUrl);
  }

  editMessage(messageId: number, content: string): Observable<ChatMessage> {
    return this.api.put<ChatMessage>(`/api/communication/chat/messages/${messageId}`, { content }, undefined, this.commsUrl);
  }

  deleteMessage(messageId: number): Observable<void> {
    return this.api.delete<void>(`/api/communication/chat/messages/${messageId}`, undefined, this.commsUrl);
  }

  updateConversationPreference(payload: {
    userId: number;
    companyId: number;
    conversationType: 'PRIVATE' | 'GROUP';
    conversationId: number;
    archived: boolean;
    muted: boolean;
  }): Observable<any> {
    return this.api.put<any>('/api/communication/preferences', payload, undefined, this.commsUrl);
  }

  // --- Block User APIs ---
  blockUser(userId: number, blockedUserId: number, companyId: number): Observable<any> {
    return this.api.post<any>('/api/communication/blocks', { userId, blockedUserId, companyId }, undefined, this.commsUrl);
  }

  unblockUser(userId: number, blockedUserId: number): Observable<any> {
    return this.api.delete<any>(`/api/communication/blocks/${userId}/${blockedUserId}`, undefined, this.commsUrl);
  }

  isBlocked(userId: number, peerId: number): Observable<boolean> {
    return this.api.get<boolean>(`/api/communication/blocks/is-blocked?userId=${userId}&peerId=${peerId}`, false, this.commsUrl);
  }

  getBlockedUsers(userId: number, companyId: number): Observable<any[]> {
    return this.api.get<any[]>(`/api/communication/blocks/${userId}?companyId=${companyId}`, [], this.commsUrl);
  }

  addReaction(messageId: number, emoji: string, userId: number, companyId: number): Observable<ChatMessage> {
    const payload = { emoji, userId, companyId };
    return this.api.post<ChatMessage>(
      `/api/communication/chat/messages/${messageId}/reactions`,
      payload,
      undefined,
      this.commsUrl
    );
  }

  removeReaction(messageId: number, userId: number): Observable<ChatMessage> {
    return this.api.delete<ChatMessage>(
      `/api/communication/chat/messages/${messageId}/reactions?userId=${userId}`,
      undefined,
      this.commsUrl
    );
  }

  // --- Status Story APIs (companyId & requesterId dynamic mappings) ---

  loadStatuses(companyId: number, requesterId: number): Observable<StatusStory[]> {
    return this.api.get<StatusStory[]>(`/api/communication/status?companyId=${companyId}&requesterId=${requesterId}`, [], this.commsUrl);
  }

  createStatus(payload: {
    userId: number;
    companyId: number;
    content?: string;
    mediaUrl?: string;
    backgroundStyle?: string;
    statusType?: string;
    expiresInHours?: number;
  }): Observable<StatusStory> {
    return this.api.post<StatusStory>('/api/communication/status', payload, undefined, this.commsUrl);
  }

  markStatusViewed(statusId: number, viewerId: number): Observable<void> {
    return this.api.post<void>(
      `/api/communication/status/${statusId}/view?viewerId=${viewerId}`,
      {},
      undefined,
      this.commsUrl
    );
  }

  deleteStatus(statusId: number, userId: number): Observable<void> {
    return this.api.delete<void>(`/api/communication/status/${statusId}?userId=${userId}`, undefined, this.commsUrl);
  }
}
