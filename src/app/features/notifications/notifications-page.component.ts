import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { NotificationService, Notification } from '../../core/services/notification.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDividerModule, MatDialogModule, MatButtonToggleModule, PageHeaderComponent, DatePipe],
  template: `
    <app-page-header title="Enterprise Communications" subtitle="Unified inbox for system alerts, workforce emails, and automated onboarding logs." actionLabel="Refresh Hub" (action)="refresh()" />
    
    <section class="notification-grid">
      <div class="sidebar-controls">
        <mat-card class="summary-card">
          <p class="eyebrow">Total Volume</p>
          <h2>{{ allNotifications().length }}</h2>
          <p>Communications logged.</p>
          <div class="live-tag" *ngIf="socket.status() === 'connected'">
            <span class="pulse"></span> Live Feed Active
          </div>
        </mat-card>

        <mat-card class="filter-card mt-4">
          <h3>View Filter</h3>
          <mat-button-toggle-group [value]="filter()" (change)="filter.set($event.value)" vertical class="w-full">
            <mat-button-toggle value="ALL">
              <mat-icon>all_inbox</mat-icon> All Messages
            </mat-button-toggle>
            <mat-button-toggle value="EMAIL">
              <mat-icon>alternate_email</mat-icon> Sent Emails
            </mat-button-toggle>
            <mat-button-toggle value="SYSTEM">
              <mat-icon>settings_suggest</mat-icon> System Alerts
            </mat-button-toggle>
          </mat-button-toggle-group>
        </mat-card>
      </div>

      <mat-card class="feed-card">
        <div class="feed">
          @for (item of filteredNotifications(); track item.id) {
            <article class="inbox-item" [class.is-email]="item.type === 'EMAIL'" [class.unread]="item.status !== 'READ'">
              <div class="item-content">
                <div class="category-row">
                  <span class="type-tag" [class.email-tag]="item.type === 'EMAIL'">{{ item.type }}</span>
                  <span class="timestamp">{{ getSentAt(item) | date:'medium' }}</span>
                </div>
                <strong>{{ item.title || item.subject || 'System Notification' }}</strong>
                <p class="preview">{{ (item.message || item.content || '').slice(0, 120) }}...</p>
              </div>
              <div class="item-actions">
                <button mat-flat-button [color]="item.type === 'EMAIL' ? 'accent' : 'primary'" (click)="viewMail(item)">
                  {{ item.type === 'EMAIL' ? 'Open Email' : 'View Alert' }}
                </button>
              </div>
            </article>
          } @empty {
            <div class="empty-inbox">
              <mat-icon>mail_outline</mat-icon>
              <p>No messages found matching your criteria.</p>
            </div>
          }
        </div>
      </mat-card>
    </section>
  `,
  styles: [`
    .notification-grid { display: grid; grid-template-columns: 18rem 1fr; gap: 1.5rem; margin-top: 1.5rem; }
    .summary-card, .feed-card, .filter-card { border-radius: 1.4rem; border: 1px solid rgba(148, 163, 184, 0.16); box-shadow: 0 20px 55px rgba(15, 23, 42, 0.07); }
    .summary-card, .filter-card { padding: 1.5rem; height: fit-content; }
    .filter-card h3 { font-size: 0.9rem; font-weight: 700; margin-bottom: 1rem; color: #475569; }
    .eyebrow { margin: 0; color: var(--app-primary-600); font-size: 0.75rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800; }
    .summary-card h2 { margin: 0.5rem 0; font-size: 3rem; font-weight: 800; }
    
    .live-tag { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 700; color: #10b981; margin-top: 1rem; text-transform: uppercase; }
    .pulse { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; animation: pulse-green 2s infinite; }
    @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); } }

    .feed { display: grid; gap: 1rem; padding: 1rem; }
    .inbox-item { padding: 1.5rem; border-radius: 1rem; background: #fff; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
    .inbox-item:hover { border-color: #3b82f6; box-shadow: 0 10px 30px rgba(59, 130, 246, 0.08); }
    .inbox-item.is-email { background: #fafafa; border-left: 4px solid #f59e0b; }
    
    .item-content { flex: 1; }
    .category-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .type-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #3b82f6; background: #eff6ff; padding: 0.1rem 0.5rem; border-radius: 4px; }
    .type-tag.email-tag { color: #d97706; background: #fffbeb; }
    .timestamp { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
    .inbox-item strong { display: block; font-size: 1.05rem; color: #0f172a; margin-bottom: 0.4rem; }
    .preview { margin: 0; color: #64748b; font-size: 0.9rem; line-height: 1.4; }
    
    .empty-inbox { padding: 5rem; text-align: center; color: #94a3b8; }
    .empty-inbox mat-icon { font-size: 4rem; width: 4rem; height: 4rem; margin-bottom: 1rem; opacity: 0.5; }
    .w-full { width: 100%; }
    .mt-4 { margin-top: 1rem; }

    @media (max-width: 1100px) { .notification-grid { grid-template-columns: 1fr; } }
  `]
})
export class NotificationsPageComponent {
  private readonly notificationApi = inject(NotificationService);
  protected readonly socket = inject(WidgetSocketService);
  private readonly dialog = inject(MatDialog);

  private readonly historicalNotifications = toSignal(this.notificationApi.getAllNotifications(), { initialValue: [] });
  
  protected readonly allNotifications = computed(() => {
    const historical = this.historicalNotifications();
    const live = this.socket.events()
      .filter(e => e.topic === '/topic/inbox')
      .map(e => e.payload as Notification);
    
    const combined = [...live, ...historical];
    // Sort and de-duplicate by ID
    const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
    return unique.sort((a, b) => new Date(this.getSentAt(b)).getTime() - new Date(this.getSentAt(a)).getTime());
  });

  protected readonly filter = signal<'ALL' | 'EMAIL' | 'SYSTEM'>('ALL');

  protected readonly filteredNotifications = computed(() => {
    const list = this.allNotifications();
    const currentFilter = this.filter();
    if (currentFilter === 'ALL') return list;
    return list.filter(n => n.type === currentFilter);
  });

  constructor() {
    this.socket.connect();
  }

  protected getSentAt(item: any): string {
    return item.sentAt || item.createdAt || new Date().toISOString();
  }

  protected viewMail(notification: Notification): void {
    this.dialog.open(InboxDialog, {
      width: '600px',
      data: { notification }
    });
  }

  protected refresh(): void {
    window.location.reload();
  }
}

@Component({
  selector: 'app-inbox-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule, MatIconModule, DatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.notification.type === 'EMAIL' ? 'Sent Outbound Email' : 'System Alert' }}</h2>
    <mat-dialog-content>
      <div class="mail-header">
        <div class="mail-meta">
          <label>Subject</label>
          <h3>{{ data.notification.subject || data.notification.title }}</h3>
          <div class="meta-line">
            <span>Type: <strong>{{ data.notification.type }}</strong></span>
            <span class="dot">•</span>
            <span>Date: {{ (data.notification.sentAt || data.notification.createdAt) | date:'medium' }}</span>
          </div>
        </div>
      </div>
      
      <mat-divider class="my-4"></mat-divider>
      
      <div class="mail-body">
        <p class="content-text">{{ data.notification.content || data.notification.message }}</p>
      </div>

      <div class="action-box" *ngIf="isSignupLink(data.notification.content || data.notification.message)">
        <p class="action-title">Employee Verification Link</p>
        <p class="action-sub">Click below to simulate the employee clicking this link from their actual inbox.</p>
        <a [href]="getSignupLink(data.notification.content || data.notification.message)" mat-flat-button color="accent">
          <mat-icon>verified_user</mat-icon> Verify & Complete Setup
        </a>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .mail-header h3 { margin: 0.25rem 0 0.75rem; font-size: 1.4rem; color: #0f172a; }
    .mail-meta label { font-size: 0.7rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.05em; }
    .meta-line { font-size: 0.85rem; color: #64748b; display: flex; align-items: center; gap: 0.5rem; }
    .dot { font-size: 1.2rem; line-height: 1; }
    .my-4 { margin: 1.5rem 0; }
    .content-text { white-space: pre-wrap; line-height: 1.6; color: #334155; font-size: 1rem; background: #f8fafc; padding: 1rem; border-radius: 0.5rem; border: 1px solid #e2e8f0; }
    .action-box { margin-top: 2rem; padding: 1.5rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 1rem; text-align: center; }
    .action-title { margin: 0 0 0.25rem; font-weight: 800; color: #92400e; font-size: 1rem; }
    .action-sub { margin: 0 0 1.25rem; font-size: 0.85rem; color: #b45309; }
    [mat-flat-button] { border-radius: 0.75rem; font-weight: 700; }
  `]
})
export class InboxDialog {
  protected readonly dialogRef = inject(MatDialogRef<InboxDialog>);
  protected readonly data = inject<{ notification: any }>(MAT_DIALOG_DATA);

  protected isSignupLink(text: string): boolean {
    return (text || '').includes('http://localhost:4200/auth/signup');
  }

  protected getSignupLink(text: string): string {
    const match = (text || '').match(/http:\/\/localhost:4200\/auth\/signup\S+/);
    return match ? match[0] : '';
  }
}
