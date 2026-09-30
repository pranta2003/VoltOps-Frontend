# Copilot Instructions — VoltOps Frontend

## Tech stack
- React + Vite + TypeScript
- Tailwind CSS with custom tokens in tailwind.config.js — use `brand` and
  `status.available/busy/offline/danger` colors, never raw Tailwind colors like `blue-500`
- Font: Inter, sentence case labels everywhere, no ALL CAPS
- react-router-dom for routing, axios (src/api/axios.ts) for API calls

## Conventions to follow
- Auth state lives in src/context/AuthContext.tsx — use the `useAuth()` hook, never
  read localStorage directly from a page/component.
- Every dashboard page wraps its content in `<Layout title="...">`.
- Role-gated pages use `<ProtectedRoute allowedRoles={[...]}>` — remember this is only
  for a clean UX, not real security; the backend enforces roles for real.
- Keep reusable UI in src/components/, one screen per file in src/pages/.
- Match the shared design patterns (List, Profile/Detail, Form, Role Dashboard, Status
  Timeline, Matching/Assignment) described in PROJECT_PLAN.md and TEAM_DESIGN_BRIEF.md
  — don't invent a new layout style per screen.
- Never call an AI API directly from the frontend — always go through our own backend.