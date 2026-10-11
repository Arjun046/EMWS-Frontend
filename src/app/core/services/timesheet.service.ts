import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

/** Mirrors BE Timesheet entity (attendance-service). */
export interface Timesheet {
  id: number;
  employeeId: number;
  companyId: number;
  startDate: string;
  endDate: string;
  totalHours: number;
  status: string;
  generatedAt?: string;
  approvedAt?: string;
  approvedBy?: number;
}

/** Mirrors BE TimesheetReconciliation (attendance-service). */
export interface TimesheetReconciliation {
  timesheetId: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  status: string;
  storedHours: number;
  currentHours: number;
  deltaHours: number;
  attendanceRecords: number;
  openSessions: number;
  matches: boolean;
}

/** Row model for the reports UI, derived from real attendance records. */
export interface TimesheetEntry {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  clockIn: string;
  clockOut: string | null;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  breakMinutes: number;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
}

export interface TimesheetSummary {
  employeeId: number;
  employeeName: string;
  department: string;
  totalRegularHours: number;
  totalOvertimeHours: number;
  totalHours: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
}

/**
 * Matches TimesheetController (/api/attendance/timesheets):
 *  POST /generate {employeeId?, startDate, endDate} (ISO dates)
 *  GET  /{timesheetId} | GET /employee/{employeeId} | GET /pending
 *  GET  /{timesheetId}/reconciliation | PUT /{timesheetId}/status
 */
@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly api = inject(ApiService);
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly root = '/api/attendance/timesheets';

  generateTimesheet(employeeId: number | null, startDate: string, endDate: string): Observable<Timesheet> {
    return this.api.post<Timesheet>(
      `${this.root}/generate`,
      { employeeId, startDate, endDate },
      undefined,
      this.baseUrl
    );
  }

  getTimesheet(id: number): Observable<Timesheet> {
    return this.api.get<Timesheet>(`${this.root}/${id}`, undefined, this.baseUrl);
  }

  getEmployeeTimesheets(employeeId: number): Observable<Timesheet[]> {
    // No fallback: callers show explicit loading/error states. [] would
    // masquerade an outage as "no timesheets".
    return this.api.get<Timesheet[]>(`${this.root}/employee/${employeeId}`, undefined, this.baseUrl);
  }

  /** Actionable (PENDING/SUBMITTED) timesheets in the caller's scope. */
  pendingTimesheets(): Observable<Timesheet[]> {
    return this.api.get<Timesheet[]>(`${this.root}/pending`, undefined, this.baseUrl);
  }

  reconcile(id: number): Observable<TimesheetReconciliation> {
    return this.api.get<TimesheetReconciliation>(`${this.root}/${id}/reconciliation`, undefined, this.baseUrl);
  }

  updateStatus(id: number, status: string): Observable<Timesheet> {
    return this.api.put<Timesheet>(`${this.root}/${id}/status`, { status }, undefined, this.baseUrl);
  }
}
