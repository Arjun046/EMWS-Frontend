import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TimesheetService, Timesheet, TimesheetReconciliation } from './timesheet.service';
import { environment } from '../../../environments/environment';

describe('TimesheetService', () => {
  let service: TimesheetService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TimesheetService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TimesheetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POST /api/attendance/timesheets/generate creates a timesheet', () => {
    service.generateTimesheet(1, '2026-04-01', '2026-04-07').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'POST' && req.url === `${base}/api/attendance/timesheets/generate`
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ employeeId: 1, startDate: '2026-04-01', endDate: '2026-04-07' });
    request.flush({ id: 1, employeeId: 1, companyId: 1, startDate: '2026-04-01', endDate: '2026-04-07', totalHours: 40, status: 'PENDING' });
  });

  it('GET /api/attendance/timesheets/:id returns a timesheet', () => {
    service.getTimesheet(3).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${base}/api/attendance/timesheets/3`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ id: 3, employeeId: 1, companyId: 1, startDate: '2026-04-01', endDate: '2026-04-07', totalHours: 40, status: 'SUBMITTED' });
  });

  it('GET /api/attendance/timesheets/employee/:id returns employee timesheets', () => {
    service.getEmployeeTimesheets(1).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${base}/api/attendance/timesheets/employee/1`
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, companyId: 1, startDate: '2026-04-01', endDate: '2026-04-07', totalHours: 40, status: 'APPROVED' }]);
  });

  it('GET /api/attendance/timesheets/pending returns pending timesheets', () => {
    service.pendingTimesheets().subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${base}/api/attendance/timesheets/pending`
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 2, employeeId: 5, companyId: 1, startDate: '2026-04-01', endDate: '2026-04-07', totalHours: 38, status: 'PENDING' }]);
  });

  it('GET /api/attendance/timesheets/:id/reconciliation returns reconciliation', () => {
    service.reconcile(3).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${base}/api/attendance/timesheets/3/reconciliation`
    );
    expect(request.request.method).toBe('GET');
    request.flush({ timesheetId: 3, employeeId: 1, startDate: '2026-04-01', endDate: '2026-04-07', status: 'SUBMITTED', storedHours: 40, currentHours: 40, deltaHours: 0, attendanceRecords: 5, openSessions: 0, matches: true });
  });

  it('PUT /api/attendance/timesheets/:id/status updates status', () => {
    service.updateStatus(3, 'APPROVED').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'PUT' && req.url === `${base}/api/attendance/timesheets/3/status`
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body.status).toBe('APPROVED');
    request.flush({ id: 3, employeeId: 1, companyId: 1, startDate: '2026-04-01', endDate: '2026-04-07', totalHours: 40, status: 'APPROVED' });
  });

  it('reconciliation flags mismatches (deltaHours != 0)', () => {
    service.reconcile(3).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url === `${base}/api/attendance/timesheets/3/reconciliation`
    );
    request.flush({ timesheetId: 3, employeeId: 1, startDate: '2026-04-01', endDate: '2026-04-07', status: 'SUBMITTED', storedHours: 40, currentHours: 42, deltaHours: 2, attendanceRecords: 5, openSessions: 0, matches: false });
  });
});
