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

## 6. Financial & AI Operational Boundaries

- **Invoicing & Billing**:
  - The frontend never performs autonomous financial calculations or drafts unapproved invoices.
  - Billing preview screens display a clear disclaimer:
    > *"Payment is a UI preview only. No real transaction will be processed."*
  - All financial line items, subtotals, tax rates, and totals must be sourced deterministically from backend work order records.
- **AI Matching & Dispatch**:
  - AI recommendations for technicians are purely advisory explanations.
  - Automatic dispatching without human dispatcher confirmation is blocked.
