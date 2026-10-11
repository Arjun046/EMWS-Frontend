import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SalaryStructure {
  id?: number;
  employeeId: number;
  basicSalary: number;
  hourlyRate?: number;
  currency: string;
  housingAllowance: number;
  transportAllowance: number;
  taxDeduction: number;
}

export interface Deduction {
  id?: number;
  employeeId: number;
  name: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
}

/** Mirrors BE PayrollPeriodExceptions (payroll-service). */
export interface PayrollExceptionEntry {
  employeeId: number;
  type: 'OPEN_SESSIONS' | 'NO_SALARY_STRUCTURE' | 'NO_ATTENDANCE_RECORDS' | string;
  message: string;
}

export interface PayrollPeriodExceptions {
  periodStart: string;
  periodEnd: string;
  employeeCount: number;
  lockedCount: number;
  exceptions: PayrollExceptionEntry[];
}

export interface PayrollRecord {
  id?: number;
  employeeId: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  basicSalary: number;
  totalAllowances: number;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  status: string;
  dataSource: string;
  locked: boolean;
  attendanceRecordCount: number;
  attendanceTotalHours: number;
  attendanceOvertimeHours: number;
  attendanceCapturedAt?: string;
  processedDate?: string;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getMySalaryStructure(): Observable<SalaryStructure> {
    return this.api.get<SalaryStructure>('/api/payroll/me/structure', {} as SalaryStructure, this.baseUrl);
  }

  getMyPayrollHistory(): Observable<PayrollRecord[]> {
    return this.api.get<PayrollRecord[]>('/api/payroll/me/records', [], this.baseUrl);
  }

  generatePayroll(employeeId: number, start: string, end: string): Observable<PayrollRecord> {
    return this.api.post<PayrollRecord>(`/api/payroll/process/${employeeId}?startDate=${start}&endDate=${end}`, {}, undefined, this.baseUrl);
  }

  getCompanyPendingPayroll(): Observable<PayrollRecord[]> {
    return this.api.get<PayrollRecord[]>('/api/payroll/company/pending', [], this.baseUrl);
  }

  /** BE: GET /company/exceptions — loud reconciliation gaps for a period. */
  getPeriodExceptions(start: string, end: string): Observable<PayrollPeriodExceptions> {
    return this.api.get<PayrollPeriodExceptions>(
      `/api/payroll/company/exceptions?startDate=${start}&endDate=${end}`, undefined, this.baseUrl);
  }

  /** BE: GET /company/export — permission-gated period CSV (processed + preview rows). */
  exportPeriodCsv(start: string, end: string): Observable<Blob> {
    return this.api.getBlob(`/api/payroll/company/export?startDate=${start}&endDate=${end}`, this.baseUrl);
  }

  downloadPayslipPdf(payrollId: number): Observable<Blob> {
    return this.api.getBlob(`/api/payroll/records/${payrollId}/pdf`, this.baseUrl);
  }

  /** BE: POST /structure (PAYROLL_ORG_WRITE) — create or update. */
  saveSalaryStructure(structure: Partial<SalaryStructure>): Observable<SalaryStructure> {
    return this.api.post<SalaryStructure>('/api/payroll/structure', structure, undefined, this.baseUrl);
  }

  /** BE: GET /structure/{employeeId} (PAYROLL_ORG_READ/TEAM_READ). */
  getSalaryStructure(employeeId: number): Observable<SalaryStructure> {
    return this.api.get<SalaryStructure>(`/api/payroll/structure/${employeeId}`, undefined, this.baseUrl);
  }

  /** BE: GET /me/deductions. */
  getMyDeductions(): Observable<Deduction[]> {
    return this.api.get<Deduction[]>('/api/payroll/me/deductions', [], this.baseUrl);
  }

  /** BE: POST /deductions (PAYROLL_ORG_WRITE). */
  addDeduction(deduction: Partial<Deduction>): Observable<Deduction> {
    return this.api.post<Deduction>('/api/payroll/deductions', deduction, undefined, this.baseUrl);
  }
}
