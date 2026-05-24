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
import { SchedulingService, Shift } from '../../core/services/scheduling.service';
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
            <span style="font-size:0.7rem; font-weight:800; color:var(--txt-muted); text-transform:uppercase;">Epoch:</span>
            <strong style="font-size:0.8rem;">W24 - MAY 2026</strong>
          </div>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="openAddDrawer()" *appHasScope="'SCHEDULE_WRITE'">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">add</mat-icon>
          Deploy Shift
        </button>
      </div>

      <div class="ui-card" style="padding:0; overflow:visible; border-radius:14px;">
        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Synchronizing shift telemetry...</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort class="ui-table">
              
              <!-- Employee Column -->
              <ng-container matColumnDef="employee">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Assigned Node</th>
                <td mat-cell *matCellDef="let shift">
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="avatar-sm">{{ getInitials(shift.employeeId) }}</div>
                    <span style="font-weight:700;">{{ getEmployeeName(shift.employeeId) }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Time Column -->
              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Epoch Interval</th>
                <td mat-cell *matCellDef="let shift">
                  <div style="display:flex; flex-direction:column; gap:2px;">
                    <span style="font-weight:700; font-size:0.85rem;">{{ shift.startTime | date:'MMM d, HH:mm' }}</span>
                    <span style="color:var(--txt-muted); font-size:0.7rem; font-family:'JetBrains Mono';">UNTIL {{ shift.endTime | date:'HH:mm' }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Area Column -->
              <ng-container matColumnDef="area">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Sector / Area</th>
                <td mat-cell *matCellDef="let shift">
                  <span class="ui-badge" style="background:var(--surface-2); color:var(--txt-secondary);">{{ shift.area || 'GENERAL' }}</span>
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Deployment Status</th>
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
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger">
                    <mat-icon style="color:var(--txt-muted); font-size:18px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openViewDrawer(shift)">
                      <mat-icon>visibility</mat-icon>
                      <span>Inspect Packet</span>
                    </button>
                    <button mat-menu-item (click)="openEditDrawer(shift)" *appHasScope="'SCHEDULE_WRITE'">
                      <mat-icon>edit</mat-icon>
                      <span>Modify Roster</span>
                    </button>
                    <mat-divider *appHasScope="'SCHEDULE_WRITE'"></mat-divider>
                    <button mat-menu-item (click)="confirmDelete(shift)" style="color:var(--danger);" *appHasScope="'SCHEDULE_WRITE'">
                      <mat-icon style="color:var(--danger);">delete_forever</mat-icon>
                      <span>Purge Deployment</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
          </div>

          <div class="table-pag-row" style="padding: 1rem 1.5rem; border-top:1px solid var(--border);">
            <span class="pag-counter-label">
              Total Active Deployments: {{ dataSource.filteredData.length }}
            </span>
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
      [saveDisabled]="shiftForm.invalid"
      [showFooter]="currentMode !== 'view'"
      (close)="closeDrawer()"
      (save)="saveShift()"
    >
      <form [formGroup]="shiftForm" class="drawer-crud-form">
        
        <div class="form-section">Target Assignment</div>
        <div class="f-group">
          <label>Personnel Node</label>
          <select class="f-input" formControlName="employeeId">
            <option [value]="null">UNASSIGNED_SLOT</option>
            @for (emp of employees(); track emp.id) {
              <option [value]="emp.id">{{ emp.firstName }} {{ emp.lastName }} ({{ emp.employeeNumber }})</option>
            }
          </select>
        </div>

        <div class="form-section">Epoch Configuration</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Start Interval</label>
            <input class="f-input" type="datetime-local" formControlName="startTime">
          </div>
          <div class="f-group">
            <label>Termination Interval</label>
            <input class="f-input" type="datetime-local" formControlName="endTime">
          </div>
        </div>

        <div class="form-section">Deployment Metadata</div>
        <div class="f-grid">
          <div class="f-group">
            <label>Sector / Area</label>
            <input class="f-input" formControlName="area" placeholder="e.g. Sector-A, HQ">
          </div>
          <div class="f-group">
            <label>Operational Status</label>
            <select class="f-input" formControlName="status">
              <option value="OPEN">Open (Unassigned)</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="PUBLISHED">Published (Locked)</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div class="f-group">
          <label>Administrative Notes</label>
          <textarea class="f-input" formControlName="notes" style="height:100px; padding:0.75rem;" placeholder="Special instructions for the deployment node..."></textarea>
        </div>

      </form>
    </app-side-sheet-drawer>

    <!-- CONFIRM PURGE MODAL -->
    <div class="confirm-modal-overlay" [class.open]="showDeleteConfirm">
      <div class="confirm-modal-box">
        <mat-icon style="font-size:3rem; width:3rem; height:3rem; color:var(--danger); margin-bottom:1rem;">auto_delete</mat-icon>
        <h3>Confirm Deployment Purge?</h3>
        <p>This will permanently remove the shift packet from the operational roster. This action is irreversible.</p>
        <div style="display:flex; gap:0.75rem; margin-top:2rem; justify-content:center;">
          <button class="ui-btn ui-btn-secondary" (click)="showDeleteConfirm = false">Abort Purge</button>
          <button class="ui-btn ui-btn-danger" (click)="executeDelete()">Confirm Purge</button>
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Drawer State
  isDrawerOpen = false;
  drawerTitle = 'Deploy Shift';
  drawerSubtitle = 'Initializing new operational roster node.';
  drawerSaveText = 'Lock Deployment';
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

  ngOnInit(): void {
    this.loadShifts();
  }

  loadShifts(): void {
    this.isLoading.set(true);
    this.schedulingService.getShifts().pipe(
      catchError(() => {
        this.snack.open('Roster synchronization failed.', 'OK', { duration: 4000 });
        return of([]);
      })
    ).subscribe(shifts => {
      this.dataSource.data = shifts;
      this.dataSource.paginator = this.paginator;
      this.dataSource.sort = this.sort;
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
    this.drawerTitle = 'Deploy Shift Packet';
    this.drawerSubtitle = 'Provisioning a new operational interval.';
    this.drawerSaveText = 'Lock Deployment';
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
    this.drawerTitle = 'Modify Roster Packet';
    this.drawerSubtitle = `Altering deployment parameters for ID: ${shift.id}.`;
    this.drawerSaveText = 'Sync Changes';
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
    this.drawerTitle = 'Shift Packet Inspection';
    this.drawerSubtitle = 'Viewing high-fidelity roster metadata.';
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
          this.snack.open('Shift Deployment Locked.', 'OK', { duration: 3000 });
          this.loadShifts();
          this.closeDrawer();
        },
        error: () => {
          this.snack.open('Deployment Failure.', 'OK', { duration: 4000 });
          this.isLoading.set(false);
        }
      });
    } else if (this.currentMode === 'edit' && this.selectedShift) {
      this.schedulingService.updateShift(this.selectedShift.id, data).subscribe({
        next: () => {
          this.snack.open('Roster Packet Synchronized.', 'OK', { duration: 3000 });
          this.loadShifts();
          this.closeDrawer();
        },
        error: () => {
          this.snack.open('Synchronization Failure.', 'OK', { duration: 4000 });
          this.isLoading.set(false);
        }
      });
    }
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
        this.snack.open('Shift Packet Purged.', 'OK', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.loadShifts();
      },
      error: () => {
        this.snack.open('Purge Protocol Failed.', 'OK', { duration: 4000 });
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
    return emp ? `${emp.firstName} ${emp.lastName}` : 'UNASSIGNED';
  }
  private formatDateForInput(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  }
}
