import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OpsCenterService } from '../../core/services/ops-center.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-ops-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatProgressSpinnerModule],
  template: `
    <div class="module-page active-page fade-up">
      <div class="filter-action-row">
        <div>
          <h2 style="margin:0;">Ops Command Center</h2>
          <p style="margin:0;color:var(--txt-muted);font-size:0.8rem;">
            Live floor state · updated {{ snapshot()?.loadedAt | date:'shortTime' }} · socket {{ socket.status() }}
          </p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="refresh()" [disabled]="loading()">
          <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem;">refresh</mat-icon>
          {{ loading() ? 'Syncing…' : 'Refresh now' }}
        </button>
      </div>

      @if (loading() && !snapshot()) {
        <div style="padding:4rem;text-align:center;"><mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner></div>
      } @else {
        @if (snapshot()?.errors?.length) {
          <div class="ui-card" role="alert" style="border-left:4px solid var(--warning);margin-bottom:1rem;">
            <strong>Partial data — unavailable: {{ snapshot()!.errors.join(', ') }}.</strong>
            <span style="color:var(--txt-muted);font-size:0.8rem;"> Values marked — are unknown, not zero.</span>
          </div>
        }
        <div class="ops-stats">
          <div class="ui-card ops-stat"><span class="ops-stat-label">Clocked in</span><strong>{{ snapshot()?.clockedIn ?? '—' }}</strong></div>
          <div class="ui-card ops-stat"><span class="ops-stat-label">Pending approvals</span><strong>{{ pendingCount() }}</strong></div>
          <div class="ui-card ops-stat"><span class="ops-stat-label">Shifts today</span><strong>{{ snapshot()?.todayShifts?.length ?? '—' }}</strong></div>
          <div class="ui-card ops-stat"><span class="ops-stat-label">Overtime (7d hrs)</span><strong>{{ snapshot()?.overtimeHours ?? '—' }}</strong></div>
          <div class="ui-card ops-stat"><span class="ops-stat-label">Break violations</span><strong>{{ snapshot()?.breakViolations ?? '—' }}</strong></div>
        </div>

        @if (alerts().length) {
          <div class="ui-card ops-alerts">
            <div class="ui-card-header"><h3>Live alerts</h3><span class="ui-badge ui-badge-warning">Auto</span></div>
            @for (a of alerts(); track a.title) {
              <div class="ops-event">
                <mat-icon>{{ a.icon }}</mat-icon>
                <div><strong>{{ a.title }}</strong><br><small>{{ a.detail }}</small></div>
              </div>
            }
          </div>
        }

        <div class="ops-grid">
          <div class="ui-card">
            <div class="ui-card-header"><h3>Pending leave approvals</h3><span class="ui-badge">{{ pendingCount() }} queued</span></div>
            @if (!pendingCount()) {
              @if (snapshot()?.errors?.includes('pending-leaves')) {
                <p style="color:var(--txt-muted);font-size:0.85rem;">Approval queue unavailable — could not load leave requests.</p>
              } @else {
                <p style="color:var(--txt-muted);font-size:0.85rem;">Inbox zero. Nothing awaiting decision.</p>
              }
            } @else {
              <table class="ui-table">
                <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th></th></tr>
                @for (r of snapshot()!.pendingLeaves; track r.id) {
                  <tr>
                    <td>{{ r.employeeName || r.employeeId }}</td>
                    <td>{{ r.leaveType }}</td>
                    <td>{{ r.startDate | date:'shortDate' }}</td>
                    <td>{{ r.endDate | date:'shortDate' }}</td>
                    <td style="white-space:nowrap;">
                      <button class="ui-btn ui-btn-primary" (click)="decide(r.id, true)">Approve</button>
                      <button class="ui-btn" (click)="decide(r.id, false)">Reject</button>
                    </td>
                  </tr>
                }
              </table>
            }
          </div>

          <div class="ui-card">
            <div class="ui-card-header"><h3>Shift coverage today</h3><span class="ui-badge">{{ snapshot()?.todayShifts?.length ?? 0 }} shifts</span></div>
            @for (s of coverage(); track s.label) {
              <div class="ops-event"><mat-icon>schedule</mat-icon><div><strong>{{ s.label }}</strong><br><small>{{ s.detail }}</small></div></div>
            }
          </div>

          <div class="ui-card">
            <div class="ui-card-header"><h3>Live events</h3><span class="ui-badge ui-badge-success">WS</span></div>
            @if (!socket.events().length) {
              <p style="color:var(--txt-muted);font-size:0.85rem;">Waiting for widget events… clock someone in to see the wall react.</p>
            }
            @for (e of socket.events().slice(0, 8); track e.receivedAt) {
              <div class="ops-event"><mat-icon>bolt</mat-icon><div><strong>{{ e.topic }}</strong><br><small>{{ e.receivedAt | date:'shortTime' }}</small></div></div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ops-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
    .ops-stat { padding: 1.25rem; text-align: center; }
    .ops-stat-label { display: block; font-size: 0.7rem; text-transform: uppercase; color: var(--txt-muted); margin-bottom: 0.5rem; }
    .ops-stat strong { font-size: 2rem; }
    .ops-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; }
    @media (max-width: 900px) { .ops-grid { grid-template-columns: 1fr; } }
    .ops-event { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.6rem 0; border-bottom: 1px solid var(--border); font-size: 0.8rem; }
    .ops-alerts { border-left: 4px solid var(--warning); margin-bottom: 1rem; }
    .ui-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    .ui-table th, .ui-table td { padding: 0.7rem; border-bottom: 1px solid var(--border); text-align: left; }
  `]
})
export class OpsPageComponent implements OnInit, OnDestroy {
  private readonly ops = inject(OpsCenterService);
  protected readonly socket = inject(WidgetSocketService);
  private readonly snack = inject(MatSnackBar);

  protected readonly snapshot = signal<import('../../core/services/ops-center.service').OpsSnapshot | null>(null);
  protected readonly loading = signal(false);
  protected readonly pendingCount = computed(() => this.snapshot()?.pendingLeaves?.length ?? 0);

  /** Demo-grade alert rules: queue depth, overtime load, break integrity. */
  protected readonly alerts = computed(() => {
    const snap = this.snapshot();
    if (!snap) return [];
    const failed = new Set(snap.errors ?? []);
    const out: { title: string; detail: string; icon: string }[] = [];
    if ((snap.pendingLeaves?.length ?? 0) >= 5) {
      out.push({ title: 'Approval queue backing up', detail: `${snap.pendingLeaves.length} leaves awaiting decision`, icon: 'pending_actions' });
    }
    if ((snap.overtimeHours ?? 0) > 40) {
      out.push({ title: 'Overtime running hot', detail: `${snap.overtimeHours} hrs in 7 days — consider rebalancing`, icon: 'local_fire_department' });
    }
    if ((snap.breakViolations ?? 0) > 0) {
      out.push({ title: 'Meal-break exposure', detail: `${snap.breakViolations} violation(s) today — penalty risk`, icon: 'gavel' });
    }
    // Only flag an empty floor when the clocked-in source actually loaded —
    // a failed source reports null (unknown), never 0.
    if (!failed.has('clocked-in') && (snap.clockedIn ?? 0) === 0) {
      out.push({ title: 'Floor looks empty', detail: 'Nobody clocked in — verify shifts published', icon: 'person_off' });
    }
    return out;
  });

  protected readonly coverage = computed(() => {
    const shifts = this.snapshot()?.todayShifts ?? [];
    if (!shifts.length) {
      const failed = this.snapshot()?.errors?.includes('shifts');
      return [{ label: failed ? 'Shift data unavailable' : 'No shifts today', detail: failed ? 'Could not load shifts — retry shortly' : 'Publish from Scheduling' }];
    }
    const byStatus = new Map<string, number>();
    for (const s of shifts) byStatus.set(String((s as any).status ?? 'UNKNOWN'), (byStatus.get(String((s as any).status ?? 'UNKNOWN')) ?? 0) + 1);
    return [...byStatus.entries()].map(([label, n]) => ({ label: `${label} — ${n}`, detail: `${shifts.length} total on floor` }));
  });

  private timer?: ReturnType<typeof setInterval>;
  private lastEventSeen = 0;

  constructor() {
    // Live wall: any widget event (clock-in, leave, schedule) triggers a
    // silent re-sync so the demo reacts without manual refresh.
    effect(() => {
      const n = this.socket.events().length;
      if (n > this.lastEventSeen) {
        this.lastEventSeen = n;
        this.refresh(true);
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.socket.connect();
    this.refresh();
    this.timer = setInterval(() => this.refresh(true), 30000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  refresh(silent = false): void {
    if (!silent) this.loading.set(true);
    this.ops.loadSnapshot().subscribe({
      next: (snap) => {
        this.snapshot.set(snap);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.snack.open(backendErrorMessage(err, 'Ops sync failed.'), 'Retry', { duration: 4000 });
      }
    });
  }

  decide(id: number, approved: boolean): void {
    this.ops.decideLeave(id, approved).subscribe({
      next: () => {
        this.snack.open(approved ? 'Leave approved.' : 'Leave rejected.', 'OK', { duration: 3000 });
        this.refresh(true);
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Decision failed.'), 'Dismiss', { duration: 5000 })
    });
  }
}
