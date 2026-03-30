import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormsModule } from '@angular/forms';
import { TimesheetService, TimesheetEntry, TimesheetSummary } from '../../core/services/timesheet.service';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'app-timesheet-reports-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressBarModule,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    DatePipe,
    DecimalPipe
  ],
  template: `
    <app-page-header
      title="Timesheet Reports"
      subtitle="Analyze workforce hours, attendance patterns, and labor utilization across pay periods."
      [actionLabel]="isAdminOrManager() ? 'Export Report' : ''"
      icon="download"
      secondaryActionLabel="Refresh"
      secondaryIcon="refresh"
      (action)="exportCSV()"
      (actionSecondary)="loadData()"
    />

    <section class="reports-shell">
      <!-- Period Selector -->
      <mat-card class="period-controls">
        <div class="controls-row">
          <div class="date-group">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="date-field">
              <mat-label>Start Date</mat-label>
              <input matInput type="date" [(ngModel)]="startDate" (change)="loadData()">
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="date-field">
              <mat-label>End Date</mat-label>
              <input matInput type="date" [(ngModel)]="endDate" (change)="loadData()">
            </mat-form-field>
          </div>
          <div class="quick-range">
            <button mat-stroked-button (click)="setRange('week')" [class.active-range]="activeRange() === 'week'">This Week</button>
            <button mat-stroked-button (click)="setRange('month')" [class.active-range]="activeRange() === 'month'">This Month</button>
            <button mat-stroked-button (click)="setRange('prev-month')" [class.active-range]="activeRange() === 'prev-month'">Last Month</button>
          </div>
        </div>
      </mat-card>

      <!-- Summary Stats -->
      <div class="summary-ribbon mt-6">
        <mat-card class="summary-box">
          <label>Total Hours</label>
          <div class="value">{{ totalHours() | number:'1.1-1' }}</div>
          <p class="delta">Across {{ uniqueEmployees() }} staff</p>
        </mat-card>
        <mat-card class="summary-box">
          <label>Regular Hours</label>
          <div class="value">{{ totalRegularHours() | number:'1.1-1' }}</div>
          <p class="delta">Standard time</p>
        </mat-card>
        <mat-card class="summary-box warn">
          <label>Overtime Hours</label>
          <div class="value">{{ totalOvertimeHours() | number:'1.1-1' }}</div>
          <p class="delta">{{ overtimePercentage() | number:'1.0-0' }}% of total</p>
        </mat-card>
        <mat-card class="summary-box accent">
          <label>Avg Hours / Employee</label>
          <div class="value">{{ avgHoursPerEmployee() | number:'1.1-1' }}</div>
          <p class="delta">Period average</p>
        </mat-card>
      </div>

      @if (isLoading()) {
        <mat-card class="skeleton-card mt-6">
          <div class="skeleton-row" *ngFor="let i of [1,2,3,4,5,6,7,8]">
            <div class="skeleton-cell wide"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell"></div>
            <div class="skeleton-cell narrow"></div>
          </div>
        </mat-card>
      } @else {
        <mat-tab-group class="mt-6 enterprise-tabs">
          @if (isAdminOrManager()) {
            <mat-tab label="Workforce Summary">
              <div class="tab-content mt-6">
                <mat-card class="data-card overflow-hidden">
                  <div class="card-header bg-slate-50 border-b">
                    <div>
                      <h3 class="font-bold m-0">Hours by Employee</h3>
                      <p class="subtle-copy m-0">{{ startDate }} to {{ endDate }} — {{ summaries().length }} employees</p>
                    </div>
                    <div class="header-actions">
                      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-inline">
                        <mat-icon matPrefix>search</mat-icon>
                        <input matInput [(ngModel)]="searchQuery" placeholder="Filter employees..." (ngModelChange)="applyFilter()">
                      </mat-form-field>
                    </div>
                  </div>

                  @if (filteredSummaries().length > 0) {
                    <table mat-table [dataSource]="filteredSummaries()" class="w-full">
                      <ng-container matColumnDef="employee">
                        <th mat-header-cell *matHeaderCellDef>Employee</th>
                        <td mat-cell *matCellDef="let row">
                          <div class="user-cell">
                            <div class="mini-avatar">{{ getInitials(row.employeeName) }}</div>
                            <div class="flex flex-col">
                              <strong>{{ row.employeeName }}</strong>
                              <span class="text-xs text-slate-400">{{ row.department || 'Operations' }}</span>
                            </div>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="regularHours">
                        <th mat-header-cell *matHeaderCellDef>Regular</th>
                        <td mat-cell *matCellDef="let row">{{ row.totalRegularHours | number:'1.1-1' }}h</td>
                      </ng-container>

                      <ng-container matColumnDef="overtimeHours">
                        <th mat-header-cell *matHeaderCellDef>Overtime</th>
                        <td mat-cell *matCellDef="let row">
                          <span [class.overtime-flag]="row.totalOvertimeHours > 10">{{ row.totalOvertimeHours | number:'1.1-1' }}h</span>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="totalHours">
                        <th mat-header-cell *matHeaderCellDef>Total</th>
                        <td mat-cell *matCellDef="let row">
                          <strong class="text-blue-600">{{ row.totalHours | number:'1.1-1' }}h</strong>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="daysPresent">
                        <th mat-header-cell *matHeaderCellDef>Days Present</th>
                        <td mat-cell *matCellDef="let row">{{ row.daysPresent }}</td>
                      </ng-container>

                      <ng-container matColumnDef="daysAbsent">
                        <th mat-header-cell *matHeaderCellDef>Absent</th>
                        <td mat-cell *matCellDef="let row">
                          <span [class.absence-flag]="row.daysAbsent > 3">{{ row.daysAbsent }}</span>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="utilization">
                        <th mat-header-cell *matHeaderCellDef>Utilization</th>
                        <td mat-cell *matCellDef="let row">
                          <div class="utilization-cell">
                            <mat-progress-bar mode="determinate" [value]="getUtilization(row)"></mat-progress-bar>
                            <span class="util-text">{{ getUtilization(row) | number:'1.0-0' }}%</span>
                          </div>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="summaryColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: summaryColumns;"></tr>
                    </table>
                  } @else {
                    <div class="empty-state p-12 text-center text-slate-400">
                      <mat-icon class="text-5xl mb-3">assessment</mat-icon>
                      <h4>No timesheet data for this period</h4>
                      <p>Select a different date range or ensure attendance records exist for the selected period.</p>
                    </div>
                  }
                </mat-card>
              </div>
            </mat-tab>
          }

          <mat-tab [label]="isAdminOrManager() ? 'Detailed Log' : 'My Timesheet'">
            <div class="tab-content mt-6">
              <mat-card class="data-card overflow-hidden">
                <div class="card-header bg-slate-50 border-b">
                  <h3 class="font-bold m-0">{{ isAdminOrManager() ? 'All Attendance Entries' : 'My Attendance Log' }}</h3>
                  <div class="count-pill">
                    <strong>{{ filteredEntries().length }}</strong> entries
                  </div>
                </div>

                @if (filteredEntries().length > 0) {
                  <table mat-table [dataSource]="filteredEntries()" class="w-full">
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Date</th>
                      <td mat-cell *matCellDef="let row">
                        <div class="date-cell">
                          <strong>{{ row.date | date:'EEE' }}</strong>
                          <span>{{ row.date | date:'MMM d, y' }}</span>
                        </div>
                      </td>
                    </ng-container>

                    @if (isAdminOrManager()) {
                      <ng-container matColumnDef="employeeName">
                        <th mat-header-cell *matHeaderCellDef>Employee</th>
                        <td mat-cell *matCellDef="let row"><strong>{{ row.employeeName || 'Staff #' + row.employeeId }}</strong></td>
                      </ng-container>
                    }

                    <ng-container matColumnDef="clockIn">
                      <th mat-header-cell *matHeaderCellDef>Clock In</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="time-text">{{ row.clockIn | date:'shortTime' }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="clockOut">
                      <th mat-header-cell *matHeaderCellDef>Clock Out</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="time-text" [class.still-in]="!row.clockOut">{{ row.clockOut ? (row.clockOut | date:'shortTime') : 'Still In' }}</span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="totalHours">
                      <th mat-header-cell *matHeaderCellDef>Hours</th>
                      <td mat-cell *matCellDef="let row">
                        <strong>{{ row.totalHours | number:'1.1-1' }}h</strong>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="status">
                      <th mat-header-cell *matHeaderCellDef>Status</th>
                      <td mat-cell *matCellDef="let row">
                        <app-status-badge [value]="row.status" />
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="detailColumns()"></tr>
                    <tr mat-row *matRowDef="let row; columns: detailColumns();"></tr>
                  </table>
                } @else {
                  <div class="empty-state p-12 text-center text-slate-400">
                    <mat-icon class="text-5xl mb-3">schedule</mat-icon>
                    <h4>No entries found</h4>
                    <p>There are no clock records for the selected period. Try a different date range.</p>
                  </div>
                }
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </section>
  `,
  styles: [`
    .reports-shell { margin-top: 1.5rem; }

    .period-controls { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .controls-row { display: flex; justify-content: space-between; align-items: center; gap: 1.5rem; flex-wrap: wrap; }
    .date-group { display: flex; gap: 1rem; align-items: center; }
    .date-field { width: 12rem; }
    .quick-range { display: flex; gap: 0.5rem; }
    .active-range { background: #eff6ff !important; color: #2563eb !important; border-color: #bfdbfe !important; font-weight: 700 !important; }

    .summary-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; }
    .summary-box { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .summary-box label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
    .summary-box .value { font-size: 2rem; font-weight: 900; margin: 0.25rem 0; color: #0f172a; }
    .summary-box.warn .value { color: #f59e0b; }
    .summary-box.accent .value { color: #2563eb; }
    .summary-box .delta { margin: 0; font-size: 0.8rem; font-weight: 700; color: #64748b; }

    .mt-6 { margin-top: 1.5rem; }
    .data-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .card-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { font-size: 1.1rem; font-weight: 800; color: #0f172a; }
    .subtle-copy { color: #64748b; font-size: 0.8rem; margin-top: 0.35rem; }
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }
    .search-inline { width: 16rem; }
    ::ng-deep .search-inline .mat-mdc-text-field-wrapper { height: 2.5rem; border-radius: 0.75rem !important; }

    .w-full { width: 100%; }
    .overflow-hidden { overflow: hidden; }
    .text-right { text-align: right; }
    .bg-slate-50 { background: #f8fafc; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .m-0 { margin: 0; }
    .p-12 { padding: 3rem; }
    .text-center { text-align: center; }
    .text-5xl { font-size: 3rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .font-bold { font-weight: 700; }

    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; font-weight: 800; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 0.85rem 1rem !important; }

    .user-cell { display: flex; align-items: center; gap: 1rem; }
    .mini-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-weight: 900; font-size: 0.8rem; }
    .flex { display: flex; }
    .flex-col { flex-direction: column; }
    .text-xs { font-size: 0.75rem; }
    .text-slate-400 { color: #94a3b8; }
    .text-blue-600 { color: #2563eb; }

    .overtime-flag { color: #f59e0b; font-weight: 800; }
    .absence-flag { color: #ef4444; font-weight: 800; }
    .still-in { color: #22c55e; font-weight: 700; }

    .utilization-cell { display: flex; align-items: center; gap: 0.75rem; min-width: 120px; }
    .util-text { font-size: 0.75rem; font-weight: 800; color: #64748b; min-width: 2.5rem; }

    .date-cell { display: flex; flex-direction: column; }
    .date-cell strong { font-size: 0.75rem; color: #64748b; text-transform: uppercase; }
    .date-cell span { font-size: 0.9rem; color: #1e293b; font-weight: 600; }
    .time-text { font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; font-weight: 600; color: #334155; }

    .count-pill { background: #f1f5f9; padding: 0.4rem 1rem; border-radius: 999px; font-size: 0.85rem; color: #64748b; }
    .count-pill strong { color: #1e293b; }

    /* Skeleton */
    .skeleton-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; padding: 1.5rem; }
    .skeleton-row { display: flex; gap: 1.5rem; padding: 1rem 0; border-bottom: 1px solid #f1f5f9; }
    .skeleton-cell { height: 1rem; border-radius: 0.5rem; background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; flex: 1; }
    .skeleton-cell.wide { flex: 2; }
    .skeleton-cell.narrow { flex: 0.5; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .empty-state h4 { color: #64748b; font-weight: 700; margin: 0 0 0.5rem; }
    .empty-state p { margin: 0; max-width: 24rem; margin-inline: auto; }

    @media (max-width: 1024px) {
      .controls-row { flex-direction: column; align-items: stretch; }
      .quick-range { flex-wrap: wrap; }
    }

    @media (max-width: 768px) {
      .summary-ribbon { grid-template-columns: repeat(2, 1fr); }
      .date-group { flex-direction: column; }
      .date-field { width: 100%; }
    }
  `]
})
export class TimesheetReportsPageComponent implements OnInit {
  private readonly timesheetApi = inject(TimesheetService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly isLoading = signal(false);
  protected readonly entries = signal<TimesheetEntry[]>([]);
  protected readonly summaries = signal<TimesheetSummary[]>([]);
  protected readonly activeRange = signal<'week' | 'month' | 'prev-month' | 'custom'>('month');
  protected searchQuery = '';

  protected startDate = '';
  protected endDate = '';

  protected readonly summaryColumns = ['employee', 'regularHours', 'overtimeHours', 'totalHours', 'daysPresent', 'daysAbsent', 'utilization'];

  protected readonly detailColumns = computed(() => {
    if (this.isAdminOrManager()) {
      return ['date', 'employeeName', 'clockIn', 'clockOut', 'totalHours', 'status'];
    }
    return ['date', 'clockIn', 'clockOut', 'totalHours', 'status'];
  });

  protected readonly filteredSummaries = computed(() => {
    const q = this.searchQuery.toLowerCase();
    if (!q) return this.summaries();
    return this.summaries().filter(s =>
      s.employeeName.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  });

  protected readonly filteredEntries = computed(() => this.entries());

  protected readonly totalHours = computed(() => this.summaries().reduce((s, r) => s + r.totalHours, 0));
  protected readonly totalRegularHours = computed(() => this.summaries().reduce((s, r) => s + r.totalRegularHours, 0));
  protected readonly totalOvertimeHours = computed(() => this.summaries().reduce((s, r) => s + r.totalOvertimeHours, 0));
  protected readonly uniqueEmployees = computed(() => this.summaries().length);
  protected readonly avgHoursPerEmployee = computed(() => {
    const count = this.uniqueEmployees();
    return count > 0 ? this.totalHours() / count : 0;
  });
  protected readonly overtimePercentage = computed(() => {
    const total = this.totalHours();
    return total > 0 ? (this.totalOvertimeHours() / total) * 100 : 0;
  });

  ngOnInit(): void {
    this.setRange('month');
  }

  protected isAdminOrManager(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  protected setRange(range: 'week' | 'month' | 'prev-month'): void {
    this.activeRange.set(range);
    const now = new Date();
    let start: Date;
    let end: Date;

    if (range === 'week') {
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay());
      end = new Date(start);
      end.setDate(end.getDate() + 6);
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
    this.loadData();
  }

  protected loadData(): void {
    if (!this.startDate || !this.endDate) return;
    this.isLoading.set(true);
    const userId = this.auth.user()?.id;

    if (this.isAdminOrManager()) {
      this.timesheetApi.getTimesheetSummary(this.startDate, this.endDate).subscribe({
        next: (data) => this.summaries.set(data),
        error: () => this.snack.open('Unable to load timesheet summary.', 'OK', { duration: 3000 })
      });
    }

    const entryObs = this.isAdminOrManager()
      ? this.timesheetApi.getTimesheetEntries(this.startDate, this.endDate)
      : this.timesheetApi.getMyTimesheet(userId || 1, this.startDate, this.endDate);

    entryObs.subscribe({
      next: (data) => {
        this.entries.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snack.open('Unable to load timesheet entries.', 'OK', { duration: 3000 });
      }
    });
  }

  protected getInitials(name: string): string {
    return name.split(' ').map(p => p.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  protected getUtilization(row: TimesheetSummary): number {
    const expectedDays = row.daysPresent + row.daysAbsent;
    if (expectedDays === 0) return 0;
    return Math.min(100, Math.round((row.daysPresent / expectedDays) * 100));
  }

  protected applyFilter(): void {
    // Re-triggers computed
  }

  protected exportCSV(): void {
    const data = this.filteredSummaries();
    if (data.length === 0) {
      this.snack.open('No data to export.', 'OK', { duration: 2000 });
      return;
    }
    const headers = 'Employee,Department,Regular Hours,Overtime Hours,Total Hours,Days Present,Days Absent';
    const rows = data.map(r =>
      `"${r.employeeName}","${r.department}",${r.totalRegularHours},${r.totalOvertimeHours},${r.totalHours},${r.daysPresent},${r.daysAbsent}`
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timesheet_${this.startDate}_to_${this.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open(`Report exported: ${data.length} employee records.`, 'OK', { duration: 3000 });
  }
}
