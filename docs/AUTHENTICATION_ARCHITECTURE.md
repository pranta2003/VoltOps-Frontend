# VoltOps Frontend Authentication Architecture & Security Invariants

**Document Version:** 1.0.0  
**Repository:** `VoltOps-Frontend`  
**Branch:** `pranta`  
**Status:** Implemented & Verified  

---

## 1. System Overview & Dual-Layer Authentication

VoltOps implements a secure client architecture designed for commercial facilities maintenance operations. The authentication system decouples **Identity Verification** from **Application Authorization & Session Issuance**.

```
+-----------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                       |
|  - Login Page (src/pages/Login.tsx)                                                     |
|  - Registration Page (src/pages/Register.tsx)                                           |
|  - Google Sign-In Component (src/components/GoogleSignInButton.tsx)                     |
+-----------------------------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------------------+
|                           AUTHENTICATION CONTEXT & SERVICE                              |
|  - AuthProvider (src/context/AuthContext.tsx)                                           |
|  - AuthService (src/services/authService.ts)                                            |
|  - Firebase SDK Initializer (src/services/firebase.ts)                                 |
+-----------------------------------------------------------------------------------------+
         |                                                               |
         | [Real Google Flow]                                            | [Preview Mode]
         v                                                               v
+-----------------------------------+                           +-------------------------+
| Google / Firebase Identity        |                           | Local Preview Mode      |
| - signInWithPopup                 |                           | - Dev-only controls     |
| - Issues Firebase ID Token        |                           | - Strict sessionStorage |
+-----------------------------------+                           | - Explicit simulation   |
         |                                                      +-------------------------+
         v                                                               |
+-------------------------------------------------------------+          |
| Backend Token Exchange Boundary: POST /api/auth/google      |          |
| Payload: { idToken, email, displayName, photoUrl }          |          |
+-------------------------------------------------------------+          |
         |                                                               |
         +-------------------------------+                               |
         | [Backend Online & Valid]      | [Backend Offline / 404 / 500] |
         v                               v                               v
+---------------------------+   +-------------------------------+   +---------------------+
| Authoritative Session     |   | FAILS FAST WITH CLEAR ERROR   |   | Quarantined Preview |
| - Backend JWT issued      |   | - BackendTokenExchangeError   |   | - SessionStorage    |
| - Stored in localStorage  |   | - ZERO token or session created|   | - Clears on exit    |
| - AuthUser record set     |   | - User prompted to use Preview|   | - Non-persisted     |
+---------------------------+   +-------------------------------+   +---------------------+
```

---

## 2. Security Invariants & Failure Boundaries

### Invariant 1: No Synthetic Sessions on Backend Failure
A failed Google OAuth flow, missing Firebase config, network timeout, or unreachable/failing backend exchange (`POST /api/auth/google`) must **NEVER** silently fabricate a synthetic customer session or client JWT.
- When `POST /api/auth/google` fails (network error, 404 unmounted endpoint, 500 server error, or 401/403 authorization rejection), `authService.exchangeFirebaseTokenWithBackend` explicitly throws `BackendTokenExchangeError`.
- No tokens or user records are written to `localStorage`.
- The user is shown clear, actionable guidance with instructions to use Local Preview Mode while backend services are offline.

### Invariant 2: Privilege Escalation Prevention
Public Google accounts can **never** self-grant privileged staff roles (`ADMIN`, `DISPATCHER`, `TECHNICIAN`). 
- When the backend verifies the Firebase token via the Firebase Admin SDK, it looks up or provisions an authoritative user record with assigned permissions.
- Public self-registration defaults strictly to `CUSTOMER` role.

### Invariant 3: Quarantine of Local Preview Mode
Local Preview Mode is strictly segregated:
- It operates solely via `sessionStorage.getItem("voltops_preview_role")`.
- It is only active in `import.meta.env.DEV` mode.
- Exiting preview completely clears `sessionStorage` and returns the user to `/login`.
- Preview mode never writes simulated credentials to `localStorage["voltops_token"]`.

---

## 3. Implementation Status Matrix

| Component / Layer | Status | Verification Detail |
| :--- | :--- | :--- |
| **Firebase SDK Integration** | `Implemented & Tested` | `src/services/firebase.ts` safely initializes Firebase app and Auth instance; detects missing `.env` keys gracefully. |
| **Official Google Sign-In Button** | `Implemented & Tested` | `src/components/GoogleSignInButton.tsx` implements official Google "G" SVG branding, responsive states, loading indicators, and accessibility rings. |
| **Error Code Mapping** | `Implemented & Tested` | `formatFirebaseErrorMessage` translates all Firebase codes (`popup-closed-by-user`, `popup-blocked`, `unauthorized-domain`, `network-request-failed`, etc.) into user-friendly messages. |
| **Backend Exchange Adapter** | `Implemented & Tested` | `authService.exchangeFirebaseTokenWithBackend` enforces strict contract: `POST /api/auth/google` sending `{ idToken, email, displayName, photoUrl }`. Throws `BackendTokenExchangeError` on network/404/rejection. |
| **Session Restoration** | `Implemented & Tested` | `AuthContext` validates existing `localStorage` tokens with `GET /auth/me`, clears tokens on 401, or restores Firebase auth listener. |
| **Role-Based Guards** | `Implemented & Tested` | `ProtectedRoute.tsx` and layout navigations prevent unauthorized portal access. |
| **Live Google OAuth Popup** | `Implemented (Pending Live Keys)` | Implemented via `signInWithPopup(auth, googleProvider)`. Tested with mock drivers; requires valid `VITE_FIREBASE_API_KEY` for live browser popup. |
| **Backend Token Endpoint** | `Pending Backend Implementation` | Contract defined for separate `VoltOps-Backend` repository (`POST /api/auth/google`). |

---

## 4. Backend Integration Contract: `POST /api/auth/google`

When the backend repository is developed, the endpoint must satisfy the following contract:

### Request
- **Endpoint:** `POST /api/auth/google`
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "idToken": "<FIREBASE_ID_TOKEN_JWT>",
  "email": "customer@facility.com",
  "displayName": "Facility Manager",
  "photoUrl": "https://lh3.googleusercontent.com/..."
}
```

### Backend Responsibilities
1. Verify the integrity and cryptographic signature of `idToken` using `firebase-admin` auth:
   ```ts
   const decodedToken = await admin.auth().verifyIdToken(idToken);
   const { uid, email } = decodedToken;
   ```
2. Find existing user by `email` or create a new user record with role `CUSTOMER`.
3. Issue a VoltOps application session token (JWT) signed by the VoltOps backend secret.
4. Return HTTP 200 with the payload below:

### Response (200 OK)
```json
{
  "token": "<VOLTOPS_AUTHORITATIVE_JWT>",
  "user": {
    "id": "usr-uuid-1234",
    "name": "Facility Manager",
    "email": "customer@facility.com",
    "role": "CUSTOMER",
    "initials": "FM",
    "avatarUrl": "https://lh3.googleusercontent.com/...",
    "company": "Apex Spinning & Weaving Mills"
  }
}
```

---

## 5. Automated Test Coverage

The test suite in `tests/authService.test.mjs` verifies all security boundaries and failure handling:
- **Scenario 1:** Missing Firebase `.env` variables returns actionable setup guidance.
- **Scenario 2:** Popup closed by user maps to clean cancellation notice.
- **Scenario 3:** Popup blocked by browser maps to browser permission guidance.
- **Scenario 4:** Unauthorized domain maps to Firebase Console domain whitelist guidance.
- **Scenario 5:** Operation not allowed maps to provider activation instructions.
- **Scenario 6:** Network failure maps to connectivity advice.
- **Scenario 7:** Public Google identities can never self-assign staff roles (`ADMIN`, `DISPATCHER`, `TECHNICIAN`).
- **Scenario 8:** Backend token exchange failure throws `BackendTokenExchangeError` without creating an application session.
- **Scenario 9:** Backend rejection (401/403) returns clear error message and prevents fallback session generation.
- **Scenario 10:** Demo accounts are strictly quarantined in Local Preview Mode and do not pollute `localStorage`.
