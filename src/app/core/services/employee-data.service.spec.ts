import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EmployeeDataService, Employee } from './employee-data.service';
import { environment } from '../../../environments/environment';

describe('EmployeeDataService', () => {
  let service: EmployeeDataService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EmployeeDataService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(EmployeeDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GET /api/employees returns paged list with page params', () => {
    service.getEmployeesPaged({ page: 1, size: 10, sort: 'lastName,asc' }).subscribe();

    const req = httpMock.expectOne(
      (r) => r.method === 'GET' && r.url.includes(`${base}/api/employees`)
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      content: [{ id: 1, firstName: 'Jane', lastName: 'Doe', email: 'jane@co.com', jobTitle: 'Engineer', department: 'Eng', companyId: 1, locationId: 1, status: 'ACTIVE', hireDate: '2026-01-01', phoneNumber: '', employeeNumber: 'EMP-1', employmentType: 'FULL_TIME', addressLine1: '', city: '', state: '', zipCode: '' }],
      totalElements: 1,
      totalPages: 1,
      number: 1,
      size: 10,
      first: false,
      last: true
    });
  });

  it('POST /api/employees creates an employee', () => {
    const dto: Partial<Employee> = { firstName: 'Jane', lastName: 'Doe', email: 'jane@co.com', jobTitle: 'Engineer', department: 'Eng', companyId: 1, locationId: 1, status: 'ACTIVE', hireDate: '2026-01-01', phoneNumber: '', employeeNumber: 'EMP-1', employmentType: 'FULL_TIME', addressLine1: '', city: '', state: '', zipCode: '' };
    service.createEmployee(dto).subscribe();

    const req = httpMock.expectOne(`${base}/api/employees`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.companyId).toBe(1); // tenant injected
    req.flush({ id: 1, ...dto });
  });

  it('PUT /api/employees/:id updates an employee', () => {
    service.updateEmployee(7, { jobTitle: 'Lead Engineer' }).subscribe();

    const req = httpMock.expectOne(`${base}/api/employees/7`);
    expect(req.request.method).toBe('PUT');
    req.flush({ id: 7, jobTitle: 'Lead Engineer' });
  });

  it('DELETE /api/employees/:id deactivates an employee', () => {
    service.deleteEmployee(7).subscribe();

    const req = httpMock.expectOne(`${base}/api/employees/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('PATCH /api/employees/:id/status transitions status', () => {
    service.updateStatus(7, 'TERMINATED', '2026-05-01').subscribe();

    const req = httpMock.expectOne(`${base}/api/employees/7/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('TERMINATED');
    expect(req.request.body.terminationDate).toBe('2026-05-01');
    req.flush({ id: 7, status: 'TERMINATED' });
  });

  it('GET /api/employees/:id returns single employee', () => {
    service.getEmployee(7).subscribe();

    const req = httpMock.expectOne(`${base}/api/employees/7`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 7, firstName: 'Jane', lastName: 'Doe', email: 'jane@co.com', jobTitle: 'Engineer', department: 'Eng', companyId: 1, locationId: 1, status: 'ACTIVE', hireDate: '2026-01-01', phoneNumber: '', employeeNumber: 'EMP-1', employmentType: 'FULL_TIME', addressLine1: '', city: '', state: '', zipCode: '' });
  });
});
