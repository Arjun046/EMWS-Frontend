import { Component, effect, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SchedulingService, Shift, ShiftSwapRequest } from '../../core/services/scheduling.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { WidgetSocketService } from '../../core/services/widget-socket.service';
import { AuthService } from '../../core/services/auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { SideSheetDrawerComponent } from '../../shared/components/side-sheet-drawer/side-sheet-drawer.component';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-scheduling-page',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatMenuModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule, MatPaginatorModule,
    MatSortModule, ReactiveFormsModule, HasScopeDirective, SideSheetDrawerComponent, DatePipe
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-scheduling">
      
      <!-- PAGE HEADER -->
      <div class="filter-action-row">
        <div class="filter-ctrls-group">
          <div class="input-icon-wrap" style="width:320px;">
            <mat-icon style="font-size:18px; width:18px; height:18px; left:0.75rem; color:var(--txt-muted)">search</mat-icon>
            <input type="text" class="f-input" style="padding-left:2.5rem; height:42px; border-radius:10px;" 
                   (keyup)="applyFilter($event)" placeholder="Search rosters (name, area, status)..." #filterInput>
          </div>
          <div class="ui-card" style="margin-bottom:0; padding:0 1rem; background:var(--surface-2); display:flex; align-items:center; gap:0.5rem; height:42px; border-radius:10px;">
            <span style="font-size:0.7rem; font-weight:800; color:var(--txt-muted); text-transform:uppercase;">Week:</span>
            <strong style="font-size:0.8rem;">{{ currentWeekLabel() }}</strong>
          </div>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="openAddDrawer()" *appHasScope="['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE']">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon>
          Add Shift
        </button>
      </div>

      <div class="ui-card" style="padding:0; overflow:visible; border-radius:14px;">
        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading shifts…</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort class="ui-table">
              
              <!-- Employee Column -->
              <ng-container matColumnDef="employee">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Employee</th>
                <td mat-cell *matCellDef="let shift">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="avatar-sm">{{ getInitials(shift.employeeId) }}</div>
                    <span style="font-weight:700;">{{ getEmployeeName(shift.employeeId) }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Time Column -->
              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Time</th>
                <td mat-cell *matCellDef="let shift">
                  <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:700; font-size:0.85rem;">{{ shift.startTime | date:'MMM d, HH:mm' }}</span>
                    <span style="color:var(--txt-muted); font-size:0.7rem; font-family:'JetBrains Mono';">until {{ shift.endTime | date:'HH:mm' }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Area Column -->
              <ng-container matColumnDef="area">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Area</th>
                <td mat-cell *matCellDef="let shift">
                  <span class="ui-badge" style="background:var(--surface-2); color:var(--txt-secondary);">{{ shift.area || 'General' }}</span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Status</th>
                <td mat-cell *matCellDef="let shift">
                  <span class="ui-badge" [class.ui-badge-success]="shift.status === 'PUBLISHED'" 
                                        [class.ui-badge-warning]="shift.status === 'ASSIGNED'"
                                        [class.ui-badge-danger]="shift.status === 'CANCELLED'">
                    {{ shift.status }}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right;"></th>
                <td mat-cell *matCellDef="let shift" style="text-align:right;">
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger" aria-label="Row actions">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openViewDrawer(shift)">
                      <mat-icon>visibility</mat-icon>
                      <span>View details</span>
                    </button>
                    <button mat-menu-item (click)="openEditDrawer(shift)" *appHasScope="['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE', 'SCHEDULE_DELETE']">
                      <mat-icon>edit</mat-icon>
                      <span>Edit shift</span>
                    </button>
                    <mat-divider *appHasScope="['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE', 'SCHEDULE_DELETE']"></mat-divider>
                    <button mat-menu-item (click)="confirmDelete(shift)" style="color:var(--danger);" *appHasScope="['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE', 'SCHEDULE_DELETE']">
                      <mat-icon style="color:var(--danger);">delete_forever</mat-icon>
                      <span>Delete shift</span>
                    </button>
                    <button mat-menu-item (click)="requestSwap(shift)">
                      <mat-icon>swap_horiz</mat-icon>
                      <span>Request Swap</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
            @if (dataSource.filteredData.length === 0) {
              <div style="padding: 3rem; text-align: center; color: var(--txt-muted); font-size: 0.85rem;">No shifts found. Add your first shift to build the roster.</div>
            }
          </div>

          <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
            <span class="pag-counter-label">
              Total shifts: {{ dataSource.filteredData.length }}
            </span>
            <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent;"></mat-paginator>
          </div>
        }
      </div>

    </div>

    <!-- SWAP REQUESTS -->
    <div class="ui-card" style="margin-top:1.5rem;">
      <div class="ui-card-header"><h3>Swap requests ({{ swaps().length }})</h3></div>
      @if (!swaps().length) {
        <p style="color:var(--txt-muted);font-size:0.85rem;padding:0 1.5rem 1.5rem;">No swap requests. Use ⋮ → Request Swap on any shift.</p>
      } @else {
        <table class="ui-table">
          <tr><th>Shift</th><th>Requested by</th><th>Status</th><th style="text-align:right;"></th></tr>
          @for (s of swaps(); track s.id) {
            <tr>
              <td>#{{ s.originalShiftId }}</td><td>{{ s.requestingEmployeeId }}</td><td>{{ s.status }}</td>
              <td style="text-align:right;white-space:nowrap;">
                @if (s.status === 'PENDING') {
                  <button class="ui-btn" (click)="acceptSwap(s.id)">Accept</button>
                }
                @if (s.status === 'ACCEPTED') {
                  <button class="ui-btn ui-btn-primary" (click)="approveSwap(s.id)" *appHasScope="['SCHEDULE_TEAM_WRITE', 'SCHEDULE_ORG_WRITE', 'SCHEDULE_DELETE']">Approve</button>
                }
              </td>
            </tr>
          }
        </table>
      }
    </div>

    <!-- CRUD SIDE SHEET DRAWER -->
    <app-side-sheet-drawer
      [isOpen]="isDrawerOpen"
      [title]="drawerTitle"
      [subtitle]="drawerSubtitle"
      [saveText]="drawerSaveText"
      [saveDisabled]="shiftForm.invalid"
      [showFooter]="currentMode !== 'view'"
      (close)="closeDrawer()"
      (save)="saveShift()"
    >
      <form [formGroup]="shiftForm" class="drawer-crud-form">
        
        <div class="form-section">Assignment</div>
        <div class="f-group">
          <label>Employee</label>
          <select class="f-input" formControlName="employeeId">
            <option [value]="null">Unassigned</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeNumber }})</option>
            }
          </select>
        </div>

        <div class="form-section">Schedule</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Starts</label>
            <input class="f-input" type="datetime-local" formControlName="startTime">
          </div>
          <div class="f-group">
            <label>Ends</label>
            <input class="f-input" type="datetime-local" formControlName="endTime">
          </div>
        </div>

        <div class="form-section">Details</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Area</label>
            <input class="f-input" formControlName="area" placeholder="e.g. Floor A, HQ">
          </div>
          <div class="f-group">
            <label>Status</label>
            <select class="f-input" formControlName="status">
              <option value="OPEN">Open (Unassigned)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PUBLISHED">Published (Locked)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="f-group">
          <label>Notes</label>
          <textarea class="f-input" formControlName="notes" style="height:100px; padding:0.75rem;" placeholder="Special instructions for this shift…"></textarea>
        </div>

      </form>
    </app-side-sheet-drawer>

    <!-- CONFIRM DELETE MODAL -->
    <div class="confirm-modal-overlay" [class.open]="showDeleteConfirm">
      <div class="confirm-modal-box">
        <mat-icon style="font-size:3rem; width:3rem; height:3rem; color:var(--danger); margin-bottom:1rem;">auto_delete</mat-icon>
        <h3>Delete this shift?</h3>
        <p>This will permanently remove the shift from the roster. This action cannot be undone.</p>
        <div style="display:flex; gap:0.75rem; margin-top:2rem; justify-content:center;">
          <button class="ui-btn ui-btn-secondary" (click)="showDeleteConfirm = false">Cancel</button>
          <button class="ui-btn ui-btn-danger" (click)="executeDelete()">Delete</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .table-container { min-height: 400px; position: relative; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    .action-trigger:hover { background: var(--surface-2); }
    
    .form-section { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin: 1.5rem 0 1rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; }
    .f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .f-group { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
    .f-group label { font-size: 0.75rem; font-weight: 700; color: var(--txt-secondary); text-transform: uppercase; letter-spacing: 0.03em; }
    .f-input { height: 42px; border-radius: 8px; border: 1.5px solid var(--border); padding: 0 0.85rem; font-family: inherit; font-size: 0.85rem; background: var(--surface); color: var(--txt-main); width: 100%; outline: none; transition: border-color 0.2s; }
    .f-input:focus { border-color: var(--primary); }

    .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); z-index: 9999; display: none; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: all 0.3s; }
    .confirm-modal-overlay.open { display: flex; }
    .confirm-modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 2.5rem; width: 440px; max-width: 95vw; box-shadow: var(--shadow-lg); text-align: center; }
    
    .ui-btn { padding: 0.6rem 1.2rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: all 0.2s; }
    .ui-btn-primary { background: var(--primary); color: #fff; box-shadow: 0 4px 12px rgba(47, 111, 235, 0.2); }
    .ui-btn-danger { background: var(--danger); color: #fff; }
    .ui-btn-secondary { background: var(--surface-2); color: var(--txt-secondary); }

    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }

    .avatar-sm { width: 28px; height: 28px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); display: grid; place-items: center; font-size: 0.65rem; font-weight: 800; }
  `]
})
export class SchedulingPageComponent implements OnInit {
  private readonly schedulingService = inject(SchedulingService);
  private readonly employeeDataService = inject(EmployeeDataService);
  private readonly fb = inject(FormBuilder);
  private readonly snack = inject(MatSnackBar);
  private readonly socket = inject(WidgetSocketService);

  protected dataSource = new MatTableDataSource<Shift>([]);
  protected isLoading = signal(true);
  protected employees = toSignal(this.employeeDataService.getEmployees(), { initialValue: [] });
  protected readonly displayedColumns = ['employee', 'time', 'area', 'status', 'actions'];

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    if (mp) this.dataSource.paginator = mp;
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    if (ms) this.dataSource.sort = ms;
  }

  // Drawer State
  isDrawerOpen = false;
  drawerTitle = 'Add Shift';
  drawerSubtitle = 'Create a new shift on the roster.';
  drawerSaveText = 'Save Shift';
  currentMode: 'add' | 'edit' | 'view' = 'add';
  selectedShift: Shift | null = null;

  // Modal State
  showDeleteConfirm = false;

  shiftForm: FormGroup = this.fb.group({
    employeeId: [null, [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
    area: ['GENERAL'],
    status: ['PUBLISHED', [Validators.required]],
    notes: ['']
  });

  constructor() {
    effect(() => {
      const latestEvent = this.socket.events()[0];
      if (latestEvent?.topic?.includes('scheduling')) {
        this.loadShifts();
      }
    });
  }

  protected readonly swaps = signal<ShiftSwapRequest[]>([]);

  /** Current ISO week label (replaces the hardcoded visual badge). */
  protected readonly currentWeekLabel = computed(() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    return `W${week} · ${month} ${now.getFullYear()}`;
  });

  ngOnInit(): void {
    this.loadShifts();
    this.loadSwaps();
  }

  loadSwaps(): void {
    this.schedulingService.getSwaps().subscribe({
      next: (swaps) => this.swaps.set(swaps),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Could not load swap requests.'), 'Dismiss', { duration: 5000 })
    });
  }

  requestSwap(shift: Shift): void {
    this.schedulingService.requestSwap(shift.id).subscribe({
      next: () => {
        this.snack.open('Swap requested.', 'OK', { duration: 3000 });
        this.loadSwaps();
      },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Swap request failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  acceptSwap(id: number): void {
    this.schedulingService.acceptSwap(id).subscribe({
      next: () => {
        this.snack.open('Swap accepted — awaiting manager approval.', 'OK', { duration: 3000 });
        this.loadSwaps();
      },
      error: (err) => this.snack.open(this.conflictMessage(err, 'Accept failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  approveSwap(id: number): void {
    this.schedulingService.approveSwap(id).subscribe({
      next: () => {
        this.snack.open('Swap approved.', 'OK', { duration: 3000 });
        this.loadSwaps();
        this.loadShifts();
      },
      error: (err) => this.snack.open(this.conflictMessage(err, 'Approval failed.'), 'Dismiss', { duration: 6000 })
    });
  }

  loadShifts(): void {
    this.isLoading.set(true);
    this.schedulingService.getShifts().pipe(
      catchError(() => {
        this.snack.open('Could not load shifts. Please try again.', 'OK', { duration: 4000 });
        return of([]);
      })
    ).subscribe(shifts => {
      this.dataSource.data = shifts;
      this.isLoading.set(false);
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  // --- CRUD ACTIONS ---

  openAddDrawer() {
    this.currentMode = 'add';
    this.drawerTitle = 'Add Shift';
    this.drawerSubtitle = 'Create a new shift on the roster.';
    this.drawerSaveText = 'Save Shift';
    this.shiftForm.reset({
      status: 'PUBLISHED',
      area: 'GENERAL'
    });
    this.shiftForm.enable();
    this.isDrawerOpen = true;
  }

  openEditDrawer(shift: Shift) {
    this.currentMode = 'edit';
    this.selectedShift = shift;
    this.drawerTitle = 'Edit Shift';
    this.drawerSubtitle = `Updating shift #${shift.id}.`;
    this.drawerSaveText = 'Save Changes';
    this.shiftForm.patchValue({
      ...shift,
      startTime: this.formatDateForInput(shift.startTime),
      endTime: this.formatDateForInput(shift.endTime)
    });
    this.shiftForm.enable();
    this.isDrawerOpen = true;
  }

  openViewDrawer(shift: Shift) {
    this.currentMode = 'view';
    this.selectedShift = shift;
    this.drawerTitle = 'Shift Details';
    this.drawerSubtitle = 'Shift information.';
    this.shiftForm.patchValue({
      ...shift,
      startTime: this.formatDateForInput(shift.startTime),
      endTime: this.formatDateForInput(shift.endTime)
    });
    this.shiftForm.disable();
    this.isDrawerOpen = true;
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedShift = null;
  }

  saveShift() {
    if (this.shiftForm.invalid) return;
    this.isLoading.set(true);
    const data = {
        ...this.shiftForm.value,
        startTime: new Date(this.shiftForm.value.startTime).toISOString(),
        endTime: new Date(this.shiftForm.value.endTime).toISOString()
    };

    if (this.currentMode === 'add') {
      this.schedulingService.createShift(data).subscribe({
        next: () => {
          this.snack.open('Shift added.', 'OK', { duration: 3000 });
          this.loadShifts();
          this.closeDrawer();
        },
        error: (err) => {
          this.snack.open(this.conflictMessage(err, 'Could not add shift.'), 'Dismiss', { duration: 6000 });
          this.isLoading.set(false);
        }
      });
    } else if (this.currentMode === 'edit' && this.selectedShift) {
      this.schedulingService.updateShift(this.selectedShift.id, data).subscribe({
        next: () => {
          this.snack.open('Shift updated.', 'OK', { duration: 3000 });
          this.loadShifts();
          this.closeDrawer();
        },
        error: (err) => {
          this.snack.open(this.conflictMessage(err, 'Could not update shift.'), 'Dismiss', { duration: 6000 });
          this.isLoading.set(false);
        }
      });
    }
  }

  /** Surface BE SHIFT_CONFLICT details (overlaps, leave, weekly-hours) instead of a generic error. */
  private conflictMessage(err: unknown, fallback: string): string {
    const conflict = this.schedulingService.extractShiftConflict(err);
    const details = conflict?.data?.conflicts?.map((c) => c.message).filter(Boolean).join(' ');
    return details ? `${conflict?.message ?? 'Shift conflict.'} ${details}` : backendErrorMessage(err, fallback);
  }

  confirmDelete(shift: Shift) {
    this.selectedShift = shift;
    this.showDeleteConfirm = true;
  }

  executeDelete() {
    if (!this.selectedShift) return;
    this.isLoading.set(true);
    this.schedulingService.deleteShift(this.selectedShift.id).subscribe({
      next: () => {
        this.snack.open('Shift deleted.', 'OK', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.loadShifts();
      },
      error: (err) => {
        this.snack.open(backendErrorMessage(err, 'Could not delete shift.'), 'Dismiss', { duration: 5000 });
        this.isLoading.set(false);
      }
    });
  }

  // --- HELPERS ---
  getInitials(empId: number): string {
    const emp = this.employees().find(e => e.id === empId);
    return emp ? (emp.firstName[0] + emp.lastName[0]).toUpperCase() : '??';
  }
  getEmployeeName(empId: number): string {
    const emp = this.employees().find(e => e.id === empId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unassigned';
  }
  private formatDateForInput(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  }
}
