import { JsonPipe, CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnInit } from '@angular/core';
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

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, JsonPipe, MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule, PageHeaderComponent, StatCardComponent, RouterLink],
  template: `
    <app-page-header title="Operations Dashboard" subtitle="A premium command view over workforce health, live exceptions, staffing pressure, and realtime events." actionLabel="Launch Workflow" />
    
    <!-- Attendance Quick Actions -->
    <section class="attendance-actions mb-6">
      <mat-card class="p-6">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="avatar-large">{{ auth.user()?.avatar || 'A' }}</div>
            <div>
              <h2 class="text-xl font-bold mb-1">Welcome back, {{ auth.user()?.name }}</h2>
              <p class="text-slate-500">Current Status: <span class="font-bold text-blue-600">{{ currentStatus() }}</span></p>
            </div>
          </div>
          <div class="flex gap-3">
            @if (currentStatus() === 'CLOCKED_OUT') {
              <button mat-flat-button color="primary" (click)="clockIn()">
                <mat-icon>login</mat-icon> Clock In
              </button>
            } @else if (currentStatus() === 'CLOCKED_IN') {
              <button mat-stroked-button (click)="startBreak()">
                <mat-icon>coffee</mat-icon> Start Break
              </button>
              <button mat-flat-button color="warn" (click)="clockOut()">
                <mat-icon>logout</mat-icon> Clock Out
              </button>
            } @else if (currentStatus() === 'ON_BREAK') {
              <button mat-flat-button color="primary" (click)="endBreak()">
                <mat-icon>play_arrow</mat-icon> End Break
              </button>
            }
          </div>
        </div>
      </mat-card>
    </section>

    <section class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      @for (card of stats(); track card.label) {
        <app-stat-card [card]="card" />
      }
    </section>

    <div class="main-grid grid grid-cols-1 lg:grid-cols-3 gap-6">
      <mat-card class="lg:col-span-2">
        <div class="p-4 border-b flex justify-between items-center">
          <h3 class="font-bold m-0">Live Operations</h3>
          <div class="flex items-center gap-2">
            <span class="status-dot" [class.online]="socket.status() === 'connected'"></span>
            <span class="text-xs font-bold text-slate-500 uppercase">Socket: {{ socket.status() }}</span>
          </div>
        </div>
        <div class="p-0">
          <div class="p-8 text-center" *ngIf="socket.events().length === 0">
            <mat-icon class="text-slate-300 text-5xl mb-4">sensors</mat-icon>
            <h4 class="text-slate-400">Waiting for live telemetry...</h4>
            <p class="text-slate-400 text-sm">Connect the backend services to see real-time pulses.</p>
          </div>
          
          <div class="feed-list">
            @for (event of socket.events(); track $index) {
              <div class="feed-item p-4 border-b flex gap-4 hover:bg-slate-50 transition-colors">
                <div class="feed-icon bg-blue-50 text-blue-600 p-2 rounded-lg">
                  <mat-icon>bolt</mat-icon>
                </div>
                <div class="flex-1">
                  <div class="flex justify-between">
                    <strong class="text-sm uppercase tracking-wider text-blue-700">{{ event.topic.split('/').pop() }}</strong>
                    <span class="text-xs text-slate-400">{{ event.receivedAt | date:'HH:mm:ss' }}</span>
                  </div>
                  <pre class="text-xs bg-slate-900 text-blue-300 p-3 rounded mt-2 overflow-auto max-h-32">{{ event.payload | json }}</pre>
                </div>
              </div>
            }
          </div>
        </div>
      </mat-card>

      <div class="side-column flex flex-col gap-6">
        <mat-card>
          <div class="p-4 border-b">
            <h3 class="font-bold m-0">Operational Feed</h3>
          </div>
          <div class="p-4">
            <div class="flex flex-col gap-4">
              @for (alert of alerts(); track alert.title) {
                <div class="alert-item flex gap-3">
                  <div class="w-1 bg-blue-500 rounded"></div>
                  <div>
                    <div class="text-xs text-slate-400 mb-1">{{ alert.time }}</div>
                    <strong class="text-sm block">{{ alert.title }}</strong>
                    <p class="text-xs text-slate-500 m-0">{{ alert.detail }}</p>
                  </div>
                </div>
              }
            </div>
          </div>
        </mat-card>

        <mat-card>
          <div class="p-4 border-b">
            <h3 class="font-bold m-0">Quick Actions</h3>
          </div>
          <div class="p-4 flex flex-col gap-2">
            <button mat-stroked-button class="text-left justify-start" color="primary">
              <mat-icon>person_add</mat-icon> Add employee
            </button>
            <button mat-stroked-button class="text-left justify-start" color="primary">
              <mat-icon>event_available</mat-icon> Review leave queue
            </button>
            <button mat-stroked-button class="text-left justify-start" color="primary">
              <mat-icon>payments</mat-icon> Open payroll exceptions
            </button>
            <button mat-stroked-button class="text-left justify-start" color="primary" [routerLink]="'/communication'">
              <mat-icon>forum</mat-icon> Open chat room
            </button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .avatar-large { width: 4rem; height: 4rem; border-radius: 1rem; background: #3b82f6; color: #fff; display: grid; place-items: center; font-size: 1.5rem; font-weight: 800; }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
    .status-dot.online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
    .mb-6 { margin-bottom: 1.5rem; }
    .flex { display: flex; }
    .items-center { align-items: center; }
    .justify-between { justify-content: space-between; }
    .justify-start { justify-content: flex-start; }
    .gap-4 { gap: 1rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-6 { gap: 1.5rem; }
    .grid { display: grid; }
    .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    @media (min-width: 768px) { .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (min-width: 1024px) { 
      .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .lg\\:col-span-2 { grid-column: span 2 / span 2; }
    }
  `]
})
export class DashboardPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly dashboardApi = inject(DashboardService);
  protected readonly socket = inject(WidgetSocketService);
  protected readonly attendanceApi = inject(AttendanceService);
  private readonly snack = inject(MatSnackBar);

  protected readonly stats = this.dashboardApi.stats;
  protected readonly alerts = this.dashboardApi.liveAlerts;
  
  protected readonly currentStatus = signal('CLOCKED_OUT');
  protected currentAttendance: Attendance | null = null;

  ngOnInit() {
    this.refreshStatus();
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
        this.snack.open('Clocked in successfully', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  clockOut() {
    if (this.currentAttendance) {
      this.attendanceApi.clockOut(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Clocked out successfully', 'OK', { duration: 3000 });
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
        this.snack.open('Break ended', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }
}
