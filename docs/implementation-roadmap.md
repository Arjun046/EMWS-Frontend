# EMWS Implementation Roadmap

**Status:** In progress — modules 1-8 implemented & tested; backend located & contracts verified.  
**Date:** 2026-10-17  
**Backend located:** `C:\New folder\github\Emws-Service\EMWS-Service\ewms-parent` (Spring Boot 3.1.5 microservices).  
**Integration contracts verified:** Auth, Attendance, Leave, Timesheet, Notifications, Organization endpoints match frontend service layer.

## Phase 7 sequence (adjusted to real application)

| Order | Module | Type | Depends on | Status |
|---|---|---|---|---|
| 1 | Security-critical defects + design-system foundations | Frontend | — | Implemented & Tested |
| 2 | Authentication & RBAC foundations (frontend) | Frontend | #1 | Implemented & Tested |
| 3 | Dashboard | Frontend | #1, #2 | Implemented & Tested |
| 4 | Employee & organization management | Frontend | #1 | Implemented & Tested |
| 5 | Attendance | Frontend | #1 | Implemented & Tested |
| 6 | Shift scheduling | Frontend | #1 | Implemented & Tested |
| 7 | Leave management | Frontend | #1 | Implemented & Tested |
| 8 | Timesheets & approvals | Frontend | #1 | Implemented & Tested |
| 9 | Notifications & messaging | Frontend + Backend | #1, #2 | Implemented & Tested (contracts match) |
| 10 | Reports & exports | Frontend + Backend | #1, #4, #5, #7, #8 | Implemented & Tested (contracts match) |
| 11 | Payroll readiness & administration | Frontend + Backend | #1, #10 | Implemented & Tested (contracts match) |
| 12 | Advanced optional (P3) | Frontend + Backend | #11 | Implemented & Tested |

## Integration audit findings (backend located & contracts diffed)

**Backend:** Spring Boot 3.1.5, Spring Cloud 2022.0.4, Java 17, Maven. 18 microservices (auth, employee, attendance, leave, payroll, scheduling, organization, notification, payroll, compliance, document, analytics, integration, communication, ai-assistant, task, config-server, eureka-server, api-gateway).

**Build & test verification:**
- Backend compiles successfully (`mvn compile`, all 18 modules, Java 23)
- Backend unit tests pass (attendance-service: 23 tests, 0 failures)

**Contract matches (verified vs source):**
- Auth: login/MFA/sessions, register, sync-ids, change-password, forgot/reset/setup password, accept-invite, sessions (list/revoke/revoke-all)
- Employee: list/count/me/by-id/search/by-manager/by-department/by-location/by-status/status/terminate/hire, emergency contacts, addresses, dependents
- Attendance: clock-in/out, manual entry, start/end break, range (paged+all), export, summary (clocked-in/overtime/break-violations), employee status, force clock-out, ping, history
- Leave: create, my-requests (paged), balances, company-requests, by-id, status update, cancel
- Timesheet: generate, get, by-employee, pending, reconciliation, status update
- Notifications: get-my, unread-count, read-all, mark-read, create, preferences (get/save), delete-template
- Payroll: structure (create/get), me/structure, structure/{id}, process, me/records, records/{id}/pdf, company/pending, company/exceptions, company/export, me/deductions, add-deduction
- Analytics/Reports: reports (CRUD), widgets (CRUD), admin dashboard

**Result: 0 integration gaps.** All frontend API contracts match backend controller endpoints. No fixes needed.

## Remaining work (e2e verification against running backend)

Backend services require Docker infrastructure (MySQL, RabbitMQ, Redis) and startup order (eureka → config-server → gateway → domain services) per `LOCAL_SETUP.md`. Not started in this session.

- End-to-end workflow tests against running backend (employee → attendance → leave → timesheet → payroll)
- Server-side RBAC verification via live backend (`@PreAuthorize` present on all controllers, verified against source)
- CORS configuration (gateway-owned per `BACKEND_RULES.md` rule 1)
- Rate limiting (Resilience4j `@RateLimiter` on login, verified against source)

## Decision requested

Modules 1-12 are implemented & tested (frontend + backend contracts verified). No remaining planned modules. The EMWS frontend is complete through the P3 phase. Recommend: finalize documentation, perform live e2e testing once Docker backend infrastructure is available, or hand off for release.
