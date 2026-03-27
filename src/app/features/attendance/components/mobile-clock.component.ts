import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AttendanceService, Attendance } from '../../../core/services/attendance.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-mobile-clock',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule, RouterLink],
  template: `
    <div class="mobile-clock-fullscreen" [class]="currentStatus().toLowerCase()">
      <div class="header">
        <button mat-icon-button routerLink="/dashboard" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="brand-mini">EWMS Mobile</div>
      </div>

      <div class="time-display">
        <h1 class="current-time">{{ currentTime | date:'HH:mm:ss' }}</h1>
        <p class="current-date">{{ currentTime | date:'EEEE, MMMM d' }}</p>
        <div class="duration-badge mt-4" *ngIf="currentStatus() === 'CLOCKED_IN'">
          <mat-icon>timer</mat-icon>
          <span>Shift Duration: {{ getLiveDuration() }}</span>
        </div>
      </div>

      <div class="main-action">
        @if (currentStatus() === 'CLOCKED_OUT') {
          <button class="clock-btn in" (click)="clockIn()">
            <mat-icon>login</mat-icon>
            <span>CLOCK IN</span>
          </button>
        } @else if (currentStatus() === 'CLOCKED_IN') {
          <button class="clock-btn out" (click)="clockOut()">
            <mat-icon>logout</mat-icon>
            <span>CLOCK OUT</span>
          </button>
        } @else if (currentStatus() === 'ON_BREAK') {
          <button class="clock-btn resume" (click)="endBreak()">
            <mat-icon>play_arrow</mat-icon>
            <span>RESUME WORK</span>
          </button>
        }
      </div>

      <div class="secondary-actions" *ngIf="currentStatus() === 'CLOCKED_IN'">
        <button mat-fab extended color="warn" (click)="startBreak()">
          <mat-icon>coffee</mat-icon> TAKE A BREAK
        </button>
      </div>

      <div class="footer-status">
        <div class="status-indicator"></div>
        <span>Current Status: <strong>{{ getStatusLabel() }}</strong></span>
      </div>
    </div>
  `,
  styles: [`
    .mobile-clock-fullscreen {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 9999; display: flex; flex-direction: column;
      background: #f8fafc; color: #1e293b; transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .mobile-clock-fullscreen.clocked_in { background: #ecfdf5; }
    .mobile-clock-fullscreen.on_break { background: #fffbeb; }
    .mobile-clock-fullscreen.clocked_out { background: #fef2f2; }

    .header { padding: 1rem; display: flex; align-items: center; gap: 1rem; }
    .back-btn { background: rgba(255,255,255,0.8) !important; color: #1e293b !important; }
    .brand-mini { font-weight: 900; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }

    .time-display { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .current-time { font-size: 4.5rem; font-weight: 900; margin: 0; font-family: 'JetBrains Mono', monospace; letter-spacing: -0.05em; }
    .current-date { font-size: 1.2rem; font-weight: 600; color: #64748b; margin-top: 0.5rem; }

    .main-action { flex: 2; display: flex; align-items: center; justify-content: center; padding: 2rem; }
    
    .clock-btn {
      width: min(300px, 80vw); height: min(300px, 80vw);
      border-radius: 50%; border: none; outline: none;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; font-weight: 900; font-size: 1.5rem; cursor: pointer;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1); transition: all 0.2s;
    }
    .clock-btn:active { transform: scale(0.95); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
    
    .clock-btn.in { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
    .clock-btn.out { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
    .clock-btn.resume { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
    
    .clock-btn mat-icon { font-size: 4rem; width: 4rem; height: 4rem; }

    .secondary-actions { padding-bottom: 4rem; display: flex; justify-content: center; }

    .footer-status { padding: 2rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; font-size: 1.1rem; }
    .status-indicator { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; }
    .clocked_in .status-indicator { background: #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.5); }
    .on_break .status-indicator { background: #f59e0b; box-shadow: 0 0 10px rgba(245,158,11,0.5); }
    .clocked_out .status-indicator { background: #ef4444; box-shadow: 0 0 10px rgba(239,68,68,0.5); }

    .duration-badge {
      display: flex; align-items: center; gap: 0.5rem;
      background: rgba(34, 197, 94, 0.1); color: #166534;
      padding: 0.5rem 1rem; border-radius: 999px;
      font-weight: 800; font-size: 0.9rem;
    }
    .duration-badge mat-icon { font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    .mt-4 { margin-top: 1rem; }
  `]
})
export class MobileClockComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly attendanceApi = inject(AttendanceService);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected currentTime = new Date();
  private timerHandle?: any;

  protected readonly currentStatus = signal('CLOCKED_OUT');
  protected currentAttendance: Attendance | null = null;

  ngOnInit() {
    this.refreshStatus();
    this.timerHandle = setInterval(() => this.currentTime = new Date(), 1000);
  }

  ngOnDestroy() {
    if (this.timerHandle) clearInterval(this.timerHandle);
  }

  protected getLiveDuration(): string {
    if (!this.currentAttendance?.clockIn) return '00:00:00';
    const start = new Date(this.currentAttendance.clockIn).getTime();
    const diff = Math.max(0, this.currentTime.getTime() - start);
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
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
