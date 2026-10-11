import { Component, inject, signal, computed, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { OnboardingService, OnboardingTask } from '../../core/services/onboarding.service';
import { EmployeeFormComponent } from './employee-form.component';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';
import { backendErrorMessage } from '../../shared/utils/password-policy';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatMenuModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule,
    HasScopeDirective, ReactiveFormsModule, FormsModule, CurrencyPipe
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-employees">
      
      <!-- PAGE HEADER -->
      <div class="filter-action-row">
        <div class="filter-ctrls-group">
          <div class="input-icon-wrap" style="width:400px;">
            <mat-icon style="font-size:18px; width:18px; height:18px; left:1rem; color:var(--txt-muted)">search</mat-icon>
            <input type="text" class="f-input" style="padding-left:3rem; height:48px; border-radius:12px;"
                   (keyup)="applyFilter($event)" placeholder="Filter this page..." aria-label="Filter employees on this page" #filterInput>
          </div>
        </div>
        <button class="ui-btn ui-btn-primary" style="height:48px; padding:0 1.5rem; border-radius:12px;" (click)="openAddDialog()" *appHasScope="'USER_CREATE'">
          <mat-icon style="font-size:1.2rem;">person_add</mat-icon>
          Add Employee
        </button>
      </div>

      <div class="ui-card" style="padding:0; overflow:visible; border-radius:0; background:transparent; border:none; box-shadow:none;">
        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:10rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSort($event)" class="ui-table core-grid" aria-label="Employee directory">
              
              <!-- Name & Identity Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="grid-hdr">NAME & IDENTITY</th>
                <td mat-cell *matCellDef="let emp">
                  <div class="table-avatar-cell">
                    <div class="avatar-cell-circle" [style.background]="getAvatarBg(emp.firstName)">
                      {{ getInitials(emp) }}
                    </div>
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <span class="avatar-cell-name">{{ emp.firstName }} {{ emp.lastName }}</span>
                      <span *ngIf="emp.email" style="font-size:0.7rem; color:var(--txt-muted); text-transform:uppercase; letter-spacing:0.05em;">{{ emp.jobTitle || '—' }}</span>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Salary Column (not server-sortable: no salary property on the employee record) -->
              <ng-container matColumnDef="salary">
                <th mat-header-cell *matHeaderCellDef class="grid-hdr">SALARY (MONTHLY)</th>
                <td mat-cell *matCellDef="let emp" class="text-mono" style="font-weight:600;">
                   @if (emp.salary != null) { {{ emp.salary | currency }} } @else { <span style="color:var(--txt-muted);">—</span> }
                </td>
              </ng-container>

              <!-- Status Column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="grid-hdr">STATUS</th>
                <td mat-cell *matCellDef="let emp">
                  <span class="ui-badge" [class.ui-badge-success]="emp.status === 'ACTIVE'" 
                                        [class.ui-badge-warning]="emp.status === 'ONBOARDING'"
                                        [class.ui-badge-danger]="emp.status === 'TERMINATED'">
                    {{ emp.status }}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="text-align:right;"></th>
                <td mat-cell *matCellDef="let emp" style="text-align:right;">
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger" aria-label="Row actions">
                    <mat-icon style="color:var(--txt-muted); font-size:20px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openEditDialog(emp)" *appHasScope="'USER_WRITE'">
                      <mat-icon>edit</mat-icon>
                      <span>Edit employee</span>
                    </button>
                    <button mat-menu-item (click)="openOnboarding(emp)">
                      <mat-icon>checklist</mat-icon>
                      <span>Onboarding checklist</span>
                    </button>
                    <button mat-menu-item (click)="confirmDelete(emp)" style="color:var(--danger);" *appHasScope="'USER_DEACTIVATE'">
                      <mat-icon style="color:var(--danger);">block</mat-icon>
                      <span>Deactivate employee</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
            @if (dataSource.data.length === 0) {
              <div class="empty-state">No employees found. Add your first employee to get started.</div>
            }
          </div>

          <mat-paginator [length]="totalElements()" [pageIndex]="pageIndex" [pageSize]="pageSize"
                       [pageSizeOptions]="[10, 25, 100]" (page)="onPage($event)"
                       style="background:transparent; color:#94a3b8; font-size:0.75rem; font-weight:700;"></mat-paginator>
        }
      </div>

      @if (showBoard && selectedEmployee) {
        <div class="ui-card" style="margin-top:1.5rem; border-radius:16px; padding:1.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h3 style="margin:0;">Onboarding — {{ selectedEmployee.firstName }} {{ selectedEmployee.lastName }}</h3>
            <button class="ui-btn ui-btn-secondary" (click)="showBoard = false">Close</button>
          </div>
          <p style="font-size:0.75rem; color:var(--txt-muted);">{{ doneCount() }}/{{ onboardingTasks().length }} complete · auto-created on hire</p>
          @for (t of onboardingTasks(); track t.id) {
            <div style="display:flex; gap:0.75rem; align-items:center; padding:0.6rem 0; border-bottom:1px solid var(--border); font-size:0.85rem;">
              <input type="checkbox" [checked]="t.isCompleted" (change)="completeTask(t)" [attr.aria-label]="'Complete ' + t.taskName">
              <div style="flex:1;">
                <strong [style.text-decoration]="t.isCompleted ? 'line-through' : 'none'">{{ t.taskName }}</strong>
                <span style="color:var(--txt-muted);"> · {{ t.category || 'GENERAL' }}</span><br>
                <small style="color:var(--txt-muted);">{{ t.description || '' }}</small>
              </div>
              <button class="ui-btn ui-btn-secondary" style="color:var(--danger);" (click)="deleteTask(t.id)">Remove</button>
            </div>
          }
          <div style="display:flex; gap:0.5rem; margin-top:1rem;">
            <input class="f-input" [(ngModel)]="newTaskName" placeholder="New task…" style="flex:1;">
            <select class="f-input" [(ngModel)]="newTaskCategory" style="width:170px;">
              <option value="DOCUMENTATION">Documentation</option>
              <option value="TRAINING">Training</option>
              <option value="EQUIPMENT">Equipment</option>
            </select>
            <button class="ui-btn ui-btn-primary" (click)="addTask()" [disabled]="!newTaskName.trim()">Assign</button>
          </div>
        </div>
      }

    </div>

    <!-- CONFIRM MODAL -->
    <div class="confirm-modal-overlay" [class.open]="showDeleteConfirm">
      <div class="confirm-modal-box">
        <mat-icon style="font-size:3.5rem; width:3rem; height:3rem; color:var(--danger); margin-bottom:1.5rem;">warning</mat-icon>
        <h3>Deactivate this employee?</h3>
        <p><strong>{{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }}</strong> will no longer be able to sign in. You can re-hire them later if needed.</p>
        <div style="display:flex; gap:1rem; margin-top:2.5rem; justify-content:center;">
          <button class="ui-btn ui-btn-secondary" (click)="showDeleteConfirm = false">Cancel</button>
          <button class="ui-btn ui-btn-danger" (click)="executeDelete()">Deactivate</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    
    .grid-hdr { font-size: 0.75rem !important; font-weight: 900 !important; color: var(--txt-muted) !important; letter-spacing: 0.08em !important; }
    .core-grid { background: transparent !important; }
    .ui-table td { padding: 1.5rem 1rem !important; border-bottom: 1px solid var(--border) !important; }
    .table-row-hover:hover td { background: var(--surface-2) !important; }

    .table-avatar-cell { display: flex; align-items: center; gap: 1.25rem; }
    .avatar-cell-circle { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 0.9rem; font-weight: 900; color: #fff; }
    .avatar-cell-name { font-weight: 800; font-size: 1rem; }

    .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(9, 13, 22, 0.6); z-index: 9999; display: none; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
    .confirm-modal-overlay.open { display: flex; }
    .confirm-modal-box { background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 4rem 3rem; width: 500px; max-width: 95vw; box-shadow: var(--shadow-lg); text-align: center; }

    .ui-btn { padding: 0.7rem 1.5rem; border-radius: 12px; font-size: 0.9rem; font-weight: 800; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: 0.2s; }
    .ui-btn-primary { background: var(--primary); color: #fff; box-shadow: 0 8px 20px rgba(47, 111, 235, 0.3); }
    .ui-btn-danger { background: var(--danger); color: #fff; }
    .ui-btn-secondary { background: var(--surface-2); color: var(--txt-secondary); border: 1px solid var(--border); }
    .empty-state { padding: 3rem; text-align: center; color: var(--txt-muted); }
  `]
})
export class EmployeesPageComponent implements OnInit, AfterViewInit {
  private readonly employeeDataService = inject(EmployeeDataService);
  private readonly onboardingApi = inject(OnboardingService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected dataSource = new MatTableDataSource<Employee>([]);
  protected isLoading = signal(true);
  protected readonly displayedColumns = ['name', 'salary', 'status', 'actions'];
  /** Server-side paging state (BE Page). Text search filters the loaded page only. */
  protected readonly totalElements = signal(0);
  protected pageIndex = 0;
  protected pageSize = 10;
  protected sortParam = 'lastName,asc';

  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    // Length/page are driven by (page) events + [length] binding below,
    // not by MatTableDataSource — every page is a fresh server query.
  }
  @ViewChild(MatSort) set matSort(ms: MatSort) {
    // Sorting is server-side via (matSortChange); no client MatSort wiring.
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  /** Maps table columns to BE-sortable properties; unknown columns keep the default order. */
  onSort(sort: Sort): void {
    const mapping: Record<string, string> = { name: 'lastName', status: 'status' };
    const property = mapping[sort.active];
    this.sortParam = property && sort.direction ? `${property},${sort.direction}` : 'lastName,asc';
    this.pageIndex = 0;
    this.loadEmployees();
  }

  showDeleteConfirm = false;
  selectedEmployee: Employee | null = null;

  // Onboarding checklist board (BE auto-creates defaults on hire)
  showBoard = false;
  protected readonly onboardingTasks = signal<OnboardingTask[]>([]);
  protected readonly doneCount = computed(() => this.onboardingTasks().filter((t) => t.isCompleted).length);
  newTaskName = '';
  newTaskCategory = 'DOCUMENTATION';

  openOnboarding(emp: Employee): void {
    this.selectedEmployee = emp;
    this.showBoard = true;
    this.reloadOnboarding();
  }

  reloadOnboarding(): void {
    if (!this.selectedEmployee) return;
    this.onboardingApi.getTasksForEmployee(this.selectedEmployee.id).subscribe({
      next: (tasks) => this.onboardingTasks.set(tasks ?? []),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Onboarding unavailable.'), 'Dismiss', { duration: 5000 })
    });
  }

  completeTask(t: OnboardingTask): void {
    if (t.isCompleted) return;
    this.onboardingApi.completeTask(t.id).subscribe({
      next: () => this.reloadOnboarding(),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Complete failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  deleteTask(id: number): void {
    this.onboardingApi.deleteTask(id).subscribe({
      next: () => this.reloadOnboarding(),
      error: (err) => this.snack.open(backendErrorMessage(err, 'Delete failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  addTask(): void {
    if (!this.selectedEmployee || !this.newTaskName.trim()) return;
    this.onboardingApi.createTask({
      employeeId: this.selectedEmployee.id,
      taskName: this.newTaskName.trim(),
      category: this.newTaskCategory
    }).subscribe({
      next: () => { this.newTaskName = ''; this.reloadOnboarding(); },
      error: (err) => this.snack.open(backendErrorMessage(err, 'Assign failed.'), 'Dismiss', { duration: 5000 })
    });
  }

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngAfterViewInit(): void {
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeDataService.getEmployeesPaged({ page: this.pageIndex, size: this.pageSize, sort: this.sortParam }).pipe(
      catchError((err) => {
        this.snack.open(backendErrorMessage(err, 'Could not load employees. Please try again.'), 'Retry', { duration: 4000 });
        return of(null);
      })
    ).subscribe((page) => {
      this.dataSource.data = page?.content ?? [];
      this.totalElements.set(page?.totalElements ?? 0);
      // Client text filter applies to the loaded page only (server has no
      // free-text employee search; see searchByEmail for exact lookup).
      this.dataSource.filter = '';
      this.isLoading.set(false);
    });
  }

  protected getInitials(emp: Employee): string {
    return ((emp.firstName?.[0] || '') + (emp.lastName?.[0] || '')).toUpperCase() || '??';
  }

  protected getAvatarBg(name: string): string {
    const bgs = ['#2f6feb', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    return bgs[(name?.length || 0) % bgs.length];
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(EmployeeFormComponent, {
      width: '850px',
      panelClass: 'pro-dev-dialog',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        this.employeeDataService.createEmployee(result).subscribe({
          next: () => {
            this.snack.open('Employee added.', 'OK', { duration: 3000 });
            this.loadEmployees();
          },
          error: () => {
            this.snack.open('Could not add employee. Please try again.', 'OK', { duration: 4000 });
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  openEditDialog(emp: Employee) {
    const dialogRef = this.dialog.open(EmployeeFormComponent, {
      width: '850px',
      panelClass: 'pro-dev-dialog',
      data: emp
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        this.employeeDataService.updateEmployee(emp.id, result).subscribe({
          next: () => {
            this.snack.open('Employee updated.', 'OK', { duration: 3000 });
            this.loadEmployees();
          },
          error: () => {
            this.snack.open('Could not update employee. Please try again.', 'OK', { duration: 4000 });
            this.isLoading.set(false);
          }
        });
      }
    });
  }

  confirmDelete(emp: Employee) {
    this.selectedEmployee = emp;
    this.showDeleteConfirm = true;
  }

  executeDelete() {
    if (!this.selectedEmployee) return;
    this.isLoading.set(true);
    this.employeeDataService.deleteEmployee(this.selectedEmployee.id).subscribe({
      next: () => {
        this.snack.open('Employee deactivated.', 'OK', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.loadEmployees();
      },
      error: () => {
        this.snack.open('Could not deactivate employee. Please try again.', 'OK', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }
}
