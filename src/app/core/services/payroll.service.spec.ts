import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PayrollService, PayrollRecord, SalaryStructure, Deduction, PayrollPeriodExceptions } from './payroll.service';
import { environment } from '../../../environments/environment';

describe('PayrollService', () => {
  let service: PayrollService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PayrollService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(PayrollService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GET /api/payroll/me/structure returns salary structure', () => {
    service.getMySalaryStructure().subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/me/structure`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 1, employeeId: 1, basicSalary: 5000, currency: 'USD', housingAllowance: 1000, transportAllowance: 500, taxDeduction: 800 });
  });

  it('GET /api/payroll/me/records returns payroll history', () => {
    service.getMyPayrollHistory().subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/me/records`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, payPeriodStart: '2026-04-01', payPeriodEnd: '2026-04-30', basicSalary: 5000, totalAllowances: 1500, grossPay: 6500, netPay: 5700, totalDeductions: 800, status: 'PAID', dataSource: 'attendance', locked: true, attendanceRecordCount: 22, attendanceTotalHours: 176, attendanceOvertimeHours: 16 }]);
  });

  it('POST /api/payroll/process/{employeeId} generates payroll', () => {
    service.generatePayroll(1, '2026-04-01', '2026-04-30').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'POST' && req.url === `${base}/api/payroll/process/1?startDate=2026-04-01&endDate=2026-04-30`
    );
    expect(request.request.method).toBe('POST');
    request.flush({ id: 1, employeeId: 1, payPeriodStart: '2026-04-01', payPeriodEnd: '2026-04-30', basicSalary: 5000, totalAllowances: 1500, grossPay: 6500, netPay: 5700, totalDeductions: 800, status: 'PENDING', dataSource: 'attendance', locked: false, attendanceRecordCount: 22, attendanceTotalHours: 176, attendanceOvertimeHours: 16 });
  });

  it('GET /api/payroll/company/pending returns pending payroll', () => {
    service.getCompanyPendingPayroll().subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/company/pending`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, payPeriodStart: '2026-04-01', payPeriodEnd: '2026-04-30', basicSalary: 5000, totalAllowances: 1500, grossPay: 6500, netPay: 5700, totalDeductions: 800, status: 'PENDING', dataSource: 'attendance', locked: false, attendanceRecordCount: 22, attendanceTotalHours: 176, attendanceOvertimeHours: 16 }]);
  });

  it('GET /api/payroll/company/exceptions returns period exceptions', () => {
    service.getPeriodExceptions('2026-04-01', '2026-04-30').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes(`${base}/api/payroll/company/exceptions`)
    );
    expect(request.request.method).toBe('GET');
    request.flush({ periodStart: '2026-04-01', periodEnd: '2026-04-30', employeeCount: 100, lockedCount: 95, exceptions: [] });
  });

  it('GET /api/payroll/company/export returns CSV blob', () => {
    service.exportPeriodCsv('2026-04-01', '2026-04-30').subscribe();

    const request = httpMock.expectOne(
      (req) => req.method === 'GET' && req.url.includes(`${base}/api/payroll/company/export`)
    );
    expect(request.request.method).toBe('GET');
    const blob = new Blob(['employeeId,grossPay'], { type: 'text/csv' });
    request.flush(blob);
  });

  it('GET /api/payroll/records/{id}/pdf returns payslip PDF blob', () => {
    service.downloadPayslipPdf(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/records/1/pdf`);
    expect(request.request.method).toBe('GET');
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    request.flush(blob);
  });

  it('POST /api/payroll/structure creates salary structure', () => {
    const structure: Partial<SalaryStructure> = { employeeId: 1, basicSalary: 5000, currency: 'USD', housingAllowance: 1000, transportAllowance: 500, taxDeduction: 800 };
    service.saveSalaryStructure(structure).subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/structure`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined(); // no auth user in test
    request.flush({ id: 1, ...structure });
  });

  it('GET /api/payroll/structure/{employeeId} returns salary structure', () => {
    service.getSalaryStructure(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/structure/1`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 1, employeeId: 1, basicSalary: 5000, currency: 'USD', housingAllowance: 1000, transportAllowance: 500, taxDeduction: 800 });
  });

  it('GET /api/payroll/me/deductions returns deductions', () => {
    service.getMyDeductions().subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/me/deductions`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, employeeId: 1, name: 'Tax', type: 'PERCENTAGE', value: 10 }]);
  });

  it('POST /api/payroll/deductions adds deduction', () => {
    const deduction: Partial<Deduction> = { employeeId: 1, name: 'Tax', type: 'PERCENTAGE', value: 10 };
    service.addDeduction(deduction).subscribe();

    const request = httpMock.expectOne(`${base}/api/payroll/deductions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined();
    request.flush({ id: 1, ...deduction });
  });
});
