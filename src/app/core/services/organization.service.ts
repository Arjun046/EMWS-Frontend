import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

export interface Company {
  id: number;
  name: string;
  industry: string;
  timezone: string;
}

export interface Location {
  id: number;
  companyId: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export interface Department {
  id: number;
  locationId: number;
  companyId: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly baseUrl = 'http://localhost:8080';
  constructor(private readonly api: ApiService) {}

  // Companies
  getCompanies(): Observable<Company[]> {
    return this.api.get<Company[]>('/api/organization/companies', [], this.baseUrl);
  }

  createCompany(company: Partial<Company>): Observable<Company> {
    return this.api.post<Company>('/api/organization/companies', company, undefined, this.baseUrl);
  }

  updateCompany(id: number, company: Partial<Company>): Observable<Company> {
    return this.api.put<Company>(`/api/organization/companies/${id}`, company, undefined, this.baseUrl);
  }

  deleteCompany(id: number): Observable<void> {
    return this.api.delete<void>(`/api/organization/companies/${id}`, undefined, this.baseUrl);
  }

  // Locations
  getLocations(): Observable<Location[]> {
    return this.api.get<Location[]>('/api/organization/locations', [], this.baseUrl);
  }

  createLocation(location: Partial<Location>): Observable<Location> {
    return this.api.post<Location>('/api/organization/locations', location, undefined, this.baseUrl);
  }

  updateLocation(id: number, location: Partial<Location>): Observable<Location> {
    return this.api.put<Location>(`/api/organization/locations/${id}`, location, undefined, this.baseUrl);
  }

  deleteLocation(id: number): Observable<void> {
    return this.api.delete<void>(`/api/organization/locations/${id}`, undefined, this.baseUrl);
  }

  // Departments
  getDepartments(): Observable<Department[]> {
    return this.api.get<Department[]>('/api/organization/departments', [], this.baseUrl);
  }

  createDepartment(dept: Partial<Department>): Observable<Department> {
    return this.api.post<Department>('/api/organization/departments', dept, undefined, this.baseUrl);
  }

  updateDepartment(id: number, dept: Partial<Department>): Observable<Department> {
    return this.api.put<Department>(`/api/organization/departments/${id}`, dept, undefined, this.baseUrl);
  }

  deleteDepartment(id: number): Observable<void> {
    return this.api.delete<void>(`/api/organization/departments/${id}`, undefined, this.baseUrl);
  }
}
