import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalyticsService, Report, DashboardWidget } from './analytics.service';
import { environment } from '../../../environments/environment';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('GET /api/analytics/reports returns reports list', () => {
    service.getReports().subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/reports`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, companyId: 1, reportName: 'Attendance Summary', generatedBy: 'admin', generatedDate: '2026-04-01', dataSummary: '{}' }]);
  });

  it('GET /api/analytics/reports/{id} returns a report', () => {
    service.getReport(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/reports/1`);
    expect(request.request.method).toBe('GET');
    request.flush({ id: 1, companyId: 1, reportName: 'Attendance Summary', generatedBy: 'admin', generatedDate: '2026-04-01', dataSummary: '{}' });
  });

  it('POST /api/analytics/reports generates a report', () => {
    const report: Partial<Report> = { reportName: 'Leave Summary', generatedBy: 'admin' };
    service.generateReport(report).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/reports`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined(); // no auth user in test
    request.flush({ id: 2, ...report });
  });

  it('PUT /api/analytics/reports/{id} updates a report', () => {
    service.updateReport(1, { reportName: 'Updated Report' }).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/reports/1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 1, reportName: 'Updated Report' });
  });

  it('DELETE /api/analytics/reports/{id} deletes a report', () => {
    service.deleteReport(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/reports/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('GET /api/analytics/dashboard/widgets/{role} returns widgets', () => {
    service.getWidgets('ADMIN').subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/dashboard/widgets/ADMIN`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, companyId: 1, name: 'Present Today', type: 'COUNTER', role: 'ADMIN', position: 1 }]);
  });

  it('POST /api/analytics/dashboard/widgets creates a widget', () => {
    const widget: Partial<DashboardWidget> = { name: 'Overtime', type: 'CHART', role: 'ADMIN', position: 2 };
    service.createWidget(widget).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/dashboard/widgets`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.companyId).toBeUndefined();
    request.flush({ id: 2, ...widget });
  });

  it('PUT /api/analytics/dashboard/widgets/{id} updates a widget', () => {
    service.updateWidget(1, { name: 'Updated Widget' }).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/dashboard/widgets/1`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 1, name: 'Updated Widget' });
  });

  it('DELETE /api/analytics/dashboard/widgets/{id} deletes a widget', () => {
    service.deleteWidget(1).subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/dashboard/widgets/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
  });

  it('GET /api/analytics/dashboard/admin returns admin dashboard', () => {
    service.getAdminDashboard().subscribe();

    const request = httpMock.expectOne(`${base}/api/analytics/dashboard/admin`);
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
