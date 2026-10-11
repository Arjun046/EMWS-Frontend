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

export interface ShiftSwapRequest {
  id: number;
  originalShiftId: number;
  requestingEmployeeId: number;
  acceptedByEmployeeId?: number | null;
  targetEmployeeId?: number | null;
  companyId?: number;
  status: 'PENDING' | 'ACCEPTED' | 'APPROVED' | 'REJECTED';
  createdAt?: string;
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

  /** BE ShiftController (/api/shifts) — the canonical Shift CRUD. NOTE: /api/scheduling/shifts
   *  is Schedule entities, not Shifts; previous paths 404d or mutated the wrong aggregate (P1 fix). */
  getShifts(): Observable<Shift[]> {
    return this.api.get<Shift[]>('/api/shifts', [], this.baseUrl);
  }

  getShiftsByRange(start: string, end: string): Observable<Shift[]> {
    return this.getShiftRange(start, end);
  }

  createShift(shift: Partial<Shift>): Observable<Shift> {
    return this.api.post<Shift>('/api/shifts', shift, undefined, this.baseUrl);
  }

  updateShift(id: number, shift: Partial<Shift>): Observable<Shift> {
    return this.api.put<Shift>(`/api/shifts/${id}`, shift, undefined, this.baseUrl);
  }

  updateStatus(id: number, status: string): Observable<Shift> {
    return this.updateShiftStatus(id, status);
  }

  deleteShift(id: number): Observable<void> {
    return this.api.delete<void>(`/api/shifts/${id}`, undefined, this.baseUrl);
  }

  /** BE ShiftController (/api/shifts): range + status variants. */
  getShiftRange(start: string, end: string): Observable<Shift[]> {
    return this.api.get<Shift[]>(
      `/api/shifts/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      [],
      this.baseUrl
    );
  }

  /**
   * Loud variant of getShiftRange for guard checks (e.g. leave-approval
   * roster pre-check): failures must surface, never read as "no shifts".
   */
  getShiftRangeStrict(start: string, end: string): Observable<Shift[]> {
    return this.api.get<Shift[]>(
      `/api/shifts/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      this.baseUrl
    );
  }

  updateShiftStatus(id: number, status: string): Observable<Shift> {
    return this.api.patch<Shift>(
      `/api/shifts/${id}/status?status=${encodeURIComponent(status)}`,
      {},
      undefined,
      this.baseUrl
    );
  }

  /** BE ShiftSwapController (/api/scheduling/swaps): request → accept (peer) → approve (manager). */
  getSwaps(): Observable<ShiftSwapRequest[]> {
    return this.api.get<ShiftSwapRequest[]>('/api/scheduling/swaps', [], this.baseUrl);
  }

  requestSwap(originalShiftId: number, targetEmployeeId?: number | null): Observable<ShiftSwapRequest> {
    return this.api.post<ShiftSwapRequest>(
      '/api/scheduling/swaps',
      { originalShiftId, targetEmployeeId: targetEmployeeId ?? null },
      undefined,
      this.baseUrl
    );
  }

  acceptSwap(id: number): Observable<ShiftSwapRequest> {
    return this.api.patch<ShiftSwapRequest>(`/api/scheduling/swaps/${id}/accept`, {}, undefined, this.baseUrl);
  }

  approveSwap(id: number): Observable<ShiftSwapRequest> {
    return this.api.patch<ShiftSwapRequest>(`/api/scheduling/swaps/${id}/approve`, {}, undefined, this.baseUrl);
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
