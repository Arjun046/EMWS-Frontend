import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of, catchError } from 'rxjs';
import { LeaveService, LeaveRequest, LeaveStatus } from '../../core/services/leave.service';
import { SchedulingService } from '../../core/services/scheduling.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-team-calendar-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDividerModule, MatChipsModule, MatTooltipModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header
      title="Workforce Coverage Console"
      subtitle="Architect team presence by monitoring integrated shift cycles and absence timelines."
      secondaryActionLabel="Go to Today"
      secondaryIcon="today"
      (actionSecondary)="goToToday()"
    />

    <section class="coverage-metrics">
       <mat-card class="metric-pill good">
          <label>Operational Coverage</label>
          <div class="value">94%</div>
          <p class="delta">Within optimal range</p>
       </mat-card>
       <mat-card class="metric-pill warn">
          <label>Detected Gaps</label>
          <div class="value">{{ coverageGaps() }}</div>
          <p class="delta">Critical shift shortages</p>
       </mat-card>
       <mat-card class="metric-pill accent">
          <label>Active Staff</label>
          <div class="value">{{ activeStaffCount() }}</div>
          <p class="delta">Present on current shift</p>
       </mat-card>
    </section>

    <section class="calendar-shell mt-6">
      <mat-card class="calendar-main shadow-xl">
        <div class="calendar-nav">
          <button mat-icon-button (click)="prevMonth()"><mat-icon>chevron_left</mat-icon></button>
          <h2 class="month-title">{{ monthName }} {{ year }}</h2>
          <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
          <div class="spacer"></div>
          <div class="view-toggles">
             <mat-chip-listbox selectable="false">
                <mat-chip class="active-chip">Standard Grid</mat-chip>
             </mat-chip-listbox>
          </div>
        </div>

        @if (isLoading()) {
          <div class="calendar-grid skeleton-pulse">
            @for (i of [1,2,3,4,5,6,7]; track i) {
               <div class="weekday-header s-header"></div>
            }
            @for (i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14]; track i) {
               <div class="day-cell s-cell"></div>
            }
          </div>
        } @else {
          <div class="calendar-grid">
            <div class="weekday-header" *ngFor="let day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">{{ day }}</div>
            <div class="day-blank" *ngFor="let b of blanks"></div>
            @for (day of days; track day) {
              <div class="day-cell" [class.is-today]="isToday(day)" [class.is-weekend]="isWeekend(day)">
                <span class="day-number">{{ day }}</span>
                <div class="day-events custom-scrollbar">
                  <!-- LEAVES (Absences) -->
                  @for (leave of getLeavesForDay(day); track leave.id) {
                    <div class="event-chip leave" [class]="leave.leaveType.toLowerCase()" [matTooltip]="leave.employeeName + ' (Leave)'">
                      <mat-icon class="icon-xs">beach_access</mat-icon>
                      <span>{{ getFirstName(leave.employeeName) }}</span>
                    </div>
                  }
                  <!-- SHIFTS (Scheduled) -->
                  @for (shift of getShiftsForDay(day); track shift.id) {
                    <div class="event-chip shift" [matTooltip]="'Shift: ' + shift.role">
                       <mat-icon class="icon-xs">schedule</mat-icon>
                       <span>{{ getFirstName(shift.employeeName) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="calendar-legend">
            <div class="legend-item"><span class="leg-dot shift-dot"></span> Shift Scheduled</div>
            <div class="legend-item"><span class="leg-dot vacation-dot"></span> Vacation</div>
            <div class="legend-item"><span class="leg-dot sick-dot"></span> Medical</div>
          </div>
        }
      </mat-card>

      <div class="calendar-sidebar">
        <mat-card class="sidebar-card">
           <header><h3>Deployment Roster</h3></header>
           <div class="roster-list">
              @for (emp of activeStaff(); track emp.id) {
                 <div class="roster-item">
                    <div class="roster-avatar">{{ getInitials(emp.name) }}</div>
                    <div class="roster-info">
                       <strong>{{ emp.name }}</strong>
                       <span>On Duty &bull; {{ emp.area }}</span>
                    </div>
                    <div class="roster-status online"></div>
                 </div>
              } @empty {
                 <div class="empty-roster">No staff currently active.</div>
              }
           </div>
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .coverage-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 1.5rem; }
    .metric-pill { padding: 1.25rem 1.5rem; border-radius: 1.25rem; border: 1px solid #e2e8f0; background: #fff; }
    .metric-pill label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .metric-pill .value { font-size: 2.25rem; font-weight: 900; color: #0f172a; margin: 0.25rem 0; }
    .metric-pill .delta { margin: 0; font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .metric-pill.good { border-top: 4px solid #10b981; }
    .metric-pill.warn { border-top: 4px solid #f59e0b; }
    .metric-pill.accent { border-top: 4px solid #3b82f6; }

    .calendar-shell { display: grid; grid-template-columns: 1fr 22rem; gap: 1.5rem; }
    .calendar-main { border-radius: 1.5rem; padding: 1.5rem; border: 1px solid #e2e8f0; background: #fff; }
    .calendar-nav { display: flex; align-items: center; margin-bottom: 1.5rem; }
    .month-title { font-size: 1.25rem; font-weight: 800; color: #1e293b; margin: 0 1rem; min-width: 140px; text-align: center; }
    .spacer { flex: 1; }

    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border-radius: 0.75rem; border: 1px solid #e2e8f0; overflow: hidden; }
    .weekday-header { background: #f8fafc; padding: 0.75rem; text-align: center; font-size: 0.7rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .day-cell { background: #fff; min-height: 100px; padding: 0.5rem; display: flex; flex-direction: column; position: relative; }
    .day-cell.is-today { background: #f0f9ff; }
    .day-cell.is-today .day-number { color: #2563eb; font-weight: 900; }
    .day-number { font-size: 0.8rem; font-weight: 700; color: #94a3b8; margin-bottom: 0.5rem; }
    .day-events { display: flex; flex-direction: column; gap: 3px; max-height: 80px; overflow-y: auto; }

    .event-chip { display: flex; align-items: center; gap: 4px; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .event-chip.leave { background: #fef2f2; color: #ef4444; border-left: 2px solid #ef4444; }
    .event-chip.shift { background: #ecfdf5; color: #059669; border-left: 2px solid #059669; }
    .icon-xs { font-size: 12px; width: 12px; height: 12px; }

    .calendar-legend { display: flex; gap: 1.5rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
    .legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #64748b; font-weight: 700; }
    .leg-dot { width: 10px; height: 10px; border-radius: 50%; }
    .shift-dot { background: #10b981; } .vacation-dot { background: #ef4444; } .sick-dot { background: #f59e0b; }

    .sidebar-card { border-radius: 1.25rem; padding: 0; border: 1px solid #e2e8f0; overflow: hidden; }
    .sidebar-card header { padding: 1.25rem; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
    .sidebar-card h3 { margin: 0; font-size: 0.95rem; font-weight: 800; color: #0f172a; }
    .roster-list { padding: 1rem; display: grid; gap: 1rem; }
    .roster-item { display: flex; align-items: center; gap: 0.75rem; }
    .roster-avatar { width: 2.2rem; height: 2.2rem; border-radius: 8px; background: #eff6ff; color: #3b82f6; display: grid; place-items: center; font-weight: 800; font-size: 0.75rem; }
    .roster-info { flex: 1; display: flex; flex-direction: column; }
    .roster-info strong { font-size: 0.85rem; color: #1e293b; }
    .roster-info span { font-size: 0.75rem; color: #94a3b8; }
    .roster-status { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }

    /* SKELETONS */
    .skeleton-pulse { opacity: 0.6; }
    .s-header { height: 40px; background: #f1f5f9; }
    .s-cell { height: 100px; background: #fff; }

    .mt-6 { margin-top: 1.5rem; }
  `]
})
export class TeamCalendarPageComponent implements OnInit {
  private readonly leaveApi = inject(LeaveService);
  private readonly scheduleApi = inject(SchedulingService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly isLoading = signal(true);
  protected readonly teamLeaves = signal<any[]>([]);
  protected readonly teamShifts = signal<any[]>([]);
  protected readonly activeStaff = signal<any[]>([]);

  protected readonly coverageGaps = signal(0);
  protected readonly activeStaffCount = computed(() => this.activeStaff().length);

  protected month = new Date().getMonth();
  protected year = new Date().getFullYear();

  get monthName(): string {
    return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(this.year, this.month));
  }

  get days(): number[] {
    return Array.from({ length: new Date(this.year, this.month + 1, 0).getDate() }, (_, i) => i + 1);
  }

  get blanks(): number[] {
    return Array.from({ length: new Date(this.year, this.month, 1).getDay() }, (_, i) => i);
  }

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.isLoading.set(true);
    const start = new Date(this.year, this.month, 1).toISOString();
    const end = new Date(this.year, this.month + 1, 0).toISOString();

    forkJoin({
      leaves: this.leaveApi.getCompanyRequests(LeaveStatus.APPROVED).pipe(catchError(() => of([]))),
      shifts: this.scheduleApi.getShiftsByRange(start, end).pipe(catchError(() => of([])))
    }).subscribe({
      next: (data) => {
        this.teamLeaves.set(data.leaves);
        this.teamShifts.set(data.shifts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snack.open('Error synchronizing workforce coverage.', 'OK', { duration: 3000 });
      }
    });
  }

  protected getLeavesForDay(day: number): any[] {
    const d = this.getDateString(day);
    return this.teamLeaves().filter(l => d >= l.startDate.split('T')[0] && d <= l.endDate.split('T')[0]);
  }

  protected getShiftsForDay(day: number): any[] {
    const d = this.getDateString(day);
    return this.teamShifts().filter(s => s.startTime.split('T')[0] === d);
  }

  private getDateString(day: number): string {
    return `${this.year}-${(this.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  isToday(day: number): boolean {
    const d = new Date();
    return d.getDate() === day && d.getMonth() === this.month && d.getFullYear() === this.year;
  }

  isWeekend(day: number): boolean {
    const d = new Date(this.year, this.month, day).getDay();
    return d === 0 || d === 6;
  }

  prevMonth() { if (this.month === 0) { this.month = 11; this.year--; } else { this.month--; } this.loadData(); }
  nextMonth() { if (this.month === 11) { this.month = 0; this.year++; } else { this.month++; } this.loadData(); }
  goToToday() { this.month = new Date().getMonth(); this.year = new Date().getFullYear(); this.loadData(); }
  
  getInitials(name?: string): string { return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'; }
  getFirstName(name?: string): string { return name ? name.split(' ')[0] : 'Staff'; }
}
