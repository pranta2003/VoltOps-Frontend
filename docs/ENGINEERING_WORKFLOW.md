# VoltOps Engineering Workflow & Commit Discipline

This document formalizes the permanent engineering workflow standards for all contributors and autonomous coding agents working on the `VoltOps-Frontend` repository.

---

## 1. Commit Frequency & Workflow Expectations

- **Daily Target**: Minimum **30 meaningful commits**, preferred **40 meaningful commits** per full productive coding day.
- **Continuous Integration Rhythm**: Stage and commit working code iteratively as features, refactorings, and corrections progress—do not stockpile modifications until the final turn.
- **Conventional Commits**: Every commit message must strictly adhere to the Conventional Commits specification:
  - `feat(<scope>): ...` — User-facing features, components, or functional capabilities.
  - `fix(<scope>): ...` — Bug fixes, layout corrections, error handling repairs.
  - `refactor(<scope>): ...` — Simplification, dead code elimination, or component restructuring without changing behavior.
  - `style(<scope>): ...` — Spacing, typography, contrast, or design system alignment.
  - `test(<scope>): ...` — New unit tests, mock assertions, or validation suites.
  - `docs(<scope>): ...` — Documentation, progress accounting, architectural specs.

---

## 2. Integrity & Quality Standards

1. **Strictly Prohibited**:
   - Zero empty commits (`git commit --allow-empty`).
   - Zero duplicate or split commits for trivial single-character changes.
   - Zero manufactured file churn to artificially inflate commit metrics.
2. **Quality Verification Before Commit**:
   - Run `npm test` before any major commit.
   - Run `npm run build` (`tsc && vite build`) to ensure zero TypeScript or bundling regressions.
3. **Commit Ledgering**:
   - Record every commit hash and its summary in `docs/IMPLEMENTATION_PROGRESS.md` under the active milestone section.

---

## 3. Branching & Push Protection

- **Protected Main**: Never push directly to `main`.
- **Target Remote Branch**: Push solely to `origin pranta` (or your assigned teammate branch `bani`, `limon`, `prity`).
- **No Destructive Operations**: `git push --force`, `git reset --hard`, and `git clean -fd` are prohibited.
