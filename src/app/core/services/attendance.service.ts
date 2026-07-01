import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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

  getAttendanceRange(start: string, end: string): Observable<Attendance[]> {
    return this.api.get<Attendance[]>(`/api/attendance/range?start=${start}&end=${end}`, [], this.baseUrl);
  }

  getEmployeeAttendance(employeeId: number, start: string, end: string): Observable<Attendance[]> {
    return this.api.get<Attendance[]>(`/api/attendance/employee/${employeeId}/range?start=${start}&end=${end}`, [], this.baseUrl);
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
    return this.getEmployeeAttendance(employeeId, today.toISOString(), tomorrow.toISOString());
  }
}
