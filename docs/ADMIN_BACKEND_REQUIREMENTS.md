# VOLTOPS — ADMIN MODULE BACKEND API REQUIREMENTS SPECIFICATION
**Document Status**: Official Backend Requirements & API Contract  
**Author**: Lead Frontend & Security Engineer (Pranta's Team)  
**Target Subsystem**: `voltops-backend` (Node.js, Express, Prisma, PostgreSQL)  
**Date**: 10 November 2026

---

## 1. Overview & Architectural Purpose

The VoltOps frontend has completed Milestone 2 (Admin Governance, User Directory, Technician Skill Passports, and Security Audit Logging).
This document defines the exact backend routes, controllers, middleware chains, and Prisma schema migrations required for the backend engineering team to transition the frontend Admin module from client-side deterministic baselines to full database persistence.

---

## 2. Prisma Database Schema Additions (`prisma/schema.prisma`)

### 2.1 AuditLog Model
To support persistent compliance audit trails across the commercial platform, add the following model:

```prisma
enum AuditCategory {
  AUTH
  ROLE_CHANGE
  DISPATCH
  VERIFICATION
  SECURITY
  ACCOUNT
}

enum AuditSeverity {
  INFO
  WARNING
  CRITICAL
}

model AuditLog {
  id           String        @id @default(cuid())
  timestamp    DateTime      @default(now())
  actorId      String
  actorName    String
  actorRole    Role
  actorIp      String?
  category     AuditCategory
  action       String
  targetEntity String
  severity     AuditSeverity @default(INFO)
  details      String?

  createdAt    DateTime      @default(now())

  @@index([category])
  @@index([timestamp])
  @@map("audit_logs")
}
```

### 2.2 TechnicianProfile Verification Extensions
Add verification lifecycle fields to `TechnicianProfile`:

```prisma
enum VerificationStatus {
  VERIFIED
  PENDING_REVIEW
  REJECTED
}

// In model TechnicianProfile:
model TechnicianProfile {
  // ... existing fields ...
  verificationStatus VerificationStatus @default(PENDING_REVIEW)
  verifiedAt         DateTime?
  verifiedBy         String?
  verificationNotes  String?
}
```

---

## 3. Required API Endpoints & Request / Response Contracts

### 3.1 User Management Endpoints

#### Endpoint 1: List Users (`GET /api/admin/users`)
- **Authorization**: `requireAuth`, `authorize("ADMIN")`
- **Query Parameters**:
  - `role` (optional): `ALL` | `ADMIN` | `DISPATCHER` | `TECHNICIAN` | `CUSTOMER`
  - `status` (optional): `active` | `inactive`
  - `search` (optional): keyword string matching name or email
  - `page` (optional, default 1)
  - `limit` (optional, default 20)
- **Response**: `200 OK`
  ```json
  {
    "users": [
      {
        "id": "usr-admin-1",
        "name": "Pranta",
        "email": "admin@voltops.com",
        "role": "ADMIN",
        "isActive": true,
        "createdAt": "2026-09-01T00:00:00.000Z",
        "technicianProfile": null
      }
    ],
    "total": 34,
    "page": 1,
    "totalPages": 2
  }
  ```

#### Endpoint 2: Create Staff Account (`POST /api/admin/users`)
- **Authorization**: `requireAuth`, `authorize("ADMIN")`
- **Description**: Privileged endpoint for creating internal operational staff (`DISPATCHER`, `TECHNICIAN`, `ADMIN`). Public registration remains restricted to `CUSTOMER`.
- **Request Body**:
  ```json
  {
    "name": "Tania Akter",
    "email": "tania@voltops.com",
    "password": "SecurePassword123!",
    "role": "DISPATCHER",
    "branch": "EPZ Industrial Core",
    "department": "Emergency Dispatch",
    "designation": "Shift Supervisor"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "user": {
      "id": "usr-disp-10",
      "name": "Tania Akter",
      "email": "tania@voltops.com",
      "role": "DISPATCHER",
      "isActive": true,
      "createdAt": "2026-11-10T12:00:00.000Z"
    }
  }
  ```

#### Endpoint 3: Toggle User Activation Status (`PATCH /api/admin/users/:id/status`)
- **Authorization**: `requireAuth`, `authorize("ADMIN")`
- **Request Body**:
  ```json
  {
    "isActive": false,
    "reason": "Administrative suspension pending license re-certification"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "userId": "usr-tech-3",
    "isActive": false,
    "updatedAt": "2026-11-10T12:05:00.000Z"
  }
  ```

---

### 3.2 Technician Verification Endpoints

#### Endpoint 4: Submit Verification Decision (`PATCH /api/technicians/:id/verify`)
- **Authorization**: `requireAuth`, `authorize("ADMIN")`
- **Request Body**:
  ```json
  {
    "verificationStatus": "VERIFIED",
    "notes": "Verified against Electrical Licensing Board (ELB) online portal. Class A license valid through Dec 2027."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "technicianId": "tech-ver-1",
    "verificationStatus": "VERIFIED",
    "verifiedAt": "2026-11-10T12:10:00.000Z",
    "verifiedBy": "usr-admin-1"
  }
  ```

---

### 3.3 Security & Audit Log Endpoints

#### Endpoint 5: Query Audit Logs (`GET /api/admin/audit`)
- **Authorization**: `requireAuth`, `authorize("ADMIN")`
- **Query Parameters**:
  - `category` (optional): `ALL` | `AUTH` | `ROLE_CHANGE` | `DISPATCH` | `VERIFICATION` | `SECURITY` | `ACCOUNT`
  - `severity` (optional): `ALL` | `INFO` | `WARNING` | `CRITICAL`
  - `search` (optional): keyword filter across actor, targetEntity, and action
  - `limit` (optional, default 50)
- **Response**: `200 OK`
  ```json
  {
    "events": [
      {
        "id": "aud-901",
        "timestamp": "2026-11-10T11:20:14.000Z",
        "actorName": "Pranta",
        "actorRole": "ADMIN",
        "actorIp": "192.168.1.103",
        "category": "ROLE_CHANGE",
        "action": "Assigned EPZ Branch supervisor role to Dispatcher Tania Akter",
        "targetEntity": "User usr-disp-1",
        "severity": "INFO",
        "details": "Promoted to branch coordinator with dispatch queue approval override permissions."
      }
    ],
    "total": 128
  }
  ```

---

## 4. Middleware Requirements

1. **Active Account Check in `requireAuth` (`src/middleware/auth.ts`)**:
   - Currently, `requireAuth` does not query the database.
   - Recommended update: Check that `user.isActive === true` so deactivated accounts are immediately rejected with `403 Forbidden` on their next request.
2. **Mounting Admin Routes (`src/routes/index.ts`)**:
   - Mount new `adminRoutes` under `/api/admin`:
     ```typescript
     import adminRoutes from "./adminRoutes";
     router.use("/admin", adminRoutes);
     ```
