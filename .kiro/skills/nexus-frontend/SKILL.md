---
name: nexus-frontend
description: Core Nexus frontend standards for Next.js App Router, TypeScript, Tailwind CSS v4, architecture conventions, phase workflow, and agent behavior for the Nexus real-time workspace platform.
---

# Nexus Frontend — Core Development Skill

## 1. Mandatory Pre-Implementation Checklist

Before writing or modifying any code:

1. Read `AGENTS.md` at the repository root — it is the primary instruction file.
2. Read `PHASES.md` — it is the authoritative implementation roadmap. Identify the active phase, its tasks, dependencies, and acceptance criteria.
3. Read this skill file completely.
4. Inspect `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, and `app/globals.css`.
5. Inspect the existing `app/` directory, components, hooks, services, types, providers, and lib.
6. Identify existing features, architectural decisions, and conventions.
7. Produce a concise implementation plan before making substantial changes.

Do not assume any file, route, component, package, or backend endpoint exists without verifying it.

## 2. Project Identity

| Property | Value |
|---|---|
| Platform | Nexus — Real-Time Workspace & Project Management |
| Framework | Next.js 16.4.2, App Router |
| React | 19.3.0 |
| TypeScript | 5.x |
| Styling | Tailwind CSS 4.x |
| Backend | Separate repository — REST + Socket.IO |
| Path alias | `@/*` → repository root |
| App directory | `app/` at repository root (not `src/app/`) |
| Instruction file | `AGENTS.md` (root) |
| Roadmap | `PHASES.md` (root) |
| Current phase | Phase 0 IN_PROGRESS |

## 3. Repository Protection Rules

- Preserve existing working features, routes, styles, and configuration.
- Do not replace the project with a new Next.js starter.
- Do not delete or overwrite `.env`, `.env.local`, or any credentials file.
- Do not introduce competing dependencies without assessing the existing stack.
- Do not duplicate components, hooks, utilities, or types that already exist.
- Do not mark a phase complete merely because its files were created.
- Never fabricate API endpoints or claim an integration works without verifying it.
- Keep all implementation within the frontend repository.
- If a backend capability is unavailable, document the dependency rather than faking it.

## 4. Technology Stack

### Installed dependencies (confirmed from `package.json`)

- `next` 16.4.2
- `react` + `react-dom` 19.3.0
- `typescript` 5.x
- `tailwindcss` 4.x + `@tailwindcss/turbopack`
- `eslint` 9.x + `eslint-config-next`

### Not yet installed (to be decided in Phase 0 / Phase 1)

- Form validation library (e.g., Zod)
- Test framework (e.g., Vitest + Testing Library)
- State management / data-fetching library
- `socket.io-client` (Phase 9)
- Drag-and-drop library (Phase 6)
- Document editor library (Phase 7)
- Calling SDK (Phase 10)

Do not install dependencies without team confirmation. Record decisions in Phase 0 conventions.

## 5. App Router Conventions

- Use Server Components by default.
- Add `'use client'` only where browser APIs, event handlers, effects, or React client state are required.
- Keep client component boundaries as small as practical.
- Do not expose server-only secrets through `NEXT_PUBLIC_` variables.
- Organize routes with route groups: `(public)`, `(auth)`.
- Implement `loading.tsx`, `error.tsx`, and `not-found.tsx` at appropriate levels.
- Use `lib/routes.ts` for typed route constants — no hardcoded path strings in navigation.
- The `@/*` alias resolves to the repository root, not a `src/` directory.

## 6. Directory Structure Convention

To be confirmed in Phase 0. The intended structure:

```text
app/
  (public)/         ← public routes: landing, login, register, forgot-password
  (auth)/           ← authenticated routes: dashboard, workspace, profile, notifications
  layout.tsx
  page.tsx
  globals.css
components/
  ui/               ← reusable primitives: Button, Input, Modal, Badge, etc.
  layout/           ← TopNav, Sidebar, MobileNav, PageHeader
  shared/           ← cross-feature shared components
features/
  auth/
  workspaces/
  teams/
  projects/
  tasks/
  documents/
  messaging/
  notifications/
  meetings/
  ai-assistant/
hooks/
lib/               ← api.ts, routes.ts, socket.ts, utilities
providers/         ← AuthProvider, WorkspaceProvider, SocketProvider
services/          ← auth.ts, workspaces.ts, projects.ts, tasks.ts, etc.
types/             ← auth.ts, workspace.ts, project.ts, tasks.ts, etc.
```

Adapt to the actual repository. Do not move existing files to match this layout.

## 7. TypeScript Standards

- Use TypeScript for all application code.
- Avoid `any`; use proper interfaces, generics, `unknown`, or discriminated unions.
- Define types for all API request payloads, response shapes, and component props.
- Use `import type` for type-only imports.
- Model loading, success, empty, and error states explicitly.
- Do not use type assertions to bypass untrusted API data.
- Keep feature-specific types in `types/<feature>.ts`; keep shared types in `types/api.ts` or `types/ui.ts`.

## 8. Phase-by-Phase Workflow

Consult `PHASES.md` for the authoritative task list, dependencies, and acceptance criteria for each phase. This section provides orientation only.

| Phase | Name | Status |
|---|---|---|
| 0 | Repository Audit and Project Foundation | IN_PROGRESS |
| 1 | Application Architecture and Design System | NOT_STARTED |
| 2 | Routing, Public Pages, and Application Shell | NOT_STARTED |
| 3 | Authentication and User Profile | NOT_STARTED |
| 4 | Workspaces, Teams, Members, and Roles | NOT_STARTED |
| 5 | Projects and Project Management | NOT_STARTED |
| 6 | Tasks and Kanban Boards | NOT_STARTED |
| 7 | Documents and Collaborative Workspace Content | NOT_STARTED |
| 8 | Messaging and Work-Connected Communication | NOT_STARTED |
| 9 | Real-Time Updates and Notifications | NOT_STARTED |
| 10 | Meetings and AI-Assisted Features | NOT_STARTED |
| 11 | Search, Activity, Dashboards, Cross-Feature Integration | NOT_STARTED |
| 12 | UI Polish, Accessibility, and Responsive Validation | NOT_STARTED |
| 13 | Testing, Security, and Reliability | NOT_STARTED |
| 14 | Production Configuration and Deployment | NOT_STARTED |
| 15 | Final Acceptance and Handover | NOT_STARTED |

**Phase dependency chain:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → (7 and 8 in parallel) → 9 → 10 → 11 → 12 → 13 → 14 → 15.

Phase 7 requires Phase 5. Phase 8 requires Phases 4 and 6. Phase 9 requires Phases 3, 6, and 8.

Before starting a phase:
1. Verify the previous phase's acceptance criteria are met.
2. Read the new phase's tasks, backend dependencies, and acceptance criteria in `PHASES.md`.
3. Identify any BLOCKED items and document them before proceeding.
4. Do not advance a phase status without verifying its completion criteria.

## 9. Environment Configuration

Required environment variables (document in `.env.example` with placeholder values only):

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client | Nexus backend HTTP API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Client | Socket.IO server URL (required from Phase 9) |

- Never commit real values to the repository.
- Never place secrets, AI keys, or database credentials in `NEXT_PUBLIC_` variables.
- Preserve existing `.env*` files — do not overwrite them.
- Restart the dev server after changing local environment files.

## 10. Code Quality Rules

- Use clear, descriptive names for components, hooks, and variables.
- Keep components focused and small; extract reusable hooks.
- Keep API requests in service modules, not scattered in UI components.
- Avoid duplicated logic and unnecessary abstraction.
- Remove debug statements before completing a task.
- Do not suppress TypeScript or ESLint errors to make checks pass.
- Follow existing naming and file conventions.
- Run available checks before reporting a task complete:
  - `npm run lint`
  - `npx tsc --noEmit` (or `npm run build`)
  - `npm test` (once configured in Phase 1)
  - `npm run build`

## 11. Completion Reporting

At the end of each task, report:

**Implemented:** Files changed, components added, routes created, behaviors implemented.

**Verification:** Commands run and their results (pass/fail). Do not claim a command passed without running it.

**Integration:** Backend endpoints or real-time events used and whether they were verified.

**Remaining work:** Missing dependencies, unresolved failures, external configuration required.

**Phase status:** Complete / In progress / Blocked — with evidence.

## 12. Specialized Skill References

For detailed standards in specific areas, consult the companion skills:

- `nexus-ui-design` — Design system, Tailwind v4 tokens, component library, accessibility, responsive design.
- `nexus-api-integration` — REST API client, typed requests, error handling, backend contract verification.
- `nexus-authentication` — Login, registration, session handling, route protection, permissions.
- `nexus-realtime` — Socket.IO client, live task and message updates, notifications.
- `nexus-testing-deployment` — Testing strategy, quality checks, environment config, deployment.

And reference documents in `references/`:

- `references/architecture.md` — Folder structure, App Router conventions, module responsibilities.
- `references/design-system.md` — Color tokens, typography, component specifications.
- `references/api-integration.md` — HTTP client, service modules, error handling patterns.
- `references/authentication.md` — Auth flows, session, protected routes, role model.
- `references/realtime.md` — Socket.IO setup, event contracts, notification system.
- `references/testing-deployment.md` — Test strategy, CI checks, deployment configuration.
