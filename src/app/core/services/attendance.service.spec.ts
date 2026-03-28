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
        req.urlWithParams === 'http://localhost:8080/api/attendance/clock-in?employeeId=42&idempotencyKey=clock-in-42-key'
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
});
