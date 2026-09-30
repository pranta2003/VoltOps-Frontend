# VoltOps — Project Plan

This is the single source of truth for what we're building, in what order, and why.
Update the **Status Log** at the bottom after every class/session.

---

## 1. The actual course structure we must satisfy (SDP-4)

Your syllabus (`SDP-IV.md`) defines 6 supervised checkpoints, not a vague "2 months of
coding." Every decision below is built to have the right thing ready at the right
checkpoint.

| Class | Focus | What we must show |
|---|---|---|
| 1 | Project Proposal & Team Finalization | Project idea submitted, GitHub repo set up |
| 2 | Requirements & Design Review | Requirements doc + **Figma wireframes** |
| 3 | UI/Frontend Progress | UI demo (static or interactive) |
| 4 | Backend/API Setup | API endpoints + DB connection demo |
| 5 | Integration & Testing | Partial or full system working end-to-end |
| 6 | Final Project Evaluation | Final demo + final report |

**Grading weights** — note Design/UX is a real 20%, not an afterthought:

| Component | Weight |
|---|---|
| Project Functionality | 30% |
| Design & UI/UX | 20% |
| Team Collaboration | 10% |
| Documentation & Report | 10% |
| Final Demo & Presentation | 30% |

### What this changes about our plan
- **Class 2 needs Figma wireframes.** Build these using 5-6 reusable patterns (List,
  Profile/Detail, Form, Role Dashboard, Status Timeline, plus the unique Matching
  Engine screen) instead of designing ~28 screens one by one.
- **20% is UI/UX.** A functionally perfect but ugly app leaves real marks on the table.
  We will not skip visual polish "until the end."
- **Team Collaboration is graded (10%).** Teammates exist on paper; add them as GitHub
  collaborators so the repo reflects a team, even though the actual build work is
  done solo.
- **Design and frontend both must finish within 1 month, together.** See the
  Week-by-Week Plan below — this is why frontend gets built against dummy data
  before the backend is wired in, not after.

---

## 2b. Week-by-week plan (Month 1: Design + Frontend)

| Week | Focus | Output |
|---|---|---|
| 1 | Figma wireframes for the **16-screen core loop only** (Round 1) — see `TEAM_DESIGN_BRIEF.md`. Secondary features (recruitment, leave, scheduling, audit log, notifications) are Round 2, done after Round 1 is reviewed. | Class 2 submission: requirements + wireframes |
| 2 | Build Layout, auth screens, and all Role Dashboards in React, against dummy data | Working, clickable shell |
| 3 | Build List + Profile/Detail + Form screens (Technicians, Customers, Assets, Service Requests) | Full navigable UI, dummy data |
| 4 | Build the Matching Engine screen + Work Order status timeline, polish, responsive check | Class 3 submission: full UI demo (static/interactive, per syllabus) |

**Month 2** — replace dummy data with real backend logic, feature by feature (this is
where the existing Milestone roadmap in Section 4 below actually executes), ending in
Class 4/5 (API + integration demos) and Class 6 (final demo + report).

**Brand palette for Figma** (matches the already-coded frontend, not Claude's own UI colors):
- Primary: `#1F4B5B` (deep teal-navy) · hover `#153742` · light accent `#3D7186`
- Status: Available `#1E824C` · Busy `#C97A1B` · Offline `#6B7280` · Danger `#B3261E`
- Font: Inter, sentence case everywhere, no ALL CAPS labels

## 2c. Screen inventory (design once per pattern, reuse everywhere)

| Pattern | Screens it covers |
|---|---|
| List (table + filters + one action) | Technicians, Customers, Assets, Service Requests, Vacancies, Leave Requests |
| Profile/Detail (header + sections) | Technician Digital Passport, Customer Profile, Asset Detail, Work Order Detail |
| Form | Add/Edit Technician, Submit Service Request, Create Vacancy, Leave Request |
| Role Dashboard (metric cards + list) | Admin, Dispatcher, Technician, Customer — same skeleton, different data |
| Status Timeline | Work order tracking (customer-facing), request lifecycle |
| Matching/Assignment *(unique, no reuse)* | Assigning a technician to a job — the centerpiece screen |

Plus standalone: Login, Register, Notifications panel, Audit Log (Admin only), AI
recruitment screening result view, Invoice/Payment screen.

---

## 2. Product identity

**VoltOps** — AI-Powered Electrical Workforce & Service Management Platform.

A platform for electrical service/maintenance companies (generators, transformers,
UPS systems, industrial panels, motors) to manage technicians, customer service
requests, and job assignment — with AI used in exactly two well-scoped places, never
to make decisions. See Section 5.

---

## 3. Immediate to-do list

- [x] **Team size confirmed** — teammates exist for the syllabus's team requirement,
      but all actual build work is done solo (you + Claude + Antigravity).
- [ ] **Exact class schedule not confirmed yet** — proceeding on the assumption that
      Class 2 (Figma review) hasn't happened yet. Flag it if that's wrong.
- [x] **Sequencing decided** — Figma wireframes first (Week 1), then frontend against
      dummy data (Weeks 2-4), then backend wiring (Month 2). See Section 2b.
- [ ] **Draft the Project Proposal** once the teacher's template is shared.

---

## 4. Technical milestone roadmap

| # | Milestone | Maps to class |
|---|---|---|
| 1 | Foundation: auth, roles, DB schema, one working feature | ✅ Done — covers Class 3 & 4 demos |
| 2 | Technician / skill / certification management | Class 4–5 |
| 3 | Customers & Assets | Class 4–5 |
| 4 | Service Request → Work Order lifecycle | Class 5 |
| 5 | **Matching Engine + AI explanation** (core feature) | Class 5 |
| 6 | Scheduling, SLA countdown, live updates (Socket.io) | Class 5 |
| 7 | Payment/invoicing | Class 5 |
| 8 | Trimmed AI recruitment screening | Class 5 |
| 9 | Leave requests, maintenance due-list, audit log, dashboard, UI polish | Class 5–6 |
| 10 | Testing, demo data, final report | Class 6 |

---

## 5. Feature scope: building now vs. Future Work

| In scope (build now) | Deferred (documented as Future Work) |
|---|---|
| Auth + 4 roles (Admin, Dispatcher, Technician, Customer) | Operations Manager / Branch Manager / Accountant as separate roles |
| Technician profiles, skills, certifications + expiry, status | Full multi-branch permission scoping |
| Customers + Assets | — |
| Service Request → Work Order lifecycle | — |
| **Matching Engine + AI explanation** | AI Fault Understanding (optional even in the original spec) |
| Scheduling + conflict detection | — |
| SLA countdown + warning/breach | — |
| Live updates (Socket.io) + in-app notifications | Email/SMS notifications |
| Customer payment/invoicing (template + computed numbers, never AI-written) | Technician compensation/payroll ledger |
| Trimmed AI recruitment screening (paste CV as text) | Full interview/verification/training pipeline, real file upload |
| Simple leave request/approval | — |
| Asset "maintenance due soon" list | Fully automatic recurring maintenance-request generation |
| Audit log + basic dashboard cards | Spare parts tracking, advanced analytics/reports |

---

## 6. AI integration boundary (read this before touching the AI service)

AI is used in **exactly two places**, both advisory only — never deciding anything:

1. **Matching Engine explanation** — after the backend computes eligibility (hard
   rules) and a weighted match score (plain arithmetic), AI turns the structured
   reasons into a plain-English sentence. AI never computes the score itself.
2. **Recruitment screening** — AI reads pasted CV text and extracts structured
   skills/experience/certifications, then compares them against a vacancy's stated
   requirements. AI never decides shortlist/reject — a manager clicks that.

**Never AI:** invoices/financial documents (must be exact, computed, reproducible),
any core eligibility decision, any automatic assignment.

---

## 7. Git / GitHub workflow

**Suggested repo name:** `voltops` (lowercase, hyphen-separated if needed, e.g.
`voltops-sdp` if `voltops` is taken).

**Repo setup checklist:**
- Create the repo on GitHub (private during development; can go public after grading
  if you want it as a portfolio piece)
- Push this initial code as your first commit to `main`
- Turn on **branch protection** on `main`: Settings → Branches → Add rule → require a
  pull request before merging. This alone is what makes your GitHub history show real
  "team collaboration" activity instead of one giant commit dump.
- Add a short repo description, e.g. "AI-powered electrical workforce & service
  management platform — CSE-400 SDP project."

**Branching:** one short-lived branch per feature, e.g. `feature/technician-management`,
`feature/matching-engine`, `fix/schedule-conflict`. Delete the branch after merging.

**Commit messages** (Conventional Commits style):
```
feat: add technician certification expiry check
fix: prevent double-booking a technician
chore: update seed data
docs: update README setup steps
refactor: extract matching score calculation into its own function
```

**Pull Requests:** you don't pick a PR number — GitHub assigns them automatically,
starting at #1 and counting up as you open them. Each PR just needs a short title
(often the same as your main commit message) and, in the description box, 2–3 lines
on what changed and why. Merge into `main` once Antigravity confirms it runs cleanly.

---

## 8. Status Log

Update this after every session — future-you (and your viva panel) will thank you.

| Date | Class # | What was completed | What's next |
|---|---|---|---|
| — | — | Milestone 1 foundation built (auth, roles, DB schema, technician profile view) | Confirm team size + class schedule, then wireframes |
