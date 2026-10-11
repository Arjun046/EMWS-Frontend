import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PayrollService, PayrollRecord, SalaryStructure, Deduction, PayrollPeriodExceptions } from '../../core/services/payroll.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-payroll-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    MatDividerModule, ReactiveFormsModule, DatePipe, CurrencyPipe,
    HasScopeDirective, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-payroll">
      
      @if (auth.hasAnyScope(['PAYROLL_TEAM_READ', 'PAYROLL_ORG_READ'])) {
        <!-- ADMIN/MANAGER VIEW -->
        <div class="filter-action-row">
          <div class="filter-ctrls-group">
            <div class="input-icon-wrap" style="width:320px;">
              <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
               <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;"
                      (keyup)="applyFilter($event)" placeholder="Search by name or status…" aria-label="Filter payroll records">
            </div>
          </div>
          <button class="ui-btn ui-btn-primary" (click)="openGenerateDrawer()" *appHasScope="'PAYROLL_RUN'">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">auto_fix_high</mat-icon>
            Generate Payroll
          </button>
          <button class="ui-btn" (click)="exportPeriod()" [disabled]="exporting()" *appHasScope="['PAYROLL_ORG_READ', 'PAYROLL_RUN']">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">download</mat-icon>
            {{ exporting() ? 'Exporting…' : 'Export period CSV' }}
          </button>
          <button class="ui-btn" (click)="openStructureDrawer()" *appHasScope="'PAYROLL_ORG_WRITE'">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">tune</mat-icon>
            Salary structure
          </button>
        </div>

        <div class="ui-card" style="padding:0; overflow:visible; border-radius:14px;">
          @if (exceptionsLoading()) {
            <p style="padding:1rem 1.5rem;color:var(--txt-muted);font-size:0.8rem;">Checking period reconciliation…</p>
          } @else if (exceptionsError()) {
            <div role="alert" style="margin:1rem 1.5rem 0;border-left:4px solid var(--warning);padding:0.6rem 0.8rem;font-size:0.8rem;">
              <strong>Reconciliation unavailable.</strong> Attendance may be down — figures below are unverified.
              <button class="ui-btn" style="margin-left:0.5rem;" (click)="loadExceptions()">Retry</button>
            </div>
          } @else if (periodExceptions(); as report) {
            @if (report.exceptions.length) {
              <div role="alert" style="margin:1rem 1.5rem 0;border-left:4px solid var(--danger);padding:0.6rem 0.8rem;font-size:0.8rem;">
                <strong>{{ report.exceptions.length }} reconciliation issue(s)</strong>
                ({{ report.lockedCount }} locked / {{ report.employeeCount }} in scope, {{ report.periodStart }} – {{ report.periodEnd }}).
                @for (e of report.exceptions.slice(0, 5); track e.employeeId + e.type) {
                  <div>• {{ getEmployeeName(e.employeeId) }} — {{ e.message }}</div>
                }
                @if (report.exceptions.length > 5) {
                  <div>…and {{ report.exceptions.length - 5 }} more. Export the period CSV for the full list.</div>
                }
              </div>
            } @else {
              <p style="margin:1rem 1.5rem 0;font-size:0.8rem;color:var(--success);">
                Period reconciled: {{ report.employeeCount }} in scope, {{ report.lockedCount }} locked, no open issues.
              </p>
            }
          }
          @if (isLoading()) {
            <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
              <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading payroll…</p>
            </div>
          } @else {
            <div class="table-container custom-scrollbar">
              <table mat-table [dataSource]="dataSource" matSort class="ui-table">
                
                <ng-container matColumnDef="personnel">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Employee</th>
                  <td mat-cell *matCellDef="let rec">
                     <div style="line-height:1.2">
                        <strong style="font-size:0.85rem;">{{ getEmployeeName(rec.employeeId) }}</strong><br>
                        <span class="text-mono" style="font-size:11px; color:var(--txt-muted)">Payroll #{{ rec.id }}</span>
                     </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Pay Period</th>
                  <td mat-cell *matCellDef="let rec">
                    <span style="font-weight:700;">{{ rec.payPeriodStart | date:'MMM yyyy' }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="gross">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Gross Pay</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono">
                    {{ rec.grossPay | currency }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="net">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Net Pay</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono" style="font-weight:800; color:var(--success);">
                    {{ rec.netPay | currency }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                  <td mat-cell *matCellDef="let rec">
                    <span class="ui-badge" [class.ui-badge-success]="rec.status === 'PAID'" 
                                          [class.ui-badge-warning]="rec.status === 'PENDING'">
                      {{ rec.status }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef style="text-align:right; width:80px;"></th>
                  <td mat-cell *matCellDef="let rec" style="text-align:right;">
                    <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger" aria-label="Row actions">
                      <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                      <button mat-menu-item (click)="openViewDrawer(rec)">
                        <mat-icon>visibility</mat-icon>
                        <span>View details</span>
                      </button>
                      <button mat-menu-item (click)="downloadPayslip(rec)">
                        <mat-icon>download</mat-icon>
                        <span>Export PDF</span>
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
              </table>
            </div>

            <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
              <span class="pag-counter-label">{{ dataSource.filteredData.length }} records</span>
              <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
            </div>
            @if (dataSource.filteredData.length === 0) {
              @if (recordsError()) {
                <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">
                  Could not load payroll records. <button class="ui-btn" (click)="loadPayrollData()">Retry</button>
                </div>
              } @else {
                <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No payroll records found.</div>
              }
            }
          }
        </div>
      } @else {
        <!-- EMPLOYEE SELF-SERVICE VIEW -->
        <div class="payroll-split-layout">
          <div class="payroll-calc-pane">
            <div class="ui-card">
              <div class="ui-card-header"><h3>My Base Salary</h3></div>
              @if (salaryStructure(); as s) {
                <div class="val-box text-mono" style="font-size:1.5rem; font-weight:900; color:var(--primary);">
                  {{ s.basicSalary | currency:(s.currency || 'USD') }}
                </div>
              } @else {
                <p style="color:var(--txt-muted);font-size:0.8rem;">No salary structure on record. Contact HR.</p>
              }
            </div>

            <div class="ui-card">
              <div class="ui-card-header"><h3>My Deductions</h3></div>
              @if (!myDeductions().length) {
                <p style="color:var(--txt-muted);font-size:0.8rem;">No deductions on record.</p>
              }
              @for (d of myDeductions(); track d.id) {
                <div class="ledger-row"><label>{{ d.name }} ({{ d.type }})</label><span class="text-mono">{{ d.type === 'PERCENTAGE' ? (d.value + '%') : (d.value | currency) }}</span></div>
              }
            </div>

            <div class="ui-card" style="padding:0; overflow:visible;">
              <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;"><h3>Pay History</h3></div>
              <div class="table-container custom-scrollbar" style="min-height:auto; max-height:400px;">
                 <table mat-table [dataSource]="dataSource" class="ui-table">
                    <ng-container matColumnDef="cycle">
                      <th mat-header-cell *matHeaderCellDef>Pay Period</th>
                     <td mat-cell *matCellDef="let row">
                       <div style="font-weight:700;">{{ row.payPeriodStart | date:'MMMM yyyy' }}</div>
                     </td>
                   </ng-container>
                   <ng-container matColumnDef="net">
                     <th mat-header-cell *matHeaderCellDef>Net Amount</th>
                     <td mat-cell *matCellDef="let row">
                       <span class="text-mono" style="font-weight:800; color:var(--success);">{{ row.netPay | currency }}</span>
                     </td>
                   </ng-container>
                   <tr mat-row *matRowDef="let row; columns: ['cycle', 'net'];" class="row-hover" (click)="selectedRecord.set(row)"></tr>
                </table>
              </div>
            </div>
          </div>

          <div class="payslip-pane">
             @if (selectedRecord() || latestPayslip(); as record) {
               <div class="ui-card payslip-container" style="border-radius:20px;">
                  <div class="payslip-header">
                     <div class="logo-stack">
                        <strong>EWMS Payroll</strong>
                        <span>Payslip #{{ record.id }}</span>
                     </div>
                     <div class="period-node">
                        <label>Period</label>
                        <strong>{{ record.payPeriodStart | date:'MMM yyyy' }}</strong>
                     </div>
                  </div>

                  <mat-divider style="margin:1.5rem 0;"></mat-divider>

                  <div class="payslip-meta">
                     <div><label>Employee</label><strong>{{ auth.user()?.name }}</strong></div>
                     <div style="text-align:right;"><label>Employee ID</label><strong class="text-mono">{{ auth.user()?.id }}</strong></div>
                  </div>

                  <div class="payslip-ledger mt-6">
                     <div class="ledger-row primary"><label>Gross Pay</label><span class="text-mono">{{ record.grossPay | currency }}</span></div>
                     <div class="ledger-row"><label>Allowances</label><span class="text-mono">{{ record.totalAllowances | currency }}</span></div>
                     <div class="ledger-row danger"><label>Deductions</label><span class="text-mono">-{{ record.totalDeductions | currency }}</span></div>
                  </div>

                  <div class="payslip-total mt-6">
                     <label>Net Pay</label>
                     <span class="text-mono">{{ record.netPay | currency }}</span>
                  </div>

                  <button class="ui-btn ui-btn-primary mt-6" style="width:100%; height:48px;" (click)="downloadPayslip(record)">
                     <mat-icon>download</mat-icon> Download PDF
                  </button>
               </div>
             }
          </div>
        </div>
      }

    </div>

    <!-- GENERATE PAYROLL DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="drawerTitle"
      [subtitle]="drawerSubtitle"
      [saveText]="drawerSaveText"
      [saveDisabled]="payrollForm.invalid"
      [showFooter]="currentMode !== 'view'"
      (close)="closeDrawer()"
      (save)="savePayroll()"
    >
      <form [formGroup]="payrollForm" class="drawer-crud-form">
        
        <div class="form-section">Employee & Period</div>
        <div class="f-group">
          <label>Employee</label>
          <select class="f-input" formControlName="employeeId">
            <option [value]="null">Select employee…</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeNumber }})</option>
            }
          </select>
        </div>

        <div class="form-section">Pay Period</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Start Date</label>
            <input class="f-input" type="date" formControlName="startDate">
          </div>
          <div class="f-group">
            <label>End Date</label>
            <input class="f-input" type="date" formControlName="endDate">
          </div>
        </div>

        @if (currentMode === 'view' && selectedRecord()) {
           <div class="form-section">Breakdown</div>
           <div class="detail-grid">
              <div class="f-group"><label>Basic Salary</label><div class="val-box text-mono">{{ selectedRecord()?.basicSalary | currency }}</div></div>
              <div class="f-group"><label>Allowances</label><div class="val-box text-mono">{{ selectedRecord()?.totalAllowances | currency }}</div></div>
              <div class="f-group"><label>Deductions</label><div class="val-box text-mono">{{ selectedRecord()?.totalDeductions | currency }}</div></div>
              <div class="f-group"><label>Attendance Records</label><div class="val-box text-mono">{{ selectedRecord()?.attendanceRecordCount }} records</div></div>
           </div>
        }

      </form>
    </app-side-sheet-drawer>

    <!-- SALARY STRUCTURE DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isStructureDrawerOpen"
      title="Salary Structure"
      subtitle="Create or update compensation bands per employee."
      saveText="Save structure"
      [saveDisabled]="structureForm.invalid"
      (close)="closeStructureDrawer()"
      (save)="saveStructure()"
    >
      <form [formGroup]="structureForm" class="drawer-crud-form">
        <div class="f-group">
          <label>Employee</label>
          <select class="f-input" formControlName="employeeId" (change)="onStructureEmployeeChange($any($event.target).value)">
            <option [value]="null">Select employee…</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }}</option>
            }
          </select>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Basic salary</label><input class="f-input" type="number" formControlName="basicSalary"></div>
          <div class="f-group"><label>Hourly rate</label><input class="f-input" type="number" formControlName="hourlyRate"></div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Currency</label><input class="f-input" formControlName="currency"></div>
          <div class="f-group"><label>Tax deduction</label><input class="f-input" type="number" formControlName="taxDeduction"></div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Housing allowance</label><input class="f-input" type="number" formControlName="housingAllowance"></div>
          <div class="f-group"><label>Transport allowance</label><input class="f-input" type="number" formControlName="transportAllowance"></div>
        </div>
      </form>
      <form [formGroup]="deductionForm" class="drawer-crud-form" style="margin-top:1rem;">
        <div class="form-section">Add deduction for this employee</div>
        <div class="f-grid">
          <div class="f-group"><label>Name</label><input class="f-input" formControlName="name" placeholder="e.g. Pension"></div>
          <div class="f-group"><label>Type</label>
            <select class="f-input" formControlName="type"><option value="FIXED">FIXED</option><option value="PERCENTAGE">PERCENTAGE</option></select>
          </div>
        </div>
        <div class="f-group"><label>Value</label><input class="f-input" type="number" formControlName="value"></div>
        <button type="button" class="ui-btn" [disabled]="deductionForm.invalid || !structureForm.value.employeeId" (click)="addDeduction()">Add deduction</button>
      </form>
    </app-side-sheet-drawer>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .payroll-split-layout { display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .mt-6 { margin-top: 1.5rem; }
    
    .table-container { min-height: 400px; position: relative; border-radius: 0 0 14px 14px; }
    .action-trigger:hover { background: var(--surface-2); }
    
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .f-group label { font-size: 0.75rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .f-input { height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); width: 100%; outline: none; transition: border-color 0.2s; }
    .f-input:focus { border-color: var(--primary); }
    .val-box { padding: 0.75rem 1rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: var(--txt-main); }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

    .payslip-container { padding: 2.5rem; background: var(--surface); box-shadow: var(--shadow-lg); }
    .payslip-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .logo-stack strong { font-size: 1.25rem; letter-spacing: -0.02em; display: block; }
    .logo-stack span { font-size: 0.65rem; color: var(--txt-muted); font-family: 'JetBrains Mono'; }
    .period-node { text-align: right; }
    .period-node label { font-size: 0.65rem; color: var(--txt-muted); text-transform: uppercase; display: block; }
    .payslip-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .payslip-meta label { font-size: 0.65rem; color: var(--txt-muted); text-transform: uppercase; display: block; margin-bottom: 0.25rem; }
    .payslip-ledger { display: flex; flex-direction: column; gap: 0.75rem; }
    .ledger-row { display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 0.85rem; border-bottom: 1px dashed var(--border); }
    .ledger-row.primary { color: var(--primary); font-weight: 700; }
    .ledger-row.danger { color: var(--danger); }
    .payslip-total { background: var(--surface-2); padding: 1.25rem; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; }
    .payslip-total label { font-size: 0.9rem; font-weight: 800; }
    .payslip-total span { font-size: 1.25rem; font-weight: 900; color: var(--success); }

    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }
  `]
})
export class PayrollPageComponent implements OnInit {
  private readonly payrollApi = inject(PayrollService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly fb = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected dataSource = new MatTableDataSource<PayrollRecord>([]);
  protected isLoading = signal(true);
  protected readonly recordsError = signal(false);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly salaryStructure = signal<SalaryStructure | null>(null);
  protected readonly displayedColumns = ['personnel', 'period', 'gross', 'net', 'status', 'actions'];
  /** Period reconciliation (managers): exceptions + locked counts for the current cycle. */
  protected readonly periodExceptions = signal<PayrollPeriodExceptions | null>(null);
  protected readonly exceptionsLoading = signal(false);
  protected readonly exceptionsError = signal(false);
  protected readonly exporting = signal(false);

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if (mp) this.dataSource.paginator = mp;
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if (ms) this.dataSource.sort = ms;
  }

  // Self-Service State
  protected readonly selectedRecord = signal<PayrollRecord | null>(null);
  protected readonly latestPayslip = computed(() => this.dataSource.data[0] ?? null);

  // Drawer State
  isDrawerOpen = false;
  drawerTitle = 'Run Payroll';
  drawerSubtitle = 'Generate a payroll record from attendance data.';
  drawerSaveText = 'Generate';
  currentMode: 'add' | 'view' = 'add';

  payrollForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]]
  });

  // Salary structure editor (PAYROLL_ORG_WRITE) + deductions
  protected readonly myDeductions = signal<Deduction[]>([]);
  isStructureDrawerOpen = false;
  structureForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    basicSalary: [0, [Validators.required, Validators.min(0)]],
    hourlyRate: [0],
    currency: ['USD', [Validators.required]],
    housingAllowance: [0],
    transportAllowance: [0],
    taxDeduction: [0]
  });
  deductionForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    type: ['FIXED', [Validators.required]],
    value: [0, [Validators.required, Validators.min(0)]]
  });

  ngOnInit() {
    this.loadPayrollData();
    if (this.auth.hasAnyScope(['PAYROLL_TEAM_READ', 'PAYROLL_ORG_READ'])) {
      this.loadExceptions();
    }
    this.payrollApi.getMySalaryStructure().subscribe({
      next: (s) => this.salaryStructure.set(s && s.basicSalary != null ? s : null),
      error: () => this.salaryStructure.set(null)
    });
    this.payrollApi.getMyDeductions().subscribe({
      next: (d) => this.myDeductions.set(d ?? []),
      error: () => this.myDeductions.set([])
    });
  }

  loadPayrollData() {
    this.isLoading.set(true);
    this.recordsError.set(false);
    const obs = this.auth.hasAnyScope(['PAYROLL_TEAM_READ', 'PAYROLL_ORG_READ'])
      ? this.payrollApi.getCompanyPendingPayroll()
      : this.payrollApi.getMyPayrollHistory();

    obs.pipe(
      catchError((err) => {
        this.recordsError.set(true);
        this.snack.open(backendErrorMessage(err, 'Could not load payroll records. Please try again.'), 'Retry', { duration: 5000 });
        return of([]);
      })
    ).subscribe(data => {
      this.dataSource.data = data;
      this.isLoading.set(false);
    });
  }

  /** Current-cycle reconciliation gaps (managers). Loud by design — a 503 means attendance is down, not "no issues". */
  loadExceptions() {
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const end = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    this.exceptionsLoading.set(true);
    this.exceptionsError.set(false);
    this.payrollApi.getPeriodExceptions(start, end).subscribe({
      next: (report) => {
        this.periodExceptions.set(report);
        this.exceptionsLoading.set(false);
      },
      error: (err) => {
        this.exceptionsLoading.set(false);
        this.exceptionsError.set(true);
        this.snack.open(backendErrorMessage(err, 'Reconciliation unavailable.'), 'Retry', { duration: 6000 });
      }
    });
  }

  /** Permission-gated BE export (processed + preview rows). Requires PAYROLL_ORG_READ or PAYROLL_RUN server-side. */
  exportPeriod() {
    const report = this.periodExceptions();
    const now = new Date();
    const start = report?.periodStart ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const end = report?.periodEnd ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
    this.exporting.set(true);
    this.payrollApi.exportPeriodCsv(start, end).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payroll-${start}_${end}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.exporting.set(false);
        this.snack.open('Payroll export downloaded.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.exporting.set(false);
        this.snack.open(backendErrorMessage(err, 'Export failed.'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // --- CRUD ACTIONS ---

  openGenerateDrawer() {
    this.currentMode = 'add';
    this.drawerTitle = 'Run Payroll';
    this.drawerSubtitle = 'Generate a payroll record from attendance data.';
    this.drawerSaveText = 'Generate';
    this.payrollForm.reset();
    this.payrollForm.enable();
    this.isDrawerOpen = true;
  }

  openViewDrawer(rec: PayrollRecord) {
    this.currentMode = 'view';
    this.selectedRecord.set(rec);
    this.drawerTitle = 'Payroll Details';
    this.drawerSubtitle = `Payroll #${rec.id} for ${this.getEmployeeName(rec.employeeId)}`;
    this.payrollForm.patchValue(rec);
    this.payrollForm.disable();
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
  }

  savePayroll() {
    if (this.payrollForm.invalid) return;
    this.isLoading.set(true);
    const { employeeId, startDate, endDate } = this.payrollForm.value;

    this.payrollApi.generatePayroll(employeeId, startDate, endDate).subscribe({
      next: () => {
        this.snack.open('Payroll generated.', 'OK', { duration: 3000 });
        this.loadPayrollData();
        this.closeDrawer();
      },
      error: (err) => {
        this.snack.open(backendErrorMessage(err, 'Could not generate payroll.'), 'Dismiss', { duration: 6000 });
        this.isLoading.set(false);
      }
    });
  }

  downloadPayslip(record: PayrollRecord) {
    if (!record.id) return;
    this.payrollApi.downloadPayslipPdf(record.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payslip-${record.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snack.open('Payslip downloaded.', 'OK', { duration: 3000 });
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not download payslip.'), 'Dismiss', { duration: 5000 })
    });
  }

  openStructureDrawer() {
    this.structureForm.reset({ currency: 'USD', hourlyRate: 0, housingAllowance: 0, transportAllowance: 0, taxDeduction: 0, basicSalary: 0 });
    this.isStructureDrawerOpen = true;
  }

  closeStructureDrawer() {
    this.isStructureDrawerOpen = false;
  }

  onStructureEmployeeChange(employeeId: number) {
    if (!employeeId) return;
    this.payrollApi.getSalaryStructure(Number(employeeId)).subscribe({
      next: (s) => this.structureForm.patchValue(s),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not load salary structure.'), 'Dismiss', { duration: 5000 })
    });
  }

  saveStructure() {
    if (this.structureForm.invalid) return;
    this.isLoading.set(true);
    this.payrollApi.saveSalaryStructure(this.structureForm.value).subscribe({
      next: () => {
        this.snack.open('Salary structure saved.', 'OK', { duration: 3000 });
        this.isLoading.set(false);
        this.closeStructureDrawer();
      },
      error: (err) => {
        this.snack.open(backendErrorMessage(err, 'Save failed.'), 'Dismiss', { duration: 6000 });
        this.isLoading.set(false);
      }
    });
  }

  addDeduction() {
    const employeeId = this.structureForm.value.employeeId;
    if (!employeeId || this.deductionForm.invalid) return;
    this.payrollApi.addDeduction({ ...this.deductionForm.value, employeeId: Number(employeeId) }).subscribe({
      next: () => {
        this.snack.open('Deduction added.', 'OK', { duration: 3000 });
        this.deductionForm.reset({ type: 'FIXED', value: 0 });
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Add failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  // --- HELPERS ---

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${id}`;
  }
}
