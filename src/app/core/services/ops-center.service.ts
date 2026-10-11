import { Injectable } from '@angular/core';
import { Observable, forkJoin, of, expand, map, reduce, EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LeaveStatus } from './leave.service';
import { isPage } from '../../shared/models/ui.models';
import { environment } from '../../../environments/environment';

export interface OpsSnapshot {
  clockedIn: number | null;
  pendingLeaves: any[];
  todayShifts: any[];
  overtimeHours: number | null;
  breakViolations: number | null;
  /** Sources that failed to load. Null numerics / empty lists alongside an entry here are UNKNOWN, not zero. */
  errors: string[];
  loadedAt: string;
}

/** Wraps a source call so failures are recorded instead of silently becoming 0/[] . */
interface Tracked<T> {
  source: string;
  value: T | null;
  failed: boolean;
}

function track<T>(source: string, request: Observable<T>): Observable<Tracked<T>> {
  return request.pipe(
    map((value) => ({ source, value, failed: false })),
    catchError(() => of({ source, value: null, failed: true }))
  );
}

/**
 * Ops Command Center aggregation.
 * Every path matches its BE controller exactly (see EWMS_PROFESSIONAL_ROADMAP Phase 1):
 *  - GET /api/attendance/summary/clocked-in (AttendanceController)
 *  - GET /api/leaves/company?status=PENDING (LeaveRequestController)
 *  - GET /api/shifts/range?start=&end= (ShiftController via gateway /api/shifts/**)
 *  - GET /api/attendance/summary/overtime|break-violations?start=&end=
 * Failed sources are recorded in snapshot.errors and surfaced by the page as
 * explicit unavailable states — never rendered as 0/empty masquerading as data.
 */
@Injectable({ providedIn: 'root' })
export class OpsCenterService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  loadSnapshot(): Observable<OpsSnapshot> {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return forkJoin({
      clockedIn: track('clocked-in', this.clockedInCount()),
      pendingLeaves: track('pending-leaves', this.pendingLeaves()),
      todayShifts: track('shifts', this.shiftsInRange(start.toISOString(), end.toISOString())),
      overtimeHours: track('overtime', this.overtimeHours(weekAgo.toISOString(), now.toISOString())),
      breakViolations: track('break-violations', this.breakViolations(start.toISOString(), now.toISOString())),
    }).pipe(
      map((parts) => ({
        clockedIn: parts.clockedIn.failed ? null : parts.clockedIn.value,
        pendingLeaves: parts.pendingLeaves.failed ? [] : (parts.pendingLeaves.value ?? []),
        todayShifts: parts.todayShifts.failed ? [] : (parts.todayShifts.value ?? []),
        overtimeHours: parts.overtimeHours.failed ? null : parts.overtimeHours.value,
        breakViolations: parts.breakViolations.failed ? null : parts.breakViolations.value,
        errors: [parts.clockedIn, parts.pendingLeaves, parts.todayShifts, parts.overtimeHours, parts.breakViolations]
          .filter((p) => p.failed)
          .map((p) => p.source),
        loadedAt: new Date().toISOString(),
      }))
    );
  }

  clockedInCount(): Observable<number> {
    return this.api.get<number>('/api/attendance/summary/clocked-in', undefined, this.baseUrl);
  }

  pendingLeaves(): Observable<any[]> {
    // Follows all server pages so the approval queue count stays correct at scale.
    return this.fetchAllPages<any>(`/api/leaves/company?status=${LeaveStatus.PENDING}`);
  }

  private fetchAllPages<T>(firstUrl: string, size = 200): Observable<T[]> {
    const url = (page: number) => `${firstUrl}${firstUrl.includes('?') ? '&' : '?'}page=${page}&size=${size}`;
    return this.api.get<any>(url(0), undefined, this.baseUrl).pipe(
      expand((res, index) => (res?.last === false ? this.api.get<any>(url(index + 1), undefined, this.baseUrl) : EMPTY)),
      map((res) => (isPage<T>(res) ? res.content : [])),
      reduce((all, content) => all.concat(content), [] as T[])
    );
  }

  shiftsInRange(start: string, end: string): Observable<any[]> {
    return this.api.get<any[]>(
      `/api/shifts/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      this.baseUrl
    );
  }

  overtimeHours(start: string, end: string): Observable<number> {
    return this.api.get<number>(
      `/api/attendance/summary/overtime?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      this.baseUrl
    );
  }

  breakViolations(start: string, end: string): Observable<number> {
    return this.api.get<number>(
      `/api/attendance/summary/break-violations?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
      undefined,
      this.baseUrl
    );
  }

  decideLeave(id: number, approved: boolean, comments = ''): Observable<any> {
    const status = approved ? 'APPROVED' : 'REJECTED';
    return this.api.patch<any>(
      `/api/leaves/${id}/status?status=${status}&comments=${encodeURIComponent(comments)}`,
      {},
      undefined,
      this.baseUrl
    );
  }
}
