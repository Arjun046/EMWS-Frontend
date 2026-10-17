import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AttendanceService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AttendanceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds the idempotency key to the clock-in request', () => {
    service.clockIn(42, undefined, undefined, 'clock-in-42-key').subscribe();

    const request = httpMock.expectOne(
      (req) =>
        req.method === 'POST' &&
        req.urlWithParams === 'https://localhost:8080/api/attendance/clock-in?employeeId=42&idempotencyKey=clock-in-42-key'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.urlWithParams).toContain('idempotencyKey=clock-in-42-key');

    request.flush({
      id: 1,
      employeeId: 42,
      companyId: 1,
      clockIn: '2026-03-28T09:00:00Z',
      clockOut: null,
      isLate: false,
      breakStartTime: null,
      breakEndTime: null,
      latitude: null,
      longitude: null,
      totalHours: null,
      overtimeHours: null,
      mealBreakCompliant: null
    });
  });

  it('calls clock-out with attendanceId', () => {
    service.clockOut(7).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'POST' && req.urlWithParams === 'https://localhost:8080/api/attendance/clock-out?attendanceId=7'
    );
    expect(request.request.method).toBe('POST');
    request.flush({ id: 7, employeeId: 42, companyId: 1, clockIn: '2026-03-28T09:00:00Z', clockOut: '2026-03-28T17:00:00Z', isLate: false, breakStartTime: null, breakEndTime: null, latitude: null, longitude: null, totalHours: 8, overtimeHours: 0, mealBreakCompliant: true });
  });

  it('calls manual entry with payload', () => {
    service.manualEntry({ employeeId: 3, clockIn: '2026-03-28T09:00:00Z', clockOut: null, note: 'Late arrival', source: 'ADMIN_OVERRIDE' }).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'POST' && req.url === 'https://localhost:8080/api/attendance/manual'
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.source).toBe('ADMIN_OVERRIDE');
    request.flush({ id: 11, employeeId: 3, companyId: 1, clockIn: '2026-03-28T09:00:00Z', clockOut: null, isLate: true, breakStartTime: null, breakEndTime: null, latitude: null, longitude: null, totalHours: null, overtimeHours: null, mealBreakCompliant: null });
  });

  it('calls force clock-out with PATCH', () => {
    service.forceClockOut(9).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'PATCH' && req.url === 'https://localhost:8080/api/attendance/9/force-clock-out'
    );
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 9, employeeId: 5, companyId: 1, clockIn: '2026-03-28T08:00:00Z', clockOut: '2026-03-28T17:00:00Z', isLate: false, breakStartTime: null, breakEndTime: null, latitude: null, longitude: null, totalHours: 9, overtimeHours: 1, mealBreakCompliant: true });
  });

  it('gets overtime hours summary', () => {
    service.getOvertimeHours('2026-03-01T00:00:00Z', '2026-03-07T23:59:59Z').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === 'https://localhost:8080/api/attendance/summary/overtime?start=2026-03-01T00:00:00Z&end=2026-03-07T23:59:59Z'
    );
    expect(request.request.method).toBe('GET');
    request.flush(5.5);
  });

  it('gets break violations summary', () => {
    service.getBreakViolations('2026-03-01T00:00:00Z', '2026-03-07T23:59:59Z').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes('/api/attendance/summary/break-violations')
    );
    expect(request.request.method).toBe('GET');
    request.flush(2);
  });

  it('gets clocked-in count', () => {
    service.getClockedInCount().subscribe();

    const request = httpMock.expectOne('https://localhost:8080/api/attendance/summary/clocked-in');
    expect(request.request.method).toBe('GET');
    request.flush(12);
  });
});
