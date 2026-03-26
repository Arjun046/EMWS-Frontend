import { DatePipe, NgClass, CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { Component, computed, effect, inject, signal, ViewChild, ElementRef, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { ChatSocketService } from '../../core/services/chat-socket.service';
import { CommunicationDataService, DEFAULT_GROUPS } from '../../core/services/communication-data.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { ConversationContact, ConversationGroup, ChatMessage, StatusStory } from '../../shared/models/ui.models';
import { CryptoService } from '../../core/services/crypto.service';
import { VoiceRecorderService } from '../../core/services/voice-recorder.service';
import { AudioPlayerComponent } from './audio-player.component';
import { LocationService } from '../../core/services/location.service';

@Component({
  selector: 'app-new-chat-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatListModule, MatIconModule, MatInputModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Start New Chat</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-icon matPrefix>search</mat-icon>
        <input matInput placeholder="Search employee..." [(ngModel)]="search">
      </mat-form-field>
      
      <mat-nav-list class="emp-list">
        @for (emp of filteredEmployees(); track emp.id) {
          <a mat-list-item (click)="select(emp)">
            <div matListItemAvatar class="avatar">{{ emp.avatar }}</div>
            <div matListItemTitle>{{ emp.name }}</div>
            <div matListItemLine>{{ emp.role }}</div>
          </a>
        }
      </mat-nav-list>
    </mat-dialog-content>
  `,
  styles: [`
    .w-full { width: 100%; }
    .emp-list { max-height: 300px; overflow-y: auto; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-weight: 700; }
  `]
})
export class NewChatDialog {
  protected search = '';
  private readonly data = inject(MAT_DIALOG_DATA);
  protected readonly employees = signal<ConversationContact[]>(this.data.employees);
  protected readonly dialogRef = inject(MatDialogRef<NewChatDialog>);

  protected readonly filteredEmployees = computed(() => {
    const s = this.search.toLowerCase();
    return this.employees().filter(e => e.name.toLowerCase().includes(s) || e.role.toLowerCase().includes(s));
  });

  protected select(emp: ConversationContact): void {
    this.dialogRef.close(emp);
  }
}

@Component({
  selector: 'app-new-group-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatListModule, MatCheckboxModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Create New Group</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 mt-2">
        <div class="image-picker" (click)="triggerGroupImage()">
           <img *ngIf="groupImageUrl()" [src]="groupImageUrl()" class="group-preview">
           <mat-icon *ngIf="!groupImageUrl()">add_a_photo</mat-icon>
        </div>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Group Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Project Apollo">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="What is this group about?"></textarea>
        </mat-form-field>

        <div class="member-selector">
           <strong>Select Members</strong>
           <mat-selection-list #membersList>
              @for (emp of employees; track emp.id) {
                <mat-list-option [value]="emp.id">
                   {{ emp.name }}
                </mat-list-option>
              }
           </mat-selection-list>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit(membersList.selectedOptions.selected)">Create Group</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .w-full { width: 100%; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .gap-4 { gap: 1rem; }
    .mt-2 { margin-top: 0.5rem; }
    .image-picker { width: 80px; height: 80px; border-radius: 50%; background: #f1f5f9; margin: 0 auto 1rem; display: grid; place-items: center; cursor: pointer; overflow: hidden; border: 2px dashed #cbd5e1; }
    .group-preview { width: 100%; height: 100%; object-fit: cover; }
    .member-selector { margin-top: 1rem; }
    .member-selector strong { display: block; margin-bottom: 0.5rem; font-size: 0.85rem; color: #64748b; }
  `]
})
export class NewGroupDialog {
  private readonly fb = inject(FormBuilder);
  private readonly data = inject(MAT_DIALOG_DATA);
  protected readonly employees = this.data.employees;
  protected readonly groupImageUrl = signal<string | null>(null);
  protected readonly dialogRef = inject(MatDialogRef<NewGroupDialog>);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required]]
  });

  protected triggerGroupImage(): void {
     // Simulating image picker
     this.groupImageUrl.set('https://via.placeholder.com/150/2563eb/ffffff?text=GROUP');
  }

  protected submit(selectedOptions: any[]): void {
    const memberIds = selectedOptions.map(o => o.value).join(',');
    this.dialogRef.close({
       ...this.form.getRawValue(),
       imageUrl: this.groupImageUrl(),
       memberIds
    });
  }
}

type ChatMode = 'private' | 'group';

type StatusStorySummary = {
  userId: number;
  name: string;
  avatar: string;
  imageUrl?: string | null;
  viewed: boolean;
  latestStory: StatusStory;
  stories: StatusStory[];
  isOwn: boolean;
};

@Component({
  selector: 'app-status-composer-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>Create Status</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Status text</mat-label>
          <textarea matInput rows="4" formControlName="content" placeholder="Share an update"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Background color</mat-label>
          <input matInput formControlName="backgroundStyle" placeholder="#128C7E">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="submit()">Post</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 1rem; min-width: 20rem; padding-top: 0.5rem; }
    .w-full { width: 100%; }
  `]
})
export class StatusComposerDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<StatusComposerDialog>);

  protected readonly form = this.fb.group({
    content: ['', [Validators.required, Validators.maxLength(280)]],
    backgroundStyle: ['#128C7E', [Validators.required]]
  });

  protected submit(): void {
    this.dialogRef.close(this.form.getRawValue());
  }
}

@Component({
  selector: 'app-status-viewer-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ data.name }}</h2>
    <mat-dialog-content>
      <div
        class="status-viewer"
        [style.background]="data.story.backgroundStyle || '#128C7E'">
        <p>{{ data.story.content || 'Status update' }}</p>
        <span>{{ data.story.createdAt | date:'short' }}</span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button *ngIf="data.canDelete" (click)="dialogRef.close('delete')">
        <mat-icon>delete</mat-icon>
        Delete
      </button>
      <button mat-flat-button color="primary" (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .status-viewer {
      min-width: 20rem;
      min-height: 20rem;
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: #fff;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1);
    }
    .status-viewer p { margin: 0; font-size: 1.2rem; line-height: 1.5; white-space: pre-wrap; }
    .status-viewer span { font-size: 0.85rem; opacity: 0.9; }
  `]
})
export class StatusViewerDialog {
  protected readonly data = inject(MAT_DIALOG_DATA) as { name: string; story: StatusStory; canDelete: boolean };
  protected readonly dialogRef = inject(MatDialogRef<StatusViewerDialog>);
}

@Component({
  selector: 'app-communication-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatMenuModule,
    AudioPlayerComponent
  ],
  template: `
    <div class="whatsapp-shell" [class.dark-mode]="isDarkMode()" [style.background-image]="chatTheme()">
      <aside class="sidebar">
        <header class="sidebar-header">
          <div class="user-profile">
            <div class="avatar avatar--me">{{ auth.user()?.avatar || 'ME' }}</div>
            <div class="status-indicator">
              <span class="status-chip connected" [ngClass]="chat.status()">{{ chat.status() }}</span>
            </div>
          </div>
          <div class="actions">
            <button mat-icon-button (click)="toggleDarkMode()" [title]="isDarkMode() ? 'Light Mode' : 'Dark Mode'">
               <mat-icon>{{ isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <button mat-icon-button title="Status" (click)="openStatusComposer()"><mat-icon>donut_large</mat-icon></button>
            <button mat-icon-button title="New Chat" (click)="openNewChatDialog()"><mat-icon>add_box</mat-icon></button>
            <button mat-icon-button [matMenuTriggerFor]="mainMenu"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #mainMenu="matMenu">
               <button mat-menu-item (click)="resetSecurityKeys()">
                  <mat-icon>security</mat-icon>
                  <span>Reset Security Keys</span>
               </button>
               <button mat-menu-item>
                  <mat-icon>settings</mat-icon>
                  <span>Settings</span>
               </button>
            </mat-menu>
          </div>
        </header>

        <div class="search-bar">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Search or start new chat" [formControl]="searchControl">
          </mat-form-field>
        </div>

        <section class="status-strip">
          <button class="status-card status-card--own" type="button" (click)="openStatusComposer()">
            <div class="status-avatar" [class.status-avatar--empty]="!ownStatusSummary()">
              <span>{{ auth.user()?.avatar || 'ME' }}</span>
              <span class="status-add-badge">+</span>
            </div>
            <div class="status-copy">
              <strong>My status</strong>
              <span>{{ ownStatusSummary() ? 'Tap to post another update' : 'Add a status update' }}</span>
            </div>
          </button>

          <div class="status-story-list" *ngIf="statusSummaries().length > 0">
            @for (status of statusSummaries(); track status.userId) {
              <button class="status-story" type="button" (click)="openStatusViewer(status)">
                <div class="status-avatar" [class.status-avatar--viewed]="status.viewed">
                  <img *ngIf="status.imageUrl" [src]="status.imageUrl" class="avatar-img">
                  <span *ngIf="!status.imageUrl">{{ status.avatar }}</span>
                </div>
                <span>{{ status.name }}</span>
              </button>
            }
          </div>
        </section>

        <div class="mode-tabs">
          <button (click)="mode.set('private')" [class.active]="mode() === 'private'">Workforce</button>
          <button (click)="mode.set('group')" [class.active]="mode() === 'group'">Groups</button>
        </div>

        <div class="filter-bar">
           <button [class.active]="sidebarFilter() === 'all'" (click)="sidebarFilter.set('all')">All</button>
           <button [class.active]="sidebarFilter() === 'unread'" (click)="sidebarFilter.set('unread')">Unread</button>
           <button [class.active]="sidebarFilter() === 'archived'" (click)="sidebarFilter.set('archived')">Archived</button>
           <button [class.active]="sidebarFilter() === 'favorites'" (click)="sidebarFilter.set('favorites')">Favorites</button>
           <button [class.active]="sidebarFilter() === 'groups'" (click)="sidebarFilter.set('groups')">Groups</button>
        </div>

        <div class="chat-list">
          <div class="chat-item special-item" (click)="openNewGroupDialog()" *ngIf="mode() === 'group'">
             <div class="avatar avatar--special"><mat-icon>group_add</mat-icon></div>
             <div class="chat-info">
                <div class="chat-name-row">
                   <span class="name">Create New Group</span>
                </div>
             </div>
          </div>

          @if (mode() === 'private') {
            @for (contact of filteredContacts(); track contact.id) {
              <div class="chat-item" [class.active]="selectedContact()?.id === contact.id" (click)="selectContact(contact)">
                <div class="avatar">
                   <img *ngIf="contact.imageUrl" [src]="contact.imageUrl" class="avatar-img">
                   <span *ngIf="!contact.imageUrl">{{ contact.avatar }}</span>
                </div>
                <div class="chat-info">
                  <div class="chat-name-row">
                    <span class="name">{{ contact.name }}</span>
                    <span class="time">{{ contact.lastMessageTime | date:'shortTime' }}</span>
                  </div>
                  <div class="chat-preview">
                    <span class="role">{{ contact.lastMessage || contact.role }}</span>
                    <div class="meta-side">
                       <mat-icon class="muted-icon" *ngIf="contact.isMuted">volume_off</mat-icon>
                       <span class="unread-badge" *ngIf="contact.unreadCount">{{ contact.unreadCount }}</span>
                       <span class="status-dot" [class.online]="contact.status === 'ACTIVE'"></span>
                    </div>
                  </div>
                </div>
              </div>
            }
          } @else {
            @for (group of filteredGroups(); track group.id) {
              <div class="chat-item" [class.active]="selectedGroup()?.id === group.id" (click)="selectGroup(group)">
                <div class="avatar avatar--group" [style.background]="group.accent">
                   <img *ngIf="group.imageUrl" [src]="group.imageUrl" class="avatar-img">
                   <span *ngIf="!group.imageUrl">{{ group.name.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div class="chat-info">
                  <div class="chat-name-row">
                    <span class="name">{{ group.name }}</span>
                    <span class="time">{{ group.lastMessageTime | date:'shortTime' }}</span>
                  </div>
                  <div class="chat-preview">
                    <span class="description">{{ group.lastMessage || group.description }}</span>
                    <div class="meta-side">
                       <mat-icon class="muted-icon" *ngIf="group.isMuted">volume_off</mat-icon>
                       <span class="unread-badge" *ngIf="group.unreadCount">{{ group.unreadCount }}</span>
                       <span class="member-count">{{ group.members }} members</span>
                    </div>
                  </div>
                </div>
              </div>
            }
            <div class="empty-state p-4 text-center" *ngIf="filteredGroups().length === 0">
               <p class="text-slate-500 text-sm">No groups found. Create one above!</p>
            </div>
          }
        </div>
      </aside>

      <main class="chat-window">
        @if (isAnySelected()) {
          <header class="chat-header">
            <div class="target-profile" (click)="showDetails.set(!showDetails())">
              @if (mode() === 'private') {
                <div class="avatar">
                   <img *ngIf="selectedContact()?.imageUrl" [src]="selectedContact()?.imageUrl" class="avatar-img">
                   <span *ngIf="!selectedContact()?.imageUrl">{{ selectedContact()?.avatar }}</span>
                </div>
              } @else {
                <div class="avatar avatar--group" [style.background]="selectedGroup()?.accent">
                   <img *ngIf="selectedGroup()?.imageUrl" [src]="selectedGroup()?.imageUrl" class="avatar-img">
                   <span *ngIf="!selectedGroup()?.imageUrl">{{ (selectedGroup()?.name?.slice(0, 2) || 'GR').toUpperCase() }}</span>
                </div>
              }
              <div class="target-info">
                <h3>{{ conversationTitle() }}</h3>
                <p [class.typing-accent]="typingStatus()" [class.online-accent]="selectedContactStatus() === 'ACTIVE'">
                  {{ typingStatus() ?? (mode() === 'private' ? (selectedContactStatus() === 'ACTIVE' ? 'Online' : 'Offline') : (selectedGroup()?.members + ' members')) }}
                </p>
              </div>
            </div>
            <div class="header-actions">
              <button mat-icon-button (click)="shareLocation()"><mat-icon>location_on</mat-icon></button>
              <button mat-icon-button [matMenuTriggerFor]="attachMenu"><mat-icon>attach_file</mat-icon></button>
              <mat-menu #attachMenu="matMenu">
                 <button mat-menu-item (click)="triggerFileUpload()"><mat-icon>insert_drive_file</mat-icon><span>Document</span></button>
                 <button mat-menu-item (click)="triggerImageUpload()"><mat-icon>image</mat-icon><span>Camera / Gallery</span></button>
                 <button mat-menu-item (click)="shareLocation()"><mat-icon>location_on</mat-icon><span>Location</span></button>
              </mat-menu>
              <button mat-icon-button [matMenuTriggerFor]="chatMoreMenu"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #chatMoreMenu="matMenu">
                 <button mat-menu-item (click)="showDetails.set(true)"><mat-icon>info</mat-icon><span>Contact Info</span></button>
                 <button mat-menu-item (click)="toggleMuteConversation()"><mat-icon>{{ isCurrentConversationMuted() ? 'volume_up' : 'volume_off' }}</mat-icon><span>{{ isCurrentConversationMuted() ? 'Unmute notifications' : 'Mute notifications' }}</span></button>
                 <button mat-menu-item (click)="toggleArchiveConversation()"><mat-icon>{{ isCurrentConversationArchived() ? 'unarchive' : 'archive' }}</mat-icon><span>{{ isCurrentConversationArchived() ? 'Move to inbox' : 'Archive chat' }}</span></button>
                 <button mat-menu-item (click)="clearChat()"><mat-icon>delete_sweep</mat-icon><span>Clear Chat</span></button>
                 <button mat-menu-item (click)="toggleBlockUser()" color="warn">
                    <mat-icon>block</mat-icon>
                    <span>{{ isPeerBlocked() ? 'Unblock' : 'Block' }}</span>
                 </button>
                 <mat-divider></mat-divider>
                 <button mat-menu-item [matMenuTriggerFor]="themeMenu"><mat-icon>palette</mat-icon><span>Wallpaper</span></button>
              </mat-menu>
              <mat-menu #themeMenu="matMenu">
                 <button mat-menu-item (click)="setTheme('default')">Default</button>
                 <button mat-menu-item (click)="setTheme('dark')">Solid Dark</button>
                 <button mat-menu-item (click)="setTheme('blueprint')">Blueprint</button>
                 <button mat-menu-item (click)="setTheme('nature')">Nature</button>
              </mat-menu>
            </div>
          </header>

          <div class="pinned-messages-bar" *ngIf="pinnedMessages().length > 0">
             <mat-icon>push_pin</mat-icon>
             <div class="pin-content">
                <strong>Pinned Message</strong>
                <p>{{ pinnedMessages()[pinnedMessages().length-1].content }}</p>
             </div>
             <span class="pin-count" *ngIf="pinnedMessages().length > 1">+{{ pinnedMessages().length - 1 }} more</span>
          </div>

          <div class="blocked-overlay" *ngIf="isPeerBlocked()">
             <p>This user is blocked. You cannot send or receive messages.</p>
             <button mat-stroked-button (click)="toggleBlockUser()">Unblock</button>
          </div>

          <div class="e2ee-banner" *ngIf="mode() === 'private'">
             <mat-icon>lock</mat-icon>
             <span>Messages are end-to-end encrypted. No one outside of this chat, not even EWMS, can read them.</span>
          </div>

          <div class="message-area" #scrollContainer>
            <div class="message-wrapper">
              @for (msg of visibleMessages(); track $index) {
                @if (msg.messageType === 'DATE_HEADER') {
                   <div class="date-marker"><span>{{ msg.content }}</span></div>
                } @else {
                  <div class="message-bubble-row" [class.message-bubble-row--own]="msg.senderId === currentUserId()">
                    <div class="message-bubble" 
                      [class.message-bubble--own]="msg.senderId === currentUserId()"
                      [class.message-bubble--continuation]="isContinuation(msg, visibleMessages(), $index)"
                      [class.message-bubble--deleted]="msg.isDeleted"
                      (mouseenter)="hoveredMsg.set(msg.id!)"
                      (mouseleave)="hoveredMsg.set(null)">
                      
                      <div class="context-menu-trigger" *ngIf="hoveredMsg() === msg.id && !msg.isDeleted">
                         <button mat-icon-button [matMenuTriggerFor]="msgMenu" (click)="$event.stopPropagation()">
                            <mat-icon>expand_more</mat-icon>
                         </button>
                         <mat-menu #msgMenu="matMenu">
                            <button mat-menu-item [matMenuTriggerFor]="reactionMenu"><mat-icon>add_reaction</mat-icon><span>React</span></button>
                            <button mat-menu-item (click)="setReply(msg)"><mat-icon>reply</mat-icon><span>Reply</span></button>
                            <button mat-menu-item (click)="forwardMessage(msg)"><mat-icon>forward</mat-icon><span>Forward</span></button>
                            <button mat-menu-item *ngIf="msg.senderId === currentUserId() && !msg.isDeleted" (click)="startEditMessage(msg)"><mat-icon>edit</mat-icon><span>Edit</span></button>
                            <button mat-menu-item (click)="togglePinMessage(msg)"><mat-icon>push_pin</mat-icon><span>{{ msg.isPinned ? 'Unpin' : 'Pin' }}</span></button>
                            <button mat-menu-item color="warn" *ngIf="msg.senderId === currentUserId()" (click)="deleteMessage(msg)"><mat-icon>delete</mat-icon><span>Delete</span></button>
                         </mat-menu>
                         <mat-menu #reactionMenu="matMenu">
                            @for (emoji of reactionOptions; track emoji) {
                              <button mat-menu-item (click)="reactToMessage(msg, emoji)">
                                <span>{{ emoji }}</span>
                              </button>
                            }
                         </mat-menu>
                      </div>

                      <mat-icon class="pinned-indicator" *ngIf="msg.isPinned">push_pin</mat-icon>

                      @if (msg.replyToId) {
                        <div class="reply-box" (click)="scrollToMessage(msg.replyToId!)">
                           <div class="reply-line"></div>
                           <div class="reply-content">
                              <strong>Reply</strong>
                              <p>{{ msg.replyToContent || 'Encrypted message' }}</p>
                           </div>
                        </div>
                      }

                      @if (mode() === 'group' && msg.senderId !== currentUserId() && !isContinuation(msg, visibleMessages(), $index)) {
                        <span class="sender-name">User {{ msg.senderId }}</span>
                      }
                      
                      @if (msg.isDeleted) {
                        <div class="content deleted-text"><mat-icon>block</mat-icon> This message was deleted</div>
                      } @else {
                        @if (msg.messageType === 'IMAGE') {
                          <div class="media-content">
                            <img [src]="msg.fileUrl" class="chat-img" (click)="openMedia(msg.fileUrl!)">
                            <p class="media-caption">{{ msg.content }}</p>
                          </div>
                        } @else if (msg.messageType === 'AUDIO') {
                          <div class="media-content audio-player-wrapper">
                            <app-audio-player [src]="msg.fileUrl!"></app-audio-player>
                          </div>
                        } @else if (msg.messageType === 'LOCATION' || msg.messageType === 'LIVE_LOCATION') {
                          <div class="media-content location-bubble" (click)="openMap(msg.fileUrl!)">
                             <div class="map-preview" [style.background-image]="'url(' + getMapPreview(msg.fileUrl!) + ')'">
                                <mat-icon>location_on</mat-icon>
                             </div>
                             <div class="location-info">
                                <strong>{{ msg.messageType === 'LIVE_LOCATION' ? 'Live Location' : 'Current Location' }}</strong>
                                <p>Click to view on Google Maps</p>
                             </div>
                          </div>
                        } @else if (msg.messageType === 'VIDEO') {
                          <div class="media-content video-box">
                             <div class="video-preview">
                                <mat-icon>play_arrow</mat-icon>
                             </div>
                             <p class="media-caption">{{ msg.content }}</p>
                          </div>
                        } @else if (msg.messageType === 'DOCUMENT') {
                          <div class="media-content doc-box">
                            <mat-icon>insert_drive_file</mat-icon>
                            <div class="doc-info">
                              <strong>File Attachment</strong>
                              <p>{{ msg.content }}</p>
                            </div>
                          </div>
                        } @else {
                          <div class="content">{{ msg.content }}</div>
                        }
                      }

                      <div class="reaction-summary" *ngIf="msg.reactions?.length">
                        @for (reaction of msg.reactions || []; track reaction.emoji) {
                          <button
                            class="reaction-chip"
                            type="button"
                            [class.reaction-chip--own]="reaction.reactedByCurrentUser"
                            (click)="toggleReaction(msg, reaction.emoji, reaction.reactedByCurrentUser)">
                            <span>{{ reaction.emoji }}</span>
                            <strong>{{ reaction.count }}</strong>
                          </button>
                        }
                      </div>

                      <div class="reaction-picker-inline" *ngIf="hoveredMsg() === msg.id && !msg.isDeleted">
                        @for (emoji of reactionOptions; track emoji) {
                          <button type="button" (click)="reactToMessage(msg, emoji)">{{ emoji }}</button>
                        }
                      </div>

                      <div class="meta">
                        <span class="edited-tag" *ngIf="msg.isEdited">(edited)</span>
                        <span class="time">{{ msg.timestamp ? (msg.timestamp | date: 'shortTime') : 'Now' }}</span>
                        @if (msg.senderId === currentUserId() && !msg.isDeleted) {
                          <mat-icon class="status-icon" [class.read]="msg.isRead">{{ msg.isRead ? 'done_all' : 'done' }}</mat-icon>
                        }
                      </div>
                    </div>
                  </div>
                }
              } @empty {
                <div class="empty-state">
                  <mat-icon>chat_bubble_outline</mat-icon>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              }
            </div>
          </div>

          <div class="reply-preview-bar" *ngIf="replyingTo()">
             <div class="reply-line"></div>
             <div class="reply-content">
                <strong>Replying to {{ replyingTo()?.senderId === currentUserId() ? 'yourself' : 'User ' + replyingTo()?.senderId }}</strong>
                <p>{{ replyingTo()?.content }}</p>
             </div>
             <button mat-icon-button (click)="replyingTo.set(null)"><mat-icon>close</mat-icon></button>
          </div>

          <div class="emoji-tray" *ngIf="showEmojiPicker()">
             <span (click)="addEmoji('😊')">😊</span><span (click)="addEmoji('😂')">😂</span><span (click)="addEmoji('👍')">👍</span>
             <span (click)="addEmoji('❤️')">❤️</span><span (click)="addEmoji('🙌')">🙌</span><span (click)="addEmoji('🔥')">🔥</span>
             <span (click)="addEmoji('🎉')">🎉</span><span (click)="addEmoji('✅')">✅</span><span (click)="addEmoji('🚀')">🚀</span>
          </div>

          <footer class="chat-footer">
            <div class="recording-ui" *ngIf="recorder.isRecording()">
               <button mat-icon-button color="warn" (click)="recorder.cancelRecording()"><mat-icon>delete</mat-icon></button>
               <div class="recording-status">
                  <div class="record-dot"></div>
                  <span>{{ recorder.formatTime(recorder.recordingTime()) }}</span>
               </div>
               <div class="recording-wave">
                  <span></span><span></span><span></span><span></span><span></span>
               </div>
               <button mat-flat-button color="primary" class="send-voice-btn" (click)="stopAndSendVoice()">
                  <mat-icon>send</mat-icon>
                  Send
               </button>
            </div>

            <ng-container *ngIf="!recorder.isRecording()">
              <button mat-icon-button (click)="showEmojiPicker.set(!showEmojiPicker())"><mat-icon>insert_emoticon</mat-icon></button>
              <form [formGroup]="form" (ngSubmit)="send()" class="message-form">
                <input type="text" formControlName="content" placeholder="Type a message" (input)="onType()">
                
                <button type="submit" *ngIf="form.get('content')?.value" class="send-btn">
                  <mat-icon color="primary">send</mat-icon>
                </button>
                
                <button type="button" (click)="recorder.startRecording()" *ngIf="!form.get('content')?.value" class="send-btn">
                  <mat-icon color="primary">mic</mat-icon>
                </button>
              </form>
            </ng-container>
          </footer>
        } @else {
          <div class="no-selection">
            <div class="hero">
              <div class="illustration">
                <mat-icon>hub</mat-icon>
              </div>
              <h1>EWMS Communication Hub</h1>
              <p>Select a contact or an operational group to start messaging across the workforce.</p>
              <div class="encryption-note">
                <mat-icon>lock</mat-icon>
                <span>End-to-end encrypted for workforce security.</span>
              </div>
            </div>
          </div>
        }
      </main>

      @if (showDetails() && isAnySelected()) {
        <aside class="details-panel">
          <header>
            <button mat-icon-button (click)="showDetails.set(false)"><mat-icon>close</mat-icon></button>
            <span>{{ mode() === 'private' ? 'Contact Info' : 'Group Info' }}</span>
          </header>
          <div class="details-content">
            <div class="big-avatar" [style.background]="mode() === 'group' ? selectedGroup()?.accent : ''">
              {{ mode() === 'private' ? (selectedContact()?.avatar ?? 'U') : (selectedGroup()?.name?.slice(0, 2)?.toUpperCase() ?? 'G') }}
            </div>
            <h2>{{ conversationTitle() }}</h2>
            <p class="role-desc">{{ mode() === 'private' ? selectedContact()?.role : selectedGroup()?.description }}</p>

            <mat-divider></mat-divider>

            <div class="section">
              <p class="section-label">Media, Links and Docs</p>
              <div class="media-placeholder">
                <div class="box"></div><div class="box"></div><div class="box"></div>
              </div>
            </div>

            <mat-divider></mat-divider>

            <div class="actions-list">
              <button mat-button color="warn"><mat-icon>block</mat-icon> Block {{ mode() === 'private' ? 'User' : 'Group' }}</button>
              <button mat-button color="warn"><mat-icon>thumb_down</mat-icon> Report {{ mode() === 'private' ? 'Contact' : 'Group' }}</button>
            </div>
          </div>
        </aside>
      }
    </div>
  `,
  styles: [`
    .whatsapp-shell { display: flex; height: 75vh; background: #fff; border-radius: 1.2rem; overflow: hidden; box-shadow: 0 40px 100px rgba(0,0,0,0.1); margin-top: 1.5rem; border: 1px solid #e2e8f0; background-size: cover; background-position: center; transition: background-image 0.5s ease; }
    
    .blocked-overlay { position: absolute; top: 4rem; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.9); z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 2rem; }
    .blocked-overlay p { color: #64748b; margin-bottom: 1rem; font-weight: 500; }

    .location-bubble { background: #fff; border-radius: 0.5rem; overflow: hidden; border: 1px solid #e2e8f0; cursor: pointer; width: 15rem; margin: 0.25rem 0; }
    .map-preview { height: 8rem; background-size: cover; background-position: center; display: grid; place-items: center; background-color: #e2e8f0; }
    .map-preview mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #ef4444; }
    .location-info { padding: 0.5rem; }
    .location-info strong { font-size: 0.85rem; display: block; color: #2563eb; }
    .location-info p { margin: 0; font-size: 0.75rem; color: #64748b; }

    /* Sidebar */
    .sidebar { width: 25rem; display: flex; flex-direction: column; border-right: 1px solid #e2e8f0; background: #fff; }
    .sidebar-header { height: 4rem; padding: 0 1rem; background: #f0f2f5; display: flex; justify-content: space-between; align-items: center; }
    .user-profile { display: flex; align-items: center; gap: 0.75rem; }
    .avatar { width: 2.5rem; height: 2.5rem; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 0.9rem; overflow: hidden; }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    .avatar--me { background: #1e293b; }
    .avatar--group { border-radius: 50%; }
    .avatar--ai { background: linear-gradient(135deg, #000, #1e293b); border: 2px solid #2563eb; }
    .avatar--special { background: #25d366; color: #fff; }
    
    .filter-bar { display: flex; padding: 0.5rem 1rem; gap: 0.5rem; overflow-x: auto; background: #fff; border-bottom: 1px solid #f1f5f9; scrollbar-width: none; }
    .filter-bar::-webkit-scrollbar { display: none; }
    .filter-bar button { border: none; background: #f0f2f5; padding: 0.4rem 1.2rem; border-radius: 1.2rem; font-size: 0.8rem; cursor: pointer; color: #54656f; white-space: nowrap; transition: all 0.2s; font-weight: 500; }
    .filter-bar button.active { background: #d9fdd3; color: #008069; font-weight: 600; }

    .pinned-messages-bar { background: #fff; padding: 0.5rem 1rem; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; cursor: pointer; position: relative; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05); animation: slideDown 0.3s ease-out; }
    .pinned-messages-bar mat-icon { color: #2563eb; font-size: 1.2rem; }
    .pin-content { flex: 1; min-width: 0; }
    .pin-content strong { font-size: 0.75rem; color: #2563eb; }
    .pin-content p { margin: 0; font-size: 0.85rem; color: #54656f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pin-count { font-size: 0.75rem; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 10px; }

    @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }

    .special-item { border-bottom: 1px solid #f1f5f9; background: #fafafa; }
    .fav-star { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #eab308; }

    .edited-tag { font-size: 0.65rem; color: #8696a0; margin-right: 4px; font-style: italic; }
    .pinned-indicator { position: absolute; bottom: 4px; left: -18px; font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #8696a0; transform: rotate(45deg); }

    .search-bar { padding: 0.5rem 0.8rem; }
    .search-field { width: 100%; }
    ::ng-deep .search-field .mat-mdc-text-field-wrapper { background: #f0f2f5 !important; border-radius: 0.6rem !important; height: 2.5rem; }
    ::ng-deep .search-field .mat-mdc-form-field-flex { min-height: 2.5rem !important; padding-top: 0 !important; }
    .status-strip { padding: 0 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .status-card { display: flex; align-items: center; gap: 0.75rem; border: none; background: #f8fafc; border-radius: 1rem; padding: 0.75rem; cursor: pointer; text-align: left; }
    .status-card--own { border: 1px solid #dcfce7; }
    .status-copy { display: flex; flex-direction: column; min-width: 0; }
    .status-copy strong { color: #0f172a; font-size: 0.9rem; }
    .status-copy span { color: #64748b; font-size: 0.75rem; }
    .status-story-list { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: none; }
    .status-story-list::-webkit-scrollbar { display: none; }
    .status-story { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; border: none; background: transparent; min-width: 4.25rem; cursor: pointer; color: #475569; font-size: 0.72rem; }
    .status-story span { max-width: 4.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .status-avatar { width: 3rem; height: 3rem; border-radius: 50%; padding: 2px; background: linear-gradient(135deg, #25d366, #128c7e); display: grid; place-items: center; position: relative; flex-shrink: 0; }
    .status-avatar > span, .status-avatar > img { width: 100%; height: 100%; border-radius: 50%; background: #e2e8f0; display: grid; place-items: center; color: #0f172a; font-weight: 700; object-fit: cover; }
    .status-avatar--viewed { background: linear-gradient(135deg, #cbd5e1, #94a3b8); }
    .status-avatar--empty { background: linear-gradient(135deg, #bae6fd, #93c5fd); }
    .status-add-badge { position: absolute; right: -2px; bottom: -2px; width: 1.1rem !important; height: 1.1rem !important; background: #25d366 !important; color: #fff !important; border: 2px solid #fff; font-size: 0.85rem; }
    .mode-tabs { display: flex; padding: 0.5rem 1rem; gap: 0.5rem; border-bottom: 1px solid #f1f5f9; }
    .mode-tabs button { flex: 1; border: none; background: transparent; padding: 0.6rem; font-size: 0.85rem; font-weight: 600; cursor: pointer; color: #64748b; transition: all 0.2s; position: relative; }
    .mode-tabs button.active { color: #2563eb; }
    .mode-tabs button.active::after { content: ''; position: absolute; bottom: 0; left: 0; width: 100%; height: 3px; background: #2563eb; }

    .chat-list { flex: 1; overflow-y: auto; }
    .chat-item { display: flex; gap: 0.8rem; padding: 0.8rem 1rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
    .chat-item:hover { background: #f8fafc; }
    .chat-item.active { background: #f1f5f9; }
    .chat-info { flex: 1; min-width: 0; }
    .chat-name-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem; }
    .name { font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .time { font-size: 0.75rem; color: #64748b; }
    .chat-preview { display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: #64748b; }
    .role, .description { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%; }
    .meta-side { display: flex; align-items: center; gap: 0.5rem; }
    .muted-icon { width: 0.95rem; height: 0.95rem; font-size: 0.95rem; color: #94a3b8; }
    .unread-badge { background: #25d366; color: #fff; font-size: 0.7rem; font-weight: 700; min-width: 1.2rem; height: 1.2rem; border-radius: 1rem; display: grid; place-items: center; padding: 0 0.3rem; }
    .status-dot { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: #cbd5e1; }
    .status-dot.online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); }

    /* Chat Window */
    .chat-window { flex: 1; display: flex; flex-direction: column; background: #efeae2; background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); }
    .chat-header { height: 4rem; padding: 0 1rem; background: #f0f2f5; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
    .target-profile { display: flex; align-items: center; gap: 0.8rem; cursor: pointer; }
    .target-info h3 { margin: 0; font-size: 1rem; color: #0f172a; }
    .target-info p { margin: 0; font-size: 0.8rem; color: #64748b; }
    .typing-accent, .online-accent { color: #10b981 !important; font-weight: 700; }
    .typing-accent { animation: flash 1.5s infinite; }
    @keyframes flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .e2ee-banner { background: #ffeb3b; color: #54656f; font-size: 0.8rem; text-align: center; padding: 0.5rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    .e2ee-banner mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .message-area { flex: 1; overflow-y: auto; padding: 1.5rem 5%; scroll-behavior: smooth; }
    .message-wrapper { display: flex; flex-direction: column; gap: 0.15rem; }
    .date-marker { display: flex; justify-content: center; margin: 1.5rem 0; }
    .date-marker span { background: #fff; padding: 0.4rem 0.8rem; border-radius: 0.5rem; font-size: 0.75rem; color: #54656f; box-shadow: 0 1px 1px rgba(0,0,0,0.1); text-transform: uppercase; font-weight: 600; }

    .message-bubble-row { display: flex; flex-direction: column; width: 100%; align-items: flex-start; }
    .message-bubble-row--own { align-items: flex-end; }

    .message-bubble { max-width: 65%; padding: 0.5rem 0.7rem 0.4rem; border-radius: 0.5rem; background: #fff; box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative; }
    .message-bubble--own { background: #d9fdd3; }
    .message-bubble--continuation { margin-top: -0.1rem; }
    .message-bubble--own:not(.message-bubble--continuation)::after { content: ''; position: absolute; top: 0; right: -8px; width: 0; height: 0; border: 10px solid transparent; border-left-color: #d9fdd3; border-top-color: #d9fdd3; }
    .message-bubble:not(.message-bubble--own):not(.message-bubble--continuation)::after { content: ''; position: absolute; top: 0; left: -8px; width: 0; height: 0; border: 10px solid transparent; border-right-color: #fff; border-top-color: #fff; }

    .context-menu-trigger { position: absolute; top: 0; right: 0; opacity: 0; transition: opacity 0.2s; z-index: 5; }
    .message-bubble:hover .context-menu-trigger { opacity: 1; }
    .context-menu-trigger button { width: 2rem; height: 2rem; background: rgba(255,255,255,0.8) !important; color: #54656f; }

    .reply-box { background: rgba(0,0,0,0.05); border-radius: 0.4rem; display: flex; margin-bottom: 0.4rem; cursor: pointer; overflow: hidden; border-left: 4px solid #2563eb; }
    .message-bubble--own .reply-box { background: rgba(0,0,0,0.03); border-left-color: #06d755; }
    .reply-content { padding: 0.4rem 0.6rem; flex: 1; }
    .reply-content strong { font-size: 0.75rem; color: #2563eb; display: block; }
    .message-bubble--own .reply-content strong { color: #06d755; }
    .reply-content p { margin: 0; font-size: 0.8rem; color: #54656f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 15rem; }

    .reply-preview-bar { background: #f0f2f5; padding: 0.5rem 1rem; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 1rem; animation: slideUp 0.2s ease-out; }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .reply-preview-bar .reply-line { width: 4px; background: #2563eb; height: 2rem; border-radius: 2px; }
    .reply-preview-bar .reply-content { flex: 1; text-align: left; }
    .deleted-text { color: #8696a0; font-style: italic; display: flex; align-items: center; gap: 0.4rem; }
    .deleted-text mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    .media-content { margin-bottom: 0.25rem; }
    .chat-img { max-width: 100%; border-radius: 0.4rem; display: block; }
    .media-caption { font-size: 0.85rem; margin-top: 0.5rem; color: #111b21; }
    .doc-box { display: flex; align-items: center; gap: 0.75rem; background: rgba(0,0,0,0.04); padding: 0.75rem; border-radius: 0.5rem; }
    .doc-box mat-icon { font-size: 2rem; width: 2rem; height: 2rem; color: #64748b; }
    .doc-info strong { display: block; font-size: 0.85rem; }
    .doc-info p { margin: 0; font-size: 0.75rem; color: #64748b; }

    .sender-name { display: block; font-size: 0.75rem; font-weight: 700; color: #2563eb; margin-bottom: 0.2rem; }
    
    .audio-player-wrapper { margin: 0.25rem 0; }
    
    .video-box { position: relative; width: 100%; aspect-ratio: 16/9; background: #000; border-radius: 0.5rem; display: grid; place-items: center; overflow: hidden; }
    .video-preview { color: #fff; transform: scale(2); }

    .emoji-tray { position: absolute; bottom: 4.5rem; left: 1rem; background: #fff; padding: 1rem; border-radius: 1rem; box-shadow: 0 10px 40px rgba(0,0,0,0.15); display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; z-index: 100; border: 1px solid #e2e8f0; }
    .emoji-tray span { font-size: 1.5rem; cursor: pointer; transition: transform 0.1s; }
    .emoji-tray span:hover { transform: scale(1.2); }

    .content { font-size: 0.92rem; color: #111b21; line-height: 1.4; white-space: pre-wrap; word-break: break-word; }
    .reaction-summary { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.45rem; }
    .reaction-chip { display: inline-flex; align-items: center; gap: 0.25rem; border: 1px solid #dbeafe; background: rgba(255,255,255,0.9); border-radius: 999px; padding: 0.15rem 0.45rem; cursor: pointer; font-size: 0.75rem; color: #0f172a; }
    .reaction-chip strong { font-size: 0.72rem; color: #64748b; }
    .reaction-chip--own { border-color: #86efac; background: #f0fdf4; }
    .reaction-picker-inline { position: absolute; top: -1.6rem; right: 0.5rem; display: flex; gap: 0.25rem; background: #fff; padding: 0.2rem; border-radius: 999px; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.16); z-index: 6; }
    .reaction-picker-inline button { border: none; background: transparent; cursor: pointer; padding: 0.1rem 0.2rem; font-size: 0.95rem; }
    .meta { display: flex; align-items: center; justify-content: flex-end; gap: 0.3rem; margin-top: 0.1rem; }
    .meta .time { font-size: 0.65rem; color: #667781; }
    .status-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #8696a0; }
    .status-icon.read { color: #53bdeb; }

    .chat-footer { padding: 0.5rem 1rem; background: #f0f2f5; display: flex; flex-direction: column; }
    .message-form { display: flex; align-items: center; gap: 0.5rem; width: 100%; }
    .message-form input { flex: 1; border: none; padding: 0.6rem 1rem; border-radius: 1.5rem; background: #fff; font-size: 0.95rem; outline: none; }

    .recording-ui { display: flex; align-items: center; gap: 1rem; width: 100%; padding: 0.25rem; animation: fadeIn 0.3s; }
    .recording-status { display: flex; align-items: center; gap: 0.5rem; font-family: monospace; font-size: 1.1rem; color: #ef4444; min-width: 80px; }
    .record-dot { width: 12px; height: 12px; background: #ef4444; border-radius: 50%; animation: pulse 1s infinite; }
    .recording-wave { display: flex; align-items: center; gap: 3px; flex: 1; justify-content: center; }
    .recording-wave span { width: 3px; height: 10px; background: #2563eb; animation: wave 1s infinite ease-in-out; }
    .recording-wave span:nth-child(2) { animation-delay: 0.1s; height: 20px; }
    .recording-wave span:nth-child(3) { animation-delay: 0.2s; height: 15px; }
    .recording-wave span:nth-child(4) { animation-delay: 0.3s; height: 25px; }
    .recording-wave span:nth-child(5) { animation-delay: 0.4s; height: 12px; }

    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.5; } 100% { transform: scale(1); opacity: 1; } }
    @keyframes wave { 0%, 100% { height: 10px; } 50% { height: 30px; } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .send-btn { border: none; background: transparent; cursor: pointer; color: #54656f; display: flex; align-items: center; }    .send-btn:hover { color: #000; }

    /* Details Panel */
    .details-panel { width: 22rem; background: #fff; border-left: 1px solid #e2e8f0; display: flex; flex-direction: column; }
    .details-panel header { height: 4rem; padding: 0 1rem; display: flex; align-items: center; gap: 1rem; background: #f0f2f5; color: #0f172a; font-weight: 600; }
    .details-content { padding: 2rem 1.5rem; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .big-avatar { width: 12rem; height: 12rem; border-radius: 50%; background: #2563eb; color: #fff; display: grid; place-items: center; font-size: 4rem; font-weight: 700; margin-bottom: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
    .role-desc { color: #64748b; margin-top: 0.5rem; }
    .section { align-self: flex-start; width: 100%; padding: 1.5rem 0; }
    .section-label { font-size: 0.85rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; margin-bottom: 1rem; text-align: left; }
    .media-placeholder { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
    .media-placeholder .box { aspect-ratio: 1; background: #f1f5f9; border-radius: 0.3rem; }
    .actions-list { width: 100%; display: flex; flex-direction: column; gap: 0.5rem; padding-top: 1.5rem; }

    /* No selection state */
    .no-selection { flex: 1; display: grid; place-items: center; text-align: center; background: #f0f2f5; border-bottom: 6px solid #2563eb; }
    .no-selection .hero { max-width: 30rem; padding: 2rem; }
    .illustration { width: 6rem; height: 6rem; border-radius: 50%; background: #e2e8f0; display: grid; place-items: center; margin: 0 auto 1.5rem; }
    .illustration mat-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #94a3b8; }
    .no-selection h1 { font-size: 2rem; color: #41525d; font-weight: 300; margin-bottom: 1rem; }
    .no-selection p { color: #667781; font-size: 0.95rem; line-height: 1.5; }
    .encryption-note { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 3rem; color: #8696a0; font-size: 0.85rem; }
    .encryption-note mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

    @media (max-width: 1200px) { .sidebar { width: 20rem; } .details-panel { display: none; } }
    @media (max-width: 768px) { .sidebar { width: 100%; } .chat-window { display: none; } }
  `]
})
export class CommunicationPageComponent implements OnInit {
  public readonly auth = inject(AuthService);
  private readonly chatApi = inject(CommunicationDataService);
  protected readonly chat = inject(ChatSocketService);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly crypto = inject(CryptoService);
  protected readonly recorder = inject(VoiceRecorderService);
  private readonly location = inject(LocationService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  protected readonly currentUserId = computed(() => this.auth.user()?.id ?? 1);
  protected readonly currentCompanyId = computed(() => this.auth.user()?.companyId ?? 1);
  
  protected readonly chatTheme = signal<string>('url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")');
  private readonly blockedUsers = signal<Set<number>>(new Set());
  
  protected readonly isPeerBlocked = computed(() => {
     const peerId = this.selectedContact()?.id;
     return peerId ? this.blockedUsers().has(peerId) : false;
  });

  private myPrivateKey: CryptoKey | null = null;
  private myPublicKey: CryptoKey | null = null;
  private currentRecipientPublicKey: CryptoKey | null = null;
  
  private readonly decryptedMessages = signal<ChatMessage[]>([]);

  private readonly chatSummariesState = signal<any[]>([]);
  private readonly statusStoriesState = signal<StatusStory[]>([]);
  protected readonly decryptedSummaries = signal<any[]>([]);
  protected readonly chatSummaries = this.chatSummariesState.asReadonly();
  private readonly allEmployees = toSignal(this.chatApi.loadAllEmployees(this.currentCompanyId()), { initialValue: [] });
  private readonly localGroups = signal<ConversationGroup[]>([]);
  protected readonly reactionOptions = ['\u{1F44D}', '\u{2764}\u{FE0F}', '\u{1F602}', '\u{1F62E}', '\u{1F389}', '\u{1F525}'];

  protected readonly sidebarFilter = signal<'all' | 'unread' | 'archived' | 'favorites' | 'groups'>('all');
  protected readonly editingMessage = signal<ChatMessage | null>(null);
  private readonly favoriteIds = signal<Set<number>>(new Set());

  protected readonly contacts = computed(() => {
    const summaries = this.decryptedSummaries();
    const presence = this.chat.presence();
    const filter = this.sidebarFilter();
    
    let list = summaries.filter(s => s.type === 'PRIVATE');

    // Add EWMS AI Assistant to the top
    const aiAssistant = {
       id: 0,
       name: 'EWMS AI Assistant',
       role: 'AI System',
       status: 'ACTIVE',
       avatar: 'AI',
       imageUrl: 'https://images.unsplash.com/photo-1675271591211-126ad94ec69c?auto=format&fit=crop&q=80&w=100',
       lastMessage: 'Ask me anything about EWMS...',
       unreadCount: 0,
       isMuted: false,
       isArchived: false
    } as any;

    const withAI = [aiAssistant, ...list];

    return withAI
      .map(s => ({
        id: s.id,
        name: s.name,
        role: s.status === 'ACTIVE' ? 'Active' : 'Away',
        status: presence.get(s.id) ?? s.status,
        avatar: s.avatar,
        imageUrl: s.imageUrl,
        lastMessage: s.lastMessage,
        lastMessageTime: s.lastMessageTimestamp,
        unreadCount: s.unreadCount,
        isFavorite: this.favoriteIds().has(s.id),
        isMuted: s.muted ?? false,
        isArchived: s.archived ?? false
      } as any))
      .filter(c => {
         if (filter === 'unread') return c.unreadCount > 0;
         if (filter === 'archived') return c.isArchived;
         if (filter === 'favorites') return c.isFavorite;
         if (c.isArchived) return false;
         return true;
      });
  });

  protected readonly pinnedMessages = computed(() => {
     return this.decryptedMessages().filter(m => m.isPinned && (
        this.mode() === 'group' ? m.groupId === this.selectedGroup()?.id :
        ((m.senderId === this.currentUserId() && m.recipientId === this.selectedContact()?.id) ||
         (m.senderId === this.selectedContact()?.id && m.recipientId === this.currentUserId()))
     ));
  });

  protected readonly groups = computed(() => {
    const summaries = this.decryptedSummaries();
    const remote = summaries
      .filter(s => s.type === 'GROUP')
      .map(s => ({
        id: s.id,
        name: s.name,
        description: s.lastMessage || 'Operational group',
        members: 1, // Placeholder
        accent: s.avatar, // In backend we stored accent in avatar field for groups
        imageUrl: s.imageUrl,
        lastMessage: s.lastMessage,
        lastMessageTime: s.lastMessageTimestamp,
        unreadCount: s.unreadCount,
        isMuted: s.muted ?? false,
        isArchived: s.archived ?? false
      } as ConversationGroup));

    return [...remote, ...this.localGroups()].filter((group) => {
      if (this.sidebarFilter() === 'archived') {
        return !!group.isArchived;
      }
      return !group.isArchived;
    });
  });
  protected readonly ownStatusSummary = computed(() =>
    this.statusStoriesState()
      .filter((story) => story.userId === this.currentUserId() && story.active)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
  );
  protected readonly statusSummaries = computed<StatusStorySummary[]>(() => {
    const currentId = this.currentUserId();
    const employees = new Map(this.allEmployees().map((employee) => [employee.id, employee]));
    const grouped = new Map<number, StatusStory[]>();

    this.statusStoriesState()
      .filter((story) => story.active && story.userId !== currentId)
      .forEach((story) => {
        const bucket = grouped.get(story.userId) ?? [];
        bucket.push(story);
        grouped.set(story.userId, bucket);
      });

    return Array.from(grouped.entries())
      .map(([userId, stories]) => {
        const sortedStories = [...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const latestStory = sortedStories[0];
        const employee = employees.get(userId);
        return {
          userId,
          name: employee?.name ?? `User ${userId}`,
          avatar: employee?.avatar ?? 'ST',
          imageUrl: employee?.imageUrl ?? null,
          viewed: sortedStories.every((story) => story.viewedByRequester),
          latestStory,
          stories: sortedStories,
          isOwn: false
        };
      })
      .sort((a, b) => Number(a.viewed) - Number(b.viewed) || new Date(b.latestStory.createdAt).getTime() - new Date(a.latestStory.createdAt).getTime());
  });
  protected readonly mode = signal<ChatMode>('private');

  protected openNewGroupDialog(): void {
    const dialogRef = this.dialog.open(NewGroupDialog, { 
      width: '400px', 
      data: { employees: this.allEmployees().filter(e => e.id !== this.currentUserId()) } 
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const payload = { ...result, companyId: this.currentCompanyId() };
        this.chatApi.createGroup(payload).subscribe({
          next: (newGroup) => {
            this.localGroups.update(gs => [...gs, newGroup]);
            this.snack.open(`Group "${newGroup.name}" created!`, 'OK', { duration: 3000 });
          },
          error: () => this.snack.open('Failed to create group. Using local simulation.', 'OK', { duration: 3000 })
        });
      }
    });
  }

  protected openNewChatDialog(): void {
    const dialogRef = this.dialog.open(NewChatDialog, { 
      width: '400px', 
      data: { employees: this.allEmployees().filter(e => e.id !== this.currentUserId()) } 
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.selectContact(result);
      }
    });
  }

  protected openStatusComposer(): void {
    const dialogRef = this.dialog.open(StatusComposerDialog, { width: '420px' });
    dialogRef.afterClosed().subscribe((result) => {
      if (!result?.content?.trim()) {
        return;
      }

      this.chatApi.createStatus({
        userId: this.currentUserId(),
        companyId: this.currentCompanyId(),
        content: result.content.trim(),
        backgroundStyle: result.backgroundStyle || '#128C7E',
        statusType: 'TEXT',
        expiresInHours: 24
      }).subscribe({
        next: () => {
          this.snack.open('Status posted', 'OK', { duration: 2000 });
          this.refreshStatuses();
        },
        error: () => this.snack.open('Failed to post status', 'OK', { duration: 2500 })
      });
    });
  }

  protected openStatusViewer(summary: StatusStorySummary): void {
    const dialogRef = this.dialog.open(StatusViewerDialog, {
      width: '420px',
      data: {
        name: summary.name,
        story: summary.latestStory,
        canDelete: summary.userId === this.currentUserId()
      }
    });

    if (summary.userId !== this.currentUserId() && !summary.latestStory.viewedByRequester) {
      this.chatApi.markStatusViewed(summary.latestStory.id, this.currentUserId()).subscribe({
        next: () => this.refreshStatuses()
      });
    }

    dialogRef.afterClosed().subscribe((action) => {
      if (action === 'delete') {
        this.chatApi.deleteStatus(summary.latestStory.id, this.currentUserId()).subscribe({
          next: () => {
            this.snack.open('Status deleted', 'OK', { duration: 2000 });
            this.refreshStatuses();
          },
          error: () => this.snack.open('Failed to delete status', 'OK', { duration: 2500 })
        });
      }
    });
  }
  protected readonly selectedContact = signal<ConversationContact | null>(null);
  protected readonly selectedContactStatus = computed(() => {
    const contact = this.selectedContact();
    if (!contact) return null;
    return this.chat.presence().get(contact.id) ?? contact.status;
  });
  protected readonly selectedGroup = signal<ConversationGroup | null>(null);
  protected readonly showDetails = signal(false);
  protected readonly typingStatus = signal<string | null>(null);
  protected readonly showEmojiPicker = signal(false);
  protected readonly hoveredMsg = signal<number | null>(null);
  protected readonly replyingTo = signal<ChatMessage | null>(null);
  protected readonly isDarkMode = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly searchControl = new FormControl('');
  
  protected toggleDarkMode(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }
  
  protected readonly form = this.fb.group({
    content: ['', [Validators.required, Validators.minLength(1)]]
  });

  protected readonly isAnySelected = computed(() => 
    (this.mode() === 'private' && !!this.selectedContact()) || 
    (this.mode() === 'group' && !!this.selectedGroup())
  );
  protected readonly isCurrentConversationMuted = computed(() => {
    if (this.mode() === 'private') {
      return this.selectedContact()?.isMuted ?? false;
    }
    return this.selectedGroup()?.isMuted ?? false;
  });
  protected readonly isCurrentConversationArchived = computed(() => {
    if (this.mode() === 'private') {
      return this.selectedContact()?.isArchived ?? false;
    }
    return this.selectedGroup()?.isArchived ?? false;
  });

  async ngOnInit(): Promise<void> {
    await this.initializeE2EE();
    this.refreshStatuses();
  }

  protected async resetSecurityKeys(): Promise<void> {
    if (confirm('Resetting security keys will prevent you from reading existing encrypted messages. Continue?')) {
      const userId = this.currentUserId();
      localStorage.removeItem(`ewms_priv_${userId}`);
      localStorage.removeItem(`ewms_pub_${userId}`);
      await this.initializeE2EE();
      this.snack.open('Security keys reset and synchronized.', 'OK', { duration: 3000 });
    }
  }

  private async initializeE2EE(): Promise<void> {
    const userId = this.currentUserId();
    const companyId = this.currentCompanyId();
    let storedPrivKey = localStorage.getItem(`ewms_priv_${userId}`);
    let storedPubKey = localStorage.getItem(`ewms_pub_${userId}`);

    // WhatsApp Strategy: Validate keys with server
    try {
      if (storedPrivKey && storedPubKey) {
        this.myPrivateKey = await this.crypto.importPrivateKey(storedPrivKey);
        this.myPublicKey = await this.crypto.importPublicKey(storedPubKey);
        
        // Verify with server
        const serverKey = await this.chatApi.getPublicKey(userId).toPromise();
        if (!serverKey || serverKey.publicKey !== storedPubKey) {
           console.log('[E2EE] Server key mismatch or missing. Re-publishing local key...');
           await this.chatApi.publishPublicKey(userId, companyId, storedPubKey).toPromise();
        }
        console.log('[E2EE] Keys validated and synchronized.');
      } else {
        console.log('[E2EE] Generating new keys...');
        const keyPair = await this.crypto.generateKeyPair();
        this.myPrivateKey = keyPair.privateKey;
        this.myPublicKey = keyPair.publicKey;

        const exportedPriv = await this.crypto.exportPrivateKey(this.myPrivateKey);
        const exportedPub = await this.crypto.exportPublicKey(this.myPublicKey);
        
        localStorage.setItem(`ewms_priv_${userId}`, exportedPriv);
        localStorage.setItem(`ewms_pub_${userId}`, exportedPub);

        await this.chatApi.publishPublicKey(userId, companyId, exportedPub).toPromise();
        console.log('[E2EE] New keys published to directory.');
      }
    } catch (e) {
      console.error('[E2EE] Initialization failed:', e);
      this.snack.open('Security initialization failed. Some messages may be unreadable.', 'OK', { duration: 5000 });
    }
  }

  protected readonly filteredContacts = computed(() => {
    const search = this.searchControl.value?.toLowerCase() || '';
    const currentId = this.currentUserId();
    
    if (!search) {
      // Show ONLY people you have a chat history with (The standard WhatsApp view)
      return this.contacts().filter(c => c.id !== currentId);
    }

    // SEARCH mode: Search the ENTIRE enterprise directory
    const all = this.allEmployees();
    return all.filter(e => 
      e.id !== currentId && 
      (e.name.toLowerCase().includes(search) || e.role.toLowerCase().includes(search))
    );
  });

  protected readonly filteredGroups = computed(() => {
    const search = this.searchControl.value?.toLowerCase() || '';
    const groups = this.groups();
    if (!search) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(search) || g.description.toLowerCase().includes(search));
  });

  protected readonly visibleMessages = computed(() => {
    const messages = this.decryptedMessages().filter(m => m.messageType !== 'TYPING');
    const currentId = this.currentUserId();
    
    let filtered: ChatMessage[] = [];
    if (this.mode() === 'group') {
      const groupId = this.selectedGroup()?.id;
      filtered = messages.filter((message) => message.groupId === groupId);
    } else {
      const peerId = this.selectedContact()?.id;
      filtered = messages.filter((message) =>
        message.groupId == null &&
        ((message.senderId === currentId && message.recipientId === peerId) ||
          (message.senderId === peerId && message.recipientId === currentId))
      );
    }

    // Add Date Headers
    const withHeaders: any[] = [];
    let lastDate = '';
    
    filtered.forEach(msg => {
      const msgDate = msg.timestamp ? new Date(msg.timestamp).toDateString() : new Date().toDateString();
      if (msgDate !== lastDate) {
        withHeaders.push({
          messageType: 'DATE_HEADER',
          content: this.formatDateLabel(msgDate)
        } as any);
        lastDate = msgDate;
      }
      withHeaders.push(msg);
    });

    return withHeaders;
  });

  private formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  protected isContinuation(msg: any, all: any[], index: number): boolean {
    if (index === 0) return false;
    const prev = all[index - 1];
    if (prev.messageType === 'DATE_HEADER') return false;
    return prev.senderId === msg.senderId;
  }

  protected setReply(msg: ChatMessage): void {
    this.replyingTo.set(msg);
    // Focus the input
    setTimeout(() => {
       const input = document.querySelector('.message-form input') as HTMLInputElement;
       input?.focus();
    }, 50);
  }

  protected forwardMessage(msg: ChatMessage): void {
    this.snack.open('Forwarding feature coming soon!', 'OK', { duration: 2000 });
  }

  protected deleteMessage(msg: ChatMessage): void {
     this.chatApi.deleteMessage(msg.id!, this.currentUserId()).subscribe({
        next: () => this.snack.open('Message deleted', 'OK', { duration: 2000 })
     });
  }

  protected scrollToMessage(id: number): void {
     // Implementation for scrolling to a specific message in history
     this.snack.open('Scrolling to original message...', 'OK', { duration: 1000 });
  }

  protected readonly conversationTitle = computed(() =>
    this.mode() === 'group'
      ? (this.selectedGroup()?.name ?? 'Group conversation')
      : (this.selectedContact()?.name ?? 'Personal conversation')
  );

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    this.chat.send({
      senderId: this.currentUserId(),
      recipientId: null,
      groupId: null,
      companyId: this.currentCompanyId(),
      messageType: 'USER_STATUS',
      content: 'AWAY',
      isRead: false
    });
  }

  private lastConnectedUserId: number | null = null;
  private lastConnectedCompanyId: number | null = null;

  constructor() {
    this.refreshSummaries();
    // Persistent connection
    effect(() => {
      const user = this.auth.user();
      const companyId = this.currentCompanyId();
      if (user && (user.id !== this.lastConnectedUserId || companyId !== this.lastConnectedCompanyId)) {
        this.lastConnectedUserId = user.id;
        this.lastConnectedCompanyId = companyId;
        this.chat.connect(user.id, companyId);
      }
    });

    effect(() => {
      if (this.chat.status() === 'connected') {
        this.chat.send({
          senderId: this.currentUserId(),
          recipientId: null,
          groupId: null,
          companyId: this.currentCompanyId(),
          messageType: 'USER_STATUS',
          content: 'ACTIVE',
          isRead: false
        });
      }
    });

    effect(async () => {
      const summaries = this.chatSummariesState();
      const decrypted = await Promise.all(summaries.map(async (s) => {
        if (s.type === 'PRIVATE' && s.lastMessage?.startsWith('E2EE:') && this.myPrivateKey) {
          try {
            const parts = s.lastMessage.substring(5).split('|');
            const recipientCipher = parts[0];
            const senderCipher = parts[1];

            // In summaries, we could be the sender OR recipient of the last message.
            // If the last message was FROM the other person, we are the RECIPIENT.
            // Wait, summaries from backend don't explicitly say who sent the last message.
            // But we can try both ciphers with our private key.
            let plain = await this.crypto.decryptMessage(this.myPrivateKey, recipientCipher);
            if (plain.includes('[Decryption Failed]') && senderCipher) {
               plain = await this.crypto.decryptMessage(this.myPrivateKey, senderCipher);
            }

            if (!plain.includes('[Decryption Failed]')) {
               return { ...s, lastMessage: plain };
            }
          } catch (e) {
            return s;
          }
        }
        return s;
      }));
      this.decryptedSummaries.set(decrypted);
    });

    effect(async () => {
      const rawMessages = this.chat.messages();
      const decrypted = await Promise.all(rawMessages.map(async (msg) => {
        // Skip if not an E2EE text message (Must have E2EE: prefix AND the | separator)
        if (msg.groupId != null || msg.messageType !== 'TEXT' || !msg.content.startsWith('E2EE:') || !msg.content.includes('|')) {
          return msg;
        }

        // WhatsApp Deep Think: If we sent this message and it's already plain in our local state, keep it
        if (msg.senderId === this.currentUserId() && !msg.content.includes(':')) {
           return msg;
        }

        try {
          const payload = msg.content.substring(5);
          const parts = payload.split('|');
          const recipientCipher = parts[0];
          const senderCipher = parts.length > 1 ? parts[1] : null;

          if (!this.myPrivateKey) return { ...msg, content: '🔒 Waiting for encryption keys...' };

          let plain: string | null = null;

          if (msg.recipientId === this.currentUserId()) {
             plain = await this.crypto.decryptMessage(this.myPrivateKey, recipientCipher);
          } else if (msg.senderId === this.currentUserId() && senderCipher) {
             plain = await this.crypto.decryptMessage(this.myPrivateKey, senderCipher);
          }

          if (plain && !plain.includes('[Decryption Failed]')) {
             return { ...msg, content: plain };
          }
          
          return { ...msg, content: '🔒 This message is encrypted. You may need to log in on the device where it was sent.' };
        } catch (e) {
          return { ...msg, content: '🔒 [Decryption Error]' };
        }
      }));
      this.decryptedMessages.set(decrypted);
    });

    effect(() => {
      // Monitor live messages for typing indicators and sidebar updates
      const allMessages = this.chat.messages();
      if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];

        // Real-time Sidebar Update
        if (lastMessage.messageType !== 'TYPING' && lastMessage.messageType !== 'USER_STATUS') {
           this.updateSidebarWithLiveMessage(lastMessage);
        }

        if (lastMessage?.messageType === 'TYPING' && lastMessage.senderId !== this.currentUserId()) {
          const isFromContext = this.mode() === 'group'
            ? lastMessage.groupId === this.selectedGroup()?.id
            : lastMessage.senderId === this.selectedContact()?.id;

          if (isFromContext) {
            this.typingStatus.set('is typing...');
            setTimeout(() => this.typingStatus.set(null), 3000);
          }
        }
      }
    });
    effect(() => {
      // Trigger scroll when visible messages change
      this.visibleMessages();
      setTimeout(() => this.scrollToBottom(), 50);
    });
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  protected selectContact(contact: ConversationContact): void {
    this.mode.set('private');
    this.selectedContact.set(contact);
    this.chat.connect(this.currentUserId(), this.currentCompanyId()); // Ensure main pipe is open
    this.chatApi.loadPrivateThread(this.currentUserId(), contact.id).subscribe((messages) => {
      this.chat.replaceMessages(messages);
      this.chatApi.markThreadAsRead(this.currentUserId(), this.currentCompanyId(), contact.id).subscribe();
    });
  }

  protected selectGroup(group: ConversationGroup): void {
    this.mode.set('group');
    this.selectedGroup.set(group);
    this.chat.connect(this.currentUserId(), this.currentCompanyId()); // Ensure main pipe is open
    this.chat.subscribeToGroup(group.id, this.currentCompanyId()); // Dynamic group pipe
    this.chatApi.loadGroupThread(group.id).subscribe((messages) => {
      this.chat.replaceMessages(messages);
      this.chatApi.markThreadAsRead(this.currentUserId(), this.currentCompanyId(), undefined, group.id).subscribe();
    });
  }

  protected togglePinMessage(msg: ChatMessage): void {
     this.chatApi.pinMessage(msg.id!, !msg.isPinned).subscribe();
  }

  protected startEditMessage(msg: ChatMessage): void {
     this.editingMessage.set(msg);
     this.form.patchValue({ content: msg.content });
     // Focus
     setTimeout(() => {
        const input = document.querySelector('.message-form input') as HTMLInputElement;
        input?.focus();
     }, 50);
  }

  protected cancelEdit(): void {
     this.editingMessage.set(null);
     this.form.patchValue({ content: '' });
  }

  protected toggleFavorite(userId: number): void {
     this.favoriteIds.update(set => {
        const newSet = new Set(set);
        if (newSet.has(userId)) newSet.delete(userId);
        else newSet.add(userId);
        return newSet;
     });
  }

  protected toggleMuteConversation(): void {
    const preference = this.currentConversationPreferencePayload();
    if (!preference) {
      return;
    }

    this.chatApi.updateConversationPreference({
      ...preference,
      archived: preference.archived,
      muted: !preference.muted
    }).subscribe({
      next: () => {
        this.applyConversationPreference(preference.conversationType, preference.conversationId, {
          isMuted: !preference.muted
        });
        this.snack.open(!preference.muted ? 'Conversation muted' : 'Conversation unmuted', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Failed to update mute setting', 'OK', { duration: 2000 })
    });
  }

  protected toggleArchiveConversation(): void {
    const preference = this.currentConversationPreferencePayload();
    if (!preference) {
      return;
    }

    this.chatApi.updateConversationPreference({
      ...preference,
      archived: !preference.archived,
      muted: preference.muted
    }).subscribe({
      next: () => {
        this.applyConversationPreference(preference.conversationType, preference.conversationId, {
          isArchived: !preference.archived
        });
        this.snack.open(!preference.archived ? 'Conversation archived' : 'Conversation moved to inbox', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Failed to update archive setting', 'OK', { duration: 2000 })
    });
  }

  private currentConversationPreferencePayload(): {
    userId: number;
    companyId: number;
    conversationType: 'PRIVATE' | 'GROUP';
    conversationId: number;
    archived: boolean;
    muted: boolean;
  } | null {
    if (this.mode() === 'private') {
      const contact = this.selectedContact();
      if (!contact || contact.id === 0) {
        return null;
      }
      return {
        userId: this.currentUserId(),
        companyId: this.currentCompanyId(),
        conversationType: 'PRIVATE',
        conversationId: contact.id,
        archived: contact.isArchived ?? false,
        muted: contact.isMuted ?? false
      };
    }

    const group = this.selectedGroup();
    if (!group) {
      return null;
    }
    return {
      userId: this.currentUserId(),
      companyId: this.currentCompanyId(),
      conversationType: 'GROUP',
      conversationId: group.id,
      archived: group.isArchived ?? false,
      muted: group.isMuted ?? false
    };
  }

  private applyConversationPreference(
    conversationType: 'PRIVATE' | 'GROUP',
    conversationId: number,
    changes: { isMuted?: boolean; isArchived?: boolean }
  ): void {
    this.chatSummariesState.update((summaries) => summaries.map((summary) => {
      if (summary.type !== conversationType || summary.id !== conversationId) {
        return summary;
      }
      return {
        ...summary,
        muted: changes.isMuted ?? summary.muted,
        archived: changes.isArchived ?? summary.archived
      };
    }));

    if (conversationType === 'PRIVATE') {
      this.selectedContact.update((contact) => {
        if (!contact || contact.id !== conversationId) {
          return contact;
        }
        return {
          ...contact,
          isMuted: changes.isMuted ?? contact.isMuted,
          isArchived: changes.isArchived ?? contact.isArchived
        };
      });
      return;
    }

    this.selectedGroup.update((group) => {
      if (!group || group.id !== conversationId) {
        return group;
      }
      return {
        ...group,
        isMuted: changes.isMuted ?? group.isMuted,
        isArchived: changes.isArchived ?? group.isArchived
      };
    });
  }

  protected reactToMessage(msg: ChatMessage, emoji: string): void {
    if (!msg.id) {
      return;
    }

    this.chatApi.addReaction(msg.id, this.currentUserId(), this.currentCompanyId(), emoji).subscribe({
      next: (updatedMessage) => this.chat.upsertMessage(updatedMessage),
      error: () => this.snack.open('Failed to react to message', 'OK', { duration: 2000 })
    });
  }

  protected toggleReaction(msg: ChatMessage, emoji: string, reactedByCurrentUser: boolean): void {
    if (!msg.id) {
      return;
    }

    const request = reactedByCurrentUser
      ? this.chatApi.removeReaction(msg.id, this.currentUserId())
      : this.chatApi.addReaction(msg.id, this.currentUserId(), this.currentCompanyId(), emoji);

    request.subscribe({
      next: (updatedMessage) => this.chat.upsertMessage(updatedMessage),
      error: () => this.snack.open('Failed to update reaction', 'OK', { duration: 2000 })
    });
  }

  protected async send(): Promise<void> {
    if (this.form.invalid) return;

    const content = this.form.getRawValue().content ?? '';

    // Handle Edit Mode
    if (this.editingMessage()) {
       this.chatApi.editMessage(this.editingMessage()!.id!, content, this.currentUserId()).subscribe({
          next: () => {
             this.editingMessage.set(null);
             this.form.patchValue({ content: '' });
             this.snack.open('Message edited', 'OK', { duration: 2000 });
          }
       });
       return;
    }

    let finalContent = content;
    
    // 1. Optimistic UI Update (WhatsApp Style)
    const clientMsgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    const optimisticMsg: ChatMessage = {
      clientMsgId,
      senderId: this.currentUserId(),
      recipientId: this.mode() === 'private' ? this.selectedContact()?.id ?? null : null,
      groupId: this.mode() === 'group' ? this.selectedGroup()?.id ?? null : null,
      companyId: this.currentCompanyId(),
      messageType: 'TEXT',
      content: content, // Show plaintext immediately to me
      isRead: false,
      timestamp: new Date().toISOString()
    };
    this.chat.addOptimisticMessage(optimisticMsg);

    // 2. Encryption logic
    if (this.mode() === 'private' && this.selectedContact() && this.selectedContact()!.id !== 0) {
      const peerId = this.selectedContact()!.id;
      console.log(`[E2EE] Attempting to encrypt for Peer ID: ${peerId}`);

      try {
         const resp = await this.chatApi.getPublicKey(peerId).toPromise();
         if (resp && resp.publicKey) {
            console.log(`[E2EE] Fetched public key for Peer ${peerId}. Length: ${resp.publicKey.length}`);
            const recipientPubKey = await this.crypto.importPublicKey(resp.publicKey);

            // Encrypt for recipient
            const recipientCipher = await this.crypto.encryptMessage(recipientPubKey, content);
            
            // Encrypt for self (so we can read our own message history)
            let selfCipher = '';
            if (this.myPublicKey) {
               selfCipher = await this.crypto.encryptMessage(this.myPublicKey, content);
            }

            // ONLY IF BOTH WORK (or at least recipient)
            finalContent = `E2EE:${recipientCipher}|${selfCipher}`;
            console.log(`[E2EE] Message encrypted for Recipient ${peerId}`);
         } else {
            console.warn("Recipient has no public key published. Sending as plaintext.");
         }
      } catch (err) {
         console.warn("E2EE encryption failed. Falling back to plaintext.", err);
      }
    }

    const msg: ChatMessage = {
      ...optimisticMsg,
      content: finalContent,
      replyToId: this.replyingTo()?.id,
      replyToContent: this.replyingTo()?.content
    };

    this.chat.send(msg);
    this.form.patchValue({ content: '' });
    this.replyingTo.set(null);
    
    // Silent sidebar refresh
    setTimeout(() => this.refreshSummaries(), 1000);
  }

  protected setTheme(t: string): void {
     const themes: Record<string, string> = {
        'default': 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        'dark': 'linear-gradient(rgba(11,20,26,0.9), rgba(11,20,26,0.9)), url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
        'blueprint': 'linear-gradient(rgba(37,99,235,0.8), rgba(30,58,138,0.8))',
        'nature': 'url("https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&q=80&w=1000")'
     };
     this.chatTheme.set(themes[t] || themes['default']);
  }

  protected async shareLocation(): Promise<void> {
     try {
        const coords = await this.location.getCurrentLocation();
        const mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
        
        const msg: ChatMessage = {
           senderId: this.currentUserId(),
           recipientId: this.selectedContact()?.id ?? null,
           groupId: this.selectedGroup()?.id ?? null,
           companyId: this.currentCompanyId(),
           messageType: 'LOCATION',
           content: 'Shared a location',
           fileUrl: mapsUrl,
           isRead: false,
           timestamp: new Date().toISOString()
        };
        this.chat.send(msg);
        this.snack.open('Location shared!', 'OK', { duration: 2000 });
     } catch (err) {
        this.snack.open('Could not get location. Ensure permissions are granted.', 'OK', { duration: 3000 });
     }
  }

  protected getMapPreview(url: string): string {
     return 'https://via.placeholder.com/300x200?text=Map+Location';
  }

  protected openMap(url: string): void {
     window.open(url, '_blank');
  }

  protected toggleBlockUser(): void {
     const peerId = this.selectedContact()?.id;
     if (!peerId) return;

     if (this.isPeerBlocked()) {
        this.blockedUsers.update(set => {
           const newSet = new Set(set);
           newSet.delete(peerId);
           return newSet;
        });
        this.snack.open('User unblocked', 'OK', { duration: 2000 });
     } else {
        this.blockedUsers.update(set => {
           const newSet = new Set(set);
           newSet.add(peerId);
           return newSet;
        });
        this.snack.open('User blocked', 'OK', { duration: 2000 });
     }
  }

  protected triggerImageUpload(): void {
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = 'image/*';
     input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
           const reader = new FileReader();
           reader.readAsDataURL(file);
           reader.onload = () => {
              this.chat.send({
                 senderId: this.currentUserId(),
                 recipientId: this.selectedContact()?.id ?? null,
                 groupId: this.selectedGroup()?.id ?? null,
                 companyId: this.currentCompanyId(),
                 messageType: 'IMAGE',
                 content: file.name,
                 fileUrl: reader.result as string,
                 isRead: false
              });
           };
        }
     };
     input.click();
  }

  protected clearChat(): void {
     if (confirm('Are you sure you want to clear this chat? This is local only.')) {
        this.chat.replaceMessages([]);
     }
  }

  protected async stopAndSendVoice(): Promise<void> {
    const audioBase64 = await this.recorder.stopRecording();
    if (!audioBase64) return;

    let finalFileUrl = audioBase64;
    
    if (this.mode() === 'private' && this.selectedContact() && this.selectedContact()!.id !== 0) {
       try {
          const resp = await this.chatApi.getPublicKey(this.selectedContact()!.id).toPromise();
          if (resp && resp.publicKey) {
             const recipientPubKey = await this.crypto.importPublicKey(resp.publicKey);
             const encrypted = await this.crypto.encryptMessage(recipientPubKey, audioBase64);
             finalFileUrl = `E2EE:${encrypted}`; 
          }
       } catch (err) {
          console.warn('Voice encryption failed, sending raw.', err);
       }
    }

    const msg: ChatMessage = {
      senderId: this.currentUserId(),
      recipientId: this.mode() === 'private' ? this.selectedContact()?.id ?? null : null,
      groupId: this.mode() === 'group' ? this.selectedGroup()?.id ?? null : null,
      companyId: this.currentCompanyId(),
      messageType: 'AUDIO',
      content: 'Voice message',
      fileUrl: finalFileUrl,
      isRead: false,
      timestamp: new Date().toISOString()
    };

    this.chat.send(msg);
    this.snack.open('Voice message sent!', 'OK', { duration: 2000 });
    setTimeout(() => this.refreshSummaries(), 1000);
  }

  protected refreshSummaries(): void {
    this.chatApi.loadChatSummaries(this.currentUserId(), this.currentCompanyId()).subscribe((data) => {
         this.chatSummariesState.set(data);
      });
  }

  protected refreshStatuses(): void {
    this.chatApi.loadStatuses(this.currentCompanyId(), this.currentUserId()).subscribe({
      next: (stories) => this.statusStoriesState.set(stories),
      error: () => this.statusStoriesState.set([])
    });
  }

  private updateSidebarWithLiveMessage(msg: ChatMessage): void {
    const peerId = msg.senderId === this.currentUserId() ? msg.recipientId : msg.senderId;
    const isGroup = msg.groupId != null;
    const targetId = isGroup ? msg.groupId : peerId;

    this.chatSummariesState.update(summaries => {
      let found = false;
      const updated = summaries.map(s => {
        const match = isGroup ? (s.type === 'GROUP' && s.id === targetId) : (s.type === 'PRIVATE' && s.id === targetId);
        if (match) {
          found = true;
          return {
            ...s,
            lastMessage: msg.content,
            lastMessageTimestamp: msg.timestamp || new Date().toISOString(),
            unreadCount: (msg.senderId !== this.currentUserId() && (!this.selectedContact() || this.selectedContact()?.id !== peerId)) ? (s.unreadCount + 1) : s.unreadCount
          };
        }
        return s;
      });

      if (!found) {
         // If sender is not in sidebar, we should probably refresh the whole sidebar to get their profile
         setTimeout(() => this.refreshSummaries(), 500);
         return summaries;
      }

      return [...updated].sort((a, b) => {
         const timeA = new Date(a.lastMessageTimestamp || 0).getTime();
         const timeB = new Date(b.lastMessageTimestamp || 0).getTime();
         return timeB - timeA;
      });
    });
  }

  protected onType(): void {
    this.chat.send({
      senderId: this.currentUserId(),
      recipientId: this.mode() === 'private' ? this.selectedContact()?.id ?? null : null,
      groupId: this.mode() === 'group' ? this.selectedGroup()?.id ?? null : null,
      companyId: this.currentCompanyId(),
      messageType: 'TYPING',
      content: '...',
      isRead: false
    });
  }

  protected addEmoji(emoji: string): void {
    const current = this.form.get('content')?.value || '';
    this.form.patchValue({ content: current + emoji });
    this.showEmojiPicker.set(false);
  }

  protected openMedia(url: string): void {
    window.open(url, '_blank');
  }

  protected triggerFileUpload(): void {
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx';
     input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
           const reader = new FileReader();
           reader.readAsDataURL(file);
           reader.onload = () => {
              let type = 'DOCUMENT';
              if (file.type.startsWith('image/')) type = 'IMAGE';
              else if (file.type.startsWith('video/')) type = 'VIDEO';
              else if (file.type.startsWith('audio/')) type = 'AUDIO';

              this.snack.open(`Sending ${file.name}...`, 'OK', { duration: 2000 });
              this.chat.send({
                 senderId: this.currentUserId(),
                 recipientId: this.mode() === 'private' ? this.selectedContact()?.id ?? null : null,
                 groupId: this.mode() === 'group' ? this.selectedGroup()?.id ?? null : null,
                 companyId: this.currentCompanyId(),
                 messageType: type,
                 content: file.name,
                 fileUrl: reader.result as string, 
                 isRead: false
              });
           };
        }
     };
     input.click();
  }
}
