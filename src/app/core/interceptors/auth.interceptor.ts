import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshRequest: ReturnType<AuthService['refreshToken']> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const isRefreshRequest = req.url.includes('/api/auth/refresh');
  const isAuthRequest = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/register');

  const authenticatedReq = token && !isAuthRequest
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authenticatedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isRefreshRequest || isAuthRequest) {
        return throwError(() => error);
      }

      if (!refreshRequest) {
        refreshRequest = auth.refreshToken().pipe(
          shareReplay(1),
          finalize(() => {
            refreshRequest = null;
          })
        );
      }

      return refreshRequest.pipe(
        switchMap((response) => {
          const refreshedToken = response.accessToken ?? response.token;
          return next(req.clone({ setHeaders: { Authorization: `Bearer ${refreshedToken}` } }));
        }),
        catchError((refreshError) => {
          auth.logout();
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
