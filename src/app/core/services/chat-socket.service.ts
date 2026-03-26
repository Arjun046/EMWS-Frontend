import { Injectable, signal } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import { environment } from '../../../environments/environment';
import { ChatMessage } from '../../shared/models/ui.models';

@Injectable({ providedIn: 'root' })
export class ChatSocketService {
  private client: Client | null = null;
  private readonly messagesState = signal<ChatMessage[]>([]);
  private readonly statusState = signal<'disconnected' | 'connecting' | 'connected'>('disconnected');
  private readonly presenceState = signal<Map<number, string>>(new Map());
  private currentUserId: number | null = null;
  private currentCompanyId: number | null = null;
  private currentGroupId: number | null = null;

  readonly messages = this.messagesState.asReadonly();
  readonly status = this.statusState.asReadonly();
  readonly presence = this.presenceState.asReadonly();

  connect(userId: number, companyId: number): void {
    if (this.currentUserId === userId && this.currentCompanyId === companyId && this.client?.active) {
      return;
    }

    console.log(`[ChatSocket] Connecting: user=${userId}, company=${companyId}`);

    if (this.client?.active) {
      void this.client.deactivate();
    }

    this.currentUserId = userId;
    this.currentCompanyId = companyId;
    this.statusState.set('connecting');
    
    const brokerUrl = environment.chatSocketUrl.replace('http', 'ws').replace('https', 'wss');

    this.client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        this.statusState.set('connected');
        console.log('[ChatSocket] Connected successfully');
        
        const base = `/topic/communication/${companyId}`;

        // 1. Private Messages
        this.client?.subscribe(`${base}/chat/private/${userId}`, (m) => this.handleMessage(m));
        
        // 2. Presence
        this.client?.subscribe(`${base}/presence`, (m) => this.handleMessage(m));

        // 3. System/Group Alerts
        this.client?.subscribe(`${base}/chat/group/all`, (m) => this.handleMessage(m));

        if (this.currentGroupId) {
          this.subscribeToGroup(this.currentGroupId, companyId);
        }
      },
      onStompError: (frame) => {
        console.error('[ChatSocket] STOMP error', frame);
        this.statusState.set('disconnected');
      },
      onWebSocketClose: () => {
        console.warn('[ChatSocket] WebSocket closed');
        this.statusState.set('disconnected');
      }
    });

    this.client.activate();
  }

  subscribeToGroup(groupId: number, companyId: number): void {
    this.currentGroupId = groupId;
    if (this.client?.connected) {
      this.client.subscribe(`/topic/communication/${companyId}/chat/group/${groupId}`, (m) => this.handleMessage(m));
    }
  }

  replaceMessages(messages: ChatMessage[]): void {
    this.messagesState.set(messages);
  }

  upsertMessage(message: ChatMessage): void {
    this.messagesState.update((messages) => {
      if (message.id && messages.some((entry) => entry.id === message.id)) {
        return messages.map((entry) => entry.id === message.id ? message : entry);
      }
      return [...messages, message];
    });
  }

  addOptimisticMessage(msg: ChatMessage): void {
    this.messagesState.update(msgs => [...msgs, msg]);
  }

  send(message: ChatMessage): void {
    if (this.client?.connected) {
      console.log('[ChatSocket] Sending:', message);
      this.client.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message)
      });
    } else {
      console.error('[ChatSocket] Send failed: not connected');
    }
  }

  private handleMessage(message: IMessage): void {
    try {
      const payload = JSON.parse(message.body) as ChatMessage;
      console.log('[ChatSocket] Received:', payload);
      
      if (payload.messageType === 'USER_STATUS') {
        this.presenceState.update(map => {
          const newMap = new Map(map);
          newMap.set(payload.senderId!, payload.content!);
          return newMap;
        });
        return;
      }

      if (payload.messageType === 'READ_RECEIPT') {
        this.messagesState.update(msgs => msgs.map(m => {
          if (m.senderId === payload.recipientId && m.recipientId === payload.senderId) {
            return { ...m, isRead: true };
          }
          return m;
        }));
        return;
      }

      if (payload.messageType === 'UPDATE') {
        this.messagesState.update(msgs => msgs.map(m => m.id === payload.id ? payload : m));
        return;
      }

      this.messagesState.update((messages) => {
        // WhatsApp Logic: Deduplicate
        const existsById = payload.id && messages.some(m => m.id === payload.id);
        if (existsById) return messages;

        // Try to find matching optimistic message
        let optIdx = -1;
        if (payload.clientMsgId) {
           optIdx = messages.findIndex(m => m.clientMsgId === payload.clientMsgId);
        } else if (payload.senderId === this.currentUserId) {
           // Fallback for missing clientMsgId: match by content and timestamp proximity
           optIdx = messages.findIndex(m => !m.id && m.content === payload.content); 
        }

        if (optIdx > -1) {
           const newMsgs = [...messages];
           newMsgs[optIdx] = { ...payload }; // Use server data
           return newMsgs;
        }

        return [...messages, payload].slice(-200);
      });
    } catch (e) {
      console.error('[ChatSocket] Parse error', e);
    }
  }
}
