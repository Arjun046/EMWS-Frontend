import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Shift {
  id: number;
  employeeId: number;
  locationId: number;
  departmentId: number;
  startTime: string;
  endTime: string;
  area?: string;
  role?: string;
  status: string; // PUBLISHED, DRAFT, COMPLETED
  notes?: string;
  // UI fields
  employeeName?: string;
  departmentName?: string;
}

export interface ShiftConflictRecord {
  type: 'SHIFT' | 'LEAVE';
  recordId: number;
  employeeId: number;
  startTime: string;
  endTime: string;
  status: string;
  message: string;
}

export interface ShiftConflictResponse {
  status: string;
  message: string;
  errorCode: string;
  data: {
    conflicts: ShiftConflictRecord[];
  };
}

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getShifts(): Observable<Shift[]> {
    return this.api.get<Shift[]>('/api/scheduling/shifts', [], this.baseUrl);
  }

  getShiftsByRange(start: string, end: string): Observable<Shift[]> {
    return this.api.get<Shift[]>(`/api/scheduling/shifts/range?start=${start}&end=${end}`, [], this.baseUrl);
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.api.post<Shift>('/api/scheduling/shifts', shift, undefined, this.baseUrl);
  }

  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.api.put<Shift>(`/api/scheduling/shifts/${id}`, shift, undefined, this.baseUrl);
  }

  updateStatus(id: number, status: string): Observable<Shift> {
    return this.api.patch<Shift>(`/api/scheduling/shifts/${id}/status?status=${status}`, {}, undefined, this.baseUrl);
  }

  deleteShift(id: number): Observable<void> {
    return this.api.delete<void>(`/api/scheduling/shifts/${id}`, undefined, this.baseUrl);
  }

  extractShiftConflict(error: unknown): ShiftConflictResponse | null {
    if (!(error instanceof HttpErrorResponse)) {
      return null;
    }

    const payload = error.error as ShiftConflictResponse | null;
    if (payload?.errorCode !== 'SHIFT_CONFLICT' || !Array.isArray(payload?.data?.conflicts)) {
      return null;
    }

    return payload;
  }
}
