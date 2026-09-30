# VoltOps — Frontend

This is the **frontend** for VoltOps (AI-Powered Electrical Workforce & Service
Management Platform). This is one of two repos for this project:

- This repo: frontend (React + Vite + TypeScript + Tailwind)
- **Backend repo:** `<add your backend repo link here once created>` — must be running
  for this app to actually work (login, data, etc. all come from there)

For the full project plan, milestone roadmap, and feature scope, see
`PROJECT_PLAN.md` in this repo (same file also lives in the backend repo).

---

## 1. What's already built (Milestone 1)

- Login and registration pages
- AuthContext — keeps you logged in across page refreshes
- ProtectedRoute — blocks pages based on login state and role
- Shared dashboard Layout (sidebar + topbar)
- One dashboard per role (Admin, Dispatcher, Technician, Customer) — the Technician
  one is fully functional, showing real skills/certifications/status pulled from the backend

## 2. Prerequisites

- **Node.js** 18+ — https://nodejs.org
- The **backend repo running** (locally or deployed) — see that repo's README

## 3. First-time setup

```bash
npm install
```

```bash
# Windows:
copy .env.example .env
# Mac/Linux/Git Bash:
cp .env.example .env
```

By default, `.env` points at `http://localhost:5000/api` — make sure the backend is
running there first (see the backend repo's README). If the backend is deployed
elsewhere, update `VITE_API_URL` to match.

Start the frontend:

```bash
npm run dev
```

Open the URL shown (usually `http://localhost:5173`).

## 4. Try it out

Log in with one of the seeded test accounts from the backend repo (all use password
`password123`):
```
admin@voltops.test
dispatcher@voltops.test
technician@voltops.test
customer@voltops.test
```

## 5. Project structure

```
src/
├── main.tsx             ← entry point
├── App.tsx              ← all page routes + role-based redirect logic
├── context/
│   └── AuthContext.tsx  ← who's logged in, available to the whole app
├── api/
│   └── axios.ts         ← talks to the backend, auto-attaches login token
├── components/
│   ├── ProtectedRoute.tsx  ← blocks pages based on login/role
│   └── Layout.tsx          ← shared sidebar/topbar for all dashboards
├── pages/                  one file per screen
└── types/                  shared TypeScript types
```

## 6. Deploying

Use https://vercel.com — connect this GitHub repo, set `VITE_API_URL` to your
deployed backend's URL (from the backend repo), done.

## 7. Why some things work the way they do

- **Hiding a button for a role is only for a clean UI** — it's not real security. The
  backend enforces every permission itself, so even if someone tampered with this
  frontend, the backend would still refuse unauthorized actions. Worth remembering for
  your viva.
- **Registering only creates a Customer account** — staff accounts (Admin/Dispatcher/
  Technician) are created by an Admin, not through this public form.
