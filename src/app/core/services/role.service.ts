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
}
