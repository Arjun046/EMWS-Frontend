import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalyticsService, Report, DashboardWidget } from '../../core/services/analytics.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';
import { AuthService } from '../../core/services/auth.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

/** Live BE AdminDashboardDTO (analytics-service). */
interface AdminDashboard {
  totalEmployees: number;
  currentlyClockedIn: number;
  pendingLeaveRequests: number;
  todayLaborCost: number;
  breakViolationsToday: number;
}

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDividerModule,
    PageHeaderComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Intelligence & Insights" 
      subtitle="Data-driven workforce analytics, productivity metrics, and automated enterprise reporting." 
      [actionLabel]="canExport() ? 'Schedule Report' : undefined"
      (action)="onScheduleReport()"
    />

    <section class="analytics-shell">
      <!-- 1. HIGH-LEVEL METRICS (live admin dashboard; BE allows ORG or TEAM read) -->
      @if (canReadOrgAnalytics() || canReadTeamAnalytics()) {
        @if (adminLoading()) {
          <div class="metrics-grid">
            @for (i of [1,2,3,4,5]; track i) {
              <mat-card class="metric-card"><div class="shimmer" style="height: 12px; width: 50%; margin-bottom: 1rem;"></div><div class="shimmer" style="height: 32px; width: 40%;"></div></mat-card>
            }
          </div>
        } @else if (admin()) {
          <div class="metrics-grid">
            <mat-card class="metric-card">
              <label>Total Employees</label>
              <div class="value">{{ admin()!.totalEmployees }}</div>
              <div class="trend stable">Company-wide</div>
            </mat-card>
            <mat-card class="metric-card">
              <label>Currently Clocked In</label>
              <div class="value">{{ admin()!.currentlyClockedIn }}</div>
              <div class="trend stable">Right now</div>
            </mat-card>
            <mat-card class="metric-card">
              <label>Pending Leave Requests</label>
              <div class="value">{{ admin()!.pendingLeaveRequests }}</div>
              <div class="trend stable">Awaiting review</div>
            </mat-card>
            <mat-card class="metric-card">
              <label>Today's Labor Cost</label>
              <div class="value">{{ admin()!.todayLaborCost | number:'1.0-2' }}</div>
              <div class="trend stable">Today</div>
            </mat-card>
            <mat-card class="metric-card">
              <label>Break Violations Today</label>
              <div class="value">{{ admin()!.breakViolationsToday }}</div>
              <div class="trend stable">Today</div>
            </mat-card>
          </div>
        } @else {
          <mat-card class="metric-card"><label>Analytics unavailable</label><div class="trend stable">Could not load dashboard metrics. Please try again later.</div></mat-card>
        }
      }

      <div class="insights-grid mt-6">
        <!-- 2. DASHBOARD WIDGETS (real BE data for your role) -->
        @if (canReadOrgAnalytics() || canReadTeamAnalytics()) {
          <mat-card class="chart-card">
            <div class="card-header">
              <h3>Dashboard Widgets ({{ widgetRole() }})</h3>
            </div>
            @if (widgets().length === 0) {
              <div class="empty-state">No widgets configured for this role.</div>
            } @else {
              <div style="padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem;">
                @for (w of widgets(); track w.id) {
                  <div style="display:flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid #f1f5f9; border-radius: 8px;">
                    <div><strong>{{ w.name }}</strong><div class="trend stable">{{ w.type }} · position {{ w.position ?? '—' }}</div></div>
                    <span class="format-tag">{{ w.role || widgetRole() }}</span>
                  </div>
                }
              </div>
            }
          </mat-card>
        }

        <!-- 3. REPORT ARCHIVE -->
        <mat-card class="data-card" [class.full-width]="!canReadTeamAnalytics()">
          <div class="card-header">
            <h3>Recent Automated Reports</h3>
            <button mat-button color="primary" *ngIf="canExport()">View All</button>
          </div>
          @if (reportsLoading()) {
            <div class="empty-state">Loading reports…</div>
          } @else if (reportsError()) {
            <div class="empty-state">Could not load reports. Please try again later.</div>
          } @else {
          <table mat-table [dataSource]="reports()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Report Name</th>
              <td mat-cell *matCellDef="let row"><strong>{{row.reportName}}</strong><div class="trend stable">{{row.dataSummary || ''}}</div></td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Generated</th>
              <td mat-cell *matCellDef="let row">{{row.generatedDate | date:'mediumDate'}}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Format</th>
              <td mat-cell *matCellDef="let row">
                <span class="format-tag">{{row.generatedBy || 'system'}}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['name', 'date', 'type']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['name', 'date', 'type'];"></tr>
          </table>
          @if (reports().length === 0) {
            <div class="empty-state">No recently generated reports.</div>
          }
          }
        </mat-card>
      </div>
    </section>
  `,
  styles: [`
    .analytics-shell { margin-top: 1.5rem; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
    .metric-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .metric-card label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric-card .value { font-size: 2.25rem; font-weight: 800; color: #1e293b; margin: 0.5rem 0; }
    .comms-card { border-left: 4px solid var(--accent); background: rgba(0,168,132,0.02); }
    .trend { font-size: 0.8rem; font-weight: 600; }
    .trend.up { color: #10b981; }
    .trend.down { color: #ef4444; }
    .trend.stable { color: #94a3b8; }

    .insights-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; }
    .chart-card, .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; }
    .data-card.full-width { grid-column: span 2; }
    
    .card-header { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { margin: 0; font-size: 1rem; font-weight: 700; }

    .chart-placeholder { padding: 2rem; height: 300px; display: flex; flex-direction: column; justify-content: flex-end; }
    .bars { height: 200px; display: flex; align-items: flex-end; gap: 1.5rem; margin-bottom: 1rem; padding: 0 1rem; }
    .bar { flex: 1; background: #3b82f6; border-radius: 6px 6px 0 0; transition: height 0.3s ease; }
    .labels { display: flex; justify-content: space-between; gap: 1.5rem; padding: 0 1rem; }
    .labels span { flex: 1; text-align: center; font-size: 0.75rem; font-weight: 600; color: #64748b; }

    .w-full { width: 100%; }
    .text-right { text-align: right; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
    
    .format-tag { font-size: 0.65rem; font-weight: 800; background: #f1f5f9; color: #475569; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; }

    @media (max-width: 1200px) {
      .insights-grid { grid-template-columns: 1fr; }
      .data-card.full-width { grid-column: span 1; }
    }
  `]
})
export class AnalyticsPageComponent {
  private readonly analyticsApi = inject(AnalyticsService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly reportsSignal = signal<Report[]>([]);
  protected readonly reports = this.reportsSignal.asReadonly();
  protected readonly reportsLoading = signal(true);
  protected readonly reportsError = signal(false);
  /** Live admin aggregate (BE AdminDashboardDTO). Null = not loaded/failed. */
  protected readonly admin = signal<AdminDashboard | null>(null);
  protected readonly adminLoading = signal(false);
  // Role-aware widgets (P1 fix: was hardcoded ADMIN, so managers/employees
  // saw the wrong wall or nothing). Matches BE GET /widgets/{role}.
  protected readonly widgets = toSignal(this.analyticsApi.getWidgets(this.widgetRole()), { initialValue: [] });

  constructor() {
    this.reloadReports();
    if (this.canReadOrgAnalytics() || this.canReadTeamAnalytics()) {
      this.loadAdmin();
    }
  }

  protected widgetRole(): string {
    if (this.auth.isAdmin()) return 'ADMIN';
    if (this.auth.hasAnyScope(['ANALYTICS_ORG_READ', 'ANALYTICS_TEAM_READ'])) return 'MANAGER';
    return 'EMPLOYEE';
  }

  private loadAdmin(): void {
    this.adminLoading.set(true);
    this.analyticsApi.getAdminDashboard().subscribe({
      next: (data) => {
        this.admin.set(data ?? null);
        this.adminLoading.set(false);
      },
      error: () => {
        this.admin.set(null);
        this.adminLoading.set(false);
      }
    });
  }

  private reloadReports(): void {
    this.reportsLoading.set(true);
    this.reportsError.set(false);
    this.analyticsApi.getReports().subscribe({
      next: (reports) => {
        this.reportsSignal.set(reports);
        this.reportsLoading.set(false);
      },
      error: () => {
        this.reportsLoading.set(false);
        this.reportsError.set(true);
      }
    });
  }

  protected onScheduleReport(): void {
    if (!this.canExport()) {
      this.snack.open('You do not have permission to schedule reports.', 'OK', { duration: 3000 });
      return;
    }
    const name = `Workforce snapshot ${new Date().toISOString().split('T')[0]}`;
    this.analyticsApi.generateReport({
      reportName: name,
      generatedBy: this.auth.user()?.email ?? 'console',
      dataSummary: 'Scheduled from analytics dashboard.'
    }).subscribe({
      next: () => {
        this.snack.open('Report scheduled.', 'OK', { duration: 3000 });
        this.reloadReports();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Scheduling failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  protected canExport(): boolean {
    return this.auth.hasScope('ANALYTICS_EXPORT');
  }

  protected canReadOrgAnalytics(): boolean {
    return this.auth.hasScope('ANALYTICS_ORG_READ');
  }

  protected canReadTeamAnalytics(): boolean {
    return this.auth.hasScope('ANALYTICS_TEAM_READ');
  }
}
