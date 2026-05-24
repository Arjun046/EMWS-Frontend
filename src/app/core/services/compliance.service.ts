import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ComplianceRule {
  id: number;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface AuditTrail {
  id: number;
  entityName: string;
  entityId: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
}

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getRules(): Observable<ComplianceRule[]> {
    return this.api.get<ComplianceRule[]>('/api/compliance-rules', [], this.baseUrl);
  }

  getAuditTrails(): Observable<AuditTrail[]> {
    return this.api.get<AuditTrail[]>('/api/audit-trails', [], this.baseUrl);
  }

  checkCompliance(employeeId: number): Observable<any> {
    return this.api.get<any>(`/api/compliance/check/${employeeId}`, {}, this.baseUrl);
  }
}
