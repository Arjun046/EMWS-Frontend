import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

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
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  createRequest(request: Partial<LeaveRequest>): Observable<LeaveRequest> {
    return this.api.post<LeaveRequest>('/api/leaves', request, undefined, this.baseUrl);
  }

  getEmployeeRequests(employeeId: number): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>(`/api/leaves/employee/${employeeId}`, [], this.baseUrl);
  }

  getRequestsByStatus(status: LeaveStatus): Observable<LeaveRequest[]> {
    return this.api.get<LeaveRequest[]>(`/api/leaves/status/${status}`, [], this.baseUrl);
  }

  updateStatus(id: number, status: LeaveStatus, comments?: string): Observable<LeaveRequest> {
    const params = new URLSearchParams();
    params.append('status', status);
    if (comments) params.append('comments', comments);
    return this.api.patch<LeaveRequest>(`/api/leaves/${id}/status?${params.toString()}`, {}, undefined, this.baseUrl);
  }

  getBalances(employeeId: number): Observable<LeaveBalance[]> {
    return this.api.get<LeaveBalance[]>(`/api/leaves/balances/${employeeId}`, [], this.baseUrl);
  }

  cancelRequest(id: number): Observable<void> {
    return this.api.delete<void>(`/api/leaves/${id}/cancel`, undefined, this.baseUrl);
  }
}
