import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Mirrors BE ComplianceRule (ruleName, not name). */
export interface ComplianceRule {
  id: number;
  companyId?: number;
  ruleName: string;
  description?: string;
  isActive?: boolean;
}

/** Mirrors BE AuditLog. */
export interface AuditTrail {
  id: number;
  companyId?: number;
  entityName: string;
  entityId: number;
  action: string;
  performedBy: string;
  timestamp: string;
  oldValues?: string;
  newValues?: string;
  details?: string;
}

@Injectable({ providedIn: 'root' })
export class ComplianceService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  // --- Rules (/api/compliance-rules, COMPLIANCE_RULES_WRITE for mutations) ---
  getRules(): Observable<ComplianceRule[]> {
    return this.api.get<ComplianceRule[]>('/api/compliance-rules', [], this.baseUrl);
  }

  getRule(id: number): Observable<ComplianceRule> {
    return this.api.get<ComplianceRule>(`/api/compliance-rules/${id}`, undefined, this.baseUrl);
  }

  createRule(rule: Partial<ComplianceRule>): Observable<ComplianceRule> {
    return this.api.post<ComplianceRule>('/api/compliance-rules', rule, undefined, this.baseUrl);
  }

  updateRule(id: number, rule: Partial<ComplianceRule>): Observable<ComplianceRule> {
    return this.api.put<ComplianceRule>(`/api/compliance-rules/${id}`, rule, undefined, this.baseUrl);
  }

  deleteRule(id: number): Observable<void> {
    return this.api.delete<void>(`/api/compliance-rules/${id}`, undefined, this.baseUrl);
  }

  // --- Audit ledger (/api/audit-trails) ---
  getAuditTrails(): Observable<AuditTrail[]> {
    return this.api.get<AuditTrail[]>('/api/audit-trails', [], this.baseUrl);
  }

  getMyAuditTrails(): Observable<AuditTrail[]> {
    return this.api.get<AuditTrail[]>('/api/audit-trails/me', [], this.baseUrl);
  }

  getAuditTrailsByEntity(entityName: string, entityId: number): Observable<AuditTrail[]> {
    return this.api.get<AuditTrail[]>(
      `/api/audit-trails/entity/${encodeURIComponent(entityName)}/${entityId}`,
      [],
      this.baseUrl
    );
  }

  // --- Validators (/api/compliance/*) — each returns violations; empty = pass ---
  validateShift(lastShiftEnd: string, newShiftStart: string): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/validate-shift?lastShiftEnd=${encodeURIComponent(lastShiftEnd)}&newShiftStart=${encodeURIComponent(newShiftStart)}`,
      [],
      this.baseUrl
    );
  }

  validateWeeklyHours(employeeId: number, currentTotal: number, newShiftHours: number): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/validate-weekly-hours?employeeId=${employeeId}&currentTotal=${currentTotal}&newShiftHours=${newShiftHours}`,
      [],
      this.baseUrl
    );
  }

  validateDailyHours(employeeId: number, currentDayTotal: number, newShiftHours: number): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/validate-daily-hours?employeeId=${employeeId}&currentDayTotal=${currentDayTotal}&newShiftHours=${newShiftHours}`,
      [],
      this.baseUrl
    );
  }

  checkMealBreakPenalty(shiftHours: number, breakTaken: boolean): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/check-meal-break-penalty?shiftHours=${shiftHours}&breakTaken=${breakTaken}`,
      [],
      this.baseUrl
    );
  }

  checkPredictivePay(schedulePublishedDate: string, shiftStartTime: string): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/check-predictive-pay?schedulePublishedDate=${encodeURIComponent(schedulePublishedDate)}&shiftStartTime=${encodeURIComponent(shiftStartTime)}`,
      [],
      this.baseUrl
    );
  }

  checkGoodFaithEstimate(estimatedHours: number, actualHours: number): Observable<string[]> {
    return this.api.get<string[]>(
      `/api/compliance/check-good-faith-estimate?estimatedHours=${estimatedHours}&actualHours=${actualHours}`,
      [],
      this.baseUrl
    );
  }
}
