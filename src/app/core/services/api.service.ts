import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  get<T>(path: string, fallback?: T, baseUrl?: string): Observable<T> {
    const base = baseUrl ?? environment.apiBaseUrl;
    return this.http.get<T>(`${base}${path}`).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  post<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const base = baseUrl ?? environment.apiBaseUrl;
    return this.http.post<T>(`${base}${path}`, body).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  put<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const base = baseUrl ?? environment.apiBaseUrl;
    return this.http.put<T>(`${base}${path}`, body).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  patch<T>(path: string, body: unknown, fallback?: T, baseUrl?: string): Observable<T> {
    const base = baseUrl ?? environment.apiBaseUrl;
    return this.http.patch<T>(`${base}${path}`, body).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }

  delete<T>(path: string, fallback?: T, baseUrl?: string): Observable<T> {
    const base = baseUrl ?? environment.apiBaseUrl;
    return this.http.delete<T>(`${base}${path}`).pipe(
      catchError((error) => {
        if (fallback !== undefined) {
          return of(fallback);
        }
        return throwError(() => error);
      })
    );
  }
}
