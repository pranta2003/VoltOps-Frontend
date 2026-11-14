# VOLTOPS — GLOBAL UI/UX DESIGN SYSTEM & FUTURE MODULE DESIGN CONTRACT

**Document Version:** 2.0.0 (Milestone 2.1.4 Enforcement)  
**Date:** 11 November 2026  
**Status:** Mandatory Engineering & Design Contract  
**Applies To:** All Frontend Modules (`Admin`, `Dispatcher`, `Technician`, `Customer`)  
**Design Reference Peers:** Linear, Stripe Dashboard, Vercel Dashboard, ServiceNow, Jobber

---

## 1. Executive Summary & Core Principle

VoltOps is an enterprise B2B field-service coordination platform. Its user interface must be **fast, high-density, minimal, and operationally scannable**. 

> [!IMPORTANT]
> **The Core Rule: "Show Information, Not Explanations."**
> - Operators understand their domain. Do not treat them like trainees.
> - Never include long descriptive paragraphs, policy reminders, or redundant labels on operational screens.
> - Secondary metadata belongs in inspection drawers or modals, never crammed into primary table rows.

---

## 2. Page Hierarchy & Layout Contract

### 2.1 Page Header Rules
- **Title**: Exactly one concise title per screen (`Technicians`, `Users`, `Audit Log`, `Admin Console`, `Service Requests`). Max 2–3 words.
- **Subtitle**: Strictly optional. Avoid whenever the title is self-explanatory. Never exceed 8–10 words.
- **Header Actions**: Max 1 primary action button (`+ Create Staff`, `+ New Request`) and optional 1 compact secondary action (`Export JSON`, `Refresh`).
- **Sub-Header Toolbar**:
  - Left: Compact entity count summary (`5 total registered`, `2 pending review`).
  - Right: Connection badge (`Live API` / `Offline data`) with colored pulse dot, and a compact refresh button (`RefreshCwIcon`).

### 2.2 Good vs. Bad Header Patterns
| Anti-Pattern (BAD) | Mandatory Pattern (GOOD) |
|---|---|
| `"System Audit & Security Event Ledger"` | `"Audit Log"` |
| `"Immutable chronological audit trail recording administrative decisions..."` | *(Omit subtitle entirely)* |
| Large banner: `"Non-Repudiation Standard: Administrative decisions are logged..."` | *(Omit banner. Display timestamp/actor in record)* |
| `"Backend server offline. Displaying offline technician passport baseline."` | Compact status pill: `Offline data` |

---

## 3. Design Tokens & Visual Hierarchy

### 3.1 Color Palette
- **Canvas (`--bg-base`)**: Light `#F8FAFC` (Slate 50) | Dark `#0B1117` (Deep Obsidian).
- **Surface / Card (`--bg-surface`)**: Light `#FFFFFF` (Pure White) | Dark `#111827` (Midnight Slate).
- **Secondary Surface (`--bg-surface-2`)**: Light `#F1F5F9` (Slate 100) | Dark `#16202C` (Raised Panel).
- **Borders (`--border`)**: Light `#E2E8F0` (Slate 200) | Dark `#1E293B` (Muted Slate).
- **Text Primary (`--text-primary`)**: Light `#0F172A` (Slate 900) | Dark `#F8FAFC` (Slate 50).
- **Text Muted (`--text-muted`)**: Light `#64748B` (Slate 500) | Dark `#94A3B8` (Slate 400).
- **Brand Accent (`--accent`)**: `#10B981` (Emerald 500) with hover `#059669` / `#34D399`.

### 3.2 Typography Scale
- **Page Titles**: `font-heading font-semibold text-base sm:text-lg tracking-tight`.
- **Card / Modal Headings**: `font-heading font-semibold text-sm sm:text-base`.
- **Primary Data / Table Row Names**: `font-medium text-xs sm:text-sm text-[var(--text-primary)]`.
- **Metadata / Secondary Text**: `text-xs text-[var(--text-secondary)]` or `text-[11px] text-[var(--text-muted)]`.
- **Identifiers / IPs / License Numbers**: `font-mono text-xs` or `text-[11px]`.

### 3.3 Card Usage Rules
- **Do NOT wrap every piece of text in a card**.
- Use cards only for semantic grouping: metric cards, table containers, and modal dialogs.
- Avoid nested card layouts (cards inside cards inside cards).

---

## 4. Tables & Data Display Patterns

Every data table must strictly adhere to the following structure:
1. **Container**: `rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden w-full max-w-full`.
2. **Scroll Wrapper**: `overflow-x-auto w-full`.
3. **Table Element**: `<table className="w-full text-left text-xs">`.
4. **Header (`<thead>`)**:
   - `bg-[var(--bg-surface-2)] text-[var(--text-muted)] uppercase tracking-wider text-[11px] font-semibold border-b border-[var(--border)]`.
   - Padding: `py-2.5 px-4`.
5. **Row Cells (`<tbody>`)**:
   - Padding: `py-3 px-4`.
   - Hover state: `hover:bg-[var(--bg-surface-2)]/60 transition-colors`.
   - Initials Avatar: 32px circular container (`w-8 h-8 rounded-full bg-[var(--bg-surface-2)] border font-bold text-[11px]`).
   - Status Badge: Compact pill with 6px dot (`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium`).
   - Actions: Single contextual button (`Review` for pending actions; `Inspect` or `View` for record review).
6. **Pagination**:
   - Compact footer: `py-2.5 px-4 border-t border-[var(--border)] bg-[var(--bg-surface-2)] flex items-center justify-between text-xs text-[var(--text-muted)]`.
   - Left: `Showing X–Y of Z`.
   - Right: Compact `Previous`, `X / Y`, `Next` buttons with `.btn-press`.

---

## 5. Filters & Search Patterns

- Toolbars must be **compact single-line rows** on desktop and stack cleanly on mobile:
  - Search input: `relative flex-1 min-w-[200px]` with `SearchIcon` and `XIcon` clear trigger.
  - Category / Trade Filters: Clean native `<select>` dropdowns (`px-3 py-1.5 rounded-lg border text-xs`). Never wrap 8 bulky buttons across multiple lines!
  - Status Filter: Compact segmented control (`p-0.5 rounded-lg border bg-[var(--bg-surface-2)]` with `px-2.5 py-1 text-xs`).

---

## 6. Modals, Drawers & Forms

- **Dialog Shell**: `role="dialog" aria-modal="true" aria-labelledby="..." className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"`.
- **Card Width**: `max-w-md` or `max-w-lg` with `max-h-[90vh] overflow-y-auto`.
- **Focus Restoration**: Must record trigger via `lastFocusedTriggerRef` and restore focus upon modal dismissal.
- **Keyboard Dismissal**: Global `Escape` listener dismisses dialog.
- **Form Controls**:
  - Labels: Explicit `htmlFor` matching input `id`.
  - Inputs: `px-3 py-2 rounded-lg border text-xs bg-[var(--bg-surface-2)] focus:border-[#10b981]`.
  - Confirmation Prompts: Critical state changes (deactivation, credential rejection) require explicit two-step confirmation cards.

---

## 7. Global Theme & Motion Standards

### 7.1 Two-State Theme System
- Only two states: `light` (default) and `dark`.
- Controlled via a single Sun/Moon icon toggle (`ThemeToggle.tsx`).
- Persisted in `localStorage.getItem("voltops-theme")`.
- No separate theme state in individual modules.
- Anti-flash script in `index.html` guarantees light mode default.

### 7.2 Motion Standards
- Tactile button press: `.btn-press` (`active:scale-[0.97]`).
- Modal & alert entrance: `.animate-fade-in` (`0.18s cubic-bezier(0.16, 1, 0.3, 1)`).
- Icon hover micro-interactions (`group-hover:rotate-45`, `group-hover:scale-110`).
- No continuous floating or bouncing animations on operational dashboards.
- Reduced motion support via `@media (prefers-reduced-motion: reduce)`.

---

## 8. Reusable Pre-Release Review Checklist

Before any future page (Dispatcher, Technician, Customer) is accepted, it must pass this 10-point checklist:

- [ ] **1. Title Conciseness**: Is the title max 2–3 words with no redundant subtitle?
- [ ] **2. No Policy Banners**: Are verbose policy/instruction banners completely eliminated?
- [ ] **3. Proportional Alerts**: Are network/offline statuses shown as compact badges with retry icons?
- [ ] **4. Compact Toolbar**: Are search and filters consolidated into a compact row without wrapped pill clutter?
- [ ] **5. Scannable Table**: Are columns clearly aligned with avatars, mono IDs, compact dot status pills, and single contextual actions?
- [ ] **6. Secondary Detail Offloading**: Is extended context moved to a clean inspection drawer/modal?
- [ ] **7. Responsive Safety**: Does the document have zero horizontal overflow across 1440px, 1280px, 768px, and 390px (verified via `emulate` device metrics)?
- [ ] **8. Theme Integrity**: Does the page render cleanly in both Light and Dark modes using shared semantic tokens?
- [ ] **9. Accessibility**: Are dialogs dismissible via `Escape`, focus restored to the trigger button, and labels mapped to input IDs?
- [ ] **10. Functional Fidelity**: Are all API contracts, validation rules, error boundaries, and state changes genuine?
