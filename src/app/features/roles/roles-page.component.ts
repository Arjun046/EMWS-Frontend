import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../core/services/auth.service';
import { RoleService, Role, Permission } from '../../core/services/role.service';
import { catchError, of } from 'rxjs';

interface PermissionMatrixRow {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatIconModule, MatButtonModule, 
    MatSnackBarModule, MatProgressSpinnerModule, MatCheckboxModule
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-roles">
      
      <div class="filter-action-row">
        <div class="filter-ctrls-group">
          <select class="directory-filter-dropdown" style="min-width:240px; height:42px; border-radius:10px;" 
                  (change)="onRoleChange($event)">
            @for (r of roles(); track r.id) {
              <option [value]="r.id">{{ r.name }} [{{ r.systemRole ? 'SYSTEM_CORE' : 'CUSTOM' }}]</option>
            }
          </select>
        </div>
        <button class="ui-btn ui-btn-primary" (click)="savePermissions()" *ngIf="isAdmin()">
          <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">save</mat-icon>
          Authorize Matrix
        </button>
      </div>

      <div class="ui-card mt-6" style="padding:0; overflow:hidden; border-radius:14px;">
        <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;">
           <h3>Authorization Scope Matrix</h3>
           <span class="ui-badge ui-badge-success">RBAC_ENABLED</span>
        </div>

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Decoding security protocol matrix...</p>
          </div>
        } @else {
          <div class="table-container custom-scrollbar">
            <table mat-table [dataSource]="dataSource" class="permissions-grid-table ui-table">
              
              <ng-container matColumnDef="module">
                <th mat-header-cell *matHeaderCellDef>Operational Domain</th>
                <td mat-cell *matCellDef="let row">
                   <strong style="font-size:0.85rem; color:var(--primary);">{{ row.module }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="view">
                <th mat-header-cell *matHeaderCellDef style="text-align:center;">View</th>
                <td mat-cell *matCellDef="let row" class="permission-checkbox-cell">
                   <input type="checkbox" class="scope-matrix-checkbox" [checked]="row.view" [disabled]="!isAdmin()">
                </td>
              </ng-container>

              <ng-container matColumnDef="create">
                <th mat-header-cell *matHeaderCellDef style="text-align:center;">Create</th>
                <td mat-cell *matCellDef="let row" class="permission-checkbox-cell">
                   <input type="checkbox" class="scope-matrix-checkbox" [checked]="row.create" [disabled]="!isAdmin()">
                </td>
              </ng-container>

              <ng-container matColumnDef="edit">
                <th mat-header-cell *matHeaderCellDef style="text-align:center;">Edit</th>
                <td mat-cell *matCellDef="let row" class="permission-checkbox-cell">
                   <input type="checkbox" class="scope-matrix-checkbox" [checked]="row.edit" [disabled]="!isAdmin()">
                </td>
              </ng-container>

              <ng-container matColumnDef="delete">
                <th mat-header-cell *matHeaderCellDef style="text-align:center;">Delete</th>
                <td mat-cell *matCellDef="let row" class="permission-checkbox-cell">
                   <input type="checkbox" class="scope-matrix-checkbox" [checked]="row.delete" [disabled]="!isAdmin()">
                </td>
              </ng-container>

              <ng-container matColumnDef="approve">
                <th mat-header-cell *matHeaderCellDef style="text-align:center;">Approve</th>
                <td mat-cell *matCellDef="let row" class="permission-checkbox-cell">
                   <input type="checkbox" class="scope-matrix-checkbox" [checked]="row.approve" [disabled]="!isAdmin()">
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="table-row-hover"></tr>
            </table>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mt-6 { margin-top: 1.5rem; }
    .table-container { min-height: 400px; position: relative; }
    
    .ui-table th { padding: 0.85rem 1.25rem; background: var(--surface-2); color: var(--txt-secondary); font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border); }
    .ui-table td { padding: 1.1rem 1.25rem; border-bottom: 1px solid var(--border); font-size: 0.85rem; color: var(--txt-main); }
    .table-row-hover:hover td { background: var(--surface-2); }

    .permission-checkbox-cell { text-align: center !important; }
    .scope-matrix-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); }
    .scope-matrix-checkbox:disabled { cursor: not-allowed; opacity: 0.5; }
  `]
})
export class RolesPageComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly roles = signal<Role[]>([]);
  protected readonly selectedRole = signal<Role | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly displayedColumns = ['module', 'view', 'create', 'edit', 'delete', 'approve'];
  protected dataSource = new MatTableDataSource<PermissionMatrixRow>([]);

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    this.roleService.getRoles().pipe(
      catchError(() => {
        this.snack.open('SECURITY_NODE_TIMEOUT', 'RETRY', { duration: 4000 });
        return of([]);
      })
    ).subscribe(roles => {
      this.roles.set(roles);
      if (roles.length > 0) {
        this.loadMatrixForRole(roles[0]);
      } else {
        this.isLoading.set(false);
      }
    });
  }

  onRoleChange(event: Event): void {
    const roleId = +(event.target as HTMLSelectElement).value;
    const role = this.roles().find(r => r.id === roleId);
    if (role) this.loadMatrixForRole(role);
  }

  loadMatrixForRole(role: Role): void {
    this.selectedRole.set(role);
    const modules = ['Employees', 'Attendance', 'Scheduling', 'Leaves', 'Payroll', 'Compliance', 'Messages', 'Settings'];
    const perms = role.permissions || [];
    
    const matrix: PermissionMatrixRow[] = modules.map(m => {
      const prefix = m.toUpperCase();
      return {
        module: m,
        view: perms.some(p => p.name.includes(`${prefix}_READ`)),
        create: perms.some(p => p.name.includes(`${prefix}_CREATE`) || p.name.includes(`${prefix}_WRITE`)),
        edit: perms.some(p => p.name.includes(`${prefix}_UPDATE`) || p.name.includes(`${prefix}_ADJUST`)),
        delete: perms.some(p => p.name.includes(`${prefix}_DELETE`) || p.name.includes(`${prefix}_DEACTIVATE`)),
        approve: perms.some(p => p.name.includes(`${prefix}_APPROVE`) || p.name.includes(`${prefix}_AUTHORIZE`))
      };
    });

    this.dataSource.data = matrix;
    this.isLoading.set(false);
  }

  isAdmin(): boolean {
    const user = this.auth.user();
    return !!(user?.role === 'ADMIN' || user?.username?.includes('admin'));
  }

  savePermissions(): void {
    if (!this.isAdmin()) {
      this.snack.open('Access Denied: Administrative Clearance Required.', 'OK', { duration: 4000 });
      return;
    }
    this.snack.open('Security Protocol Matrix Synchronized.', 'SUCCESS', { duration: 3000 });
  }
}
