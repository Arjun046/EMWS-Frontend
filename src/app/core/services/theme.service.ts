import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { tap } from 'rxjs';

export interface CompanyTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  themeMode: 'LIGHT' | 'DARK' | 'SYSTEM';
  logoUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly themeState = signal<CompanyTheme | null>(null);
  
  readonly currentTheme = this.themeState.asReadonly();

  constructor() {
    // Automatically fetch and apply theme when user logs in
    effect(() => {
      const user = this.auth.user();
      if (user?.companyId) {
        this.fetchCompanyTheme(user.companyId);
      }
    });

    // Apply theme to document
    effect(() => {
      const theme = this.themeState();
      if (theme) {
        this.applyTheme(theme);
      }
    });
  }

  private fetchCompanyTheme(companyId: number): void {
    this.api.get<any>(`/api/organization/companies/${companyId}`, null, 'http://localhost:8080').subscribe(company => {
      if (company) {
        this.themeState.set({
          primaryColor: company.primaryColor || '#2563eb',
          secondaryColor: company.secondaryColor || '#64748b',
          accentColor: company.accentColor || '#14b8a6',
          backgroundColor: company.backgroundColor || '#f8fafc',
          textColor: company.textColor || '#0f172a',
          themeMode: company.themeMode || 'LIGHT',
          logoUrl: company.logoUrl
        });
      }
    });
  }

  updateTheme(companyId: number, theme: Partial<CompanyTheme>) {
    return this.api.put<any>(`/api/organization/companies/${companyId}`, theme, undefined, 'http://localhost:8080').pipe(
      tap(() => this.fetchCompanyTheme(companyId))
    );
  }

  resetTheme(companyId: number) {
    return this.api.post<any>(`/api/organization/companies/${companyId}/reset-theme`, {}, undefined, 'http://localhost:8080').pipe(
      tap(() => this.fetchCompanyTheme(companyId))
    );
  }

  private applyTheme(theme: CompanyTheme): void {
    const root = document.documentElement;
    
    root.style.setProperty('--primary-brand', theme.primaryColor);
    root.style.setProperty('--secondary-brand', theme.secondaryColor);
    root.style.setProperty('--accent-brand', theme.accentColor);
    root.style.setProperty('--bg-brand', theme.backgroundColor);
    root.style.setProperty('--text-brand', theme.textColor);
    
    // Auto-detect dark mode
    const isDark = theme.themeMode === 'DARK' || 
                  (theme.themeMode === 'SYSTEM' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      root.classList.add('global-dark-mode');
    } else {
      root.classList.remove('global-dark-mode');
    }

    // Favicon & Title logic
    if (theme.logoUrl) {
      this.updateFavicon(theme.logoUrl);
    }
    
    console.log('[ThemeService] Applied Company Theme:', theme);
  }

  private updateFavicon(url: string): void {
    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = url;
  }
}
