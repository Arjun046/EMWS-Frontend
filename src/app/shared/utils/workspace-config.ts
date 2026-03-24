import { WorkspaceConfig } from '../models/ui.models';

export type WorkspaceKey =
  | 'employees'
  | 'attendance'
  | 'leaves'
  | 'payroll'
  | 'scheduling'
  | 'performance'
  | 'compliance'
  | 'documents'
  | 'analytics'
  | 'organization'
  | 'tasks';

export const WORKSPACE_CONFIGS: Record<WorkspaceKey, WorkspaceConfig> = {
  employees: {
    title: 'Employee Operations',
    subtitle: 'Control workforce records, onboarding flow, and manager visibility from a single surface.',
    accent: 'linear-gradient(135deg, #1e3a8a, #0284c7)',
    filters: [
      { label: 'All Departments', value: 'all' },
      { label: 'Engineering', value: 'engineering' },
      { label: 'Operations', value: 'operations' },
      { label: 'Managers', value: 'manager' }
    ],
    stats: [
      { label: 'Headcount', value: '1,248', delta: '+32 this month', tone: 'good' },
      { label: 'Open Onboarding', value: '18', delta: '4 high priority', tone: 'accent' },
      { label: 'Attrition Risk', value: '3.1%', delta: '-0.8%', tone: 'good' }
    ],
    columns: [
      { key: 'name', label: 'Employee' },
      { key: 'department', label: 'Department' },
      { key: 'manager', label: 'Manager' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { name: 'Aarav Singh', department: 'Operations', manager: 'Priya Shah', status: 'ACTIVE' },
      { name: 'Maya Wilson', department: 'Engineering', manager: 'Liam Kelly', status: 'ONBOARDING' },
      { name: 'Noah Patel', department: 'Support', manager: 'Sara Khan', status: 'ACTIVE' }
    ],
    spotlight: [
      { title: 'Manager Span', body: 'Operations leads are managing 11.4 reports on average.', tag: 'Org Health' },
      { title: 'New Joiner Risk', body: 'Two employees are overdue on identity verification tasks.', tag: 'Onboarding' }
    ],
    timeline: [
      { title: 'Bulk import completed', detail: '24 employee profiles synced from HRIS', time: '09:10', tone: 'good' },
      { title: 'Profile update required', detail: 'Emergency contact missing for 6 people', time: '11:45', tone: 'warn' }
    ]
  },
  attendance: {
    title: 'Attendance Control',
    subtitle: 'Track clock activity, violations, live exceptions, and daily coverage gaps.',
    accent: 'linear-gradient(135deg, #0f766e, #22c55e)',
    filters: [
      { label: 'Today', value: 'today' },
      { label: 'Late Arrivals', value: 'late' },
      { label: 'Break Violations', value: 'violations' }
    ],
    stats: [
      { label: 'Clocked In', value: '824', delta: '89% coverage', tone: 'good' },
      { label: 'Late Arrivals', value: '27', delta: '+5 vs yesterday', tone: 'warn' },
      { label: 'Live Alerts', value: '9', delta: 'Requires review', tone: 'accent' }
    ],
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'shift', label: 'Shift' },
      { key: 'clockedIn', label: 'Clock In' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { employee: 'Aarav Singh', shift: 'Morning', clockedIn: '08:56', status: 'ON_TIME' },
      { employee: 'Maya Wilson', shift: 'Flex', clockedIn: '09:12', status: 'LATE' },
      { employee: 'Noah Patel', shift: 'Evening', clockedIn: '13:01', status: 'CLOCKED_IN' }
    ],
    spotlight: [
      { title: 'Live Widget Ready', body: 'Attendance events from RabbitMQ feed the dashboard widget topic.', tag: 'Realtime' },
      { title: 'Policy Focus', body: 'Break compliance is strongest in support, weakest in warehouse.', tag: 'Insight' }
    ],
    timeline: [
      { title: 'Clock-out pushed', detail: 'Attendance widget updated for employee ID 1', time: '13:40', tone: 'good' },
      { title: 'Break violation', detail: 'Ops floor exceeded threshold by 12 minutes', time: '14:05', tone: 'warn' }
    ]
  },
  leaves: {
    title: 'Leave Management',
    subtitle: 'Balance approvals, escalations, and leave liabilities without losing visibility.',
    accent: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    filters: [
      { label: 'Pending Approval', value: 'pending' },
      { label: 'Approved', value: 'approved' },
      { label: 'This Quarter', value: 'quarter' }
    ],
    stats: [
      { label: 'Pending Requests', value: '16', delta: '5 urgent', tone: 'warn' },
      { label: 'Approved Today', value: '9', delta: 'SLA on track', tone: 'good' },
      { label: 'Liability Forecast', value: '$42K', delta: '+4.3%', tone: 'accent' }
    ],
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'type', label: 'Type' },
      { key: 'dates', label: 'Dates' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { employee: 'Kiara Bose', type: 'Annual', dates: 'Mar 18 - Mar 20', status: 'PENDING' },
      { employee: 'Luca Green', type: 'Sick', dates: 'Mar 16', status: 'APPROVED' },
      { employee: 'Anika Roy', type: 'Parental', dates: 'Apr 02 - Jul 02', status: 'REVIEW' }
    ],
    spotlight: [
      { title: 'Coverage Watch', body: 'Warehouse leave overlap exceeds the team coverage threshold next week.', tag: 'Coverage' },
      { title: 'Escalation Ready', body: 'Three requests are past manager approval SLA.', tag: 'Approvals' }
    ],
    timeline: [
      { title: 'Leave status changed', detail: 'Scheduling and widget feeds updated', time: '10:18', tone: 'good' },
      { title: 'Conflict detected', detail: 'Two supervisors requested the same date block', time: '12:02', tone: 'accent' }
    ]
  },
  payroll: {
    title: 'Payroll Hub',
    subtitle: 'Review payroll cycles, payouts, exceptions, and payslip publishing readiness.',
    accent: 'linear-gradient(135deg, #111827, #1d4ed8)',
    filters: [
      { label: 'Current Cycle', value: 'current' },
      { label: 'Exceptions', value: 'exceptions' },
      { label: 'Published', value: 'published' }
    ],
    stats: [
      { label: 'Net Payroll', value: '$684K', delta: '+2.2%', tone: 'default' },
      { label: 'Exceptions', value: '12', delta: 'Need review', tone: 'warn' },
      { label: 'Payslips Ready', value: '97%', delta: '24 remaining', tone: 'good' }
    ],
    columns: [
      { key: 'cycle', label: 'Cycle' },
      { key: 'team', label: 'Team' },
      { key: 'amount', label: 'Amount', type: 'currency' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { cycle: 'Mar 2026 / Week 3', team: 'Operations', amount: '$184,320', status: 'READY' },
      { cycle: 'Mar 2026 / Week 3', team: 'Engineering', amount: '$242,180', status: 'REVIEW' },
      { cycle: 'Mar 2026 / Week 3', team: 'Support', amount: '$96,510', status: 'PUBLISHED' }
    ],
    spotlight: [
      { title: 'Variance Watch', body: 'Overtime uplift is concentrated in field operations.', tag: 'Finance' },
      { title: 'Approval Trail', body: 'Payroll cycle approval is missing one regional signoff.', tag: 'Governance' }
    ],
    timeline: [
      { title: 'Payslips published', detail: 'Support team payslips sent to document center', time: '09:55', tone: 'good' },
      { title: 'Exception opened', detail: 'Missing bank details for two new hires', time: '11:25', tone: 'warn' }
    ]
  },
  scheduling: {
    title: 'Scheduling Studio',
    subtitle: 'Shape weekly coverage with shift maps, conflict alerts, and staffing pressure indicators.',
    accent: 'linear-gradient(135deg, #f97316, #ef4444)',
    filters: [
      { label: 'Week View', value: 'week' },
      { label: 'Coverage Gaps', value: 'gaps' },
      { label: 'Open Shifts', value: 'open' }
    ],
    stats: [
      { label: 'Coverage Score', value: '92%', delta: '+3%', tone: 'good' },
      { label: 'Open Shifts', value: '14', delta: '5 urgent', tone: 'warn' },
      { label: 'Overtime Risk', value: '8', delta: 'Managers alerted', tone: 'accent' }
    ],
    columns: [
      { key: 'team', label: 'Team' },
      { key: 'slot', label: 'Slot' },
      { key: 'assignee', label: 'Assigned' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { team: 'Warehouse', slot: 'Mon 06:00 - 14:00', assignee: 'Nina George', status: 'ASSIGNED' },
      { team: 'Support', slot: 'Tue 14:00 - 22:00', assignee: 'Open Shift', status: 'OPEN' },
      { team: 'Field Ops', slot: 'Wed 08:00 - 18:00', assignee: 'Jordan Cole', status: 'AT_RISK' }
    ],
    spotlight: [
      { title: 'Realtime Feed', body: 'Shift widget topic updates are routed through the gateway socket.', tag: 'Live Ops' },
      { title: 'Fatigue Monitor', body: 'Three staff members approach weekly hour thresholds.', tag: 'Compliance' }
    ],
    timeline: [
      { title: 'Shift update', detail: 'New assignment published to scheduling widget feed', time: '08:44', tone: 'good' },
      { title: 'Gap created', detail: 'Night shift vacancy detected after leave approval', time: '13:08', tone: 'warn' }
    ]
  },
  performance: {
    title: 'Performance Reviews',
    subtitle: 'Coordinate review cycles, goals, and coaching actions with operational context.',
    accent: 'linear-gradient(135deg, #2563eb, #8b5cf6)',
    filters: [
      { label: 'Current Quarter', value: 'quarter' },
      { label: 'Needs Feedback', value: 'feedback' },
      { label: 'Goal Tracking', value: 'goals' }
    ],
    stats: [
      { label: 'Review Completion', value: '74%', delta: '+12%', tone: 'good' },
      { label: 'Coaching Plans', value: '21', delta: '6 overdue', tone: 'warn' },
      { label: 'Top Performers', value: '48', delta: 'Up from 43', tone: 'accent' }
    ],
    columns: [
      { key: 'employee', label: 'Employee' },
      { key: 'reviewer', label: 'Reviewer' },
      { key: 'period', label: 'Period' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { employee: 'Maya Wilson', reviewer: 'Liam Kelly', period: 'Q1 2026', status: 'IN_PROGRESS' },
      { employee: 'Aarav Singh', reviewer: 'Priya Shah', period: 'Q1 2026', status: 'READY' },
      { employee: 'Kiara Bose', reviewer: 'Mason Lee', period: 'Q1 2026', status: 'NEEDS_INPUT' }
    ],
    spotlight: [
      { title: 'Goal Alignment', body: 'Team objectives map cleanly to operational scorecards.', tag: 'Strategy' },
      { title: 'Coach Queue', body: 'Frontline supervisors need follow-up on conduct feedback.', tag: 'Manager Action' }
    ],
    timeline: [
      { title: 'Review signed off', detail: 'Operations cycle approved by regional manager', time: '10:33', tone: 'good' },
      { title: 'Calibration note', detail: 'Engineering ratings need moderation', time: '15:05', tone: 'accent' }
    ]
  },
  compliance: {
    title: 'Compliance Desk',
    subtitle: 'Monitor certifications, policy acknowledgements, and audit exceptions across the workforce.',
    accent: 'linear-gradient(135deg, #dc2626, #f59e0b)',
    filters: [
      { label: 'Expiring Soon', value: 'expiring' },
      { label: 'Policies', value: 'policies' },
      { label: 'Audits', value: 'audits' }
    ],
    stats: [
      { label: 'Expiring Certifications', value: '34', delta: 'Next 30 days', tone: 'warn' },
      { label: 'Policy Acceptance', value: '96%', delta: 'Strong compliance', tone: 'good' },
      { label: 'Audit Findings', value: '7', delta: '2 critical', tone: 'accent' }
    ],
    columns: [
      { key: 'requirement', label: 'Requirement' },
      { key: 'owner', label: 'Owner' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { requirement: 'Forklift Certification', owner: 'Riya Jain', dueDate: '2026-03-22', status: 'EXPIRING' },
      { requirement: 'Code of Conduct', owner: 'All Staff', dueDate: '2026-03-31', status: 'TRACKED' },
      { requirement: 'Payroll Audit', owner: 'Finance Ops', dueDate: '2026-03-20', status: 'CRITICAL' }
    ],
    spotlight: [
      { title: 'Audit Trail', body: 'Compliance actions are ready for downstream document linking.', tag: 'Control' },
      { title: 'Policy Drift', body: 'Field teams lag behind headquarters on annual acknowledgements.', tag: 'Risk' }
    ],
    timeline: [
      { title: 'Certification renewed', detail: 'Warehouse operator renewed safety clearance', time: '08:20', tone: 'good' },
      { title: 'Audit issue raised', detail: 'Missing approval evidence for overtime exception', time: '13:54', tone: 'warn' }
    ]
  },
  documents: {
    title: 'Document Center',
    subtitle: 'Organize workforce documents, acknowledgements, and signed artifacts in one secure workspace.',
    accent: 'linear-gradient(135deg, #0f172a, #14b8a6)',
    filters: [
      { label: 'Pending Signature', value: 'signature' },
      { label: 'Recent Uploads', value: 'uploads' },
      { label: 'Expiring', value: 'expiring' }
    ],
    stats: [
      { label: 'Documents Stored', value: '18.4K', delta: '+220 this week', tone: 'default' },
      { label: 'Pending Signature', value: '13', delta: '4 urgent', tone: 'warn' },
      { label: 'Indexed', value: '99.2%', delta: 'Healthy', tone: 'good' }
    ],
    columns: [
      { key: 'document', label: 'Document' },
      { key: 'owner', label: 'Owner' },
      { key: 'updated', label: 'Updated', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { document: 'Employment Contract', owner: 'Maya Wilson', updated: '2026-03-15', status: 'SIGNED' },
      { document: 'Policy Acknowledgement', owner: 'Noah Patel', updated: '2026-03-14', status: 'PENDING' },
      { document: 'Payslip Batch', owner: 'Finance Ops', updated: '2026-03-16', status: 'PUBLISHED' }
    ],
    spotlight: [
      { title: 'Cross-link Ready', body: 'Document metadata is aligned with payroll and compliance workflows.', tag: 'Platform' },
      { title: 'Signature Backlog', body: 'New hire packets need same-day reminders.', tag: 'Action' }
    ],
    timeline: [
      { title: 'Batch exported', detail: 'Payroll archive delivered to document center', time: '09:40', tone: 'good' },
      { title: 'Signature reminder', detail: 'Three contracts nudged automatically', time: '16:15', tone: 'accent' }
    ]
  },
  analytics: {
    title: 'Workforce Analytics',
    subtitle: 'Blend operational, labor, and engagement signals into a single decision surface.',
    accent: 'linear-gradient(135deg, #1d4ed8, #06b6d4)',
    filters: [
      { label: 'Executive View', value: 'executive' },
      { label: 'Labor Costs', value: 'labor' },
      { label: 'Productivity', value: 'productivity' }
    ],
    stats: [
      { label: 'Labor Cost / Hr', value: '$26.18', delta: '-1.4%', tone: 'good' },
      { label: 'Absence Trend', value: '2.6%', delta: '+0.3%', tone: 'warn' },
      { label: 'Forecast Confidence', value: '91%', delta: 'Strong signal', tone: 'accent' }
    ],
    columns: [
      { key: 'metric', label: 'Metric' },
      { key: 'current', label: 'Current' },
      { key: 'previous', label: 'Previous' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { metric: 'Attendance Adherence', current: '89%', previous: '86%', status: 'UP' },
      { metric: 'Labor Spend', current: '$684K', previous: '$669K', status: 'WATCH' },
      { metric: 'Leave Liability', current: '$42K', previous: '$39K', status: 'RISING' }
    ],
    spotlight: [
      { title: 'Realtime Topics Indexed', body: 'Analytics metadata is aligned to widget topics and operational events.', tag: 'Data Plane' },
      { title: 'Export Ready', body: 'Report filters are structured for future CSV and PDF output.', tag: 'Reporting' }
    ],
    timeline: [
      { title: 'Trend recalculated', detail: 'Headcount and absence models refreshed', time: '07:50', tone: 'good' },
      { title: 'Forecast drift', detail: 'Leave demand rose above expected range', time: '14:42', tone: 'warn' }
    ]
  },
  organization: {
    title: 'Organization Structure',
    subtitle: 'Visualize companies, locations, and departments behind the workforce operating model.',
    accent: 'linear-gradient(135deg, #0891b2, #0f766e)',
    filters: [
      { label: 'All Entities', value: 'all' },
      { label: 'Locations', value: 'locations' },
      { label: 'Departments', value: 'departments' }
    ],
    stats: [
      { label: 'Companies', value: '4', delta: 'Multi-entity', tone: 'default' },
      { label: 'Locations', value: '27', delta: '+2 planned', tone: 'accent' },
      { label: 'Departments', value: '58', delta: 'Stable design', tone: 'good' }
    ],
    columns: [
      { key: 'entity', label: 'Entity' },
      { key: 'type', label: 'Type' },
      { key: 'owner', label: 'Owner' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { entity: 'EWMS India Pvt Ltd', type: 'Company', owner: 'Corporate Ops', status: 'ACTIVE' },
      { entity: 'Bangalore HQ', type: 'Location', owner: 'Priya Shah', status: 'ACTIVE' },
      { entity: 'Warehouse Ops', type: 'Department', owner: 'Nina George', status: 'EXPANDING' }
    ],
    spotlight: [
      { title: 'Config Alignment', body: 'Organization data is prepared for downstream employee validation calls.', tag: 'Platform' },
      { title: 'Hierarchy Change', body: 'A new regional layer is under review before rollout.', tag: 'Planning' }
    ],
    timeline: [
      { title: 'Department added', detail: 'Field services unit drafted for approval', time: '10:02', tone: 'accent' },
      { title: 'Location synced', detail: 'Remote hub imported from org service', time: '12:12', tone: 'good' }
    ]
  },
  tasks: {
    title: 'Task Orchestration',
    subtitle: 'Coordinate operational tasks, due dates, ownership, and completion signals across teams.',
    accent: 'linear-gradient(135deg, #334155, #8b5cf6)',
    filters: [
      { label: 'My Queue', value: 'mine' },
      { label: 'Overdue', value: 'overdue' },
      { label: 'Automation Ready', value: 'automation' }
    ],
    stats: [
      { label: 'Open Tasks', value: '184', delta: '-12 today', tone: 'good' },
      { label: 'Overdue', value: '21', delta: 'Needs attention', tone: 'warn' },
      { label: 'Blocked', value: '8', delta: 'Cross-team', tone: 'accent' }
    ],
    columns: [
      { key: 'task', label: 'Task' },
      { key: 'assignee', label: 'Assignee' },
      { key: 'dueDate', label: 'Due Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' }
    ],
    rows: [
      { task: 'Verify ID documents', assignee: 'People Ops', dueDate: '2026-03-18', status: 'IN_PROGRESS' },
      { task: 'Approve shift swap', assignee: 'Ops Lead', dueDate: '2026-03-16', status: 'OVERDUE' },
      { task: 'Publish payroll audit pack', assignee: 'Finance Ops', dueDate: '2026-03-20', status: 'READY' }
    ],
    spotlight: [
      { title: 'Kanban Ready', body: 'Cards are structured for board and list views without reworking the model.', tag: 'Workflow' },
      { title: 'Task Links', body: 'Onboarding and compliance tasks can share a common UI pattern.', tag: 'Reuse' }
    ],
    timeline: [
      { title: 'Task completed', detail: 'Payroll audit pack moved to document center', time: '09:22', tone: 'good' },
      { title: 'Task blocked', detail: 'Missing manager approval for shift swap', time: '14:16', tone: 'warn' }
    ]
  }
};
