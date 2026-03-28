import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { PayrollRecord, PayrollService, SalaryStructure } from '../../core/services/payroll.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

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
      [subtitle]="isAdmin() ? 'Monitor workforce expenditure, process payroll runs, and lock attendance-backed snapshots.' : 'View your payment history, locked payroll snapshots, and current pay structure.'"
      [actionLabel]="isAdmin() ? 'Process All Pending' : ''"
      (action)="onProcessRun()"
    />

    <section class="payroll-shell">
      @if (isAdmin()) {
        <div class="summary-ribbon mb-8">
          <mat-card class="summary-box">
            <label>Processed This Cycle</label>
            <div class="value">{{ currentCycleNet() | currency:currencyCode() }}</div>
            <p class="delta">Locked payroll output</p>
          </mat-card>
          <mat-card class="summary-box">
            <label>Pending Disbursements</label>
            <div class="value warn">{{ pendingRuns().length }}</div>
            <p class="delta">Current cycle reviews</p>
          </mat-card>
          <mat-card class="summary-box">
            <label>Locked Snapshots</label>
            <div class="value">{{ lockedRunsCount() }}</div>
            <p class="delta">Immutable run records</p>
          </mat-card>
        </div>
      }

      <mat-tab-group class="enterprise-tabs">
        @if (isAdmin()) {
          <mat-tab label="Workforce Payroll Run">
            <div class="tab-content mt-6">
              <mat-card class="data-card overflow-hidden">
                <div class="card-header bg-slate-50 border-b">
                  <div>
                    <h3 class="font-bold m-0">Pending Payroll Run (Current Cycle)</h3>
                    <p class="subtle-copy m-0">Live attendance previews stay editable until a run is processed and locked.</p>
                  </div>
                  <div class="header-actions">
                    <button mat-stroked-button color="primary" [disabled]="isLoading() || isProcessing()" (click)="loadPayrollData(true)">
                      Refresh
                    </button>
                    <button mat-flat-button color="primary" [disabled]="pendingRuns().length === 0 || isProcessing()" (click)="onProcessRun()">
                      {{ isProcessing() ? 'Processing...' : 'Run All Pending' }}
                    </button>
                  </div>
                </div>

                @if (pendingRuns().length > 0) {
                  <table mat-table [dataSource]="pendingRuns()" class="w-full">
                    <ng-container matColumnDef="employee">
                      <th mat-header-cell *matHeaderCellDef>Staff Member</th>
                      <td mat-cell *matCellDef="let row">
                        <strong>Staff #{{ row.employeeId }}</strong>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="period">
                      <th mat-header-cell *matHeaderCellDef>Pay Period</th>
                      <td mat-cell *matCellDef="let row">
                        {{ row.payPeriodStart | date:'MMM dd' }} - {{ row.payPeriodEnd | date:'MMM dd, yyyy' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="source">
                      <th mat-header-cell *matHeaderCellDef>Data Source</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="source-chip" [class.live]="row.dataSource !== 'SNAPSHOT'">
                          {{ formatDataSource(row.dataSource) }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="hours">
                      <th mat-header-cell *matHeaderCellDef>Attendance</th>
                      <td mat-cell *matCellDef="let row">
                        <strong>{{ row.attendanceTotalHours }}</strong> hrs
                        <p class="table-subcopy">{{ row.attendanceOvertimeHours }} overtime | {{ row.attendanceRecordCount }} records</p>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="gross">
                      <th mat-header-cell *matHeaderCellDef>Gross Pay</th>
                      <td mat-cell *matCellDef="let row">{{ row.grossPay | currency:currencyCode() }}</td>
                    </ng-container>

                    <ng-container matColumnDef="net">
                      <th mat-header-cell *matHeaderCellDef>Net Amount</th>
                      <td mat-cell *matCellDef="let row"><strong>{{ row.netPay | currency:currencyCode() }}</strong></td>
                    </ng-container>

                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let row" class="text-right">
                        <button mat-button color="primary" [disabled]="isProcessing()" (click)="onProcessRun(row)">Process</button>
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="adminColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: adminColumns;"></tr>
                  </table>
                } @else {
                  <div class="empty-state p-12 text-center text-slate-400">
                    <mat-icon class="text-5xl mb-3">task_alt</mat-icon>
                    <p>No pending payroll previews remain for the current cycle.</p>
                  </div>
                }
              </mat-card>
            </div>
          </mat-tab>
        }

        <mat-tab label="My Payment Documents">
          <div class="tab-content mt-6">
            <div class="payroll-grid">
              <mat-card class="payslip-card main-card">
                <div class="card-header bg-slate-50 border-b">
                  <h3 class="font-bold m-0">Latest Digital Payslip</h3>
                  <span class="status-pill" [class.live]="latestPayslip() ? latestPayslip()!.dataSource !== 'SNAPSHOT' : false">
                    {{ latestPayslip() ? formatDataSource(latestPayslip()!.dataSource) : 'No Record' }}
                  </span>
                </div>

                @if (latestPayslip(); as payslip) {
                  <div class="payslip-body p-8">
                    <div class="pay-amount text-center mb-8">
                      <label class="text-xs uppercase font-bold text-slate-400 block mb-1">Net Payment</label>
                      <h2 class="text-5xl font-black text-slate-900 m-0">{{ payslip.netPay | currency:currencyCode() }}</h2>
                      <p class="text-slate-500 mt-2">
                        Processed {{ payslip.processedDate | date:'longDate' }}
                        @if (payslip.locked) {
                          <span>| Locked snapshot</span>
                        }
                      </p>
                    </div>

                    <mat-divider></mat-divider>

                    <div class="pay-breakdown mt-8 grid gap-4">
                      <div class="breakdown-item flex justify-between">
                        <span class="text-slate-500">Gross Remuneration</span>
                        <strong class="text-slate-900">{{ payslip.grossPay | currency:currencyCode() }}</strong>
                      </div>
                      <div class="breakdown-item flex justify-between text-red-600">
                        <span>Statutory Deductions</span>
                        <strong>-{{ payslip.totalDeductions | currency:currencyCode() }}</strong>
                      </div>
                      <div class="breakdown-item flex justify-between">
                        <span class="text-slate-500">Attendance Snapshot</span>
                        <strong class="text-slate-900">{{ payslip.attendanceTotalHours }} hrs</strong>
                      </div>
                      <div class="breakdown-item flex justify-between pt-4 border-t border-dashed font-bold text-lg">
                        <span>Net Take Home</span>
                        <strong class="text-blue-600">{{ payslip.netPay | currency:currencyCode() }}</strong>
                      </div>
                    </div>

                    <p class="audit-note mt-8">
                      Snapshot captured {{ payslip.attendanceCapturedAt | date:'medium' }} from
                      {{ payslip.attendanceRecordCount }} attendance records.
                    </p>
                  </div>
                } @else {
                  <div class="empty-state p-12 text-center text-slate-400">
                    <mat-icon class="text-5xl mb-3">payments</mat-icon>
                    <p>No payment records found for this period.</p>
                  </div>
                }
              </mat-card>

              <div class="side-metrics flex flex-col gap-6">
                <mat-card class="metric-card p-6">
                  <label class="text-xs uppercase font-bold text-slate-400 block mb-2">Year to Date (YTD)</label>
                  <div class="metric-value text-3xl font-black mb-3">{{ ytdNetPay() | currency:currencyCode() }}</div>
                  <mat-progress-bar mode="determinate" [value]="annualProgress()" class="rounded-full h-2"></mat-progress-bar>
                  <p class="text-[10px] text-slate-400 mt-2">{{ annualProgress() }}% of projected annual net pay</p>
                </mat-card>

                <mat-card class="salary-box p-6">
                  <h3 class="font-bold mb-4">Salary Structure</h3>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Base Monthly</span>
                    <strong class="text-slate-900">{{ structure()?.basicSalary | currency:currencyCode() }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Housing</span>
                    <strong class="text-slate-900">{{ structure()?.housingAllowance | currency:currencyCode() }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Transport</span>
                    <strong class="text-slate-900">{{ structure()?.transportAllowance | currency:currencyCode() }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm mb-3">
                    <span class="text-slate-500">Tax Deduction</span>
                    <strong class="text-slate-900">{{ structure()?.taxDeduction | currency:currencyCode() }}</strong>
                  </div>
                  <div class="struct-row flex justify-between text-sm">
                    <span class="text-slate-500">Hourly Rate</span>
                    <strong class="text-slate-900">{{ structure()?.hourlyRate || 0 | currency:currencyCode() }}</strong>
                  </div>
                </mat-card>
              </div>
            </div>

            <mat-card class="data-card mt-8 overflow-hidden">
              <div class="card-header bg-slate-50 border-b">
                <h3 class="font-bold m-0">Payment Archive</h3>
              </div>
              @if (history().length > 0) {
                <table mat-table [dataSource]="history()" class="w-full">
                  <ng-container matColumnDef="period">
                    <th mat-header-cell *matHeaderCellDef>Pay Period</th>
                    <td mat-cell *matCellDef="let row" class="font-medium">
                      {{ row.payPeriodStart | date:'MMM dd' }} - {{ row.payPeriodEnd | date:'MMM dd, yyyy' }}
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="source">
                    <th mat-header-cell *matHeaderCellDef>Source</th>
                    <td mat-cell *matCellDef="let row">
                      <span class="source-chip" [class.live]="row.dataSource !== 'SNAPSHOT'">
                        {{ formatDataSource(row.dataSource) }}
                      </span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="gross">
                    <th mat-header-cell *matHeaderCellDef>Gross</th>
                    <td mat-cell *matCellDef="let row">{{ row.grossPay | currency:currencyCode() }}</td>
                  </ng-container>

                  <ng-container matColumnDef="net">
                    <th mat-header-cell *matHeaderCellDef>Net Amount</th>
                    <td mat-cell *matCellDef="let row"><strong class="text-blue-600">{{ row.netPay | currency:currencyCode() }}</strong></td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let row">
                      <app-status-badge [value]="row.locked ? 'LOCKED' : row.status" />
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="attendance">
                    <th mat-header-cell *matHeaderCellDef>Attendance Snapshot</th>
                    <td mat-cell *matCellDef="let row">
                      {{ row.attendanceTotalHours }} hrs
                      <p class="table-subcopy">{{ row.attendanceOvertimeHours }} overtime | {{ row.attendanceRecordCount }} records</p>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: historyColumns;"></tr>
                </table>
              } @else {
                <div class="empty-state p-12 text-center text-slate-400">
                  <mat-icon class="text-5xl mb-3">receipt_long</mat-icon>
                  <p>No payroll history is available for this account yet.</p>
                </div>
              }
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
    .summary-box .delta { margin: 0; font-size: 0.8rem; font-weight: 700; color: #64748b; }
    .subtle-copy { color: #64748b; font-size: 0.8rem; margin-top: 0.35rem; }

    .main-card,
    .metric-card,
    .salary-box,
    .data-card { border-radius: 1.5rem; border: 1px solid #e2e8f0; box-shadow: none !important; }

    .card-header { padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center; }
    .status-pill { padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.65rem; font-weight: 900; background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
    .status-pill.live { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .source-chip { display: inline-flex; align-items: center; padding: 0.25rem 0.65rem; border-radius: 999px; background: #ecfdf5; color: #047857; font-size: 0.7rem; font-weight: 800; border: 1px solid #a7f3d0; }
    .source-chip.live { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }

    .header-actions { display: flex; gap: 0.75rem; align-items: center; }
    .side-metrics { display: flex; flex-direction: column; }
    .table-subcopy { margin: 0.2rem 0 0; color: #64748b; font-size: 0.75rem; }
    .audit-note { margin: 0; color: #64748b; font-size: 0.85rem; line-height: 1.5; }

    th { background: #f8fafc; text-transform: uppercase; font-size: 0.7rem; letter-spacing: 0.1em; font-weight: 800; color: #64748b; }
    td { border-bottom: 1px solid #f1f5f9; padding: 1rem !important; }

    .w-full { width: 100%; }
    .text-right { text-align: right; }
    .mb-8 { margin-bottom: 2rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mt-8 { margin-top: 2rem; }
    .p-8 { padding: 2rem; }
    .p-12 { padding: 3rem; }
    .overflow-hidden { overflow: hidden; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-black { font-weight: 900; }
    .rounded-full { border-radius: 999px; }
    .h-2 { height: 0.5rem; }
    .text-blue-600 { color: #2563eb; }
    .text-red-600 { color: #dc2626; }
    .text-slate-400 { color: #94a3b8; }
    .text-slate-500 { color: #64748b; }
    .text-slate-900 { color: #0f172a; }
    .text-5xl { font-size: 3rem; }
    .text-3xl { font-size: 1.875rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xs { font-size: 0.75rem; }
    .uppercase { text-transform: uppercase; }
    .block { display: block; }
    .grid { display: grid; }
    .gap-4 { gap: 1rem; }
    .justify-between { display: flex; justify-content: space-between; }
    .items-center { align-items: center; }
    .border-b { border-bottom: 1px solid #e2e8f0; }
    .border-dashed { border-style: dashed; }
    .border-t { border-top: 1px solid #cbd5e1; }
    .bg-slate-50 { background: #f8fafc; }
    .m-0 { margin: 0; }
    .mb-1 { margin-bottom: 0.25rem; }
    .mb-3 { margin-bottom: 0.75rem; }
    .mt-2 { margin-top: 0.5rem; }

    @media (max-width: 1024px) {
      .payroll-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .card-header { flex-direction: column; align-items: flex-start; gap: 1rem; }
      .header-actions { width: 100%; flex-wrap: wrap; }
      .header-actions button { flex: 1 1 10rem; }
    }
  `]
})
export class PayrollPageComponent implements OnInit {
  private readonly payrollApi = inject(PayrollService);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly socket = inject(WidgetSocketService);

  protected readonly adminColumns = ['employee', 'period', 'source', 'hours', 'gross', 'net', 'actions'];
  protected readonly historyColumns = ['period', 'source', 'gross', 'net', 'status', 'attendance'];
  protected readonly history = signal<PayrollRecord[]>([]);
  protected readonly pendingRuns = signal<PayrollRecord[]>([]);
  protected readonly structure = signal<SalaryStructure | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly isProcessing = signal(false);

  protected readonly latestPayslip = computed(() => this.history()[0] ?? null);
  protected readonly currencyCode = computed(() => this.structure()?.currency || 'USD');
  protected readonly ytdNetPay = computed(() =>
    this.history()
      .filter((record) => new Date(record.payPeriodEnd).getFullYear() === new Date().getFullYear())
      .reduce((sum, record) => sum + Number(record.netPay || 0), 0)
  );
  protected readonly annualProjection = computed(() => Number(this.structure()?.basicSalary || 0) * 12);
  protected readonly annualProgress = computed(() => {
    const projection = this.annualProjection();
    if (!projection) {
      return 0;
    }
    return Math.min(100, Math.round((this.ytdNetPay() / projection) * 100));
  });
  protected readonly currentCycleNet = computed(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return this.history()
      .filter((record) => {
        const payPeriodEnd = new Date(record.payPeriodEnd);
        return payPeriodEnd.getMonth() === currentMonth && payPeriodEnd.getFullYear() === currentYear;
      })
      .reduce((sum, record) => sum + Number(record.netPay || 0), 0);
  });
  protected readonly lockedRunsCount = computed(() => this.history().filter((record) => record.locked).length);

  constructor() {
    effect(() => {
      const latestEvent = this.socket.events()[0];
      if (latestEvent?.topic === '/topic/widgets/payroll') {
        this.loadPayrollData(false);
      }
    });
  }

  ngOnInit(): void {
    this.socket.connect();
    this.loadPayrollData();
  }

  protected isAdmin(): boolean {
    const role = this.auth.user()?.role;
    return role === 'ADMIN' || role === 'MANAGER';
  }

  protected onProcessRun(record?: PayrollRecord): void {
    if (!this.isAdmin()) {
      this.snack.open('Access Denied: Admin privileges required.', 'OK', { duration: 3000 });
      return;
    }

    if (this.isProcessing()) {
      return;
    }

    const runs = record ? [record] : this.pendingRuns();
    if (!runs.length) {
      this.snack.open('No pending payroll previews are available.', 'OK', { duration: 3000 });
      return;
    }

    this.isProcessing.set(true);
    forkJoin(
      runs.map((pendingRun) => this.payrollApi.generatePayroll(pendingRun.employeeId, pendingRun.payPeriodStart, pendingRun.payPeriodEnd))
    ).pipe(
      finalize(() => this.isProcessing.set(false))
    ).subscribe({
      next: (processedRuns) => {
        const message = processedRuns.length === 1
          ? `Payroll locked for employee #${processedRuns[0].employeeId}.`
          : `${processedRuns.length} payroll runs locked successfully.`;
        this.snack.open(message, 'OK', { duration: 4000 });
        this.loadPayrollData(false);
      },
      error: () => {
        this.snack.open('Payroll processing failed. No fallback live mutation was applied.', 'OK', { duration: 5000 });
      }
    });
  }

  protected loadPayrollData(showToast = false): void {
    const currentUserId = this.auth.user()?.id || 1;
    this.isLoading.set(true);

    forkJoin({
      history: this.payrollApi.getPayrollHistory(currentUserId),
      pendingRuns: this.isAdmin() ? this.payrollApi.getPendingPayroll() : of([]),
      structure: this.payrollApi.getSalaryStructure(currentUserId).pipe(catchError(() => of(null)))
    }).pipe(
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: ({ history, pendingRuns, structure }) => {
        this.history.set(history);
        this.pendingRuns.set(pendingRuns);
        this.structure.set(structure);

        if (showToast) {
          this.snack.open('Payroll data refreshed.', 'OK', { duration: 2500 });
        }
      },
      error: () => {
        this.snack.open('Unable to load payroll data right now.', 'OK', { duration: 4000 });
      }
    });
  }

  protected formatDataSource(source: string | undefined): string {
    return source === 'SNAPSHOT' ? 'Snapshotted' : 'Live Preview';
  }
}
