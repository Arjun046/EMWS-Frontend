import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, expand, map, reduce, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery, isPage, toPageParams } from '../../shared/models/ui.models';

/** Canonical BE LeaveType (leave-service). These exact names are validated server-side. */
export enum LeaveType {
  ANNUAL = 'ANNUAL',
  SICK = 'SICK',
  CASUAL = 'CASUAL',
  MATERNITY = 'MATERNITY',
  PATERNITY = 'PATERNITY',
  UNPAID = 'UNPAID'
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

  getMyRequests(query: PageQuery = { page: 0, size: 20 }): Observable<Page<LeaveRequest>> {
    return this.api.get<Page<LeaveRequest>>(`/api/leaves/me?${toPageParams(query)}`, undefined, this.baseUrl);
  }

  getMyBalances(): Observable<LeaveBalance[]> {
    return this.api.get<LeaveBalance[]>('/api/leaves/me/balances', [], this.baseUrl);
  }

  getCompanyRequests(status?: LeaveStatus, query: PageQuery = { page: 0, size: 20 }): Observable<Page<LeaveRequest>> {
    const params: string[] = [];
    if (status) params.push(`status=${status}`);
    params.push(toPageParams(query));
    return this.api.get<Page<LeaveRequest>>(`/api/leaves/company?${params.join('&')}`, undefined, this.baseUrl);
  }

  /** Queue/aggregation callers: follows all server pages so counts stay correct. */
  getAllCompanyRequests(status?: LeaveStatus, size = 200): Observable<LeaveRequest[]> {
    return this.getCompanyRequests(status, { page: 0, size }).pipe(
      expand((page) => (page.last ? EMPTY : this.getCompanyRequests(status, { page: page.number + 1, size }))),
      map((page) => (isPage<LeaveRequest>(page) ? page.content : [])),
      reduce((all, content) => all.concat(content), [] as LeaveRequest[])
    );
  }

  /** Own requests are low-volume: load all pages so client filters stay exact. */
  getAllMyRequests(size = 200): Observable<LeaveRequest[]> {
    return this.getMyRequests({ page: 0, size }).pipe(
      expand((page) => (page.last ? EMPTY : this.getMyRequests({ page: page.number + 1, size }))),
      map((page) => (isPage<LeaveRequest>(page) ? page.content : [])),
      reduce((all, content) => all.concat(content), [] as LeaveRequest[])
    );
  }

  getRequestsByStatus(status: LeaveStatus, query?: PageQuery): Observable<Page<LeaveRequest>> {
    return this.getCompanyRequests(status, query);
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
