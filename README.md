# EWMS Frontend

Angular frontend for the Enterprise Workforce Management System. This app is intentionally separate from the backend and lives in:

`C:\Users\Lenovo\Downloads\solo-project-backend\EMWS-Frontend`

## Stack

- Angular 20 with standalone components
- Angular Router with lazy-loaded feature areas
- Angular Material with a customized enterprise UI
- SCSS
- Signal-based local state
- HttpClient with auth interceptor
- STOMP over WebSocket for widgets and chat

## Available Areas

- Auth
- Dashboard
- Notifications
- Employees
- Attendance
- Leaves
- Payroll
- Scheduling
- Performance
- Compliance
- Documents
- Analytics
- Organization
- Communication
- Tasks

## Backend Integration

- API Gateway: `http://localhost:8080`
- Widget socket: `ws://localhost:8080/ws-hub/websocket`
- Chat socket: `ws://localhost:8080/ws-chat/websocket`

Start the UI-facing backend stack with:

```powershell
cd "C:\Users\Lenovo\Downloads\solo-project-backend\EMWS-Service\ewms-parent"
powershell -ExecutionPolicy Bypass -File .\restart-ui-services.ps1
```

The login flow falls back to a local demo session if a backend auth endpoint is not available yet. This keeps the UI runnable while backend auth contracts are still evolving.

## Install

```powershell
cd "C:\Users\Lenovo\Downloads\solo-project-backend\EMWS-Frontend"
& "C:\Program Files\nodejs\npm.cmd" install
```

## Run

```powershell
cd "C:\Users\Lenovo\Downloads\solo-project-backend\EMWS-Frontend"
& "C:\Program Files\nodejs\npm.cmd" start
```

Open `http://localhost:4200`.

## Build

```powershell
cd "C:\Users\Lenovo\Downloads\solo-project-backend\EMWS-Frontend"
& "C:\Program Files\nodejs\npm.cmd" run build
```
