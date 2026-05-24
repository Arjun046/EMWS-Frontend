import { DatePipe, CommonModule, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal, ViewChild, ElementRef, OnInit, AfterViewChecked, effect } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CommunicationService, ChatSummary } from '../../core/services/communication.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { AiAssistantService } from '../../core/services/ai-assistant.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatMessage } from '../../shared/models/ui.models';
import { ToastService, ToastSeverity } from '../../core/services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-communication-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatSnackBarModule, MatDividerModule, DatePipe, FormsModule, UpperCasePipe],
  template: `
    <div class="chat-viewport">
      <div class="chat-container-split">
        
        <!-- 1. Side Rail -->
        <div class="chat-nav-rail">
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
        <div class="chat-sidebar-threads">
          <div class="chat-sidebar-header">
            <strong>{{ activeTab() | uppercase }}</strong>
            <div style="display:flex; gap:0.25rem;">
               <button class="header-action-btn" (click)="createNewThread()"><mat-icon>add_box</mat-icon></button>
               <button class="header-action-btn"><mat-icon>more_vert</mat-icon></button>
            </div>
          </div>

          <div class="chat-threads-search-box">
            <div class="chat-search-wrapper">
              <mat-icon>search</mat-icon>
              <input type="text" placeholder="Search streams..." [(ngModel)]="searchQuery">
            </div>
          </div>

          <div class="chat-threads-feed custom-scrollbar">
            @for (thread of filteredThreads(); track thread.id) {
              <div class="chat-thread-row" [class.active-thread]="selectedThreadId() === thread.id" (click)="selectThread(thread)">
                <div class="chat-message-avatar-container">
                  <div class="chat-message-avatar" style="width:48px; height:48px; font-size:1.1rem; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                    @if (thread.type === 'GROUP') { <mat-icon>hub</mat-icon> } @else { {{ getInitials(thread.name) }} }
                  </div>
                  @if (isUserOnline(thread.id)) {
                    <div class="online-status-dot"></div>
                  }
                </div>
                <div class="thread-meta-body">
                  <div class="thread-header-row">
                    <strong class="chat-thread-name">{{ thread.name }}</strong>
                    <span class="time">{{ thread.lastMessageTimestamp | date:'HH:mm' }}</span>
                  </div>
                  <p class="thread-snippet-text">
                    @if (isTyping(thread)) {
                       <span class="typing-text">typing...</span>
                    } @else {
                       <mat-icon *ngIf="thread.unreadCount === 0" class="double-check-icon">done_all</mat-icon>
                       {{ thread.lastMessage || 'No messages' }}
                    }
                  </p>
                </div>
                <div class="thread-notif-badge" *ngIf="thread.unreadCount > 0">{{ thread.unreadCount }}</div>
              </div>
            }
          </div>
        </div>

        <!-- 3. Main Chat Window -->
        <div class="chat-conversation-wrapper">
          @if (activeTab() === 'ai') {
            <div class="chat-window-board ai-theme">
              <header class="chat-window-header ai-header">
                <div class="chat-window-profile">
                  <div class="meta-ai-orb" style="width:40px; height:40px;"><div class="ai-glowing-ring"></div></div>
                  <div class="chat-window-title-group">
                    <h4>EWMS AI Assistant</h4>
                    <span>NEURAL_NODE_ACTIVE // GEN-AI</span>
                  </div>
                </div>
              </header>

              <div class="chat-messages-scroll-area custom-scrollbar ai-background" #scrollContainer>
                 @if (aiMessages().length === 0) {
                   <div class="ai-welcome-nudge">
                      <mat-icon>psychology</mat-icon>
                      <p>How can I assist with your workforce operations today?</p>
                      <div class="nudge-chips">
                        <button (click)="currentInput='Help me with scheduling'">Scheduling</button>
                        <button (click)="currentInput='Explain leave policies'">Leave Policies</button>
                        <button (click)="currentInput='Analyze team attendance'">Attendance</button>
                      </div>
                   </div>
                 }
                 @for (msg of aiMessages(); track $index) {
                   <div class="chat-message-row" [class.message-out]="msg.senderId === currentUserId()" [class.message-in]="msg.senderId !== currentUserId()">
                     <div class="chat-message-body-col">
                       <div class="bubble-content" [class.bubble-in]="msg.senderId !== currentUserId()" [class.bubble-out]="msg.senderId === currentUserId()">
                          <div class="message-text-content">{{ msg.content }}</div>
                          <span class="out-meta">{{ msg.timestamp | date:'HH:mm' }}</span>
                       </div>
                     </div>
                   </div>
                 }
                 @if (isTypingAi()) {
                   <div class="chat-message-row message-in">
                     <div class="bubble-content bubble-in typing-bubble">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                     </div>
                   </div>
                 }
              </div>

              <footer class="chat-input-toolbar ai-input-bar">
                 <div class="chat-input-wrapper">
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
              <header class="chat-window-header">
                <div class="chat-window-profile">
                  <div class="chat-message-avatar-container">
                    <div class="chat-message-avatar" style="width:40px; height:40px; border:none; background: linear-gradient(135deg, var(--primary), var(--accent));">
                      @if (thread.type === 'GROUP') { <mat-icon>hub</mat-icon> } @else { {{ getInitials(thread.name) }} }
                    </div>
                    @if (isUserOnline(thread.id)) {
                      <div class="online-status-dot header-dot"></div>
                    }
                  </div>
                  <div class="chat-window-title-group">
                    <h4>{{ thread.name }}</h4>
                    <span>{{ isTyping(thread) ? 'typing...' : (thread.type === 'GROUP' ? 'MULTI-USER OPERATIONS SYNC' : (isUserOnline(thread.id) ? 'Online' : 'Offline')) }}</span>
                  </div>
                </div>
                <div style="display:flex; gap:0.5rem;">
                  <button class="header-action-btn"><mat-icon>videocam</mat-icon></button>
                  <button class="header-action-btn"><mat-icon>search</mat-icon></button>
                  <button class="header-action-btn" [matMenuTriggerFor]="threadMenu"><mat-icon>more_vert</mat-icon></button>
                </div>
              </header>

              <div class="chat-messages-scroll-area custom-scrollbar" #scrollContainer>
                 @for (msg of messages(); track msg.id; let i = $index) {
                   <div class="chat-message-row" [class.message-out]="msg.senderId === currentUserId()" [class.message-in]="msg.senderId !== currentUserId()">
                     <div class="chat-message-body-col">
                       <div class="bubble-content" [class.bubble-in]="msg.senderId !== currentUserId()" [class.bubble-out]="msg.senderId === currentUserId()"
                            [matMenuTriggerFor]="msgMenu" [matMenuTriggerData]="{msg: msg}">
                          
                          @if (thread.type === 'GROUP' && msg.senderId !== currentUserId()) {
                            <span class="chat-message-author-name" style="color: #53bdeb;">User_{{ msg.senderId }}</span>
                          }
                          
                          <div class="message-text-content" style="font-size: 0.88rem;">{{ msg.content }}</div>

                          <div class="reactions-row" *ngIf="msg.reactions?.length">
                             @for (r of msg.reactions; track r.emoji) {
                               <span class="reaction-tag">{{ r.emoji }}</span>
                             }
                          </div>

                          <span class="out-meta">
                            {{ msg.timestamp | date:'HH:mm' }}
                            <mat-icon *ngIf="msg.senderId === currentUserId()" class="double-check-icon">done_all</mat-icon>
                          </span>
                       </div>
                     </div>
                   </div>
                 }
                 @if (isTyping(thread)) {
                   <div class="chat-message-row message-in">
                     <div class="bubble-content bubble-in typing-bubble">
                        <div class="typing-indicator"><span></span><span></span><span></span></div>
                     </div>
                   </div>
                 }
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
                <button mat-menu-item><span>Clear History</span></button>
                <button mat-menu-item><span>Mute Dispatch</span></button>
                <button mat-menu-item style="color:var(--danger);"><span>Purge Channel</span></button>
              </mat-menu>

              <footer class="chat-input-toolbar">
                 <div class="composer-actions-l">
                    <button class="composer-icon-btn"><mat-icon>add</mat-icon></button>
                 </div>
                 <div class="chat-input-wrapper">
                    <button class="composer-icon-btn"><mat-icon>mood</mat-icon></button>
                    <input type="text" [placeholder]="editingMessage() ? 'MODIFYING_TRANSIMISSION...' : 'Type message...'" 
                           [(ngModel)]="currentInput" (keyup)="onTyping()" (keyup.enter)="onInputEnter()" (keyup.escape)="cancelEdit()">
                 </div>
                 <button class="chat-send-btn" (click)="onInputEnter()">
                    <mat-icon [style.color]="currentInput ? '#00a884' : '#8696a0'">{{ currentInput ? 'send' : 'mic' }}</mat-icon>
                 </button>
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
                  <div class="shortcut-card" (click)="createNewThread()">
                     <mat-icon>chat_bubble</mat-icon>
                     <strong>New Sync</strong>
                  </div>
                  <div class="shortcut-card">
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
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .chat-viewport { height: 100%; background: #0b141a; }
    .chat-container-split { display: grid; grid-template-columns: 60px 340px 1fr; height: 100%; overflow: hidden; }

    /* Side Rail */
    .chat-nav-rail { background: #202c33; border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 1rem 0; height: 100%; z-index: 10; }
    .rail-top, .rail-bottom { display: flex; flex-direction: column; align-items: center; gap: 1.25rem; width: 100%; }
    .rail-item { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: #8696a0; position: relative; transition: all 0.2s var(--ease); }
    .rail-item:hover { background: rgba(255, 255, 255, 0.05); color: #e9edef; }
    .rail-item.active { background: rgba(255, 255, 255, 0.1); color: #00a884; }
    .meta-ai-orb .ai-glowing-ring { width: 24px; height: 24px; border: 3px solid transparent; border-radius: 50%; border-top-color: #3b82f6; border-right-color: #06b6d4; border-bottom-color: #10b981; border-left-color: #6366f1; animation: metaSpin 2s linear infinite; }
    @keyframes metaSpin { 100% { transform: rotate(360deg); } }
    .rail-profile-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); color: #fff; display: grid; place-items: center; font-size: 0.75rem; font-weight: 800; border: 1px solid rgba(255, 255, 255, 0.15); }

    /* Sidebar Threads */
    .chat-sidebar-threads { background: #111b21; border-right: 1px solid rgba(255, 255, 255, 0.08); display: flex; flex-direction: column; height: 100%; color: #e9edef; position: relative; }
    .chat-sidebar-header { height: 64px; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; background: #202c33; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .chat-sidebar-header strong { font-size: 1.25rem; font-weight: 800; color: #e9edef; }
    .chat-threads-search-box { padding: 0.5rem 0.75rem; background: #111b21; }
    .chat-search-wrapper { background: #202c33; border-radius: 99px; display: flex; align-items: center; padding: 0 0.85rem; gap: 0.5rem; height: 36px; }
    .chat-search-wrapper input { background: transparent; border: none; outline: none; color: #e9edef; font-size: 0.85rem; width: 100%; font-family: inherit; }
    
    .chat-threads-feed { flex: 1; overflow-y: auto; background: #111b21; }
    .chat-thread-row { padding: 0.75rem 1rem; display: flex; align-items: center; gap: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(255, 255, 255, 0.04); color: #8696a0; transition: background 0.2s var(--ease); }
    .chat-thread-row:hover { background: #202c33; }
    .chat-thread-row.active-thread { background: #2a3942; color: #e9edef !important; }
    
    .chat-message-avatar-container { position: relative; }
    .chat-message-avatar { border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 800; flex-shrink: 0; }
    .online-status-dot { position: absolute; bottom: 2px; right: 2px; width: 12px; height: 12px; background: #00a884; border: 2px solid #111b21; border-radius: 50%; }
    .header-dot { width: 10px; height: 10px; bottom: 1px; right: 1px; }

    .thread-meta-body { flex: 1; overflow: hidden; }
    .thread-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
    .chat-thread-name { font-size: 0.95rem; color: #e9edef; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .thread-snippet-text { font-size: 0.8rem; color: #8696a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; }
    .typing-text { color: #00a884; font-weight: 600; }
    .double-check-icon { color: #53bdeb; font-size: 15px; width: 15px; height: 15px; font-weight: 800; }
    .thread-notif-badge { background: #00a884; color: #111b21; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 99px; margin-left: auto; }

    /* Main Window */
    .chat-conversation-wrapper { display: flex; flex-direction: column; height: 100%; background: #0b141a; position: relative; flex: 1; border-left: 1px solid rgba(255, 255, 255, 0.05); }
    .chat-window-board { display: flex; flex-direction: column; height: 100%; background: #222e35; position: relative; }
    .chat-window-header { height: 64px; background: #202c33; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; z-index: 10; border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
    .chat-window-profile { display: flex; align-items: center; gap: 0.75rem; }
    .chat-window-title-group h4 { color: #e9edef; font-size: 0.95rem; margin: 0; font-weight: 700; }
    .chat-window-title-group span { color: #8696a0; font-size: 0.7rem; }
    .header-action-btn { background: transparent; border: none; color: #8696a0; cursor: pointer; padding: 6px; border-radius: 50%; width: 36px; height: 36px; display: grid; place-items: center; transition: all 0.2s var(--ease); }
    .header-action-btn:hover { color: #e9edef; background: rgba(255, 255, 255, 0.05); }

    .chat-messages-scroll-area { flex: 1; padding: 1.5rem; overflow-y: auto; background-color: #0b141a; background-image: radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0), radial-gradient(rgba(255,255,255,0.015) 1px, transparent 0); background-size: 16px 16px; background-position: 0 0, 8px 8px; display: flex; flex-direction: column; gap: 0.25rem; }
    .chat-message-row { display: flex; width: 100%; position: relative; margin-bottom: 0.25rem; }
    .message-out { justify-content: flex-end; }
    .bubble-content { position: relative; max-width: 65%; padding: 0.4rem 0.6rem 1.4rem; border-radius: 8px; font-size: 0.88rem; color: #e9edef; cursor: pointer; min-width: 80px; box-shadow: 0 1px 0.5px rgba(0,0,0,0.1); }
    .bubble-in { background: #202c33; border-top-left-radius: 0; }
    .bubble-out { background: #005c4b; border-top-right-radius: 0; }
    .chat-message-author-name { font-size: 0.75rem; font-weight: 700; color: #53bdeb; margin-bottom: 4px; display: block; }
    .out-meta { position: absolute; bottom: 3px; right: 7px; font-size: 0.65rem; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 2px; font-family: 'JetBrains Mono', monospace; }
    .reactions-row { display: flex; gap: 2px; position: absolute; bottom: -10px; right: 10px; z-index: 5; }
    .reaction-tag { background: #2a3942; border-radius: 99px; padding: 1px 6px; font-size: 0.7rem; border: 1px solid #111b21; }

    .chat-input-toolbar { background: #202c33; padding: 0.5rem 1rem; display: flex; align-items: center; gap: 0.5rem; min-height: 62px; }
    .composer-icon-btn { background: transparent; border: none; color: #8696a0; cursor: pointer; width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; transition: all 0.2s; }
    .composer-icon-btn:hover { background: rgba(255, 255, 255, 0.05); color: #e9edef; }
    .chat-input-wrapper { background: #2a3942; border-radius: 8px; flex: 1; min-height: 42px; padding: 0 0.5rem; display: flex; align-items: center; gap: 0.25rem; }
    .chat-input-wrapper input { background: transparent; border: none; outline: none; width: 100%; color: #e9edef; padding: 0.5rem; font-size: 0.9rem; font-family: inherit; }
    .chat-send-btn { background: transparent; border: none; cursor: pointer; width: 40px; height: 40px; display: grid; place-items: center; }

    .chat-welcome-board { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: #222e35; color: #e9edef; text-align: center; border-bottom: 6px solid #00a884; padding: 2rem; position: relative; }
    .chat-welcome-board h2 { font-size: 1.6rem; font-weight: 300; color: #e9edef; margin: 1rem 0; }
    .chat-welcome-board p { color: #8696a0; font-size: 0.85rem; line-height: 1.5; max-width: 460px; }
    .telemetry-lock-badge { position: absolute; top: -5px; left: -5px; background: #00a884; border-radius: 50%; width: 28px; height: 28px; display: grid; place-items: center; color: #111b21; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
    .welcome-laptop-icon { position: relative; width: 120px; height: 90px; margin-bottom: 0.5rem; }
    .welcome-laptop-icon .laptop { font-size: 6rem; color: #54656f; opacity: 0.85; }
    .shortcut-card { flex: 1; background: #202c33; border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 1rem; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: transform 0.2s, background 0.2s; width: 100px; }
    .shortcut-card:hover { transform: translateY(-2px); background: #2a3942; }
    .shortcut-card mat-icon { color: #00a884; font-size: 1.5rem; }
    .shortcut-card strong { font-size: 0.78rem; color: #e9edef; }
    .welcome-footer-lock { position: absolute; bottom: 2rem; display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: #8696a0; }

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
  `]
})
export class CommunicationPageComponent implements OnInit, AfterViewChecked {
  private readonly commsApi = inject(CommunicationService);
  private readonly chatSocket = inject(ChatSocketService);
  private readonly aiService = inject(AiAssistantService);
  protected readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);
  private readonly snack = inject(MatSnackBar);

  protected readonly activeTab = signal<'chats'|'channels'|'ai'>('chats');
  protected readonly threads = signal<ChatSummary[]>([]);
  protected searchQuery = '';
  protected currentInput = '';
  
  protected readonly filteredThreads = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return this.threads().filter(t => t.name.toLowerCase().includes(q));
  });

  protected readonly selectedThreadId = signal<number | null>(null);
  protected readonly selectedThread = computed(() => this.threads().find(t => t.id === this.selectedThreadId()));
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly aiMessages = signal<ChatMessage[]>([]);
  protected readonly isTypingAi = signal<boolean>(false);
  protected readonly currentUserId = computed(() => this.auth.user()?.id || 0);
  protected readonly editingMessage = signal<ChatMessage | null>(null);

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
      }
    });

    // 2. Refresh threads list on new messages
    effect(() => {
      if (this.chatSocket.messages().length > 0) {
        this.loadThreads();
      }
    });
  }

  ngOnInit() {
    this.loadThreads();
    const user = this.auth.user();
    if (user && user.id && user.companyId) {
      this.chatSocket.connect(user.id, user.companyId);
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  loadThreads() {
    this.commsApi.getChatSummaries().subscribe(data => this.threads.set(data));
  }

  selectThread(thread: ChatSummary) {
    this.selectedThreadId.set(thread.id);
    
    if (thread.type === 'GROUP') {
      this.chatSocket.subscribeToGroup(thread.id, this.auth.user()?.companyId || 1);
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
    this.chatSocket.sendTyping(true, thread.type === 'PRIVATE' ? thread.id : undefined, thread.type === 'GROUP' ? thread.id : undefined);
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
      clientMsgId: Math.random().toString(36).substring(2, 15)
    };

    if (thread.type === 'GROUP') payload.groupId = thread.id;
    else payload.recipientId = thread.id;

    this.chatSocket.send(payload);
    this.currentInput = '';
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
    this.commsApi.applyReaction(msg.id!, emoji).subscribe();
  }

  copyText(msg: ChatMessage) {
    navigator.clipboard.writeText(msg.content);
    this.snack.open('Text copied to clipboard.', 'OK', { duration: 2000 });
  }

  createNewThread() {
    const name = prompt('Enter group name:');
    if (name) {
      this.commsApi.createGroup(name, 'Standard operational group', []).subscribe(() => {
        this.loadThreads();
        this.toast.show('Operational group synchronized.', 'success' as ToastSeverity);
      });
    }
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

  private scrollToBottom(): void {
    if (this.scrollContainer && !this.editingMessage()) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }
}
