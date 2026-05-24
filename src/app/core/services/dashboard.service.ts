import { Injectable, signal } from '@angular/core';
import { forkJoin, of, catchError } from 'rxjs';
import { ApiService } from './api.service';
import { StatCard, TimelineItem } from '../../shared/models/ui.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly empUrl = environment.apiBaseUrl;
  private readonly attUrl = environment.apiBaseUrl;
  private readonly leaveUrl = environment.apiBaseUrl;
  private readonly taskUrl = environment.apiBaseUrl;
  private readonly schedUrl = environment.apiBaseUrl;
  private readonly analyticsUrl = environment.apiBaseUrl;

  private readonly liveAlertsState = signal<TimelineItem[]>([]);
  private readonly statsState = signal<StatCard[]>([
    { label: 'Present Today', value: '...', delta: 'Loading...', tone: 'default', icon: 'how_to_reg' },
    { label: 'Absent Today', value: '...', delta: 'Loading...', tone: 'default', icon: 'event_busy' },
    { label: 'Late Arrivals', value: '...', delta: 'Loading...', tone: 'default', icon: 'schedule' },
    { label: 'On Leave', value: '...', delta: 'Loading...', tone: 'default', icon: 'beach_access' }
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

    forkJoin([
      this.api.get<any[]>('/api/employees', [], this.empUrl).pipe(catchError(() => of([]))),
      this.api.get<any[]>(`/api/attendance/range?start=${todayStart}&end=${tomorrowStart}`, [], this.attUrl).pipe(catchError(() => of([]))),
      this.api.get<any[]>('/api/leaves/status/APPROVED', [], this.leaveUrl).pipe(catchError(() => of([]))),
      this.api.get<any>('/api/analytics/dashboard/admin', null, this.analyticsUrl).pipe(catchError(() => of(null)))
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
