import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-attendance-employee',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDividerModule,
    DatePipe,
    DecimalPipe
  ],
  template: `
    <div class="attendance-employee-container">
      <header class="employee-header">
        <h1>Workday Console</h1>
        <p class="date">{{ today | date:'fullDate' }}</p>
      </header>

      <!-- Status Indicator -->
      <div class="status-banner" [class.clocked-in]="status() === 'CLOCKED_IN'" [class.on-break]="status() === 'ON_BREAK'">
        <div class="status-icon">
          <mat-icon>{{ getStatusIcon() }}</mat-icon>
        </div>
        <div class="status-info">
          <span class="label">Current Status</span>
          <span class="value">{{ getStatusLabel() }}</span>
        </div>
        <div class="timer" *ngIf="status() !== 'CLOCKED_OUT'">
          {{ elapsedTime() }}
        </div>
      </div>

      <!-- Main Action -->
      <div class="main-action">
        @if (status() === 'CLOCKED_OUT') {
          <button class="clock-btn clock-in" (click)="clockIn()">
            <div class="btn-content">
              <mat-icon>login</mat-icon>
              <span>CLOCK IN</span>
            </div>
            <div class="btn-ripple"></div>
          </button>
        } @else if (status() === 'CLOCKED_IN') {
          <div class="action-grid">
            <button class="clock-btn break" (click)="startBreak()">
              <mat-icon>coffee</mat-icon>
              <span>BREAK</span>
            </button>
            <button class="clock-btn clock-out" (click)="clockOut()">
              <mat-icon>logout</mat-icon>
              <span>CLOCK OUT</span>
            </button>
          </div>
        } @else if (status() === 'ON_BREAK') {
          <button class="clock-btn end-break" (click)="endBreak()">
            <div class="btn-content">
              <mat-icon>play_arrow</mat-icon>
              <span>END BREAK</span>
            </div>
          </button>
        }
      </div>

      <!-- History / Details -->
      <mat-card class="details-card">
        <div class="details-header">
          <h3>Shift Summary</h3>
          <span class="total-hours" *ngIf="todayTotal() > 0">
            Total Today: <strong>{{ todayTotal() | number:'1.2-2' }}h</strong>
          </span>
        </div>
        <mat-divider></mat-divider>
        <div class="history-list">
          @if (todayRecords().length === 0) {
            <div class="empty-state">
              <mat-icon>event_busy</mat-icon>
              <p>No activity recorded yet today</p>
            </div>
          } @else {
            @for (record of todayRecords(); track record.id) {
              <div class="history-item">
                <div class="item-icon" [class.active]="!record.clockOut">
                  <mat-icon>{{ record.clockOut ? 'history' : 'timer' }}</mat-icon>
                </div>
                <div class="item-content">
                  <div class="item-time">
                    <span>{{ record.clockIn | date:'shortTime' }}</span>
                    <mat-icon>arrow_forward</mat-icon>
                    <span>{{ record.clockOut ? (record.clockOut | date:'shortTime') : 'Active' }}</span>
                  </div>
                  <div class="item-meta">
                    <span *ngIf="record.isLate" class="late-tag">Late Arrival</span>
                    <span *ngIf="record.totalHours" class="duration">{{ record.totalHours | number:'1.2-2' }}h total</span>
                  </div>
                </div>
              </div>
            }
          }
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .attendance-employee-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .employee-header {
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .employee-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 800;
      color: #0f172a;
    }

    .employee-header .date {
      margin: 0.25rem 0 0;
      color: #64748b;
      font-weight: 500;
    }

    .status-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: #f1f5f9;
      border-radius: 1.25rem;
      border: 1px solid #e2e8f0;
    }

    .status-banner.clocked-in {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }

    .status-banner.on-break {
      background: #fffbeb;
      border-color: #fef3c7;
      color: #92400e;
    }

    .status-icon {
      width: 3rem;
      height: 3rem;
      border-radius: 1rem;
      background: rgba(0,0,0,0.05);
      display: grid;
      place-items: center;
    }

    .status-icon mat-icon {
      font-size: 1.75rem;
      width: 1.75rem;
      height: 1.75rem;
    }

    .status-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .status-info .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 700;
      opacity: 0.7;
      letter-spacing: 0.05em;
    }

    .status-info .value {
      font-size: 1.25rem;
      font-weight: 800;
    }

    .timer {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .main-action {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
    }

    .clock-btn {
      border: none;
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .clock-btn:active {
      transform: scale(0.95);
    }

    .clock-in {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      box-shadow: 0 20px 25px -5px rgba(59, 130, 246, 0.4), 0 10px 10px -5px rgba(59, 130, 246, 0.2);
    }

    .clock-in:hover {
      background: #2563eb;
      box-shadow: 0 25px 30px -5px rgba(59, 130, 246, 0.5);
    }

    .clock-in mat-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
    }

    .clock-in span {
      font-size: 1.25rem;
      font-weight: 900;
      letter-spacing: 0.1em;
    }

    .action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      width: 100%;
    }

    .clock-btn.break, .clock-btn.clock-out, .clock-btn.end-break {
      padding: 2rem;
      border-radius: 1.5rem;
      font-weight: 800;
      font-size: 1.1rem;
    }

    .break { background: #f59e0b; color: white; }
    .clock-out { background: #ef4444; color: white; }
    .end-break { 
      width: 100%; 
      background: #3b82f6; 
      color: white; 
      flex-direction: row !important;
    }

    .end-break mat-icon { font-size: 2rem; width: 2rem; height: 2rem; }

    .details-card {
      border-radius: 1.5rem;
      border: 1px solid #e2e8f0;
      box-shadow: none !important;
      padding: 0;
    }

    .details-header {
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .details-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; }
    .total-hours { font-size: 0.9rem; color: #64748b; }

    .history-list {
      padding: 0.5rem;
    }

    .empty-state {
      padding: 3rem 1rem;
      text-align: center;
      color: #94a3b8;
    }

    .empty-state mat-icon { font-size: 3rem; width: 3rem; height: 3rem; margin-bottom: 0.5rem; }

    .history-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 1rem;
      transition: background 0.2s;
    }

    .history-item:hover { background: #f8fafc; }

    .item-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      background: #f1f5f9;
      color: #94a3b8;
      display: grid;
      place-items: center;
    }

    .item-icon.active {
      background: #dcfce7;
      color: #22c55e;
      animation: pulse 2s infinite;
    }

    .item-content { flex: 1; }
    .item-time { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #1e293b; }
    .item-time mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #cbd5e1; }
    
    .item-meta { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.25rem; }
    .late-tag { font-size: 0.7rem; font-weight: 800; color: #ef4444; background: #fef2f2; padding: 0.1rem 0.4rem; border-radius: 4px; }
    .duration { font-size: 0.8rem; color: #64748b; font-weight: 500; }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
      70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
      100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
    }

    @media (max-width: 480px) {
      .action-grid { grid-template-columns: 1fr; }
      .clock-in { width: 180px; height: 180px; }
    }
  `]
})
export class AttendanceEmployeeComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly attendanceApi = inject(AttendanceService);
  private readonly snack = inject(MatSnackBar);

  protected readonly today = new Date();
  protected readonly status = signal('CLOCKED_OUT');
  protected readonly todayRecords = signal<Attendance[]>([]);
  protected currentAttendance: Attendance | null = null;
  
  protected readonly elapsedTime = signal('00:00:00');
  private timerSub?: Subscription;

  protected readonly todayTotal = computed(() => 
    this.todayRecords().reduce((sum, r) => sum + (r.totalHours || 0), 0)
  );

  ngOnInit() {
    this.refreshStatus();
    this.startTimer();
  }

  ngOnDestroy() {
    this.timerSub?.unsubscribe();
  }

  private refreshStatus() {
    const user = this.auth.user();
    if (user) {
      this.attendanceApi.getAttendanceStatus(user.id).subscribe((status: string) => {
        this.status.set(status);
        this.attendanceApi.getTodayAttendance(user.id).subscribe((records: Attendance[]) => {
          this.todayRecords.set(records);
          this.currentAttendance = records.find((r: Attendance) => r.clockOut === null) || null;
        });
      });
    }
  }

  private startTimer() {
    this.timerSub = interval(1000).subscribe(() => {
      if (this.status() === 'CLOCKED_OUT' || !this.currentAttendance) {
        this.elapsedTime.set('00:00:00');
        return;
      }

      const startTime = new Date(this.currentAttendance.clockIn).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - startTime);
      
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      this.elapsedTime.set(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    });
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
        this.snack.open('Successfully clocked out. Have a great day!', 'OK', { duration: 3000 });
        this.refreshStatus();
      });
    }
  }

  startBreak() {
    if (this.currentAttendance) {
      this.attendanceApi.startBreak(this.currentAttendance.id).subscribe(() => {
        this.snack.open('Break started.', 'OK', { duration: 3000 });
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

  getStatusIcon(): string {
    switch (this.status()) {
      case 'CLOCKED_IN': return 'timer';
      case 'ON_BREAK': return 'coffee';
      default: return 'timer_off';
    }
  }

  getStatusLabel(): string {
    switch (this.status()) {
      case 'CLOCKED_IN': return 'Working Now';
      case 'ON_BREAK': return 'On Break';
      default: return 'Clocked Out';
    }
  }
}
