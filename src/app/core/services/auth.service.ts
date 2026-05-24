import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, map, tap, throwError, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, AuthResponse } from '../../shared/models/ui.models';

const TOKEN_KEY = 'ewms.auth.token';
const REFRESH_TOKEN_KEY = 'ewms.auth.refreshToken';
const USER_KEY = 'ewms.auth.user';
const SCOPES_KEY = 'ewms.auth.scopes';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userState = signal<AppUser | null>(this.loadUser());
  private readonly scopesSubject = new BehaviorSubject<string[]>(this.loadScopes());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));
  readonly scopes$ = this.scopesSubject.asObservable();

  get currentScopes(): string[] {
    return this.scopesSubject.value;
  }

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    const loginUrl = `${environment.apiBaseUrl}/api/auth/login`;

    return this.http.post<AuthResponse>(loginUrl, { username: email, password }).pipe(
      map((response) => {
        if (!response || !(response.token || response.accessToken)) {
          throw new Error('Invalid server response: Missing token');
        }
        return this.normalizeResponse(response, email);
      }),
      tap((response) => this.persistSession(response)),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  requestPasswordReset(email: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  setupPassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/setup-password`, {
      token,
      newPassword,
    });
  }

  signup(email: string, password: string, name: string) {
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ');
    const signupUrl = `${environment.apiBaseUrl}/api/auth/register`;

    return this.http.post<any>(signupUrl, {
      username: email,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || ''
    });
  }

  logout(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.scopesSubject.next([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SCOPES_KEY);
  }

  refreshToken() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      return throwError(() => new Error('Missing refresh token'));
    }

    return this.http.post<AuthResponse>(`${environment.apiBaseUrl}/api/auth/refresh`, { refreshToken }).pipe(
      map((response) => this.normalizeResponse(response, this.userState()?.email ?? '')),
      tap((response) => this.persistSession(response))
    );
  }

  changePassword(oldPassword: string, newPassword: string) {
    const changePwdUrl = `${environment.apiBaseUrl}/api/auth/change-password`;
    return this.http.post<any>(changePwdUrl, { oldPassword, newPassword });
  }

  getProfile(): Observable<any> {
    return this.http.get<any>(`${environment.apiBaseUrl}/api/users/profile`);
  }

  updateProfile(profileData: any): Observable<any> {
    return this.http.put<any>(`${environment.apiBaseUrl}/api/users/profile`, profileData).pipe(
      tap(updatedUser => {
        const current = this.userState();
        if (current) {
          const newUser = { ...current, ...updatedUser };
          this.userState.set(newUser);
          localStorage.setItem(USER_KEY, JSON.stringify(newUser));
        }
      })
    );
  }

  hasScope(scope: string): boolean {
    return this.scopesSubject.value.includes(scope);
  }

  hasAnyScope(scopes: string[]): boolean {
    return scopes.some((scope) => this.hasScope(scope));
  }

  private persistSession(response: AuthResponse): void {
    const token = response.accessToken ?? response.token;
    if (!token) {
      throw new Error('Invalid server response: Missing token');
    }
    const scopes = this.extractScopes(token, response);
    this.tokenState.set(token);
    const user = response.user ?? null;
    this.userState.set(user);
    this.scopesSubject.next(scopes);
    localStorage.setItem(TOKEN_KEY, token);
    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SCOPES_KEY, JSON.stringify(scopes));
  }

  private loadUser(): AppUser | null {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
    }
  }

  private loadScopes(): string[] {
    const raw = localStorage.getItem(SCOPES_KEY);
    try {
      return raw ? (JSON.parse(raw) as string[]) : this.extractScopes(localStorage.getItem(TOKEN_KEY));
    } catch {
      return [];
    }
  }

  private extractScopes(token: string | null, response?: AuthResponse): string[] {
    const responseScopes = response?.capabilities?.permissions ?? [];
    const tokenScopes = this.decodeJwtScopes(token);
    return Array.from(new Set([...responseScopes, ...tokenScopes])).sort();
  }

  private decodeJwtScopes(token: string | null): string[] {
    if (!token) {
      return [];
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      const scopes = payload.scopes ?? payload.permissions ?? [];
      return Array.isArray(scopes) ? scopes.map(String) : [];
    } catch {
      return [];
    }
  }

  private normalizeResponse(response: AuthResponse, fallbackEmail: string): AuthResponse {
    if (response.user) {
      return response;
    }

    const email = response.username ?? fallbackEmail;
    const label = email.split('@')[0] || 'ewms-user';
    const title = label
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const rawUser = (response as any).authenticatedUser || (response as any).user;

    return {
      token: response.accessToken ?? response.token,
      accessToken: response.accessToken ?? response.token,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      user: {
        id: rawUser?.id || (response as any).id || 1,
        name: rawUser?.name || title || 'EWMS User',
        email: rawUser?.email || email,
        role: rawUser?.role || 'EMPLOYEE',
        avatar: rawUser?.avatar || title.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() || 'EW',
        companyId: rawUser?.companyId || (response as any).companyId
      }
    };
  }
}
