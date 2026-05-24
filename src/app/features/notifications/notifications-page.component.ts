import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationCenterService } from '../../core/services/notification-center.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule, 
    MatDialogModule, 
    MatButtonToggleModule, 
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: `
    <div class="notifications-viewport fade-up">
      
      <!-- ════ HERO: Same-to-Same ════ -->
      <div class="directory-hero">
        <div class="hero-inner">
          <div>
            <div class="hero-title">Intelligence & Alert Hub</div>
            <div class="hero-sub">Unified operational feed for system telemetry and workforce triggers.</div>
          </div>
          <button class="btn btn-primary" (click)="onReadAll()" *ngIf="canMarkAllRead()">
            <mat-icon>done_all</mat-icon> Mark All Read
          </button>
        </div>
      </div>

      <!-- ════ SUMMARY STRIP ════ -->
      <div class="kpi-strip mt-6">
        <div class="kpi card">
          <div class="kpi-lab">Unread Alerts</div>
          <div class="kpi-val">{{ unreadCount() }}</div>
        </div>
        <div class="kpi card">
           <div class="kpi-lab">Active Channels</div>
           <div class="kpi-val">3 Channels</div>
        </div>
      </div>

      <div class="notifications-layout mt-6">
        <!-- ════ CHANNEL FILTER ════ -->
        <div class="filter-col">
           <div class="card">
              <header class="card-head">
                 <div class="card-title">Channel Filter</div>
              </header>
              <div class="p-4 flex-col gap-2">
                 <div class="nav-item" [class.active]="filter() === 'ALL'" (click)="filter.set('ALL')">
                    <mat-icon class="nav-icon">all_inbox</mat-icon> Full Hub
                 </div>
                 <div class="nav-item" [class.active]="filter() === 'SYSTEM'" (click)="filter.set('SYSTEM')">
                    <mat-icon class="nav-icon">settings_suggest</mat-icon> Systems
                 </div>
                 <div class="nav-item" [class.active]="filter() === 'EMAIL'" (click)="filter.set('EMAIL')">
                    <mat-icon class="nav-icon">alternate_email</mat-icon> Outbound
                 </div>
              </div>
           </div>
        </div>

        <!-- ════ NOTIFICATION FEED ════ -->
        <div class="feed-col">
           <div class="card">
              <header class="card-head">
                 <div class="card-title">Operational Stream</div>
                 <button class="icon-btn" (click)="refresh()"><mat-icon>sync</mat-icon></button>
              </header>

              <div class="feed-list custom-scrollbar">
                 @for (item of filteredNotifications(); track item.id) {
                    <article class="activity-item" [class.is-unread]="!item.isRead" (click)="viewMail(item)">
                       <div class="act-icon" [style.background]="getIconBg(item.category)" [style.color]="getIconColor(item.category)">
                          <mat-icon>{{ getIcon(item.category || '') }}</mat-icon>
                       </div>
                       <div class="act-body">
                          <div class="act-title">{{ item.title }} <span>{{ item.content }}</span></div>
                          <div class="act-meta">
                             <span class="act-type-badge" [style.background]="getIconBg(item.category)" [style.color]="getIconColor(item.category)">
                                {{ item.category }}
                             </span>
                             <span class="act-time">{{ item.when }}</span>
                          </div>
                       </div>
                       @if (!item.isRead) {
                          <div class="unread-dot"></div>
                       }
                    </article>
                 } @empty {
                    <div class="empty-state">
                       <mat-icon class="text-light" style="font-size:3rem; width:3rem; height:3rem;">notifications_off</mat-icon>
                       <p class="mt-4 font-bold">Your intelligence feed is clear.</p>
                    </div>
                 }
              </div>
           </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .notifications-viewport { display: flex; flex-direction: column; }
    .mt-6 { margin-top: 1.5rem; } .mt-4 { margin-top: 1rem; }
    .flex-col { display: flex; flex-direction: column; } .gap-2 { gap: 0.5rem; }

    /* ════ HERO ════ */
    .directory-hero { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); overflow: hidden; position: relative; }
    .directory-hero::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, var(--blue) 0%, #7c3aed 100%); }
    .hero-inner { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2.5rem; }
    .hero-title { font-size: 1.1rem; font-weight: 700; color: var(--txt-1); }
    .hero-sub { font-size: .82rem; color: var(--txt-3); margin-top: .2rem; }

    .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; border-radius: var(--radius-sm); font-size: .82rem; font-weight: 600; cursor: pointer; border: none; transition: all .18s; }
    .btn-primary { background: var(--blue); color: #fff; box-shadow: 0 4px 12px rgba(47,111,235,.15); }

    /* ════ KPI ════ */
    .kpi-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.4rem 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
    .kpi-lab { font-size: .75rem; font-weight: 600; color: var(--txt-3); text-transform: uppercase; }
    .kpi-val { font-size: 1.9rem; font-weight: 800; color: var(--txt-1); line-height: 1; }

    /* ════ LAYOUT ════ */
    .notifications-layout { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
    .card-head { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--surface-2); }
    .card-title { font-size: .85rem; font-weight: 700; color: var(--txt-1); }
    .p-4 { padding: 1rem; }

    /* Filter Side */
    .nav-item { display: flex; align-items: center; gap: .6rem; padding: .55rem .75rem; border-radius: var(--radius-sm); font-size: .82rem; font-weight: 500; color: var(--txt-2); cursor: pointer; transition: all .15s; }
    .nav-item:hover { background: var(--surface-2); }
    .nav-item.active { background: var(--blue-soft); color: var(--blue); font-weight: 600; }
    .nav-icon { width: 16px; height: 16px; display: grid; place-items: center; opacity: .7; }

    /* Feed List */
    .feed-list { min-height: 500px; }
    .activity-item { padding: 1.25rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; border-bottom: 1px solid var(--border); transition: background 0.15s; cursor: pointer; position: relative; }
    .activity-item:hover { background: var(--surface-2); }
    .activity-item.is-unread { background: rgba(47, 111, 235, 0.02); }
    
    .act-icon { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; margin-top: .1rem; }
    .act-body { flex: 1; }
    .act-title { font-size: .9rem; font-weight: 700; color: var(--txt-1); line-height: 1.4; }
    .act-title span { color: var(--txt-3); font-weight: 400; font-size: 0.85rem; }
    .act-meta { display: flex; align-items: center; gap: .5rem; margin-top: .35rem; }
    .act-type-badge { font-size: .62rem; font-weight: 700; padding: .15rem .55rem; border-radius: 99px; text-transform: uppercase; }
    .act-time { font-size: .7rem; color: var(--txt-3); font-weight: 600; }

    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); position: absolute; top: 1.5rem; right: 1.5rem; }

    .empty-state { padding: 5rem; text-align: center; color: var(--txt-3); }
    .icon-btn { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; display: grid; place-items: center; cursor: pointer; color: var(--txt-3); }
  `]
})
export class NotificationsPageComponent implements OnInit {
  private readonly hub = inject(NotificationCenterService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);

  protected readonly filter = signal<'ALL' | 'SYSTEM' | 'EMAIL'>('ALL');
  protected readonly notifications = this.hub.items;
  protected readonly unreadCount = this.hub.unreadCount;

  protected readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    const f = this.filter();
    if (f === 'ALL') return list;
    return list.filter(n => (n.category || '').toUpperCase() === f || (f === 'SYSTEM' && n.category !== 'Email'));
  });

  ngOnInit() { this.refresh(); }
  refresh() { this.hub.loadHistory(); }

  onReadAll() { this.hub.markAllAsRead(); }
  markAsRead(item: any) { this.hub.markAsRead(item.id); }
  viewMail(item: any) { this.dialog.open(InboxDialog, { width: '600px', data: { notification: item } }); }

  getIcon(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes('payroll')) return 'payments';
    if (c.includes('leave')) return 'beach_access';
    if (c.includes('email')) return 'alternate_email';
    return 'notifications';
  }

  getIconBg(cat?: string): string {
     const c = (cat || '').toLowerCase();
     if (c.includes('payroll')) return 'var(--green-soft)';
     if (c.includes('leave')) return 'var(--amber-soft)';
     return 'var(--blue-soft)';
  }

  getIconColor(cat?: string): string {
     const c = (cat || '').toLowerCase();
     if (c.includes('payroll')) return 'var(--green)';
     if (c.includes('leave')) return 'var(--amber)';
     return 'var(--blue)';
  }

  protected canMarkAllRead(): boolean {
    return this.auth.hasAnyScope(['DASHBOARD_SELF_READ', 'DASHBOARD_OPS_READ']);
  }
}

@Component({
  selector: 'app-inbox-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule, MatIconModule, DatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.notification.type === 'EMAIL' ? 'Sent Outbound Email' : 'System Alert' }}</h2>
    <mat-dialog-content>
       <div class="mail-header p-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Packet Subject</span>
          <h3 class="m-0 mt-1 font-black">{{ data.notification.subject || data.notification.title }}</h3>
          <div class="mt-4 flex gap-4 text-xs font-bold text-slate-500">
             <span>TYPE: {{ data.notification.type || 'SYSTEM' }}</span>
             <span>DATE: {{ (data.notification.sentAt || data.notification.createdAt) | date:'medium' }}</span>
          </div>
       </div>
       <mat-divider style="margin: 1.5rem 0;"></mat-divider>
       <div class="mail-body p-4 bg-slate-50 border rounded-lg">
          <p style="white-space: pre-wrap; line-height: 1.6; margin: 0;">{{ data.notification.content || data.notification.message }}</p>
       </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `
})
export class InboxDialog {
  protected readonly dialogRef = inject(MatDialogRef<InboxDialog>);
  protected readonly data = inject<{ notification: any }>(MAT_DIALOG_DATA);
}
