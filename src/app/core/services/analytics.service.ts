import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Report {
  id: number;
  name: string;
  type: string; // PDF, CSV, JSON
  generatedDate: string;
  parameters: string;
}

export interface DashboardWidget {
  id: number;
  title: string;
  type: string; // CHART, METRIC, TABLE
  config: string;
  orderIndex: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getReports(): Observable<Report[]> {
    return this.api.get<Report[]>('/api/analytics/reports', [], this.baseUrl);
  }

  generateReport(report: Partial<Report>): Observable<Report> {
    return this.api.post<Report>('/api/analytics/reports', report, undefined, this.baseUrl);
  }

  getWidgets(): Observable<DashboardWidget[]> {
    return this.api.get<DashboardWidget[]>('/api/analytics/dashboard/widgets', [], this.baseUrl);
  }
}
