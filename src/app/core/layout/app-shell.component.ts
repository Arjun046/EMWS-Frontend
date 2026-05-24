import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../services/auth.service';
import { NotificationCenterService } from '../services/notification-center.service';
import { ThemeService } from '../services/theme.service';
import { ToastService } from '../services/toast.service';
import { SearchService } from '../services/search.service';
import { NavigationItem } from '../../shared/models/ui.models';
import { AiAssistantComponent } from '../../shared/components/ai-assistant.component';
import { GlobalSearchComponent } from '../../shared/components/global-search.component';

interface NavigationItemExtended extends NavigationItem {
  scopes?: string[];
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatBadgeModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    AiAssistantComponent,
    GlobalSearchComponent,
    DatePipe
  ],
  template: `
    <div class="app-viewport">
      <div class="main-shell">
        <!-- Sidebar Backdrop for Mobile -->
        <div class="sidebar-backdrop" [class.active]="isSidebarOpen()" (click)="isSidebarOpen.set(false)"></div>

        <!-- APP SIDEBAR -->
        <aside class="app-sidebar" [class.mobile-open]="isSidebarOpen()">
          <div class="sidebar-header">
            <div class="sidebar-logo">EW</div>
            <div>
              <div class="sidebar-brand-title">Enterprise OS</div>
              <div class="sidebar-brand-subtitle">Workforce Platform</div>
            </div>
          </div>

          <nav class="sidebar-nav custom-scrollbar">
            @for (section of filteredSections(); track section) {
              <span class="nav-sec-label">{{ section }}</span>
              @for (item of itemsForSection(section); track item.route) {
                <a class="nav-link"
                   [routerLink]="item.route"
                   routerLinkActive="active"
                   (click)="isSidebarOpen.set(false)"
                   [id]="'nav-' + item.label.toLowerCase()"
                   [title]="item.label">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="nav-badge-count">{{ item.badge }}</span>
                  }
                </a>
              }
            }
          </nav>

          <div class="sidebar-footer-user">
             <div class="user-profile-widget" [matMenuTriggerFor]="profileMenu">
                <div class="user-avatar-circle">
                  {{ getInitials(auth.user()?.name) }}
                  <div class="avatar-status-dot"></div>
                </div>
                <div style="flex:1; min-width:0;">
                   <div class="widget-username">{{ auth.user()?.name }}</div>
                   <div class="widget-role">ROLE_{{ auth.user()?.role || 'ADMIN' }}</div>
                </div>
             </div>
          </div>
        </aside>

        <!-- CONTENT VIEWPORT -->
        <div class="app-content-area">
          <header class="app-header">
            <div class="breadcrumb-trail">
              <button class="hamburger-btn" (click)="isSidebarOpen.set(!isSidebarOpen())">
                <mat-icon style="font-size:1.1rem;">menu</mat-icon>
              </button>
              <span class="mut">SYSTEM</span>
              <mat-icon style="font-size:16px; width:16px; height:16px; color:var(--txt-muted)">chevron_right</mat-icon>
              <span id="headerBreadcrumbPage" style="font-weight: 800; text-transform: uppercase;">{{ currentRouteLabel() }}</span>
            </div>

            <div class="header-ctrls">
              <div class="digital-clock-widget">{{ liveTime() | date:'h:mm:ss a' }}</div>
              
              <button class="header-action-btn" (click)="theme.toggleTheme()" [title]="theme.isDarkMode() ? 'Light Mode' : 'Dark Mode'">
                 <mat-icon>{{ theme.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
              </button>

              <button class="header-action-btn" (click)="search.open()" title="Search (Ctrl+K)">
                <mat-icon>search</mat-icon>
              </button>

              <button class="header-action-btn" [matMenuTriggerFor]="notifMenu" title="Notifications">
                <mat-icon [matBadge]="notifications.unreadCount() || null" matBadgeColor="primary">notifications_none</mat-icon>
                @if (notifications.unreadCount() > 0) {
                  <div class="btn-notif-ping"></div>
                }
              </button>
              
              <mat-menu #notifMenu="matMenu" class="notification-dropdown" xPosition="before">
                <div class="notif-dropdown-container" (click)="$event.stopPropagation()">
                  <div class="notif-header">
                    <h3>Notifications</h3>
                    <button mat-button class="mark-all-btn" (click)="notifications.markAllAsRead()">
                      Mark all as read
                    </button>
                  </div>

                  <div class="notif-list custom-scrollbar">
                    @if (notifications.items().length > 0) {
                      @for (item of notifications.items(); track item.id) {
                        <div class="notif-item" [class.unread]="!item.isRead" (click)="notifications.markAsRead(item.id)">
                          <div class="notif-icon-wrap" [class]="item.category?.toLowerCase() || 'system'">
                            <mat-icon>{{ getNotifIcon(item.category) }}</mat-icon>
                          </div>
                          <div class="notif-content">
                            <div class="notif-title-row">
                              <span class="notif-title">{{ item.title }}</span>
                              @if (!item.isRead) {
                                <div class="unread-dot" title="Unread"></div>
                              }
                            </div>
                            <p class="notif-message">{{ item.content }}</p>
                            <span class="notif-time">
                              <mat-icon style="font-size: 12px; width: 12px; height: 12px;">schedule</mat-icon>
                              {{ item.when }}
                            </span>
                          </div>
                        </div>
                      }
                    } @else {
                      <div class="notif-empty-state">
                        <mat-icon>notifications_off</mat-icon>
                        <p>No new notifications</p>
                        <span style="font-size: 0.75rem; color: var(--txt-muted); margin-top: 0.5rem; display: block;">We'll notify you when something happens.</span>
                      </div>
                    }
                  </div>

                  <div class="notif-footer">
                    <button mat-button [routerLink]="'/notifications'" class="view-all-btn">
                      View All Activity
                    </button>
                  </div>
                </div>
              </mat-menu>
              
              <button class="header-action-btn" [routerLink]="'/settings'" title="Settings">
                 <mat-icon>settings</mat-icon>
              </button>
            </div>
          </header>

          <div class="page-scroll-container custom-scrollbar">
            <div class="fade-up" style="display: flex; flex-direction: column; flex: 1;">
              <router-outlet />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- GLOBAL UI OVERLAYS -->
    <app-ai-assistant />
    <app-global-search />

    <!-- TOAST NOTIFICATIONS -->
    <div class="toast-notifications-container">
       @for (toast of toastService.toasts(); track toast.id) {
         <div class="toast-card" [class]="toast.severity + '-toast'">
            <mat-icon style="font-size: 18px; width:18px; height:18px;">{{ toast.icon }}</mat-icon>
            <span>{{ toast.message }}</span>
         </div>
       }
    </div>

    <mat-menu #profileMenu="matMenu" class="user-dropdown">
      <div class="menu-header" style="padding: 1rem 1.5rem;">
        <strong style="display: block;">{{ auth.user()?.name }}</strong>
        <p style="font-size: 0.75rem; color: var(--txt-muted); margin: 0;">{{ auth.user()?.email }}</p>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item [routerLink]="'/profile'">
        <mat-icon>manage_accounts</mat-icon>
        <span>Security & Identity</span>
      </button>
      <button mat-menu-item (click)="logout()" style="color: var(--danger);">
        <mat-icon color="warn">logout</mat-icon>
        <span>Sign Out</span>
      </button>
    </mat-menu>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }

    .notification-dropdown {
      max-width: none !important;
      margin-top: 12px;
      border-radius: var(--radius-lg) !important;
      box-shadow: var(--shadow-lg) !important;
      border: 1px solid var(--border) !important;
    }

    .notif-dropdown-container {
      width: 400px;
      max-width: calc(100vw - 32px);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      outline: none;
    }

    .notif-header {
      padding: 1.25rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }

    .notif-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--txt-main);
    }

    .mark-all-btn {
      font-size: 0.72rem !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      color: var(--primary) !important;
    }

    .notif-list {
      max-height: 480px;
      overflow-y: auto;
      background: var(--bg);
    }

    .notif-item {
      padding: 1.15rem 1.5rem;
      display: flex;
      gap: 1.15rem;
      cursor: pointer;
      transition: all 0.2s var(--ease);
      border-bottom: 1px solid var(--border);
      position: relative;
      background: var(--surface);
    }

    .notif-item:hover {
      background: var(--surface-2);
      transform: translateX(4px);
    }

    .notif-item.unread {
      background: var(--primary-soft);
    }

    .notif-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: var(--surface-3);
      color: var(--txt-secondary);
      box-shadow: var(--shadow-sm);
    }

    .notif-icon-wrap mat-icon {
      font-size: 1.25rem;
      width: 1.25rem;
      height: 1.25rem;
    }

    .notif-icon-wrap.leave { background: var(--warning-soft); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.2); }
    .notif-icon-wrap.attendance { background: var(--primary-soft); color: var(--primary); border: 1px solid rgba(47, 111, 235, 0.2); }
    .notif-icon-wrap.payroll { background: var(--success-soft); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
    .notif-icon-wrap.message { background: var(--accent-soft); color: var(--accent); border: 1px solid rgba(139, 92, 246, 0.2); }
    .notif-icon-wrap.compliance { background: var(--danger-soft); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }

    .notif-content {
      flex: 1;
      min-width: 0;
    }

    .notif-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .notif-title {
      font-size: 0.9rem;
      font-weight: 800;
      color: var(--txt-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }

    .unread-dot {
      width: 10px;
      height: 10px;
      background: var(--primary);
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 8px var(--primary);
      animation: pulseNotif 2s infinite;
    }

    @keyframes pulseNotif {
      0% { box-shadow: 0 0 0 0 rgba(47, 111, 235, 0.6); }
      70% { box-shadow: 0 0 0 6px rgba(47, 111, 235, 0); }
      100% { box-shadow: 0 0 0 0 rgba(47, 111, 235, 0); }
    }

    .notif-message {
      margin: 0;
      font-size: 0.82rem;
      color: var(--txt-secondary);
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-weight: 500;
    }

    .notif-time {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: 0.6rem;
      font-size: 0.72rem;
      color: var(--txt-muted);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }

    .notif-empty-state {
      padding: 4rem 2rem;
      text-align: center;
      background: var(--surface);
    }

    .notif-empty-state mat-icon {
      font-size: 3.5rem;
      width: 3.5rem;
      height: 3.5rem;
      margin-bottom: 1.25rem;
      color: var(--txt-muted);
      opacity: 0.3;
    }

    .notif-empty-state p {
      margin: 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--txt-secondary);
    }

    .notif-footer {
      padding: 1rem;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }

    .view-all-btn {
      width: 100%;
      height: 44px;
      font-size: 0.85rem !important;
      font-weight: 800 !important;
      border-radius: var(--radius-md) !important;
      background: var(--surface-2) !important;
      color: var(--txt-main) !important;
    }

    .view-all-btn:hover {
      background: var(--surface-3) !important;
    }

    @media (max-width: 480px) {
      .notif-dropdown-container {
        width: 100vw;
        height: auto;
      }
    }
  `]
})
export class AppShellComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationCenterService);
  protected readonly theme = inject(ThemeService);
  protected readonly toastService = inject(ToastService);
  protected readonly search = inject(SearchService);
  protected readonly router = inject(Router);

  protected readonly liveTime = signal(Date.now());
  private timerHandle?: any;
  protected readonly isSidebarOpen = signal(false);

  private readonly navItems: NavigationItemExtended[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', section: 'Workspace' },
    { label: 'Messages', icon: 'chat', route: '/communication', section: 'Workspace', scopes: ['CHAT_DM_READ', 'CHAT_CHANNEL_READ', 'CHAT_DM_WRITE', 'CHAT_CHANNEL_CREATE'] },

    { label: 'Employees', icon: 'people', route: '/employees', section: 'Workforce', scopes: ['USER_ORG_READ', 'USER_TEAM_READ'] },
    { label: 'Scheduling', icon: 'calendar_today', route: '/scheduling', section: 'Workforce', scopes: ['SCHEDULE_ORG_READ', 'SCHEDULE_TEAM_READ'] },
    { label: 'Attendance', icon: 'timer', route: '/attendance', section: 'Workforce', scopes: ['ATTENDANCE_SELF_READ', 'ATTENDANCE_TEAM_READ', 'ATTENDANCE_ORG_READ'] },
    { label: 'Leaves', icon: 'event_busy', route: '/leaves', section: 'Workforce', scopes: ['LEAVE_SELF_READ', 'LEAVE_TEAM_READ', 'LEAVE_ORG_READ'] },

    { label: 'Payroll Hub', icon: 'payments', route: '/payroll', section: 'Administration', scopes: ['PAYROLL_ORG_READ'] },
    { label: 'Compliance Ledger', icon: 'gavel', route: '/compliance', section: 'Administration', scopes: ['AUDIT_ORG_READ'] },
    { label: 'Permissions', icon: 'admin_panel_settings', route: '/roles', section: 'Administration', scopes: ['ROLE_ORG_READ'] },

    { label: 'My Profile', icon: 'account_circle', route: '/profile', section: 'Account' },
    { label: 'Settings', icon: 'settings', route: '/settings', section: 'Account' }
  ];

  protected readonly filteredSections = computed(() => {
    const items = this.navItems.filter(item => this.canAccess(item));
    return [...new Set(items.map(item => item.section))];
  });

  protected readonly currentRouteLabel = computed(() => {
    const url = this.router.url;
    const item = this.navItems.find(i => url.includes(i.route));
    return item?.label || 'Dashboard';
  });

  ngOnInit(): void {
    this.timerHandle = setInterval(() => this.liveTime.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
    }
  }

  protected itemsForSection(section: string): NavigationItem[] {
    return this.navItems.filter((item) => item.section === section && this.canAccess(item));
  }

  private canAccess(item: NavigationItemExtended): boolean {
    if (!item.scopes || item.scopes.length === 0) return true;
    return this.auth.hasAnyScope(item.scopes);
  }

  protected getInitials(name?: string) {
    if (!name) return 'OA';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth/login');
  }

  protected getNotifIcon(category?: string): string {
    switch (category?.toLowerCase()) {
      case 'leave': return 'event_busy';
      case 'attendance': return 'timer';
      case 'payroll': return 'payments';
      case 'message': return 'chat';
      case 'permission': return 'admin_panel_settings';
      case 'compliance': return 'gavel';
      default: return 'notifications';
    }
  }
}
