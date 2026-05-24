import { Routes } from '@angular/router';
import { AppShellComponent } from './core/layout/app-shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES)
      },
      {
        path: 'notifications',
        data: { requiredAnyScope: ['DASHBOARD_SELF_READ', 'DASHBOARD_OPS_READ'] },
        loadChildren: () => import('./features/notifications/notifications.routes').then((m) => m.NOTIFICATIONS_ROUTES)
      },
      {
        path: 'employees',
        data: { requiredAnyScope: ['USER_SELF_READ', 'USER_TEAM_READ', 'USER_ORG_READ'] },
        loadChildren: () => import('./features/employees/employees.routes').then((m) => m.EMPLOYEES_ROUTES)
      },
      {
        path: 'attendance',
        data: { requiredAnyScope: ['ATTENDANCE_SELF_READ', 'ATTENDANCE_TEAM_READ', 'ATTENDANCE_ORG_READ'] },
        loadChildren: () => import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES)
      },
      {
        path: 'leaves',
        data: { requiredAnyScope: ['LEAVE_SELF_READ', 'LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE'] },
        loadChildren: () => import('./features/leaves/leaves.routes').then((m) => m.LEAVES_ROUTES)
      },
      {
        path: 'payroll',
        data: { requiredAnyScope: ['PAYROLL_SELF_READ', 'PAYROLL_TEAM_READ', 'PAYROLL_ORG_READ', 'PAYROLL_RUN'] },
        loadChildren: () => import('./features/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES)
      },
      {
        path: 'scheduling',
        data: { requiredAnyScope: ['SCHEDULE_SELF_READ', 'SCHEDULE_TEAM_READ', 'SCHEDULE_ORG_READ'] },
        loadChildren: () => import('./features/scheduling/scheduling.routes').then((m) => m.SCHEDULING_ROUTES)
      },
      {
        path: 'performance',
        data: { requiredAnyScope: ['USER_TEAM_READ', 'USER_ORG_READ'] },
        loadChildren: () => import('./features/performance/performance.routes').then((m) => m.PERFORMANCE_ROUTES)
      },
      {
        path: 'compliance',
        data: { requiredAnyScope: ['AUDIT_SELF_READ', 'AUDIT_TEAM_READ', 'AUDIT_ORG_READ', 'COMPLIANCE_RULES_WRITE'] },
        loadChildren: () => import('./features/compliance/compliance.routes').then((m) => m.COMPLIANCE_ROUTES)
      },
      {
        path: 'documents',
        data: { requiredAnyScope: ['DOCS_SELF_READ', 'DOCS_TEAM_READ', 'DOCS_WRITE'] },
        loadChildren: () => import('./features/documents/documents.routes').then((m) => m.DOCUMENTS_ROUTES)
      },
      {
        path: 'analytics',
        data: { requiredAnyScope: ['ANALYTICS_SELF_READ', 'ANALYTICS_TEAM_READ', 'ANALYTICS_ORG_READ'] },
        loadChildren: () => import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES)
      },
      {
        path: 'organization',
        data: { requiredAnyScope: ['ORG_READ', 'ORG_DEPT_WRITE', 'ORG_LOCATION_WRITE'] },
        loadChildren: () => import('./features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES)
      },
      {
        path: 'communication',
        data: { requiredAnyScope: ['CHAT_DM_WRITE', 'CHAT_CHANNEL_CREATE', 'CHAT_ANALYTICS_READ'] },
        loadChildren: () => import('./features/communication/communication.routes').then((m) => m.COMMUNICATION_ROUTES)
      },
      {
        path: 'roles',
        data: { requiredAnyScope: ['ROLE_SELF_READ', 'ROLE_ORG_READ', 'ROLE_CREATE', 'ROLE_WRITE', 'ROLE_ASSIGN'] },
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES)
      },
      {
        path: 'profile',
        loadChildren: () => import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES)
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'reports',
        data: { requiredAnyScope: ['ANALYTICS_SELF_READ', 'ANALYTICS_TEAM_READ', 'ANALYTICS_ORG_READ', 'ANALYTICS_EXPORT'] },
        loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES)
      },
      {
        path: 'helpdesk',
        loadChildren: () => import('./features/helpdesk/helpdesk.routes').then((m) => m.HELPDESK_ROUTES)
      },
      {
        path: 'announcements',
        loadChildren: () => import('./features/announcements/announcements.routes').then((m) => m.ANNOUNCEMENTS_ROUTES)
      },
      {
        path: 'team-calendar',
        data: { requiredAnyScope: ['SCHEDULE_TEAM_READ', 'SCHEDULE_ORG_READ', 'LEAVE_TEAM_APPROVE', 'LEAVE_ORG_APPROVE'] },
        loadChildren: () => import('./features/team-calendar/team-calendar.routes').then((m) => m.TEAM_CALENDAR_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () => import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES)
      },
      {
        path: 'tasks',
        data: { requiredAnyScope: ['TASKS_SELF_WRITE', 'TASKS_TEAM_WRITE', 'TASKS_ORG_WRITE'] },
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES)
      }
    ]
  },
  {
    path: 'sandbox',
    loadChildren: () => import('./features/sandbox/sandbox.routes').then(m => m.SANDBOX_ROUTES)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
