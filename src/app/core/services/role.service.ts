import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Permission {
  id: number;
  name: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  systemRole: boolean;
  permissions: Permission[];
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>('/api/roles', [], this.baseUrl);
  }

  createRole(role: Partial<Role>): Observable<Role> {
    return this.api.post<Role>('/api/roles', role, undefined, this.baseUrl);
  }

  updateRole(id: number, role: Partial<Role>): Observable<Role> {
    return this.api.put<Role>(`/api/roles/${id}`, role, undefined, this.baseUrl);
  }

  deleteRole(id: number): Observable<void> {
    return this.api.delete<void>(`/api/roles/${id}`, undefined, this.baseUrl);
  }

  getPermissions(): Observable<Permission[]> {
    return this.api.get<Permission[]>('/api/roles/permissions', [], this.baseUrl);
  }

  createPermission(permission: Partial<Permission>): Observable<Permission> {
    return this.api.post<Permission>('/api/roles/permissions', permission, undefined, this.baseUrl);
  }

  updatePermission(id: number, permission: Partial<Permission>): Observable<Permission> {
    return this.api.put<Permission>(`/api/roles/permissions/${id}`, permission, undefined, this.baseUrl);
  }

  deletePermission(id: number): Observable<void> {
    return this.api.delete<void>(`/api/roles/permissions/${id}`, undefined, this.baseUrl);
  }

  // Matches RoleManagementController detail / permission / clone / hierarchy APIs.
  getRoleDetail(id: number): Observable<any> {
    return this.api.get<any>(`/api/roles/${id}`, undefined, this.baseUrl);
  }

  getRolePermissions(id: number): Observable<Permission[]> {
    return this.api.get<Permission[]>(`/api/roles/${id}/permissions`, [], this.baseUrl);
  }

  replaceRolePermissions(id: number, permissions: Partial<Permission>[]) {
    return this.api.put<Permission[]>(`/api/roles/${id}/permissions`, permissions, undefined, this.baseUrl);
  }

  addRolePermission(id: number, permission: Partial<Permission>): Observable<any> {
    return this.api.post<any>(`/api/roles/${id}/permissions`, permission, undefined, this.baseUrl);
  }

  removeRolePermission(id: number, permissionId: number): Observable<void> {
    return this.api.delete<void>(
      `/api/roles/${id}/permissions/${permissionId}`,
      undefined,
      this.baseUrl
    );
  }

  cloneRole(id: number, name?: string): Observable<any> {
    return this.api.post<any>(`/api/roles/${id}/clone`, name ? { name } : {}, undefined, this.baseUrl);
  }

  getAssignedUsers(id: number): Observable<any[]> {
    return this.api.get<any[]>(`/api/roles/${id}/assigned-users`, [], this.baseUrl);
  }

  getPermissionMatrix(): Observable<any[]> {
    return this.api.get<any[]>('/api/roles/permissions/matrix', [], this.baseUrl);
  }
}
