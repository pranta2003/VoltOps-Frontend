# VOLTOPS — FRONTEND SECURITY REVIEW & CONTROLS SPECIFICATION
**Document Status**: Security Standards & Threat Model  
**Audit Date**: 10 November 2026  
**Auditor**: Lead Frontend Engineering Agent (Pair Programming with Pranta)  

---

## 1. Executive Security Architecture

> [!IMPORTANT]
> **Core Principle**: Frontend security controls are exclusively for **User Experience (UX)** and minimizing accidental client-side misuse. Frontend validation and route guards do **NOT** replace backend authorization, access control, or database constraint validation. The backend must independently authenticate and authorize every HTTP request.

---

## 2. Authentication & Session Management

### 2.1 Storage & Token Handling
- **JWT Storage**: Tokens are kept in browser `localStorage` (`voltops_token`) to maintain persistent sessions across browser tabs.
- **Auto-Injection Interceptor**: `src/api/axios.ts` intercepts all outgoing requests and automatically injects:
  ```http
  Authorization: Bearer <voltops_token>
  ```
- **Session Expiration (401 Handling)**:
  - If the backend returns `401 Unauthorized` (expired or revoked token), the response interceptor immediately cleans up:
    ```typescript
    localStorage.removeItem("voltops_token");
    localStorage.removeItem("voltops_user");
    window.location.href = "/login";
    ```
  - This eliminates stale or corrupted token states where the UI hangs in an undefined loading loop.

### 2.2 Password & Credential Safety
- Passwords are typed only into standard `<input type="password" />` fields.
- Form states are zeroed upon submission or cancellation.
- Plaintext passwords or authentication tokens are **never** logged to `console.log` or error reporting channels.

---

## 3. Role-Based Authorization & Boundary Controls

### 3.1 Route Guards (`ProtectedRoute.tsx`)
Routes are wrapped with allowed-role lists:
- Admin routes: `allowedRoles={["ADMIN"]}`
- Dispatcher routes: `allowedRoles={["DISPATCHER", "ADMIN"]}`
- Customer routes: `allowedRoles={["CUSTOMER"]}`
- Technician routes: `allowedRoles={["TECHNICIAN"]}`

If an authenticated user attempts to access a route outside their role, they are redirected to `/unauthorized` or `/login` with clean notification.

### 3.2 Registration Boundary (Anti-Privilege Escalation)
- Public user registration (`/register`) is strictly constrained to the **`CUSTOMER`** role.
- Self-registration as `ADMIN`, `DISPATCHER`, or `TECHNICIAN` is prohibited in client forms, and the backend registration endpoint rejects any non-customer role payload from public endpoints.

---

## 4. Input Validation & Injection Prevention

### 4.1 Cross-Site Scripting (XSS) Prevention
- All user-supplied inputs (titles, problem descriptions, notes, addresses) are rendered via standard React JSX expressions (`{data.title}`).
- `dangerouslySetInnerHTML` is strictly prohibited across all frontend files.
- Form inputs trim unnecessary whitespace and enforce length limits (e.g. titles $\le 100$ characters, descriptions $\le 2000$ characters).

### 4.2 Content-Type & Payload Boundaries
- File uploads for equipment documentation or service evidence must validate MIME types (`image/jpeg`, `image/png`, `application/pdf`) and enforce a maximum file size (default: 5MB) on the client before network transmission.

---

## 5. Environment Variables & Secret Separation

- The only environment variable exposed to Vite is:
  ```env
  VITE_API_URL="http://localhost:5000/api"
  ```
- No server API secrets, database credentials, payment private keys, or signing secrets are placed into frontend environment files.
- All `VITE_*` keys are treated as publicly readable by any visitor who inspects the frontend client bundle.

---

## 7. Backend Authentication Security Investigation (Milestone 2 Verified)

An in-depth inspection of the actual backend codebase (`E:\BUBT-CSE-4th yr\SDP-4\VoltOps\voltops-backend\voltops-backend`) was conducted to evaluate the authentication and API security contract.

### 7.1 Backend Token Contract & Cookie Support
- **Bearer Header Dependency**: The backend middleware (`src/middleware/auth.ts`) strictly requires tokens via `Authorization: Bearer <token>` in the HTTP request headers.
- **Cookie Support Assessment**:
  - The backend Express server (`src/app.ts`) does **NOT** use `cookie-parser` and does not set any cookies (`res.cookie` is absent).
  - Attempting to switch the frontend to `HttpOnly`, `Secure`, `SameSite` cookies unilaterally would **completely break authentication across the platform**, as the backend cannot parse or read cookies from incoming requests.
  - While `cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true })` enables credential sharing, bearer tokens in headers remain the sole supported authentication transport.

### 7.2 CSRF & Token Lifecycle Evaluation
- **CSRF Resistance**: Because authentication relies exclusively on explicit Bearer header injection rather than ambient browser cookies, cross-site requests cannot automatically pass authentication headers. Standard CSRF attacks are ineffective against this design.
- **Token Expiry**: Default duration is 7 days (`JWT_EXPIRES_IN || "7d"` in `src/utils/jwt.ts`).
- **Refresh & Revocation Limitations**:
  - **No Refresh Token Flow**: The backend lacks a refresh token endpoint (`/api/auth/refresh` is missing).
  - **No Server-Side Revocation**: The backend does not maintain an active token blacklist or session store in Prisma/PostgreSQL. Once issued, a JWT remains cryptographically valid until its 7-day expiration unless the account's `isActive` flag is checked in protected queries.
  - **Client-Side Logout**: Calling `logout()` only clears `localStorage.removeItem("voltops_token")`.

### 7.3 XSS Exposure & Data Safeguards
- **XSS Vector**: Because JWT is kept in browser `localStorage`, any arbitrary JavaScript execution (e.g., from malicious NPM packages or unchecked DOM injections) could read the token.
- **Mitigation in Frontend**:
  - Zero usage of `dangerouslySetInnerHTML`.
  - Strict React JSX escaping for all rendered user inputs.
  - Strict input sanitization across forms.
  - No sensitive credentials, passwords, or tokens logged in console or analytics.

### 7.4 Backend API Endpoint Inventory for Admin Module

| Endpoint | Method | Backend Status | Auth & Role Required | Frontend Integration Strategy |
|---|---|---|---|---|
| `/api/auth/login` | POST | **EXISTS** | Public | Connected in `AuthContext.tsx` |
| `/api/auth/register` | POST | **EXISTS** | Public (Customer only) | Connected in `Register.tsx` |
| `/api/auth/me` | GET | **EXISTS** | `requireAuth` (Bearer token) | Connected in `AuthContext.tsx` |
| `/api/technicians` | GET | **EXISTS** | `requireAuth` + `authorize("ADMIN", "DISPATCHER")` | **Directly Connected** in Admin Technician Directory |
| `/api/technicians/me` | GET | **EXISTS** | `requireAuth` + `authorize("TECHNICIAN")` | Connected in Technician Portal |
| `/api/admin/users` or `/api/users` | GET | **MISSING** | None implemented in backend routes | UI-only prototype with deterministic seed + explicit backend status badge |
| `/api/admin/users` | POST | **MISSING** | None implemented in backend routes | UI modal with simulated creation + explicit missing endpoint banner |
| `/api/users/:id/status` | PATCH | **MISSING** | None implemented in backend routes | Client-side status toggle with notification that backend persistence is pending |
| `/api/admin/audit` | GET | **MISSING** | None implemented in backend routes | Structured deterministic administrative log with clear *"Awaiting backend audit table"* notice |

