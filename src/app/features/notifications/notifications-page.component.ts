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
import { NotificationService, NotificationPreference, NOTIFICATION_CATEGORIES } from '../../core/services/notification.service';
import { LeaveService, LeaveStatus } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

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
      
      <!-- ════ HERO ════ -->
      <div class="directory-hero">
        <div class="hero-inner">
          <div>
            <div class="hero-title">Notifications</div>
            <div class="hero-sub">System alerts and updates for your work.</div>
          </div>
          <button class="btn btn-primary" (click)="onReadAll()" *ngIf="canMarkAllRead()">
            <mat-icon>done_all</mat-icon> Mark All Read
          </button>
        </div>
      </div>

      <!-- ════ SUMMARY STRIP ════ -->
      <div class="kpi-strip mt-6">
        <div class="kpi card">
          <div class="kpi-lab">Unread</div>
          <div class="kpi-val">{{ unreadCount() }}</div>
        </div>
        <div class="kpi card">
           <div class="kpi-lab">Categories</div>
           <div class="kpi-val">{{ channelCount() }}</div>
        </div>
      </div>

      <div class="notifications-layout mt-6">
        <!-- ════ CHANNEL FILTER ════ -->
        <div class="filter-col">
            <div class="card">
              <header class="card-head">
                 <div class="card-title">Filters</div>
              </header>
              <div class="p-4 flex-col gap-2">
                 <div class="nav-item" [class.active]="filter() === 'ALL'" (click)="filter.set('ALL')">
                    <mat-icon class="nav-icon">all_inbox</mat-icon> All
                 </div>
                 <div class="nav-item" [class.active]="filter() === 'SYSTEM'" (click)="filter.set('SYSTEM')">
                    <mat-icon class="nav-icon">settings_suggest</mat-icon> System
                 </div>
                 <div class="nav-item" [class.active]="filter() === 'EMAIL'" (click)="filter.set('EMAIL')">
                    <mat-icon class="nav-icon">alternate_email</mat-icon> Email
                 </div>
              </div>
            </div>

            <div class="card mt-6">
              <header class="card-head">
                 <div class="card-title">Delivery preferences</div>
              </header>
              <div class="p-4 flex-col gap-2">
                 @if (prefsLoading()) {
                    <p style="font-size:0.8rem;color:var(--txt-muted);">Loading preferences…</p>
                 } @else if (prefsError()) {
                    <p style="font-size:0.8rem;color:var(--txt-muted);">Preferences unavailable.
                       <button mat-button color="primary" (click)="loadPreferences()">Retry</button></p>
                 } @else {
                    @for (cat of categories; track cat) {
                       @for (p of prefs(); track p.category) {
                          @if (p.category === cat) {
                             <label class="pref-row">
                                <input type="checkbox" [checked]="p.inAppEnabled" (change)="togglePref(cat, $event)" />
                                <span>{{ cat }}</span>
                             </label>
                          }
                       }
                    }
                    <button mat-stroked-button color="primary" (click)="savePreferences()" [disabled]="prefsSaving()">
                       {{ prefsSaving() ? 'Saving…' : 'Save preferences' }}
                    </button>
                    <p style="font-size:0.72rem;color:var(--txt-muted);">Muted categories stay in the audit log but won't push or list.</p>
                 }
              </div>
            </div>
        </div>

        <!-- ════ NOTIFICATION FEED ════ -->
        <div class="feed-col">
            @if ((pendingLeaves() ?? 0) > 0) {
              <div class="card" role="alert" style="border-left:4px solid var(--warning);margin-bottom:1rem;">
                 <div class="p-4" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
                    <div><strong>{{ pendingLeaves() }} leave request(s) awaiting review.</strong>
                    <span style="font-size:0.8rem;color:var(--txt-muted);"> New requests also notify you here.</span></div>
                    <button mat-stroked-button color="primary" (click)="goToLeaves()">Review</button>
                 </div>
              </div>
            }
            @if (historyError()) {
              <div class="card" role="alert" style="border-left:4px solid var(--warning);margin-bottom:1rem;">
                 <div class="p-4" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;">
                    <div><strong>Notification history unavailable.</strong>
                    <span style="font-size:0.8rem;color:var(--txt-muted);"> Live alerts still arrive; history may be incomplete.</span></div>
                    <button mat-stroked-button color="primary" (click)="refresh()">Retry</button>
                 </div>
              </div>
            }
            <div class="card">
              <header class="card-head">
                 <div class="card-title">Activity</div>
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
                       <p class="mt-4 font-bold">You're all caught up.</p>
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
    .directory-hero::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg, var(--primary) 0%, #7c3aed 100%); }
    .hero-inner { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 2.5rem; }
    .hero-title { font-size: 1.1rem; font-weight: 700; color: var(--txt-main); }
    .hero-sub { font-size: .82rem; color: var(--txt-muted); margin-top: .2rem; }

    .btn { display: inline-flex; align-items: center; gap: .5rem; padding: .6rem 1.25rem; border-radius: var(--radius-sm); font-size: .82rem; font-weight: 600; cursor: pointer; border: none; transition: all .18s; }
    .btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(47,111,235,.15); }

    /* ════ KPI ════ */
    .kpi-strip { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 1.4rem 1.5rem; display: flex; flex-direction: column; gap: .5rem; }
    .kpi-lab { font-size: .75rem; font-weight: 600; color: var(--txt-muted); text-transform: uppercase; }
    .kpi-val { font-size: 1.9rem; font-weight: 800; color: var(--txt-main); line-height: 1; }

    /* ════ LAYOUT ════ */
    .notifications-layout { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden; }
    .card-head { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: var(--surface-2); }
    .card-title { font-size: .85rem; font-weight: 700; color: var(--txt-main); }
    .p-4 { padding: 1rem; }

    /* Filter Side */
    .nav-item { display: flex; align-items: center; gap: .6rem; padding: .55rem .75rem; border-radius: var(--radius-sm); font-size: .82rem; font-weight: 500; color: var(--txt-secondary); cursor: pointer; transition: all .15s; }
    .nav-item:hover { background: var(--surface-2); }
    .nav-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 600; }
    .nav-icon { width: 16px; height: 16px; display: grid; place-items: center; opacity: .7; }

    /* Feed List */
    .feed-list { min-height: 500px; }
    .activity-item { padding: 1.25rem 1.5rem; display: flex; align-items: flex-start; gap: 1rem; border-bottom: 1px solid var(--border); transition: background 0.15s; cursor: pointer; position: relative; }
    .activity-item:hover { background: var(--surface-2); }
    .activity-item.is-unread { background: rgba(47, 111, 235, 0.02); }
    
    .act-icon { width: 36px; height: 36px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; margin-top: .1rem; }
    .act-body { flex: 1; }
    .act-title { font-size: .9rem; font-weight: 700; color: var(--txt-main); line-height: 1.4; }
    .act-title span { color: var(--txt-muted); font-weight: 400; font-size: 0.85rem; }
    .act-meta { display: flex; align-items: center; gap: .5rem; margin-top: .35rem; }
    .act-type-badge { font-size: .62rem; font-weight: 700; padding: .15rem .55rem; border-radius: 99px; text-transform: uppercase; }
    .act-time { font-size: .7rem; color: var(--txt-muted); font-weight: 600; }

    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); position: absolute; top: 1.5rem; right: 1.5rem; }

    .empty-state { padding: 5rem; text-align: center; color: var(--txt-muted); }
    .icon-btn { width: 30px; height: 30px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: #fff; display: grid; place-items: center; cursor: pointer; color: var(--txt-muted); }
    .pref-row { display: flex; align-items: center; gap: .6rem; font-size: .8rem; font-weight: 700; padding: .35rem 0; cursor: pointer; }
    .pref-row input { width: 1rem; height: 1rem; accent-color: var(--primary); }
  `]
})
export class NotificationsPageComponent implements OnInit {
  private readonly hub = inject(NotificationCenterService);
  private readonly prefsApi = inject(NotificationService);
  private readonly leaveApi = inject(LeaveService);
  protected readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly categories = NOTIFICATION_CATEGORIES;
  protected readonly prefs = signal<NotificationPreference[]>([]);
  protected readonly prefsLoading = signal(false);
  protected readonly prefsSaving = signal(false);
  protected readonly prefsError = signal(false);
  protected readonly historyError = this.hub.historyError;
  /** Pending-approval nudge for approvers (null = not loaded/failed). */
  protected readonly pendingLeaves = signal<number | null>(null);

  protected readonly filter = signal<'ALL' | 'SYSTEM' | 'EMAIL'>('ALL');
  protected readonly notifications = this.hub.items;
  protected readonly unreadCount = this.hub.unreadCount;
  protected readonly channelCount = computed(
    () => new Set(this.notifications().map((n) => (n.category || 'Alert').toUpperCase())).size
  );

  protected readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    const f = this.filter();
    if (f === 'ALL') return list;
    return list.filter(n => (n.category || '').toUpperCase() === f || (f === 'SYSTEM' && n.category !== 'Email'));
  });

  ngOnInit() { this.refresh(); this.loadPreferences(); this.loadNudge(); }
  refresh() { this.hub.loadHistory(); }

  protected loadPreferences(): void {    this.prefsLoading.set(true);
    this.prefsError.set(false);
    this.prefsApi.getMyPreferences().subscribe({
      next: (prefs) => {
        this.prefs.set(prefs ?? []);
        this.prefsLoading.set(false);
      },
      error: () => {
        this.prefsLoading.set(false);
        this.prefsError.set(true);
      }
    });
  }

  protected togglePref(category: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.prefs.update((list) => list.map((p) => (p.category === category ? { ...p, inAppEnabled: checked } : p)));
  }

  protected savePreferences(): void {
    this.prefsSaving.set(true);
    this.prefsApi.savePreferences(this.prefs()).subscribe({
      next: (saved) => {
        this.prefs.set(saved ?? this.prefs());
        this.prefsSaving.set(false);
        this.snack.open('Notification preferences saved.', 'OK', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.prefsSaving.set(false);
        const msg = (err?.error as any)?.message ?? 'Could not save preferences.';
        this.snack.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  /** Approver nudge: pending leave count. Renders only on successful load. */
  private loadNudge(): void {
    if (!this.auth.hasAnyScope(['LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE'])) return;
    this.leaveApi.getAllCompanyRequests(LeaveStatus.PENDING, 500).subscribe({
      next: (reqs) => this.pendingLeaves.set((reqs ?? []).length),
      error: () => this.pendingLeaves.set(null)
    });
  }

  protected goToLeaves(): void {
    this.router.navigate(['/leaves']);
  }

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
     if (c.includes('payroll')) return 'var(--success-soft)';
     if (c.includes('leave')) return 'var(--warning-soft)';
     return 'var(--primary-soft)';
  }

  getIconColor(cat?: string): string {
     const c = (cat || '').toLowerCase();
     if (c.includes('payroll')) return 'var(--success)';
     if (c.includes('leave')) return 'var(--warning)';
     return 'var(--primary)';
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
    <h2 mat-dialog-title>{{ data.notification.type === 'EMAIL' ? 'Email Notification' : 'System Alert' }}</h2>
    <mat-dialog-content>
       <div class="mail-header p-2">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-widest">Subject</span>
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
