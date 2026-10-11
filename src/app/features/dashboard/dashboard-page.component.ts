import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, of, catchError, finalize } from 'rxjs';
import { DashboardService } from '../../core/services/dashboard.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { AnnouncementService, Announcement } from '../../core/services/announcement.service';
import { TrendChartComponent } from '../../shared/components/trend-chart.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    DatePipe,
    TrendChartComponent
  ],
  template: `
    <div class="dashboard-viewport fade-up">

      @if (dashboardApi.loadErrors().length) {
        <div class="ui-card" role="alert" style="border-left:4px solid var(--warning);margin-bottom:1rem;">
          <strong>Some workforce data is unavailable ({{ dashboardApi.loadErrors().join(', ') }}).</strong>
          <span style="color:var(--txt-muted);font-size:0.8rem;"> Values marked — are unknown, not zero.</span>
        </div>
      }

      <!-- DASHBOARD HERO COMMAND HUB -->
      <div class="dash-hero-grid">
        <div class="dash-hero-l">
          <div class="status-indicator-tag">
            <div class="tag-pulse-dot" [class.active]="currentStatus() === 'CLOCKED_IN'" [class.break]="currentStatus() === 'ON_BREAK'"></div>      
            <span>{{ getStatusLabel() }}</span>
          </div>
          <h2 class="dash-hero-title">Good day. <span>Ready to work.</span></h2>
          <p class="dash-hero-sub">Clock in to start your shift. Your session, breaks, and attendance sync automatically.</p>
          <div class="dash-hero-actions">
            @if (currentStatus() === 'CLOCKED_OUT') {
               <button class="ui-btn ui-btn-primary" (click)="clockIn()">Start Shift</button>
            } @else {
               <button class="ui-btn ui-btn-danger" (click)="clockOut()">Finish Shift</button>
               <button class="ui-btn ui-btn-secondary" (click)="toggleBreak()">
                 <mat-icon style="font-size: 18px; width:18px; height:18px;">{{ currentStatus() === 'ON_BREAK' ? 'play_arrow' : 'coffee' }}</mat-icon>
                 {{ currentStatus() === 'ON_BREAK' ? 'Resume' : 'Break' }}
               </button>
            }
          </div>
        </div>
        <div class="dash-hero-r">
          <span class="shift-timer-label">Session Duration</span>
          <div class="shift-timer-value" id="dashboardTimerDisplay">{{ getShiftDuration() }}</div>
          <div class="shift-progress-track">
            <div class="shift-progress-fill" id="dashboardTimerProgress" [style.width]="getShiftProgress() + '%'"></div>
          </div>
        </div>
      </div>

      <!-- MAIN TELEMETRY CHART -->
      <div class="ui-card">
        <div class="ui-card-header">
          <h3>Today's Workforce Snapshot</h3>
          <span class="ui-badge ui-badge-success">Live</span>
        </div>
        @if (!hasTelemetry()) {
          @if (dashboardApi.loadErrors().length) {
            <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">Workforce data unavailable — could not load {{ dashboardApi.loadErrors().join(', ') }}.</div>
          } @else {
            <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No attendance activity yet today.</div>
          }
        } @else {
          <div style="height: 160px; width: 100%;">
             <app-trend-chart [data]="telemetry()" color="var(--primary)" />
          </div>
          <div style="display:flex; gap:1rem; flex-wrap:wrap; font-size:0.75rem; color:var(--txt-muted); padding: 0 0.25rem;">
            <span>Present: {{ telemetry()[0] }}</span>
            <span>Absent: {{ telemetry()[1] }}</span>
            <span>Late: {{ telemetry()[2] }}</span>
            <span>On leave: {{ telemetry()[3] }}</span>
          </div>
        }
      </div>

      <!-- KPI METRICS ROW -->
      <div class="dashboard-kpi-row">
        @if (isLoading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="ui-card kpi-card">
              <div class="shimmer" style="height: 12px; width: 40%; margin-bottom: 1rem;"></div>
              <div class="shimmer" style="height: 32px; width: 60%;"></div>
            </div>
          }
        } @else {
          @for (stat of dashboardApi.stats(); track stat.label) {
            <div class="ui-card kpi-card">
              <div class="kpi-meta-row">
                 <span class="kpi-metric-title">{{ stat.label }}</span>
                 <span class="ui-badge" [class.ui-badge-success]="stat.tone === 'good'" [class.ui-badge-warning]="stat.tone !== 'good'">
                   {{ stat.delta || 'Stable' }}
                 </span>
              </div>
              <div class="kpi-metric-value">{{ stat.value }}</div>
            </div>
          }
        }
      </div>

      <!-- BOTTOM SPLITS: FEED & NOTICES -->
      <div class="dashboard-splits mt-6">

        <!-- REALTIME OPS FEED -->
        <div class="ui-card glass" style="margin-bottom: 0;">
           <div class="ui-card-header">
              <h3>Operational Audit Feed</h3>
              <span class="ui-badge ui-badge-success">Realtime_Sync</span>
           </div>
           <div class="feed-container" id="dashboardMiniAuditLogs" style="display: flex; flex-direction: column; gap: 1rem;">
              @for (event of socket.events().slice(0, 5); track $index) {
                <div style="display: flex; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border);">
                   <div style="width: 36px; height: 36px; border-radius: 8px; background: var(--surface-2); display: grid; place-items: center; color: var(--txt-muted);">
                      <mat-icon style="font-size: 18px;">{{ getEventIcon(event.topic) }}</mat-icon>
                   </div>
                   <div style="flex: 1;">
                      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                         <strong style="font-size: 0.85rem; text-transform:uppercase;">{{ getEventTitle(event.topic) }}</strong>
                         <span class="text-mono" style="font-size: 0.7rem; color: var(--txt-muted);">{{ event.receivedAt | date:'h:mm a' }}</span>  
                      </div>
                      <p style="font-size: 0.78rem; color: var(--txt-secondary); margin: 0;">{{ getEventSummary(event.payload) }}</p>
                   </div>
                </div>
              }
              @if (socket.events().length === 0) {
                 <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.8rem;">No recent activity. New attendance and scheduling updates will appear here.</div>
              }
           </div>
        </div>

        <!-- SYSTEM NOTICES -->
        <div class="ui-card glass" style="margin-bottom: 0;">
           <div class="ui-card-header"><h3>System Notices</h3></div>
           <div style="display: flex; flex-direction: column; gap: 1rem;">
              @for (ann of announcements().slice(0, 3); track ann.id) {
                <div style="padding: 1rem; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--border);">
                   <span class="ui-badge ui-badge-warning" style="margin-bottom: 0.5rem; font-size: 0.6rem;">{{ ann.category }}</span>
                   <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.25rem;">{{ ann.title }}</div>
                   <p style="font-size: 0.75rem; color: var(--txt-secondary); line-height: 1.4; margin: 0;">{{ ann.content }}</p>
                </div>
              }
              @if (announcements().length === 0) {
                 <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.8rem;">No announcements right now.</div>
              }
           </div>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .dashboard-viewport { display: flex; flex-direction: column; }
    .mt-6 { margin-top: 1.5rem; }
    :host { display: block; }

    /* BIOMETRIC SCANNER ANIMATION */
    .biometric-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      backdrop-filter: blur(10px); color: var(--primary);
    }
    .scan-frame {
      width: 280px; height: 320px; border: 2px solid var(--primary); position: relative;
      border-radius: 40px; overflow: hidden; box-shadow: 0 0 40px var(--primary);
      background: rgba(47, 111, 235, 0.05);
    }
    .scan-line {
      position: absolute; width: 100%; height: 4px; background: var(--primary);
      box-shadow: 0 0 20px var(--primary); animation: scanMove 2.5s ease-in-out infinite;
    }
    @keyframes scanMove { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
  `]
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly dashboardApi = inject(DashboardService);
  protected readonly socket = inject(WidgetSocketService);
  protected readonly attendanceApi = inject(AttendanceService);
  protected readonly announcementApi = inject(AnnouncementService);
  private readonly snack = inject(MatSnackBar);

  protected readonly currentStatus = signal('CLOCKED_OUT');
  protected currentAttendance: Attendance | null = null;
  protected readonly announcements = signal<Announcement[]>([]);
  protected readonly liveTime = signal(Date.now());
  protected readonly isLoading = signal(true);
  protected readonly biometricScanning = signal(false);
  private timerHandle?: any;

  /** Real-data chart series derived from live DashboardService stats
   * (Present, Absent, Late, On Leave). No mock values. */
  protected readonly telemetry = computed(() => {
    const stats = this.dashboardApi.stats();
    const num = (label: string): number => {
      const found = stats.find((s) => s.label === label);
      const n = Number(found?.value);
      return Number.isFinite(n) ? n : 0;
    };
    return [num('Present Today'), num('Absent Today'), num('Late Arrivals'), num('On Leave')];
  });

  /** True when there is any activity to chart (template cannot use arrow fns). */
  protected readonly hasTelemetry = computed(() => this.telemetry().some((v) => v !== 0));

  constructor() {
    effect(() => {
      const events = this.socket.events();
      if (events.length > 0) {
        const latest = events[0];
        if (latest.topic.includes('attendance') || latest.topic.includes('scheduling')) {
          this.loadDashboardData();
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.timerHandle = setInterval(() => this.liveTime.set(Date.now()), 1000);
    this.loadDashboardData();
    this.socket.connect();
  }

  ngOnDestroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  private loadDashboardData() {
    const user = this.auth.user();
    if (!user) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    forkJoin({
      statusData: this.attendanceApi.getAttendanceStatus(user.id).pipe(catchError(() => of({status: 'CLOCKED_OUT'}))),
      todayRecords: this.attendanceApi.getTodayAttendance(user.id).pipe(catchError(() => of([]))),
      news: this.announcementApi.getAnnouncements().pipe(catchError(() => of([])))
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe((data) => {
      this.currentStatus.set(data.statusData.status);
      this.currentAttendance = data.todayRecords.find((r: Attendance) => r.clockOut === null) || null;
      this.announcements.set(data.news);
    });
  }

  protected getStatusLabel(): string {
    switch (this.currentStatus()) {
      case 'CLOCKED_IN': return 'Clocked in';
      case 'ON_BREAK': return 'On break';
      default: return 'Clocked out';
    }
  }

  protected getShiftDuration(): string {
    if (!this.currentAttendance || !this.currentAttendance.clockIn) return '00:00:00';
    const start = new Date(this.currentAttendance.clockIn).getTime();
    if (isNaN(start)) return '00:00:00';
    const diff = Math.max(0, this.liveTime() - start);
    const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  protected getShiftProgress(): number {
    if (!this.currentAttendance) return 0;
    const start = new Date(this.currentAttendance.clockIn).getTime();
    const elapsed = this.liveTime() - start;
    return Math.min(100, (elapsed / (8 * 3600000)) * 100);
  }

  protected getEventIcon(topic: string): string {
    if (topic.includes('attendance')) return 'timer';
    if (topic.includes('scheduling')) return 'calendar_today';
    if (topic.includes('login')) return 'lock_open';
    if (topic.includes('violation')) return 'warning';
    return 'sensors';
  }

  protected getEventTitle(topic: string): string {
    const parts = topic.split('/');
    const raw = parts[parts.length - 1].toUpperCase();
    return raw.replace('_', ' ');
  }

  protected getEventSummary(payload: any): string {
    if (typeof payload === 'string') return payload.replace('_', ' ');

    const type = payload.type || payload.action;
    const empId = payload.employeeId;

    switch (type) {
      case 'ATTENDANCE_CLOCKED_IN': return `Employee ${empId} clocked in.`;
      case 'ATTENDANCE_CLOCKED_OUT': return `Employee ${empId} clocked out.`;
      case 'ATTENDANCE_BREAK_START': return `Employee ${empId} started a break.`;
      case 'ATTENDANCE_BREAK_END': return `Employee ${empId} ended a break.`;
      case 'ATTENDANCE_MANUAL_NODE': return `Manual attendance entry recorded for employee ${empId}.`;
      case 'SHIFT_ASSIGNED': return `Shift assigned for employee ${empId}.`;
      default: return payload.desc || 'Update received.';
    }
  }

  clockIn() {
    const user = this.auth.user();
    if (!user) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.executeClockIn(user.id, pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          this.executeClockIn(user.id, 40.7128, -74.0060);
        },
        { timeout: 5000 }
      );
    } else {
      this.executeClockIn(user.id);
    }
  }

  private executeClockIn(userId: number, lat?: number, lng?: number) {
    this.attendanceApi.clockIn(userId, lat, lng).subscribe({
      next: (res) => {
        this.currentAttendance = res;
        this.currentStatus.set('CLOCKED_IN'); // INSTANT UI UPDATE
        this.snack.open('Clocked in. Have a good shift.', 'OK', { duration: 3000 });
        this.loadDashboardData();
      },
      error: (err) => {
        this.snack.open('Clock-in failed: ' + (err.error?.message || 'Please try again.'), 'Dismiss');
        this.isLoading.set(false);
      }
    });
  }

  clockOut() {
    if (!this.currentAttendance) return;

    if (confirm('End your current shift?')) {
      this.isLoading.set(true);
      this.attendanceApi.clockOut(this.currentAttendance.id).subscribe({
        next: () => {
          this.currentStatus.set('CLOCKED_OUT'); // INSTANT UI UPDATE
          this.currentAttendance = null;
          this.snack.open('Clocked out.', 'OK', { duration: 3000 });
          this.loadDashboardData();
        },
        error: () => {
          this.snack.open('Clock-out failed. Please try again.', 'Dismiss');
          this.isLoading.set(false);
        }
      });
    }
  }

  toggleBreak() {
    if (!this.currentAttendance) return;
    const isCurrentlyOnBreak = this.currentStatus() === 'ON_BREAK';
    const action = isCurrentlyOnBreak
      ? this.attendanceApi.endBreak(this.currentAttendance.id)
      : this.attendanceApi.startBreak(this.currentAttendance.id);

    this.isLoading.set(true);
    action.subscribe({
      next: (res) => {
        this.currentAttendance = res;
        this.currentStatus.set(isCurrentlyOnBreak ? 'CLOCKED_IN' : 'ON_BREAK'); // INSTANT UI UPDATE
        this.snack.open(isCurrentlyOnBreak ? 'Break ended.' : 'Break started.', 'OK');
        this.loadDashboardData();
      },
      error: () => {
        this.snack.open('Break update failed. Please try again.', 'Dismiss');
        this.isLoading.set(false);
      }
    });
  }
}
