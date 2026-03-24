import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RoleService, Role, Permission } from '../../core/services/role.service';
import { UserService, User } from '../../core/services/user.service';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDialogModule,
    MatTabsModule,
    PageHeaderComponent
  ],
  template: `
    <app-page-header 
      title="Access Control" 
      subtitle="Manage enterprise roles and granular permissions for the workforce." 
      actionLabel="Create New Role"
      (action)="openRoleDialog()"
    />

    <mat-tab-group class="roles-tabs">
      <mat-tab label="Role Definitions">
        <section class="roles-grid mt-4">
          <mat-card class="roles-main">
            <table mat-table [dataSource]="roles()" class="enterprise-grid">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Role Name</th>
                <td mat-cell *matCellDef="let role">
                  <div class="role-badge">{{ role.name }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let role">{{ role.description }}</td>
              </ng-container>

              <ng-container matColumnDef="permissions">
                <th mat-header-cell *matHeaderCellDef>Permissions</th>
                <td mat-cell *matCellDef="let role">
                  <div class="perm-tags">
                    @for (p of role.permissions; track p.id) {
                      <span class="perm-tag">{{ p.name }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let role" class="actions-cell">
                  <button mat-icon-button (click)="openRoleDialog(role)"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteRole(role)"><mat-icon>delete</mat-icon></button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </mat-card>

          <div class="side-panel">
            <mat-card>
              <div class="side-header">
                <h3>Permission Catalog</h3>
                <button mat-icon-button color="primary" (click)="openPermissionDialog()"><mat-icon>add_circle</mat-icon></button>
              </div>
              <p class="text-muted">Available system-wide permissions.</p>
              <div class="catalog">
                @for (p of permissions(); track p.id) {
                  <article class="catalog-item">
                    <strong>{{ p.name }}</strong>
                    <p>{{ p.description }}</p>
                  </article>
                }
              </div>
            </mat-card>
          </div>
        </section>
      </mat-tab>

      <mat-tab label="User Role Assignments">
        <section class="user-assignments mt-4">
          <mat-card class="roles-main">
            <table mat-table [dataSource]="users()" class="enterprise-grid">
              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef>User / Email</th>
                <td mat-cell *matCellDef="let user">
                  <div class="user-info">
                    <div class="mini-avatar">{{ user.firstName[0] }}{{ user.lastName[0] }}</div>
                    <div>
                      <strong>{{ user.firstName }} {{ user.lastName }}</strong>
                      <p class="text-muted">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="roles">
                <th mat-header-cell *matHeaderCellDef>Assigned Roles</th>
                <td mat-cell *matCellDef="let user">
                  <div class="perm-tags">
                    @for (r of user.roles; track r) {
                      <span class="role-badge">{{ r }}</span>
                    }
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let user" class="actions-cell">
                  <button mat-flat-button color="primary" (click)="assignRoles(user)">Manage Roles</button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="['username', 'roles', 'actions']"></tr>
              <tr mat-row *matRowDef="let row; columns: ['username', 'roles', 'actions'];"></tr>
            </table>
          </mat-card>
        </section>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .roles-tabs { margin-top: 1rem; }
    .mt-4 { margin-top: 1rem; }
    .roles-grid { display: grid; grid-template-columns: 1fr 20rem; gap: 1.5rem; }
    .roles-main { border-radius: 1.2rem; border: 1px solid #e2e8f0; overflow-x: auto; padding: 0; }
    .enterprise-grid { width: 100%; min-width: 700px; }
    .role-badge { display: inline-block; padding: 0.25rem 0.75rem; background: #eff6ff; color: #2563eb; border-radius: 0.5rem; font-weight: 700; font-size: 0.85rem; }
    .perm-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .perm-tag { font-size: 0.7rem; background: #f1f5f9; color: #64748b; padding: 0.1rem 0.4rem; border-radius: 4px; border: 1px solid #e2e8f0; }
    .actions-cell { text-align: right; padding-right: 1.5rem !important; }
    .side-panel h3 { margin: 0; }
    .text-muted { color: #64748b; font-size: 0.85rem; margin: 0.5rem 0 1rem; }
    .catalog { display: grid; gap: 0.75rem; }
    .catalog-item { padding: 0.75rem; background: #f8fafc; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
    .catalog-item strong { font-size: 0.85rem; display: block; }
    .catalog-item p { font-size: 0.75rem; color: #64748b; margin: 0.2rem 0 0; }
    .side-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
    .user-info { display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0; }
    .mini-avatar { width: 2.5rem; height: 2.5rem; border-radius: 0.75rem; background: #eff6ff; color: #2563eb; display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; }

    @media (max-width: 1200px) {
      .roles-grid { grid-template-columns: 1fr; }
      .side-panel { order: -1; }
    }
  `]
})
export class RolesPageComponent {
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);

  protected readonly roles = toSignal(this.roleService.getRoles(), { initialValue: [] });
  protected readonly permissions = toSignal(this.roleService.getPermissions(), { initialValue: [] });
  protected readonly users = toSignal(this.userService.getAllUsers(), { initialValue: [] });
  protected readonly displayedColumns = ['name', 'description', 'permissions', 'actions'];

  protected openRoleDialog(role?: Role): void {
    const dialogRef = this.dialog.open(RoleEditDialog, {
      width: '500px',
      data: { role, allPermissions: this.permissions() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        window.location.reload(); 
      }
    });
  }

  protected openPermissionDialog(): void {
    const dialogRef = this.dialog.open(PermissionEditDialog, {
      width: '400px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        window.location.reload();
      }
    });
  }

  protected assignRoles(user: User): void {
    const dialogRef = this.dialog.open(UserRoleAssignmentDialog, {
      width: '400px',
      data: { user, allRoles: this.roles() }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        window.location.reload();
      }
    });
  }

  protected deleteRole(role: Role): void {
    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      this.roleService.deleteRole(role.id).subscribe(() => window.location.reload());
    }
  }
}

@Component({
  selector: 'app-permission-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Create New Permission</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline">
          <mat-label>Permission Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. USER_WRITE">
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Briefly describe the permission scope"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Create Permission</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form { display: grid; gap: 1rem; margin-top: 0.5rem; }
  `]
})
export class PermissionEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<PermissionEditDialog>);
  private readonly roleService = inject(RoleService);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required]],
    description: ['']
  });

  protected save(): void {
    const raw = this.form.getRawValue();
    const permissionData: any = {
      name: raw.name ?? undefined,
      description: raw.description ?? undefined
    };
    this.roleService.createPermission(permissionData).subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}

@Component({
  selector: 'app-role-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ data.role ? 'Edit Role' : 'Create New Role' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="edit-form">
        <mat-form-field appearance="outline">
          <mat-label>Role Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. MANAGER">
        </mat-form-field>
        
        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" placeholder="Briefly describe the role scope"></textarea>
        </mat-form-field>

        <div class="permissions-selection">
          <h3>Granular Permissions</h3>
          <div class="perms-grid">
            @for (p of data.allPermissions; track p.id) {
              <mat-checkbox [checked]="isPermissionSelected(p)" (change)="togglePermission(p)">
                {{ p.name }}
              </mat-checkbox>
            }
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="save()">Save Role</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form { display: grid; gap: 1rem; margin-top: 0.5rem; }
    .permissions-selection { margin-top: 1rem; }
    .permissions-selection h3 { font-size: 0.9rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-bottom: 0.75rem; }
    .perms-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
  `]
})
export class RoleEditDialog {
  private readonly fb = inject(FormBuilder);
  protected readonly dialogRef = inject(MatDialogRef<RoleEditDialog>);
  protected readonly data = inject<{ role?: Role, allPermissions: Permission[] }>(MAT_DIALOG_DATA);
  private readonly roleService = inject(RoleService);

  protected readonly form = this.fb.group({
    name: [this.data.role?.name || '', [Validators.required]],
    description: [this.data.role?.description || '']
  });

  private selectedPermissionIds = new Set<number>(this.data.role?.permissions?.map(p => p.id) || []);

  protected isPermissionSelected(p: Permission): boolean {
    return this.selectedPermissionIds.has(p.id);
  }

  protected togglePermission(p: Permission): void {
    if (this.selectedPermissionIds.has(p.id)) {
      this.selectedPermissionIds.delete(p.id);
    } else {
      this.selectedPermissionIds.add(p.id);
    }
  }

  protected save(): void {
    const raw = this.form.getRawValue();
    const roleData: any = {
      name: raw.name ?? undefined,
      description: raw.description ?? undefined,
      permissions: this.data.allPermissions.filter(p => this.selectedPermissionIds.has(p.id))
    };

    const obs = this.data.role 
      ? this.roleService.updateRole(this.data.role.id, roleData)
      : this.roleService.createRole(roleData);

    obs.subscribe(() => this.dialogRef.close(true));
  }
}

@Component({
  selector: 'app-user-role-assignment-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatButtonModule, MatCheckboxModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Manage Roles: {{ data.user.firstName }} {{ data.user.lastName }}</h2>
    <mat-dialog-content>
      <p class="text-muted">Select roles to assign to this user.</p>
      <div class="roles-selection-grid">
        @for (r of data.allRoles; track r.id) {
          <mat-checkbox [checked]="isRoleSelected(r.name)" (change)="toggleRole(r.name)">
            {{ r.name }}
          </mat-checkbox>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save Assignments</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .roles-selection-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-top: 1rem; }
    .text-muted { color: #64748b; font-size: 0.85rem; }
  `]
})
export class UserRoleAssignmentDialog {
  protected readonly dialogRef = inject(MatDialogRef<UserRoleAssignmentDialog>);
  protected readonly data = inject<{ user: User, allRoles: Role[] }>(MAT_DIALOG_DATA);
  private readonly userService = inject(UserService);

  private selectedRoles = new Set<string>(this.data.user.roles || []);

  protected isRoleSelected(roleName: string): boolean {
    return this.selectedRoles.has(roleName);
  }

  protected toggleRole(roleName: string): void {
    if (this.selectedRoles.has(roleName)) {
      this.selectedRoles.delete(roleName);
    } else {
      this.selectedRoles.add(roleName);
    }
  }

  protected save(): void {
    this.userService.updateUserRoles(this.data.user.id, Array.from(this.selectedRoles)).subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}
