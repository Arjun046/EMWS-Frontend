import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LeaveService, LeaveRequest, LeaveBalance, LeaveType, LeaveStatus } from '../../core/services/leave.service';
import { SchedulingService, Shift } from '../../core/services/scheduling.service';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { RouterLink } from '@angular/router';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-leaves-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatPaginatorModule, MatSortModule,
    ReactiveFormsModule, DatePipe, DecimalPipe, HasScopeDirective, RouterLink, SideSheetDrawerComponent
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-leaves">
      
      <!-- BALANCES ROW -->
      <div class="leaves-balances-row">
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon"><mat-icon>flight_takeoff</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesVacationBal">{{ annualBalance() == null ? '—' : (annualBalance() | number:'1.1-1') }}</div>
            <div class="bal-indicator-title">Available Annual (days)</div>
          </div>
        </div>
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon green-theme"><mat-icon>health_and_safety</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesSickBal">{{ sickBalance() == null ? '—' : (sickBalance() | number:'1.1-1') }}</div>
            <div class="bal-indicator-title">Sick Leave Used (days)</div>
          </div>
        </div>
        <div class="bal-indicator-card">
          <div class="bal-indicator-icon warning-theme"><mat-icon>event_repeat</mat-icon></div>
          <div>
            <div class="bal-indicator-value" id="leavesPersonalBal">{{ casualBalance() == null ? '—' : (casualBalance() | number:'1.1-1') }}</div>
            <div class="bal-indicator-title">Available Casual (days)</div>
          </div>
        </div>
      </div>

      <!-- REQUESTS TABLE -->
      <div class="ui-card" style="padding: 0; overflow: visible; border-radius:14px;">
        <div class="ui-card-header" style="padding: 1.5rem 1.5rem 1rem;">
          <h3>Leave Requests</h3>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <a class="ui-btn" routerLink="/team-calendar" title="Team calendar" style="text-decoration:none;">
              <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">groups</mat-icon>
              Team Calendar
            </a>
            <button class="ui-btn ui-btn-primary" (click)="openAddDrawer()" *appHasScope="['LEAVE_SELF_APPLY', 'LEAVE_SELF_READ']">
              <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon>
              Request Leave
            </button>
          </div>
        </div>

        <div class="filter-action-row" style="padding: 0 1.5rem 1rem; display:flex; gap:0.75rem;">
          <div class="input-icon-wrap" style="flex:1;">
            <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
            <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;"
                   (keyup)="applyFilter($event)" placeholder="Search by name or reason…">
          </div>
          <select class="f-input" style="width:180px; height:42px; border-radius:10px;" (change)="onStatusFilter($event)" [value]="statusFilter()">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        @if (selectedIds().size > 0) {
          <div class="bulk-bar" style="margin:0 1.5rem 1rem; padding:0.75rem 1rem; border-radius:10px; background:var(--primary-soft); display:flex; align-items:center; gap:1rem;">
            <strong style="font-size:0.85rem;">{{ selectedIds().size }} selected</strong>
            <button class="ui-btn ui-btn-primary" (click)="bulkApprove()" [disabled]="bulkWorking()">
              {{ bulkWorking() ? 'Approving…' : 'Bulk approve' }}
            </button>
            <button class="ui-btn" (click)="clearSelection()">Clear</button>
          </div>
        }

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading leave requests…</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)" class="ui-table" aria-label="Leave requests">

              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef style="width:48px;"></th>
                <td mat-cell *matCellDef="let req">
                  @if (req.status === 'PENDING' && canApprove()) {
                    <input type="checkbox" [checked]="isSelected(req.id)" (change)="toggleSelect(req.id, $event)" [attr.aria-label]="'Select request ' + req.id" />
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="personnel">
                <th mat-header-cell *matHeaderCellDef>Employee</th>
                <td mat-cell *matCellDef="let req">
                   <div style="line-height:1.2">
                      <strong style="font-size:0.85rem;">{{ getEmployeeName(req.employeeId) }}</strong><br>
                      <span class="text-mono" style="font-size:11px; color:var(--txt-muted)">Request #{{ req.id }}</span>
                   </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
                <td mat-cell *matCellDef="let req">
                  <span class="ui-badge" style="background:var(--surface-2); color:var(--txt-secondary);">{{ req.leaveType }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="interval">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Dates</th>
                <td mat-cell *matCellDef="let req">
                   <div style="font-size:0.85rem; font-weight:700;">{{ req.startDate | date:'dd MMM yyyy' }} — {{ req.endDate | date:'dd MMM yyyy' }}</div>
                   <div style="font-size:10px; color:var(--txt-muted)">{{ calculateDuration(req) }} days</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let req">
                   <span class="ui-badge" [ngClass]="getStatusClass(req.status)">
                     {{ req.status }}
                   </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right; width:80px;"></th>
                <td mat-cell *matCellDef="let req" style="text-align:right;">
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger" aria-label="Row actions">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openViewDrawer(req)">
                      <mat-icon>visibility</mat-icon>
                      <span>View details</span>
                    </button>
                    @if (req.status === 'PENDING') {
                      <button mat-menu-item (click)="openApproveDrawer(req)" *appHasScope="['LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE']">
                        <mat-icon style="color:var(--success);">verified_user</mat-icon>
                        <span>Review request</span>
                      </button>
                      <button mat-menu-item (click)="cancelRequest(req)" style="color:var(--danger);" *ngIf="isOwnRequest(req)">
                        <mat-icon style="color:var(--danger);">cancel</mat-icon>
                        <span>Cancel request</span>
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
            <span class="pag-counter-label">{{ dataSource.filteredData.length }} of {{ totalElements() }} requests</span>
            <mat-paginator [length]="totalElements()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                           [pageSizeOptions]="[10, 25, 100]" (page)="onPage($event)"
                           style="background:transparent;"></mat-paginator>
          </div>
          @if (dataSource.filteredData.length === 0) {
            <div style="padding: 2rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No leave requests found.</div>
          }
        }
      </div>

    </div>

    <!-- CRUD SIDE SHEET DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="drawerTitle"
      [subtitle]="drawerSubtitle"
      [saveText]="drawerSaveText"
      [saveDisabled]="leaveForm.invalid || rosterConflicts().length > 0"
      [showFooter]="currentMode !== 'view'"
      (close)="closeDrawer()"
      (save)="saveRequest()"
    >
      <form [formGroup]="leaveForm" class="drawer-crud-form">
        
        <div class="form-section">Leave Details</div>
        <div class="f-group">
          <label id="leave-type-label">Leave Type</label>
          <select class="f-input" formControlName="leaveType" aria-labelledby="leave-type-label">
            <option value="ANNUAL">Annual Leave</option>
            <option value="SICK">Sick Leave</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="MATERNITY">Maternity Leave</option>
            <option value="PATERNITY">Paternity Leave</option>
            <option value="UNPAID">Unpaid Leave</option>
          </select>
        </div>

        <div class="f-grid">
          <div class="f-group">
            <label id="leave-start-label">Start Date</label>
            <input class="f-input" type="date" formControlName="startDate" aria-labelledby="leave-start-label">
          </div>
          <div class="f-group">
            <label id="leave-end-label">End Date</label>
            <input class="f-input" type="date" formControlName="endDate" aria-labelledby="leave-end-label">
          </div>
        </div>

        <div class="form-section">Reason</div>
        <div class="f-group">
          <label id="leave-reason-label">Why do you need this leave?</label>
          <textarea class="f-input" formControlName="reason" aria-labelledby="leave-reason-label" style="height:100px; padding:0.75rem;" placeholder="Brief reason for this request…"></textarea>
        </div>

        @if (currentMode === 'approve') {
          <div class="form-section" style="color:var(--success);">Review</div>
          @if (rosterChecking()) {
            <p style="font-size:0.8rem;color:var(--txt-muted);">Checking roster for overlapping shifts…</p>
          } @else if (rosterUnknown()) {
            <div role="alert" style="border-left:4px solid var(--warning);padding:0.6rem 0.8rem;margin-bottom:1rem;font-size:0.8rem;">
              <strong>Roster unverified.</strong> Could not load shifts — approval may still be blocked server-side.
            </div>
          } @else if (rosterConflicts().length) {
            <div role="alert" style="border-left:4px solid var(--danger);padding:0.6rem 0.8rem;margin-bottom:1rem;font-size:0.8rem;">
              <strong>{{ rosterConflicts().length }} assigned shift(s) overlap this leave.</strong>
              Unassign or reassign them before approving — approval is blocked until the roster is clear.
            </div>
          }
          <div class="f-group">
            <label id="leave-comments-label">Comments (shared with the employee)</label>
            <textarea class="f-input" formControlName="managerComments" aria-labelledby="leave-comments-label" style="height:80px; padding:0.75rem;" placeholder="Decision notes…"></textarea>
          </div>
          <button type="button" class="ui-btn" style="color:var(--danger);" (click)="rejectRequest()">Reject request</button>
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
  private readonly scheduleApi = inject(SchedulingService);
  private readonly empApi = inject(EmployeeDataService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected dataSource = new MatTableDataSource<LeaveRequest>([]);
  protected isLoading = signal(true);
  protected readonly employees = toSignal(this.empApi.getEmployees(), { initialValue: [] });
  protected readonly displayedColumns = ['select', 'personnel', 'category', 'interval', 'status', 'actions'];
  protected readonly statusFilter = signal<'' | LeaveStatus>('');
  protected readonly selectedIds = signal<Set<number>>(new Set());
  protected readonly bulkWorking = signal(false);

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    // Length/pages driven by (page) events + [length] binding, not MatTableDataSource.
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    // Sorting is server-side via (matSortChange); no client MatSort wiring.
  }
  /** Server-side paging state (BE Page). */
  protected readonly totalElements = signal(0);
  protected pageIndex = 0;
  protected pageSize = 10;
  protected sortParam = 'createdAt,desc';

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRequests();
  }

  /** Maps table columns to BE-sortable properties; unknown columns keep recency order. */
  onSort(sort: Sort): void {
    const mapping: Record<string, string> = { category: 'leaveType', interval: 'startDate', status: 'status' };
    const property = mapping[sort.active];
    this.sortParam = property && sort.direction ? `${property},${sort.direction}` : 'createdAt,desc';
    this.pageIndex = 0;
    this.loadRequests();
  }

  // Balances (null = no record from BE; template shows '—', never fake numbers)
  protected readonly balances = signal<LeaveBalance[]>([]);
  protected readonly annualBalance = computed<number | null>(() => {
    const bal = this.balances().find(b => b.leaveType === 'ANNUAL');
    return bal ? (bal.totalEntitled - bal.used - bal.pending) : null;
  });
  protected readonly sickBalance = computed<number | null>(() => {
    const bal = this.balances().find(b => b.leaveType === 'SICK');
    return bal ? bal.used : null;
  });
  protected readonly casualBalance = computed<number | null>(() => {
    const bal = this.balances().find(b => b.leaveType === 'CASUAL');
    return bal ? (bal.totalEntitled - bal.used - bal.pending) : null;
  });

  // Roster pre-check for the approve drawer (BE blocks approval on overlap;
  // this surfaces it before the approver clicks Approve).
  protected readonly rosterConflicts = signal<Shift[]>([]);
  protected readonly rosterChecking = signal(false);
  protected readonly rosterUnknown = signal(false);

  // Drawer State
  isDrawerOpen = false;
  drawerTitle = 'Request Leave';
  drawerSubtitle = 'Submit a new leave request.';
  drawerSaveText = 'Submit Request';
  currentMode: 'add' | 'view' | 'approve' = 'add';
  selectedRequest: LeaveRequest | null = null;

  leaveForm: FormGroup = this.fb.group({
    leaveType: [LeaveType.ANNUAL, [Validators.required]],
    startDate: ['', [Validators.required]],
    endDate: ['', [Validators.required]],
    reason: ['', [Validators.required]],
    managerComments: ['']
  });

  ngOnInit() {
    this.loadRequests();
    this.loadBalances();
  }

  canApprove(): boolean {
    return this.auth.hasAnyScope(['LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE']);
  }

  onStatusFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as '' | LeaveStatus;
    this.statusFilter.set(value);
    this.pageIndex = 0;
    this.loadRequests();
  }

  isSelected(id: number): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelect(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  bulkApprove(): void {
    const ids = [...this.selectedIds()];
    if (!ids.length) return;
    this.bulkWorking.set(true);
    const approveNext = (index: number) => {
      if (index >= ids.length) {
        this.bulkWorking.set(false);
        this.clearSelection();
        this.loadRequests();
        this.snack.open(`${ids.length} leave(s) approved.`, 'OK', { duration: 3000 });
        return;
      }
      this.leaveApi.updateStatus(ids[index], LeaveStatus.APPROVED, 'Bulk approval').subscribe({
        next: () => approveNext(index + 1),
        error: (err) => {
          this.bulkWorking.set(false);
          this.snack.open(this.backendError(err, `Bulk approve stopped at #${ids[index]}.`), 'Dismiss', { duration: 6000 });
          this.loadRequests();
        }
      });
    };
    approveNext(0);
  }

  loadRequests() {
    this.isLoading.set(true);
    // BE GET /company requires LEAVE_TEAM_APPROVE or LEAVE_ORG_APPROVE
    // (not *_READ) — match the contract or fall back to own requests.
    // Approvers get server-paged results (status rides the query); employees
    // load all own requests (low volume) so the status filter stays exact.
    const status = this.statusFilter() || undefined;
    if (!this.canApprove()) {
      this.leaveApi.getAllMyRequests().pipe(
        catchError(() => {
          this.snack.open('Could not load leave requests. Please try again.', 'OK', { duration: 4000 });
          return of([]);
        })
      ).subscribe((data: LeaveRequest[]) => {
        this.dataSource.data = status ? data.filter((r) => r.status === status) : data;
        this.totalElements.set(this.dataSource.data.length);
        this.dataSource.filter = '';
        this.clearSelection();
        this.isLoading.set(false);
      });
      return;
    }
    const query = { page: this.pageIndex, size: this.pageSize, sort: this.sortParam };
    this.leaveApi.getCompanyRequests(status, query).pipe(
      catchError(() => {
        this.snack.open('Could not load leave requests. Please try again.', 'OK', { duration: 4000 });
        return of(null);
      })
    ).subscribe((page) => {
      this.dataSource.data = page?.content ?? [];
      this.totalElements.set(page?.totalElements ?? 0);
      this.dataSource.filter = '';
      this.clearSelection();
      this.isLoading.set(false);
    });
  }

  loadBalances() {
    this.leaveApi.getMyBalances().subscribe({
      next: (data: LeaveBalance[]) => this.balances.set(data ?? []),
      error: () => this.balances.set([])
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // --- CRUD ACTIONS ---

  openAddDrawer() {
    this.currentMode = 'add';
    this.drawerTitle = 'Request Leave';
    this.drawerSubtitle = 'Submit a new leave request.';
    this.drawerSaveText = 'Submit Request';
    this.leaveForm.reset({ leaveType: LeaveType.ANNUAL });
    this.leaveForm.enable();
    this.isDrawerOpen = true;
  }

  openViewDrawer(req: LeaveRequest) {
    this.currentMode = 'view';
    this.selectedRequest = req;
    this.drawerTitle = 'Leave Request';
    this.drawerSubtitle = `Request #${req.id} from ${this.getEmployeeName(req.employeeId)}`;
    this.leaveForm.patchValue(req);
    this.leaveForm.disable();
    this.isDrawerOpen = true;
  }

  openApproveDrawer(req: LeaveRequest) {
    this.currentMode = 'approve';
    this.selectedRequest = req;
    this.drawerTitle = 'Review Leave Request';
    this.drawerSubtitle = `Request from ${this.getEmployeeName(req.employeeId)}`;
    this.drawerSaveText = 'Approve';
    this.leaveForm.patchValue(req);
    this.leaveForm.get('managerComments')?.enable();
    this.isDrawerOpen = true;
    this.checkRoster(req);
  }

  /**
   * Pre-checks the employee's roster for the requested dates. Approval is
   * blocked server-side on overlap — this only previews, never decides.
   */
  private checkRoster(req: LeaveRequest): void {
    this.rosterConflicts.set([]);
    this.rosterUnknown.set(false);
    if (!req.startDate || !req.endDate) return;
    this.rosterChecking.set(true);
    const rangeStart = `${req.startDate}T00:00:00Z`;
    const rangeEnd = `${req.endDate}T23:59:59.999Z`;
    this.scheduleApi.getShiftRangeStrict(rangeStart, rangeEnd).subscribe({
      next: (shifts) => {
        this.rosterConflicts.set((shifts ?? []).filter((s) => this.shiftOverlapsLeave(s, req)));
        this.rosterChecking.set(false);
      },
      error: () => {
        this.rosterUnknown.set(true);
        this.rosterChecking.set(false);
      }
    });
  }

  private shiftOverlapsLeave(s: Shift, req: LeaveRequest): boolean {
    if (s.employeeId !== req.employeeId || !s.startTime || !s.endTime) return false;
    if (String(s.status ?? '').toUpperCase() === 'CANCELLED') return false;
    const leaveStart = new Date(`${req.startDate}T00:00:00Z`).getTime();
    const leaveEnd = new Date(`${req.endDate}T23:59:59.999Z`).getTime();
    const shiftStart = new Date(s.startTime).getTime();
    const shiftEnd = new Date(s.endTime).getTime();
    return shiftStart <= leaveEnd && shiftEnd >= leaveStart;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedRequest = null;
    this.rosterConflicts.set([]);
    this.rosterUnknown.set(false);
  }

  saveRequest() {
    if (this.leaveForm.invalid) return;

    if (this.currentMode === 'add' && !this.balanceCoversRequest()) {
      this.snack.open(
        `Insufficient balance: ${this.requestedDays()} day(s) requested, ${this.remainingForSelectedType()} available.`,
        'Dismiss',
        { duration: 6000 }
      );
      return;
    }
    this.isLoading.set(true);

    if (this.currentMode === 'add') {
      this.leaveApi.createRequest(this.leaveForm.value).subscribe({
        next: () => {
          this.snack.open('Leave request submitted.', 'OK', { duration: 3000 });
          this.loadRequests();
          this.loadBalances();
          this.closeDrawer();
        },
        error: (err) => {
          this.snack.open(this.backendError(err, 'Submission failed.'), 'Dismiss', { duration: 6000 });
          this.isLoading.set(false);
        }
      });
    } else if (this.currentMode === 'approve') {
       if (this.rosterConflicts().length) {
         this.snack.open('Approval blocked: overlapping roster shifts must be cleared first.', 'Dismiss', { duration: 6000 });
         this.isLoading.set(false);
         return;
       }
       this.leaveApi.updateStatus(this.selectedRequest!.id, LeaveStatus.APPROVED, this.leaveForm.value.managerComments).subscribe({
         next: () => {
           this.snack.open('Leave approved.', 'OK', { duration: 3000 });
           this.loadRequests();
           this.closeDrawer();
         },
         error: (err) => {
           this.snack.open(this.backendError(err, 'Approval failed.'), 'Dismiss', { duration: 6000 });
           this.isLoading.set(false);
         }
       });
    }
  }

  rejectRequest() {
    if (!this.selectedRequest) return;
    this.isLoading.set(true);
    this.leaveApi.updateStatus(this.selectedRequest.id, LeaveStatus.REJECTED, this.leaveForm.value.managerComments).subscribe({
      next: () => {
        this.snack.open('Leave rejected.', 'OK', { duration: 3000 });
        this.loadRequests();
        this.closeDrawer();
      },
      error: (err) => {
        this.snack.open(this.backendError(err, 'Rejection failed.'), 'Dismiss', { duration: 6000 });
        this.isLoading.set(false);
      }
    });
  }

  /** Inclusive calendar days between the form's start/end dates. */
  private requestedDays(): number {
    const { startDate, endDate } = this.leaveForm.value ?? {};
    if (!startDate || !endDate) return 0;
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.floor(ms / 86400000) + 1;
  }

  private remainingForSelectedType(): number {
    const type = this.leaveForm.value?.leaveType;
    const bal = this.balances().find((b) => b.leaveType === type);
    if (!bal) return 0;
    return (bal.totalEntitled ?? 0) - (bal.used ?? 0) - (bal.pending ?? 0);
  }

  /** Balance-aware guard: BE also rejects overdraw (400), this stops it early with a clear message. */
  private balanceCoversRequest(): boolean {
    return this.requestedDays() > 0 && this.requestedDays() <= this.remainingForSelectedType();
  }

  private backendError(err: unknown, fallback: string): string {
    return backendErrorMessage(err, fallback);
  }

  cancelRequest(req: LeaveRequest) {
    if (confirm('Cancel this leave request?')) {
      this.isLoading.set(true);
      this.leaveApi.cancelRequest(req.id).subscribe({
        next: () => {
          this.snack.open('Request cancelled.', 'OK', { duration: 3000 });
          this.loadRequests();
        },
        error: (err) => {
          this.snack.open(this.backendError(err, 'Cancel failed.'), 'Dismiss', { duration: 6000 });
          this.isLoading.set(false);
        }
      });
    }
  }

  // --- HELPERS ---

  protected getEmployeeName(id: number): string {
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : `Employee #${id}`;
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
