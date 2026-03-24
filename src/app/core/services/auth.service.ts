import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, delay, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, AuthResponse } from '../../shared/models/ui.models';

const TOKEN_KEY = 'ewms.auth.token';
const USER_KEY = 'ewms.auth.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenState = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly userState = signal<AppUser | null>(this.loadUser());

  readonly token = this.tokenState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.tokenState()));

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string) {
    console.log(`[AuthService] Attempting login for ${email} at ${environment.apiBaseUrl}/api/auth/login`);
    
    const loginUrl = `${environment.apiBaseUrl}/api/auth/login`;
    
    return this.http.post<AuthResponse>(loginUrl, { username: email, password }).pipe(
      map((response) => {
        console.log('[AuthService] Login response received', response);
        if (!response || !response.token) {
          throw new Error('Invalid server response: Missing token');
        }
        return this.normalizeResponse(response, email);
      }),
      tap((response) => {
        console.log('[AuthService] Persisting session');
        this.persistSession(response);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('[AuthService] Login error:', error);
        return throwError(() => error);
      })
    );
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
    console.log('[AuthService] Logging out');
    this.tokenState.set(null);
    this.userState.set(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  changePassword(oldPassword: string, newPassword: string) {
    const changePwdUrl = `${environment.apiBaseUrl}/api/auth/change-password`;
    return this.http.post<any>(changePwdUrl, { oldPassword, newPassword });
  }

  private persistSession(response: AuthResponse): void {
    this.tokenState.set(response.token);
    this.userState.set(response.user ?? null);
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user ?? null));
  }

  private loadUser(): AppUser | null {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? (JSON.parse(raw) as AppUser) : null;
    } catch {
      return null;
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

    return {
      token: response.token,
      user: {
        id: (response as any).id || 1,
        name: title || 'EWMS User',
        email,
        role: 'ADMIN',
        avatar: title.split(' ').map((part) => part.charAt(0)).join('').slice(0, 2).toUpperCase() || 'EW',
        companyId: (response as any).companyId
      }
    };
  }
}
