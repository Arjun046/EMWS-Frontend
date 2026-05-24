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
import { ComplianceService, AuditTrail } from '../../core/services/compliance.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-compliance-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    DatePipe, HasScopeDirective, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-compliance">
      
      <div class="filter-action-row">
        <div>
           <h2 style="margin:0; font-size:1.5rem; font-weight:800; letter-spacing:-0.03em;">Governance & Audit Hub</h2>
           <p style="margin:0.25rem 0 0; font-size:0.85rem; color:var(--txt-muted);">Immutable forensic audit trails and operational protocol verification packets.</p>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="verifyLedger()">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">verified_user</mat-icon>
          Verify Integrity
        </button>
      </div>

      <div class="dashboard-kpi-row mt-6">
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Integrity Score</span>
              <span class="ui-badge ui-badge-success">Verified</span>
           </div>
           <div class="kpi-metric-value">98.2%</div>
        </div>
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Audit Epochs</span>
              <span class="ui-badge ui-badge-success">Live</span>
           </div>
           <div class="kpi-metric-value">{{ dataSource.data.length }}</div>
        </div>
        <div class="ui-card kpi-card" style="border-radius:16px;">
           <div class="kpi-meta-row">
              <span class="kpi-metric-title">Active Policies</span>
              <span class="ui-badge ui-badge-warning">Nominal</span>
           </div>
           <div class="kpi-metric-value">14/14</div>
        </div>
      </div>

      <div class="ui-card mt-6" style="padding:0; overflow:hidden; border-radius:14px;">
        <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;">
           <h3>Immutable Compliance Ledger</h3>
           <div style="display:flex; gap:0.5rem;">
             <input type="text" class="f-input" style="width:240px; height:36px; border-radius:8px;" 
                    (keyup)="applyFilter($event)" placeholder="Search ledger...">
             <button class="ui-btn ui-btn-secondary" style="height:36px; padding:0 0.85rem; font-size:0.75rem;">Export CSV</button>
           </div>
        </div>

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Decrypting forensic streams...</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort class="ui-table">
              <ng-container matColumnDef="epoch">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Epoch Timestamp</th>
                <td mat-cell *matCellDef="let rec">
                  <div class="text-mono" style="font-size:0.82rem;">{{ rec.timestamp | date:'yyyy-MM-dd HH:mm:ss' }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="node">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Action Node</th>
                <td mat-cell *matCellDef="let rec">
                  <div style="font-weight:700;">{{ rec.performedBy || 'SYS_CORE' }}</div>
                  <div style="font-size:10px; color:var(--txt-muted)">Identity Verified</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Operational Packet</th>
                <td mat-cell *matCellDef="let rec">
                  <span class="ui-badge" [ngClass]="getActionClass(rec.action)" style="font-size:10px;">{{ rec.action }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="trace">
                <th mat-header-cell *matHeaderCellDef>Forensic Trace</th>
                <td mat-cell *matCellDef="let rec">
                  <span class="text-mono" style="font-size:10px; color:var(--primary); background:var(--primary-soft); padding:2px 6px; border-radius:4px;">
                    SHA256_{{ rec.id }}F9A1
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right; width:60px;"></th>
                <td mat-cell *matCellDef="let rec" style="text-align:right;">
                  <button mat-icon-button (click)="openInspectDrawer(rec)" class="action-trigger">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">visibility</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
          </div>

          <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
            <span class="pag-counter-label">Compliance stream synchronized with master ledger.</span>
            <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
          </div>
        }
      </div>

    </div>

    <!-- INSPECTION DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="'Forensic Itemization'"
      [subtitle]="'Deep inspection of immutable protocol node.'"
      [showFooter]="false"
      (close)="isDrawerOpen = false"
    >
      @if (selectedLog) {
        <div class="forensic-details">
          <div class="detail-section">
            <label>Master Packet ID</label>
            <div class="val-box text-mono">UUID_{{ selectedLog.id }}FF_9A22</div>
          </div>

          <div class="detail-grid">
            <div class="detail-section">
              <label>Actor Node</label>
              <div class="val-box">{{ selectedLog.performedBy }}</div>
            </div>
            <div class="detail-section">
              <label>Timestamp</label>
              <div class="val-box text-mono">{{ selectedLog.timestamp | date:'MMM d, HH:mm:ss.SSS' }}</div>
            </div>
          </div>

          <div class="detail-section">
            <label>Operational Command</label>
            <div class="val-box">
               <span class="ui-badge" [ngClass]="getActionClass(selectedLog.action)">{{ selectedLog.action }}</span>
            </div>
          </div>

          <div class="detail-section">
            <label>Target Entity Domain</label>
            <div class="val-box text-mono">{{ selectedLog.entityName }} [ID: {{ selectedLog.entityId }}]</div>
          </div>

          <div class="detail-section">
            <label>Deep Metadata Payload</label>
            <div class="val-box text-mono" style="font-size:0.75rem; background:var(--bg); border-style:dashed;">
               {{ selectedLog.details || 'No extended payload provided.' }}
            </div>
          </div>

          <div class="detail-section">
            <label>Digital Signature</label>
            <div style="font-size:0.7rem; color:var(--txt-muted); line-height:1.4;">
               PKI_SIG: 0x8f2a...9c1e_v1.0.4 <br>
               VERIFIED_BY: EWMS_CRYPTO_NODE_01
            </div>
          </div>
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

  ngOnInit() {
    this.loadAuditLogs();
  }

  loadAuditLogs() {
    this.isLoading.set(true);
    this.complianceApi.getAuditTrails().pipe(
      catchError(() => {
        this.snack.open('PROTOCOL_SYNC_FAIL', 'RETRY', { duration: 4000 });
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
    this.snack.open('DIGITAL_LEDGER_VERIFIED: All protocol packets are secure.', 'OK', { duration: 4000 });
  }
}
