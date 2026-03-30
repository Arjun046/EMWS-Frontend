import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { LeaveService, LeaveRequest, LeaveStatus } from '../../core/services/leave.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';

@Component({
  selector: 'app-team-calendar-page',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatSnackBarModule, MatDividerModule, MatChipsModule,
    PageHeaderComponent, DatePipe
  ],
  template: `
    <app-page-header
      title="Team Calendar"
      subtitle="At-a-glance team availability — see who's in, who's off, and plan coverage gaps."
      secondaryActionLabel="Today"
      secondaryIcon="today"
      (actionSecondary)="goToToday()"
    />

    <section class="calendar-shell">
      <mat-card class="calendar-main">
        <div class="calendar-nav">
          <button mat-icon-button (click)="prevMonth()"><mat-icon>chevron_left</mat-icon></button>
          <h2 class="month-title">{{ monthName }} {{ year }}</h2>
          <button mat-icon-button (click)="nextMonth()"><mat-icon>chevron_right</mat-icon></button>
        </div>

        @if (isLoading()) {
          <div class="calendar-skeleton">
            <div class="skeleton-cell" *ngFor="let i of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]"></div>
          </div>
        } @else {
          <div class="calendar-grid">
            <div class="weekday-header" *ngFor="let day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">{{ day }}</div>
            <div class="day-blank" *ngFor="let b of blanks"></div>
            @for (day of days; track day) {
              <div class="day-cell" [class.is-today]="isToday(day)" [class.is-weekend]="isWeekend(day)">
                <span class="day-number">{{ day }}</span>
                <div class="day-events">
                  @for (leave of getLeavesForDay(day); track leave.id) {
                    <div class="leave-chip" [class]="leave.leaveType.toLowerCase()" [title]="leave.employeeName + ' — ' + leave.leaveType">
                      <span class="chip-name">{{ getFirstName(leave.employeeName) }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="calendar-legend">
            <div class="legend-item"><span class="leg-dot vacation"></span> Vacation</div>
            <div class="legend-item"><span class="leg-dot sick"></span> Sick</div>
            <div class="legend-item"><span class="leg-dot personal"></span> Personal</div>
            <div class="legend-item"><span class="leg-dot bereavement"></span> Bereavement</div>
          </div>
        }
      </mat-card>

      <!-- Sidebar -->
      <div class="sidebar">
        <mat-card class="today-card">
          <h3>Today's Absences</h3>
          @if (todayAbsences().length > 0) {
            <div class="absence-list">
              @for (leave of todayAbsences(); track leave.id) {
                <div class="absence-item">
                  <div class="absence-avatar">{{ getInitials(leave.employeeName) }}</div>
                  <div class="absence-info">
                    <strong>{{ leave.employeeName }}</strong>
                    <span>{{ leave.leaveType }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-sidebar">
              <mat-icon>groups</mat-icon>
              <p>Everyone is in today!</p>
            </div>
          }
        </mat-card>

        <mat-card class="upcoming-card mt-4">
          <h3>Upcoming Absences</h3>
          @if (upcomingAbsences().length > 0) {
            <div class="absence-list">
              @for (leave of upcomingAbsences().slice(0, 8); track leave.id) {
                <div class="absence-item">
                  <div class="absence-avatar">{{ getInitials(leave.employeeName) }}</div>
                  <div class="absence-info">
                    <strong>{{ leave.employeeName }}</strong>
                    <span>{{ leave.startDate | date:'MMM d' }} — {{ leave.endDate | date:'MMM d' }}</span>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="empty-sidebar">
              <mat-icon>event_available</mat-icon>
              <p>No upcoming absences this month.</p>
            </div>
          }
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .calendar-shell { margin-top: 1.5rem; display: grid; grid-template-columns: 1fr 20rem; gap: 1.5rem; }

    .calendar-main { border-radius: 1.5rem; border: 1px solid #e2e8f0; padding: 1.5rem; box-shadow: none !important; }
    .calendar-nav { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; }
    .month-title { margin: 0; font-size: 1.3rem; font-weight: 900; color: #0f172a; min-width: 12rem; text-align: center; }

    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; }
    .weekday-header { background: #f8fafc; padding: 0.75rem; text-align: center; font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .day-blank { background: #f8fafc; }
    .day-cell { background: #fff; min-height: 90px; padding: 0.5rem; display: flex; flex-direction: column; position: relative; }
    .day-cell.is-today { background: #eff6ff; }
    .day-cell.is-today .day-number { color: #2563eb; font-weight: 900; }
    .day-cell.is-weekend { background: #fafafa; }
    .day-number { font-weight: 700; color: #64748b; font-size: 0.85rem; margin-bottom: 0.35rem; }
    .day-events { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }

    .leave-chip { padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .leave-chip.vacation { background: #dbeafe; color: #1d4ed8; }
    .leave-chip.sick { background: #fef2f2; color: #dc2626; }
    .leave-chip.personal { background: #f0fdf4; color: #166534; }
    .leave-chip.bereavement { background: #faf5ff; color: #7c3aed; }

    .calendar-legend { display: flex; gap: 1.5rem; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid #f1f5f9; }
    .legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #64748b; }
    .leg-dot { width: 10px; height: 10px; border-radius: 3px; }
    .leg-dot.vacation { background: #3b82f6; }
    .leg-dot.sick { background: #ef4444; }
    .leg-dot.personal { background: #22c55e; }
    .leg-dot.bereavement { background: #8b5cf6; }

    /* Sidebar */
    .sidebar h3 { margin: 0 0 1rem; font-size: 1rem; font-weight: 800; color: #1e293b; }
    .today-card, .upcoming-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 1.25rem; box-shadow: none !important; }
    .mt-4 { margin-top: 1rem; }

    .absence-list { display: grid; gap: 0.75rem; }
    .absence-item { display: flex; align-items: center; gap: 0.75rem; }
    .absence-avatar { width: 2rem; height: 2rem; border-radius: 0.5rem; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-weight: 800; font-size: 0.65rem; }
    .absence-info { display: flex; flex-direction: column; }
    .absence-info strong { font-size: 0.85rem; color: #1e293b; }
    .absence-info span { font-size: 0.75rem; color: #94a3b8; }

    .empty-sidebar { padding: 2rem 1rem; text-align: center; color: #94a3b8; }
    .empty-sidebar mat-icon { font-size: 2.5rem; width: 2.5rem; height: 2.5rem; margin-bottom: 0.5rem; opacity: 0.4; }
    .empty-sidebar p { margin: 0; font-size: 0.85rem; }

    /* Skeleton */
    .calendar-skeleton { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .calendar-skeleton .skeleton-cell { height: 80px; border-radius: 0.5rem; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    @media (max-width: 1100px) {
      .calendar-shell { grid-template-columns: 1fr; }
      .sidebar { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    }

    @media (max-width: 768px) {
      .day-cell { min-height: 55px; padding: 0.25rem; }
      .leave-chip { font-size: 0.55rem; padding: 0.1rem 0.25rem; }
      .weekday-header { padding: 0.4rem; font-size: 0.6rem; }
      .sidebar { grid-template-columns: 1fr; }
      .calendar-legend { flex-wrap: wrap; gap: 0.75rem; }
    }
  `]
})
export class TeamCalendarPageComponent implements OnInit {
  private readonly leaveApi = inject(LeaveService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly isLoading = signal(false);
  protected readonly teamLeaves = signal<any[]>([]);

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

  protected readonly todayAbsences = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.teamLeaves().filter(l => {
      const start = l.startDate?.split('T')[0];
      const end = l.endDate?.split('T')[0];
      return start && end && today >= start && today <= end;
    });
  });

  protected readonly upcomingAbsences = computed(() => {
    const today = new Date().toISOString().split('T')[0];
    return this.teamLeaves().filter(l => {
      const start = l.startDate?.split('T')[0];
      return start && start > today;
    }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  });

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.isLoading.set(true);
    this.leaveApi.getRequestsByStatus(LeaveStatus.APPROVED).subscribe({
      next: (data) => {
        // Enrich with employee name if missing
        const enriched = data.map(l => ({
          ...l,
          employeeName: (l as any).employeeName || `Staff #${l.employeeId}`
        }));
        this.teamLeaves.set(enriched);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snack.open('Unable to load team calendar data.', 'OK', { duration: 3000 });
      }
    });
  }

  protected getLeavesForDay(day: number): any[] {
    const dateStr = `${this.year}-${(this.month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return this.teamLeaves().filter(l => {
      const start = l.startDate?.split('T')[0];
      const end = l.endDate?.split('T')[0];
      return start && end && dateStr >= start && dateStr <= end;
    });
  }

  isToday(day: number): boolean {
    const d = new Date();
    return d.getDate() === day && d.getMonth() === this.month && d.getFullYear() === this.year;
  }

  isWeekend(day: number): boolean {
    const d = new Date(this.year, this.month, day).getDay();
    return d === 0 || d === 6;
  }

  prevMonth(): void {
    if (this.month === 0) { this.month = 11; this.year--; } else { this.month--; }
    this.loadData();
  }

  nextMonth(): void {
    if (this.month === 11) { this.month = 0; this.year++; } else { this.month++; }
    this.loadData();
  }

  goToToday(): void {
    this.month = new Date().getMonth();
    this.year = new Date().getFullYear();
    this.loadData();
  }

  getInitials(name: string): string {
    return name.split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  getFirstName(name: string): string {
    return name.split(' ')[0] || name;
  }
}
