import { Component, inject, signal, computed, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ReactiveFormsModule } from '@angular/forms';
import { EmployeeDataService, Employee } from '../../core/services/employee-data.service';
import { EmployeeFormComponent } from './employee-form.component';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { HasScopeDirective } from '../../shared/directives/has-scope.directive';

@Component({
  selector: 'app-employees-page',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatSortModule, MatMenuModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, MatDividerModule,
    HasScopeDirective, ReactiveFormsModule, CurrencyPipe
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-employees">
      
      <!-- PAGE HEADER -->
      <div class="filter-action-row">
        <div class="filter-ctrls-group">
          <div class="input-icon-wrap" style="width:400px;">
            <mat-icon style="font-size:18px; width:18px; height:18px; left:1rem; color:var(--txt-muted)">search</mat-icon>
            <input type="text" class="f-input" style="padding-left:3rem; height:48px; border-radius:12px; background:#0f172a; border:1px solid #1e293b;" 
                   (keyup)="applyFilter($event)" placeholder="Search employees or codes..." #filterInput>
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
            <table mat-table [dataSource]="dataSource" matSort class="ui-table core-grid">
              
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
                      <span *ngIf="emp.email" style="font-size:0.7rem; color:var(--txt-muted); text-transform:uppercase; letter-spacing:0.05em;">{{ emp.jobTitle || 'OPERATIONAL_NODE' }}</span>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Salary Column -->
              <ng-container matColumnDef="salary">
                <th mat-header-cell *matHeaderCellDef mat-sort-header class="grid-hdr">SALARY (MONTHLY)</th>
                <td mat-cell *matCellDef="let emp" class="text-mono" style="font-weight:600;">
                   {{ (emp.salary || 2400) | currency }}
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
                  <button mat-icon-button [matMenuTriggerFor]="menu" class="action-trigger">
                    <mat-icon style="color:var(--txt-muted); font-size:20px;">more_vert</mat-icon>
                  </button>
                  <mat-menu #menu="matMenu" xPosition="before" class="ui-menu">
                    <button mat-menu-item (click)="openEditDialog(emp)" *appHasScope="'USER_WRITE'">
                      <mat-icon>edit</mat-icon>
                      <span>Modify Identity</span>
                    </button>
                    <button mat-menu-item (click)="confirmDelete(emp)" style="color:var(--danger);" *appHasScope="'USER_DEACTIVATE'">
                      <mat-icon style="color:var(--danger);">block</mat-icon>
                      <span>Terminate Session</span>
                    </button>
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
          </div>

          <mat-paginator [pageSizeOptions]="[10, 25, 100]" hidePageSize="true" style="background:transparent; color:#94a3b8; font-size:0.75rem; font-weight:700;"></mat-paginator>
        }
      </div>

    </div>

    <!-- CONFIRM MODAL -->
    <div class="confirm-modal-overlay" [class.open]="showDeleteConfirm">
      <div class="confirm-modal-box">
        <mat-icon style="font-size:3.5rem; width:3rem; height:3rem; color:var(--danger); margin-bottom:1.5rem;">warning</mat-icon>
        <h3>Confirm Session Termination?</h3>
        <p>You are about to terminate the session node for <strong>{{ selectedEmployee?.firstName }} {{ selectedEmployee?.lastName }}</strong>. This action is irreversible.</p>
        <div style="display:flex; gap:1rem; margin-top:2.5rem; justify-content:center;">
          <button class="ui-btn ui-btn-secondary" (click)="showDeleteConfirm = false">Abort Sync</button>
          <button class="ui-btn ui-btn-danger" (click)="executeDelete()">Confirm Termination</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .text-mono { font-family: 'JetBrains Mono', monospace; }
    
    .grid-hdr { font-size: 0.75rem !important; font-weight: 900 !important; color: #94a3b8 !important; letter-spacing: 0.08em !important; }
    .core-grid { background: transparent !important; }
    .ui-table td { padding: 1.5rem 1rem !important; border-bottom: 1px solid #1e293b !important; color: #fff !important; }
    .table-row-hover:hover td { background: rgba(255,255,255,0.02) !important; }

    .table-avatar-cell { display: flex; align-items: center; gap: 1.25rem; }
    .avatar-cell-circle { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; font-size: 0.9rem; font-weight: 900; color: #fff; }
    .avatar-cell-name { font-weight: 800; font-size: 1rem; color: #fff; }

    .confirm-modal-overlay { position: fixed; inset: 0; background: rgba(9, 13, 22, 0.85); z-index: 9999; display: none; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
    .confirm-modal-overlay.open { display: flex; }
    .confirm-modal-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 4rem 3rem; width: 500px; max-width: 95vw; box-shadow: var(--shadow-lg); text-align: center; color: #fff; }
    
    .ui-btn { padding: 0.7rem 1.5rem; border-radius: 12px; font-size: 0.9rem; font-weight: 800; cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 0.5rem; transition: 0.2s; }
    .ui-btn-primary { background: var(--primary); color: #fff; box-shadow: 0 8px 20px rgba(47, 111, 235, 0.3); }
    .ui-btn-danger { background: var(--danger); color: #fff; }
    .ui-btn-secondary { background: #1e293b; color: #94a3b8; border: 1px solid #334155; }
    .ui-menu { background: #1e293b !important; border: 1px solid #334155 !important; }
  `]
})
export class EmployeesPageComponent implements OnInit, AfterViewInit {
  private readonly employeeDataService = inject(EmployeeDataService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected dataSource = new MatTableDataSource<Employee>([]);
  protected isLoading = signal(true);
  protected readonly displayedColumns = ['name', 'salary', 'status', 'actions'];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  showDeleteConfirm = false;
  selectedEmployee: Employee | null = null;

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeDataService.getEmployees().pipe(
      catchError(() => {
        this.snack.open('Registry Link Failure.', 'RETRY', { duration: 4000 });
        return of([]);
      })
    ).subscribe(employees => {
      this.dataSource.data = employees;
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
            this.snack.open('Identity Node Initialized.', 'OK', { duration: 3000 });
            this.loadEmployees();
          },
          error: () => {
            this.snack.open('Initialization Protocol Error.', 'OK', { duration: 4000 });
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
            this.snack.open('Identity Node Synchronized.', 'OK', { duration: 3000 });
            this.loadEmployees();
          },
          error: () => {
            this.snack.open('Synchronization Protocol Error.', 'OK', { duration: 4000 });
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
        this.snack.open('Personnel Node Deactivated.', 'OK', { duration: 3000 });
        this.showDeleteConfirm = false;
        this.loadEmployees();
      },
      error: () => {
        this.snack.open('Deactivation protocol failed.', 'OK', { duration: 4000 });
        this.isLoading.set(false);
      }
    });
  }
}
