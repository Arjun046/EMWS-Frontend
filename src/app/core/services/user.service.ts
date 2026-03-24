import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  enabled: boolean;
  accountNonLocked: boolean;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getAllUsers(): Observable<User[]> {
    return this.api.get<User[]>('/api/users/all', [], this.baseUrl);
  }

  getUser(id: number): Observable<User> {
    return this.api.get<User>(`/api/users/${id}`, undefined, this.baseUrl);
  }

  updateUserRoles(id: number, roles: string[]): Observable<User> {
    return this.api.put<User>(`/api/users/${id}/roles`, roles, undefined, this.baseUrl);
  }

  lockUser(id: number): Observable<User> {
    return this.api.post<User>(`/api/users/${id}/lock`, {}, undefined, this.baseUrl);
  }

  unlockUser(id: number): Observable<User> {
    return this.api.post<User>(`/api/users/${id}/unlock`, {}, undefined, this.baseUrl);
  }

  disableUser(id: number): Observable<User> {
    return this.api.post<User>(`/api/users/${id}/disable`, {}, undefined, this.baseUrl);
  }

  enableUser(id: number): Observable<User> {
    return this.api.post<User>(`/api/users/${id}/enable`, {}, undefined, this.baseUrl);
  }
}
