import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE Report (reportName/dataSummary — no name/type/parameters). */
export interface Report {
  id: number;
  companyId?: number;
  reportName: string;
  generatedBy?: string;
  generatedDate?: string;
  dataSummary?: string;
}

/** Mirrors BE DashboardWidget (name/apiEndpoint/socketTopic/role/position). */
export interface DashboardWidget {
  id: number;
  companyId?: number;
  name: string;
  type: string; // CHART, COUNTER, LIST
  apiEndpoint?: string;
  socketTopic?: string;
  role?: string;
  position?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getReports(): Observable<Report[]> {
    // No fallback: the analytics page tracks reportsError and shows an
    // explicit failure state. A [] fallback would masquerade outage as "no reports".
    return this.api.get<Report[]>('/api/analytics/reports', undefined, this.baseUrl);
  }

  getReport(id: number): Observable<Report> {
    return this.api.get<Report>(`/api/analytics/reports/${id}`, undefined, this.baseUrl);
  }

  generateReport(report: Partial<Report>): Observable<Report> {
    return this.api.post<Report>('/api/analytics/reports', report, undefined, this.baseUrl);
  }

  updateReport(id: number, report: Partial<Report>): Observable<Report> {
    return this.api.put<Report>(`/api/analytics/reports/${id}`, report, undefined, this.baseUrl);
  }

  deleteReport(id: number): Observable<void> {
    return this.api.delete<void>(`/api/analytics/reports/${id}`, undefined, this.baseUrl);
  }

  getWidgets(role = 'ADMIN'): Observable<DashboardWidget[]> {
    return this.api.get<DashboardWidget[]>(
      `/api/analytics/dashboard/widgets/${role}`,
      [],
      this.baseUrl
    );
  }

  createWidget(widget: Partial<DashboardWidget>): Observable<DashboardWidget> {
    return this.api.post<DashboardWidget>('/api/analytics/dashboard/widgets', widget, undefined, this.baseUrl);
  }

  updateWidget(id: number, widget: Partial<DashboardWidget>): Observable<DashboardWidget> {
    return this.api.put<DashboardWidget>(
      `/api/analytics/dashboard/widgets/${id}`,
      widget,
      undefined,
      this.baseUrl
    );
  }

  deleteWidget(id: number): Observable<void> {
    return this.api.delete<void>(`/api/analytics/dashboard/widgets/${id}`, undefined, this.baseUrl);
  }

  getAdminDashboard(): Observable<any> {
    return this.api.get<any>('/api/analytics/dashboard/admin', null, this.baseUrl);
  }
}
