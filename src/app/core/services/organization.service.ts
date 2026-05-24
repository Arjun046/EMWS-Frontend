import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Company {
  id: number;
  name: string;
  industry: string;
  timezone: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
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
  locationId?: number;
  companyId: number;
  parentId?: number;
  name: string;
}

export interface CompanySettings {
  companyId: number;
  currencyCode: string;
  weekStartDay: string;
  standardWorkDayHours: number;
  overtimeThresholdWeekly: number;
  overtimeMultiplier: number;
  enableGeoFencing: boolean;
  enableAutomaticPayroll: boolean;
}

@Injectable({ providedIn: 'root' })
export class OrganizationService {
  private readonly baseUrl = environment.apiBaseUrl;
  constructor(private readonly api: ApiService) {}

  // Companies
  getMyCompany(): Observable<Company> {
    return this.api.get<Company>('/api/organization/companies/me', undefined, this.baseUrl);
  }

  updateMyCompany(company: Partial<Company>): Observable<Company> {
    return this.api.put<Company>('/api/organization/companies/me', company, undefined, this.baseUrl);
  }

  getMySettings(): Observable<CompanySettings> {
    return this.api.get<CompanySettings>('/api/organization/companies/me/settings', undefined, this.baseUrl);
  }

  updateMySettings(settings: Partial<CompanySettings>): Observable<CompanySettings> {
    return this.api.put<CompanySettings>('/api/organization/companies/me/settings', settings, undefined, this.baseUrl);
  }

  resetMyTheme(): Observable<Company> {
    return this.api.post<Company>('/api/organization/companies/me/reset-theme', {}, undefined, this.baseUrl);
  }

  // Legacy/Admin support for internal tools
  getCompanies(): Observable<Company[]> {
    return this.api.get<Company[]>('/api/organization/companies', [], this.baseUrl);
  }

  // Locations
  getMyLocations(): Observable<Location[]> {
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
  getMyDepartments(): Observable<Department[]> {
    return this.api.get<Department[]>('/api/organization/departments', [], this.baseUrl);
  }

  getSubDepartments(parentId: number): Observable<Department[]> {
    return this.api.get<Department[]>(`/api/organization/departments/${parentId}/sub-departments`, [], this.baseUrl);
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
