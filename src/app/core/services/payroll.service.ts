import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface SalaryStructure {
  id: number;
  employeeId: number;
  basicSalary: number;
  allowances: number;
  bonus: number;
  currency: string;
}

export interface PayrollRecord {
  id: number;
  employeeId: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  grossPay: number;
  netPay: number;
  totalDeductions: number;
  status: string; // PENDING, PAID
  paymentDate?: string;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getSalaryStructure(employeeId: number): Observable<SalaryStructure> {
    return this.api.get<SalaryStructure>(`/api/payroll/salary-structure/${employeeId}`, {} as any, this.baseUrl);
  }

  getPayrollHistory(employeeId: number): Observable<PayrollRecord[]> {
    return this.api.get<PayrollRecord[]>(`/api/payroll/history/${employeeId}`, [], this.baseUrl);
  }

  generatePayroll(employeeId: number, start: string, end: string): Observable<PayrollRecord> {
    const params = new URLSearchParams();
    params.append('employeeId', employeeId.toString());
    params.append('startDate', start);
    params.append('endDate', end);
    return this.api.post<PayrollRecord>(`/api/payroll/process?${params.toString()}`, {}, undefined, this.baseUrl);
  }

  getPendingPayroll(): Observable<PayrollRecord[]> {
    return this.api.get<PayrollRecord[]>('/api/payroll/pending', [], this.baseUrl);
  }
}
