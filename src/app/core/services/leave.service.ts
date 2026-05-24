import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum LeaveType {
  VACATION = 'VACATION',
  SICK = 'SICK',
  PERSONAL = 'PERSONAL',
  BEREAVEMENT = 'BEREAVEMENT',
  MATERNITY = 'MATERNITY'
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export interface LeaveRequest {
  id: number;
  employeeId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  managerComments?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  id: number;
  employeeId: number;
  leaveType: string;
  totalEntitled: number;
  used: number;
  pending: number;
  remaining?: number; // Calculated field
}

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  createRequest(request: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>('/api/leaves', request, undefined, this.baseUrl);
  }

  getMyRequests(): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>('/api/leaves/me', [], this.baseUrl);
  }

  getMyBalances(): Observable<LeaveBalance[]> {
    return this.api.get<LeaveBalance[]>('/api/leaves/me/balances', [], this.baseUrl);
  }

  getCompanyRequests(status?: LeaveStatus): Observable<LeaveRequest[]> {
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    const query = params.length ? `?${params.join('&')}` : '';
    return this.api.get<LeaveRequest[]>(`/api/leaves/company${query}`, [], this.baseUrl);
  }

  getRequestsByStatus(status: LeaveStatus): Observable<LeaveRequest[]> {
    return this.getCompanyRequests(status);
  }

  updateStatus(id: number, status: LeaveStatus, comments?: string): Observable<LeaveRequest> {
    let url = `/api/leaves/${id}/status?status=${status}`;
    if (comments) url += `&comments=${encodeURIComponent(comments)}`;
    return this.api.patch<LeaveRequest>(url, {}, undefined, this.baseUrl);
  }

  cancelRequest(id: number): Observable<void> {
    return this.api.delete<void>(`/api/leaves/${id}/cancel`, undefined, this.baseUrl);
  }
}
