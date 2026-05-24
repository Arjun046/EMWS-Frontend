import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  get<T>(path: string, fallback?: T, baseUrl?: string): Observable<T> {
    return this.http.get<T>(this.buildUrl(path, baseUrl)).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  post<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const bodyWithTenant = this.injectCompanyId(body);
    return this.http.post<T>(this.buildUrl(path, baseUrl), bodyWithTenant).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  put<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const bodyWithTenant = this.injectCompanyId(body);
    return this.http.put<T>(this.buildUrl(path, baseUrl), bodyWithTenant).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  patch<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const bodyWithTenant = this.injectCompanyId(body);
    return this.http.patch<T>(this.buildUrl(path, baseUrl), bodyWithTenant).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  delete<T>(path: string, fallback?: T, baseUrl?: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path, baseUrl)).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  getBlob(path: string, baseUrl?: string): Observable<Blob> {
    return this.http.get(this.buildUrl(path, baseUrl), { responseType: 'blob' });
  }

  private injectCompanyId(body: unknown): unknown {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
    
    const user = this.auth.user();
    const bodyObj = body as Record<string, unknown>;
    if (user?.companyId && (bodyObj['companyId'] === undefined || bodyObj['companyId'] === null)) {
      return { ...bodyObj, companyId: user.companyId };
    }
    return body;
  }

  private buildUrl(path: string, baseUrl?: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const configuredBase = baseUrl && !this.isLocalGateway(baseUrl) ? baseUrl : environment.apiBaseUrl;
    return `${configuredBase}${path}`;
  }

  private isLocalGateway(baseUrl: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1):8080$/i.test(baseUrl);
  }
}
