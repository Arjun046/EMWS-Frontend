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
    { label: 'Present Today', value: '0', delta: 'Active now', tone: 'good', icon: 'how_to_reg' },
    { label: 'Absent Today', value: '0', delta: 'Missed shifts', tone: 'warn', icon: 'event_busy' },
    { label: 'Late Arrivals', value: '0', delta: 'After start time', tone: 'accent', icon: 'schedule' },
    { label: 'On Leave', value: '0', delta: 'Approved requests', tone: 'default', icon: 'beach_access' }
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
    const todayStart = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
    const tomorrowStart = new Date(Date.now() + 86400000).toISOString().split('T')[0] + 'T00:00:00Z';

    combineLatest([
      this.api.get<any[]>('/api/employees', [], this.empUrl),
      this.api.get<any[]>(`/api/attendance/range?start=${todayStart}&end=${tomorrowStart}`, [], this.attUrl),
      this.api.get<any[]>('/api/leaves/status/APPROVED', [], this.leaveUrl),
      this.api.get<any>('/api/analytics/dashboard/admin', null, this.analyticsUrl)
    ]).subscribe(([employees, attendance, approvedLeaves, admin]) => {
      
      // Extraction from real backend aggregation logic
      const presentCount = admin?.currentlyClockedIn ?? attendance.filter(a => a.clockOut === null).length;
      const totalEmployees = admin?.totalEmployees ?? employees.length;
      const pendingLeavesCount = admin?.pendingLeaveRequests ?? 0;
      
      // Derived stats or defaults
      const lateCount = attendance.filter(a => a.isLate).length || 0;
      const onLeaveToday = approvedLeaves.length || 0;
      const scheduledToday = totalEmployees; // Fallback simulation
      const absentCount = Math.max(0, scheduledToday - attendance.length);

      const adherence = employees.length ? Math.round((presentCount / employees.length) * 100) : 0;

      // Extract values from admin data or provide fallbacks
      const leavePressure = admin?.leavePressure ?? (employees.length ? Math.round((onLeaveToday / employees.length) * 100) : 0);
      const scheduleCoverage = admin?.scheduleCoverage ?? (scheduledToday ? Math.round((presentCount / scheduledToday) * 100) : 0);
      const openShifts = admin?.openShifts || 0;
      const breakViolations = admin?.breakViolations || 0;

      this.statsState.set([
        { label: 'Present Today', value: String(presentCount), delta: 'Currently clocked in', tone: 'good', icon: 'how_to_reg' },
        { label: 'Absent Today', value: String(absentCount), delta: 'Scheduled but not in', tone: 'warn', icon: 'event_busy' },
        { label: 'Late Arrivals', value: String(lateCount), delta: 'Flagged today', tone: 'accent', icon: 'schedule' },
        { label: 'On Leave', value: String(onLeaveToday), delta: 'Approved for today', tone: 'default', icon: 'beach_access' }
      ]);

      this.attendanceScoreState.set(adherence);
      this.leavePressureState.set(leavePressure);
      this.scheduleCoverageState.set(scheduleCoverage);

      this.liveAlertsState.set([
        { title: 'Employee sync complete', detail: `${employees.length} profiles available to the UI.`, time: 'Live', tone: 'good' },
        { title: 'Pending leave queue', detail: `${pendingLeavesCount} requests are waiting for review.`, time: 'Live', tone: pendingLeavesCount ? 'warn' : 'good' },
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
