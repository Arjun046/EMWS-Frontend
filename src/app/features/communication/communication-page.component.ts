import { DatePipe, CommonModule, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild, ElementRef, OnInit, AfterViewChecked, OnDestroy, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CommunicationService, ChatSummary } from '../../core/services/communication.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatMessage, StatusStory, ConversationContact } from '../../shared/models/ui.models';
import { ToastService, ToastSeverity } from '../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { AudioPlayerComponent } from './audio-player.component';
import { CommunicationDataService } from '../../core/services/communication-data.service';
import { VoiceRecorderService } from '../../core/services/voice-recorder.service';

@Component({
  selector: 'app-communication-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatSnackBarModule, MatDividerModule, DatePipe, FormsModule, UpperCasePipe, AudioPlayerComponent],
  template: `
    <div class="chat-viewport">
      <div class="app-container"
           [class.has-active-view]="selectedThreadId() !== null || activeTab() === 'ai'"
           [class.has-no-active-view]="selectedThreadId() === null && activeTab() !== 'ai'">
        
        <!-- 1. Side Rail -->
        <div class="nav-rail">
          <div class="rail-top">
            <div class="rail-item" [class.active]="activeTab() === 'chats'" (click)="activeTab.set('chats')">
              <mat-icon>chat</mat-icon>
            </div>
            <div class="rail-item" [class.active]="activeTab() === 'channels'" (click)="activeTab.set('channels')">
              <mat-icon>groups</mat-icon>
            </div>
            <div class="rail-item meta-ai-orb" [class.active]="activeTab() === 'ai'" (click)="activeTab.set('ai')">
              <div class="ai-glowing-ring"></div>
            </div>
          </div>
          <div class="rail-bottom">
            <div class="rail-item"><mat-icon>star_outline</mat-icon></div>
            <div class="rail-item"><mat-icon>archive</mat-icon></div>
            <mat-divider style="width: 20px; background: rgba(255,255,255,0.08); margin: 0.5rem 0; border-top: 1px solid rgba(255,255,255,0.08);"></mat-divider>
            <div class="rail-profile-avatar">{{ getInitials(auth.user()?.name) }}</div>
          </div>
        </div>

        <!-- 2. Threads Sidebar -->
        <div class="sidebar">
          
          <!-- Main Sidebar Header -->
          <div class="sidebar-header" *ngIf="!directSyncActive() && !groupSyncActive() && !statusSyncActive() && !groupMembersActive()">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <strong>{{ activeTab() | uppercase }}</strong>
              <div class="socket-status-dot" [class]="socketStatus()" [title]="'Terminal Status: ' + socketStatus()"></div>
            </div>
            <div style="display:flex; gap:0.25rem; align-items: center;">
               <button class="header-action-btn" [matMenuTriggerFor]="sidebarMenu"><mat-icon>add_box</mat-icon></button>
               <button class="header-action-btn"><mat-icon>more_vert</mat-icon></button>
            </div>
          </div>

          <mat-menu #sidebarMenu="matMenu">
            <button mat-menu-item (click)="showNewDirectChat()">
              <mat-icon>chat_bubble</mat-icon><span>New Direct Thread</span>
            </button>
            <button mat-menu-item (click)="showNewGroup()">
              <mat-icon>hub</mat-icon><span>New Operational Group</span>
            </button>
          </mat-menu>

          <!-- 🟢 SIDEBAR OVERLAY: DIRECT SYNC CONTACT PICKER -->
          <div class="sidebar-overlay-pane animate-slide" *ngIf="directSyncActive()">
            <div class="overlay-header">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <mat-icon style="color:var(--primary);">chat_bubble</mat-icon>
                <strong>New Direct Sync</strong>
              </div>
              <button class="header-action-btn" (click)="directSyncActive.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="overlay-search">
              <div class="search-wrapper">
                <mat-icon>search</mat-icon>
                <input type="text" placeholder="Search employees..." [(ngModel)]="contactSearchQuery" (keyup)="onContactSearchChange($event)">
              </div>
            </div>
            <div class="overlay-list custom-scrollbar">
              @for (c of filteredContacts(); track c.id) {
                <div class="contact-row" (click)="startDirectChat(c)">
                  <div class="thread-avatar" style="width:38px; height:38px; font-size:0.92rem; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                    {{ getInitials(c.name) }}
                  </div>
                  <div class="contact-body">
                    <strong>{{ c.name }}</strong>
                    <span>{{ c.status || 'Active Operator' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- 🟢 SIDEBAR OVERLAY: GROUP CREATION FORM -->
          <div class="sidebar-overlay-pane animate-slide" *ngIf="groupSyncActive()">
            <div class="overlay-header">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <mat-icon style="color:var(--accent);">hub</mat-icon>
                <strong>New Operational Group</strong>
              </div>
              <button class="header-action-btn" (click)="groupSyncActive.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="overlay-form" style="padding: 1rem 0.5rem; display: flex; flex-direction: column; gap: 0.85rem; height: calc(100% - 64px);">
              <input type="text" placeholder="Group Name..." [(ngModel)]="newGroupName" class="overlay-input" style="margin-bottom: 0;">
              
              <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; margin-top: 0.5rem; gap: 0.35rem;">
                <span style="font-size: 0.72rem; color: var(--txt-muted); font-weight: bold;">SELECT OPERATORS ({{ selectedGroupMembers().length }})</span>
                <div class="overlay-list custom-scrollbar" style="flex: 1; overflow-y: auto;">
                  @for (c of allContacts(); track c.id) {
                    <div class="contact-row" (click)="toggleGroupMemberSelection(c.id)" style="justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem;">
                      <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <div class="thread-avatar" style="width:30px; height:30px; font-size:0.75rem; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                          {{ getInitials(c.name) }}
                        </div>
                        <span style="color: #fff; font-size: 0.82rem;">{{ c.name }}</span>
                      </div>
                      <mat-icon [style.color]="selectedGroupMembers().includes(c.id) ? 'var(--accent)' : 'rgba(255,255,255,0.15)'">
                        {{ selectedGroupMembers().includes(c.id) ? 'check_box' : 'check_box_outline_blank' }}
                      </mat-icon>
                    </div>
                  }
                </div>
              </div>

              <button class="ui-action-btn" [disabled]="!newGroupName.trim()" (click)="executeCreateGroup()">Create Channel</button>
            </div>
          </div>

          <!-- 🟢 SIDEBAR OVERLAY: STATUS STORY CREATION FORM -->
          <div class="sidebar-overlay-pane animate-slide" *ngIf="statusSyncActive()">
            <div class="overlay-header">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <mat-icon style="color:#a855f7;">add_circle</mat-icon>
                <strong>New Status Story</strong>
              </div>
              <button class="header-action-btn" (click)="statusSyncActive.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="overlay-form">
              <div style="display:flex; flex-direction:column; gap:0.85rem; padding: 1rem 0.5rem;">
                <textarea placeholder="Share an operational update..." [(ngModel)]="newStatusContent" class="overlay-textarea" rows="3"></textarea>
                <button class="ui-action-btn" [disabled]="!newStatusContent.trim()" (click)="executeCreateStatus()">Publish Update</button>
              </div>
            </div>
          </div>

          <!-- 🟢 OPERATIONS STATUS REEL -->
          <div class="status-reel-container" *ngIf="activeTab() === 'chats' && !directSyncActive() && !groupSyncActive() && !statusSyncActive() && !groupMembersActive()">
            @for (st of statuses(); track st.id) {
              <div class="status-reel-item" (click)="viewStatus(st)">
                <div class="status-avatar-ring" [class.active-gradient]="!st.viewedByRequester">
                  <div class="status-avatar-inner">{{ getInitialsForUserId(st.userId) }}</div>
                </div>
                <span>User_{{ st.userId }}</span>
              </div>
            }
            <div class="status-reel-item" (click)="publishStatus()">
              <div class="status-avatar-ring" style="background: rgba(255,255,255,0.08);">
                <div class="status-avatar-inner" style="background: transparent; border: 2px dashed rgba(255,255,255,0.25);">
                  <mat-icon style="font-size: 1.15rem; color: #8696a0; width: 18px; height: 18px;">add</mat-icon>
                </div>
              </div>
              <span>Add Status</span>
            </div>
          </div>

          <div class="sidebar-search" *ngIf="!directSyncActive() && !groupSyncActive() && !statusSyncActive() && !groupMembersActive()">
            <div class="search-wrapper">
              <mat-icon>search</mat-icon>
              <input type="text" placeholder="Search streams..." [(ngModel)]="searchQuery">
            </div>
          </div>

          <div class="threads-feed custom-scrollbar" *ngIf="!directSyncActive() && !groupSyncActive() && !statusSyncActive() && !groupMembersActive()">
            @if (filteredThreads().length === 0) {
              <div class="empty-threads-panel animate-fade">
                 <mat-icon style="font-size: 2.5rem; width: 40px; height: 40px; color: var(--txt-muted); margin-bottom: 0.5rem; opacity: 0.4;">chat_bubble_outline</mat-icon>
                 <p style="font-size: 0.82rem; color: var(--txt-muted); margin: 0; line-height: 1.4;">No secure transmissions found.<br>Click '+' to start a direct thread or operational channel.</p>
              </div>
            } @else {
              @for (thread of filteredThreads(); track thread.id) {
                <div class="thread-row" [class.active]="selectedThreadId() === thread.id" (click)="selectThread(thread)">
                  <div class="avatar-container">
                    <div class="thread-avatar" style="width:48px; height:48px; font-size:1.1rem; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                      @if (thread.type === 'GROUP') { <mat-icon>hub</mat-icon> } @else { {{ getInitials(thread.name) }} }
                    </div>
                    @if (isUserOnline(thread.id)) {
                      <div class="avatar-status-dot"></div>
                    }
                  </div>
                  <div class="thread-body">
                    <div class="thread-header">
                      <strong class="thread-name">{{ thread.name }}</strong>
                      <span class="thread-time">
                        {{ thread.lastMessageTimestamp | date:'HH:mm' }}
                        <mat-icon *ngIf="thread.muted" style="font-size: 13px; width: 13px; height: 13px; color: var(--txt-muted); vertical-align: middle; margin-left: 2px;">volume_off</mat-icon>
                      </span>
                    </div>
                    <p class="thread-snippet">
                      @if (isTyping(thread)) {
                         <span class="typing-text">typing...</span>
                      } @else {
                         <mat-icon *ngIf="thread.unreadCount === 0" class="double-check-icon">done_all</mat-icon>
                         {{ thread.lastMessage || 'No messages' }}
                      }
                    </p>
                  </div>
                  <div class="unread-badge" *ngIf="thread.unreadCount > 0">{{ thread.unreadCount }}</div>
                </div>
              }
            }
          </div>

          <!-- 🟢 SIDEBAR OVERLAY: GROUP MEMBERS LIST -->
          <div class="sidebar-overlay-pane animate-slide" *ngIf="groupMembersActive()">
            <div class="overlay-header">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <mat-icon style="color:var(--accent);">groups</mat-icon>
                <strong>Group Members ({{ groupMembers().length }})</strong>
              </div>
              <button class="header-action-btn" (click)="groupMembersActive.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <div class="overlay-form" style="padding: 0.5rem 0; display:flex; flex-direction:column; gap:0.5rem; height: calc(100% - 64px);">
              <!-- Add member block -->
              <div style="padding: 0.5rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; gap: 0.5rem; flex-direction: column;">
                <span style="font-size: 0.72rem; color: var(--txt-muted); font-weight: bold;">ADD NEW OPERATOR</span>
                <div style="display: flex; gap: 0.5rem;">
                  <select [(ngModel)]="selectedContactToAdd" class="overlay-input" style="flex: 1; margin-bottom: 0; padding: 0 0.5rem; height: 36px; background: var(--active-row); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 8px; color: #fff;">
                    <option [value]="null">Select operator...</option>
                    @for (c of contactsNotInGroup(); track c.id) {
                      <option [value]="c.id">{{ c.name }}</option>
                    }
                  </select>
                  <button class="ui-action-btn" style="height: 36px; padding: 0 1rem;" [disabled]="!selectedContactToAdd || selectedContactToAdd === 'null'" (click)="executeAddGroupMember()">Add</button>
                </div>
              </div>
              <!-- Members list -->
              <div class="overlay-list custom-scrollbar" style="flex: 1; overflow-y: auto;">
                @for (m of groupMembers(); track m.userId) {
                  <div class="contact-row" style="justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div class="thread-avatar" style="width:34px; height:34px; font-size:0.85rem; border:none; background: linear-gradient(135deg, var(--primary), var(--accent)); flex-shrink: 0;">
                        {{ getInitials(getMemberName(m.userId)) }}
                      </div>
                      <div style="display: flex; flex-direction: column;">
                        <strong style="color: #fff; font-size: 0.88rem;">{{ getMemberName(m.userId) }}</strong>
                        <span style="font-size: 0.72rem; color: var(--success); font-weight: bold;">{{ m.role }}</span>
                      </div>
                    </div>
                    <!-- Allow removal if current user is admin of group, and not removing self -->
                    <button *ngIf="m.userId !== currentUserId() && isCurrentUserGroupAdmin()" class="header-action-btn" style="color: var(--danger);" (click)="executeRemoveGroupMember(m.userId)" title="Remove from Group">
                      <mat-icon style="font-size: 1.15rem; width: 18px; height: 18px;">person_remove</mat-icon>
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Main Chat Window -->
        <div class="chat-wrapper">
          @if (activeTab() === 'ai') {
            <div class="chat-window-board ai-theme">
              <header class="chat-header ai-header">
                <div class="chat-profile-info">
                  <button class="mobile-back-btn" (click)="activeTab.set('chats')">
                    <mat-icon>arrow_back</mat-icon>
                  </button>
                  <div class="meta-ai-orb" style="width:40px; height:40px;"><div class="ai-glowing-ring"></div></div>
                  <div style="display: flex; flex-direction: column;">
                    <h4 class="chat-header-title">EWMS AI Assistant</h4>
                    <span class="chat-header-status">NEURAL_NODE_ACTIVE // GEN-AI</span>
                  </div>
                </div>
              </header>

              <div class="chat-feed custom-scrollbar ai-background" #scrollContainer>
                 @if (aiMessages().length === 0) {
                   <div class="ai-welcome-nudge">
                      <mat-icon>psychology</mat-icon>
                      <p>How can I assist with your workforce operations today?</p>
                      <div class="nudge-chips">
                        <button (click)="triggerNudgeChip('Help me with scheduling')">Scheduling</button>
                        <button (click)="triggerNudgeChip('Explain leave policies')">Leave Policies</button>
                        <button (click)="triggerNudgeChip('Analyze team attendance')">Attendance</button>
                      </div>
                   </div>
                 }
                 @for (msg of aiMessages(); track $index) {
                   <div class="message-row" [class.out]="msg.senderId === currentUserId()">
                     <div class="message-bubble" [class.in]="msg.senderId !== currentUserId()" [class.out]="msg.senderId === currentUserId()">
                        <div class="message-text-content">{{ msg.content }}</div>
                        <span class="bubble-meta">{{ msg.timestamp | date:'HH:mm' }}</span>
                     </div>
                   </div>
                 }
                 @if (isTypingAi()) {
                   <div class="message-row">
                     <div class="message-bubble in typing-bubble">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                     </div>
                   </div>
                 }
              </div>

              <footer class="chat-composer-bar ai-input-bar">
                 <div class="composer-input-wrap">
                    <input type="text" placeholder="Ask AI anything about EWMS..." 
                           [(ngModel)]="currentInput" (keyup.enter)="onInputEnter()">
                 </div>
                 <button class="chat-send-btn" (click)="onInputEnter()" [disabled]="isTypingAi()">
                    <mat-icon style="color: #3b82f6;">send</mat-icon>
                 </button>
              </footer>
            </div>
          } @else if (selectedThread(); as thread) {
            <div class="chat-window-board">
              <header class="chat-header">
                <div class="chat-profile-info">
                  <button class="mobile-back-btn" (click)="selectedThreadId.set(null)">
                    <mat-icon>arrow_back</mat-icon>
                  </button>
                  <div class="avatar-container">
                    <div class="thread-avatar" style="width:40px; height:40px; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                      @if (thread.type === 'GROUP') { <mat-icon>hub</mat-icon> } @else { {{ getInitials(thread.name) }} }
                    </div>
                    @if (isUserOnline(thread.id)) {
                      <div class="avatar-status-dot"></div>
                    }
                  </div>
                  <div style="display: flex; flex-direction: column;">
                    <h4 class="chat-header-title">{{ thread.name }}</h4>
                    <span class="chat-header-status" [class.online-status]="isUserOnline(thread.id)">{{ isTyping(thread) ? 'typing...' : (thread.type === 'GROUP' ? 'MULTI-USER OPERATIONS SYNC' : (isUserOnline(thread.id) ? 'Online' : 'Offline')) }}</span>
                  </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  <button class="header-action-btn"><mat-icon>videocam</mat-icon></button>
                  <button class="header-action-btn"><mat-icon>search</mat-icon></button>
                  <button class="header-action-btn" [matMenuTriggerFor]="threadMenu"><mat-icon>more_vert</mat-icon></button>
                </div>
              </header>

              <div class="chat-feed custom-scrollbar" #scrollContainer>
                 @for (msg of messages(); track msg.clientMsgId || msg.id; let i = $index) {
                   <div class="message-row" [class.out]="msg.senderId === currentUserId()">
                     <div class="message-bubble" [class.in]="msg.senderId !== currentUserId()" [class.out]="msg.senderId === currentUserId()"
                          [matMenuTriggerFor]="msgMenu" [matMenuTriggerData]="{msg: msg}">
                        
                        @if (thread.type === 'GROUP' && msg.senderId !== currentUserId()) {
                          <span class="bubble-sender-name" style="color: #53bdeb;">User_{{ msg.senderId }}</span>
                        }
                        
                        <!-- Rendering attachments dynamically by messageType -->
                        @if (msg.messageType === 'AUDIO') {
                          <app-audio-player [src]="msg.fileUrl || msg.content"></app-audio-player>
                        } @else if (msg.messageType === 'IMAGE') {
                          <div class="image-attachment-wrap">
                            <img [src]="msg.fileUrl || msg.content" alt="Attachment Image">
                          </div>
                          <div class="message-text-content" style="font-size: 0.88rem; margin-top: 4px;">{{ msg.content }}</div>
                        } @else if (msg.messageType === 'DOCUMENT') {
                          <div class="document-attachment">
                            <mat-icon style="color: #10b981;">insert_drive_file</mat-icon>
                            <div class="doc-meta">
                              <span class="doc-title">{{ msg.content }}</span>
                              <a [href]="msg.fileUrl || '#'" target="_blank">Download Secure Packet</a>
                            </div>
                          </div>
                        } @else {
                          <div class="message-text-content" style="font-size: 0.88rem;">{{ msg.content }}</div>
                        }

                        <div class="reactions-row" *ngIf="msg.reactions?.length">
                           @for (r of msg.reactions; track r.emoji) {
                             <span class="reaction-tag">{{ r.emoji }}</span>
                           }
                        </div>

                        <span class="bubble-meta">
                          {{ msg.timestamp | date:'HH:mm' }}
                          <mat-icon *ngIf="msg.senderId === currentUserId() && msg.id" class="double-check-icon">done_all</mat-icon>
                          <mat-icon *ngIf="msg.senderId === currentUserId() && !msg.id" style="font-size: 11px; width: 11px; height: 11px; color: var(--txt-muted);">done</mat-icon>
                        </span>
                     </div>
                   </div>
                 }
                 @if (isTyping(thread)) {
                   <div class="message-row">
                     <div class="message-bubble in typing-bubble">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                     </div>
                   </div>
                 }
              </div>

              <!-- 🟢 AI SUGGESTED QUICK REPLIES -->
              <div class="quick-replies-reel" *ngIf="messages().length > 0 && messages()[messages().length - 1].senderId !== currentUserId()">
                <div class="quick-reply-chip" (click)="sendQuickReply('Acknowledged.')">
                  <mat-icon style="font-size: 0.95rem; color: #00a884; width: 14px; height: 14px; margin-right: 4px;">check_circle</mat-icon>
                  <span>Acknowledged</span>
                </div>
                <div class="quick-reply-chip" (click)="sendQuickReply('Copy that. Deploying changes.')">
                  <mat-icon style="font-size: 0.95rem; color: #3b82f6; width: 14px; height: 14px; margin-right: 4px;">rocket</mat-icon>
                  <span>Deploying Changes</span>
                </div>
                <div class="quick-reply-chip" (click)="sendQuickReply('Let us sync on a secure call.')">
                  <mat-icon style="font-size: 0.95rem; color: #a855f7; width: 14px; height: 14px; margin-right: 4px;">phone</mat-icon>
                  <span>Let's Sync</span>
                </div>
              </div>

              <mat-menu #msgMenu="matMenu" class="msg-ctx-menu">
                <ng-template matMenuContent let-msg="msg">
                  <div class="reaction-strip">
                     <button mat-icon-button (click)="react(msg, '👍')">👍</button>
                     <button mat-icon-button (click)="react(msg, '❤️')">❤️</button>
                     <button mat-icon-button (click)="react(msg, '✅')">✅</button>
                     <button mat-icon-button (click)="react(msg, '🔥')">🔥</button>
                  </div>
                  <mat-divider style="background: rgba(255,255,255,0.05);"></mat-divider>
                  <button mat-menu-item (click)="copyText(msg)">
                    <mat-icon>content_copy</mat-icon><span>Copy Transmission</span>
                  </button>
                  <button mat-menu-item *ngIf="msg.senderId === currentUserId()" (click)="editMessage(msg)">
                    <mat-icon>edit</mat-icon><span>Modify Packet</span>
                  </button>
                  <button mat-menu-item *ngIf="msg.senderId === currentUserId()" style="color:var(--danger);" (click)="deleteMessage(msg)">
                    <mat-icon style="color:var(--danger);">delete_sweep</mat-icon><span>Purge Data</span>
                  </button>
                </ng-template>
              </mat-menu>

              <mat-menu #threadMenu="matMenu">
                <!-- If private, show Block/Unblock -->
                <button mat-menu-item *ngIf="thread.type === 'PRIVATE'" (click)="toggleBlockThread()">
                  <mat-icon>{{ peerBlocked() ? 'check_circle' : 'block' }}</mat-icon>
                  <span>{{ peerBlocked() ? 'Unblock Operator' : 'Block Operator' }}</span>
                </button>
                <!-- If group, show Manage members -->
                <button mat-menu-item *ngIf="thread.type === 'GROUP'" (click)="showGroupMembers()">
                  <mat-icon>groups</mat-icon><span>Manage Members</span>
                </button>
                <!-- Mute toggle -->
                <button mat-menu-item (click)="toggleMuteThread(thread)">
                  <mat-icon>{{ thread.muted ? 'volume_up' : 'volume_off' }}</mat-icon>
                  <span>{{ thread.muted ? 'Unmute Dispatch' : 'Mute Dispatch' }}</span>
                </button>
                <!-- Clear / Leave -->
                <button mat-menu-item style="color:var(--danger);" (click)="purgeChannel(thread)">
                  <mat-icon style="color:var(--danger);">delete_sweep</mat-icon>
                  <span>{{ thread.type === 'GROUP' ? 'Leave Channel' : 'Purge History' }}</span>
                </button>
              </mat-menu>

              <!-- Hidden native file input picker -->
              <input type="file" #filePickerInput style="display: none;" (change)="onFileSelected($event)">

              <!-- 🟢 INTERACTIVE EMOJI POPUP PANEL DRAWER -->
              <div class="emoji-popover-panel" *ngIf="emojiDrawerOpen">
                <div class="emoji-item" (click)="insertEmoji('👍')">👍</div>
                <div class="emoji-item" (click)="insertEmoji('❤️')">❤️</div>
                <div class="emoji-item" (click)="insertEmoji('✅')">✅</div>
                <div class="emoji-item" (click)="insertEmoji('⚠️')">⚠️</div>
                <div class="emoji-item" (click)="insertEmoji('🚨')">🚨</div>
                <div class="emoji-item" (click)="insertEmoji('🔥')">🔥</div>
                <div class="emoji-item" (click)="insertEmoji('📅')">📅</div>
                <div class="emoji-item" (click)="insertEmoji('🧠')">🧠</div>
              </div>

              <footer class="chat-composer-bar">
                 @if (peerBlocked()) {
                   <div class="blocked-operator-banner">
                     <mat-icon>block</mat-icon>
                     <span>This operator is blocked. Unblock to send transmission.</span>
                     <button class="unblock-btn" (click)="executeUnblock()">Unblock</button>
                   </div>
                 } @else if (isRecording()) {
                   <div class="voice-recording-composer-bar animate-fade">
                     <div class="recording-live-dot-blink"></div>
                     <span class="recording-timer-txt">RECORDING LIVE Secure Audio note... // {{ formattedRecordingTime() }}</span>
                     <button class="record-action-btn discard" (click)="cancelVoiceRecording()" title="Discard Transmission">
                       <mat-icon style="color: var(--danger);">delete</mat-icon>
                     </button>
                     <button class="record-action-btn submit" (click)="stopAndSendVoiceRecording()" title="Transmit Audio note">
                       <mat-icon style="color: var(--success);">send</mat-icon>
                     </button>
                   </div>
                 } @else {
                   <div class="composer-actions-l">
                      <button class="composer-icon-btn" (click)="filePickerInput.click()"><mat-icon>add</mat-icon></button>
                   </div>
                   <div class="composer-input-wrap">
                      <button class="composer-icon-btn" (click)="emojiDrawerOpen = !emojiDrawerOpen"><mat-icon>mood</mat-icon></button>
                      <input type="text" [placeholder]="editingMessage() ? 'MODIFYING_TRANSIMISSION...' : 'Type message...'" 
                             [(ngModel)]="currentInput" (keyup)="onTyping()" (keyup.enter)="onInputEnter()" (keyup.escape)="cancelEdit()">
                   </div>
                   @if (!currentInput) {
                     <button class="chat-send-btn" (click)="startVoiceRecording()">
                        <mat-icon style="color: #8696a0;">mic</mat-icon>
                     </button>
                   } @else {
                     <button class="chat-send-btn" (click)="onInputEnter()">
                        <mat-icon style="color: #00a884;">send</mat-icon>
                     </button>
                   }
                 }
              </footer>
            </div>
          } @else {
            <div class="chat-welcome-board">
               <div class="welcome-laptop-icon">
                  <mat-icon class="laptop">laptop</mat-icon>
                  <div class="telemetry-lock-badge"><mat-icon>lock</mat-icon></div>
               </div>
               <h2>EWMS Secure Terminal</h2>
               <p>Access high-integrity operational streams and peer-to-peer telemetry.<br>End-to-end encrypted session node verified.</p>
               <div class="welcome-shortcut-row mt-6">
                  <div class="shortcut-card" (click)="showNewDirectChat()">
                     <mat-icon>chat_bubble</mat-icon>
                     <strong>New Sync</strong>
                  </div>
                  <div class="shortcut-card" (click)="showNewGroup()">
                     <mat-icon>hub</mat-icon>
                     <strong>Channel</strong>
                  </div>
                  <div class="shortcut-card" (click)="activeTab.set('ai')">
                     <mat-icon>psychology</mat-icon>
                     <strong>AI_ASSIST</strong>
                  </div>
               </div>
               <div class="welcome-footer-lock">
                  <mat-icon style="font-size: 0.85rem;">security</mat-icon> AES-256 Bit Tunnel Active
               </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- 🟢 PREMIUM STATUS LIGHTBOX VIEW -->
    @if (selectedStatus(); as story) {
      <div class="status-lightbox-backdrop" (click)="selectedStatus.set(null)">
        <div class="status-lightbox-card" (click)="$event.stopPropagation()">
          <div class="lightbox-header">
            <div class="lightbox-user">
              <div class="status-avatar-inner" style="width: 36px; height: 36px; border: none;">{{ getInitialsForUserId(story.userId) }}</div>
              <div>
                <strong style="color: #fff; font-size: 0.95rem; margin-left: 0.5rem;">User_{{ story.userId }}</strong>
                <span class="time" style="color: #8696a0; font-size: 0.75rem; margin-left: 0.5rem;">{{ story.createdAt | date:'shortTime' }}</span>
              </div>
            </div>
            <button class="header-action-btn" (click)="selectedStatus.set(null)"><mat-icon>close</mat-icon></button>
          </div>
          <div class="lightbox-content">
            <p>{{ story.content }}</p>
          </div>
          <div class="lightbox-footer">
            <span>Active for 24 hours // Secure Operations Update</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      --bg: #0b141a;
      --rail: #202c33;
      --sidebar: #111b21;
      --active-row: #2a3942;
      --hover-row: #202c33;
      --chat-bg: #222e35;
      --composer: #202c33;
      --bubble-in: #202c33;
      --bubble-out: #005c4b;
      --primary: #2563eb;
      --accent: #14b8a6;
      --success: #00a884;
      --danger: #ef4444;
      --txt-main: #e9edef;
      --txt-muted: #8696a0;
      --ease: cubic-bezier(0.16, 1, 0.3, 1);
    }
    .chat-viewport { height: 100%; background: var(--bg); }
    .app-container { display: grid; grid-template-columns: 60px 340px 1fr; height: 100%; overflow: hidden; }

    /* Side Rail */
    .nav-rail { background: var(--rail); border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 1rem 0; height: 100%; z-index: 10; }
    .rail-top, .rail-bottom { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; width: 100%; }
    .rail-item { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--txt-muted); position: relative; transition: all 0.2s var(--ease); }
    .rail-item:hover { background: rgba(255, 255, 255, 0.05); color: var(--txt-main); }
    .rail-item.active { background: rgba(255, 255, 255, 0.1); color: var(--success); }
    .meta-ai-orb .ai-glowing-ring { width: 24px; height: 24px; border: 3px solid transparent; border-radius: 50%; border-top-color: #3b82f6; border-right-color: #06b6d4; border-bottom-color: #10b981; border-left-color: #6366f1; animation: metaSpin 2s linear infinite; box-shadow: 0 0 10px rgba(59, 130, 246, 0.4); }
    @keyframes metaSpin { 100% { transform: rotate(360deg); } }
    .rail-profile-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(255, 255, 255, 0.15); }

    /* Sidebar Threads */
    .sidebar { background: var(--sidebar); border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; height: 100%; color: var(--txt-main); position: relative; }
    .sidebar-header { height: 64px; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; background: var(--rail); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .sidebar-header strong { font-size: 1.25rem; font-weight: 800; color: var(--txt-main); }
    .sidebar-search { padding: 0.5rem 0.75rem; background: var(--sidebar); }
    .search-wrapper { background: var(--rail); border-radius: 99px; display: flex; align-items: center; padding: 0 0.85rem; gap: 0.5rem; height: 36px; }
    .search-wrapper input { background: transparent; border: none; outline: none; color: var(--txt-main); font-size: 0.85rem; width: 100%; font-family: inherit; }
    .search-wrapper input::placeholder { color: var(--txt-muted); }
    .search-wrapper mat-icon { color: var(--txt-muted); font-size: 1.15rem; width: 20px; height: 20px; }
    
    .threads-feed { flex: 1; overflow-y: auto; background: var(--sidebar); }
    .thread-row { padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: var(--txt-muted); transition: background 0.2s var(--ease); }
    .thread-row:hover { background: var(--hover-row); }
    .thread-row.active { background: var(--active-row); color: var(--txt-main) !important; border-left: 3px solid var(--primary); }
    
    .avatar-container { position: relative; }
    .thread-avatar { border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 800; flex-shrink: 0; }
    .avatar-status-dot { position: absolute; bottom: 2px; right: 2px; width: 10px; height: 10px; background: var(--success); border: 2px solid var(--sidebar); border-radius: 50%; }

    .thread-body { flex: 1; overflow: hidden; }
    .thread-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .thread-name { font-size: 0.95rem; color: var(--txt-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .thread-time { font-size: 0.75rem; color: var(--txt-muted); }
    .thread-snippet { font-size: 0.8rem; color: var(--txt-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
    .typing-text { color: var(--success); font-weight: 600; }
    .double-check-icon { color: #53bdeb; font-size: 15px; width: 15px; height: 15px; font-weight: 800; }
    .unread-badge { background: var(--success); color: #111b21; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 99px; margin-left: auto; }

    /* WebSocket status indicators */
    .socket-status-dot { width: 10px; height: 10px; border-radius: 50%; }
    .socket-status-dot.connected { background: var(--success); box-shadow: 0 0 8px var(--success); }
    .socket-status-dot.connecting { background: #eab308; box-shadow: 0 0 8px #eab308; animation: blinkStatus 1.5s infinite alternate; }
    .socket-status-dot.disconnected { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
    @keyframes blinkStatus { from { opacity: 0.5; } to { opacity: 1; } }

    /* 🟢 NEW FEATURE: OPERATIONS STATUS REEL */
    .status-reel-container { padding: 0.75rem 0.5rem 0.5rem; border-bottom: 1px solid rgba(255, 255, 255, 0.05); background: rgba(0, 0, 0, 0.15); display: flex; gap: 0.85rem; overflow-x: auto; }
    .status-reel-container::-webkit-scrollbar { display: none; }
    .status-reel-item { display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: pointer; min-width: 58px; }
    .status-avatar-ring { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; padding: 2px; position: relative; }
    .status-avatar-ring.active-gradient { background: linear-gradient(135deg, #a855f7, #ec4899, #3b82f6, #10b981); }
    .status-avatar-inner { width: 100%; height: 100%; border-radius: 50%; border: 2px solid var(--sidebar); background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; }
    .status-reel-item span { font-size: 0.65rem; color: var(--txt-muted); max-width: 58px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }

    /* 🟢 SIDEBAR OVERLAYS */
    .sidebar-overlay-pane { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--sidebar); z-index: 50; display: flex; flex-direction: column; }
    .sidebar-overlay-pane.animate-slide { animation: slideIn 0.25s var(--ease) both; }
    @keyframes slideIn { from { transform: translateX(-100%); } to { transform: translateX(0); } }
    .overlay-header { height: 64px; background: var(--rail); display: flex; align-items: center; justify-content: space-between; padding: 0 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .overlay-header strong { font-size: 0.95rem; color: #fff; font-weight: 800; }
    .overlay-search { padding: 0.5rem 0.75rem; }
    .overlay-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; }
    .contact-row { padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.03); transition: background 0.2s; }
    .contact-row:hover { background: var(--hover-row); }
    .contact-body { display: flex; flex-direction: column; overflow: hidden; }
    .contact-body strong { font-size: 0.88rem; color: #fff; }
    .contact-body span { font-size: 0.72rem; color: var(--txt-muted); }
    .overlay-form { display: flex; flex-direction: column; padding: 1rem; }
    .overlay-input { background: var(--active-row); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 8px; height: 42px; padding: 0 1rem; color: #fff; font-family: inherit; font-size: 0.88rem; outline: none; margin-bottom: 1rem; }
    .overlay-input:focus { border-color: var(--primary); }
    .overlay-textarea { background: var(--active-row); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 0.75rem 1rem; color: #fff; font-family: inherit; font-size: 0.88rem; outline: none; margin-bottom: 1rem; resize: none; }
    .overlay-textarea:focus { border-color: var(--primary); }
    .ui-action-btn { background: var(--primary); color: #fff; border: none; border-radius: 8px; height: 42px; font-weight: 700; font-family: inherit; cursor: pointer; transition: background 0.2s; }
    .ui-action-btn:hover:not(:disabled) { background: #1d4ed8; }
    .ui-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Main Window */
    .chat-wrapper { display: flex; flex-direction: column; height: 100%; background: var(--bg); position: relative; flex: 1; border-left: 1px solid rgba(255, 255, 255, 0.05); }
    .chat-window-board { display: flex; flex-direction: column; height: 100%; background: var(--chat-bg); position: relative; }
    .chat-header { height: 64px; background: var(--rail); padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; z-index: 10; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .chat-profile-info { display: flex; align-items: center; gap: 0.75rem; }
    .chat-header-title { color: var(--txt-main); font-size: 0.95rem; margin: 0; font-weight: 700; }
    .chat-header-status { color: var(--txt-muted); font-size: 0.7rem; }
    .chat-header-status.online-status { color: var(--success); font-weight: 600; }
    .header-action-btn { background: transparent; border: none; color: var(--txt-muted); cursor: pointer; padding: 6px; border-radius: 50%; width: 36px; height: 36px; display: grid; place-items: center; transition: all 0.2s var(--ease); }
    .header-action-btn:hover { color: var(--txt-main); background: rgba(255, 255, 255, 0.05); }

    .chat-feed { flex: 1; padding: 1.5rem; overflow-y: auto; background-color: var(--bg); background-image: radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0), radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0); background-size: 16px 16px; background-position: 0 0, 8px 8px; display: flex; flex-direction: column; gap: 0.25rem; }
    .message-row { display: flex; width: 100%; position: relative; margin-bottom: 0.25rem; }
    .message-row.out { justify-content: flex-end; }
    .message-bubble { position: relative; max-width: 65%; padding: 0.4rem 0.6rem 1.4rem; border-radius: 8px; font-size: 0.88rem; color: var(--txt-main); cursor: pointer; min-width: 80px; box-shadow: 0 1px 0.5px rgba(0,0,0,0.1); }
    .message-bubble.in { background: var(--bubble-in); border-top-left-radius: 0; }
    .message-bubble.out { background: var(--bubble-out); border-top-right-radius: 0; }
    .bubble-sender-name { font-size: 0.75rem; font-weight: 700; color: #53bdeb; margin-bottom: 4px; display: block; }
    .bubble-meta { position: absolute; bottom: 3px; right: 7px; font-size: 0.65rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 2px; font-family: 'JetBrains Mono', monospace; }
    .reactions-row { display: flex; gap: 2px; position: absolute; bottom: -10px; right: 10px; z-index: 5; }
    .reaction-tag { background: #2a3942; border-radius: 99px; padding: 1px 6px; font-size: 0.7rem; border: 1px solid #111b21; }

    /* Render media elements */
    .image-attachment-wrap { border-radius: 6px; overflow: hidden; max-height: 200px; border: 1px solid rgba(255,255,255,0.05); }
    .image-attachment-wrap img { max-width: 100%; display: block; object-fit: cover; }
    .document-attachment { display: flex; align-items: center; gap: 0.6rem; background: rgba(0,0,0,0.15); padding: 0.6rem; border-radius: 6px; border: 1px solid rgba(255,255,255,0.04); }
    .document-attachment .doc-meta { display: flex; flex-direction: column; overflow: hidden; }
    .document-attachment .doc-title { font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff; }
    .document-attachment a { font-size: 0.68rem; color: #3b82f6; text-decoration: none; font-weight: bold; }

    /* 🟢 NEW FEATURE: AI Contextual replies */
    .quick-replies-reel { display: flex; gap: 0.5rem; padding: 0.5rem 1rem; background: var(--chat-bg); border-top: 1px solid rgba(255,255,255,0.04); overflow-x: auto; z-index: 5; }
    .quick-reply-chip { background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--txt-main); padding: 6px 14px; border-radius: 99px; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; }
    .quick-reply-chip:hover { background: var(--success); color: #111b21; border-color: var(--success); box-shadow: 0 2px 8px rgba(0, 168, 132, 0.2); }

    .chat-composer-bar { background: var(--rail); padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; min-height: 62px; }
    .composer-icon-btn { background: transparent; border: none; color: var(--txt-muted); cursor: pointer; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; transition: all 0.2s; }
    .composer-icon-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--txt-main); }
    .composer-input-wrap { background: var(--active-row); border-radius: 8px; flex: 1; min-height: 42px; padding: 0 0.5rem; display: flex; align-items: center; gap: 0.25rem; }
    .composer-input-wrap input { background: transparent; border: none; outline: none; width: 100%; color: var(--txt-main); padding: 0.5rem; font-size: 0.9rem; font-family: inherit; }
    .chat-send-btn { background: transparent; border: none; cursor: pointer; width: 40px; height: 40px; display: grid; place-items: center; }

    /* EMOJI panel */
    .emoji-popover-panel { position: absolute; bottom: 70px; left: 60px; background: #1c272d; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 0.6rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; z-index: 100; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .emoji-item { font-size: 1.4rem; cursor: pointer; width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; }
    .emoji-item:hover { background: rgba(255, 255, 255, 0.08); }

    .chat-welcome-board { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: var(--chat-bg); color: var(--txt-main); text-align: center; border-bottom: 6px solid var(--success); padding: 2rem; position: relative; }
    .chat-welcome-board h2 { font-size: 1.6rem; font-weight: 300; color: var(--txt-main); margin: 1rem 0; }
    .chat-welcome-board p { color: var(--txt-muted); font-size: 0.85rem; line-height: 1.5; max-width: 460px; }
    .telemetry-lock-badge { position: absolute; top: -5px; left: -5px; background: var(--success); border-radius: 50%; width: 28px; height: 28px; display: grid; place-items: center; color: #111b21; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .welcome-laptop-icon { position: relative; width: 120px; height: 90px; margin-bottom: 0.5rem; }
    .welcome-laptop-icon .laptop { font-size: 6rem; color: #54656f; opacity: 0.85; }
    .shortcut-card { flex: 1; background: var(--rail); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 1rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: transform 0.2s, background 0.2s; width: 100px; }
    .shortcut-card:hover { transform: translateY(-2px); background: var(--active-row); }
    .shortcut-card mat-icon { color: var(--success); font-size: 1.5rem; }
    .shortcut-card strong { font-size: 0.78rem; color: var(--txt-main); }
    .welcome-footer-lock { position: absolute; bottom: 2rem; display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: var(--txt-muted); }

    .msg-ctx-menu { background: #233138; border: 1px solid rgba(255, 255, 255, 0.05); }
    .reaction-strip { display: flex; padding: 0.25rem 0.5rem; }
    .reaction-strip button:hover { background: rgba(255, 255, 255, 0.1); }
    .mt-6 { margin-top: 1.5rem; }

    /* AI Specific */
    .ai-theme { background: #0f172a !important; }
    .ai-header { background: #1e293b !important; }
    .ai-background { background-color: #0f172a !important; background-image: radial-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 0) !important; }
    .ai-welcome-nudge { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94a3b8; text-align: center; }
    .ai-welcome-nudge mat-icon { font-size: 4rem; width: 64px; height: 64px; color: #3b82f6; margin-bottom: 1rem; opacity: 0.5; }
    .nudge-chips { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .nudge-chips button { background: #1e293b; border: 1px solid #334155; color: #cbd5e1; padding: 6px 14px; border-radius: 99px; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
    .nudge-chips button:hover { background: #334155; border-color: #3b82f6; color: #fff; }
    .typing-indicator { display: flex; gap: 4px; padding: 4px 0; }
    .typing-indicator span { width: 6px; height: 6px; background: #64748b; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out; }
    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

    /* 🟢 RESPONSIVE BACK BUTTON FOR MOBILE */
    .mobile-back-btn {
      display: none;
      background: transparent;
      border: none;
      color: var(--txt-muted);
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      margin-right: 0.5rem;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
    }
    .mobile-back-btn:hover {
      background: rgba(255,255,255,0.05);
      color: #fff;
    }

    /* 🟢 STATUS STORY LIGHTBOX STYLE */
    .status-lightbox-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(11, 20, 26, 0.9);
      display: grid;
      place-items: center;
      z-index: 1000;
      backdrop-filter: blur(8px);
    }
    .status-lightbox-card {
      width: 90%;
      max-width: 420px;
      background: var(--chat-bg);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      animation: lightboxScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes lightboxScale {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .lightbox-header {
      padding: 1rem;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--rail);
    }
    .lightbox-user {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .lightbox-user strong {
      color: #fff;
      font-size: 0.95rem;
    }
    .lightbox-user span.time {
      color: var(--txt-muted);
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    .lightbox-content {
      padding: 2.5rem 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 180px;
      text-align: center;
      background: linear-gradient(135deg, #1e293b, #0f172a);
    }
    .lightbox-content p {
      font-size: 1.25rem;
      color: #fff;
      line-height: 1.6;
      margin: 0;
      word-break: break-word;
    }
    .lightbox-footer {
      padding: 0.75rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      text-align: center;
      background: var(--rail);
    }
    .lightbox-footer span {
      font-size: 0.72rem;
      color: var(--txt-muted);
    }

    .blocked-operator-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      width: 100%;
      background: rgba(239, 68, 68, 0.1);
      border: 1px dashed rgba(239, 68, 68, 0.3);
      padding: 0.75rem;
      border-radius: 8px;
      color: #fca5a5;
      font-size: 0.85rem;
    }
    .blocked-operator-banner mat-icon {
      color: var(--danger);
    }
    .unblock-btn {
      background: var(--danger);
      color: #fff;
      border: none;
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.2s;
    }
    .unblock-btn:hover {
      background: #dc2626;
    }

    /* 🎤 VOICE RECORDING STYLES */
    .voice-recording-composer-bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px dashed rgba(239, 68, 68, 0.3);
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      height: 42px;
      flex: 1;
    }
    .recording-live-dot-blink {
      width: 10px;
      height: 10px;
      background: var(--danger);
      border-radius: 50%;
      animation: blinkStatus 0.8s infinite alternate;
    }
    .recording-timer-txt {
      font-size: 0.82rem;
      color: var(--txt-main);
      font-family: 'JetBrains Mono', monospace;
      font-weight: bold;
      flex: 1;
    }
    .record-action-btn {
      background: transparent;
      border: none;
      color: var(--txt-muted);
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      transition: all 0.2s;
    }
    .record-action-btn:hover {
      background: rgba(255,255,255,0.05);
    }
    .record-action-btn.discard {
      color: var(--danger);
    }
    .record-action-btn.submit {
      color: var(--success);
    }

    /* 📭 EMPTY THREAD PANEL */
    .empty-threads-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 1.5rem;
      height: 100%;
    }
    .animate-fade {
      animation: fadeIn 0.3s ease-out;
    }

    /* 🟢 MEDIA QUERIES FOR COMPREHENSIVE RESPONSIVENESS */
    @media (max-width: 900px) {
      .app-container {
        grid-template-columns: 60px 280px 1fr;
      }
    }

    @media (max-width: 768px) {
      .app-container {
        grid-template-columns: 60px 1fr;
      }
      .mobile-back-btn {
        display: flex;
      }

      /* When selectedThreadId or AI tab is active, show conversation and hide sidebar list */
      .has-active-view .sidebar {
        display: none;
      }
      .has-active-view .chat-wrapper {
        display: flex;
        width: 100%;
      }

      /* When NO thread is selected and NOT in AI tab, show sidebar list and hide conversation */
      .has-no-active-view .sidebar {
        display: flex;
        width: 100%;
      }
      .has-no-active-view .chat-wrapper {
        display: none;
      }
      
      .emoji-popover-panel {
        left: 10px;
        bottom: 75px;
        grid-template-columns: repeat(8, 1fr);
        width: calc(100% - 20px);
      }
    }

    @media (max-width: 480px) {
      .app-container {
        grid-template-columns: 1fr;
      }
      
      /* On very small devices, we place the nav rail at the bottom for native feel */
      .nav-rail {
        display: none; /* Can be hidden or transformed; hiding is simplest to maximize viewport space */
      }
      
      .emoji-popover-panel {
        grid-template-columns: repeat(4, 1fr);
      }
    }
  `]
})
export class CommunicationPageComponent implements OnInit, OnDestroy {
  private readonly commsApi = inject(CommunicationService);
  private readonly commsDataApi = inject(CommunicationDataService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly aiService = inject(AiAssistantService);
  protected readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);
  private readonly snack = inject(MatSnackBar);
  private readonly voiceRecorder = inject(VoiceRecorderService);

  protected readonly isRecording = computed(() => this.voiceRecorder.isRecording());
  protected readonly recordingTime = computed(() => this.voiceRecorder.recordingTime());
  protected readonly formattedRecordingTime = computed(() => this.voiceRecorder.formatTime(this.recordingTime()));

  protected readonly activeTab = signal<'chats'|'channels'|'ai'>('chats');
  protected readonly threads = signal<ChatSummary[]>([]);
  protected readonly allContacts = signal<ChatSummary[]>([]);
  protected searchQuery = '';
  protected currentInput = '';
  
  protected readonly filteredThreads = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const active = this.threads().filter(t => t.name.toLowerCase().includes(q));
    
    if (!q) return active;

    // If searching, also include matching contacts not already in active threads
    const matchingContacts = this.allContacts().filter(c => 
      c.name.toLowerCase().includes(q) && 
      !active.some(a => a.id === c.id && a.type === 'PRIVATE')
    );

    return [...active, ...matchingContacts];
  });

  protected readonly selectedThreadId = signal<number | null>(null);
  protected readonly selectedThread = computed(() => this.threads().find(t => t.id === this.selectedThreadId()));
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly aiMessages = signal<ChatMessage[]>([]);
  protected readonly isTypingAi = signal<boolean>(false);
  protected readonly currentUserId = computed(() => this.auth.user()?.id || 0);
  protected readonly editingMessage = signal<ChatMessage | null>(null);

  // Upgrade state signals
  protected readonly socketStatus = computed(() => this.chatSocket.status());
  protected readonly statuses = signal<StatusStory[]>([]);
  protected emojiDrawerOpen = false;
  private lastTypingSent = 0;

  // Sidebar Overlays
  protected readonly directSyncActive = signal<boolean>(false);
  protected readonly groupSyncActive = signal<boolean>(false);
  protected readonly statusSyncActive = signal<boolean>(false);
  protected readonly selectedStatus = signal<StatusStory | null>(null);
  protected readonly contactSearchQuery = signal<string>('');
  protected newGroupName = '';
  protected readonly selectedGroupMembers = signal<number[]>([]);
  protected newStatusContent = '';

  protected readonly groupMembersActive = signal<boolean>(false);
  protected readonly groupMembers = signal<any[]>([]);
  protected readonly peerBlocked = signal<boolean>(false);
  protected selectedContactToAdd: any = null;

  protected readonly filteredContacts = computed(() => {
    const query = (this.contactSearchQuery() || '').toLowerCase();
    return this.allContacts().filter(c => c.name.toLowerCase().includes(query));
  });

  @ViewChild('scrollContainer') private scrollContainer?: ElementRef;

  constructor() {
    // 1. Sync messages with WebSocket
    effect(() => {
      const wsMsgs = this.chatSocket.messages();
      const thread = this.selectedThread();
      if (!thread || this.activeTab() === 'ai') return;

      const relevantMsgs = wsMsgs.filter(m => {
        if (thread.type === 'GROUP') {
          return m.groupId === thread.id;
        } else {
          return (m.senderId === thread.id && m.recipientId === this.currentUserId()) ||
                 (m.senderId === this.currentUserId() && m.recipientId === thread.id);
        }
      });

      if (relevantMsgs.length > 0) {
        this.messages.set([...relevantMsgs]);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });

    // 2. Refresh threads list on new messages
    effect(() => {
      if (this.chatSocket.messages().length > 0) {
        this.loadThreads();
      }
    });

    // 3. Sync new group creations
    effect(() => {
      const event = this.chatSocket.newGroupEvent();
      if (event && event.data) {
        this.loadThreads();
        this.toast.show(`Secure Sync: New channel "${event.data.name}" established.`, 'info');
      }
    });
  }

  ngOnInit() {
    this.loadThreads();
    this.loadContacts();
    this.loadStatuses();

    const user = this.auth.user();
    if (user && user.id && user.companyId) {
      this.chatSocket.connect(user.id, user.companyId);
    }
  }


  ngOnDestroy() {
    this.chatSocket.disconnect();
  }

  loadThreads() {
    console.log('[Communication] Loading chat summaries...');
    this.commsApi.getChatSummaries().subscribe(data => {
      console.log(`[Communication] Loaded ${data.length} threads`);
      this.threads.set(data);
    });
  }

  loadContacts() {
    console.log('[Communication] Loading company directory...');
    this.commsApi.getContacts().subscribe({
      next: (data) => {
        console.log(`[Communication] Discovered ${data.length} employees`);
        this.allContacts.set(data);
      },
      error: (err) => console.error('[Communication] Directory discovery failed:', err)
    });
  }

  loadStatuses() {
    const cid = this.auth.user()?.companyId || 1;
    const uid = this.currentUserId();
    this.commsDataApi.loadStatuses(cid, uid).subscribe({
      next: (data) => {
        this.statuses.set(data);
      },
      error: (err) => console.warn('Could not sync status stories', err)
    });
  }

  selectThread(thread: ChatSummary) {
    this.selectedThreadId.set(thread.id);
    this.groupMembersActive.set(false); // Close members drawer when changing thread
    
    if (thread.type === 'GROUP') {
      this.chatSocket.subscribeToGroup(thread.id, this.auth.user()?.companyId || 1);
      this.loadGroupMembers(thread.id);
      this.peerBlocked.set(false);
    } else {
      this.commsDataApi.isBlocked(this.currentUserId(), thread.id).subscribe({
        next: (res) => this.peerBlocked.set(res),
        error: () => this.peerBlocked.set(false)
      });
    }

    const obs = thread.type === 'GROUP' 
      ? this.commsApi.getGroupThread(thread.id) 
      : this.commsApi.getPrivateThread(thread.id);
    
    obs.subscribe(msgs => {
      this.chatSocket.replaceMessages(msgs);
      this.messages.set(msgs);
      this.editingMessage.set(null);
      this.currentInput = '';
      setTimeout(() => this.scrollToBottom(), 50);

      // Trigger read-receipt marks
      if (thread.type === 'GROUP') {
        this.commsDataApi.markThreadAsRead(undefined, thread.id).subscribe();
      } else {
        this.commsDataApi.markThreadAsRead(thread.id, undefined).subscribe();
        
        // Dispatch real-time read receipt to peer via socket
        this.chatSocket.send({
          messageType: 'READ_RECEIPT',
          senderId: this.currentUserId(),
          recipientId: thread.id,
          groupId: null,
          companyId: this.auth.user()?.companyId || 1,
          content: 'READ',
          isRead: true
        } as any);
      }
    });
  }

  onInputEnter() {
    if (!this.currentInput.trim()) return;
    
    if (this.activeTab() === 'ai') {
      this.executeAiRequest();
    } else if (this.editingMessage()) {
      this.executeEdit();
    } else {
      this.executeSend();
    }
  }

  onTyping() {
    const thread = this.selectedThread();
    if (!thread) return;

    // Debounce/Throttle: limit STOMP socket typing alerts to once every 3.5 seconds
    const now = Date.now();
    if (now - this.lastTypingSent > 3500) {
      this.lastTypingSent = now;
      this.chatSocket.sendTyping(true, thread.type === 'PRIVATE' ? thread.id : undefined, thread.type === 'GROUP' ? thread.id : undefined);
    }
  }

  private executeSend() {
    const thread = this.selectedThread();
    if (!thread) return;

    const payload: any = {
      content: this.currentInput,
      messageType: 'TEXT',
      timestamp: new Date().toISOString(),
      senderId: this.currentUserId(),
      companyId: this.auth.user()?.companyId || 1,
      clientMsgId: Math.random().toString(36).substring(2, 15),
      isRead: false
    };

    if (thread.type === 'GROUP') payload.groupId = thread.id;
    else payload.recipientId = thread.id;

    // 🟢 OPTIMISTIC UI UPDATE
    this.chatSocket.addOptimisticMessage(payload);
    this.messages.update(msgs => [...msgs, payload]);

    this.chatSocket.send(payload);
    
    this.currentInput = '';
    this.emojiDrawerOpen = false;
    setTimeout(() => this.scrollToBottom(), 50);
  }

  sendQuickReply(text: string) {
    this.currentInput = text;
    this.executeSend();
  }

  insertEmoji(emoji: string) {
    this.currentInput += emoji;
    this.emojiDrawerOpen = false;
  }

  onFileSelected(event: Event) {
    const thread = this.selectedThread();
    if (!thread) return;
    const uploadThreadId = thread.id;
    const uploadThreadType = thread.type;

    const element = event.currentTarget as HTMLInputElement;
    let fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      const isImg = file.type.startsWith('image/');
      
      this.toast.show(`Uploading file: ${file.name}...`, 'success' as ToastSeverity);

      // Simulate network upload latency and then dispatch rich media payload
      setTimeout(() => {
        const payload: any = {
          content: isImg ? 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80' : file.name,
          messageType: isImg ? 'IMAGE' : 'DOCUMENT',
          timestamp: new Date().toISOString(),
          senderId: this.currentUserId(),
          companyId: this.auth.user()?.companyId || 1,
          clientMsgId: Math.random().toString(36).substring(2, 15),
          isRead: false,
          fileUrl: isImg ? 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=600&q=80' : 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
        };

        if (uploadThreadType === 'GROUP') payload.groupId = uploadThreadId;
        else payload.recipientId = uploadThreadId;

        // Verify if the user is still on the same thread before updating UI optimistically!
        if (this.selectedThreadId() === uploadThreadId) {
          this.chatSocket.addOptimisticMessage(payload);
          this.messages.update(msgs => [...msgs, payload]);
          setTimeout(() => this.scrollToBottom(), 50);
        }
        
        this.chatSocket.send(payload);
        this.toast.show('Transmission uploaded successfully.', 'success' as ToastSeverity);
      }, 1500);
    }
  }

  private executeAiRequest() {
    const userMsg: any = {
      content: this.currentInput,
      senderId: this.currentUserId(),
      timestamp: new Date().toISOString(),
      messageType: 'TEXT'
    };
    
    this.aiMessages.update(msgs => [...msgs, userMsg]);
    const prompt = this.currentInput;
    this.currentInput = '';
    this.isTypingAi.set(true);
    
    let aiResponseContent = '';
    const aiMsg: any = { content: '', senderId: -1, timestamp: new Date().toISOString(), messageType: 'TEXT' };
    this.aiMessages.update(msgs => [...msgs, aiMsg]);
    
    this.aiService.streamReply({ message: prompt }).subscribe({
      next: (chunk) => {
        aiResponseContent += chunk;
        this.aiMessages.update(msgs => {
          const last = msgs[msgs.length - 1];
          if (last.senderId === -1) last.content = aiResponseContent;
          return [...msgs];
        });
      },
      error: () => {
        this.isTypingAi.set(false);
        this.toast.show('AI service unreachable.', 'error' as ToastSeverity);
      },
      complete: () => this.isTypingAi.set(false)
    });
  }

  private executeEdit() {
    const msg = this.editingMessage()!;
    this.commsApi.editMessage(msg.id!, this.currentInput).subscribe(() => {
      this.currentInput = '';
      this.editingMessage.set(null);
      this.snack.open('Transmission modified.', 'OK', { duration: 3000 });
    });
  }

  editMessage(msg: ChatMessage) {
    this.editingMessage.set(msg);
    this.currentInput = msg.content;
  }

  cancelEdit() {
    this.editingMessage.set(null);
    this.currentInput = '';
  }

  deleteMessage(msg: ChatMessage) {
    if (confirm('PURGE_TRANSMISSION: Are you sure?')) {
      this.commsApi.deleteMessage(msg.id!).subscribe(() => {
        this.snack.open('Data purged from stream.', 'OK', { duration: 3000 });
      });
    }
  }

  react(msg: ChatMessage, emoji: string) {
    this.commsApi.applyReaction(msg.id!, emoji, this.currentUserId(), this.auth.user()?.companyId || 1).subscribe();
  }

  copyText(msg: ChatMessage) {
    navigator.clipboard.writeText(msg.content);
    this.snack.open('Text copied to clipboard.', 'OK', { duration: 2000 });
  }

  createNewThread() {
    this.showNewGroup();
  }

  showNewDirectChat() {
    this.groupSyncActive.set(false);
    this.statusSyncActive.set(false);
    this.contactSearchQuery.set('');
    this.directSyncActive.set(true);
  }

  showNewGroup() {
    this.directSyncActive.set(false);
    this.statusSyncActive.set(false);
    this.newGroupName = '';
    this.selectedGroupMembers.set([]);
    this.groupSyncActive.set(true);
  }

  toggleGroupMemberSelection(userId: number) {
    this.selectedGroupMembers.update(ids => 
      ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId]
    );
  }

  publishStatus() {
    this.directSyncActive.set(false);
    this.groupSyncActive.set(false);
    this.newStatusContent = '';
    this.statusSyncActive.set(true);
  }

  executeCreateStatus() {
    if (!this.newStatusContent.trim()) return;
    this.commsDataApi.createStatus({
      content: this.newStatusContent,
      statusType: 'TEXT',
      expiresInHours: 24,
      userId: this.currentUserId(),
      companyId: this.auth.user()?.companyId || 1
    }).subscribe({
      next: () => {
        this.statusSyncActive.set(false);
        this.loadStatuses();
        this.toast.show('Operational status story published.', 'success' as ToastSeverity);
        this.newStatusContent = '';
      },
      error: (err) => {
        console.error('Failed to publish status story', err);
        this.toast.show('Could not publish status update.', 'error' as ToastSeverity);
      }
    });
  }

  onContactSearchChange(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    this.contactSearchQuery.set(element.value);
  }

  startDirectChat(contact: ChatSummary) {
    this.directSyncActive.set(false);
    const existing = this.threads().find(t => t.id === contact.id && t.type === 'PRIVATE');
    if (existing) {
      this.selectThread(existing);
    } else {
      const newThread: ChatSummary = {
        id: contact.id,
        name: contact.name,
        avatar: contact.avatar ?? this.getInitials(contact.name),
        lastMessage: '',
        lastMessageTimestamp: new Date().toISOString(),
        unreadCount: 0,
        type: 'PRIVATE'
      };
      this.threads.update(t => [newThread, ...t]);
      this.selectThread(newThread);
    }
    this.toast.show(`Direct secure thread initialized with ${contact.name}.`, 'success' as ToastSeverity);
  }

  executeCreateGroup() {
    if (!this.newGroupName.trim()) return;
    this.commsApi.createGroup(this.newGroupName, 'Standard operational group', this.selectedGroupMembers()).subscribe({
      next: (res) => {
        this.groupSyncActive.set(false);
        this.loadThreads();
        this.toast.show(`Operational channel "${this.newGroupName}" created.`, 'success' as ToastSeverity);
        this.newGroupName = '';
        this.selectedGroupMembers.set([]);
      },
      error: (err) => console.error('Failed to create group channel', err)
    });
  }

  viewStatus(story: StatusStory) {
    this.selectedStatus.set(story);
    this.commsDataApi.markStatusViewed(story.id, this.currentUserId()).subscribe(() => {
      this.loadStatuses();
    });
  }

  isUserOnline(userId: number): boolean {
    return this.chatSocket.presence().get(userId) === 'ONLINE';
  }

  isTyping(thread: ChatSummary): boolean {
    const key = thread.type === 'GROUP' ? `G${thread.id}` : `U${thread.id}`;
    return !!this.chatSocket.typing().get(key);
  }

  protected getInitials(name?: string) {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  protected getInitialsForUserId(userId: number) {
    const contact = this.allContacts().find(c => c.id === userId);
    return this.getInitials(contact?.name || `User ${userId}`);
  }

  toggleBlockThread() {
    if (this.peerBlocked()) {
      this.executeUnblock();
    } else {
      this.executeBlock();
    }
  }

  executeBlock() {
    const thread = this.selectedThread();
    if (!thread) return;
    this.commsDataApi.blockUser(this.currentUserId(), thread.id, this.auth.user()?.companyId || 1).subscribe({
      next: () => {
        this.peerBlocked.set(true);
        this.toast.show(`Operator ${thread.name} has been blocked.`, 'success' as ToastSeverity);
      },
      error: (err) => console.error('Failed to block operator', err)
    });
  }

  executeUnblock() {
    const thread = this.selectedThread();
    if (!thread) return;
    this.commsDataApi.unblockUser(this.currentUserId(), thread.id).subscribe({
      next: () => {
        this.peerBlocked.set(false);
        this.toast.show(`Operator ${thread.name} has been unblocked.`, 'success' as ToastSeverity);
      },
      error: (err) => console.error('Failed to unblock operator', err)
    });
  }

  toggleMuteThread(thread: ChatSummary) {
    const isMuted = !thread.muted;
    this.commsDataApi.updateConversationPreference({
      userId: this.currentUserId(),
      companyId: this.auth.user()?.companyId || 1,
      conversationType: thread.type,
      conversationId: thread.id,
      archived: !!thread.archived,
      muted: isMuted
    }).subscribe({
      next: () => {
        this.loadThreads();
        this.toast.show(isMuted ? 'Operational dispatch muted.' : 'Operational dispatch unmuted.', 'success' as ToastSeverity);
      },
      error: (err) => console.error('Failed to update preference', err)
    });
  }

  purgeChannel(thread: ChatSummary) {
    if (thread.type === 'GROUP') {
      if (confirm(`Leave group channel "${thread.name}"?`)) {
        this.commsApi.removeGroupMember(thread.id, this.currentUserId()).subscribe({
          next: () => {
            this.selectedThreadId.set(null);
            this.loadThreads();
            this.toast.show('You have left the group.', 'success' as ToastSeverity);
          },
          error: (err) => console.error('Failed to leave group', err)
        });
      }
    } else {
      if (confirm(`Purge private stream history with ${thread.name}?`)) {
        this.messages.set([]);
        this.toast.show('History purged locally.', 'success' as ToastSeverity);
      }
    }
  }

  showGroupMembers() {
    const thread = this.selectedThread();
    if (!thread || thread.type !== 'GROUP') return;
    this.loadGroupMembers(thread.id);
    this.groupMembersActive.set(true);
  }

  executeAddGroupMember() {
    if (!this.selectedContactToAdd || this.selectedContactToAdd === 'null') return;
    const thread = this.selectedThread();
    if (!thread) return;
    this.commsApi.addGroupMember(thread.id, Number(this.selectedContactToAdd), this.currentUserId()).subscribe({
      next: () => {
        this.toast.show('Operator added to channel.', 'success' as ToastSeverity);
        this.selectedContactToAdd = null;
        this.loadGroupMembers(thread.id);
        this.loadThreads();
      },
      error: (err) => console.error('Failed to add member', err)
    });
  }

  executeRemoveGroupMember(userId: number) {
    const thread = this.selectedThread();
    if (!thread) return;
    if (confirm(`Remove operator from channel?`)) {
      this.commsApi.removeGroupMember(thread.id, userId).subscribe({
        next: () => {
          this.toast.show('Operator removed from channel.', 'success' as ToastSeverity);
          this.loadGroupMembers(thread.id);
          this.loadThreads();
        },
        error: (err) => console.error('Failed to remove member', err)
      });
    }
  }

  loadGroupMembers(groupId: number) {
    this.commsApi.getGroupMembers(groupId).subscribe({
      next: (data) => this.groupMembers.set(data),
      error: (err) => console.error('Failed to load group members', err)
    });
  }

  getMemberName(userId: number): string {
    const contact = this.allContacts().find(c => c.id === userId);
    return contact ? contact.name : `Operator ${userId}`;
  }

  contactsNotInGroup(): any[] {
    return this.allContacts().filter(c => !this.groupMembers().some(m => m.userId === c.id));
  }

  isCurrentUserGroupAdmin(): boolean {
    const me = this.groupMembers().find(m => m.userId === this.currentUserId());
    return (me && me.role === 'ADMIN') || this.auth.user()?.role === 'ROLE_ADMIN';
  }

  triggerNudgeChip(text: string) {
    this.currentInput = text;
    this.executeAiRequest();
  }

  startVoiceRecording() {
    this.voiceRecorder.startRecording().then(() => {
      this.toast.show('Voice recording started...', 'success' as ToastSeverity);
    }).catch(err => {
      this.toast.show('Microphone access denied or unavailable.', 'error' as ToastSeverity);
    });
  }

  cancelVoiceRecording() {
    this.voiceRecorder.cancelRecording();
    this.toast.show('Voice recording discarded.', 'success' as ToastSeverity);
  }

  stopAndSendVoiceRecording() {
    const thread = this.selectedThread();
    if (!thread) return;

    this.voiceRecorder.stopRecording().then(base64Audio => {
      if (!base64Audio) return;

      const payload: any = {
        content: base64Audio,
        messageType: 'AUDIO',
        timestamp: new Date().toISOString(),
        senderId: this.currentUserId(),
        companyId: this.auth.user()?.companyId || 1,
        clientMsgId: Math.random().toString(36).substring(2, 15),
        isRead: false
      };

      if (thread.type === 'GROUP') payload.groupId = thread.id;
      else payload.recipientId = thread.id;

      this.chatSocket.addOptimisticMessage(payload);
      this.messages.update(msgs => [...msgs, payload]);
      this.chatSocket.send(payload);
      this.toast.show('Audio transmission sent.', 'success' as ToastSeverity);
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer && !this.editingMessage()) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
