import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Shift {
  id: number;
  employeeId: number;
  locationId: number;
  departmentId: number;
  startTime: string;
  endTime: string;
  status: string; // PUBLISHED, DRAFT, COMPLETED
  notes: string;
  // UI fields
  employeeName?: string;
  departmentName?: string;
}

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getShifts(): Observable<Shift[]> {
    return this.api.get<Shift[]>('/api/shifts', [], this.baseUrl);
  }

  getShiftsByRange(start: string, end: string): Observable<Shift[]> {
    return this.api.get<Shift[]>(`/api/shifts/range?start=${start}&end=${end}`, [], this.baseUrl);
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.api.post<Shift>('/api/shifts', shift, undefined, this.baseUrl);
  }

  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.api.put<Shift>(`/api/shifts/${id}`, shift, undefined, this.baseUrl);
  }

  updateStatus(id: number, status: string): Observable<Shift> {
    return this.api.patch<Shift>(`/api/shifts/${id}/status?status=${status}`, {}, undefined, this.baseUrl);
  }
}
