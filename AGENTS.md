# AGENTS.md — VoltOps Persistent Project Instructions

This file is the persistent source of truth for all AI coding assistants, agentic tools, and contributors working on **VoltOps**. Follow these directives strictly across all sessions.

---

## 1. Project Identity & Architecture

- **Name**: VoltOps
- **Domain**: B2B Commercial Field Service & Emergency Technician Coordination Platform.
- **Frontend Architecture**:
  - React 18 (`^18.3.1`) + TypeScript (`^5.6.2`) + Vite (`^5.4.8`) + Tailwind CSS (`^3.4.13`).
  - React Router DOM (`^6.26.2`), Axios (`^1.7.7`), Socket.io Client (`^4.8.0`).
  - Global authentication state in `src/context/AuthContext.tsx`.
  - Global theme state (`light`, `dark`, `system`) in `src/context/ThemeContext.tsx`.
  - Role-based route guards in `src/components/ProtectedRoute.tsx`.
  - Shared internal dashboard shell in `src/components/Layout.tsx`.
- **Backend Architecture & URL**:
  - Separate repository.
  - API base URL configured via `VITE_API_URL` environment variable (`src/api/axios.ts`).
  - Local default: `http://localhost:5000/api`.
  - **Remote backend repository URL is currently unrecorded** in this repository (placeholder in `README.md`). Never invent or guess a remote backend URL.

---

## 2. Core Business Workflow & AI Boundaries

### Operational Lifecycle
1. **Customer** submits a service request for a facility breakdown.
2. **Dispatcher** reviews the request and validates facility coverage/SLA.
3. **Work Order** is created with required trade, priority, and arrival target.
4. **Matching Engine** computes eligible technicians based on hard rules (skills, branch, status, certifications) and arithmetic match scores.
5. **Human Dispatcher** makes the final assignment decision (AI is advisory only).
6. **Technician** receives the assignment, updates job progress (`TRAVELLING` → `ON_SITE` → `COMPLETED`).
7. **Customer / Admin** verifies on-site sign-off.
8. **Invoice & Payment** generated using exact deterministic templates and calculations.

### AI Integration Boundaries
- **Permitted AI Use Cases**:
  1. *Technician Match Explanation*: Generates plain-English explanations of why a technician was scored/ranked.
  2. *Recruitment Screening*: Extracts structured skills/certifications from pasted candidate CV text against vacancy criteria.
- **Strictly Prohibited AI Use Cases**:
  - Never allow AI to automatically dispatch or assign technicians without human confirmation.
  - Never allow AI to make hiring/shortlisting decisions.
  - Never allow AI to compute or draft financial invoices or calculate billing totals.

---

## 3. Canonical Service Categories (7 Supported Trades)

All forms, work orders, technician skill passports, schedules, matching rules, and billing items must strictly use these 7 standardized categories:

1. **Electrical and power systems**
2. **AC, HVAC, and cooling**
3. **CCTV and security**
4. **Internet, networking, and hardware**
5. **IT and software support**
6. **Plumbing and water systems**
7. **Facility maintenance**

> **Rule**: Keep category identifiers, database enums, and UI labels identical across the stack. Reuse shared types/constants (`src/types/index.ts`) instead of redefining string literals.

---

## 4. Coverage Plans & SLA Commitments

- **8-Hour Daily Coverage (Plan A)**: Defined daily operational window; **no physical arrival SLA**.
- **24/7 Standard (Plan B)**: Round-the-clock coverage with a **40-minute physical arrival SLA**.
- **24/7 Priority (Plan C)**: Round-the-clock priority coverage with a **20-minute rapid physical arrival SLA** (2× faster).
- **Custom Coverage (Plan D)**: Bespoke shift schedules for enterprise complexes; negotiated terms with **no invented price or arrival SLA**.

> **Important SLA Rules**:
> - *"Arrival SLA"* strictly means **physical arrival of a certified technician on site**, not email acknowledgment and not repair completion.
> - Never invent fake customer names, corporate testimonials, ratings, certification authority claims, or mock live-tracking telemetry.

---

## 5. Team Ownership & Responsibilities

| Teammate | Git Branch | Primary Module Ownership |
|---|---|---|
| **Pranta** | `pranta` | Project Lead, system integration, architectural review, PR approvals. |
| **Bani** | `bani` | Dispatcher dashboard, service requests, work orders, technician matching & assignment, scheduling, leave approvals, audit log, in-app notifications. |
| **Limon** | `limon` | Registration & admin foundation, staff/technician/customer management, recruitment screening. |
| **Prity** | `prity` | Customer requests & arrival tracking, technician dashboard & jobs, invoices & payments, customer assets, schedule, leave requests. |

> **Critical Note on Limon**: **Limon** is the official teammate and branch name (`limon`). Do **not** use `meshba` or `mesbah` as a branch or teammate name. Do not create a second branch for Limon.
> **Collaboration Rule**: Coordinate with the assigned owner before modifying another teammate's module or shared root files (`src/App.tsx`, `src/components/Layout.tsx`, `src/types/index.ts`, `src/api/axios.ts`).

---

## 6. Git Branching & Contribution Workflow

### Branch Structure
- `main` — Protected stable integration branch. **Never push directly to `main`**.
- `pranta` — Pranta's working branch (must branch off `main`).
- `bani` — Bani's working branch (must branch off `main`).
- `limon` — Limon's working branch (must branch off `main`).
- `prity` — Prity's working branch (must branch off `main`).

*Note on current branch state*: As of October 2026, the four personal branches (`pranta`, `bani`, `limon`, `prity`) have not yet been created on remote or local; active development has taken place on feature branches and `main`. When creating them, branch directly from `main`.

### Session Protocol for Every Agent & Contributor
1. **Check Status**: Run `git status` and `git fetch origin` before making any edits.
2. **Confirm Branch**: Verify active branch (`git branch --show-current`). Ensure you are on the intended personal or feature branch.
3. **Preserve Work**: Never discard, reset, or overwrite uncommitted changes without explicit confirmation.
4. **Selective Staging**: Stage only intentional files (`git add <file>`); inspect `git diff --cached` before committing.
5. **Build Verification**: Run `npm run build` (`tsc && vite build`) before committing and before opening any Pull Request.
6. **Pull Requests**:
   - Target is `main`.
   - Review the complete diff for unintended changes, secrets, or stray debug code.
   - Personal branches are permanent team branches and must **never be deleted** after merge.
7. **No Destructive Commands**: Never run `git push --force`, `git reset --hard`, or `git clean -fd` without explicit authorization.

### Permanent Git Commit & Workflow Expectation (All Agents & Contributors)
- **Daily Commit Target**: For every full productive coding day, target a minimum of **30 meaningful commits** (preferred target: **40 meaningful commits**).
- **Incremental Commit Rhythm**: Commits must be made progressively throughout development—never saved up into a massive batch at the end of the session.
- **Genuine Units of Work**: Every commit must represent an atomic, coherent, verifiable unit of work (e.g. table simplification, chart layout fix, token definition, test addition).
- **Conventional Commits**: Strictly use standard conventional commit prefixes: `feat:`, `fix:`, `refactor:`, `style:`, `test:`, `docs:`, `chore:`.
- **Integrity First — No Artificial Inflation**:
  - Empty commits, duplicate commits, artificial file touches, splitting one trivial edit across multiple commits, or revert loops are strictly prohibited.
  - If a specific small task genuinely contains only a few independent steps, commit honestly and explain the count; never compromise code quality or commit history to chase a number.
- **Documentation Accounting**: Maintain daily accounting and commit hash ledgers in `docs/IMPLEMENTATION_PROGRESS.md`.

---

## 7. Design & Engineering Standards

- **Internal Dashboards**:
  - Must adhere to a clean, structured, enterprise B2B aesthetic.
  - Primary brand tokens: `#1F4B5B` (`bg-brand`), hover `#153742` (`bg-brand-dark`), accent `#3D7186`.
  - Status semantic tokens: Available `#1E824C`, Busy `#C97A1B`, Offline `#6B7280`, Danger `#B3261E`.
  - **Do NOT** apply marketing landing-page effects (intense glassmorphic blurs, floating continuous card animations, glowing radial halos) to internal operational dashboards unless explicitly requested.
- **Theme Preservation**: Maintain compatibility with `ThemeContext` (support both light and dark styles without breaking text contrast).
- **Component & Type Reuse**:
  - Reuse shared types in `src/types/index.ts`.
  - Reuse icons from `src/components/Icons.tsx`.
  - Use `src/api/axios.ts` for all HTTP requests (automatic JWT attachment and 401 handling).
- **Authenticity**: Never claim an API endpoint or backend feature is working unless verified with actual network tests or backend responses.

---

## 8. Verified Repository Documentation Links

- [README.md](file:///e:/BUBT-CSE-4th%20yr/SDP-4/VoltOps/voltops-frontend/voltops-frontend/README.md) — Frontend installation, setup, test accounts, and Bengali Git guidelines.
- [PROJECT_PLAN.md](file:///e:/BUBT-CSE-4th%20yr/SDP-4/VoltOps/voltops-frontend/voltops-frontend/PROJECT_PLAN.md) — SDP-4 course milestone alignment, screen inventory, brand palette, and roadmap.
- **`VOLTOPS_FRONTEND_IMPLEMENTATION_ADDENDUM.md`** — *Status: Currently MISSING from this repository.* If this specification exists in another repository or doc share, it should be committed to the root directory for full tracking.

