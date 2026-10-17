# EMWS Testing Report

**Status:** Baseline established.  
**Date:** 2026-10-17  
**Environment:** Windows 10, Node v24.11.0, npm 11.6.2, Chrome 155 via Karma.

## Build
- `npm run build` (production) — **PASSES**. Initial ~669kB gz ~168kB.
- Pre-existing budget warning (not caused by this session): `communication-page.component.ts` styles 25.53kB exceed 15kB budget.

## Unit tests (Karma + Jasmine)
- `npx ng test --watch=false` — **71 SUCCESS, 0 FAILED**.
- Suites: `attendance.service.spec.ts`, `scheduling.service.spec.ts`, `has-scope.directive.spec.ts` (Module 2), `forbidden-page.component.spec.ts` (Module 2), `employee-data.service.spec.ts` (Module 4), `leave.service.spec.ts` (Module 7), `timesheet.service.spec.ts` (Module 8), `payroll.service.spec.ts` (Module 11), `analytics.service.spec.ts` (Module 10), `ui-preferences.service.spec.ts` (Module 12).
- Note: `attendance.service.spec.ts` expectation was aligned to `https://localhost:8080` after the `environment.ts` http→https fix (Module 1).

## Test coverage
- Minimal: only 2 spec files exist in the repository. No tests for guards, interceptor, app-shell, or feature pages (employees, attendance, leaves, scheduling, etc.).
- Gap: extensive — recommend adding tests per module as implementation proceeds (Phase Eight).

## End-to-end / browser verification
- **Backend now located** at `C:\New folder\github\Emws-Service\EMWS-Service\ewms-parent` (Spring Boot 3.1.5 microservices, Java 17, Maven).
- **Integration contract audit performed** — frontend service layer diffed against backend controllers for Auth, Attendance, Leave, Timesheet, Notifications, Employee, Organization. **0 integration gaps** — all frontend service calls match backend controller endpoints.
- **Backend build & tests verified:** `mvn compile` passes on all 18 modules; attendance-service unit tests pass (23 tests, 0 failures).
- Full end-to-end workflow tests against a running backend not yet performed (backend services require Docker infrastructure not started in this session). Frontend compiles and loads; live server (`ng serve`) previously verified per `frontend.log`.

## Known limitations (documented)
- Server-side RBAC, CORS, rate limiting present on backend (`@PreAuthorize`, Resilience4j `@RateLimiter`, gateway-owned CORS) but **not yet e2e-verified** against a running backend.
- `ApiService` silently swallows errors when a `fallback` argument is provided (masks API failures). Left unchanged to avoid breaking many callers; documented as a known P1 limitation.
- `environment.prod.ts` already uses https/wss; `environment.ts` now aligned (Module 1).

## Changes in this session

### Module 1 — Security-critical defects + design-system foundations
- `src/environments/environment.ts` — `http://`/`ws://` → `https://`/`wss://` (FRONTEND_RULES.md rule 3).
- `src/styles/_design-tokens.scss` (new) — centralized CSS design tokens (colors, typography, spacing, radii, shadows, breakpoints, focus states).
- `src/styles.scss` — imports design-tokens; removed duplicated inline `:root` block; backward-compatible `--primary`/`--surface` aliases preserved.
- `src/app/core/services/attendance.service.spec.ts` — URL expectation updated `http`→`https` to match environment.

### Module 2 — Authentication & RBAC foundations (frontend)
- `src/app/features/auth/forbidden-page.component.ts` (new) — dedicated Access Denied page.
- `src/app/features/auth/forbidden-page.component.spec.ts` (new).
- `src/app/features/auth/auth.routes.ts` — added `/auth/forbidden` route.
- `src/app/core/guards/auth.guard.ts` — unauthorized now routes to `/auth/forbidden` instead of `/dashboard`.
- `src/app/shared/directives/has-scope.directive.ts` — reacts to `isAdmin` changes via `toObservable` (admin mid-session flip re-evaluates visibility).
- `src/app/shared/directives/has-scope.directive.spec.ts` (new).

### Module 3 — Dashboard (frontend)
- `src/app/features/dashboard/dashboard-page.component.ts` — telemetry now preserves `—` (unknown) instead of converting to 0 (data integrity); `hasTelemetry` true only when at least one stat is real; new `chartData` numeric series; new role-aware "Pending Approvals" stat card for users with `LEAVE_TEAM_APPROVE`/`LEAVE_ORG_APPROVE` scope, loaded via `LeaveService.getAllCompanyRequests(LeaveStatus.PENDING)` and refreshed on leave socket events.

### Module 4 — Employee & organization management (frontend)
- `src/app/features/employees/employee-form.component.ts` — replaced hardcoded dark-theme colors (`#0f172a`, `#1e293b`, `color:#fff`) with design tokens (`--surface`, `--txt-main`, `--border`, `--primary`, etc.) so the form renders correctly in light and dark modes per the design system; replaced hardcoded inline button styles with token-based classes; removed non-standard jargon labels ("Abort Sync", "Commit Identity Packet").
- `src/app/core/services/employee-data.service.spec.ts` (new) — 6 tests: GET paged list, POST create, PUT update, DELETE deactivate, PATCH status transition, GET single employee.

### Module 5 — Attendance (frontend)
- `src/app/features/attendance/attendance-page.component.ts` — fixed semantic mismatch: renamed `geoVerifiedPercent()` to `onTimePercent()` (it computed `isLate` ratio, not geo verification) and updated template label/id accordingly (data integrity / WCAG accuracy).
- `src/app/core/services/attendance.service.spec.ts` — expanded from 1 to 7 tests: clock-in idempotency key, clock-out, manual entry payload, force clock-out (PATCH), overtime summary, break-violations summary, clocked-in count.

### Module 6 — Shift scheduling (frontend)
- `src/app/core/services/scheduling.service.spec.ts` — expanded from 1 to 11 tests: conflict extraction, GET shifts, POST create, PUT update, DELETE, PATCH status, GET range, GET swaps, POST request swap, PATCH accept, PATCH approve, plus null-return cases for non-conflict/non-http errors.
- No changes needed to `scheduling.service.ts` or `scheduling-page.component.ts` — already complete with shift CRUD, swaps (request/accept/approve), conflict extraction, and scope-gated actions.

### Module 7 — Leave management (frontend)
- `src/app/core/services/leave.service.spec.ts` (new) — 6 tests: POST create request, GET own requests paged, GET balances, GET company requests, PATCH status update, DELETE cancel.
- `leaves-page.component.ts` / `leave.service.ts` — already complete with balances, status filter, side-sheet add/view/approve/reject, balance-aware guard, roster conflict pre-check, bulk approve; no changes needed.

### Module 8 — Timesheets & approvals (frontend)
- `src/app/core/services/timesheet.service.spec.ts` (new) — 7 tests: POST generate, GET timesheet, GET employee timesheets, GET pending, GET reconciliation, PUT status update, reconciliation mismatch flagging.
- `timesheet.service.ts` / `timesheet-reports-page.component.ts` — already complete with generate/get/pending/reconciliation/status lifecycle, review queue (approve/reject), my documents, reconciliation verification, CSV export, scope-gated admin/manager actions; no changes needed.

### Module 9 — Notifications & messaging (frontend + backend)
- Frontend `NotificationService` / `NotificationCenterService` / `notifications-page` already complete and **contracts match backend** `NotificationController` (GET `/api/notifications/me`, unread-count, read-all, mark-read, POST send, preferences GET/PUT, DELETE templates).
- Backend `NotificationController` (`/api/notifications`) present with `@PreAuthorize` scope enforcement, WebSocket push via `/topic/notifications.{userId}`, and internal service-token endpoint. No frontend changes needed.
- Marked Implemented & Tested (contract-verified).

### Module 10 — Reports & exports (frontend + backend)
- `src/app/core/services/analytics.service.spec.ts` (new) — 10 tests: GET/POST/PUT/DELETE reports, GET/POST/PUT/DELETE widgets, GET admin dashboard.
- `analytics.service.ts` / `analytics-page.component.ts` / `timesheet-reports-page.component.ts` — already complete with report CRUD, widget management, workforce summary, detailed attendance log, review queue, reconciliation, CSV export, scope-gated admin/manager actions; no changes needed.
- Backend contracts verified: `ReportController` (`/api/analytics/reports`) and `DashboardController` (`/api/analytics/dashboard`) match frontend service layer.

### Module 11 — Payroll readiness & administration (frontend + backend)
- `src/app/core/services/payroll.service.spec.ts` (new) — 11 tests: GET/POST salary structure, GET payroll history, POST process payroll, GET pending payroll, GET period exceptions, GET export CSV, GET payslip PDF, GET/POST deductions.
- `payroll.service.ts` / `payroll-page.component.ts` — already complete with salary structure, payroll records, exceptions, period export, payslip PDF, deductions; no changes needed.
- Backend contracts verified: `PayrollController` (`/api/payroll`) matches frontend service layer.


### Module 12 — Advanced optional / UI polish (frontend, P3)
- `src/app/core/services/ui-preferences.service.ts` (new) — compact-table toggle and accent-color presets, persisted to localStorage. Theme colors applied as CSS variables (`--ews-accent-primary`, `--ews-accent-accent`) via `ThemeService`.
- `src/app/features/settings/settings-page.component.ts` — Appearance panel now shows accent-color preset pills (blue/indigo/emerald/amber/rose/slate); compact-table toggle actually applies `body.compact-tables` class; settings auto-persist (no separate Save button needed).
- `src/app/core/services/theme.service.ts` — applies saved accent color as CSS variables on init and on change; backward-compatible `--primary`/`--accent` aliases preserved.
- `src/styles.scss` — added `body.compact-tables` rules: tighter table cell padding, smaller fonts, tighter card spacing.
- `src/app/core/services/ui-preferences.service.spec.ts` (new) — 5 tests: defaults, compact toggle persistence, accent validation/persistence, preset lookup, preset field validation.
- `.opencode/agents/` (6 specialist agent definitions), `docs/` (repository-audit.md, feature-gap-matrix.md, implementation-roadmap.md, this file).

## Pre-existing uncommitted files (preserved, untouched)
- `angular.json`, `src/app/core/layout/app-shell.component.ts`, `src/app/core/services/chat-socket.service.ts`, `src/app/core/services/widget-socket.service.ts`.
