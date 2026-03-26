import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  ChatMessage,
  ConversationContact,
  ConversationGroup,
  StatusStory
} from '../../shared/models/ui.models';
import { ApiService } from './api.service';

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
  private readonly commsUrl = 'http://localhost:8080';
  private readonly empUrl = 'http://localhost:8080';
  
  constructor(private readonly api: ApiService) {}

  loadChatSummaries(userId: number, companyId: number): Observable<any[]> {
    return this.api.get<any[]>(`/api/communication/chat/summary?userId=${userId}&companyId=${companyId}`, [], this.commsUrl);
  }

  loadAllEmployees(companyId?: number): Observable<ConversationContact[]> {
    let url = '/api/employees';
    if (companyId) url += `?companyId=${companyId}`;
    return this.api.get<any[]>(url, [], this.empUrl).pipe(
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

  loadGroups(companyId?: number): Observable<ConversationGroup[]> {
    let url = '/api/communication/groups';
    if (companyId) url += `?companyId=${companyId}`;
    return this.api.get<any[]>(url, [], this.commsUrl).pipe(
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

  loadPrivateThread(userId: number, peerId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/private/thread?userId=${userId}&peerId=${peerId}`, [], this.commsUrl);
  }

  loadGroupThread(groupId: number): Observable<ChatMessage[]> {
    return this.api.get<ChatMessage[]>(`/api/communication/chat/group/${groupId}`, [], this.commsUrl);
  }

  createGroup(group: Partial<ConversationGroup>): Observable<ConversationGroup> {
    return this.api.post<ConversationGroup>('/api/communication/groups', group, undefined, this.commsUrl);
  }

  publishPublicKey(userId: number, companyId: number, publicKey: string): Observable<any> {
    return this.api.post<any>('/api/communication/keys', { userId, companyId, publicKey }, undefined, this.commsUrl);
  }

  getPublicKey(userId: number): Observable<{ userId: number; publicKey: string }> {
    return this.api.get<{ userId: number; publicKey: string }>(`/api/communication/keys/${userId}`, undefined, this.commsUrl);
  }

  markThreadAsRead(userId: number, companyId: number, peerId?: number, groupId?: number): Observable<void> {
    let url = `/api/communication/chat/mark-read?userId=${userId}&companyId=${companyId}`;
    if (peerId) url += `&peerId=${peerId}`;
    if (groupId) url += `&groupId=${groupId}`;
    return this.api.post<void>(url, {}, undefined, this.commsUrl);
  }

  editMessage(messageId: number, content: string, userId: number): Observable<ChatMessage> {
    return this.api.put<ChatMessage>(`/api/communication/chat/messages/${messageId}?userId=${userId}`, { content }, undefined, this.commsUrl);
  }

  deleteMessage(messageId: number, userId: number): Observable<void> {
    return this.api.delete<void>(`/api/communication/chat/messages/${messageId}?userId=${userId}`, undefined, this.commsUrl);
  }

  pinMessage(messageId: number, status: boolean): Observable<void> {
    return this.api.post<void>(`/api/communication/chat/messages/${messageId}/pin?status=${status}`, {}, undefined, this.commsUrl);
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

  addReaction(messageId: number, userId: number, companyId: number, emoji: string): Observable<ChatMessage> {
    return this.api.post<ChatMessage>(
      `/api/communication/chat/messages/${messageId}/reactions`,
      { userId, companyId, emoji },
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

  loadStatuses(companyId: number, requesterId?: number): Observable<StatusStory[]> {
    let url = `/api/communication/status?companyId=${companyId}`;
    if (requesterId != null) {
      url += `&requesterId=${requesterId}`;
    }
    return this.api.get<StatusStory[]>(url, [], this.commsUrl);
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
