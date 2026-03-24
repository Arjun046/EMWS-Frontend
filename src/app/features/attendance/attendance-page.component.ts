import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { AttendanceService, Attendance } from '../../core/services/attendance.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-attendance-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    PageHeaderComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Attendance Live Console" 
      subtitle="Monitor workforce coverage, daily exceptions, and real-time clock-in/out activity." 
      actionLabel="Manual Clock Entry"
      (action)="openClockInDialog()"
    />

    <section class="attendance-shell">
      <div class="stats-row">
        <mat-card class="stat-box good">
          <label>Currently Clocked In</label>
          <div class="value">{{ clockedInCount() }}</div>
          <p class="delta">89% of scheduled staff</p>
        </mat-card>
        <mat-card class="stat-box warn">
          <label>Late Arrivals Today</label>
          <div class="value">{{ lateCount() }}</div>
          <p class="delta">+5 vs yesterday</p>
        </mat-card>
        <mat-card class="stat-box accent">
          <label>Total Hours (24h)</label>
          <div class="value">{{ totalHours() | number:'1.0-1' }}h</div>
          <p class="delta">Across entire workforce</p>
        </mat-card>
      </div>

      <mat-card class="attendance-card">
        <table mat-table [dataSource]="attendance()" class="enterprise-grid">
          <ng-container matColumnDef="employee">
            <th mat-header-cell *matHeaderCellDef>Staff Member</th>
            <td mat-cell *matCellDef="let entry">
              <div class="user-info">
                <div class="mini-avatar">{{ entry.employeeId }}</div>
                <div>
                  <strong>Staff #{{ entry.employeeId }}</strong>
                  <p class="text-muted">Managed Location</p>
                </div>
              </div>
            </td>
          </ng-container>

          <ng-container matColumnDef="clockIn">
            <th mat-header-cell *matHeaderCellDef>Clock In</th>
            <td mat-cell *matCellDef="let entry">{{ entry.clockIn | date:'shortTime' }}</td>
          </ng-container>

          <ng-container matColumnDef="clockOut">
            <th mat-header-cell *matHeaderCellDef>Clock Out</th>
            <td mat-cell *matCellDef="let entry">
              {{ entry.clockOut ? (entry.clockOut | date:'shortTime') : 'Active Shift' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Audit Status</th>
            <td mat-cell *matCellDef="let entry">
              <span class="status-chip" [class.late]="entry.isLate" [class.ontime]="!entry.isLate">
                {{ entry.isLate ? 'LATE ARRIVAL' : 'ON TIME' }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="hours">
            <th mat-header-cell *matHeaderCellDef>Total Duration</th>
            <td mat-cell *matCellDef="let entry">
              {{ entry.totalHours ? (entry.totalHours | number:'1.2-2') + ' hrs' : 'Calculating...' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let entry" class="actions-cell">
              @if (!entry.clockOut) {
                <button mat-flat-button color="warn" (click)="clockOut(entry)">Clock Out</button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
      </mat-card>
    </section>
  `,
  styles: [`
    .attendance-shell { margin-top: 1.5rem; }
    .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-box { padding: 1.5rem; border-radius: 1rem; border: 1px solid #e2e8f0; }
    .stat-box label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .stat-box .value { font-size: 2.25rem; font-weight: 800; margin: 0.5rem 0; color: #1e293b; }
    .stat-box .delta { margin: 0; font-size: 0.8rem; font-weight: 600; color: #64748b; }
    .stat-box.good { border-left: 4px solid #10b981; }
    .stat-box.warn { border-left: 4px solid #f59e0b; }
    .stat-box.accent { border-left: 4px solid #3b82f6; }

    .attendance-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .enterprise-grid { width: 100%; min-width: 800px; }
    .user-info { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; }
    .mini-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: #f1f5f9; color: #64748b; display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; }
    .text-muted { margin: 0; font-size: 0.75rem; color: #64748b; }
    .status-chip { font-size: 0.65rem; font-weight: 800; padding: 0.25rem 0.5rem; border-radius: 4px; }
    .status-chip.late { background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; }
    .status-chip.ontime { background: #f0fdf4; color: #22c55e; border: 1px solid #dcfce7; }
    .actions-cell { text-align: right; padding-right: 1.5rem !important; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }

    @media (max-width: 1024px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
    }

    @media (max-width: 640px) {
      .stats-row { grid-template-columns: 1fr; }
      .enterprise-grid { min-width: 600px; }
    }
  `]
})
export class AttendancePageComponent {
  private readonly attendanceApi = inject(AttendanceService);
  private readonly snack = inject(MatSnackBar);

  protected readonly today = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
  protected readonly tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00Z';

  protected readonly attendance = toSignal(
    this.attendanceApi.getAttendanceRange(this.today, this.tomorrow), 
    { initialValue: [] }
  );

  protected readonly clockedInCount = toSignal(this.attendanceApi.getClockedInCount(), { initialValue: 0 });
  
  protected readonly lateCount = computed(() => 
    this.attendance().filter(a => a.isLate).length
  );

  protected readonly totalHours = computed(() => 
    this.attendance().reduce((sum, a) => sum + (a.totalHours || 0), 0)
  );

  protected readonly displayedColumns = ['employee', 'clockIn', 'clockOut', 'status', 'hours', 'actions'];

  protected openClockInDialog(): void {
    this.snack.open('Manual entry is coming in next release', 'OK', { duration: 3000 });
  }

  protected clockOut(entry: Attendance): void {
    this.attendanceApi.clockOut(entry.id).subscribe(() => {
      this.snack.open(`Staff member clocked out successfully`, 'OK', { duration: 3000 });
      window.location.reload();
    });
  }
}
