import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface IntegrationConfig {
  id: number;
  companyId?: number;
  systemName: string;
  apiKey?: string;
  endpointUrl?: string;
  isActive?: boolean;
}

export interface SyncLog {
  id: number;
  companyId?: number;
  systemName: string;
  syncDate?: string;
  status: string;
  details?: string;
}

/**
 * Matches IntegrationController (/api/integrations):
 *  configs POST/GET/PUT/{id}/DELETE/{id}, logs POST + GET /logs/{systemName}.
 * There is no dedicated FE page yet — ops/admin tooling can drive this
 * service directly until the integrations console lands.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly root = '/api/integrations';
  constructor(private readonly api: ApiService) {}

  getConfigs(): Observable<IntegrationConfig[]> {
    return this.api.get<IntegrationConfig[]>(`${this.root}/configs`, [], this.baseUrl);
  }

  createConfig(config: Partial<IntegrationConfig>): Observable<IntegrationConfig> {
    return this.api.post<IntegrationConfig>(`${this.root}/configs`, config, undefined, this.baseUrl);
  }

  updateConfig(id: number, config: Partial<IntegrationConfig>): Observable<IntegrationConfig> {
    return this.api.put<IntegrationConfig>(`${this.root}/configs/${id}`, config, undefined, this.baseUrl);
  }

  deleteConfig(id: number): Observable<void> {
    return this.api.delete<void>(`${this.root}/configs/${id}`, undefined, this.baseUrl);
  }

  logSync(log: Partial<SyncLog>): Observable<SyncLog> {
    return this.api.post<SyncLog>(`${this.root}/logs`, log, undefined, this.baseUrl);
  }

  getLogs(systemName: string): Observable<SyncLog[]> {
    return this.api.get<SyncLog[]>(
      `${this.root}/logs/${encodeURIComponent(systemName)}`,
      [],
      this.baseUrl
    );
  }
}
