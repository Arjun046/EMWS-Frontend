import { Injectable, signal } from '@angular/core';
import { combineLatest } from 'rxjs';
import { ApiService } from './api.service';
import { StatCard, TimelineItem } from '../../shared/models/ui.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly empUrl = 'http://localhost:8080';
  private readonly attUrl = 'http://localhost:8080';
  private readonly leaveUrl = 'http://localhost:8080';
  private readonly taskUrl = 'http://localhost:8080';
  private readonly schedUrl = 'http://localhost:8080';
  private readonly analyticsUrl = 'http://localhost:8080';

  private readonly liveAlertsState = signal<TimelineItem[]>([
    { title: 'Headcount synced', detail: 'Employee directory refreshed from service layer', time: '08:10', tone: 'good' },
    { title: 'Leave spike', detail: 'Monday coverage risk detected in support', time: '11:25', tone: 'warn' },
    { title: 'Payroll review ready', detail: '12 exceptions grouped for finance approval', time: '14:05', tone: 'accent' }
  ]);
  private readonly statsState = signal<StatCard[]>([
    { label: 'Active Staff', value: '0', delta: 'Loading', tone: 'good' },
    { label: 'Attendance Adherence', value: '0%', delta: 'Loading', tone: 'accent' },
    { label: 'Pending Leave Approvals', value: '0', delta: 'Loading', tone: 'warn' },
    { label: 'Open Tasks', value: '0', delta: 'Loading', tone: 'good' }
  ]);
  private readonly attendanceScoreState = signal(0);
  private readonly leavePressureState = signal(0);
  private readonly scheduleCoverageState = signal(0);

  readonly stats = this.statsState.asReadonly();
  readonly liveAlerts = this.liveAlertsState.asReadonly();
  readonly attendanceScore = this.attendanceScoreState.asReadonly();
  readonly leavePressure = this.leavePressureState.asReadonly();
  readonly scheduleCoverage = this.scheduleCoverageState.asReadonly();

  constructor(private readonly api: ApiService) {
    const { start, end } = this.currentRange();

    combineLatest([
      this.api.get<any[]>('/api/employees', [], this.empUrl),
      this.api.get<number>('/api/attendance/summary/clocked-in', 0, this.attUrl),
      this.api.get<number>(`/api/attendance/summary/break-violations?start=${start}&end=${end}`, 0, this.attUrl),
      this.api.get<any[]>('/api/leaves/status/PENDING', [], this.leaveUrl),
      this.api.get<any[]>('/api/tasks', [], this.taskUrl),
      this.api.get<any[]>('/api/shifts', [], this.schedUrl),
      this.api.get<any>('/api/analytics/dashboard/admin', null, this.analyticsUrl)
    ]).subscribe(([employees, clockedIn, breakViolations, pendingLeaves, tasks, shifts, admin]) => {
      const activeEmployees = employees.filter((employee) => employee.status === 'ACTIVE').length;
      const openTasks = tasks.filter((task) => !String(task.status ?? '').toUpperCase().includes('DONE')).length;
      const openShifts = shifts.filter((shift) => !shift.employeeId).length;

      const adherence = employees.length ? Math.round((clockedIn / employees.length) * 100) : (admin?.currentlyClockedIn ?? 0);
      const leavePressure = Math.min(100, pendingLeaves.length * 10 + breakViolations * 3);
      const scheduleCoverage = Math.max(35, 100 - openShifts * 6);

      this.statsState.set([
        { label: 'Active Staff', value: String(activeEmployees || admin?.totalEmployees || employees.length), delta: `${employees.length} profiles loaded`, tone: 'good' },
        { label: 'Attendance Adherence', value: `${adherence}%`, delta: `${clockedIn} clocked in`, tone: 'accent' },
        { label: 'Pending Leave Approvals', value: String(pendingLeaves.length || admin?.pendingLeaveRequests || 0), delta: `${breakViolations} break alerts`, tone: 'warn' },
        { label: 'Open Tasks', value: String(openTasks), delta: `${openShifts} open shifts`, tone: 'good' }
      ]);

      this.attendanceScoreState.set(adherence);
      this.leavePressureState.set(leavePressure);
      this.scheduleCoverageState.set(scheduleCoverage);

      this.liveAlertsState.set([
        { title: 'Employee sync complete', detail: `${employees.length} profiles available to the UI.`, time: 'Live', tone: 'good' },
        { title: 'Pending leave queue', detail: `${pendingLeaves.length} requests are waiting for review.`, time: 'Live', tone: pendingLeaves.length ? 'warn' : 'good' },
        { title: 'Operational strain', detail: `${openShifts} open shifts and ${breakViolations} break violations in the current range.`, time: 'Live', tone: openShifts || breakViolations ? 'accent' : 'good' }
      ]);
    });
  }

  private currentRange(): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
