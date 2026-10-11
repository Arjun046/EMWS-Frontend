import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { RoleService, Role, Permission } from '../../core/services/role.service';
import { backendErrorMessage } from '../../shared/utils/password-policy';
import { catchError, forkJoin, of } from 'rxjs';

interface PermissionGroup {
  prefix: string;
  perms: Permission[];
}

@Component({
  selector: 'app-roles-page',
  standalone: true,
  imports: [
    CommonModule, MatIconModule, MatButtonModule,
    MatSnackBarModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="module-page active-page fade-up" id="page-roles">

      <div class="filter-action-row">
        <div class="filter-ctrls-group">
          <select class="directory-filter-dropdown" style="min-width:240px; height:42px; border-radius:10px;"
                  (change)="onRoleChange($event)" [attr.aria-label]="'Select role'">
            @for (r of roles(); track r.id) {
              <option [value]="r.id" [selected]="r.id === selectedRole()?.id">{{ r.name }}{{ r.systemRole ? ' (system)' : '' }}</option>
            }
          </select>
        </div>
        @if (isAdmin() && selectedRole() && !selectedRole()!.systemRole) {
          <button class="ui-btn ui-btn-primary" (click)="savePermissions()" [disabled]="saving() || !dirty()">
            <mat-icon style="font-size:1.1rem; width:1.1rem; height:1.1rem;">save</mat-icon>
            {{ saving() ? 'Saving…' : 'Save Permissions' }}
          </button>
        }
      </div>

      <div class="ui-card mt-6" style="padding:0; overflow:hidden; border-radius:14px;">
        <div class="ui-card-header" style="padding:1.5rem 1.5rem 0.5rem;">
           <h3>Role Permissions{{ selectedRole() ? ' — ' + selectedRole()!.name : '' }}</h3>
           @if (selectedRole()?.systemRole) {
             <span class="ui-badge ui-badge-warning" title="The backend rejects permission changes on system roles">System role · read-only</span>
           } @else {
             <span class="ui-badge ui-badge-success">Editable</span>
           }
        </div>

        @if (isLoading()) {
          <div class="table-loading-overlay" style="padding:4rem; text-align:center;">
            <mat-spinner diameter="40" style="margin:0 auto;"></mat-spinner>
            <p style="margin-top:1rem; color:var(--txt-muted); font-size:0.85rem;">Loading roles…</p>
          </div>
        } @else if (!roles().length) {
          <div style="padding:3rem; text-align:center; color:var(--txt-muted);">No roles found.</div>
        } @else if (!groups().length) {
          <div style="padding:3rem; text-align:center; color:var(--txt-muted);">No permissions defined yet. Create permissions before assigning them to roles.</div>
        } @else {
          <div style="padding:0 1.5rem 1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
            @for (g of groups(); track g.prefix) {
              <div>
                <div class="group-title">{{ g.prefix }}</div>
                @for (p of g.perms; track p.id) {
                  <label class="perm-row">
                    <input type="checkbox" class="scope-matrix-checkbox"
                           [checked]="checked().has(p.id)"
                           [disabled]="!canEdit()"
                           (change)="togglePerm(p.id, $any($event.target).checked)">
                    <span><strong>{{ p.name }}</strong>@if (p.description) { <span class="perm-desc"> — {{ p.description }}</span> }</span>
                  </label>
                }
              </div>
            }
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .mt-6 { margin-top: 1.5rem; }
    .group-title { font-size: 0.7rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.5rem; border-bottom: 1px solid var(--border); padding-bottom: 0.35rem; }
    .perm-row { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.5rem 0; font-size: 0.85rem; cursor: pointer; }
    .perm-row .perm-desc { color: var(--txt-muted); font-weight: 400; }
    .scope-matrix-checkbox { width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary); margin-top: 2px; flex-shrink: 0; }
    .scope-matrix-checkbox:disabled { cursor: not-allowed; opacity: 0.5; }
  `]
})
export class RolesPageComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  protected readonly roles = signal<Role[]>([]);
  protected readonly selectedRole = signal<Role | null>(null);
  protected readonly allPerms = signal<Permission[]>([]);
  protected readonly checked = signal<Set<number>>(new Set());
  protected readonly savedChecked = signal<Set<number>>(new Set());
  protected readonly isLoading = signal(true);
  protected readonly saving = signal(false);
  protected readonly dirty = computed(() => {
    const a = this.checked(), b = this.savedChecked();
    return a.size !== b.size || [...a].some((id) => !b.has(id));
  });
  /** Grouped by the real permission-name prefix (ATTENDANCE, CHAT, …) — no invented mapping. */
  protected readonly groups = computed<PermissionGroup[]>(() => {
    const map = new Map<string, Permission[]>();
    for (const p of this.allPerms()) {
      const prefix = (p.name || 'MISC').split('_')[0] || 'MISC';
      if (!map.has(prefix)) map.set(prefix, []);
      map.get(prefix)!.push(p);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([prefix, perms]) => ({ prefix, perms: perms.sort((x, y) => x.name.localeCompare(y.name)) }));
  });

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading.set(true);
    forkJoin({
      roles: this.roleService.getRoles().pipe(catchError(() => of([] as Role[]))),
      perms: this.roleService.getPermissions().pipe(catchError(() => of([] as Permission[])))
    }).subscribe({
      next: ({ roles, perms }) => {
        this.roles.set(roles);
        this.allPerms.set(perms);
        if (roles.length > 0) this.loadRolePerms(roles[0]);
        else this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snack.open(backendErrorMessage(err, 'Could not load roles.'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  onRoleChange(event: Event): void {
    const roleId = +(event.target as HTMLSelectElement).value;
    const role = this.roles().find(r => r.id === roleId);
    if (role) this.loadRolePerms(role);
  }

  loadRolePerms(role: Role): void {
    this.selectedRole.set(role);
    this.isLoading.set(true);
    this.roleService.getRolePermissions(role.id).subscribe({
      next: (perms) => {
        const ids = new Set((perms ?? []).map((p) => p.id));
        this.checked.set(ids);
        this.savedChecked.set(new Set(ids));
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snack.open(backendErrorMessage(err, 'Could not load role permissions.'), 'Dismiss', { duration: 5000 });
      }
    });
  }

  canEdit(): boolean {
    return this.isAdmin() && !!this.selectedRole() && !this.selectedRole()!.systemRole;
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  togglePerm(id: number, on: boolean): void {
    const next = new Set(this.checked());
    if (on) next.add(id);
    else next.delete(id);
    this.checked.set(next);
  }

  savePermissions(): void {
    const role = this.selectedRole();
    if (!this.isAdmin() || !role || role.systemRole || this.saving()) return;
    // The backend rejects system-role replacement (400) — guarded above and in canEdit().
    this.saving.set(true);
    const payload = this.allPerms()
      .filter((p) => this.checked().has(p.id))
      .map((p) => ({ id: p.id, name: p.name }));
    this.roleService.replaceRolePermissions(role.id, payload).subscribe({
      next: (perms) => {
        const ids = new Set((perms ?? []).map((p: Permission) => p.id));
        this.checked.set(ids);
        this.savedChecked.set(new Set(ids));
        this.saving.set(false);
        this.snack.open(`Permissions saved for ${role.name}.`, 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(backendErrorMessage(err, 'Could not save permissions.'), 'Dismiss', { duration: 6000 });
      }
    });
  }
}
