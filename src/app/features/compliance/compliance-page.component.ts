import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { ComplianceService, ComplianceRule, AuditTrail } from '../../core/services/compliance.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-compliance-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatDividerModule,
    PageHeaderComponent,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Compliance & Audit" 
      subtitle="Monitor regulatory adherence, review active enforcement rules, and inspect enterprise audit trails." 
      actionLabel="Run Audit"
      (action)="onRunAudit()"
    />

    <section class="compliance-shell">
      <div class="stats-row">
        <mat-card class="stat-box good">
          <label>Overall Health</label>
          <div class="value">98%</div>
          <p class="delta">System-wide adherence</p>
        </mat-card>
        <mat-card class="stat-box warn">
          <label>Active Rule Violations</label>
          <div class="value">2</div>
          <p class="delta">Requires attention</p>
        </mat-card>
        <mat-card class="stat-box accent">
          <label>Last Audit</label>
          <div class="value small-text">Mar 16, 2026</div>
          <p class="delta">Conducted by System</p>
        </mat-card>
      </div>

      <mat-tab-group class="mt-6">
        <mat-tab label="Regulatory Rules">
          <div class="tab-content mt-4">
            <div class="rules-grid">
              @for (rule of rules(); track rule.id) {
                <mat-card class="rule-card">
                  <div class="rule-header">
                    <div class="rule-meta">
                      <span class="category-tag">{{ rule.category }}</span>
                      <strong>{{ rule.name }}</strong>
                    </div>
                    <mat-icon [color]="rule.isActive ? 'primary' : 'warn'">
                      {{ rule.isActive ? 'security' : 'warning' }}
                    </mat-icon>
                  </div>
                  <p class="rule-desc">{{ rule.description }}</p>
                  <mat-divider></mat-divider>
                  <div class="rule-footer">
                    <span class="status-indicator" [class.active]="rule.isActive">
                      {{ rule.isActive ? 'Active Enforcement' : 'Draft Mode' }}
                    </span>
                    <button mat-button color="primary">Configure</button>
                  </div>
                </mat-card>
              }
            </div>
          </div>
        </mat-tab>

        <mat-tab label="System Audit Trail">
          <div class="tab-content mt-4">
            <mat-card class="data-card">
              <table mat-table [dataSource]="audits()" class="w-full">
                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef>Event Time</th>
                  <td mat-cell *matCellDef="let row">{{ row.timestamp | date:'medium' }}</td>
                </ng-container>

                <ng-container matColumnDef="user">
                  <th mat-header-cell *matHeaderCellDef>Performed By</th>
                  <td mat-cell *matCellDef="let row">
                    <strong>{{ row.performedBy }}</strong>
                  </td>
                </ng-container>

                <ng-container matColumnDef="action">
                  <th mat-header-cell *matHeaderCellDef>Action</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="action-tag">{{ row.action }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="details">
                  <th mat-header-cell *matHeaderCellDef>Audit Context</th>
                  <td mat-cell *matCellDef="let row" class="details-cell">{{ row.details }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['timestamp', 'user', 'action', 'details']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['timestamp', 'user', 'action', 'details'];"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [`
    .compliance-shell { margin-top: 1.5rem; }
    .stats-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
    .stat-box { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .stat-box label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .stat-box .value { font-size: 2.25rem; font-weight: 800; margin: 0.5rem 0; color: #1e293b; }
    .stat-box .value.small-text { font-size: 1.5rem; line-height: 2.25rem; }
    .stat-box .delta { margin: 0; font-size: 0.8rem; font-weight: 600; color: #64748b; }
    .stat-box.good { border-top: 4px solid #10b981; }
    .stat-box.warn { border-top: 4px solid #f59e0b; }
    .stat-box.accent { border-top: 4px solid #3b82f6; }

    .rules-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.5rem; }
    .rule-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .rule-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
    .rule-meta { display: flex; flex-direction: column; gap: 0.25rem; }
    .category-tag { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #3b82f6; background: #eff6ff; padding: 0.1rem 0.5rem; border-radius: 4px; width: fit-content; }
    .rule-header strong { font-size: 1.05rem; color: #0f172a; }
    .rule-desc { font-size: 0.9rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
    .rule-footer { margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
    .status-indicator { font-size: 0.75rem; font-weight: 600; color: #94a3b8; display: flex; align-items: center; gap: 0.5rem; }
    .status-indicator.active { color: #10b981; }
    .status-indicator.active::before { content: ''; width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }

    .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .enterprise-grid { width: 100%; min-width: 900px; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
    
    .action-tag { font-size: 0.7rem; font-weight: 700; background: #f1f5f9; color: #475569; padding: 0.25rem 0.5rem; border-radius: 6px; text-transform: uppercase; }
    .details-cell { font-family: monospace; font-size: 0.8rem; color: #64748b; }

    @media (max-width: 768px) {
      .rules-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class CompliancePageComponent {
  private readonly complianceApi = inject(ComplianceService);

  protected readonly rules = toSignal(this.complianceApi.getRules(), { initialValue: [] });
  protected readonly audits = toSignal(this.complianceApi.getAuditTrails(), { initialValue: [] });

  protected onRunAudit(): void {
    // Implement run audit
  }
}
