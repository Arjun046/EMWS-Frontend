import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  personalEmail?: string;
  jobTitle: string;
  department: string;
  departmentId?: number;
  companyId: number;
  locationId: number;
  role?: string;
  status: string;
  hireDate: string;

  phoneNumber: string;
  employeeNumber: string;
  employmentType: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  managerId?: number;
  managerName?: string;
  workLocationType?: string;
  probationEndDate?: string;
  terminationDate?: string;
  salary?: number;
}

interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

export interface EmployeeAddress {
  id?: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isPrimary: boolean;
}

export interface EmergencyContact {
  id?: number;
  name: string;
  phoneNumber: string;
  relationship: string;
  isPrimary: boolean;
}

export interface Dependent {
  id?: number;
  firstName: string;
  lastName: string;
  relationship: string;
  dateOfBirth: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeDataService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  getEmployees(): Observable<Employee[]> {
    return this.api.get<Employee[] | PageResponse<Employee>>('/api/employees?size=500&sort=lastName,asc', [], this.baseUrl).pipe(
      map((response) => Array.isArray(response) ? response : response.content ?? [])
    );
  }

  getEmployeeCount(): Observable<number> {
    return this.api.get<number>('/api/employees/count', undefined, this.baseUrl);
  }

  getEmployee(id: number): Observable<Employee> {
    return this.api.get<Employee>(`/api/employees/${id}`, undefined, this.baseUrl);
  }

  getProfile(): Observable<any> {
    return this.api.get<any>('/api/employees/me', undefined, this.baseUrl);
  }

  // --- Filtering & Management Queries ---

  getEmployeesByManager(managerId: number): Observable<Employee[]> {
    return this.api.get<Employee[]>(`/api/employees/manager/${managerId}`, [], this.baseUrl);
  }

  getEmployeesByStatus(status: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`/api/employees/status?status=${status}`, [], this.baseUrl);
  }

  getEmployeesByDepartment(deptId: number): Observable<Employee[]> {
    return this.api.get<Employee[]>(`/api/employees/department/${deptId}`, [], this.baseUrl);
  }

  // --- State Transitions ---

  terminateEmployee(id: number): Observable<Employee> {
    return this.api.post<Employee>(`/api/employees/${id}/terminate`, {}, undefined, this.baseUrl);
  }

  hireEmployee(id: number): Observable<Employee> {
    return this.api.post<Employee>(`/api/employees/${id}/hire`, {}, undefined, this.baseUrl);
  }

  // --- CRUD Operations ---

  createEmployee(employee: Partial<Employee>): Observable<Employee> {
    return this.api.post<Employee>('/api/employees', employee, undefined, this.baseUrl);
  }

  updateEmployee(id: number, employee: Partial<Employee>): Observable<Employee> {
    return this.api.put<Employee>(`/api/employees/${id}`, employee, undefined, this.baseUrl);
  }

  updateEmergencyContact(id: number, contact: any): Observable<Employee> {
    return this.api.patch<Employee>(`/api/employees/${id}/emergency-contact`, contact, undefined, this.baseUrl);
  }

  updateAddress(id: number, address: any): Observable<Employee> {
    return this.api.patch<Employee>(`/api/employees/${id}/address`, address, undefined, this.baseUrl);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.api.delete<void>(`/api/employees/${id}`, undefined, this.baseUrl);
  }

  // --- Collection Management (Sub-Profiles) ---

  getAddresses(empId: number): Observable<EmployeeAddress[]> {
    return this.api.get<EmployeeAddress[]>(`/api/employees/${empId}/profiles/addresses`, undefined, this.baseUrl);
  }

  addAddress(empId: number, address: EmployeeAddress): Observable<EmployeeAddress> {
    return this.api.post<EmployeeAddress>(`/api/employees/${empId}/profiles/addresses`, address, undefined, this.baseUrl);
  }

  getEmergencyContacts(empId: number): Observable<EmergencyContact[]> {
    return this.api.get<EmergencyContact[]>(`/api/employees/${empId}/profiles/emergency-contacts`, undefined, this.baseUrl);
  }

  addEmergencyContact(empId: number, contact: EmergencyContact): Observable<EmergencyContact> {
    return this.api.post<EmergencyContact>(`/api/employees/${empId}/profiles/emergency-contacts`, contact, undefined, this.baseUrl);
  }

  getDependents(empId: number): Observable<Dependent[]> {
    return this.api.get<Dependent[]>(`/api/employees/${empId}/profiles/dependents`, undefined, this.baseUrl);
  }

  addDependent(empId: number, dependent: Dependent): Observable<Dependent> {
    return this.api.post<Dependent>(`/api/employees/${empId}/profiles/dependents`, dependent, undefined, this.baseUrl);
  }
}
