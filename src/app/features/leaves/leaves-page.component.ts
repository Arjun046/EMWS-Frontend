import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveBalance, LeaveType, LeaveStatus } from '../../core/services/leave.service';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-leaves-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    ReactiveFormsModule, DatePipe, DecimalPipe, HasScopeDirective, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-leaves">
      
      <!-- BALANCES ROW -->
      <div class="leaves-balances-row">
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon"><mat-icon>flight_takeoff</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesVacationBal">{{ vacationBalance() | number:'1.1-1' }}</div>
            <div class="bal-indicator-title">Available Vacation</div>
          </div>
        </div>
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon green-theme"><mat-icon>health_and_safety</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesSickBal">{{ sickBalance() | number:'1.1-1' }}</div>
            <div class="bal-indicator-title">Sick Leave (Used)</div>
          </div>
        </div>
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon warning-theme"><mat-icon>event_repeat</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesPersonalBal">2.0</div>
            <div class="bal-indicator-title">Personal Days</div>
          </div>
        </div>
      </div>

      <!-- REQUESTS TABLE -->
      <div class="ui-card" style="padding: 0; overflow: visible; border-radius:14px;">
        <div class="ui-card-header" style="padding: 1.5rem 1.5rem 1rem;">
          <h3>Leave & Absence History</h3>
          <button class="ui-btn ui-btn-primary" (click)="openAddDrawer()">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon>
            Apply Absence
          </button>
        </div>

        <div class="filter-action-row" style="padding: 0 1.5rem 1rem;">
          <div class="input-icon-wrap" style="width:100%;">
            <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
            <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;" 
                   (keyup)="applyFilter($event)" placeholder="Search absence packets by personnel or reason...">
          </div>
        </div>

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Fetching historical registries...</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort class="ui-table">
              
              <ng-container matColumnDef="personnel">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Personnel Identity</th>
                <td mat-cell *matCellDef="let req">
                   <div style="line-height:1.2">
                      <strong style="font-size:0.85rem;">{{ getEmployeeName(req.employeeId) }}</strong><br>
                      <span class="text-mono" style="font-size:11px; color:var(--txt-muted)">NODE_REF_{{ req.id }}</span>
                   </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Absence Node</th>
                <td mat-cell *matCellDef="let req">
                  <span class="ui-badge" style="background:var(--surface-2); color:var(--txt-secondary);">{{ req.leaveType }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="interval">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Epoch Interval</th>
                <td mat-cell *matCellDef="let req">
                   <div style="font-size:0.85rem; font-weight:700;">{{ req.startDate | date:'dd MMM yyyy' }} — {{ req.endDate | date:'dd MMM yyyy' }}</div>
                   <div style="font-size:10px; color:var(--txt-muted)">{{ calculateDuration(req) }} days total duration</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Lifecycle Status</th>
                <td mat-cell *matCellDef="let req">
                   <span class="ui-badge" [ngClass]="getStatusClass(req.status)">
                     {{ req.status }}
                   </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right; width:80px;"></th>
                <td mat-cell *matCellDef="let req" style="text-align:right;">
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openViewDrawer(req)">
                      <mat-icon>visibility</mat-icon>
                      <span>Inspect Packet</span>
                    </button>
                    @if (req.status === 'PENDING') {
                      <button mat-menu-item (click)="openApproveDrawer(req)" *appHasScope="['LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE']">
                        <mat-icon style="color:var(--success);">verified_user</mat-icon>
                        <span>Authorize Node</span>
                      </button>
                      <button mat-menu-item (click)="cancelRequest(req)" style="color:var(--danger);" *ngIf="isOwnRequest(req)">
                        <mat-icon style="color:var(--danger);">cancel</mat-icon>
                        <span>Abort Request</span>
                      </button>
                    }
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
          </div>

          <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
            <span class="pag-counter-label">Historical absence packets synchronized.</span>
            <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
          </div>
        }
      </div>

    </div>

    <!-- CRUD SIDE SHEET DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="drawerTitle"
      [subtitle]="drawerSubtitle"
      [saveText]="drawerSaveText"
      [saveDisabled]="leaveForm.invalid"
      [showFooter]="currentMode !== 'view'"
      (close)="closeDrawer()"
      (save)="saveRequest()"
    >
      <form [formGroup]="leaveForm" class="drawer-crud-form">
        
        <div class="form-section">Temporal Parameters</div>
        <div class="f-group">
          <label>Absence Classification</label>
          <select class="f-input" formControlName="leaveType">
            <option value="VACATION">Vacation (Annual Leave)</option>
            <option value="SICK">Sick / Medical Leave</option>
            <option value="PERSONAL">Personal Node Epoch</option>
            <option value="BEREAVEMENT">Compassionate / Bereavement</option>
            <option value="MATERNITY">Maternity / Paternity Node</option>
          </select>
        </div>

        <div class="f-grid">
          <div class="f-group">
            <label>Start Epoch</label>
            <input class="f-input" type="date" formControlName="startDate">
          </div>
          <div class="f-group">
            <label>Termination Epoch</label>
            <input class="f-input" type="date" formControlName="endDate">
          </div>
        </div>

        <div class="form-section">Contextual Metadata</div>
        <div class="f-group">
          <label>Operational Reason / Context</label>
          <textarea class="f-input" formControlName="reason" style="height:100px; padding:0.75rem;" placeholder="Deep context for administrative validation..."></textarea>
        </div>

        @if (currentMode === 'approve') {
          <div class="form-section" style="color:var(--success);">Administrative Validation</div>
          <div class="f-group">
            <label>Approver Comments</label>
            <textarea class="f-input" formControlName="managerComments" style="height:80px; padding:0.75rem;" placeholder="Validation notes..."></textarea>
          </div>
        }

      </form>
    </app-side-sheet-drawer>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .leaves-balances-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
    .bal-indicator-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 1.25rem 1.5rem; display: flex; align-items: center; gap: 1.25rem; box-shadow: var(--shadow-sm); }
    .bal-indicator-icon { width: 44px; height: 44px; border-radius: 12px; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; font-size: 1.25rem; }
    .bal-indicator-icon.green-theme { background: var(--success-soft); color: var(--success); }
    .bal-indicator-icon.warning-theme { background: var(--warning-soft); color: var(--warning); }
    .bal-indicator-value { font-size: 1.6rem; font-weight: 800; line-height: 1; }
    .bal-indicator-title { font-size: 0.72rem; font-weight: 700; color: var(--txt-muted); text-transform: uppercase; margin-top: 0.25rem; letter-spacing: 0.03em; }

    .table-container { min-height: 400px; position: relative; border-radius: 0 0 14px 14px; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .action-trigger:hover { background: var(--surface-2); }
    
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .f-group label { font-size: 0.75rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .f-input { height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); width: 100%; outline: none; transition: border-color 0.2s; }
    .f-input:focus { border-color: var(--primary); }

    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }
  `]
})
export class LeavesPageComponent implements OnInit {
  private readonly leaveApi = inject(LeaveService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected dataSource = new MatTableDataSource<LeaveRequest>([]);
  protected isLoading = signal(true);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly displayedColumns = ['personnel', 'category', 'interval', 'status', 'actions'];

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if (mp) this.dataSource.paginator = mp;
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if (ms) this.dataSource.sort = ms;
  }

  // Balances
  protected readonly balances = signal<LeaveBalance[]>([]);
  protected readonly vacationBalance = computed(() => {
    const bal = this.balances().find(b => b.leaveType === 'VACATION');
    return bal ? (bal.totalEntitled - bal.used - bal.pending) : 12.5;
  });
  protected readonly sickBalance = computed(() => {
    const bal = this.balances().find(b => b.leaveType === 'SICK');
    return bal ? bal.used : 4.0;
  });

  // Drawer State
  isDrawerOpen = false;
  drawerTitle = 'Apply Absence';
  drawerSubtitle = 'Initializing new temporal absence packet.';
  drawerSaveText = 'Submit Packet';
  currentMode: 'add' | 'view' | 'approve' = 'add';
  selectedRequest: LeaveRequest | null = null;

  leaveForm: FormGroup = this.fb.group({
    leaveType: [LeaveType.VACATION, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    reason: ['', [Validators.required]],
    managerComments: ['']
  });

  ngOnInit() {
    this.loadRequests();
    this.loadBalances();
  }

  loadRequests() {
    this.isLoading.set(true);
    // If admin/manager, load company requests, else load mine
    const obs = this.auth.hasAnyScope(['LEAVE_TEAM_READ', 'LEAVE_ORG_READ']) 
      ? this.leaveApi.getCompanyRequests()
      : this.leaveApi.getMyRequests();

    obs.pipe(
      catchError(() => {
        this.snack.open('Registry synchronization failed.', 'OK', { duration: 4000 });
        return of([]);
      })
    ).subscribe((data: LeaveRequest[]) => {
      this.dataSource.data = data;
      this.isLoading.set(false);
    });
  }

  loadBalances() {
    this.leaveApi.getMyBalances().subscribe((data: LeaveBalance[]) => this.balances.set(data));
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // --- CRUD ACTIONS ---

  openAddDrawer() {
    this.currentMode = 'add';
    this.drawerTitle = 'Apply Absence Packet';
    this.drawerSubtitle = 'Provisioning new temporal displacement node.';
    this.drawerSaveText = 'Submit Request';
    this.leaveForm.reset({ leaveType: LeaveType.VACATION });
    this.leaveForm.enable();
    this.isDrawerOpen = true;
  }

  openViewDrawer(req: LeaveRequest) {
    this.currentMode = 'view';
    this.selectedRequest = req;
    this.drawerTitle = 'Packet Inspection';
    this.drawerSubtitle = `Viewing absence node REF_${req.id}`;
    this.leaveForm.patchValue(req);
    this.leaveForm.disable();
    this.isDrawerOpen = true;
  }

  openApproveDrawer(req: LeaveRequest) {
    this.currentMode = 'approve';
    this.selectedRequest = req;
    this.drawerTitle = 'Authorize Absence Node';
    this.drawerSubtitle = `Reviewing request from ${this.getEmployeeName(req.employeeId)}`;
    this.drawerSaveText = 'Grant Authorization';
    this.leaveForm.patchValue(req);
    this.leaveForm.get('managerComments')?.enable();
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedRequest = null;
  }

  saveRequest() {
    if (this.leaveForm.invalid) return;
    this.isLoading.set(true);

    if (this.currentMode === 'add') {
      this.leaveApi.createRequest(this.leaveForm.value).subscribe({
        next: () => {
          this.snack.open('Absence Request Locked.', 'OK', { duration: 3000 });
          this.loadRequests();
          this.loadBalances();
          this.closeDrawer();
        },
        error: () => {
          this.snack.open('Submission Failure.', 'OK', { duration: 4000 });
          this.isLoading.set(false);
        }
      });
    } else if (this.currentMode === 'approve') {
       this.leaveApi.updateStatus(this.selectedRequest!.id, LeaveStatus.APPROVED, this.leaveForm.value.managerComments).subscribe({
         next: () => {
            this.snack.open('Node Authorized.', 'OK', { duration: 3000 });
            this.loadRequests();
            this.closeDrawer();
         },
         error: () => {
            this.snack.open('Authorization Failure.', 'OK', { duration: 4000 });
            this.isLoading.set(false);
         }
       });
    }
  }

  cancelRequest(req: LeaveRequest) {
    if (confirm('ABORT_REQUEST: Are you sure?')) {
      this.isLoading.set(true);
      this.leaveApi.cancelRequest(req.id).subscribe({
        next: () => {
          this.snack.open('Request Aborted.', 'OK', { duration: 3000 });
          this.loadRequests();
        },
        error: () => {
          this.snack.open('Abort Protocol Failed.', 'OK', { duration: 4000 });
          this.isLoading.set(false);
        }
      });
    }
  }

  // --- HELPERS ---

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `NODE_${id}`;
  }

  protected calculateDuration(req: LeaveRequest): number {
    const start = new Date(req.startDate);
    const end = new Date(req.endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
  }

  protected getStatusClass(status: string): string {
    switch (status) {
      case 'APPROVED': return 'ui-badge-success';
      case 'PENDING': return 'ui-badge-warning';
      case 'REJECTED': return 'ui-badge-danger';
      default: return 'ui-badge-secondary';
    }
  }

  protected isOwnRequest(req: LeaveRequest): boolean {
    return req.employeeId === this.auth.user()?.id;
  }
}
