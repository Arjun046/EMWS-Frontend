import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  getTimesheetEntries(startDate: string, endDate: string, employeeId?: number): Observable<TimesheetEntry[]> {
    let url = `${this.base}/api/timesheets?startDate=${startDate}&endDate=${endDate}`;
    if (employeeId) url += `&employeeId=${employeeId}`;
    return this.http.get<TimesheetEntry[]>(url).pipe(catchError(() => of([])));
  }

  getTimesheetSummary(startDate: string, endDate: string): Observable<TimesheetSummary[]> {
    return this.http.get<TimesheetSummary[]>(
      `${this.base}/api/timesheets/summary?startDate=${startDate}&endDate=${endDate}`
    ).pipe(catchError(() => of([])));
  }

  getMyTimesheet(employeeId: number, startDate: string, endDate: string): Observable<TimesheetEntry[]> {
    return this.http.get<TimesheetEntry[]>(
      `${this.base}/api/timesheets/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`
    ).pipe(catchError(() => of([])));
  }
}
