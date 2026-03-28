import { Injectable } from '@angular/core';
import { combineLatest, map, Observable, of } from 'rxjs';
import { WorkspaceConfig } from '../../shared/models/ui.models';
import { WORKSPACE_CONFIGS, WorkspaceKey } from '../../shared/utils/workspace-config';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class WorkspaceDataService {
  constructor(private readonly api: ApiService) {}

  loadWorkspace(key: WorkspaceKey): Observable<WorkspaceConfig> {
    switch (key) {
      case 'employees':
        return this.api.get<any[]>('/api/employees', []).pipe(
          map((employees) => {
            const base = WORKSPACE_CONFIGS.employees;
            if (!employees.length) {
              return base;
            }

            const active = employees.filter((employee) => employee.status === 'ACTIVE').length;
            return {
              ...base,
              stats: [
                { label: 'Headcount', value: String(employees.length), delta: `${active} active`, tone: 'good' },
                { label: 'Managers', value: String(employees.filter((employee) => employee.manager).length), delta: 'Live directory', tone: 'accent' },
                { label: 'Onboarding', value: String(employees.filter((employee) => employee.status === 'ONBOARDING').length), delta: 'Requires follow-up', tone: 'warn' }
              ],
              rows: employees.slice(0, 12).map((employee) => ({
                name: `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
                department: employee.department ?? 'Unassigned',
                manager: employee.manager ? `${employee.manager.firstName ?? ''} ${employee.manager.lastName ?? ''}`.trim() : 'None',
                status: employee.status ?? 'ACTIVE'
              }))
            };
          })
        );

      case 'attendance': {
        const { start, end } = this.currentRange();
        return combineLatest([
          this.api.get<number>('/api/attendance/summary/clocked-in', 0),
          this.api.get<number>(`/api/attendance/summary/break-violations?start=${start}&end=${end}`, 0),
          this.api.get<any[]>(`/api/attendance/range?start=${start}&end=${end}`, [])
        ]).pipe(
          map(([clockedIn, violations, attendance]) => {
            const base = WORKSPACE_CONFIGS.attendance;
            const rows = attendance.slice(0, 12).map((entry) => ({
              employee: `Employee ${entry.employeeId ?? 'N/A'}`,
              shift: entry.locationId ? `Location ${entry.locationId}` : 'General',
              clockedIn: entry.clockIn ? new Date(entry.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
              status: entry.clockOut ? 'CLOCKED_OUT' : (entry.breakStartTime && !entry.breakEndTime ? 'ON_BREAK' : 'CLOCKED_IN')
            }));

            return {
              ...base,
              stats: [
                { label: 'Clocked In', value: String(clockedIn), delta: 'Live count', tone: 'good' },
                { label: 'Break Violations', value: String(violations), delta: 'Current range', tone: 'warn' },
                { label: 'Tracked Events', value: String(attendance.length), delta: 'Loaded from API', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );
      }

      case 'leaves':
        return combineLatest([
          this.api.get<any[]>('/api/leaves/status/PENDING', []),
          this.api.get<any[]>('/api/leaves/status/APPROVED', [])
        ]).pipe(
          map(([pending, approved]) => {
            const base = WORKSPACE_CONFIGS.leaves;
            const rows = [...pending, ...approved].slice(0, 12).map((request) => ({
              employee: `Employee ${request.employeeId ?? 'N/A'}`,
              type: request.leaveType ?? 'Leave',
              dates: `${request.startDate ?? '—'} - ${request.endDate ?? '—'}`,
              status: request.status ?? 'PENDING'
            }));

            return {
              ...base,
              stats: [
                { label: 'Pending Requests', value: String(pending.length), delta: 'Approval queue', tone: 'warn' },
                { label: 'Approved Requests', value: String(approved.length), delta: 'From service', tone: 'good' },
                { label: 'Visible Requests', value: String(rows.length), delta: 'Loaded rows', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'payroll':
        return combineLatest([
          this.api.get<any[]>('/api/payroll/records/1', []),
          this.api.get<any[]>('/api/payroll/pending', [])
        ]).pipe(
          map(([records, pending]) => {
            const base = WORKSPACE_CONFIGS.payroll;
            const rows = records.slice(0, 12).map((record: any) => ({
              cycle: `${record.payPeriodStart ?? 'Current'} - ${record.payPeriodEnd ?? 'Cycle'}`,
              team: record.dataSource ?? 'SNAPSHOT',
              amount: `$${Number(record.netPay ?? record.grossPay ?? 0).toFixed(2)}`,
              status: record.status ?? 'READY'
            }));

            const net = records.reduce((sum: number, record: any) => sum + Number(record.netPay ?? 0), 0);

            return {
              ...base,
              stats: [
                { label: 'Net Payroll', value: `$${Number(net || 0).toFixed(2)}`, delta: 'Processed records', tone: 'default' },
                { label: 'Records Loaded', value: String(records.length), delta: 'Payroll API', tone: 'accent' },
                { label: 'Pending Runs', value: String(pending.length), delta: 'Current cycle', tone: 'warn' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'scheduling':
        return this.api.get<any[]>('/api/shifts', []).pipe(
          map((shifts) => {
            const base = WORKSPACE_CONFIGS.scheduling;
            const rows = shifts.slice(0, 12).map((shift) => ({
              team: shift.departmentId ? `Department ${shift.departmentId}` : 'General',
              slot: `${shift.startTime ?? '—'} - ${shift.endTime ?? '—'}`,
              assignee: shift.employeeId ? `Employee ${shift.employeeId}` : 'Open Shift',
              status: shift.status ?? 'OPEN'
            }));

            return {
              ...base,
              stats: [
                { label: 'Visible Shifts', value: String(shifts.length), delta: 'Scheduling API', tone: 'good' },
                { label: 'Open Shifts', value: String(rows.filter((row) => row.assignee === 'Open Shift').length), delta: 'Unassigned', tone: 'warn' },
                { label: 'At Risk', value: String(rows.filter((row) => String(row.status).includes('RISK')).length), delta: 'Needs review', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'performance':
        return this.api.get<any[]>('/api/performance-reviews', []).pipe(
          map((reviews) => {
            const base = WORKSPACE_CONFIGS.performance;
            const rows = reviews.slice(0, 12).map((review) => ({
              employee: `Employee ${review.employeeId ?? 'N/A'}`,
              reviewer: review.reviewerName ?? 'Manager',
              period: review.reviewPeriod ?? 'Current',
              status: review.status ?? 'IN_PROGRESS'
            }));

            return {
              ...base,
              stats: [
                { label: 'Review Items', value: String(reviews.length), delta: 'Performance API', tone: 'good' },
                { label: 'Needs Input', value: String(rows.filter((row) => String(row.status).includes('NEEDS')).length), delta: 'Pending action', tone: 'warn' },
                { label: 'Ready', value: String(rows.filter((row) => String(row.status).includes('READY')).length), delta: 'Completion flow', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'compliance':
        return this.api.get<any[]>('/api/audit-trails/all', []).pipe(
          map((audits) => {
            const base = WORKSPACE_CONFIGS.compliance;
            const rows = audits.slice(0, 12).map((audit) => ({
              requirement: audit.entityName ?? audit.actionType ?? 'Audit event',
              owner: audit.performedBy ?? audit.username ?? 'System',
              dueDate: audit.performedAt ?? audit.createdAt ?? new Date().toISOString(),
              status: audit.severity ?? 'TRACKED'
            }));

            return {
              ...base,
              stats: [
                { label: 'Audit Events', value: String(audits.length), delta: 'Compliance log', tone: 'accent' },
                { label: 'Critical', value: String(rows.filter((row) => String(row.status).toUpperCase().includes('CRIT')).length), delta: 'Requires action', tone: 'warn' },
                { label: 'Tracked', value: String(rows.length), delta: 'Visible rows', tone: 'good' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'documents':
        return this.api.get<any[]>('/api/documents', []).pipe(
          map((documents) => {
            const base = WORKSPACE_CONFIGS.documents;
            const rows = documents.slice(0, 12).map((document) => ({
              document: document.fileName ?? document.documentName ?? 'Document',
              owner: document.employeeId ? `Employee ${document.employeeId}` : (document.createdBy ?? 'System'),
              updated: document.updatedAt ?? document.createdAt ?? new Date().toISOString(),
              status: document.status ?? 'PUBLISHED'
            }));

            return {
              ...base,
              stats: [
                { label: 'Documents Stored', value: String(documents.length), delta: 'Document API', tone: 'default' },
                { label: 'Pending Signature', value: String(rows.filter((row) => String(row.status).includes('PENDING')).length), delta: 'Signature queue', tone: 'warn' },
                { label: 'Indexed', value: documents.length ? '100%' : '0%', delta: 'Metadata available', tone: 'good' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'analytics':
        return combineLatest([
          this.api.get<any>('/api/analytics/dashboard/admin', null),
          this.api.get<any[]>('/api/reports', [])
        ]).pipe(
          map(([dashboard, reports]) => {
            const base = WORKSPACE_CONFIGS.analytics;
            const rows = reports.slice(0, 12).map((report) => ({
              metric: report.reportName ?? report.name ?? 'Report',
              current: report.status ?? 'READY',
              previous: report.format ?? 'PDF',
              status: report.frequency ?? 'TRACKED'
            }));

            return {
              ...base,
              stats: [
                { label: 'Total Employees', value: String(dashboard?.totalEmployees ?? base.stats[0].value), delta: 'Admin dashboard', tone: 'good' },
                { label: 'Currently Clocked In', value: String(dashboard?.currentlyClockedIn ?? 0), delta: 'Live API', tone: 'accent' },
                { label: 'Pending Leave Requests', value: String(dashboard?.pendingLeaveRequests ?? 0), delta: 'Cross-module', tone: 'warn' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'organization':
        return this.api.get<any[]>('/api/organization/companies', []).pipe(
          map((companies) => {
            const base = WORKSPACE_CONFIGS.organization;
            const rows = companies.slice(0, 12).map((company) => ({
              entity: company.name ?? 'Company',
              type: 'Company',
              owner: company.contactEmail ?? 'Corporate Ops',
              status: company.status ?? 'ACTIVE'
            }));

            return {
              ...base,
              stats: [
                { label: 'Companies', value: String(companies.length), delta: 'Organization API', tone: 'default' },
                { label: 'Active', value: String(rows.filter((row) => row.status === 'ACTIVE').length), delta: 'Live entities', tone: 'good' },
                { label: 'Needs Review', value: String(rows.filter((row) => row.status !== 'ACTIVE').length), delta: 'Org changes', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      case 'tasks':
        return this.api.get<any[]>('/api/tasks', []).pipe(
          map((tasks) => {
            const base = WORKSPACE_CONFIGS.tasks;
            const rows = tasks.slice(0, 12).map((task) => ({
              task: task.title ?? task.taskName ?? 'Task',
              assignee: task.assigneeName ?? `Employee ${task.employeeId ?? 'N/A'}`,
              dueDate: task.dueDate ?? new Date().toISOString(),
              status: task.status ?? 'READY'
            }));

            return {
              ...base,
              stats: [
                { label: 'Open Tasks', value: String(tasks.length), delta: 'Task API', tone: 'good' },
                { label: 'Overdue', value: String(rows.filter((row) => String(row.status).includes('OVERDUE')).length), delta: 'Needs attention', tone: 'warn' },
                { label: 'Blocked', value: String(rows.filter((row) => String(row.status).includes('BLOCK')).length), delta: 'Cross-team', tone: 'accent' }
              ],
              rows: rows.length ? rows : base.rows
            };
          })
        );

      default:
        return of(WORKSPACE_CONFIGS[key as WorkspaceKey] as WorkspaceConfig);
    }
  }

  private currentRange(): { start: string; end: string } {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 7);
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
