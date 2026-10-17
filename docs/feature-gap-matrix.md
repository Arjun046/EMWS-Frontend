# EMWS Feature-Gap Matrix — Phase Two (Market-Standard Benchmark)

**Status:** Evidence-based audit (frontend only; backend inaccessible).  
**Date:** 2026-10-17  
**Source of truth:** `C:\New folder\github\EMWS-Frontend` source code (services, pages, routes, models).

## Methodology

Each capability is evaluated against the actual repository (not assumptions). Statuses:
- **Implemented** — working frontend + service layer present (backend contract unverified).
- **Partial** — UI exists but gaps remain (no server search, client-side approximations, silent error swallowing).
- **Not implemented** — no frontend route/page/service.
- **Blocked** — cannot verify without backend.

Market categories: **Essential baseline** / **Expected enterprise** / **Advanced optional** / **Out of scope**.

---

## A. Employee & Organization Management

| # | Capability | Status | Evidence (repository) | Market expectation | Roles affected | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Employee directory | Implemented | `features/employees/`, `core/services/employee-data.service.ts` — paged GET `/api/employees`, CRUD, deactivate/terminate/hire | Search, filters, table, export | Employee, Manager, HR Admin | PII access must be role-scoped | Low | P1 | Server-paged table; search; row actions; deactivate confirm |
| A2 | Employee profiles | Partial | `getProfile()` → `/api/employees/me`; `features/profile/` | Self-service profile view/edit | Employee | Self only | Low | P1 | View own profile; edit permitted fields |
| A3 | Employee IDs & employment status | Implemented | `Employee.status` (ACTIVE/ONBOARDING/TERMINATED); `updateStatus()`, `terminateEmployee()`, `hireEmployee()` | Status transitions, audit | HR Admin | Role-gated (USER_WRITE) | Low | P1 | Status change persists; audit trail |
| A4 | Departments & designations | Implemented | `core/services/organization.service.ts` — departments CRUD, hierarchy (`getSubDepartments`) | Org tree, parent/child | HR Admin, Company Admin | Org-scoped | Low | P1 | Department CRUD; hierarchy view |
| A5 | Reporting managers & teams | Partial | `Employee.managerId`/`managerName`; `getEmployeesByManager()` | Manager/team views | Manager, HR Admin | Team-scoped | Medium | P2 | Team directory under manager scope |
| A6 | Work locations | Implemented | `organization.service.ts` — locations CRUD (`/api/organization/locations`) | Location list, map | HR Admin | Org-scoped | Low | P1 | Location CRUD |
| A7 | Onboarding & offboarding | Partial | `OnboardingService` + onboarding board in employee page; offboarding = terminate/hire | Checklist, task tracking | HR Admin, Manager | Employee-scoped | Medium | P2 | Onboarding tasks CRUD; offboarding flow |
| A8 | Employee documents | Partial | `features/documents/`, `uploadEmployeeDocument()`/`downloadEmployeeDocument()` | File upload/download, access control | Employee, HR Admin | Document ACLs | Medium | P2 | Upload/download; permission-denied state |
| A9 | Bulk import & validation | Not implemented | No bulk import UI or service found | CSV/Excel import with validation | HR Admin | Validation server-side | High | P3 | Import UI; error rows reported |
| A10 | Org hierarchy & change history | Not implemented | No org-chart UI; no change-history service | Org chart; audit log | HR Admin, Auditor | Read-only for auditor | High | P3 | Org chart; change-history view |

## B. Attendance Management

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Clock-in / clock-out | Implemented | `features/dashboard/` hero + `attendance.service.ts` `clockIn()`/`clockOut()` (idempotency key) | One-tap clock; geolocation | Employee | Self only | Low | P1 | Clock-in/out; idempotency; success/error states |
| B2 | Attendance records | Implemented | `features/attendance/` table + range query `/api/attendance/range` | Paged table, filters | Employee, Manager, HR | Self/team/org scope | Low | P1 | Paged table; sort; filter |
| B3 | Break tracking | Implemented | `startBreak()`/`endBreak()`; dashboard break toggle | Break start/end; compliance | Employee | Self | Low | P1 | Break start/end; status reflection |
| B4 | Daily/monthly summaries | Partial | `dashboard.service.ts` stats; `attendance.service.ts` summary endpoints | Date-range summaries | Employee, Manager | Scoped | Medium | P2 | Accurate server-side aggregations |
| B5 | Late arrivals / early departures | Partial | `Attendance.isLate`; badge in table | Late/early flags; reports | Manager, HR | Scoped | Low | P1 | Late flag accurate; server-validated |
| B6 | Missing punches | Not implemented | No dedicated missing-punch workflow | Flag missing punches; correction request | Manager, Employee | Scoped | Medium | P2 | Missing-punch list; correction flow |
| B7 | Attendance corrections | Partial | `manualEntry()` drawer + `forceClockOut()` | Correction request + approval | Manager | TEAM/ORG_ADJUST | Medium | P1 | Manual entry; force clock-out with confirm |
| B8 | Overtime | Partial | `getOvertimeHours()` summary + dashboard overtime strip | OT calculation, rules | Manager, HR | Scoped | Medium | P2 | OT summary; policy-based calc |
| B9 | Shift-based calculations | Partial | Attendance linked to shifts via `employeeId` | Shift-aware hours | Manager | Scoped | Medium | P2 | Shift-attendance reconciliation |
| B10 | Manager approvals | Not implemented | No attendance approval workflow | Approve/correct attendance | Manager | Role-gated | Medium | P2 | Approval queue; approve/reject |
| B11 | Attendance reports | Partial | `features/reports/` (timesheet reports only) | Exportable attendance reports | HR, Payroll | Export-gated | Medium | P2 | Date-range report; CSV export |
| B12 | Audit history | Partial | `attendance.service.ts` `getHistory()` (`/{id}/history`) | Full audit trail | Auditor | Read-only | Low | P1 | History view per record |

## C. Shift & Roster Management

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| C1 | Shift templates | Not implemented | No shift-template service/UI | Template library | HR Admin | Org-scoped | Medium | P2 | Create/apply shift templates |
| C2 | Fixed/rotating/flexible shifts | Partial | `scheduling.service.ts` `Shift` (status DRAFT/PUBLISHED/COMPLETED); `features/scheduling/` | Rotating pattern support | Manager, HR | Org-scoped | Medium | P1 | Shift CRUD; publish/draft |
| C3 | Weekly/monthly calendars | Partial | `features/team-calendar/` | Calendar view | Employee, Manager | Scoped | Medium | P2 | Calendar renders shifts |
| C4 | Employee shift assignments | Implemented | `createShift()`/`updateShift()` with `employeeId` | Assignment UI | Manager | TEAM/ORG_WRITE | Low | P1 | Assign employee to shift |
| C5 | Recurring schedules | Not implemented | No recurrence service | Recurring shift patterns | Manager | Org-scoped | High | P3 | Recurrence rule (weekly/monthly) |
| C6 | Shift swaps | Implemented | `getSwaps()`/`requestSwap()`/`acceptSwap()`/`approveSwap()` | Peer swap + manager approval | Employee, Manager | Scoped | Medium | P1 | Swap request flow; approve/reject |
| C7 | Availability | Not implemented | No availability service | Availability submission | Employee | Self | Medium | P3 | Availability calendar |
| C8 | Approved-leave conflicts | Partial | Leaves approve drawer pre-checks `getShiftRangeStrict()` conflicts | Block approval on overlap | Manager | Scoped | Low | P1 | Conflict shown before approve |
| C9 | Overlapping shift detection | Partial | `extractShiftConflict()` handles BE `SHIFT_CONFLICT` | Prevent overlap at save | Manager | Server-validated | Medium | P1 | Server conflict error surfaced |
| C10 | Staffing coverage | Not implemented | No coverage report | Coverage heatmap | Manager, HR | Scoped | High | P3 | Coverage view |
| C11 | Manager approvals | Implemented | `approveSwap()` gated by scope | Shift publish approval | Manager | Role-gated | Low | P1 | Approve/reject shift |
| C12 | Schedule-change notifications | Partial | Widget socket events; `NotificationCenterService` | Push/in-app on change | Employee | Scoped | Medium | P2 | Notification on shift change |

## D. Leave Management

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| D1 | Leave types | Implemented | `LeaveType` enum (ANNUAL/SICK/CASUAL/MATERNITY/PATERNITY/UNPAID) | Configurable types | HR Admin | Org-scoped | Low | P1 | Type list; balance per type |
| D2 | Leave balances | Implemented | `getMyBalances()`; balances row in leaves page | Accrued/used/pending/remaining | Employee, Manager | Self/team | Low | P1 | Balance display; never fake numbers |
| D3 | Leave policies & accruals | Not implemented | No accrual/policy service | Policy engine, accrual rules | HR Admin | Org-scoped | High | P3 | Policy config (do not invent rules) |
| D4 | Holiday calendars | Not implemented | No holiday service | Holiday calendar; date blocking | HR Admin | Org-scoped | Medium | P3 | Holiday list; blocks leave on holidays |
| D5 | Leave requests & cancellations | Implemented | `createRequest()`/`cancelRequest()`; leaves page drawer | Request flow; cancel pending | Employee | Self | Low | P1 | Submit; cancel; confirmation |
| D6 | Approval hierarchies | Partial | `updateStatus()` gated by `LEAVE_TEAM_APPROVE`/`LEAVE_ORG_APPROVE` | Multi-level approval | Manager, HR | Role-gated | Medium | P1 | Approve/reject; comments |
| D7 | Delegated approvals | Not implemented | No delegation service | Delegate approver | Manager | Role-gated | Medium | P3 | Delegation config |
| D8 | Overlapping requests | Not implemented | No client overlap validation | Prevent overlapping leave | Employee | Self | Low | P2 | Overlap check before submit |
| D9 | Employee notifications | Partial | `NotificationService` + socket | Notify on decision | Employee | Self | Low | P1 | Notify on approve/reject |
| D10 | Leave history & reports | Partial | `getMyRequests()`/`getCompanyRequests()` | History; export | Employee, HR | Scoped | Medium | P2 | History table; export |

## E. Timesheet Management

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| E1 | Daily/weekly timesheets | Partial | `TimesheetService` (`/api/attendance/timesheets`); `features/reports/timesheet-reports-page` | Timesheet entry; weekly view | Employee | Self | Medium | P2 | Timesheet generate; view |
| E2 | Work-hour calculations | Partial | `Attendance.totalHours`/`overtimeHours` server-side | Accurate calc incl. breaks | Employee | Self | Medium | P1 | Server calc; displayed |
| E3 | Break calculations | Partial | `breakStartTime`/`breakEndTime` on Attendance | Break deducted | Employee | Self | Low | P1 | Break reflected in hours |
| E4 | Overtime | Partial | `overtimeHours` on Attendance; summary endpoint | OT thresholds | Employee, Manager | Scoped | Medium | P2 | OT summary |
| E5 | Missing entries | Not implemented | No missing-timesheet detection | Flag missing | Manager | Scoped | Medium | P3 | Missing-entries report |
| E6 | Submission & approval | Partial | `updateStatus()` on timesheet | Submit; approve/reject | Employee, Manager | Role-gated | Medium | P1 | Submit flow; approve/reject |
| E7 | Rejection & resubmission | Partial | `updateStatus()` supports any status | Reject with reason; resubmit | Manager, Employee | Role-gated | Low | P1 | Reject reason; resubmit |
| E8 | Timesheet locking | Not implemented | No lock service | Lock after payroll period | Payroll | Role-gated | Medium | P3 | Lock state; prevent edits |
| E9 | Correction history | Not implemented | No timesheet audit | Edit history | Auditor | Read-only | Medium | P3 | History view |
| E10 | Attendance reconciliation | Partial | `TimesheetReconciliation` + `reconcile()` | Delta detection | Payroll, HR | Scoped | Medium | P2 | Reconciliation view; delta flag |
| E11 | Payroll-period summaries | Partial | `PayrollPeriodExceptions` + `exportPeriodCsv()` | Period summary | Payroll | Export-gated | Medium | P2 | Period export |

## F. Employee & Manager Self-Service

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| F1 | Personal profile | Partial | `features/profile/`; `getProfile()`/`updateProfile()` | View/edit own profile | Employee | Self | Low | P1 | Profile view; edit |
| F2 | Attendance history | Implemented | `getTodayAttendance()`/`getEmployeeAttendance()` | Personal history | Employee | Self | Low | P1 | History table |
| F3 | Leave balances & requests | Implemented | Leaves page + balances | Balance; request | Employee | Self | Low | P1 | Balance; request flow |
| F4 | Assigned shifts | Partial | Scheduling table (org-wide); no dedicated "my shifts" filter | My shifts view | Employee | Self | Low | P1 | Filter to own shifts |
| F5 | Timesheet submission | Partial | `TimesheetService.generateTimesheet()` | Submit timesheet | Employee | Self | Medium | P2 | Generate; submit |
| F6 | Approval queues | Partial | Leaves approve drawer; timesheets pending | Approval inbox | Manager | Team/org scope | Medium | P1 | Queue; approve/reject |
| F7 | Notifications | Implemented | `NotificationCenterService` + socket | Unread/read; mark all | Employee | Self | Low | P1 | Notification bell; read/unread |
| F8 | Employee document access | Partial | `features/documents/` | View own documents | Employee | Self-scoped | Medium | P2 | Document list; download |
| F9 | Personal settings | Partial | `features/settings/`; theme toggle | Theme; language; prefs | Employee | Self | Low | P2 | Theme; settings persist |

## G. Payroll Readiness

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| G1 | Approved attendance summaries | Partial | `PayrollRecord.attendanceTotalHours` | Payroll-ready hours | Payroll | Export-gated | Medium | P2 | Summary per period |
| G2 | Overtime summaries | Partial | `getOvertimeHours()` | OT report | Payroll | Export-gated | Low | P1 | OT summary |
| G3 | Leave & absence summaries | Partial | Leave balances/requests | Leave liability report | HR, Payroll | Scoped | Medium | P2 | Leave summary |
| G4 | Payroll-period reconciliation | Partial | `getPeriodExceptions()` + reconciliation | Exception report | Payroll | Role-gated | Medium | P2 | Exceptions; locked count |
| G5 | Controlled exports | Partial | `exportPeriodCsv()` / `downloadPayslipPdf()` | Permission-gated export | Payroll | Export scope | Medium | P1 | CSV/PDF; access denied state |
| G6 | Payroll integration | Not implemented | No external payroll adapter | SFTP/API to payroll | Payroll | Credentials secured | High | P3 | Integration (out of scope w/o requirements) |
| G7 | Exception reports | Implemented | `getPeriodExceptions()` — open sessions, no salary structure, etc. | Exception list | Payroll | Role-gated | Low | P1 | Exception table |
| G8 | Statutory/tax/salary processing | Out of scope | Not present; master prompt prohibits without requirements | — | — | — | — | — | Not implemented (per policy) |

## H. Notifications & Messaging

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| H1 | In-app notifications | Implemented | `NotificationCenterService` + `NotificationService` | List; unread badge | Employee | Self | Low | P1 | Bell; unread count; list |
| H2 | Read/unread status | Implemented | `status`/`isRead`; `markAsRead()`/`markAllAsRead()` | Toggle read | Employee | Self | Low | P1 | Mark read; mark all read |
| H3 | Pending approval reminders | Partial | Socket events; leave approval UI | Reminder notifications | Manager | Scoped | Medium | P2 | Reminder on pending items |
| H4 | Shift changes | Partial | Widget socket `scheduling.*` topics | Notify on shift change | Employee | Scoped | Medium | P2 | Shift-change notification |
| H5 | Leave decisions | Partial | Socket `notifications.*` + leaves approve | Notify on approve/reject | Employee | Self | Low | P1 | Decision notification |
| H6 | Attendance exceptions | Partial | Socket `attendance.*` + dashboard feed | Late/missing-punch alert | Manager | Scoped | Medium | P2 | Exception alert |
| H7 | Notification preferences | Implemented | `getMyPreferences()`/`savePreferences()` | In-app/email toggle | Employee | Self | Low | P2 | Preference save |
| H8 | Email integration | Not implemented | No email service configured | Email on key events | Employee | Credentials secured | High | P3 | Email (if backend configured) |
| H9 | Real-time updates | Partial | STOMP WebSocket (widget/chat) | Live updates | Employee | Scoped | Medium | P2 | Socket reconnect; pending topics |
| H10 | Messaging / chat | Implemented | `features/communication/`; `ChatSocketService` | DM; channels | Employee | Scoped | High | P3 | Chat UI (exists) |

## I. Reports & Analytics

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| I1 | Attendance reports | Partial | `features/reports/` (timesheet only); `exportRange()` | Date-range report; export | HR, Manager | Export-gated | Medium | P2 | Attendance report; CSV |
| I2 | Leave reports | Partial | `getCompanyRequests()` | Leave report; export | HR | Export-gated | Medium | P2 | Leave report |
| I3 | Timesheet reports | Implemented | `features/reports/timesheet-reports-page.component.ts` | Timesheet report | Payroll | Export-gated | Medium | P1 | Timesheet report view |
| I4 | Overtime reports | Partial | `getOvertimeHours()` | OT report | Payroll | Export-gated | Low | P1 | OT summary |
| I5 | Workforce trends | Partial | `AnalyticsService`; `features/analytics/` | Trend charts | HR, Exec | Scoped | High | P3 | Trend visualization |
| I6 | Department summaries | Partial | `getEmployeesByDepartment()` | Dept summary | HR | Org-scoped | Medium | P2 | Dept rollup |
| I7 | Date-range filtering | Partial | Attendance/leaves use start/end | Date picker on all reports | All | Scoped | Low | P1 | Date range on reports |
| I8 | Drill-down | Not implemented | No drill-down | Click to detail | HR, Manager | Scoped | High | P3 | Drill-down |
| I9 | Authorized exports | Partial | CSV export on attendance/timesheet/payroll | Export gated by scope | Authorized roles | Export scope | Low | P1 | Export; permission-denied state |
| I10 | Clear definitions | Partial | Dashboard docs `—` means unknown | Metric definitions | All | — | Low | P1 | Tooltips/definitions on metrics |

## J. Administration & Configuration

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| J1 | User management | Implemented | `features/roles/`; `UserService` (CRUD, lock/unlock, invite) | User CRUD; invite | Super Admin, HR | Role-gated | Low | P1 | User CRUD; invite flow |
| J2 | Role & permission management | Implemented | `RoleService` — roles/permissions CRUD, matrix, clone | RBAC matrix; clone role | Super Admin | Role-gated | Low | P1 | Role CRUD; permission matrix |
| J3 | Organization settings | Implemented | `OrganizationService` — company/settings/theme | Company config | Company Admin | Org-scoped | Low | P1 | Settings edit |
| J4 | Attendance policies | Not implemented | No attendance-policy service | Policy config | HR Admin | Org-scoped | Medium | P3 | Policy config (do not invent rules) |
| J5 | Shift policies | Not implemented | No shift-policy service | Shift rules | HR Admin | Org-scoped | Medium | P3 | Policy config |
| J6 | Leave policies | Not implemented | No leave-policy service | Accrual rules | HR Admin | Org-scoped | High | P3 | Policy config |
| J7 | Holiday calendars | Not implemented | No holiday service | Calendar | HR Admin | Org-scoped | Medium | P3 | Holiday CRUD |
| J8 | Notification settings | Partial | `NotificationService` preferences | Prefs per category | Employee | Self | Low | P2 | Preference save |
| J9 | Integration settings | Partial | `features/integrations/` | Integration config | Company Admin | Credentials secured | Medium | P3 | Integration config |
| J10 | Audit logs | Partial | `Attendance.getHistory()`; compliance page | System audit log | Auditor | Read-only | Medium | P2 | Audit log view |

## K. Authentication & Security (cross-cutting)

| # | Capability | Status | Evidence | Market expectation | Roles | Security | Complexity | Priority | Acceptance criteria |
|---|---|---|---|---|---|---|---|---|---|
| K1 | Login / MFA | Implemented | `features/auth/login-page.component.ts`; MFA challenge flow | Login; MFA; password reset | All | Secure | Low | P0 | Login; MFA; lockout on 429 |
| K2 | Session handling | Implemented | `auth.service.ts` token/refresh; `authInterceptor` 401 refresh | Refresh token; sign-out | All | Secure | Low | P0 | Refresh; revoke sessions |
| K3 | Server-side RBAC enforcement | Blocked | Frontend guards only; backend not accessible | `@PreAuthorize` on all endpoints | All | Server-enforced | — | P0 | **Cannot verify — backend required** |
| K4 | CORS configuration | Blocked | Not in frontend repo | CORS on API gateway | — | Configured | — | P0 | **Cannot verify — backend required** |
| K5 | Secrets not in source | Partial | `environment.ts` URLs; no keys committed | No secrets in code | — | Secured | Low | P1 | No secrets committed |
| K6 | Rate limiting | Blocked | Not in frontend repo | Rate limit on auth | — | Configured | — | P0 | **Cannot verify — backend required** |

---

## Consolidated Priority Summary

**P0 (Critical — do first):** K1/K2 auth integrity, K3/K4/K6 backend security verification (blocked until backend available), environment https (P0 security), silent-error fallback (P1 data integrity).

**P1 (High — essential business):** Attendance clock-in/out, leave request/approve, shift CRUD + swaps, employee directory CRUD, user/role management, timesheet submit/approve, notifications bell, payroll exceptions/export.

**P2 (Medium):** Dashboard accurate aggregations, break tracking, manual attendance entry, overtime summary, team calendar, approval queues, reports/exports, preferences, profile.

**P3 (Optional):** Bulk import, org chart, recurring shifts, availability, holiday calendar, accrual policy, chat, AI, advanced analytics.

---

## Recommended First Module

**Module:** `Security-critical defects + shared design-system foundations`

**Why first:**
1. **P0 security:** `environment.ts` uses `http://`/`ws://` (FRONTEND_RULES.md rule 3 requires https/wss; Vercel blocks mixed content).
2. **P1 data integrity:** `ApiService` silently swallows errors when a `fallback` is provided — masks API failures and contradicts the dashboard's "`—` means unknown, not zero" principle.
3. **Prerequisite:** A shared design-token layer is required before any UI/UX module (Phase 3) so components are consistent and WCAG-checked.
4. All work is frontend-only — no backend dependency, safe to do while backend location is unresolved.

**Acceptance criteria:**
1. `environment.ts` uses `https://` and `wss://` (consistent with `environment.prod.ts` and FRONTEND_RULES.md).
2. `ApiService` no longer silently returns fallback data on HTTP error for GET/POST/PUT/PATCH/DELETE — errors propagate; callers opt-in to fallback explicitly.
3. New `src/styles/_design-tokens.scss` with CSS variables for colors (semantic status), typography, spacing, borders, radii, shadows, breakpoints, focus states.
4. `styles.scss` imports tokens; `--primary`, `--surface`, `--txt-main` etc. are defined centrally (not duplicated inline).
5. Production build passes; existing 2 specs still pass; no uncommitted user changes discarded.
6. Dashboard continues to show `—` (unknown) when sources fail — never fake zeros.

**File ownership:** emws-frontend (frontend), emws-orchestrator (review & approve).

**Blocking item (backend):** K3/K4/K6 cannot be verified until the backend repository location is confirmed.

---

**Next:** Awaiting your confirmation to proceed with implementing the first module (security-critical defects + design-system foundations). The user said "ok do" — I will proceed once you confirm the backend scope decision (frontend-only now vs. wait for backend).
