import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NgClass, CommonModule } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../services/auth.service';
import { NotificationCenterService } from '../services/notification-center.service';
import { ThemeService } from '../services/theme.service';
import { NavigationItem } from '../../shared/models/ui.models';

interface NavigationItemExtended extends NavigationItem {
  roles?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    FormsModule,
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav #sidenav mode="side" [opened]="!isCollapsed()" class="shell__nav" [class.collapsed]="isCollapsed()">
        <div class="brand">
          <div class="brand__mark" *ngIf="!theme.currentTheme()?.logoUrl">EW</div>
          <img *ngIf="theme.currentTheme()?.logoUrl" [src]="theme.currentTheme()?.logoUrl" class="brand__logo">
          
          @if (!isCollapsed()) {
            <div class="brand__text">
              <h2>EWMS</h2>
              <p>Workforce Console</p>
            </div>
          }
        </div>

        <div class="nav-content">
          @for (section of sections(); track section) {
            <div class="nav-section">
              @if (!isCollapsed()) {
                <span class="nav-section__title">{{ section }}</span>
              } @else {
                <mat-divider class="section-divider"></mat-divider>
              }
              <mat-nav-list>
                @for (item of itemsForSection(section); track item.route) {
                  <a mat-list-item [routerLink]="item.route" routerLinkActive="active-link" [title]="item.label">
                    <mat-icon matListItemIcon [class.active-icon]="isActive(item.route)">{{ item.icon }}</mat-icon>
                    
                    <ng-container matListItemTitle>
                      @if (!isCollapsed()) {
                        {{ item.label }}
                      }
                    </ng-container>

                    @if (!isCollapsed() && item.badge) {
                      <span class="pill">{{ item.badge }}</span>
                    }
                  </a>
                }
              </mat-nav-list>
            </div>
          }
        </div>

        <div class="nav-footer">
          <button mat-icon-button (click)="isCollapsed.set(!isCollapsed())">
            <mat-icon>{{ isCollapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          </button>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="shell__content">
        <header class="main-header">
          <div class="header-left">
            <button mat-icon-button class="mobile-menu" (click)="sidenav.toggle()">
              <mat-icon>menu</mat-icon>
            </button>
            <div class="search-wrapper">
              <mat-icon>search</mat-icon>
              <input type="text" [(ngModel)]="search" placeholder="Search across the enterprise...">
              <span class="search-shortcut">⌘K</span>
            </div>
          </div>

          <div class="header-right">
            <div class="connectivity-status">
              <span class="status-dot online"></span>
              <span class="status-text">Gateway Live</span>
            </div>
            
            <button mat-icon-button [routerLink]="'/notifications'" [matBadge]="notifications.unreadCount()" matBadgeColor="warn">
              <mat-icon>notifications</mat-icon>
            </button>
            
            <div class="user-trigger" [matMenuTriggerFor]="profileMenu">
              <div class="avatar">{{ auth.user()?.avatar ?? 'EW' }}</div>
              <div class="user-meta">
                <span class="user-name">{{ auth.user()?.name ?? 'Guest User' }}</span>
                <span class="user-role">{{ auth.user()?.role ?? 'Administrator' }}</span>
              </div>
              <mat-icon>expand_more</mat-icon>
            </div>
          </div>
        </header>

        <main class="page-content">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>

    <mat-menu #profileMenu="matMenu" class="enterprise-menu">
      <div class="menu-header">
        <strong>{{ auth.user()?.name }}</strong>
        <p>{{ auth.user()?.email }}</p>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item [routerLink]="'/profile'">
        <mat-icon>account_circle</mat-icon>
        <span>My Profile</span>
      </button>
      <button mat-menu-item [routerLink]="'/communication'">
        <mat-icon>forum</mat-icon>
        <span>Workforce Chat</span>
      </button>
      <button mat-menu-item>
        <mat-icon>settings</mat-icon>
        <span>Preferences</span>
      </button>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="logout()" class="logout-item">
        <mat-icon>logout</mat-icon>
        <span>Sign out of Console</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    .shell-container { min-height: 100vh; background: #f8fafc; }
    
    /* Sidebar */
    .shell__nav { width: 17rem; transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1); background: #0f172a; color: #f1f5f9; border: none; display: flex; flex-direction: column; }
    .shell__nav.collapsed { width: 5rem; }
    
    .brand { height: 5rem; display: flex; align-items: center; gap: 1rem; padding: 0 1.25rem; }
    .brand__mark { width: 2.5rem; height: 2.5rem; min-width: 2.5rem; border-radius: 0.75rem; background: linear-gradient(135deg, #3b82f6, #06b6d4); color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 1rem; box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3); }
    .brand__logo { width: 2.5rem; height: 2.5rem; min-width: 2.5rem; border-radius: 0.75rem; object-fit: contain; }
    .brand__text h2 { margin: 0; font-size: 1.1rem; letter-spacing: 0.05em; }
    .brand__text p { margin: 0; font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
    
    .nav-content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem 0.75rem; }
    .nav-section { margin-bottom: 1.5rem; }
    .nav-section__title { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; padding: 0 0.75rem 0.5rem; display: block; }
    .section-divider { background: rgba(255,255,255,0.1); margin: 0.5rem 0; }
    
    .active-link { background: rgba(59, 130, 246, 0.1) !important; color: #60a5fa !important; border-radius: 0.75rem; }
    .active-icon { color: #60a5fa; }
    .pill { margin-left: auto; font-size: 0.65rem; font-weight: 700; background: #334155; padding: 0.15rem 0.4rem; border-radius: 999px; }
    
    .nav-footer { padding: 1rem; border-top: 1px solid rgba(255,255,255,0.05); text-align: center; }
    
    /* Header */
    .shell__content { display: flex; flex-direction: column; }
    .main-header { height: 5rem; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; padding: 0 2rem; position: sticky; top: 0; z-index: 100; }
    
    .header-left { display: flex; align-items: center; gap: 1.5rem; flex: 1; }
    .search-wrapper { position: relative; background: #f1f5f9; border-radius: 0.75rem; padding: 0 1rem; display: flex; align-items: center; gap: 0.75rem; width: min(30rem, 100%); height: 2.75rem; border: 1px solid transparent; transition: all 0.2s; }
    .search-wrapper:focus-within { background: #fff; border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
    .search-wrapper input { border: none; background: transparent; outline: none; flex: 1; font-size: 0.9rem; color: #1e293b; }
    .search-wrapper mat-icon { color: #64748b; font-size: 1.25rem; width: 1.25rem; height: 1.25rem; }
    .search-shortcut { font-size: 0.7rem; color: #94a3b8; border: 1px solid #cbd5e1; padding: 0.1rem 0.3rem; border-radius: 4px; }
    
    .header-right { display: flex; align-items: center; gap: 1.5rem; }
    .connectivity-status { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #f0fdf4; border-radius: 999px; border: 1px solid #dcfce7; }
    .status-dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; }
    .status-dot.online { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.5); }
    .status-text { font-size: 0.75rem; font-weight: 600; color: #166534; }
    
    .user-trigger { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem; border-radius: 0.75rem; cursor: pointer; transition: background 0.2s; }
    .user-trigger:hover { background: #f1f5f9; }
    .user-trigger .avatar { width: 2.25rem; height: 2.25rem; border-radius: 0.6rem; background: #3b82f6; color: #fff; display: grid; place-items: center; font-weight: 700; }
    .user-meta { display: flex; flex-direction: column; }
    .user-name { font-size: 0.85rem; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .user-role { font-size: 0.7rem; color: #64748b; font-weight: 500; }
    
    .page-content { flex: 1; padding: 2rem; max-width: 1600px; margin: 0 auto; width: 100%; box-sizing: border-box; }
    
    .mobile-menu { display: none; }
    
    @media (max-width: 1024px) {
      .shell__nav { position: fixed; z-index: 1000; height: 100vh; }
      .mobile-menu { display: block; }
      .search-wrapper { display: none; }
      .main-header { padding: 0 1rem; }
      .page-content { padding: 1rem; }
      .connectivity-status { display: none; }
    }

    @media (max-width: 640px) {
      .user-meta { display: none; }
      .main-header { height: 4rem; }
      .brand { height: 4rem; }
    }
  `]
})
export class AppShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationCenterService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  protected search = '';
  protected readonly isCollapsed = signal(false);

  private readonly navItems: NavigationItemExtended[] = [
    { label: 'Dashboard', icon: 'grid_view', route: '/dashboard', section: 'Overview' },
    { label: 'Notifications', icon: 'notifications', route: '/notifications', section: 'Overview', badge: '5' },
    
    { label: 'Employees', icon: 'person_search', route: '/employees', section: 'Workforce', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Attendance', icon: 'fact_check', route: '/attendance', section: 'Workforce' },
    { label: 'Leaves', icon: 'event_busy', route: '/leaves', section: 'Workforce' },
    { label: 'Scheduling', icon: 'calendar_today', route: '/scheduling', section: 'Workforce' },
    { label: 'Organization', icon: 'lan', route: '/organization', section: 'Workforce', roles: ['ADMIN'] },
    
    { label: 'Payroll', icon: 'payments', route: '/payroll', section: 'Execution' },
    { label: 'Performance', icon: 'insights', route: '/performance', section: 'Execution', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Compliance', icon: 'gavel', route: '/compliance', section: 'Execution', roles: ['ADMIN'] },
    { label: 'Documents', icon: 'description', route: '/documents', section: 'Execution' },
    
    { label: 'Analytics', icon: 'bar_chart', route: '/analytics', section: 'Insights', roles: ['ADMIN', 'MANAGER'] },
    { label: 'Communication', icon: 'chat', route: '/communication', section: 'Insights', badge: 'Live' },
    { label: 'Tasks', icon: 'assignment_turned_in', route: '/tasks', section: 'Insights' },
    
    { label: 'Roles & Permissions', icon: 'security', route: '/roles', section: 'Administration', roles: ['ADMIN'] },
    { label: 'Company Branding', icon: 'palette', route: '/organization/branding', section: 'Administration', roles: ['ADMIN'] }
  ];

  protected readonly sections = computed(() => {
    const userRole = this.auth.user()?.role || 'EMPLOYEE';
    const items = this.navItems.filter(item => !item.roles || item.roles.includes(userRole));
    return [...new Set(items.map((item) => item.section))];
  });

  protected itemsForSection(section: string): NavigationItem[] {
    const userRole = this.auth.user()?.role || 'EMPLOYEE';
    return this.navItems.filter((item) => 
      item.section === section && (!item.roles || item.roles.includes(userRole))
    );
  }

  protected isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }
}
