import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { ComplianceService, AuditTrail, ComplianceRule } from '../../core/services/compliance.service';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { FormsModule } from '@angular/forms';
import { forkJoin, catchError, of } from 'rxjs';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-compliance-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    DatePipe, FormsModule, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-compliance">
      
      <div class="filter-action-row">
        <div>
           <h2 style="margin:0; font-size:1.5rem; font-weight:800; letter-spacing:-0.03em;">Compliance & Audit</h2>
           <p style="margin:0.25rem 0 0; font-size:0.85rem; color:var(--txt-muted);">Audit records, compliance rules, and shift checks.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="verifyLedger()">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">verified_user</mat-icon>
          Check Integrity
        </button>
      </div>

      <div class="dashboard-kpi-row mt-6">
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Record Completeness</span>
              <span class="ui-badge" [ngClass]="integrity().anomalies ? 'ui-badge-danger' : 'ui-badge-success'">{{ integrity().label }}</span>
           </div>
           <div class="kpi-metric-value">{{ integrity().score }}%</div>
        </div>
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Audit Records</span>
              <span class="ui-badge ui-badge-success">Live</span>
           </div>
           <div class="kpi-metric-value">{{ dataSource.data.length }}</div>
        </div>
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Active Rules</span>
              <span class="ui-badge ui-badge-warning">Live</span>
           </div>
           <div class="kpi-metric-value">{{ activeRules() }}/{{ rules().length }}</div>
        </div>
      </div>

      <div class="ui-card mt-6" style="border-radius:14px;">
        <div class="ui-card-header"><h3>Shift compliance check</h3></div>
        <div class="f-grid">
          <div class="f-group"><label>Employee ID</label><input class="f-input" type="number" [(ngModel)]="check.employeeId"></div>
          <div class="f-group"><label>New shift hours</label><input class="f-input" type="number" [(ngModel)]="check.newHours"></div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Current weekly total (hrs)</label><input class="f-input" type="number" [(ngModel)]="check.weeklyTotal"></div>
          <div class="f-group"><label>Break taken?</label>
            <select class="f-input" [(ngModel)]="check.breakTaken"><option [ngValue]="true">Yes</option><option [ngValue]="false">No</option></select>
          </div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Last shift end</label><input class="f-input" type="datetime-local" [(ngModel)]="check.lastEnd"></div>
          <div class="f-group"><label>New shift start</label><input class="f-input" type="datetime-local" [(ngModel)]="check.newStart"></div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Current daily total (hrs)</label><input class="f-input" type="number" [(ngModel)]="check.dailyTotal"></div>
          <div class="f-group"><label>Schedule published at</label><input class="f-input" type="datetime-local" [(ngModel)]="check.publishedAt"></div>
        </div>
        <div class="f-grid">
          <div class="f-group"><label>Good-faith estimated hrs</label><input class="f-input" type="number" [(ngModel)]="check.estHours"></div>
          <div class="f-group"><label>Good-faith actual hrs</label><input class="f-input" type="number" [(ngModel)]="check.actualHours"></div>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="runCheck()" [disabled]="checking()">Run compliance check</button>
        @for (r of checkResults(); track r.name) {
          <div style="display:flex;gap:0.5rem;align-items:flex-start;margin-top:0.75rem;font-size:0.85rem;">
            <span class="ui-badge" [ngClass]="r.violations.length ? 'ui-badge-danger' : 'ui-badge-success'">{{ r.violations.length ? 'FAIL' : 'PASS' }}</span>
            <div>
              <strong>{{ r.name }}</strong>
              @if (r.violations.length) {
                <ul style="margin:0.25rem 0 0;padding-left:1.25rem;">
                  @for (v of r.violations; track v) {
                    <li>{{ v }}</li>
                  }
                </ul>
              }
            </div>
          </div>
        }
      </div>

      <div class="ui-card mt-6" style="padding:0; overflow:hidden; border-radius:14px;">
        <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;">
           <h3>Audit Records</h3>
            <div style="display:flex; gap:0.5rem;">
              <input type="text" class="f-input" style="width:240px; height:36px; border-radius:8px;"
                     (keyup)="applyFilter($event)" placeholder="Search records…">
              <button class="ui-btn ui-btn-secondary" style="height:36px; padding:0 0.85rem; font-size:0.75rem;" (click)="exportCSV()">Export CSV</button>
            </div>
        </div>

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading audit records…</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort class="ui-table">
              <ng-container matColumnDef="epoch">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Time</th>
                <td mat-cell *matCellDef="let rec">
                  <div class="text-mono" style="font-size:0.82rem;">{{ rec.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="node">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Performed By</th>
                <td mat-cell *matCellDef="let rec">
                  <div style="font-weight:700;">{{ rec.performedBy || 'System' }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Action</th>
                <td mat-cell *matCellDef="let rec">
                  <span class="ui-badge" [ngClass]="getActionClass(rec.action)" style="font-size:10px;">{{ rec.action }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="trace">
                <th mat-header-cell *matHeaderCellDef>Reference</th>
                <td mat-cell *matCellDef="let rec">
                  <span class="text-mono" style="font-size:10px; color:var(--txt-secondary); background:var(--surface-2); padding:2px 6px; border-radius:4px;">
                    {{ rec.entityName }} #{{ rec.entityId }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right; width:60px;"></th>
                <td mat-cell *matCellDef="let rec" style="text-align:right;">
                  <button mat-icon-button (click)="openInspectDrawer(rec)" class="action-trigger" aria-label="Inspect record">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">visibility</mat-icon>
                  </button>
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
            <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No audit records found.</div>
          }
        }
      </div>

    </div>

    <!-- INSPECTION DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="'Audit Record'"
      [subtitle]="'Record details.'"
      [showFooter]="false"
      (close)="isDrawerOpen = false"
    >
      @if (selectedLog) {
        <div class="forensic-details">
          <div class="detail-section">
            <label>Record ID</label>
            <div class="val-box text-mono">#{{ selectedLog.id }}</div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <label>Performed By</label>
              <div class="val-box">{{ selectedLog.performedBy || 'System' }}</div>
            </div>
            <div class="detail-section">
              <label>Timestamp</label>
              <div class="val-box text-mono">{{ selectedLog.timestamp | date:'MMM d, HH:mm:ss.SSS' }}</div>
            </div>
          </div>

          <div class="detail-section">
            <label>Action</label>
            <div class="val-box">
               <span class="ui-badge" [ngClass]="getActionClass(selectedLog.action)">{{ selectedLog.action }}</span>
            </div>
          </div>

          <div class="detail-section">
            <label>Entity</label>
            <div class="val-box text-mono">{{ selectedLog.entityName }} [ID: {{ selectedLog.entityId }}]</div>
          </div>

          <div class="detail-section">
            <label>Details</label>
            <div class="val-box text-mono" style="font-size:0.75rem; background:var(--bg); border-style:dashed;">
               {{ selectedLog.details || 'No details recorded.' }}
            </div>
          </div>

          @if (selectedLog.oldValues || selectedLog.newValues) {
            <div class="detail-grid">
              <div class="detail-section">
                <label>Previous Values</label>
                <div class="val-box text-mono" style="font-size:0.75rem;">{{ selectedLog.oldValues }}</div>
              </div>
              <div class="detail-section">
                <label>New Values</label>
                <div class="val-box text-mono" style="font-size:0.75rem;">{{ selectedLog.newValues }}</div>
              </div>
            </div>
          }
        </div>
      }
    </app-side-sheet-drawer>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .mt-6 { margin-top: 1.5rem; }
    .table-container { min-height: 400px; position: relative; }
    .action-trigger:hover { background: var(--surface-2); }

    .forensic-details { display: flex; flex-direction: column; gap: 1.5rem; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .detail-section label { font-size: 0.65rem; font-weight: 800; color: var(--txt-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.4rem; display: block; }
    .val-box { padding: 0.75rem 1rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; font-size: 0.85rem; font-weight: 600; color: var(--txt-main); }

    .f-input { height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); outline: none; transition: border-color 0.2s; }
    .f-input:focus { border-color: var(--primary); }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .f-group label { font-size: 0.75rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; }

    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }
  `]
})
export class CompliancePageComponent implements OnInit {
  private readonly complianceApi = inject(ComplianceService);
  private readonly snack = inject(MatSnackBar);

  protected dataSource = new MatTableDataSource<AuditTrail>([]);
  protected isLoading = signal(true);
  protected readonly displayedColumns = ['epoch', 'node', 'action', 'trace', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Drawer State
  isDrawerOpen = false;
  selectedLog: AuditTrail | null = null;

  protected readonly rules = signal<ComplianceRule[]>([]);
  protected readonly activeRules = computed(() => this.rules().filter((r) => r.isActive !== false).length);
  protected readonly integrity = computed(() => {
    const rows = this.dataSource.data;
    if (!rows.length) return { score: 100, anomalies: 0, label: 'Empty' };
    const anomalies = rows.filter(
      (r) => r.id == null || !r.timestamp || !r.action || !r.entityName
    ).length;
    return {
      score: Math.round(((rows.length - anomalies) / rows.length) * 1000) / 10,
      anomalies,
      label: anomalies ? `${anomalies} flagged` : 'Verified'
    };
  });

  // Compliance autopilot form state
  protected check = { employeeId: 1, newHours: 8, weeklyTotal: 32, dailyTotal: 6, breakTaken: true, lastEnd: '', newStart: '', publishedAt: '', estHours: 8, actualHours: 8 };
  protected readonly checking = signal(false);
  protected readonly checkResults = signal<{ name: string; violations: string[] }[]>([]);

  ngOnInit() {
    this.loadAuditLogs();
    this.complianceApi.getRules().subscribe({
      next: (rules) => this.rules.set(rules ?? []),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not load compliance rules.'), 'Dismiss', { duration: 5000 })
    });
  }

  loadAuditLogs() {
    this.isLoading.set(true);
    this.complianceApi.getAuditTrails().pipe(
      catchError(() => {
        this.snack.open('Could not load audit records. Please try again.', 'Retry', { duration: 4000 });
        return of([]);
      })
    ).subscribe((data: AuditTrail[]) => {
      this.dataSource.data = data;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
      this.isLoading.set(false);
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openInspectDrawer(log: AuditTrail) {
    this.selectedLog = log;
    this.isDrawerOpen = true;
  }

  getActionClass(action: string): string {
    if (action.includes('CREATE') || action.includes('SUCCESS') || action.includes('AUTHORIZE')) return 'ui-badge-success';
    if (action.includes('DELETE') || action.includes('FAIL') || action.includes('PURGE')) return 'ui-badge-danger';
    return 'ui-badge-warning';
  }

  verifyLedger() {
    const { score, anomalies } = this.integrity();
    const total = this.dataSource.data.length;
    this.snack.open(
      anomalies
        ? `Check: ${anomalies}/${total} records are missing required fields.`
        : `Check passed: ${total} records complete (score ${score}%).`,
      'OK',
      { duration: 5000 }
    );
  }

  exportCSV() {
    const rows = this.dataSource.filteredData?.length ? this.dataSource.filteredData : this.dataSource.data;
    if (!rows.length) {
      this.snack.open('Nothing to export.', 'OK', { duration: 2000 });
      return;
    }
    const header = 'id,timestamp,entity,entityId,action,performedBy,details';
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map((r) =>
      [r.id, r.timestamp, r.entityName, r.entityId, r.action, r.performedBy, r.details].map(esc).join(',')
    );
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-ledger.csv';
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open(`Exported ${rows.length} audit records.`, 'OK', { duration: 3000 });
  }

  runCheck() {
    const c = this.check;
    if (!c.lastEnd || !c.newStart) {
      this.snack.open('Enter last shift end and new shift start.', 'Dismiss', { duration: 4000 });
      return;
    }
    this.checking.set(true);
    const unavailable = ['Check unavailable (service error)'];
    forkJoin({
      rest: this.complianceApi.validateShift(
        new Date(c.lastEnd).toISOString(), new Date(c.newStart).toISOString()
      ).pipe(catchError(() => of(unavailable))),
      weekly: this.complianceApi.validateWeeklyHours(Number(c.employeeId), Number(c.weeklyTotal), Number(c.newHours))
        .pipe(catchError(() => of(unavailable))),
      daily: this.complianceApi.validateDailyHours(Number(c.employeeId), Number((c as any).dailyTotal ?? 0), Number(c.newHours))
        .pipe(catchError(() => of(unavailable))),
      meal: this.complianceApi.checkMealBreakPenalty(Number(c.newHours), c.breakTaken)
        .pipe(catchError(() => of(unavailable))),
      predictive: (c as any).publishedAt && c.newStart
        ? this.complianceApi.checkPredictivePay(new Date((c as any).publishedAt).toISOString(), new Date(c.newStart).toISOString())
            .pipe(catchError(() => of(unavailable)))
        : of([] as string[]),
      goodFaith: this.complianceApi.checkGoodFaithEstimate(Number((c as any).estHours ?? 0), Number((c as any).actualHours ?? 0))
        .pipe(catchError(() => of(unavailable)))
    }).subscribe({
      next: ({ rest, weekly, daily, meal, predictive, goodFaith }) => {
        this.checkResults.set([
          { name: 'Rest gap between shifts', violations: rest },
          { name: 'Weekly hours cap', violations: weekly },
          { name: 'Daily hours cap', violations: daily },
          { name: 'Meal break penalty', violations: meal },
          { name: 'Predictive pay (late schedule change)', violations: predictive },
          { name: 'Good-faith estimate variance', violations: goodFaith }
        ]);
        this.checking.set(false);
      },
      error: (err) => {
        this.checking.set(false);
        this.snack.open(backendErrorMessage(err, 'Compliance check failed.'), 'Dismiss', { duration: 6000 });
      }
    });
  }
}
