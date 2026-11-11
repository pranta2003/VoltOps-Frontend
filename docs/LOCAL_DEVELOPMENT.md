# VoltOps Local Development & Environment Guide

This document establishes the official workflow, commands, port bindings, and troubleshooting steps for the VoltOps frontend application.

---

## 1. Environment & Port Configuration

The frontend Vite server is configured with deterministic port bindings (`strictPort: true` in `vite.config.ts`) to avoid silent port drift:

| Command | Environment | Port | URL | Description |
|---|---|---|---|---|
| `npm run dev` | **Development Server** | **5173** | `http://localhost:5173` | Hot Module Replacement (HMR), unminified source maps, rapid development loop. |
| `npm run build` | **Production Bundler** | — | — | Runs TypeScript compiler (`tsc`) and Vite bundler to output production assets to `dist/`. |
| `npm run preview` | **Production Preview** | **4173** | `http://localhost:4173` | Serves the actual minified production bundle in `dist/` for acceptance testing and verification. |

> **Critical Note on Ports**:
> - Never confuse `localhost:5173` (development HMR) with `localhost:4173` (production preview).
> - If port 5173 or 4173 is already in use by a zombie process, Vite will fail with an explicit `EADDRINUSE` message rather than silently shifting to an unexpected port.

---

## 2. Standard Development Workflow

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. All route changes hot-reload instantly.

### Step 3: Run Automated Test Suite
```bash
npm test
```
Runs the automated test suite across Admin and Dispatcher modules (`node --test tests/adminService.test.mjs tests/dispatcherService.test.mjs`).

### Step 4: Verify Production Build
```bash
npm run build
```
Type checks the entire codebase (`tsc`) and builds production chunks in `dist/`.

### Step 5: Verify Production Bundle Preview
```bash
npm run preview
```
Serves the built bundle on `http://localhost:4173`.

---

## 3. Direct Navigation & Client-Side SPA Routing

All frontend routes are client-side routes handled by React Router DOM (`<BrowserRouter>`). Both `npm run dev` and `npm run preview` are configured with SPA fallback to `index.html`. Direct navigation and browser refreshes on any of the following routes will resolve correctly:

- `/login` — User authentication portal
- `/register` — Customer registration portal
- `/admin` — Lead Admin Governance Console
- `/admin/users` — Staff & User Account Directory
- `/admin/technicians` — Technician Credential Verification Ledger
- `/admin/audit` — System Security Audit Ledger
- `/dispatcher` — Real-Time Dispatcher Operations Board
- `/dispatcher/requests` — Inbound Service Breakdown Intake Ledger
- `/dispatcher/work-orders` — Work Orders Lifecycle Operations Ledger
- `/dispatcher/technicians` — Field Technician Availability Roster

---

## 4. Backend Connectivity & Offline Baselines

The frontend connects to the backend API via `VITE_API_URL` (`src/api/axios.ts`), defaulting to:
```
http://localhost:5000/api
```

- When the backend is offline:
  - The login and registration screens display clear, non-cryptic error banners explaining that the authentication server is temporarily unreachable.
  - The internal operational dashboards (Admin and Dispatcher) transparently display a `"Local preview"` telemetry badge and operate on deterministic offline baselines for demonstration and review.
- When the backend is online:
  - Telemetry badges switch to `"Live API"`, and data mutations synchronize directly with remote endpoints.
