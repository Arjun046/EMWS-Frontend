import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

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
  private readonly api = inject(ApiService);

  getTimesheetEntries(startDate: string, endDate: string, employeeId?: number): Observable<TimesheetEntry[]> {
    let url = `/api/timesheets?startDate=${startDate}&endDate=${endDate}`;
    if (employeeId) {
      url += `&employeeId=${employeeId}`;
    }
    return this.api.get<TimesheetEntry[]>(url, []);
  }

  getTimesheetSummary(startDate: string, endDate: string): Observable<TimesheetSummary[]> {
    return this.api.get<TimesheetSummary[]>(
      `/api/timesheets/summary?startDate=${startDate}&endDate=${endDate}`,
      []
    );
  }

  getMyTimesheet(employeeId: number, startDate: string, endDate: string): Observable<TimesheetEntry[]> {
    return this.api.get<TimesheetEntry[]>(
      `/api/timesheets/employee/${employeeId}?startDate=${startDate}&endDate=${endDate}`,
      []
    );
  }
}
