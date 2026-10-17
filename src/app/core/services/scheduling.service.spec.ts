import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SchedulingService, Shift } from './scheduling.service';
import { environment } from '../../../environments/environment';

describe('SchedulingService', () => {
  let service: SchedulingService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SchedulingService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(SchedulingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('extracts structured shift conflict errors', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: {
        status: 'error',
        message: 'Shift conflicts detected.',
        errorCode: 'SHIFT_CONFLICT',
        data: {
          conflicts: [
            {
              type: 'SHIFT',
              recordId: 12,
              employeeId: 7,
              startTime: '2026-04-02T09:00:00Z',
              endTime: '2026-04-02T17:00:00Z',
              status: 'PUBLISHED',
              message: 'Overlapping shift assignment'
            }
          ]
        }
      }
    });

    const parsed = service.extractShiftConflict(error);

    expect(parsed?.errorCode).toBe('SHIFT_CONFLICT');
    expect(parsed?.data.conflicts.length).toBe(1);
    expect(parsed?.data.conflicts[0].recordId).toBe(12);
  });

  it('GET /api/shifts returns shift list', () => {
    service.getShifts().subscribe();

    const request = httpMock.expectOne(`${base}/api/shifts`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, locationId: 1, departmentId: 1, startTime: '2026-04-02T09:00:00Z', endTime: '2026-04-02T17:00:00Z', status: 'PUBLISHED' }]);
  });

  it('POST /api/shifts creates a shift', () => {
    const shift: Partial<Shift> = { employeeId: 1, locationId: 1, departmentId: 1, startTime: '2026-04-02T09:00:00Z', endTime: '2026-04-02T17:00:00Z', status: 'PUBLISHED' };
    service.createShift(shift).subscribe();

    const request = httpMock.expectOne(`${base}/api/shifts`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined(); // createShift does not inject companyId (no auth user in test)
    request.flush({ id: 1, ...shift });
  });

  it('PUT /api/shifts/:id updates a shift', () => {
    service.updateShift(3, { status: 'COMPLETED' }).subscribe();

    const request = httpMock.expectOne(`${base}/api/shifts/3`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 3, status: 'COMPLETED' });
  });

  it('DELETE /api/shifts/:id deletes a shift', () => {
    service.deleteShift(3).subscribe();

    const request = httpMock.expectOne(`${base}/api/shifts/3`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('PATCH /api/shifts/:id/status updates shift status', () => {
    service.updateShiftStatus(3, 'PUBLISHED').subscribe();

    const request = httpMock.expectOne(`${base}/api/shifts/3/status?status=PUBLISHED`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 3, status: 'PUBLISHED' });
  });

  it('GET /api/shifts/range returns shifts for range', () => {
    service.getShiftRange('2026-04-01T00:00:00Z', '2026-04-07T23:59:59Z').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes(`${base}/api/shifts/range`)
    );
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, locationId: 1, departmentId: 1, startTime: '2026-04-02T09:00:00Z', endTime: '2026-04-02T17:00:00Z', status: 'PUBLISHED' }]);
  });

  it('GET /api/scheduling/swaps returns swaps', () => {
    service.getSwaps().subscribe();

    const request = httpMock.expectOne(`${base}/api/scheduling/swaps`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, originalShiftId: 1, requestingEmployeeId: 2, status: 'PENDING' }]);
  });

  it('POST /api/scheduling/swaps requests a swap', () => {
    service.requestSwap(1, 2).subscribe();

    const request = httpMock.expectOne(`${base}/api/scheduling/swaps`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.originalShiftId).toBe(1);
    expect(request.request.body.targetEmployeeId).toBe(2);
    request.flush({ id: 1, originalShiftId: 1, requestingEmployeeId: 2, status: 'PENDING' });
  });

  it('PATCH /api/scheduling/swaps/:id/accept accepts a swap', () => {
    service.acceptSwap(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/scheduling/swaps/1/accept`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 1, originalShiftId: 1, requestingEmployeeId: 2, status: 'ACCEPTED' });
  });

  it('PATCH /api/scheduling/swaps/:id/approve approves a swap', () => {
    service.approveSwap(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/scheduling/swaps/1/approve`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 1, originalShiftId: 1, requestingEmployeeId: 2, status: 'APPROVED' });
  });

  it('extractShiftConflict returns null for non-conflict errors', () => {
    const error = new HttpErrorResponse({ status: 500, error: { message: 'boom' } });
    expect(service.extractShiftConflict(error)).toBeNull();
  });

  it('extractShiftConflict returns null for non-http errors', () => {
    expect(service.extractShiftConflict(new Error('boom'))).toBeNull();
  });
});
