# VOLTOPS — COMPREHENSIVE SECURITY REVIEW & THREAT MODEL AUDIT
**Document Status**: Official Application Security Audit (Milestone 2)  
**Audit Date**: 10 November 2026  
**Auditor**: Lead Frontend & Security Engineering Agent (SDP-4 VoltOps Architecture)  
**Target Systems**: `voltops-frontend` (React/Vite/TS) & `voltops-backend` (Node/Express/Prisma/PostgreSQL)

---

## 1. Executive Summary & Security Boundary Principle

> [!IMPORTANT]
> **Core Architectural Principle**:
> Frontend controls, route guards (`ProtectedRoute.tsx`), and UI element masking are **strictly for User Experience (UX)** and prevention of accidental client-side misbehavior. Frontend checks **NEVER** constitute a security boundary.
> All administrative privileges, data mutations, role checks, and database queries must be independently authenticated and authorized on the backend (`voltops-backend`) via middleware before execution.

This document details the complete end-to-end security investigation conducted across the frontend and backend repositories, identifying verified vulnerabilities, architectural constraints, threat ratings, and required backend remediations.

---

## 2. Threat Classification & Vulnerability Ledger

| ID | Finding / Vulnerability | Severity | Subsystem | Status |
|---|---|---|---|---|
| **SEC-01** | JWT stored in browser `localStorage` exposed to XSS | **HIGH** | Frontend / Auth | Mitigated by strict JSX escaping; Requires backend HttpOnly cookie migration |
| **SEC-02** | No server-side session revocation on user deactivation | **HIGH** | Backend / Auth Middleware | Unresolved in backend; Documented in requirements |
| **SEC-03** | 7-day long-lived access token with no refresh token flow | **MEDIUM** | Backend / JWT Engine | Unresolved in backend; Documented in requirements |
| **SEC-04** | Backend lacks `cookie-parser` and cookie issuance | **MEDIUM** | Backend / Express Engine | Architectural constraint; Frontend cannot use cookies until backend adds support |
| **SEC-05** | Anti-privilege escalation on public registration | **LOW** | Backend / Auth Controller | **VERIFIED SECURE**: Backend forces `role: Role.CUSTOMER` |
| **SEC-06** | Role-Based Access Control on Technician Directory | **INFORMATIONAL** | Backend / RBAC Middleware | **VERIFIED SECURE**: Enforced via `requireAuth` + `authorize("ADMIN", "DISPATCHER")` |
| **SEC-07** | Missing persistent audit logging infrastructure | **MEDIUM** | Backend / Prisma Schema | Database schema lacks `AuditLog` table; Frontend utilizes deterministic baseline |

---

## 3. Detailed Technical Investigation Findings

### 3.1 Authentication & Token Lifecycle (`voltops-backend`)
Inspected files:
- `src/controllers/authController.ts`
- `src/middleware/auth.ts`
- `src/middleware/authorize.ts`
- `src/utils/jwt.ts`
- `src/app.ts`

#### Finding A: Token Storage & Header Dependency
- **Implementation**: The backend expects all authenticated requests to present a Bearer token in the `Authorization` header (`Authorization: Bearer <token>`).
- **Inspection of `src/middleware/auth.ts`**:
  ```typescript
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No login token provided." });
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);
  req.user = payload;
  ```
- **Cookie Assessment**:
  - `src/app.ts` does **NOT** import or configure `cookie-parser`.
  - Neither `res.cookie()` nor `req.cookies` exist anywhere in the backend codebase.
  - **Critical Architectural Decision**: Switching the frontend to `HttpOnly` cookies unilaterally would immediately break 100% of API authentication across the platform. The frontend must continue transmitting `Authorization: Bearer <token>` until the backend implements cookie support.

#### Finding B: Session Revocation Gap (SEC-02)
- **Issue**: In `authController.ts`, `login` checks `if (!user.isActive) return res.status(403)`. However, `requireAuth` (`src/middleware/auth.ts`) only verifies the cryptographic signature of the token (`jwt.verify(token, JWT_SECRET)`). It does **NOT** query the database to verify if `user.isActive` is still `true`.
- **Impact**: If an Administrator deactivates a malicious or compromised user account, that user's existing JWT remains valid and able to execute authorized operations until the 7-day expiration.
- **Remediation**: The backend must either query `prisma.user.findUnique({ where: { id: req.user.userId }, select: { isActive: true } })` inside `requireAuth`, or implement a Redis/DB-backed token revocation table.

#### Finding C: Long-Lived Token without Refresh Rotation (SEC-03)
- **Issue**: `src/utils/jwt.ts` signs tokens with `JWT_EXPIRES_IN || "7d"`. There is no `/api/auth/refresh` endpoint and no short-lived access token + long-lived refresh token pairing.
- **Impact**: A stolen token grants an attacker a 7-day window of full access.
- **Remediation**: Shorten access token lifetime to 15 minutes and implement a secure refresh token stored in an HttpOnly cookie with rotation.

#### Finding D: Anti-Privilege Escalation on Public Registration (SEC-05)
- **Verification**: In `src/controllers/authController.ts`, public registration (`POST /api/auth/register`) enforces `role: Role.CUSTOMER` directly in the database insert query:
  ```typescript
  const user = await prisma.user.create({
    data: { name, email, password: passwordHash, role: Role.CUSTOMER },
  });
  ```
  Zod schema validation (`registerSchema`) rejects any extraneous payload manipulation. Public users cannot self-assign `ADMIN`, `DISPATCHER`, or `TECHNICIAN` roles.

---

### 3.2 Authorization & Role-Based Access Control (RBAC)

#### Verified Backend Enforcements:
- **`GET /api/technicians`**:
  - Protected by `requireAuth` and `authorize("ADMIN", "DISPATCHER")` (`src/routes/technicianRoutes.ts#L9`).
  - Calling this endpoint without a token returns `401 Unauthorized`.
  - Calling this endpoint as a `CUSTOMER` returns `403 Forbidden` (`"Your role (CUSTOMER) is not allowed to do this."`).
  - **Verdict**: Verified Secure.
- **`GET /api/technicians/me`**:
  - Protected by `requireAuth` and `authorize("TECHNICIAN")`.
  - Restricts technicians strictly to their own profile based on `req.user.userId`.
  - **Verdict**: Verified Secure.
- **`GET /api/auth/me`**:
  - Protected by `requireAuth`. Returns sanitized user object (`id`, `name`, `email`, `role`, `createdAt`).
  - **Verdict**: Verified Secure.

---

### 3.3 Frontend Security Safeguards (`voltops-frontend`)

1. **XSS Countermeasures**:
   - `dangerouslySetInnerHTML` is prohibited across the entire frontend codebase (verified with codebase grep).
   - All dynamic text (user names, emails, audit descriptions, technician credentials) is rendered via standard React JSX text nodes, automatically escaping HTML entities.
2. **Axios Automatic Header Injection & 401 Session Cleanup**:
   - Outgoing requests automatically inject `Authorization: Bearer <token>` via Axios interceptor.
   - Any `401 Unauthorized` response immediately triggers:
     ```typescript
     localStorage.removeItem("voltops_token");
     localStorage.removeItem("voltops_user");
     window.location.href = "/login";
     ```
3. **Route Protection (`src/components/ProtectedRoute.tsx`)**:
   - Admin routes (`/admin`, `/admin/users`, `/admin/technicians`, `/admin/audit`) are guarded by `allowedRoles={["ADMIN"]}`.
   - Non-authenticated requests are redirected to `/login`; unauthorized roles are redirected to `/unauthorized`.
4. **Credential & Sensitive Data Masking**:
   - Passwords are never stored in plain text in React state beyond form submission.
   - Audit logs mask internal tokens, hashes, and database passwords from inspection views.

---

## 4. Backend Admin Integration Gap Matrix

The following table reflects the verified status of backend endpoints required for the Admin module:

| Admin Feature | Required Endpoint | HTTP Method | Backend Status | Backend File Location |
|---|---|---|---|---|
| Admin Dashboard Probing | `/api/technicians` | GET | **EXISTS (Connected)** | `src/controllers/technicianController.ts` |
| Technician Directory & Credentials | `/api/technicians` | GET | **EXISTS (Connected)** | `src/controllers/technicianController.ts` |
| Technician Verification Decision | `/api/technicians/:id/verify` | PATCH | **MISSING** | Needs controller & route implementation |
| User Directory Listing | `/api/admin/users` | GET | **MISSING** | Needs `adminRoutes.ts` & `adminController.ts` |
| Staff Account Creation | `/api/admin/users` | POST | **MISSING** | Needs privileged staff creation endpoint |
| User Activation / Deactivation | `/api/admin/users/:id/status` | PATCH | **MISSING** | Needs status toggle endpoint |
| Audit Log Event Ledger | `/api/admin/audit` | GET | **MISSING** | Needs `AuditLog` Prisma model & controller |

---

## 5. Security Recommendations for Future Milestones

1. **Backend Cookie Migration**:
   - Install `cookie-parser` on backend.
   - On `/api/auth/login`, issue an `HttpOnly`, `Secure`, `SameSite=Strict` cookie containing a short-lived access token.
   - Enable CSRF protection via double-submit cookie or origin header validation.
2. **Real-time User Status Check in Auth Middleware**:
   - Update `requireAuth` in `src/middleware/auth.ts` to check `user.isActive === true` from PostgreSQL to immediately block deactivated accounts.
3. **Audit Log Database Schema**:
   - Add `model AuditLog` to `prisma/schema.prisma` with fields: `id`, `actorId`, `actorRole`, `actorIp`, `category`, `action`, `targetEntity`, `severity`, `details`, `createdAt`.
