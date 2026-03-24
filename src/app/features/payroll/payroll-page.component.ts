import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { PayrollService, PayrollRecord, SalaryStructure } from '../../core/services/payroll.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-payroll-page',
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
    MatProgressBarModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    CurrencyPipe,
    DatePipe
  ],
  template: `
    <app-page-header 
      title="Payroll & Earnings" 
      subtitle="View your payment history, download digital payslips, and manage tax documentation." 
      actionLabel="Process Run"
      (action)="onProcessRun()"
    />

    <section class="payroll-shell">
      <div class="payroll-grid">
        <!-- Main Payslip Card -->
        <mat-card class="payslip-card main-card">
          <div class="card-header">
            <h3>Latest Digital Payslip</h3>
            <span class="status-pill PAID">PAID</span>
          </div>
          
          @if (latestPayslip()) {
            <div class="payslip-body">
              <div class="pay-amount">
                <label>Net Payment</label>
                <h2>{{ latestPayslip()?.netPay | currency:'USD' }}</h2>
                <p>Paid on {{ latestPayslip()?.paymentDate | date:'longDate' }}</p>
              </div>

              <mat-divider></mat-divider>

              <div class="pay-breakdown">
                <div class="breakdown-item">
                  <span>Gross Pay</span>
                  <strong>{{ latestPayslip()?.grossPay | currency:'USD' }}</strong>
                </div>
                <div class="breakdown-item text-warn">
                  <span>Deductions</span>
                  <strong>-{{ latestPayslip()?.totalDeductions | currency:'USD' }}</strong>
                </div>
                <div class="breakdown-item highlight">
                  <span>Take Home</span>
                  <strong>{{ latestPayslip()?.netPay | currency:'USD' }}</strong>
                </div>
              </div>

              <button mat-flat-button color="primary" class="w-full mt-4">
                <mat-icon>download</mat-icon> Download PDF Statement
              </button>
            </div>
          } @else {
            <div class="empty-state">No payment records found.</div>
          }
        </mat-card>

        <!-- Earnings Overview -->
        <div class="side-metrics">
          <mat-card class="metric-card">
            <label>Year to Date (YTD)</label>
            <div class="metric-value">{{ 45200 | currency:'USD' }}</div>
            <mat-progress-bar mode="determinate" value="65"></mat-progress-bar>
          </mat-card>

          <mat-card class="salary-box">
            <h3>Salary Structure</h3>
            <div class="struct-row">
              <span>Base Monthly</span>
              <strong>{{ structure()?.basicSalary | currency:'USD' }}</strong>
            </div>
            <div class="struct-row">
              <span>Allowances</span>
              <strong>{{ structure()?.allowances | currency:'USD' }}</strong>
            </div>
            <div class="struct-row">
              <span>Performance Bonus</span>
              <strong>{{ structure()?.bonus | currency:'USD' }}</strong>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- History Table -->
      <mat-card class="data-card mt-6">
        <div class="card-header-alt">
          <h3>Payment History</h3>
        </div>
        <table mat-table [dataSource]="history()" class="w-full">
          <ng-container matColumnDef="period">
            <th mat-header-cell *matHeaderCellDef>Pay Period</th>
            <td mat-cell *matCellDef="let row">
              {{row.payPeriodStart | date:'MMM dd'}} - {{row.payPeriodEnd | date:'MMM dd, yyyy'}}
            </td>
          </ng-container>

          <ng-container matColumnDef="gross">
            <th mat-header-cell *matHeaderCellDef>Gross</th>
            <td mat-cell *matCellDef="let row">{{row.grossPay | currency:'USD'}}</td>
          </ng-container>

          <ng-container matColumnDef="net">
            <th mat-header-cell *matHeaderCellDef>Net Amount</th>
            <td mat-cell *matCellDef="let row"><strong>{{row.netPay | currency:'USD'}}</strong></td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let row">
              <app-status-badge [value]="row.status" />
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let row" class="text-right">
              <button mat-icon-button title="View Details"><mat-icon>visibility</mat-icon></button>
              <button mat-icon-button title="Download PDF"><mat-icon>file_download</mat-icon></button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="['period', 'gross', 'net', 'status', 'actions']"></tr>
          <tr mat-row *matRowDef="let row; columns: ['period', 'gross', 'net', 'status', 'actions'];"></tr>
        </table>
      </mat-card>
    </section>
  `,
  styles: [`
    .payroll-shell { margin-top: 1.5rem; }
    .payroll-grid { display: grid; grid-template-columns: 1fr 22rem; gap: 1.5rem; }
    
    .main-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .card-header { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
    .card-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
    
    .status-pill { padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.7rem; font-weight: 800; background: #f0fdf4; color: #16a34a; }
    
    .payslip-body { padding: 2rem; }
    .pay-amount { text-align: center; margin-bottom: 2rem; }
    .pay-amount label { font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .pay-amount h2 { font-size: 3rem; font-weight: 800; color: #0f172a; margin: 0.5rem 0; }
    .pay-amount p { margin: 0; color: #64748b; font-size: 0.9rem; }

    .pay-breakdown { margin-top: 2rem; display: grid; gap: 1rem; }
    .breakdown-item { display: flex; justify-content: space-between; align-items: center; font-size: 0.95rem; }
    .breakdown-item.highlight { padding-top: 1rem; border-top: 1px dashed #e2e8f0; font-size: 1.1rem; }
    .text-warn { color: #ef4444; }

    .side-metrics { display: grid; gap: 1.5rem; }
    .metric-card { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .metric-card label { font-size: 0.75rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .metric-value { font-size: 1.75rem; font-weight: 800; margin: 0.5rem 0 1rem; }

    .salary-box { padding: 1.5rem; border-radius: 1.2rem; border: 1px solid #e2e8f0; }
    .salary-box h3 { margin: 0 0 1.25rem; font-size: 1rem; font-weight: 700; }
    .struct-row { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.9rem; }
    .struct-row span { color: #64748b; }

    .data-card { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .card-header-alt { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; }
    .card-header-alt h3 { margin: 0; font-size: 1rem; font-weight: 700; }
    
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-4 { margin-top: 1rem; }
    
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
    .empty-state { padding: 3rem; text-align: center; color: #94a3b8; }

    @media (max-width: 1024px) {
      .payroll-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PayrollPageComponent {
  private readonly payrollApi = inject(PayrollService);
  private readonly snack = inject(MatSnackBar);

  private readonly currentUserId = 1;

  protected readonly history = toSignal(this.payrollApi.getPayrollHistory(this.currentUserId), { initialValue: [] });
  protected readonly structure = toSignal(this.payrollApi.getSalaryStructure(this.currentUserId));
  
  protected readonly latestPayslip = computed(() => {
    const all = this.history();
    return all.length > 0 ? all[0] : null;
  });

  protected onProcessRun(): void {
    this.snack.open('Payroll cycle management is limited to administrators.', 'OK', { duration: 3000 });
  }
}
