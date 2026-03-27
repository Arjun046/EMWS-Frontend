import { JsonPipe, CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DashboardService } from '../../core/services/dashboard.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatCardComponent } from '../../shared/components/stat-card.component';
import { WhoIsInComponent } from './components/who-is-in.component';
import { ManagerOnboardingComponent } from './components/manager-onboarding.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule, 
    JsonPipe, 
    MatButtonModule, 
    MatCardModule, 
    MatIconModule, 
    MatSnackBarModule, 
    PageHeaderComponent, 
    StatCardComponent, 
    WhoIsInComponent,
    ManagerOnboardingComponent,
    RouterLink,
    DatePipe
  ],
  template: `
    <app-page-header 
      [title]="isAdminOrManager() ? 'Operations Command' : 'My Workspace'" 
      [subtitle]="isAdminOrManager() ? 'Real-time workforce health, live exceptions, and operational telemetry.' : 'Your daily summary, shift schedule, and self-service tools.'" 
      actionLabel="Launch Workflow" 
    />
    
    <!-- Employee Quick Clock (Always visible for speed) -->
    <section class="attendance-actions mb-6">
      <mat-card class="p-6 overflow-hidden relative">
        <div class="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div class="flex items-center gap-4">
            <div class="avatar-large">{{ auth.user()?.avatar || 'A' }}</div>
            <div>
              <h2 class="text-2xl font-black mb-1">Welcome, {{ auth.user()?.name }}</h2>
              <div class="flex items-center gap-2">
                <span class="status-indicator" [class]="currentStatus().toLowerCase() || 'clocked_out'"></span>
                <p class="text-slate-500 m-0 font-medium">Currently: <span class="font-bold text-slate-900">{{ getStatusLabel() }}</span></p>
                <p class="text-slate-400 m-0 text-xs font-mono" *ngIf="currentStatus() === 'CLOCKED_IN'">
                  Duration: {{ getLiveDuration() }}
                </p>
              </div>
            </div>
          </div>
          <div class="flex gap-3 w-full md:w-auto">
            <button mat-stroked-button class="hero-btn md:hidden" routerLink="/attendance/mobile-clock">
              <mat-icon>fullscreen</mat-icon> MOBILE MODE
            </button>
            @if (currentStatus() === 'CLOCKED_OUT') {
              <button mat-flat-button color="primary" class="hero-btn clock-in-btn" (click)="clockIn()">
                <mat-icon>login</mat-icon> CLOCK IN NOW
              </button>
            } @else if (currentStatus() === 'CLOCKED_IN') {
              <button mat-stroked-button class="hero-btn" (click)="startBreak()">
                <mat-icon>coffee</mat-icon> BREAK
              </button>
              <button mat-flat-button color="warn" class="hero-btn" (click)="clockOut()">
                <mat-icon>logout</mat-icon> CLOCK OUT
              </button>
            } @else if (currentStatus() === 'ON_BREAK') {
              <button mat-flat-button color="primary" class="hero-btn" (click)="endBreak()">
                <mat-icon>play_arrow</mat-icon> END BREAK
              </button>
            }
          </div>
        </div>
        <div class="bg-decoration" [class]="currentStatus().toLowerCase() || 'clocked_out'"></div>
      </mat-card>
    </section>

    @if (isAdminOrManager()) {
      <!-- Manager/Admin View -->
      <section class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        @for (card of stats(); track card.label) {
          <app-stat-card [card]="card" />
        }
      </section>

      <div class="main-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 flex flex-col gap-6">
          <mat-card class="overflow-hidden">
            <div class="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 class="font-bold m-0 flex items-center gap-2">
                <mat-icon class="text-blue-600">sensors</mat-icon>
                Live Telemetry
              </h3>
              <div class="flex items-center gap-2">
                <span class="status-dot" [class.online]="socket.status() === 'connected'"></span>
                <span class="text-xs font-bold text-slate-500 uppercase">Socket: {{ socket.status() }}</span>
              </div>
            </div>
            <div class="p-0 max-h-[500px] overflow-y-auto">
              <div class="p-12 text-center" *ngIf="socket.events().length === 0">
                <mat-icon class="text-slate-300 text-6xl mb-4">settings_input_antenna</mat-icon>
                <h4 class="text-slate-400 font-bold">Waiting for live signals...</h4>
                <p class="text-slate-400 text-sm max-w-xs mx-auto">Connect the workforce services to see real-time pulses from the field.</p>
              </div>
              
              <div class="feed-list">
                @for (event of socket.events(); track $index) {
                  <div class="feed-item p-4 border-b flex gap-4 hover:bg-slate-50 transition-colors">
                    <div class="feed-icon bg-blue-100 text-blue-700 p-2 rounded-xl">
                      <mat-icon>bolt</mat-icon>
                    </div>
                    <div class="flex-1">
                      <div class="flex justify-between">
                        <strong class="text-sm uppercase tracking-wider text-blue-800">{{ event.topic.split('/').pop() }}</strong>
                        <span class="text-xs font-mono text-slate-400">{{ event.receivedAt | date:'HH:mm:ss' }}</span>
                      </div>
                      <pre class="text-xs bg-slate-900 text-blue-300 p-4 rounded-xl mt-2 overflow-auto max-h-48 border border-slate-800 shadow-inner">{{ event.payload | json }}</pre>
                    </div>
                  </div>
                }
              </div>
            </div>
          </mat-card>
        </div>

        <div class="side-column flex flex-col gap-6">
          <app-manager-onboarding *ngIf="isAdminOrManager()" />
          <app-who-is-in />

          <mat-card class="overflow-hidden">
            <div class="p-4 border-b bg-slate-50">
              <h3 class="font-bold m-0 flex items-center gap-2">
                <mat-icon class="text-blue-600">notifications_active</mat-icon>
                Operational Feed
              </h3>
            </div>
            <div class="p-4">
              <div class="flex flex-col gap-5">
                @for (alert of alerts(); track alert.title) {
                  <div class="alert-item flex gap-3">
                    <div class="w-1.5 h-auto bg-blue-500 rounded-full"></div>
                    <div class="flex-1">
                      <div class="text-[10px] uppercase font-bold text-slate-400 mb-0.5">{{ alert.time }}</div>
                      <strong class="text-sm block text-slate-900">{{ alert.title }}</strong>
                      <p class="text-xs text-slate-500 m-0 leading-relaxed mb-2">{{ alert.detail }}</p>
                      <button mat-button color="primary" class="text-[10px] uppercase font-bold p-0 h-auto min-h-0 min-w-0" (click)="resolveAlert(alert)">
                        Resolve Alert <mat-icon class="text-[12px] w-[12px] h-[12px]">chevron_right</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </mat-card>

          <mat-card class="overflow-hidden">
            <div class="p-4 border-b bg-slate-50">
              <h3 class="font-bold m-0">Quick Launch</h3>
            </div>
            <div class="p-2 flex flex-col gap-1">
              <button mat-button class="text-left py-3 rounded-lg" color="primary">
                <mat-icon class="mr-3">person_add</mat-icon> Onboard Employee
              </button>
              <button mat-button class="text-left py-3 rounded-lg" color="primary">
                <mat-icon class="mr-3">event_available</mat-icon> Leave Approvals
              </button>
              <button mat-button class="text-left py-3 rounded-lg" color="primary">
                <mat-icon class="mr-3">payments</mat-icon> Payroll Exceptions
              </button>
            </div>
          </mat-card>
        </div>
      </div>
    } @else {
      <!-- Employee Simple View -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <mat-card class="p-6">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <mat-icon class="text-blue-600">today</mat-icon> Today's Schedule
          </h3>
          <div class="empty-state py-12 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
            <mat-icon class="text-5xl mb-3">calendar_month</mat-icon>
            <p>No shifts scheduled for today.</p>
            <button mat-stroked-button class="mt-4" color="primary">View My Calendar</button>
          </div>
        </mat-card>

        <mat-card class="p-6">
          <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <mat-icon class="text-blue-600">beach_access</mat-icon> Time Off Balance
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div class="balance-item p-4 bg-blue-50 rounded-2xl border border-blue-100">
              <span class="block text-xs uppercase font-black text-blue-400 mb-1">Vacation</span>
              <strong class="text-2xl text-blue-900">12.5 Days</strong>
            </div>
            <div class="balance-item p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span class="block text-xs uppercase font-black text-emerald-400 mb-1">Sick Leave</span>
              <strong class="text-2xl text-emerald-900">5 Days</strong>
            </div>
          </div>
          <button mat-flat-button color="primary" class="w-full mt-6 py-2 rounded-xl" [routerLink]="'/leaves'">
            Request Time Off
          </button>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .avatar-large { width: 5rem; height: 5rem; border-radius: 1.5rem; background: #3b82f6; color: #fff; display: grid; place-items: center; font-size: 2rem; font-weight: 900; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.3); }
    .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; }
    .status-indicator.clocked_in { background: #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.5); }
    .status-indicator.on_break { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.5); }
    .status-indicator.clocked_out { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }

    .hero-btn { height: 3.5rem; padding: 0 2rem !important; border-radius: 1rem !important; font-weight: 800 !important; font-size: 1rem !important; letter-spacing: 0.05em !important; }
    .clock-in-btn { background: linear-gradient(135deg, #3b82f6, #2563eb) !important; }

    .bg-decoration { position: absolute; right: -5%; top: -50%; width: 300px; height: 300px; border-radius: 50%; filter: blur(60px); opacity: 0.1; z-index: 0; }
    .bg-decoration.clocked_in { background: #22c55e; }
    .bg-decoration.on_break { background: #f59e0b; }
    .bg-decoration.clocked_out { background: #3b82f6; }

    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
    .status-dot.online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
    
    .mb-6 { margin-bottom: 1.5rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .w-full { width: 100%; }
    
    @media (min-width: 768px) { 
      .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .md\\:flex-row { flex-direction: row; }
      .md\\:w-auto { width: auto; }
    }
    @media (min-width: 1024px) { 
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .lg\\:col-span-2 { grid-column: span 2 / span 2; }
    }
  `]
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly dashboardApi = inject(DashboardService);
  protected readonly socket = inject(WidgetSocketService);
  protected readonly attendanceApi = inject(AttendanceService);
  private readonly snack = inject(MatSnackBar);

  protected readonly stats = this.dashboardApi.stats;
  protected readonly alerts = this.dashboardApi.liveAlerts;
  
  protected readonly currentStatus = signal('CLOCKED_OUT');
  protected currentAttendance: Attendance | null = null;

  protected readonly liveTime = signal(Date.now());
  private timerHandle?: any;

  ngOnInit() {
    this.refreshStatus();
    this.timerHandle = setInterval(() => this.liveTime.set(Date.now()), 1000);
  }

  ngOnDestroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  protected getLiveDuration(): string {
    if (!this.currentAttendance?.clockIn) return '00:00:00';
    const start = new Date(this.currentAttendance.clockIn).getTime();
    const diff = Math.max(0, this.liveTime() - start);
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
  }

  protected resolveAlert(alert: any) {
    this.snack.open(`Alert "${alert.title}" marked as resolved.`, 'OK', { duration: 3000 });
  }

  protected isAdminOrManager(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  protected getStatusLabel(): string {
    switch (this.currentStatus()) {
      case 'CLOCKED_IN': return 'Clocked In';
      case 'ON_BREAK': return 'On Break';
      case 'CLOCKED_OUT': return 'Off Duty';
      default: return 'Unknown';
    }
  }

  private refreshStatus() {
    const user = this.auth.user();
    if (user) {
      this.attendanceApi.getAttendanceStatus(user.id).subscribe((status: string) => {
        this.currentStatus.set(status);
        this.attendanceApi.getTodayAttendance(user.id).subscribe((records: Attendance[]) => {
          this.currentAttendance = records.find((r: Attendance) => r.clockOut === null) || null;
        });
      });
    }
  }

  clockIn() {
    const user = this.auth.user();
    if (user) {
      this.attendanceApi.clockIn(user.id).subscribe(() => {
        this.snack.open('Successfully clocked in!', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  clockOut() {
    if (this.currentAttendance) {
      this.attendanceApi.clockOut(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Clocked out. Have a nice day!', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  startBreak() {
    if (this.currentAttendance) {
      this.attendanceApi.startBreak(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Break started', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  endBreak() {
    if (this.currentAttendance) {
      this.attendanceApi.endBreak(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Break ended. Welcome back!', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }
}
