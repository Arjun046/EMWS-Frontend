import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
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

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly api = inject(ApiService);
  private readonly THEME_KEY = 'ewms-theme';
  
  isDarkMode = signal<boolean>(false);
  currentTheme = signal<CompanyTheme | null>(null);

  constructor() {
    const saved = localStorage.getItem(this.THEME_KEY);
    if (saved) {
      this.isDarkMode.set(saved === 'dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDark);
    }
    this.applyTheme();
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
    localStorage.setItem(this.THEME_KEY, this.isDarkMode() ? 'dark' : 'light');
    this.applyTheme();
  }

  updateTheme(companyId: number, theme: CompanyTheme) {
    return this.api.put<CompanyTheme>(`/api/organization/companies/${companyId}/branding`, theme).pipe(
      tap(updated => {
        this.currentTheme.set(updated);
        this.applyBranding(updated);
      })
    );
  }

  resetTheme(companyId: number) {
    return this.api.delete<void>(`/api/organization/companies/${companyId}/branding`).pipe(
      tap(() => {
        this.currentTheme.set(null);
        this.clearBranding();
      })
    );
  }

  private applyTheme() {
    if (this.isDarkMode()) {
      document.body.classList.add('global-dark-mode');
    } else {
      document.body.classList.remove('global-dark-mode');
    }
  }

  private applyBranding(theme: CompanyTheme) {
    const root = document.documentElement;
    root.style.setProperty('--primary', theme.primaryColor);
    root.style.setProperty('--accent', theme.accentColor);
    // ... apply other properties if needed
  }

  private clearBranding() {
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--accent');
  }
}
