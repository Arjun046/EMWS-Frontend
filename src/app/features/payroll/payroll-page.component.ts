import { Component, inject, signal, computed, OnInit } from '@angular/core';
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
import { AuthService } from '../../core/services/auth.service';
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
      [title]="isAdmin() ? 'Payroll Command Center' : 'My Earnings'" 
      [subtitle]="isAdmin() ? 'Monitor workforce expenditure, process payroll runs, and manage tax compliance.' : 'View your payment history, download digital payslips, and manage tax documentation.'" 
      [actionLabel]="isAdmin() ? 'Process All Pending' : ''"
      (action)="onProcessRun()"
    />

    <section class="payroll-shell">
      @if (isAdmin()) {
        <!-- Admin Summary View -->
        <div class="summary-ribbon mb-8">
          <mat-card class="summary-box">
            <label>Total Monthly Spend</label>
            <div class="value">{{ 124500 | currency:'USD' }}</div>
            <p class="delta text-green-600">↑ 4% vs last month</p>
          </mat-card>
          <mat-card class="summary-box">
            <label>Pending Disbursements</label>
            <div class="value warn">{{ pendingRuns().length }}</div>
            <p class="delta">Awaiting processing</p>
          </mat-card>
          <mat-card class="summary-box">
            <label>Tax Liabilities</label>
            <div class="value">{{ 32100 | currency:'USD' }}</div>
            <p class="delta">Next due: April 15</p>
          </mat-card>
        </div>
      }

      <mat-tab-group class="enterprise-tabs">
        @if (isAdmin()) {
          <mat-tab label="Workforce Payroll Run">
            <div class="tab-content mt-6">
              <mat-card class="data-card overflow-hidden">
                <div class="p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 class="font-bold m-0">Pending Payroll Run (Current Cycle)</h3>
                  <div class="flex gap-2">
                    <button mat-stroked-button color="primary">Export CSV</button>
                    <button mat-flat-button color="primary" (click)="onProcessRun()">Run Selected</button>
                  </div>
                </div>
                <table mat-table [dataSource]="pendingRuns()" class="w-full">
                  <ng-container matColumnDef="employee">
                    <th mat-header-cell *matHeaderCellDef>Staff Member</th>
                    <td mat-cell *matCellDef="let row">
                      <strong>Staff #{{row.employeeId}}</strong>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="period">
                    <th mat-header-cell *matHeaderCellDef>Pay Period</th>
                    <td mat-cell *matCellDef="let row">
                      {{row.payPeriodStart | date:'MMM dd'}} - {{row.payPeriodEnd | date:'MMM dd'}}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="gross">
                    <th mat-header-cell *matHeaderCellDef>Gross Pay</th>
                    <td mat-cell *matCellDef="let row">{{row.grossPay | currency:'USD'}}</td>
                  </ng-container>
                  <ng-container matColumnDef="net">
                    <th mat-header-cell *matHeaderCellDef>Net Amount</th>
                    <td mat-cell *matCellDef="let row"><strong>{{row.netPay | currency:'USD'}}</strong></td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let row" class="text-right">
                      <button mat-button color="primary" (click)="onProcessRun()">Process</button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="['employee', 'period', 'gross', 'net', 'actions']"></tr>
                  <tr mat-row *matRowDef="let row; columns: ['employee', 'period', 'gross', 'net', 'actions'];"></tr>
                </table>
              </mat-card>
            </div>
          </mat-tab>
        }

        <mat-tab label="My Payment Documents">
          <div class="tab-content mt-6">
            <div class="payroll-grid">
              <!-- Main Payslip Card -->
              <mat-card class="payslip-card main-card">
                <div class="card-header p-4 bg-slate-50 border-b flex justify-between items-center">
                  <h3 class="font-bold m-0">Latest Digital Payslip</h3>
                  <span class="status-pill PAID">PAID</span>
                </div>
                
                @if (latestPayslip()) {
                  <div class="payslip-body p-8">
                    <div class="pay-amount text-center mb-8">
                      <label class="text-xs uppercase font-bold text-slate-400 block mb-1">Net Payment</label>
                      <h2 class="text-5xl font-black text-slate-900 m-0">{{ latestPayslip()?.netPay | currency:'USD' }}</h2>
                      <p class="text-slate-500 mt-2">Paid on {{ latestPayslip()?.paymentDate | date:'longDate' }}</p>
                    </div>

                    <mat-divider></mat-divider>

                    <div class="pay-breakdown mt-8 grid gap-4">
                      <div class="breakdown-item flex justify-between">
                        <span class="text-slate-500">Gross Remuneration</span>
                        <strong class="text-slate-900">{{ latestPayslip()?.grossPay | currency:'USD' }}</strong>
                      </div>
                      <div class="breakdown-item flex justify-between text-red-600">
                        <span>Statutory Deductions</span>
                        <strong>-{{ latestPayslip()?.totalDeductions | currency:'USD' }}</strong>
                      </div>
                      <div class="breakdown-item flex justify-between pt-4 border-t border-dashed font-bold text-lg">
                        <span>Net Take Home</span>
                        <strong class="text-blue-600">{{ latestPayslip()?.netPay | currency:'USD' }}</strong>
                      </div>
                    </div>

                    <button mat-flat-button color="primary" class="w-full mt-8 py-3 rounded-xl font-bold">
                      <mat-icon class="mr-2">download</mat-icon> Download PDF Statement
                    </button>
                  </div>
                } @else {
                  <div class="empty-state p-12 text-center text-slate-400">
                    <mat-icon class="text-5xl mb-3">payments</mat-icon>
                    <p>No payment records found for this period.</p>
                  </div>
                }
              </mat-card>

              <!-- Earnings Overview -->
              <div class="side-metrics flex flex-col gap-6">
                <mat-card class="metric-card p-6">
                  <label class="text-xs uppercase font-bold text-slate-400 block mb-2">Year to Date (YTD)</label>
                  <div class="metric-value text-3xl font-black mb-3">{{ 45200 | currency:'USD' }}</div>
                  <mat-progress-bar mode="determinate" value="65" class="rounded-full h-2"></mat-progress-bar>
                  <p class="text-[10px] text-slate-400 mt-2">65% of annual projected earnings</p>
                </mat-card>

                <mat-card class="salary-box p-6">
                  <h3 class="font-bold mb-4">Salary Structure</h3>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Base Monthly</span>
                    <strong class="text-slate-900">{{ structure()?.basicSalary | currency:'USD' }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Fixed Allowances</span>
                    <strong class="text-slate-900">{{ structure()?.allowances | currency:'USD' }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Target Bonus</span>
                    <strong class="text-slate-900">{{ structure()?.bonus | currency:'USD' }}</strong>
                  </div>
                </mat-card>
              </div>
            </div>

            <!-- History Table -->
            <mat-card class="data-card mt-8 overflow-hidden">
              <div class="card-header p-4 bg-slate-50 border-b">
                <h3 class="font-bold m-0">Payment Archive</h3>
              </div>
              <table mat-table [dataSource]="history()" class="w-full">
                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef>Pay Period</th>
                  <td mat-cell *matCellDef="let row" class="font-medium">
                    {{row.payPeriodStart | date:'MMM dd'}} - {{row.payPeriodEnd | date:'MMM dd, yyyy'}}
                  </td>
                </ng-container>

                <ng-container matColumnDef="gross">
                  <th mat-header-cell *matHeaderCellDef>Gross</th>
                  <td mat-cell *matCellDef="let row">{{row.grossPay | currency:'USD'}}</td>
                </ng-container>

                <ng-container matColumnDef="net">
                  <th mat-header-cell *matHeaderCellDef>Net Amount</th>
                  <td mat-cell *matCellDef="let row"><strong class="text-blue-600">{{row.netPay | currency:'USD'}}</strong></td>
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
                    <button mat-icon-button color="primary"><mat-icon>visibility</mat-icon></button>
                    <button mat-icon-button color="primary"><mat-icon>file_download</mat-icon></button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="['period', 'gross', 'net', 'status', 'actions']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['period', 'gross', 'net', 'status', 'actions'];"></tr>
              </table>
            </mat-card>
          </div>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styles: [`
    .payroll-shell { margin-top: 1.5rem; }
    .payroll-grid { display: grid; grid-template-columns: 1fr 22rem; gap: 2rem; }
    
    .summary-ribbon { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
    .summary-box { padding: 1.5rem; border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .summary-box label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
    .summary-box .value { font-size: 2rem; font-weight: 900; margin: 0.25rem 0; color: #0f172a; }
    .summary-box .value.warn { color: #f59e0b; }
    .summary-box .delta { margin: 0; font-size: 0.8rem; font-weight: 700; }

    .main-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    .status-pill { padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.65rem; font-weight: 900; background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
    
    .side-metrics { display: flex; flex-direction: column; }
    .metric-card, .salary-box { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }

    .data-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }
    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; font-weight: 800; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }
    
    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    
    @media (max-width: 1024px) {
      .payroll-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class PayrollPageComponent implements OnInit {
  private readonly payrollApi = inject(PayrollService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  private readonly currentUserId = this.auth.user()?.id || 1;

  protected readonly history = toSignal(this.payrollApi.getPayrollHistory(this.currentUserId), { initialValue: [] });
  protected readonly pendingRuns = toSignal(this.payrollApi.getPendingPayroll(), { initialValue: [] });
  protected readonly structure = toSignal(this.payrollApi.getSalaryStructure(this.currentUserId));
  
  protected readonly latestPayslip = computed(() => {
    const all = this.history();
    return all.length > 0 ? all[0] : null;
  });

  ngOnInit() {}

  protected isAdmin(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  protected onProcessRun(): void {
    if (!this.isAdmin()) {
      this.snack.open('Access Denied: Admin privileges required.', 'OK', { duration: 3000 });
      return;
    }
    this.snack.open('Processing payroll cycle... Please wait.', 'OK', { duration: 5000 });
    // Simulate processing
    setTimeout(() => {
      this.snack.open('Payroll run completed successfully!', 'OK', { duration: 3000 });
      window.location.reload();
    }, 2000);
  }
}
