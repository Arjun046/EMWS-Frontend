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

  downloadPayslipPdf(payrollId: number): Observable<Blob> {
    return this.api.getBlob(`/api/payroll/records/${payrollId}/pdf`, this.baseUrl);
  }
}
