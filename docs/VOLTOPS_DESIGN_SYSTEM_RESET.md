# VOLTOPS — GLOBAL UI/UX DESIGN SYSTEM RESET & ARCHITECTURE SPECIFICATION

**Document Version:** 1.0.0  
**Date:** 11 November 2026  
**Status:** Approved Architectural Direction  
**Author:** Lead Frontend Architect (Pranta's Lead Team)  
**Target Systems:** `VoltOps-Frontend` (Shared Design Tokens, Layout, Theme Context, Admin Screens)

---

## 1. Executive Summary & Problem Identification

An exhaustive visual and UX audit of the current VoltOps frontend implementation revealed critical design regressions that undermine the product's enterprise B2B presentation:

### Identified Deficiencies
1. **Excessive Text & Explanatory Clutter**: Pages contain explanatory paragraphs, policy reminders, and repetitive labels ("Strict credential auditing across all 7 canonical trades before dispatch matching eligibility") that treat users like trainees rather than professional operators.
2. **Oversized Information Banners**: Giant integration notices, status alerts, and promotional-style cards dominate the viewport, pushing operational data below the fold.
3. **Filter Fragmentation & Vertical Inefficiency**: The 7 canonical trade filter bar rendered 8 separate pill buttons wrapping across 2-3 lines of vertical space, pushing tables off-screen on standard laptop viewports.
4. **Horizontally Crowded Tables**: Table cells crammed multiple lines of metadata (license, authority, expiry, document status, contact numbers) into single cells, causing visual exhaustion.
5. **Theme Selector Over-Engineering**: The visible three-option segmented control (`Light | Dark | System`) introduced unnecessary UI noise in top headers.
6. **Inconsistent Iconography**: Unstandardized emoji icons (🔍, 🔄, ✕, ⚡, ⏳) mixed with custom SVGs, degrading visual polish.

---

## 2. Global SaaS Design Philosophy

VoltOps is transitioning to a **clean, high-density, modern B2B SaaS aesthetic** aligned with industry leaders (**Linear, Stripe Dashboard, Vercel Dashboard**).

### Core Rule: "Show Information, Not Explanations"
- **Operational Clarity**: Operators know why they are on a screen. Avoid explanatory tutorials.
  - *Previous*: "Strict credential auditing across all 7 canonical trades before dispatch matching eligibility."
  - *New*: **"Technicians"** (with subtle count badge `N total`).
  - *Previous*: "Backend server offline. Displaying offline technician passport baseline."
  - *New*: **"Offline data"** (compact dot badge).
- **Secondary Detail Offloading**: Keep primary lists and tables scannable. Offload full passport documents, issuing authority details, and audit history into clean modals or slide-over inspection drawers.
- **Micro-Interactions**: Interactive elements should feel tactile through subtle hover elevation, active scale feedback (`active:scale-[0.98]`), and smooth color transitions without distracting continuous motion.

---

## 3. Global Design Tokens & Color Palette

### Light Theme (Default)
- **Base Background**: `#F8FAFC` (Slate 50 — clean, crisp, neutral SaaS canvas).
- **Surface / Card Background**: `#FFFFFF` (Pure white card containers with subtle borders).
- **Secondary Surface**: `#F1F5F9` (Slate 100 — table headers, input backgrounds, active pills).
- **Borders**: `#E2E8F0` (Slate 200 — subtle, crisp borders).
- **Text Primary**: `#0F172A` (Slate 900 — high-contrast legible headings and titles).
- **Text Secondary**: `#334155` (Slate 700 — body text, table cells).
- **Text Muted**: `#64748B` (Slate 500 — labels, timestamps, secondary metadata).

### Dark Theme
- **Base Background**: `#0B1117` (Deep midnight slate canvas).
- **Surface / Card Background**: `#111827` (Card containers).
- **Secondary Surface**: `#16202C` (Table headers, inputs, raised elements).
- **Borders**: `#1E293B` (Muted dark slate borders).
- **Text Primary**: `#F8FAFC` (Slate 50).
- **Text Secondary**: `#CBD5E1` (Slate 300).
- **Text Muted**: `#94A3B8` (Slate 400).

### Semantic Accents & Statuses
- **Brand / Accent**: `#10B981` (Emerald 500) with dark hover `#34D399` (Emerald 400) and subtle background tint (`rgba(16, 185, 129, 0.1)`).
- **Status Available / Verified**: Emerald (`#10B981`).
- **Status Pending / Warning**: Amber (`#F59E0B`).
- **Status Rejected / Danger**: Rose/Red (`#EF4444`).

---

## 4. Global Theme System: Two-State Toggle

- **Visible UI**: Single sun/moon icon button.
  - When in **Light** mode: Displays **Sun** icon with accessible tooltip `"Switch to dark mode"`. Clicking toggles to **Dark**.
  - When in **Dark** mode: Displays **Moon** icon with accessible tooltip `"Switch to light mode"`. Clicking toggles to **Light**.
- **Default Mode**: Strictly **Light** mode.
- **Persistence**: Saved in `localStorage.getItem("voltops-theme")`.
- **Anti-Flash**: `index.html` inline script updated to default to light if no saved theme is present.
- **Transitions**: Smooth 150ms background and border color interpolation across the document.

---

## 5. Standardized Iconography (Lucide SVG Standards)

All interface icons are standardized to 16px or 18px stroke-based SVG elements adhering to Lucide proportions (`strokeWidth="2"`, `strokeLinecap="round"`, `strokeLinejoin="round"`):
- `SearchIcon`, `XIcon`, `RefreshCwIcon`, `FilterIcon`
- `ChevronDownIcon`, `ChevronRightIcon`, `CheckIcon`, `EyeIcon`
- `SunIcon`, `MoonIcon`
- `ShieldCheckIcon`, `FileTextIcon`, `AlertTriangleIcon`

Emoji icons (🔍, 🔄, ✕, ⚡, ⏳, ☰) are eliminated from operational interfaces.

---

## 6. Target Screen Architecture: Technician Verification

1. **Header**: Compact `"Technicians"` title with total technician count pill and compact status dot badge (`Live` vs `Offline data`).
2. **Toolbar**:
   - Integrated search input with clear icon.
   - Compact Trade dropdown (All 7 Trades + individual trades).
   - Compact Status filter pills (`All`, `Pending`, `Verified`, `Rejected`).
   - Refresh button with spin feedback.
3. **Table**:
   - Clean column widths with proper alignment.
   - Initials avatar, name, and mono employee ID.
   - Primary trade badge with secondary trade indicator.
   - License summary with document status pill (`On Record` vs `Missing`).
   - Branch and operating zone.
   - Status badge with colored dot.
   - Single contextual action button (`Review`).
4. **Audit Modal**:
   - Clean typography with structured sections.
   - Credential validation and document inspection.
   - Review note input with validation.
   - Two-step confirmation preventing accidental actions.
   - Truthful backend error alerts.
