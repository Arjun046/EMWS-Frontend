import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, map, tap, throwError, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, AuthResponse } from '../../shared/models/ui.models';

const TOKEN_KEY = 'ewms.auth.token';
const REFRESH_TOKEN_KEY = 'ewms.auth.refreshToken';
const USER_KEY = 'ewms.auth.user';
const SCOPES_KEY = 'ewms.auth.scopes';
const ADMIN_KEY = 'ewms.auth.isAdmin';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userState = signal<AppUser | null>(this.loadUser());
  private readonly scopesSubject = new BehaviorSubject<string[]>(this.loadScopes());
  // Mirrors BE Capabilities.isAdmin (ROLE_ADMIN super-user). Guards bypass
  // scope checks for admins so a short/rotated permission list can never
  // hide menus — same contract as downstream @PreAuthorize handling.
  private readonly adminState = signal<boolean>(this.loadIsAdmin());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));
  readonly isAdmin = this.adminState.asReadonly();
  readonly scopes$ = this.scopesSubject.asObservable();

  get currentScopes(): string[] {
    return this.scopesSubject.value;
  }

  constructor(private readonly http: HttpClient) {
    // Self-heal stale pre-P0 storage (truncated 50-perm list + ADMIN 0):
    // recompute from JWT on boot so existing admin sessions recover without re-login.
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const healedScopes = this.extractScopes(token);
        const healedAdmin = this.loadIsAdmin();
        if (healedScopes.length > this.scopesSubject.value.length) {
          this.scopesSubject.next(healedScopes);
          localStorage.setItem(SCOPES_KEY, JSON.stringify(healedScopes));
        }
        if (healedAdmin && localStorage.getItem(ADMIN_KEY) !== '1') {
          this.adminState.set(true);
          localStorage.setItem(ADMIN_KEY, '1');
        }
      }
    } catch {
      // storage/JWT unavailable — remain logged out safely
    }
  }

  private loadIsAdmin(): boolean {
    if (localStorage.getItem(ADMIN_KEY) === '1') return true;
    return this.decodeJwtAdmin(localStorage.getItem(TOKEN_KEY));
  }

  login(email: string, password: string) {
    const loginUrl = `${environment.apiBaseUrl}/api/auth/login`;

    return this.http.post<AuthResponse>(loginUrl, { username: email, password }).pipe(
      map((response) => {
        // BE returns {mfaRequired:true, mfaToken, userId, companyId} when MFA enabled
        // instead of a JWT — do not treat as error, let caller handle MFA challenge.
        if ((response as AuthResponse)?.mfaRequired) {
          return response;
        }
        if (!response || !(response.token || response.accessToken)) {
          throw new Error('Invalid server response: Missing token');
        }
        return this.normalizeResponse(response, email);
      }),
      tap((response) => {
        if (!(response as AuthResponse)?.mfaRequired) {
          this.persistSession(response);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        return throwError(() => error);
      })
    );
  }

  verifyMfa(mfaToken: string, code: string) {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/api/auth/mfa/verify`, { mfaToken, code })
      .pipe(
        map((response) => this.normalizeResponse(response, this.userState()?.email ?? '')),
        tap((response) => this.persistSession(response))
      );
  }

  mfaStatus() {
    return this.http.get<{ enabled: boolean; email: string }>(
      `${environment.apiBaseUrl}/api/auth/mfa/status`
    );
  }

  mfaSetup() {
    return this.http.post<{ secret: string; qrCodeUrl?: string; otpauthUrl?: string }>(
      `${environment.apiBaseUrl}/api/auth/mfa/setup`,
      {}
    );
  }

  mfaConfirm(code: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/mfa/confirm`, {
      code,
    });
  }

  mfaDisable(code: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/mfa/disable`, {
      code,
    });
  }

  listSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiBaseUrl}/api/auth/sessions`);
  }

  revokeSession(id: number) {
    return this.http.delete<{ message: string }>(
      `${environment.apiBaseUrl}/api/auth/sessions/${id}`
    );
  }

  revokeAllSessions() {
    return this.http.post<{ message: string }>(
      `${environment.apiBaseUrl}/api/auth/sessions/revoke-all`,
      {}
    );
  }

  acceptInvite(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${environment.apiBaseUrl}/api/auth/accept-invite`, {
      token,
      newPassword,
    });
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
    // Revoke server-side refresh + access tokens (BE: POST /api/auth/logout {refreshToken})
    // then always clear local session even if BE is unreachable.
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      this.http
        .post(`${environment.apiBaseUrl}/api/auth/logout`, { refreshToken })
        .pipe(catchError(() => of(null)))
        .subscribe(() => this.clearLocalSession());
    } else {
      this.clearLocalSession();
    }
  }

  private clearLocalSession(): void {
    this.tokenState.set(null);
    this.userState.set(null);
    this.scopesSubject.next([]);
    this.adminState.set(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SCOPES_KEY);
    localStorage.removeItem(ADMIN_KEY);
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
    if (this.adminState()) return true;
    return this.scopesSubject.value.includes(scope);
  }

  hasAnyScope(scopes: string[]): boolean {
    if (this.adminState()) return true;
    return scopes.some((scope) => this.hasScope(scope));
  }

  private persistSession(response: AuthResponse): void {
    const token = response.accessToken ?? response.token;
    if (!token) {
      throw new Error('Invalid server response: Missing token');
    }
    const scopes = this.extractScopes(token, response);
    const isAdmin = response.capabilities?.isAdmin ?? this.decodeJwtAdmin(token);
    this.tokenState.set(token);
    const user = response.user ?? null;
    this.userState.set(user);
    // Set admin BEFORE emitting scopes so *appHasScope directives evaluating
    // on scopes$ see the correct super-user flag on first paint (P0 fix).
    this.adminState.set(isAdmin);
    this.scopesSubject.next(scopes);
    localStorage.setItem(TOKEN_KEY, token);
    if (response.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SCOPES_KEY, JSON.stringify(scopes));
    localStorage.setItem(ADMIN_KEY, isAdmin ? '1' : '0');
  }

  private decodeJwtPayload(token: string | null): Record<string, any> | null {
    if (!token) return null;
    try {
      const segment = token.split('.')[1] ?? '';
      // JWT uses base64url; atob needs standard base64 + padding (P0 fix:
      // admin JWTs with 118 perms contain -_ and previously threw → isAdmin=false).
      const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  private decodeJwtAdmin(token: string | null): boolean {
    const payload = this.decodeJwtPayload(token);
    if (!payload) return false;
    return payload['isAdmin'] === true || (Array.isArray(payload['roles']) && (payload['roles'] as unknown[]).includes('ROLE_ADMIN'));
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
    // Merge stored scopes with JWT scopes so stale truncated (pre-P0) caches self-heal.
    let stored: string[] = [];
    try {
      const raw = localStorage.getItem(SCOPES_KEY);
      stored = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      stored = [];
    }
    const tokenScopes = this.decodeJwtScopes(localStorage.getItem(TOKEN_KEY));
    return Array.from(new Set([...(stored ?? []), ...tokenScopes])).sort();
  }

  private extractScopes(token: string | null, response?: AuthResponse): string[] {
    const responseScopes = response?.capabilities?.permissions ?? [];
    const tokenScopes = this.decodeJwtScopes(token);
    return Array.from(new Set([...responseScopes, ...tokenScopes])).sort();
  }

  private decodeJwtScopes(token: string | null): string[] {
    const payload = this.decodeJwtPayload(token);
    if (!payload) {
      return [];
    }
    const scopes = payload['scopes'] ?? payload['permissions'] ?? [];
    return Array.isArray(scopes) ? (scopes as unknown[]).map(String) : [];
  }

  private normalizeResponse(response: AuthResponse, fallbackEmail: string): AuthResponse {
    if (response.user) {
      // Preserve BE capabilities/ids even when user shape is already present
      // (P0 fix: previously dropped capabilities → scopes/isAdmin fell back
      // to fragile JWT-only decode).
      const rawUser = (response as any).authenticatedUser ?? response.user;
      return {
        ...response,
        token: response.accessToken ?? response.token,
        accessToken: response.accessToken ?? response.token,
        username: response.username ?? rawUser?.email ?? fallbackEmail,
        id: (response as any).id ?? rawUser?.id,
        companyId: (response as any).companyId ?? rawUser?.companyId,
        user: rawUser ?? response.user,
      };
    }

    const email = response.username ?? fallbackEmail;
    const label = email.split('@')[0] || 'ewms-user';
    const title = label
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const rawUser = (response as any).authenticatedUser || (response as any).user;

    if (!rawUser?.id && (response as any).id == null) {
      console.warn('[auth] BE response missing user/id — using placeholder id=1; verify backend contract');
    }

    return {
      ...response,
      token: response.accessToken ?? response.token,
      accessToken: response.accessToken ?? response.token,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn,
      username: response.username ?? email,
      id: (response as any).id ?? rawUser?.id ?? 1,
      companyId: (response as any).companyId ?? rawUser?.companyId,
      capabilities: response.capabilities,
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
