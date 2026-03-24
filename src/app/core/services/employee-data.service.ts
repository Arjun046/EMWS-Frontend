import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department: string;
  departmentId: number;
  companyId: number;
  locationId: number;
  status: string;
  hireDate: string;
  phoneNumber: string;
  employeeNumber: string;
  employmentType: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeDataService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  getEmployees(): Observable<Employee[]> {
    return this.api.get<Employee[]>('/api/employees', [], this.baseUrl);
  }

  getEmployee(id: number): Observable<Employee> {
    return this.api.get<Employee>(`/api/employees/${id}`, undefined, this.baseUrl);
  }

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.api.post<Employee>('/api/employees', employee, undefined, this.baseUrl);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.api.put<Employee>(`/api/employees/${id}`, employee, undefined, this.baseUrl);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.api.delete<void>(`/api/employees/${id}`, undefined, this.baseUrl);
  }
}
