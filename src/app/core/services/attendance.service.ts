import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, expand, map, reduce, EMPTY } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page, PageQuery, isPage, toPageParams } from '../../shared/models/ui.models';

export interface Attendance {
  id: number;
  idempotencyKey?: string | null;
  employeeId: number;
  companyId: number;
  clockIn: string;
  clockOut: string | null;
  isLate: boolean;
  breakStartTime: string | null;
  breakEndTime: string | null;
  latitude: number | null;
  longitude: number | null;
  totalHours: number | null;
  overtimeHours: number | null;
  mealBreakCompliant: boolean | null;
  // Extra UI fields if needed
  employeeName?: string; 
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getAttendanceRange(start: string, end: string, query: PageQuery = { page: 0, size: 20 }): Observable<Page<Attendance>> {
    return this.api.get<Page<Attendance>>(
      `/api/attendance/range?start=${start}&end=${end}&${toPageParams(query)}`, undefined, this.baseUrl);
  }

  getEmployeeAttendance(
    employeeId: number,
    start: string,
    end: string,
    query: PageQuery = { page: 0, size: 20 }
  ): Observable<Page<Attendance>> {
    return this.api.get<Page<Attendance>>(
      `/api/attendance/employee/${employeeId}/range?start=${start}&end=${end}&${toPageParams(query)}`,
      undefined,
      this.baseUrl
    );
  }

  /**
   * Aggregation callers (reports, dashboards): transparently follows all
   * server pages so totals stay correct at org scale.
   */
  getAllAttendanceRange(start: string, end: string, size = 200): Observable<Attendance[]> {
    return this.getAttendanceRange(start, end, { page: 0, size }).pipe(
      expand((page) => (page.last ? EMPTY : this.getAttendanceRange(start, end, { page: page.number + 1, size }))),
      map((page) => (isPage<Attendance>(page) ? page.content : [])),
      reduce((all, content) => all.concat(content), [] as Attendance[])
    );
  }

  getClockedInCount(): Observable<number> {
    return this.api.get<number>('/api/attendance/summary/clocked-in', 0, this.baseUrl);
  }

  getOvertimeHours(start: string, end: string): Observable<number> {
    return this.api.get<number>(`/api/attendance/summary/overtime?start=${start}&end=${end}`, 0, this.baseUrl);
  }

  clockIn(employeeId: number, lat?: number, lng?: number, idempotencyKey?: string): Observable<Attendance> {
    const params = new URLSearchParams();
    params.append('employeeId', employeeId.toString());
    if (lat !== undefined && lat !== null) params.append('latitude', lat.toString());
    if (lng !== undefined && lng !== null) params.append('longitude', lng.toString());
    if (idempotencyKey) params.append('idempotencyKey', idempotencyKey);
    return this.api.post<Attendance>(`/api/attendance/clock-in?${params.toString()}`, {}, undefined, this.baseUrl);
  }

  generateClockInIdempotencyKey(employeeId: number): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `clock-in-${employeeId}-${crypto.randomUUID()}`;
    }
    return `clock-in-${employeeId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  clockOut(attendanceId: number): Observable<Attendance> {
    return this.api.post<Attendance>(`/api/attendance/clock-out?attendanceId=${attendanceId}`, {}, undefined, this.baseUrl);
  }

  manualEntry(payload: any): Observable<Attendance> {
    return this.api.post<Attendance>('/api/attendance/manual', payload, undefined, this.baseUrl);
  }

  startBreak(attendanceId: number): Observable<Attendance> {
    return this.api.post<Attendance>(`/api/attendance/start-break?attendanceId=${attendanceId}`, {}, undefined, this.baseUrl);
  }

  endBreak(attendanceId: number): Observable<Attendance> {
    return this.api.post<Attendance>(`/api/attendance/end-break?attendanceId=${attendanceId}`, {}, undefined, this.baseUrl);
  }

  getAttendanceStatus(employeeId: number): Observable<{status: string}> {
    return this.api.get<{status: string}>(`/api/attendance/employee/${employeeId}/status`, {status: 'CLOCKED_OUT'}, this.baseUrl);
  }

  getTodayAttendance(employeeId: number): Observable<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return this.getEmployeeAttendance(employeeId, today.toISOString(), tomorrow.toISOString()).pipe(
      map((page) => page.content ?? [])
    );
  }

  /** BE: GET /export — full export rows for a range (manager adjust scope). */
  exportRange(start: string, end: string): Observable<Attendance[]> {
    return this.api.get<Attendance[]>(
      `/api/attendance/export?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      [],
      this.baseUrl
    );
  }

  /** BE: PATCH /{id}/force-clock-out — close someone else's open session. */
  forceClockOut(attendanceId: number): Observable<Attendance> {
    return this.api.patch<Attendance>(
      `/api/attendance/${attendanceId}/force-clock-out`,
      {},
      undefined,
      this.baseUrl
    );
  }

  /** BE: GET /{attendanceId}/history — audit trail of one record. */
  getHistory(attendanceId: number): Observable<any[]> {
    return this.api.get<any[]>(`/api/attendance/${attendanceId}/history`, [], this.baseUrl);
  }

  getBreakViolations(start: string, end: string): Observable<number> {
    return this.api.get<number>(
      `/api/attendance/summary/break-violations?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      0,
      this.baseUrl
    );
  }
}
