import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { AnalyticsService, Report, DashboardWidget } from '../../core/services/analytics.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

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
    MatDividerModule,
    PageHeaderComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Intelligence & Insights" 
      subtitle="Data-driven workforce analytics, productivity metrics, and automated enterprise reporting." 
      actionLabel="Schedule Report"
      (action)="onScheduleReport()"
    />

    <section class="analytics-shell">
      <div class="metrics-grid">
        <mat-card class="metric-card">
          <label>Enterprise Headcount</label>
          <div class="value">1,240</div>
          <div class="trend up">+12% vs last quarter</div>
        </mat-card>
        <mat-card class="metric-card">
          <label>Labor Utilization</label>
          <div class="value">94.2%</div>
          <div class="trend down">-2% vs goal</div>
        </mat-card>
        <mat-card class="metric-card">
          <label>Retention Rate</label>
          <div class="value">88%</div>
          <div class="trend up">+5% YoY</div>
        </mat-card>
        <mat-card class="metric-card">
          <label>Avg. Time to Hire</label>
          <div class="value">18d</div>
          <div class="trend stable">No change</div>
        </mat-card>
      </div>

      <div class="insights-grid mt-6">
        <mat-card class="chart-card">
          <div class="card-header">
            <h3>Staff Allocation by Department</h3>
            <button mat-icon-button><mat-icon>more_vert</mat-icon></button>
          </div>
          <div class="chart-placeholder">
            <div class="bars">
              <div class="bar" style="height: 80%"></div>
              <div class="bar" style="height: 60%"></div>
              <div class="bar" style="height: 95%"></div>
              <div class="bar" style="height: 40%"></div>
              <div class="bar" style="height: 70%"></div>
            </div>
            <div class="labels">
              <span>Ops</span><span>Eng</span><span>HR</span><span>Fin</span><span>Sup</span>
            </div>
          </div>
        </mat-card>

        <mat-card class="data-card">
          <div class="card-header">
            <h3>Recent Automated Reports</h3>
            <button mat-button color="primary">View All</button>
          </div>
          <table mat-table [dataSource]="reports()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Report Name</th>
              <td mat-cell *matCellDef="let row"><strong>{{row.name}}</strong></td>
            </ng-container>
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef>Generated</th>
              <td mat-cell *matCellDef="let row">{{row.generatedDate | date:'mediumDate'}}</td>
            </ng-container>
            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef>Format</th>
              <td mat-cell *matCellDef="let row">
                <span class="format-tag">{{row.type}}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row" class="text-right">
                <button mat-icon-button color="primary"><mat-icon>download</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['name', 'date', 'type', 'actions']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['name', 'date', 'type', 'actions'];"></tr>
          </table>
          @if (reports().length === 0) {
            <div class="empty-state">No recently generated reports.</div>
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
    .trend { font-size: 0.8rem; font-weight: 600; }
    .trend.up { color: #10b981; }
    .trend.down { color: #ef4444; }
    .trend.stable { color: #94a3b8; }

    .insights-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 1.5rem; }
    .chart-card, .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; padding: 0; overflow: hidden; }
    
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
    }
  `]
})
export class AnalyticsPageComponent {
  private readonly analyticsApi = inject(AnalyticsService);

  protected readonly reports = toSignal(this.analyticsApi.getReports(), { initialValue: [] });
  protected readonly widgets = toSignal(this.analyticsApi.getWidgets(), { initialValue: [] });

  protected onScheduleReport(): void {
    // Implement schedule report
  }
}
