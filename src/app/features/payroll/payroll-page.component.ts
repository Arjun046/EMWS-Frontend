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
import { PayrollService, PayrollRecord, SalaryStructure } from '../../core/services/payroll.service';
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
                     (keyup)="applyFilter($event)" placeholder="Search fiscal records (name, status)...">
            </div>
          </div>
          <button class="ui-btn ui-btn-primary" (click)="openGenerateDrawer()" *appHasScope="'PAYROLL_RUN'">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">auto_fix_high</mat-icon>
            Generate Payroll
          </button>
        </div>

        <div class="ui-card" style="padding:0; overflow:visible; border-radius:14px;">
          @if (isLoading()) {
            <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
              <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Processing fiscal aggregates...</p>
            </div>
          } @else {
            <div class="table-container custom-scrollbar">
              <table mat-table [dataSource]="dataSource" matSort class="ui-table">
                
                <ng-container matColumnDef="personnel">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Personnel Identity</th>
                  <td mat-cell *matCellDef="let rec">
                     <div style="line-height:1.2">
                        <strong style="font-size:0.85rem;">{{ getEmployeeName(rec.employeeId) }}</strong><br>
                        <span class="text-mono" style="font-size:11px; color:var(--txt-muted)">NODE_FISCAL_{{ rec.id }}</span>
                     </div>
                  </td>
                </ng-container>

                <ng-container matColumnDef="period">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Fiscal Period</th>
                  <td mat-cell *matCellDef="let rec">
                    <span style="font-weight:700;">{{ rec.payPeriodStart | date:'MMM yyyy' }}</span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="gross">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Gross Settlement</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono">
                    {{ rec.grossPay | currency }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="net">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Net Settlement</th>
                  <td mat-cell *matCellDef="let rec" class="text-mono" style="font-weight:800; color:var(--success);">
                    {{ rec.netPay | currency }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef mat-sort-header>Lifecycle</th>
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
                    <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger">
                      <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                    </button>
                    <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                      <button mat-menu-item (click)="openViewDrawer(rec)">
                        <mat-icon>visibility</mat-icon>
                        <span>Inspect Statement</span>
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
              <span class="pag-counter-label">Historical fiscal packets synchronized.</span>
              <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
            </div>
          }
        </div>
      } @else {
        <!-- EMPLOYEE SELF-SERVICE VIEW -->
        <div class="payroll-split-layout">
          <div class="payroll-calc-pane">
            <div class="ui-card">
              <div class="ui-card-header"><h3>Base Salary Node</h3></div>
              <div class="val-box text-mono" style="font-size:1.5rem; font-weight:900; color:var(--primary);">
                {{ (salaryStructure()?.basicSalary || 2400) | currency }}
              </div>
            </div>

            <div class="ui-card" style="padding:0; overflow:visible;">
              <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;"><h3>Historical Registry</h3></div>
              <div class="table-container custom-scrollbar" style="min-height:auto; max-height:400px;">
                <table mat-table [dataSource]="dataSource" class="ui-table">
                   <ng-container matColumnDef="cycle">
                     <th mat-header-cell *matHeaderCellDef>Fiscal Cycle</th>
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
                        <strong>EWMS_FISCAL</strong>
                        <span>SYNC_NODE: {{ record.id }}X</span>
                     </div>
                     <div class="period-node">
                        <label>Period</label>
                        <strong>{{ record.payPeriodStart | date:'MMM yyyy' }}</strong>
                     </div>
                  </div>
                  
                  <mat-divider style="margin:1.5rem 0;"></mat-divider>

                  <div class="payslip-meta">
                     <div><label>Identity</label><strong>{{ auth.user()?.name }}</strong></div>
                     <div style="text-align:right;"><label>Node ID</label><strong class="text-mono">EMP-{{ auth.user()?.id }}</strong></div>
                  </div>

                  <div class="payslip-ledger mt-6">
                     <div class="ledger-row primary"><label>Core Operational Base</label><span class="text-mono">{{ record.grossPay | currency }}</span></div>
                     <div class="ledger-row"><label>Variable Adjustments</label><span class="text-mono">+$0.00</span></div>
                     <div class="ledger-row danger"><label>Deduction Protocol</label><span class="text-mono">-{{ record.totalDeductions | currency }}</span></div>
                  </div>

                  <div class="payslip-total mt-6">
                     <label>Net Settlement</label>
                     <span class="text-mono">{{ record.netPay | currency }}</span>
                  </div>

                  <button class="ui-btn ui-btn-primary mt-6" style="width:100%; height:48px;" (click)="downloadPayslip(record)">
                     <mat-icon>verified_user</mat-icon> Authenticate & Download PDF
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
        
        <div class="form-section">Fiscal Target</div>
        <div class="f-group">
          <label>Personnel Node</label>
          <select class="f-input" formControlName="employeeId">
            <option [value]="null">SELECT_PERSONNEL</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeNumber }})</option>
            }
          </select>
        </div>

        <div class="form-section">Cycle Configuration</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Cycle Start</label>
            <input class="f-input" type="date" formControlName="startDate">
          </div>
          <div class="f-group">
            <label>Cycle Termination</label>
            <input class="f-input" type="date" formControlName="endDate">
          </div>
        </div>

        @if (currentMode === 'view' && selectedRecord()) {
           <div class="form-section">Forensic Ledger</div>
           <div class="detail-grid">
              <div class="f-group"><label>Basic Base</label><div class="val-box text-mono">{{ selectedRecord()?.basicSalary | currency }}</div></div>
              <div class="f-group"><label>Allowances</label><div class="val-box text-mono">{{ selectedRecord()?.totalAllowances | currency }}</div></div>
              <div class="f-group"><label>Deductions</label><div class="val-box text-mono">{{ selectedRecord()?.totalDeductions | currency }}</div></div>
              <div class="f-group"><label>Attendance Nodes</label><div class="val-box text-mono">{{ selectedRecord()?.attendanceRecordCount }} Logs</div></div>
           </div>
        }

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
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly salaryStructure = toSignal(this.payrollApi.getMySalaryStructure());
  protected readonly displayedColumns = ['personnel', 'period', 'gross', 'net', 'status', 'actions'];

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
  drawerTitle = 'Generate Payroll';
  drawerSubtitle = 'Initializing fiscal aggregation protocol.';
  drawerSaveText = 'Authorize Cycle';
  currentMode: 'add' | 'view' = 'add';

  payrollForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]]
  });

  ngOnInit() {
    this.loadPayrollData();
  }

  loadPayrollData() {
    this.isLoading.set(true);
    const obs = this.auth.hasAnyScope(['PAYROLL_TEAM_READ', 'PAYROLL_ORG_READ'])
      ? this.payrollApi.getCompanyPendingPayroll() // Placeholder for actual list
      : this.payrollApi.getMyPayrollHistory();

    obs.pipe(
      catchError(() => {
        this.snack.open('FISCAL_SYNC_OFFLINE', 'OK', { duration: 4000 });
        return of([]);
      })
    ).subscribe(data => {
      this.dataSource.data = data;
      this.isLoading.set(false);
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // --- CRUD ACTIONS ---

  openGenerateDrawer() {
    this.currentMode = 'add';
    this.drawerTitle = 'Generate Fiscal Cycle';
    this.drawerSubtitle = 'Calculating aggregates from biometric telemetry nodes.';
    this.drawerSaveText = 'Process Payroll';
    this.payrollForm.reset();
    this.payrollForm.enable();
    this.isDrawerOpen = true;
  }

  openViewDrawer(rec: PayrollRecord) {
    this.currentMode = 'view';
    this.selectedRecord.set(rec);
    this.drawerTitle = 'Fiscal Node Inspection';
    this.drawerSubtitle = `Reviewing statement REF_${rec.id}`;
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
        this.snack.open('Fiscal Cycle Processed.', 'OK', { duration: 3000 });
        this.loadPayrollData();
        this.closeDrawer();
      },
      error: () => {
        this.snack.open('Fiscal Calculation Failure.', 'OK', { duration: 4000 });
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
        link.download = `PAYSLIP_${record.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.snack.open('Statement exported successfully.', 'OK', { duration: 3000 });
      }
    });
  }

  // --- HELPERS ---

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `NODE_${id}`;
  }
}
