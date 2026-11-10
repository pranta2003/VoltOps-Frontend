# VOLTOPS — DESIGN AUDIT (FIGMA SOURCE OF TRUTH)
**Document Status**: Formal Specification & Source-of-Truth Audit  
**Audit Date**: 10 November 2026  
**Auditor**: Lead Frontend Engineering Agent (Pair Programming with Pranta)  
**Source Artifact**: `Dispatcher Dashboard.fig` (Figma Kiwi Archive v106, 4.4MB unpacked)  
**Associated Web URL**: https://www.figma.com/design/10GU6sOOBTGe9v5BCfyLa1/Dispatcher-Dashboard  
**Referenced Prototype**: https://powder-swirl-55357893.figma.site/  

---

## 1. Executive Summary & Page Inventory

The local Figma source archive `Dispatcher Dashboard.fig` was unpacked and decompresssed (Kiwi binary v106, Zstandard data stream). It contains three top-level Figma pages:

1. **`VOLTOPS — DEV` (formerly Page 1)**: The developer documentation and audited handoff page created by the Figma dev agent, consisting of 15 audited documentation boards (`00` through `14`).
2. **`Page 1`**: Renamed/reorganized to host the audited handoff frames and screen references.
3. **`mesbah work`**: A reference page containing text node `60:78` referencing the published prototype URL.

The document contains **six editable functional screens** and **one partial shell**:

| # | Screen Name in Figma | Original Frame Node | Role | Canvas Geometry | Purpose in VoltOps Workflow |
|---|---|---|---|---|---|
| 1 | **Dispatcher Dashboard** | `Frame 1` (`10:162`) | Dispatcher / Admin | 1440 × 1024 px | Central operations board: metrics, urgent request alerts, active work order table with assignment action. |
| 2 | **Service Requests List** | `Frame 2` (`27:489`) | Dispatcher | 1440 × 1024 px | Incoming breakdown queue: search, filters (Status, Priority, Date), View request action, and `+ New work order`. |
| 3 | **Service Request Detail / Conversion** | `Frame 3` (`27:576`) | Dispatcher | 1440 × 1024 px | Detail inspection of SR-001 (Overheating Transformer), customer contact, SLA countdown (38m), `Convert to work order`, `Cancel`. |
| 4 | **Customer My Requests** | Embedded `27:658` | Customer | 1440 × 1024 px (nested) | Customer request history table (SR-1024, SR-1021, SR-1018) with status, priority, and date. |
| 5 | **Customer New Service Request** | `Customer new request` | Customer | 1440 × 1024 px | Commercial breakdown submission form: 7-category selection, equipment/asset selector, priority radio cards, date/time picker, description. |
| 6 | **Technician My Jobs** | `Technician jobs` | Technician | 1440 × 1024 px | Field technician daily job roster: tabbed navigation (All, Today, Upcoming, Completed), search, status updater (`Update Status`, `View`). |
| 7 | **Customer Invoice & Payment** | `Customer invoice` | Customer / Admin | 1440 × 1024 px | Commercial invoice breakdown for WO-2048, itemized labor & parts, payment status (Payment due / Unpaid), `Pay Now` and `Download Invoice`. |
| 8 | *Technician Portal Shell* | Nested shell | Technician | Partial / Nav only | Demonstrates sidebar navigation and `Switch workspace` link. No full dashboard body. |

---

## 2. Visual Specifications & Design Primitives

### 2.1 Color Tokens & Palettes (Dual Theme Foundation)

The Figma light mode uses two distinct visual families across the shells:

#### A. Dispatcher Shell Tokens (Figma Light Source)
- **Canvas / Page Background**: `#F5F7FA` (Cool neutral gray-blue)
- **Sidebar Background**: `#1B3644` (Deep navy slate; matches VoltOps brand-dark)
- **Sidebar Text**: `#BAC9CE` (inactive), `#FFFFFF` (active item)
- **Sidebar Profile Card**: `#164275` (Deep navy accent)
- **Card & Table Surface**: `#FFFFFF`
- **Primary Text / Heading**: `#172B33` (Deepest slate)
- **Secondary Text / Table Body**: `#2D6351` and `#5A6B72`
- **Borders & Dividers**: `rgba(0, 0, 0, 0.08)` / `#E5E7EB` (typically 1px or 0.666px)
- **Primary Action (Brand Green / Teal)**: `#1FAB7C` / `#227248` (Conversion / Submit / Assign)
- **Secondary Action (Brand Navy)**: `#1764BB` (Action pills at 34% tint)
- **Cancel / Outline Action**: Border `#216943`, text `#216943`

#### B. Priority Semantic Tokens (Observed in Figma)
- **Urgent**: Pill background `#F2160F` at 53% opacity / `#FA4C4C` at 72%; text `#FFFFFF` or dark red.
- **High**: Pill background `#F48F0B` at 90% / `#E9BA55` at 76%.
- **Medium**: Pill background `#106AB9` at 64% / `#1764BB` at 34%.
- **Low**: Pill background `#D9D9D9` / `#537AA7` at 25%.

#### C. Status Semantic Tokens (Observed in Figma)
- **Unassigned / New**: Background `#F2160F` at 39% or red tint.
- **Assigned / In Progress**: Background `#1764BB` at 34% or `#1FAB7C` at 31%.
- **Completed / Converted**: Background `#1FAB7C` at 31% / `#55AE83` at 60%.
- **Reviewing**: Background `#E9BA55` at 52%.
- **Payment Due / Unpaid**: Background `#EA2A2A` at 12%; text `#E62C2C`.

#### D. Dark Theme Mapping (Derived from VoltOps Landing Page)
To maintain 100% brand coherence between the public landing page and internal portals:
- **Dark Canvas (`--bg-base`)**: `#06090E`
- **Dark Surface (`--bg-surface`)**: `#0E141D`
- **Dark Surface Elevated (`--bg-surface-2`)**: `#16202C`
- **Dark Border (`--border`)**: `rgba(255, 255, 255, 0.10)`
- **Dark Primary Brand**: `#10B981` (Emerald accent) and `#3D7186` (Teal accent)
- **Dark Text Primary**: `#FFFFFF` / `#F8FAFC`
- **Dark Text Secondary**: `#94A3B8` / `#CBD5E1`

---

### 2.2 Typography & Spacing Hierarchy

The font family across all Figma frames is **Inter**:

- **Page Titles**: 27px Regular / 32.4px line-height (Portal) or 32px Bold / Auto (Dispatcher).
- **Brand / Account Names**: 20px Bold / 30px line-height (VoltOps) or 24px Bold (Dispatcher header).
- **Navigation Items**: 14px Semi Bold or Regular / 21px line-height.
- **Sub-navigation / Portal Badges**: 10px Bold / 15px line-height with `+1.2px` letter-spacing.
- **Metric Cards**: Label 15px Bold; Value 32px Bold.
- **SLA Countdown**: 36px Bold.
- **Table Headers & Cell Text**: 14px Medium / 16px Bold.
- **Buttons / Actions**: 12px Semi Bold / 18px line-height.
- **Disclaimers / Badges**: 8px to 10px Regular / 12px to 15px line-height.

---

## 3. Screen-by-Screen Detailed Audit & Route Mapping

### 3.1 Screen 1: Dispatcher Dashboard (`Frame 1`)
- **Route**: `/dispatcher`
- **Role**: `DISPATCHER` (and `ADMIN`)
- **Header**: Search bar (width 300px), Notification bell with unread badge, Settings icon, User initials badge (`AD` — Admin/Dispatcher).
- **Sidebar (260px)**:
  - Brand: VoltOps logo mark + text
  - Links: `Dashboard` (active), `Service Requests`, `Work Orders`, `Technicians`, `Schedule`, `Notifications`
  - Footer: User profile name (`Admin User`), role (`DISPATCHER`), `Sign out` action.
- **Metric Cards (Row of 4)**:
  1. Total Requests Today
  2. Open Work Orders
  3. Available Technicians
  4. SLA At Risk / Critical countdown
- **Urgent Requests Alert Banner**: Highlights requests requiring immediate conversion and technician dispatch.
- **Active Work Orders Table**: Columns for `Work Order ID`, `Customer`, `Trade / Asset`, `Priority`, `Status`, `SLA Countdown`, `Action` (`Assign` or `View`).
- **Interactive Affordances**:
  - Clicking `Assign` triggers the Technician Candidate Matching modal/drawer.
  - Clicking `View all` routes to `/dispatcher/work-orders` or `/dispatcher/requests`.

### 3.2 Screen 2: Service Requests Queue (`Frame 2`)
- **Route**: `/dispatcher/requests`
- **Role**: `DISPATCHER`, `ADMIN`
- **Controls**: Search input (`Search request by customer, asset, ID...`), Filters: `Status: All`, `Priority: All`, `Date: All`, Primary Button: `+ New work order`.
- **Data Table**:
  - Columns: `Request ID`, `Customer`, `Asset / Equipment`, `Problem Summary`, `Priority`, `Status`, `Action`.
  - Actions: `View` (navigates to `/dispatcher/requests/:id`).
- **States**: Filtered results, empty search state, loading skeleton.

### 3.3 Screen 3: Service Request Detail & Work Order Conversion (`Frame 3`)
- **Route**: `/dispatcher/requests/:id`
- **Role**: `DISPATCHER`, `ADMIN`
- **Left Column**:
  - Breadcrumb: `← Back to service requests`
  - Request summary: `SR-001` — Overheating Transformer
  - Detailed issue description
  - Category / Trade: `Electrical and power systems`
  - Customer contact details & facility address (`ABC Manufacturing Ltd`, industrial park)
  - Preferred service window
- **Right Column**:
  - SLA Arrival Target countdown timer (e.g. `38 min remaining`)
  - Target arrival deadline
  - Matching recommendation teaser
- **Action Buttons**:
  - `Cancel` (Dismisses or marks rejected)
  - `Convert to work order` (Opens technician assignment engine)

### 3.4 Screen 4: Customer Dashboard & Requests History (Nested in Embed `27:658`)
- **Route**: `/customer`
- **Role**: `CUSTOMER`
- **Header**: Portal branding `VoltOps · Customer portal`, User initials (`AM` — Arif Mahmud, ABC Manufacturing).
- **Sidebar (260px)**: `My Requests` (active), `New Request`, `Invoice & Payment`, `Help & Support`, `Switch workspace`.
- **Content**:
  - Summary metrics: Active Requests, Scheduled Visits, Unpaid Invoices.
  - Requests Table: `SR-1024`, `SR-1021`, `SR-1018` with Priority, Status (`In Review`, `Technician Dispatched`, `Completed`), and timestamp.

### 3.5 Screen 5: Customer New Service Request Form (`Customer new request`)
- **Route**: `/customer/new-request`
- **Role**: `CUSTOMER`
- **Form Fields**:
  1. **Canonical Service Trade Selection** (All 7 standard categories supported via grid cards / dropdown):
     - Electrical and power systems
     - AC, HVAC, and cooling
     - CCTV and security
     - Internet, networking, and hardware
     - IT and software support
     - Plumbing and water systems
     - Facility maintenance
  2. **Asset / Facility Equipment**: Pre-populated customer equipment selector (e.g. `Generator G-01`, `Chiller Unit 2`).
  3. **Issue Title & Problem Description**: Multi-line textarea for symptom breakdown.
  4. **Priority Radio Selection**: `Urgent (20-40m SLA)`, `High`, `Medium`, `Low`.
  5. **Preferred Date & Arrival Time**: Calendar date and time window selector.
- **Actions**: `Cancel`, `Submit Service Request`.

### 3.6 Screen 6: Field Technician My Jobs (`Technician jobs`)
- **Route**: `/technician`
- **Role**: `TECHNICIAN`
- **Header**: `VoltOps · Technician portal`, User initials (`RH` — Rafiqul Hasan).
- **Tabs**: `All`, `Today`, `Upcoming`, `Completed`.
- **Job Cards / Table**:
  - Work Order ID (e.g. `WO-2048`, `WO-2047`, `WO-2042`)
  - Customer & Facility Location
  - Required Trade & Asset (e.g. `Electrical Service & Maintenance`)
  - Priority badge & SLA arrival countdown
  - Progress Status: `Assigned`, `Travelling`, `On Site`, `Completed`
  - Action: `Update Status` (Interactive progress transition modal) and `View Details`.

### 3.7 Screen 7: Customer Invoice & Payment (`Customer invoice`)
- **Route**: `/customer/invoices` and `/customer/invoices/:id`
- **Role**: `CUSTOMER`, `ADMIN`
- **Content**:
  - Reference Work Order: `WO-2048`
  - Bill-To Customer: `ABC Manufacturing Ltd`
  - Line Items: Itemized diagnostic inspection, replacement parts, labor hours.
  - Payment Totals: Subtotal, Tax/VAT, Total Amount Due.
  - Payment Status: `Payment due` / `Unpaid` badge.
  - Action: `Pay Now` (with modal disclaimer: *Payment preview only. No real transaction processed*), `Download Invoice` (PDF / Print view).

---

## 4. Ambiguities, Gaps & Architectural Decisions

| Observed Figma Ambiguity | Engineering Resolution in VoltOps Frontend |
|---|---|
| **Admin vs. Dispatcher Screen Distinction**: Figma shows `Admin User (AD)` on the Dispatcher Dashboard without a dedicated admin user management screen. | Implement dedicated `/admin` with tabs for `User Management`, `Technicians Directory`, `Service Categories Config`, `Audit Trail`, and `System Notifications`, while allowing Admin to access `/dispatcher`. |
| **Inconsistent Request & WO IDs**: Figma has `SR-001`–`SR-004` on Frame 2 and `SR-1024` on the customer embed; `WO-1024` on Frame 1 and `WO-2048` on Technician. | Harmonize unified schema in `src/types/index.ts`: Standardize sequence (`SR-1001+`, `WO-2001+`) across all role stores and mock data layers. |
| **Customer Name Variations**: `ABC Factory`, `ABC Facory`, `ABC Manufacturing Ltd`. | Normalize in mock data to `ABC Manufacturing Ltd` with fixed asset relationships (`Generator G-01`, `Transformer T-04`, `Central Chiller C-02`). |
| **Missing Screens**: No matching engine algorithm dialog, no customer tracking map, no technician certification upload screen in Figma. | Build clean, enterprise modal/drawer components adhering to Section 7 & Section 8 rules: matching engine modal with arithmetic score display, SLA timer countdown, and status tracker. |
| **Dual-Theme Support**: Figma designs are light mode only; dark mode was not designed in Figma. | Dark mode visual system is mapped directly from the **VoltOps Landing Page design tokens** (`#06090e`, `#0e141d`, emerald `#10b981`, borders `rgba(255,255,255,0.1)`), guaranteeing a cohesive enterprise platform across both modes. |

---

## 5. Implementation Mapping to React Architecture

```text
src/
├── components/
│   ├── Layout.tsx               # Unified B2B dashboard shell (Sidebar + Topbar + Theme Selector)
│   ├── ProtectedRoute.tsx       # Role-based route guard
│   ├── ThemeToggle.tsx          # Dual/System theme switcher widget
│   ├── Icons.tsx                # Standardized SVG icons
│   └── ui/                      # Reusable UI primitives (Badges, Buttons, Tables, Modals, Forms)
├── context/
│   ├── AuthContext.tsx          # Current session, role switching, token storage
│   └── ThemeContext.tsx         # Light / Dark / System persistent theme state
├── pages/
│   ├── LandingPage.tsx          # Public marketing & subscription plans
│   ├── Login.tsx                # Unified login
│   ├── Register.tsx             # Customer registration (with Plan A/B/C/D selection)
│   ├── admin/
│   │   ├── AdminDashboard.tsx   # Admin overview, users, technician oversight, audit log
│   │   └── UserManagement.tsx   # User directory and permissions
│   ├── dispatcher/
│   │   ├── DispatcherDashboard.tsx # Frame 1 operations board
│   │   ├── ServiceRequestsList.tsx # Frame 2 queue
│   │   ├── ServiceRequestDetail.tsx# Frame 3 conversion & SLA countdown
│   │   └── TechnicianMatchingModal.tsx # Core matching engine dialog
│   ├── customer/
│   │   ├── CustomerDashboard.tsx   # Frame 4 requests overview
│   │   ├── NewServiceRequest.tsx   # Frame 5 7-category breakdown form
│   │   ├── RequestTracking.tsx     # Work order status & technician arrival SLA tracker
│   │   └── CustomerInvoices.tsx    # Frame 7 itemized invoice & payment preview
│   └── technician/
│       ├── TechnicianDashboard.tsx # Roster, active job status updater
│       └── JobDetailModal.tsx      # Diagnosis notes & completion sign-off
└── types/
    └── index.ts                 # Canonical service categories, roles, work orders, invoices
```
