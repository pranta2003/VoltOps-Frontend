<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0:0f172a,50:10b981,100:06b6d4&height=220&section=header&text=VoltOps&fontSize=52&fontAlignY=38&desc=Commercial%20Field%20Service%20%26%20Emergency%20Technician%20Coordination&descFontSize=20&descAlignY=60&fontColor=ffffff" width="100%" alt="VoltOps Banner" />
</div>

<div align="center">
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=16&pause=1000&color=10B981&center=true&vCenter=true&width=750&lines=7+Commercial+Trades+%C2%B7+20%E2%80%9340m+Physical+Arrival+SLA;Dual-Theme+B2B+SaaS+%C2%B7+Zero-Yellow+Design+System;4+Role-Based+Portals+%C2%B7+Customer%2C+Dispatcher%2C+Technician+%26+Admin;React+18+%2B+TypeScript+%2B+Vite+%2B+Framer+Motion" alt="Typing SVG" />
  </a>
</div>

<p align="center">
  <a href="https://voltops-frontend.vercel.app">
    <img src="https://img.shields.io/badge/Live_Demo-voltops--frontend.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=ffffff" alt="Live Demo" />
  </a>
  <a href="https://github.com/pranta2003/VoltOps-Backend">
    <img src="https://img.shields.io/badge/Backend_Repo-VoltOps--Backend-06b6d4?style=for-the-badge&logo=github&logoColor=ffffff" alt="Backend Repo" />
  </a>
  <a href="https://github.com/pranta2003/VoltOps-Frontend">
    <img src="https://img.shields.io/badge/Frontend_Repo-VoltOps--Frontend-0f172a?style=for-the-badge&logo=github&logoColor=10b981" alt="Frontend Repo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-0f172a?style=for-the-badge&logo=react&logoColor=06b6d4" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-0f172a?style=for-the-badge&logo=typescript&logoColor=10b981" alt="TypeScript 5.6" />
  <img src="https://img.shields.io/badge/Vite-5.4-0f172a?style=for-the-badge&logo=vite&logoColor=b8287a" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-0f172a?style=for-the-badge&logo=tailwindcss&logoColor=06b6d4" alt="Tailwind CSS 3.4" />
  <img src="https://img.shields.io/badge/Framer_Motion-14.12-0f172a?style=for-the-badge&logo=framer&logoColor=ffffff" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Tests-84%2F84_Passing-0f172a?style=for-the-badge&logo=node.js&logoColor=10b981" alt="84 Tests Passing" />
  <a href="https://github.com/pranta2003/VoltOps-Frontend/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/pranta2003/VoltOps-Frontend/ci.yml?branch=main&style=for-the-badge&label=CI%20Build&color=10b981" alt="CI Build" />
  </a>
</p>

---

## 1. Executive Summary

**VoltOps** is an enterprise B2B field service and emergency technician coordination platform designed for commercial facilities, mission-critical infrastructure, and industrial properties. It bridges commercial property managers with certified trade specialists through guaranteed physical arrival SLAs (20m to 40m), real-time status progression, deterministic dispatch matching, and granular multi-role operational dashboards.

- **Live Deployment:** [https://voltops-frontend.vercel.app](https://voltops-frontend.vercel.app)
- **Backend API Repository:** [https://github.com/pranta2003/VoltOps-Backend](https://github.com/pranta2003/VoltOps-Backend)
- **Implementation Ledger:** [`docs/IMPLEMENTATION_PROGRESS.md`](docs/IMPLEMENTATION_PROGRESS.md)
- **Course & Roadmap Plan:** [`PROJECT_PLAN.md`](PROJECT_PLAN.md)

---

## 2. Core Platform Capabilities

### 2.1 Canonical 7 Commercial Trades
Every work order, technician skill passport, diagnostic log, and billing rate is strictly categorized into one of 7 standardized trade domains:

| # | Trade Category | Commercial Coverage Scope |
|---|---|---|
| **1** | **Electrical and power systems** | Substation switchgear, 3-phase distribution, emergency generator transfers, UPS arrays |
| **2** | **AC, HVAC, and cooling** | Chiller plants, VRF/VRV central cooling, server room precision HVAC, ventilation air handlers |
| **3** | **CCTV and security** | IP surveillance networks, biometrics, access control turnstiles, perimeter intrusion sensors |
| **4** | **Internet, networking, and hardware** | Structured fiber backbones, MDF/IDF racks, enterprise routers, edge switches, AP arrays |
| **5** | **IT and software support** | POS terminals, local workstation clusters, branch server recovery, peripheral gateways |
| **6** | **Plumbing and water systems** | High-pressure commercial boosters, backflow preventers, industrial boiler drainage, fire lines |
| **7** | **Facility maintenance** | Structural egress, automated dock doors, building envelope repairs, acoustic ceiling tiles |

---

### 2.2 Coverage Plans & Guaranteed Physical Arrival SLAs

> **Important SLA Distinction**: In VoltOps, **"Arrival SLA" strictly denotes the physical arrival of a certified technician on site** at the commercial facility—not a generic email confirmation and not ticket closure.

| Plan | Operational Window | Physical Arrival SLA | Recommended Commercial Facility Profile |
|---|---|---|---|
| **Plan A: 8-Hour Daily Coverage** | 09:00 – 17:00 Daily | *Standard Scheduled Arrival* (No emergency arrival SLA) | Small retail shops, light commercial offices, non-critical branch facilities |
| **Plan B: 24/7 Standard** | Round-the-clock (24/7/365) | **40-Minute Physical Arrival** | Multi-tenant commercial plazas, corporate campuses, logistics warehouses |
| **Plan C: 24/7 Priority** | Round-the-clock Priority (24/7/365) | **20-Minute Rapid Physical Arrival** (2× accelerated) | Data centers, healthcare clinics, financial branches, cold-storage facilities |
| **Plan D: Custom Coverage** | Multi-facility shift schedules | Bespoke SLA (Negotiated Contract) | Enterprise REITs, municipal complexes, large industrial estates |

---

### 2.3 Comprehensive 4-Portal Feature Matrix

VoltOps delivers role-tailored dashboards with role-based routing (`ProtectedRoute.tsx`), unified navigation shell (`Layout.tsx`), and persistent demo simulation state:

```
                                  ┌───────────────────────────┐
                                  │   Public Landing Page     │
                                  │ (Dual-Theme Presentation) │
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
   ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
   │      Customer Portal      │  │     Dispatcher Portal     │  │     Technician Portal     │
   │  - Service breakdown logs │  │  - SLA dispatch radar     │  │  - Mobile job queue       │
   │  - Live SLA countdowns    │  │  - Deterministic matching │  │  - Live status progression │
   │  - Facility asset lists   │  │  - Triage & work orders   │  │  - Skill trade passport   │
   │  - Invoices & checkout    │  │  - Schedule & audit log   │  │  - Leave requests         │
   └───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │       Admin Portal        │
                                  │  - Enterprise user RBAC   │
                                  │  - Credential audit log   │
                                  │  - Recruiter CV extractor │
                                  │  - System configuration   │
                                  └───────────────────────────┘
```

| Portal | Target User | Key Modules & Capabilities |
|---|---|---|
| **Landing Page** | Public & Prospective Clients | Dual-Theme Hero (Cinematic MP4 in Dark / Framer Motion Bento in Light), Interactive Plan Selector, 7 SpotlightCard Trade Panels, One-Click 4-Role Demo Switcher. |
| **Customer Portal** | Facility Managers & Tenants | Breakdown Ticket Submission, Real-Time SLA Arrival Countdown Timer, Facility Asset Register, PDF Invoices & Demonstration Checkout. |
| **Dispatcher Portal** | Command Center Dispatchers | Live SLA Triage Board, Deterministic Technician Matching Engine (Skills, Distance, Active Queue, Availability), Leave Approvals, Dispatch Audit Ledger. |
| **Technician Portal** | Field Engineers & Specialists | Mobile-first Job Progression (`TRAVELLING` → `ON_SITE` → `COMPLETED`), Digital Sign-Off, Multi-Trade Skill Passport, Certification Records, Shift Leave Requests. |
| **Admin Portal** | System Administrators & Ops Leads | Enterprise User Management (RBAC), Technician Credential Verification & Audit, Recruiter CV Skill Extractor (Rule-based candidate parsing), Global Audit Log. |

---

### 2.4 Design System Highlights (Strict Zero-Yellow Standard)

- **Cinematic Dual-Theme Architecture:**
  - **Dark Mode**: Immersive slate aesthetic (`#0b1120`) featuring an authenticated commercial technician looping MP4 video background, cyan/emerald ambient glow fields, and frosted glass cards.
  - **Light Mode**: Ultra-crisp editorial layout (`#ffffff` / `#f8fafc`) featuring a 3-tile animated Bento hero with concentric SVG radar pulse rings, clean typography, and zero visual clutter.
- **SpotlightCard Cursor Tracking:** Ambient radial cursor illumination across trade cards using pure CSS custom variables and mouse-position tracking.
- **Zero-Yellow Palette Rule:** All ambiguous yellow/amber indicators are strictly replaced with high-clarity tokens:
  - **Signal Emerald (`#10b981`)**: Available, verified, completed, on-track SLA.
  - **VoltOps Cyan (`#06b6d4`)**: Active focus, interactive states, primary actions, travel progress.
  - **Berry Plum (`#b8287a`)**: Priority highlights, featured plan markers, secondary accents.
  - **Crimson Red (`#ef4444`)**: Emergency breakdown, SLA breach warning, urgent priority.
  - **Dark Slate (`#0f172a` / `#1e293b`)**: Base surfaces, structured borders, high-contrast text.

---

## 3. Repository File & Folder Architecture

```
voltops-frontend/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                 # Automated Node.js 24 LTS build & test runner
│   └── pull_request_template.md   # Standardized pull request quality checklist
├── docs/
│   ├── ADMIN_BACKEND_REQUIREMENTS.md
│   ├── ADMIN_COMPLETION_AUDIT.md
│   ├── AUTHENTICATION_ARCHITECTURE.md
│   ├── ENGINEERING_WORKFLOW.md
│   ├── IMPLEMENTATION_PROGRESS.md # Continuous commit ledger & verification logs
│   ├── LOCAL_DEVELOPMENT.md
│   ├── VOLTOPS_DESIGN_AUDIT.md
│   ├── VOLTOPS_DESIGN_SYSTEM_RESET.md
│   └── VOLTOPS_SECURITY_REVIEW.md
├── public/
│   ├── images/                    # Commercial technician avatars & facility icons
│   ├── screenshots/               # High-resolution portal audit captures
│   ├── videos/
│   │   └── hero-technician.mp4    # Dark-mode cinematic looping background video
│   ├── favicon.svg                # VoltOps cyan/emerald brand icon
│   └── robots.txt
├── src/
│   ├── api/
│   │   └── axios.ts               # Axios client with JWT interceptor & 401 recovery
│   ├── components/
│   │   ├── charts/                # DonutChart & HorizontalBarChart SVG components
│   │   ├── landing/
│   │   │   ├── AnimatedCounter.tsx  # Smooth numeric count-up on scroll
│   │   │   ├── LightHeroVisual.tsx  # 3-Tile Framer Motion animated Bento hero
│   │   │   └── SpotlightCard.tsx    # Radial mouse-tracking ambient border card
│   │   ├── CustomerFeedbackModal.tsx
│   │   ├── CustomerSupportModal.tsx
│   │   ├── DemonstrationReceiptModal.tsx
│   │   ├── GoogleSignInButton.tsx
│   │   ├── Icons.tsx              # Centralized SVG icon registry (Zero-Yellow)
│   │   ├── Layout.tsx             # Shared authenticated dashboard shell & header
│   │   ├── MetricCard.tsx         # KPI summary card with trend indicator
│   │   ├── NotificationCenter.tsx # In-app notification center modal
│   │   ├── ProtectedRoute.tsx     # Role-based route authorization guard
│   │   ├── SupportChatWidget.tsx  # Floating interactive support concierge
│   │   ├── ThemeToggle.tsx        # System / Light / Dark theme switch
│   │   └── VoltOpsLoadingMark.tsx # Animated SVG brand loading spinner
│   ├── context/
│   │   ├── AuthContext.tsx        # Global JWT auth, user session, demo state
│   │   └── ThemeContext.tsx       # Dark/Light theme provider with localStorage sync
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AuditLog.tsx               # Enterprise security & action ledger
│   │   │   ├── DispatcherManagement.tsx   # Dispatcher roster & branch assignment
│   │   │   ├── TechnicianVerification.tsx # Credential passport audit & approvals
│   │   │   └── UserManagement.tsx         # User directory & RBAC permissions
│   │   ├── customer/
│   │   │   ├── Checkout.tsx               # Plan subscription & mock payment modal
│   │   │   ├── CustomerInvoices.tsx       # Billing history & invoice receipts
│   │   │   ├── FacilityAssets.tsx         # Building equipment inventory
│   │   │   ├── NewServiceRequest.tsx      # Breakdown submission form
│   │   │   └── RequestHistory.tsx         # Request status & SLA arrival timer
│   │   ├── dispatcher/
│   │   │   ├── DispatchAuditLog.tsx       # Dispatch-specific event history
│   │   │   ├── DispatcherDashboard.tsx    # SLA dispatch board & matching engine
│   │   │   ├── DispatcherSchedule.tsx     # Technician shift calendar
│   │   │   ├── ServiceRequests.tsx        # Incoming customer triage queue
│   │   │   ├── TechnicianRoster.tsx       # Live status & availability map
│   │   │   └── WorkOrders.tsx             # Kanban active job state management
│   │   ├── technician/
│   │   │   ├── LeaveRequests.tsx          # Shift time-off submissions
│   │   │   ├── MyJobs.tsx                 # Mobile job status stepper & sign-off
│   │   │   └── SkillPassport.tsx          # Licensed trades, badges & certifications
│   │   ├── AdminDashboard.tsx      # Admin summary view & recruiter tool
│   │   ├── CustomerDashboard.tsx   # Customer landing overview
│   │   ├── DispatcherDashboard.tsx # Dispatcher main portal overview
│   │   ├── LandingPage.tsx         # Public marketing & dual-theme hero
│   │   ├── Login.tsx               # Auth form with 1-click demo accounts
│   │   ├── NotFound.tsx            # 404 handler
│   │   ├── Register.tsx            # Self-service customer registration
│   │   ├── TechnicianDashboard.tsx # Technician active job summary
│   │   └── Unauthorized.tsx        # 403 Access Denied screen
│   ├── services/
│   │   ├── adminService.ts         # User, staff, and audit API integrations
│   │   ├── authService.ts          # Login, signup, and token exchange
│   │   ├── customerService.ts      # Request creation, assets, billing
│   │   ├── dispatcherService.ts    # Matching engine, work orders, leave
│   │   ├── firebase.ts             # Optional Google OAuth SDK setup
│   │   ├── mockAdminData.ts        # Seed baseline for offline preview
│   │   ├── mockDispatcherData.ts   # Seed baseline for dispatcher simulation
│   │   ├── notificationService.ts  # In-app event emitter
│   │   ├── operationalStore.ts     # Persistent browser storage layer
│   │   ├── subscriptionService.ts  # Plan allowances & billing calculation
│   │   └── technicianService.ts    # Job progression & skill passports
│   ├── types/
│   │   ├── admin.ts                # Admin payload & entity types
│   │   ├── coverage.ts             # Plan, pricing, and SLA types
│   │   ├── dispatcher.ts           # Work order, triage, and matching types
│   │   ├── index.ts                # Core domain types & enums
│   │   ├── notification.ts         # In-app notification types
│   │   └── support.ts              # Helpdesk & chat types
│   ├── App.tsx                     # React Router DOM declarative routing table
│   ├── index.css                   # Tailwind directives & typography layers
│   └── main.tsx                    # React 18 createRoot bootstrap
├── tests/
│   ├── adminService.test.mjs       # Admin CRUD & security fallback tests
│   ├── authService.test.mjs        # Session, token & preview guard tests
│   ├── dispatcherService.test.mjs  # Matching engine & SLA threshold tests
│   └── workflowIntegration.test.mjs# End-to-end multi-role state progression
├── index.html                      # HTML5 entry with preconnected Google Fonts
├── package.json                    # Dependencies, scripts & engine requirements
├── tsconfig.json                   # Strict TypeScript compiler rules
├── vite.config.ts                  # Vite build bundler configuration
└── tailwind.config.js              # Theme colors, container, and animation tokens
```

---

## 4. Local Development Setup

### 4.1 Prerequisites
- **Node.js**: `>= 24.12.0` (LTS recommended)
- **npm**: `>= 10.0.0`

### 4.2 Installation & Server Startup
```bash
# 1. Clone the frontend repository
git clone https://github.com/pranta2003/VoltOps-Frontend.git
cd VoltOps-Frontend

# 2. Deterministically install all dependencies
npm ci

# 3. Configure environment variables
# Windows PowerShell:
Copy-Item .env.example .env
# macOS / Linux:
cp .env.example .env

# 4. Start the Vite development server with hot-module reload
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### 4.3 1-Click Demonstration Accounts
When navigating to `/login`, you can immediately explore any of the 4 role-based portals using the built-in **Demo Preview buttons** (or by logging in with the default seeded password `password123`):

| Role | Demo Credentials | Immediate Access Scope |
|---|---|---|
| **Admin** | `admin@voltops.test` | User directory, credential audits, recruiter CV parser |
| **Dispatcher** | `dispatcher@voltops.test` | SLA triage board, technician matching engine, work order Kanban |
| **Technician** | `technician@voltops.test` | Active job tracker, status progression, trade skill passport |
| **Customer** | `customer@voltops.test` | Service requests, SLA arrival tracking, facility assets, invoices |

---

## 5. Quality Assurance & Verification Gates

The frontend codebase is protected by 3 rigorous continuous integration gates. Every gate can be executed locally:

```bash
# Gate 1: Strict TypeScript Typechecking (0 errors required)
npx tsc --noEmit

# Gate 2: Full Unit & Integration Test Suite (84/84 passing required)
npm test

# Gate 3: Production Rollup Build
npm run build
```

### Test Suite Coverage (84 Passing Tests):
- **Matching Engine Arithmetic:** Evaluates branch proximity (+10 points bonus), secondary-trade competencies, technician availability, and active job queue depth.
- **Credential Validity Safeguards:** Automatically flags and disqualifies technicians with expired licenses, unverified credentials, or suspended passports.
- **Workflow State Transitions:** Enforces strict sequential status advancement (`ASSIGNED` → `TRAVELLING` → `ON_SITE` → `COMPLETED`) and validates sign-off integrity.
- **Offline Preview Isolation:** Verifies that offline simulation mode cleanly handles API failures without data corruption or silent fallback masking.

---

## 6. Related Repositories & Resources

- **Backend API Repository:** [https://github.com/pranta2003/VoltOps-Backend](https://github.com/pranta2003/VoltOps-Backend)
- **Live Vercel Application:** [https://voltops-frontend.vercel.app](https://voltops-frontend.vercel.app)
- **SDP-4 Project Plan:** [`PROJECT_PLAN.md`](PROJECT_PLAN.md)
- **Implementation Progress Ledger:** [`docs/IMPLEMENTATION_PROGRESS.md`](docs/IMPLEMENTATION_PROGRESS.md)

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=0:0f172a,50:10b981,100:06b6d4&height=120&section=footer" width="100%" alt="VoltOps Footer Wave" />
</div>
