import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeaveService, LeaveRequest, LeaveType, LeaveStatus, LeaveBalance } from './leave.service';
import { environment } from '../../../environments/environment';

describe('LeaveService', () => {
  let service: LeaveService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeaveService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(LeaveService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('POST /api/leaves creates a leave request', () => {
    const dto: Partial<LeaveRequest> = { employeeId: 1, leaveType: LeaveType.ANNUAL, startDate: '2026-04-01', endDate: '2026-04-05', reason: 'Vacation' };
    service.createRequest(dto).subscribe();

    const request = httpMock.expectOne(`${base}/api/leaves`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined(); // no auth user in test
    request.flush({ id: 1, ...dto, status: LeaveStatus.PENDING });
  });

  it('GET /api/leaves/me returns own requests paged', () => {
    service.getMyRequests().subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes(`${base}/api/leaves/me`)
    );
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 20, first: true, last: true });
  });

  it('GET /api/leaves/me/balances returns balances', () => {
    service.getMyBalances().subscribe();

    const request = httpMock.expectOne(`${base}/api/leaves/me/balances`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, leaveType: LeaveType.ANNUAL, totalEntitled: 20, used: 5, pending: 1 }]);
  });

  it('GET /api/leaves/company returns company requests with status filter', () => {
    service.getCompanyRequests(LeaveStatus.PENDING, { page: 0, size: 10 }).subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes(`${base}/api/leaves/company`)
    );
    expect(request.request.method).toBe('GET');
    request.flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10, first: true, last: true });
  });

  it('PATCH /api/leaves/:id/status updates status', () => {
    service.updateStatus(4, LeaveStatus.APPROVED, 'Approved by manager').subscribe();

    const request = httpMock.expectOne(`${base}/api/leaves/4/status?status=APPROVED&comments=Approved%20by%20manager`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ id: 4, status: LeaveStatus.APPROVED });
  });

  it('DELETE /api/leaves/:id/cancel cancels a request', () => {
    service.cancelRequest(4).subscribe();

    const request = httpMock.expectOne(`${base}/api/leaves/4/cancel`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });
});
