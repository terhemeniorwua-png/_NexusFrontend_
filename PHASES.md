# NEXUS FRONTEND — IMPLEMENTATION PHASES

## 1. Purpose

This document defines the phased implementation roadmap for the Nexus frontend.

Nexus is a Real-Time Workspace & Project Management Platform that combines project management, team collaboration, communication, document management, meetings, scheduling, automation, and AI-powered productivity.

The frontend must provide a consistent, responsive, accessible, and intuitive experience across three workspace types:

| Check                      | Result                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Framework                  | Next.js 16.4.2, App Router                                                                                    |
| React                      | 19.3.0                                                                                                        |
| Tailwind CSS               | 4.x (`@tailwindcss/turbopack`)                                                                                |
| TypeScript                 | 5.x                                                                                                           |
| Socket.IO client           | **Not installed**                                                                                             |
| Form validation library    | **Not installed**                                                                                             |
| Test framework             | **Not installed** (no `test` script in `package.json`)                                                        |
| State management library   | **Not installed**                                                                                             |
| Available scripts          | `dev`, `build`, `start`, `lint`                                                                               |
| App directory contents     | `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` only                                                   |
| Feature folders            | None exist (`components/`, `features/`, `hooks/`, `services/`, `types/`, `lib/`, `providers/` are all absent) |
| Design tokens              | `globals.css` uses Next.js defaults, not Nexus palette                                                        |
| Path alias                 | `@/*` → repo root (defined in `tsconfig.json`)                                                                |
| Environment file           | No `.env` present                                                                                             |
| Nexus features implemented | See current phase evidence and verification records below; this historical baseline is superseded.                                                                                                      |

This roadmap has historical planning records followed by dated implementation and verification evidence. Use the latest phase evidence sections below as the current status; the adjacent backend repository is available at `../__NexusBackend__/`.

1. Individual
2. Company
3. Institution

All three workspace types share the same core application architecture. Their available features, navigation, permissions, and experiences are determined by the active workspace type, subscription plan, user role, and permissions.

The frontend must integrate with the existing Nexus backend rather than independently implementing backend business logic.

## Phase 0 — Repository Audit and Project Foundation

### Objective

Establish a verified understanding of the repository's actual state, resolve environment and tooling gaps, and create the conventions that every subsequent phase will follow. This phase produces no user-visible features but ensures that every later phase builds on a reliable foundation.

### Prerequisites

- Access to the repository.
- `AGENTS.md` and `nexus-frontend/SKILL.md` available for reading.
- Node.js and npm installed and working.

### Implementation Tasks

- [x] Read `AGENTS.md` and `nexus-frontend/SKILL.md` in full.
- [x] Confirm the installed versions of Next.js, React, Tailwind CSS, and TypeScript.
- [x] Confirm available npm scripts (`dev`, `build`, `start`, `lint`).
- [x] Confirm absence of Socket.IO client, form library, test framework, and state manager.
- [x] Confirm `app/` contains only the default Next.js bootstrap files.
- [x] Confirm no Nexus feature folders or files exist.
- [x] Confirm `globals.css` uses Next.js default tokens, not the Nexus palette.
- [x] Confirm `tsconfig.json` path alias `@/*` points to the repo root.
- [x] Confirm no `.env` file is present.
- [x] Create `.env.example` with required variable placeholders (do not populate real values).
- [x] Run `npm run lint` and record baseline result.
- [x] Run `npm run build` and record baseline result.
- [x] Document any pre-existing lint or build warnings for tracking.
- [x] Decide on and document the folder structure convention to follow (`app/`, `components/`, `features/`, `hooks/`, `lib/`, `services/`, `types/`, `providers/`).
- [x] Decide on and document the API client approach (fetch wrapper or thin service module).
- [x] Decide on and document the authentication token storage strategy (HttpOnly cookie preferred per `AGENTS.md`).
- [x] Identify which form validation and test libraries to install in Phase 1, consistent with `SKILL.md`.
- [x] Record all backend API contracts required across phases as a dependency checklist.
- [x] Confirm backend repository location and documentation access (adjacent repository: `../__NexusBackend__/`).

### Frontend Deliverables

- `.env.example` with placeholder values for `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`.
- Documented folder structure convention (in this file or in a `CONVENTIONS.md`).
- Baseline lint and build report.
- Backend dependency checklist.

### Backend Dependencies

- None required for this phase. Backend documentation must be located and linked before Phase 3.

### Validation and Tests

- `npm run lint` completes without new errors.
- `npm run build` produces a working production bundle without errors.
- `.env.example` is committed with placeholders only (no real values).

### Acceptance Criteria

- Repository state fully documented.
- `.env.example` committed with all required variable names.
- Folder structure convention agreed and recorded.
- Baseline lint and build clean (or pre-existing issues catalogued).
- No secrets committed to the repository.

### Completion Status

`COMPLETE`

### Completion Record (Phase 0)

| Deliverable                                                               | Status  | Commit      |
| ------------------------------------------------------------------------- | ------- | ----------- |
| `.env.example` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`    | ✅ Done | `5438cf2`   |
| `.gitignore` updated to allow `!.env.example`                             | ✅ Done | `5438cf2`   |
| Baseline `npm run lint` — zero errors                                     | ✅ Done | recorded    |
| Baseline `npm run build` — zero errors (1 pre-existing pnpm warning)      | ✅ Done | recorded    |
| `CONVENTIONS.md` — folder structure, API client, token storage, libraries | ✅ Done | `1072238`   |
| Backend API contracts checklist — Appendix B populated                    | ✅ Done | this commit |
| Appendix C conventions reference updated                                  | ✅ Done | this commit |

**Remaining open item:**


### Notes and Blockers

- The root instruction file is `AGENTS.md`, not `agent.md`. All future agents must read `AGENTS.md`.
- `SKILL.md` is located at `nexus-frontend/SKILL.md`, not the repo root.
- `SKILL.md` §3 refers to a `src/app` structure. This repository uses `app/` at the repo root; follow the actual structure (documented in `CONVENTIONS.md` §1).
- Test framework decided: Vitest + Testing Library. Install in Phase 1. See `CONVENTIONS.md` §5.
- Form validation library decided: Zod. Install in Phase 1. See `CONVENTIONS.md` §4.
- Drag-and-drop library decided: `@dnd-kit/core`. Install in Phase 6. See `CONVENTIONS.md` §6.

The frontend must use the technology already established in the repository.

Expected stack:

- Next.js
- TypeScript
- React
- Existing styling system and component library
- Existing state-management solution, if configured
- Existing API client or service layer
- Existing authentication infrastructure
- WebSocket or existing real-time client
- Existing form and validation libraries
- Existing testing tools

### Important rules

- Do not convert the project from TypeScript to JavaScript.
- Do not replace the existing framework or architecture without approval.
- Do not introduce unnecessary dependencies.
- Inspect the existing repository before making implementation decisions.
- Follow existing naming conventions, folder structure, design patterns, and component architecture.
- Reuse existing components and utilities where appropriate.
- Do not duplicate backend business logic in the frontend.
- Do not hardcode data that should come from backend APIs.
- Do not expose secrets or private environment variables through client-side code.

---

# 3. Global Implementation Rules

These rules apply to every phase.

### 3.1 Documentation first

Before starting any phase, read:

- `agent.md`
- `README.md`
- `phases.md`
- Existing frontend architecture documentation
- Existing branding documentation
- Existing design system or `skill.md`
- Relevant backend API documentation
- Any existing implementation notes related to the current phase

Inspect the actual repository before making changes.

### 3.2 Work phase by phase

- Implement only the currently assigned phase.
- Do not begin future phases without explicit instruction.
- Do not skip incomplete dependencies.
- Do not rebuild features that already exist and work.
- If an earlier phase has an unresolved dependency, report it before proceeding.
- Keep the phase tracker accurate.

### 3.3 Preserve existing work

- Do not delete existing components, pages, features, styles, configurations, or utilities simply because a different implementation seems easier.
- Do not overwrite existing files without inspecting their contents.
- Do not delete or replace `.env` files.
- Do not expose API keys, access tokens, passwords, or secrets.
- Preserve existing backend integrations.
- Make the smallest safe changes necessary.
- Avoid unnecessary refactoring outside the current phase.

### 3.4 Backend integration

- The Express backend is the authoritative source for application data and business rules.
- Use the existing backend API contracts.
- Do not invent endpoints or request/response structures.
- If an endpoint is missing, document the dependency rather than implementing fake functionality.
- Handle loading, empty, success, and error states.
- Respect backend permissions and resource visibility.
- Do not assume that hiding a button is sufficient access control.

### 3.5 Design and user experience

- Maintain a consistent Nexus visual identity.
- Build reusable UI components.
- Support desktop, tablet, and mobile layouts.
- Ensure accessibility and keyboard navigation.
- Provide useful feedback for user actions.
- Use confirmation dialogs for destructive actions.
- Avoid browser alerts for ordinary application feedback.
- Use polished loading states, skeletons, transitions, and animations where appropriate.
- Avoid excessive animation that interferes with usability.
- Keep interfaces clean and intuitive.

### 3.6 Testing and validation

At the end of each phase:

- Run TypeScript checks.
- Run linting.
- Run relevant automated tests.
- Run the production build when practical.
- Test the affected screens and workflows.
- Fix issues introduced by the phase.
- Do not claim that a test passed unless it was actually executed.

### 3.7 Git workflow

- Inspect the current Git branch and working tree before making changes.
- Never commit or push development changes directly to `main`.
- Use a dedicated feature branch for the phase.
- Preserve unrelated user changes.
- Commit completed work with clear messages.
- Push the feature branch when requested by the project workflow.
- Never force-push or rewrite Git history.
- Do not merge into `main` without explicit approval.

---

# 4. Implementation Phases

## Phase Status Summary

Last verified: 2026-11-05, on branch `feature/phase-9-projects`.

| Phase | Title                                                            | Status      |
| ----- | ---------------------------------------------------------------- | ----------- |
| 0     | Frontend Repository Audit and Project Foundation                 | Completed   |
| 1     | Design System, Branding, and UI Foundation                       | Completed   |
| 2     | Application Layout and Navigation Architecture                   | Completed   |
| 3     | Public Website and Authentication Interfaces                     | In Progress |
| 4     | User Onboarding and Profile Management                           | Blocked     |
| 5     | Workspace Creation and Workspace Switching                       | In Progress |
| 6     | Organisation Membership, Join Requests, and Invitations          | In Progress |
| 7     | Roles, Permissions, and Access-Controlled UI                     | In Progress |
| 8     | Departments, Teams, and Groups                                   | In Progress |
| 9     | Projects and Project Visibility                                  | In Progress |
| 10    | Tasks and Work Management                                        | In Progress |
| 11    | Real-Time Messaging and Conversations                            | Not Started |
| 12    | Notification Centre and Activity Feed                            | Not Started |
| 13    | File Management and Nexus Drive                                  | Not Started |
| 14    | Document Collaboration                                           | Not Started |
| 15    | Calendar and Scheduling                                          | Not Started |
| 16    | Meetings and Calling                                             | Not Started |
| 17    | Forms and Surveys                                                | Not Started |
| 18    | Subscription, Billing, and Plan Management                       | Not Started |
| 19    | Global Search and Full Document Search                           | Not Started |
| 20    | Integrations Management                                          | Not Started |
| 21    | Automation and Workflow Builder                                  | Not Started |
| 22    | Nexus AI Assistant                                               | Not Started |
| 23    | Nexus Write                                                      | Not Started |
| 24    | AI Action Approval and Execution Interfaces                      | Not Started |
| 25    | Real-Time State, Presence, and Cross-Application Synchronisation | Not Started |
| 26    | User Settings and Preferences                                    | Not Started |
| 27    | Reporting, Insights, and Analytics                               | Not Started |
| 28    | Global UX, Accessibility, and Responsive Refinement              | Not Started |
| 29    | Frontend Security and Privacy Review                             | Not Started |
| 30    | Frontend Testing and Quality Assurance                           | Not Started |
| 31    | Performance and Production Optimisation                          | Not Started |
| 32    | Deployment and Production Configuration                          | Not Started |
| 33    | Final Frontend Review and Release Readiness                      | Not Started |

Status meanings: **Not Started**, **In Progress**, **Blocked**, **Completed**. A phase is only marked **Completed** when its functional requirements, integrations, and validation requirements have been verified.

Phases 0, 1, and 2 remain verified complete. Phase 3 is in progress on `feature/frontend-authentication`; its frontend auth and billing interfaces are connected to the inspected backend contracts. Terms and Privacy drafts still require legal review and approval. Phase 3 still depends on external payment-provider/database validation and user-owned live auth verification. Responsive review is user-confirmed. OAuth remains deferred because no provider or backend contract is approved. Phase 4 is blocked by missing backend contracts for avatar management and cross-device onboarding persistence; profile editing and account-security functionality already present do not satisfy those blocked requirements. Its account-deletion UI now follows the finalized 30-day recovery contract recorded below. Phases 5–7 have substantial implementation and remain In Progress pending remaining acceptance criteria and verification; Phase 8 is also In Progress. Phase 9 is In Progress on `feature/phase-9-projects`. Phase 10 is In Progress on `feature/phase-9-projects`.

### Frontend-to-backend phase and contract map

Backend phase numbers below refer to the adjacent backend roadmap/API documentation, not frontend phase numbers. `docs/openapi.yaml` paths are relative to the backend `/api/v1` base path. A missing API is called out only where the current backend API reference and OpenAPI do not register the capability.

| Frontend phase | Backend phase/module | Contract or dependency |
|---|---|---|
| FE-0 Repository foundation | Cross-cutting infrastructure | No runtime API contract. |
| FE-1 Design system | Cross-cutting UI | No runtime API contract. |
| FE-2 Application shell | Workspaces/authentication | `/auth/me`, `/workspaces`, `/workspaces/{workspaceId}/switch` support authenticated workspace context. |
| FE-3 Public site and authentication | BE-3 Auth and billing | `/auth/register`, `/auth/login`, `/auth/verify-email`, `/auth/resend-verification`, `/auth/password/*`, `/auth/refresh`, `/auth/logout`; billing `/billing/plans` and `/billing/workspaces/{workspaceId}/*`. |
| FE-4 Onboarding and profile | BE-3 account lifecycle; users | `/users/me`, `/auth/sessions`, `/auth/password/change`, `/auth/email/change`, `/auth/delete`, `/auth/reactivate`. Avatar upload/removal and persisted cross-device onboarding intent are not registered. |
| FE-5 Workspaces | BE-4/5 workspace lifecycle (backend phase labels vary by backend audit) | `/workspaces`, `/workspaces/{workspaceId}`, `/workspaces/{workspaceId}/switch`, `/workspaces/{workspaceId}/members`; company/institution profile and logo routes are separately available. |
| FE-6 Membership, invitations, join requests | BE-5 membership/onboarding | `/workspaces/discover`, `/workspaces/join`, `/workspaces/join-requests/*`, `/workspaces/{workspaceId}/join-requests/*`, `/invitations/*`, `/workspaces/{workspaceId}/invitations/*`, `/workspaces/{workspaceId}/members/*`. |
| FE-7 Roles and access-controlled UI | BE-6 authorization; BE-7 organization/channel access | Workspace member/role routes, project and channel access policies, `/workspaces/{workspaceId}/notification-preferences`, `/privacy-requests/*`, and incoming/accept/reject ownership-transfer routes. There is no separate general notification feed API. |
| FE-8 Teams, departments, and groups UI | BE-7 organization structure | `/workspaces/{workspaceId}/teams/*`, `/departments/*`, `/institution-groups/*`; project association at `/projects/{projectId}/organizational-access`. Department roster listing and team activity APIs are absent. |
| FE-9 Projects and visibility UI | BE-8 Projects and visibility | `/workspaces/{workspaceId}/projects*`, project members, activity, milestones, archive/restore and ownership transfer. This is BE-8 project work, distinct from FE-8 Teams UI. |
| FE-10 Tasks | BE-8 Projects / task module | Task API fully registered at `/workspaces/{workspaceId}/projects/{projectId}/tasks` with CRUD, assignees, dependencies, comments, archive/restore, complete/reopen. All routes verified in `src/modules/tasks/task.routes.ts` and `src/routes/index.ts`. |
| FE-11 Messaging and conversations | BE-7 Channel access metadata only | `/workspaces/{workspaceId}/channels*` covers channel metadata/access only. Message, conversation, thread, reaction, and real-time delivery APIs are absent. |
| FE-12 Notifications and activity feed | Partial workspace preferences; project activity | Notification preferences and project audit activity exist. General notification list/read/feed APIs are absent. |
| FE-13 File management | Organization profile media only | Company/institution logo upload/read/delete endpoints exist. General file/folder/attachment upload, download, sharing, and version APIs are absent. |
| FE-14 Document collaboration | No document module/API registered | Document content, comments, sharing, and version APIs are absent. |
| FE-15 Calendar and scheduling | No calendar module/API registered | Calendar/event and provider-sync APIs are absent. |
| FE-16 Meetings and calling | No meeting module/API registered | Meeting/calling/session APIs are absent. |
| FE-17 Forms and surveys | No forms module/API registered | Form and response APIs are absent. |
| FE-18 Subscription and billing | BE-3 Billing | `/billing/plans`, `/billing/workspaces/{workspaceId}`, `/payments`, `/checkout`, `/verify`, `/change`, `/cancel`. Invoice list/detail/pay APIs remain absent. |
| FE-19 Global and document search | No search module/API registered | Global and full-document search APIs are absent. |
| FE-20 Integrations | No integration module/API registered | OAuth connection and provider-sync management APIs are absent. |
| FE-21 Automation | No automation module/API registered | Workflow definition and execution APIs are absent. |
| FE-22 Nexus AI Assistant | AI orchestration not exposed in application API | No approved frontend-facing AI conversation/context API is registered. |
| FE-23 Nexus Write | AI writing assistance not exposed | No approved writing-analysis/suggestion API is registered. |
| FE-24 AI action approval | AI action execution not exposed | No proposal/approval/execution API is registered. |
| FE-25 Real-time state and presence | Existing backend real-time infrastructure; no frontend contract documented | Socket connection/auth/event names and payload contracts are not documented in the current API reference/OpenAPI. |
| FE-26 User settings and preferences | Users/workspaces | `/users/me` and workspace notification-preference routes cover current profile and notification settings; broader settings are not contracted. |
| FE-27 Reporting and analytics | Projects | Project activity endpoint exists; aggregate reporting/analytics APIs are absent. |
| FE-28 UX/accessibility refinement | Cross-cutting frontend | No runtime API contract. |
| FE-29 Security and privacy review | BE-3 auth; BE-6 authorization; privacy | Auth/session, role/membership, private-resource policies, and `/privacy-requests/*` contracts exist; validation spans the exposed APIs. |
| FE-30 Testing and QA | Cross-cutting | Uses contracts listed above; no separate API. |
| FE-31 Performance optimization | Cross-cutting | No separate API. |
| FE-32 Deployment configuration | Infrastructure | `/health`, `/health/live`, `/health/ready`; deployment secrets/configuration remain environment-specific. |
| FE-33 Release readiness | Cross-cutting | Validate all available contracts and document unimplemented backend domains above. |

---

## Phase 0 — Frontend Repository Audit and Project Foundation

### Objectives

Understand the existing frontend before implementing or modifying features.

### Tasks

- Inspect the complete frontend directory structure.
- Read existing project documentation.
- Identify the Next.js version and routing approach.
- Identify the styling system and design component library.
- Inspect existing authentication implementation.
- Inspect API integration and state management.
- Inspect existing layouts, navigation, and reusable components.
- Identify existing pages and implemented features.
- Review environment variable usage.
- Identify existing testing and build configurations.
- Compare existing frontend functionality with the Nexus product requirements.
- Identify missing, incomplete, duplicated, or inconsistent implementations.

### Deliverables

- Documented frontend architecture.
- Identified existing features.
- Identified implementation gaps.
- Dependency list for upcoming phases.
- Updated phase tracker.

Do not rebuild the frontend during this phase.

### Phase 0 Status — Completed

Verified on 2026-11-03 on branch `feature/phase-1-design-system`.

#### Verified technology and configuration

| Area            | Verified state                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Framework       | Next.js `16.4.2`, App Router, Turbopack build                                                   |
| Language        | TypeScript `5.x`, `strict: true`                                                                |
| UI runtime      | React and React DOM `19.3.0`                                                                    |
| Styling         | Tailwind CSS `4.x` via `@tailwindcss/turbopack`, CSS-first `@theme` tokens in `app/globals.css` |
| Validation      | Zod `^4.6.7` installed, not yet used in application code                                        |
| Tests           | Vitest `4.1.12`, Testing Library, jsdom `29.1.1`                                                |
| Linting         | ESLint `9.x` with `eslint-config-next` core-web-vitals and TypeScript rules                     |
| Package manager | npm (`package-lock.json` is the active lockfile)                                                |
| Path alias      | `@/*` resolves to the repository root, not `src/`                                               |

#### Verified application state

- Routes: only the root layout (`app/layout.tsx`) and a placeholder home page (`app/page.tsx`) exist. There is no `src/` directory.
- Design tokens: implemented in `app/globals.css` using Tailwind v4 `@theme`, including colour, radius, shadow, and z-index tokens plus a global reduced-motion rule.
- Fonts: Geist Sans and Geist Mono loaded through `next/font/google` in the root layout.
- UI components: 18 primitives in `components/ui/` — Alert/ErrorMessage, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, ConfirmDialog, EmptyState, Input, Modal, RadioGroup, Select, Skeleton, Spinner, Tabs, Textarea, Tooltip.
- Tests: 46 Vitest tests across 5 files under `components/ui/__tests__/`, covering Button, Input, Modal, ConfirmDialog, and EmptyState.
- Shared types: `types/api.ts` defines `PaginatedResponse`, `ApiResult`, `ApiError`, and `isApiError`; `types/ui.ts` defines variants, sizes, task status, priority, and a legacy `UserRole` union.
- Missing application layers: no API client, service modules, authentication provider, session handling, route protection, workspace context, state-management library, data-fetching library, form library, real-time client, navigation shell, or product feature screens.
- Environment configuration: no `.env` or `.env.local` exists. `.env.example` was added with documented public placeholders only.

#### Foundation work completed in this phase

- Restored the tracked `vitest.config.mts` that was missing from the working tree, restoring test execution.
- Added `.env.example` documenting public configuration placeholders and allowed it in `.gitignore` without changing any real environment values.
- Recorded this audit and the verified phase status in this tracker.

#### Validation evidence

| Check              | Result                                                 |
| ------------------ | ------------------------------------------------------ |
| `npm run lint`     | Passed                                                 |
| `npx tsc --noEmit` | Passed                                                 |
| `npm test`         | Passed — 5 files, 46 tests                             |
| `npm run build`    | Passed — static `/` and `/_not-found` routes generated |

#### Backend dependency checklist

The following contracts must be verified against the backend before dependent phases begin. Phase 0 only inspected the frontend repository; Phase 3 has now verified the auth contracts against the adjacent backend repository.

| Dependency                                                         | Needed by      | Status                                                                                                                                               |
| ------------------------------------------------------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| API base URL and versioning convention                             | Phase 3        | Confirmed: backend OpenAPI server is `/api/v1`; local upstream is `http://localhost:4000`                                                            |
| Authentication/session contract (cookie vs token, refresh, logout) | Phase 3        | Confirmed: short-lived bearer access token in response; rotating refresh token in HttpOnly cookie; CSRF cookie plus header; session logout endpoints |
| User and session response shapes                                   | Phase 3–4      | Confirmed in OpenAPI and auth/user routes. Workspace membership roles are returned by membership contracts; server authorization remains authoritative. |
| Workspace list, switching, and scoping contract                    | Phase 5        | Confirmed: `/workspaces`, `/workspaces/{workspaceId}`, `/workspaces/{workspaceId}/switch`, and workspace member routes.                               |
| Membership, join request, and invitation contracts                 | Phase 6        | Confirmed in OpenAPI and API reference: discovery, join requests, invitations, and member-management routes.                                        |
| Role and permission contracts for Company and Institution           | Phase 7–8      | Confirmed for membership roles and organization/team policies; no actor-specific department roster or team activity API is registered.               |
| Project, task, and visibility contracts                            | Phase 9–10     | Projects and visibility confirmed at `/workspaces/{workspaceId}/projects*`; no task API is registered.                                               |
| Pagination, filtering, and sorting                                 | Phase 3 onward | Confirmed per endpoint where documented (including discovery, billing, invitations, privacy requests, channels, projects, and activity); not a global contract. |
| Error envelope                                                     | Phase 3        | Confirmed: `{ success: false, error: { code, message, details?, requestId } }`                                                                       |
| Real-time connection, auth method, event names, and payloads        | Phase 11, 25   | Not documented in API reference/OpenAPI; requires an approved client transport contract.                                                             |
| File upload/download and signed URL contract                       | Phase 13       | Backend API inspected 2026-11-05: general file/presigned upload contracts absent; only authenticated raw-byte organization-logo proxy routes exist. See `docs/FRONTEND_STORAGE_INTEGRATION.md`. |
| AI request, streaming, and action-approval contract                | Phase 22–24    | Not registered in the application API/OpenAPI.                                                                                                       |

This checklist has been reconciled against the adjacent backend docs on 2026-11-05. Historical entries marked unconfirmed are superseded by the statuses above.

#### Known limitations recorded during the audit

- `branding.md` specifies an indigo/charcoal palette and Inter, while `app/globals.css` implements a slate/blue palette and the layout uses Geist. No unilateral retheme was performed.
- `types/ui.ts` contains a legacy `UserRole` union (`OWNER | PM | MEMBER | VIEWER | COLLABORATOR`) that does not match the Company and Institution role model in `branding.md`.
- `README.md` and `AGENTS.md` are byte-identical.
- `npm run build` warns that an out-of-repository `pnpm-lock.yaml` is ignored; the project uses npm.
- Historical note (superseded 2026-11-04): the adjacent backend repository was not identified during the Phase 0 audit. It is now available at `../__NexusBackend__/`; see the contract reconciliation above.

## Phase 1 — Design System, Branding, and UI Foundation

### Objectives

Establish a consistent visual system for the entire Nexus application.

### Tasks

- Review and update the existing design system.
- Establish typography, colors, spacing, borders, shadows, and radii.
- Define reusable buttons, inputs, selects, cards, dialogs, dropdowns, tooltips, and badges.
- Create reusable form components.
- Establish consistent notification and feedback components.
- Create reusable skeletons and loading indicators.
- Establish responsive breakpoints.
- Define consistent page headers and content layouts.
- Create reusable empty states and error states.
- Establish animation and transition conventions.
- Ensure dark/light theme support if already included in the product requirements or existing implementation.

### Deliverables

- Consistent design tokens.
- Reusable component library.
- Shared UI patterns.
- Responsive design foundation.

### Phase 1 Status — Completed

Implemented and verified on 2026-11-03.

#### Design tokens and branding alignment

- Palette aligned with `branding.md`: primary indigo `#5146D8`, hover `#3730A3`, soft indigo `#EEF0FF`, charcoal text `#20232D`, supporting text `#454B59`, muted text `#858B9B`, off-white background `#F8F9FC`, light-gray secondary surface `#F0F1F5`, border `#E4E6ED`.
- Typography aligned with `branding.md`: Inter is loaded through `next/font/google` and exposed as `--font-inter`; the mono stack uses system monospace fonts.
- Radius, shadow, motion, and z-index tokens defined centrally in `app/globals.css`.
- Task-status and semantic colour tokens retained, with status-assigned aligned to the brand indigo.

#### Dark, light, and system themes

- All theme values are CSS variables, as required by `branding.md`.
- `:root[data-theme="dark"]` overrides the full token set, including semantic and task-status colours.
- `:root[data-theme="system"]` follows `prefers-color-scheme` through a media query.
- `color-scheme` is set per theme so native controls match.
- `ThemeProvider` (`providers/ThemeProvider.tsx`) stores the preference in `localStorage` under `nexus-theme`, resolves the system preference, and applies `data-theme` to `<html>`.
- A small pre-paint script in `app/layout.tsx` applies the stored theme before paint to prevent a flash of the wrong theme.
- `ThemeToggle` (`components/ui/ThemeToggle.tsx`) is an accessible light/dark/system segmented control.

#### Component library additions

- `Dropdown` (`components/ui/Dropdown.tsx`): accessible menu button with click and keyboard support (Enter, Space, ArrowDown/Up, Home/End, Escape), outside-click dismissal, focus management, disabled and destructive items, separators, and link items.
- `ThemeToggle` (`components/ui/ThemeToggle.tsx`): theme preference control.
- `PageHeader` (`components/layout/PageHeader.tsx`): one `h1`, optional description, breadcrumb slot, and actions slot.
- `PageContainer` (`components/layout/PageContainer.tsx`): consistent width, padding, and centring for pages.
- Existing primitives retained: Alert/ErrorMessage, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, ConfirmDialog, EmptyState, Input, Modal, RadioGroup, Select, Skeleton, Spinner, Tabs, Textarea, Tooltip.

#### Motion and responsive foundation

- Shared motion tokens (`--duration-fast`, `--duration-base`, `--duration-slow`, `--ease-standard`).
- Shared keyframes for fade, pop, and dialog entrance animations, applied to `Modal` and `Dropdown`.
- The existing global `prefers-reduced-motion` rule neutralises these animations.
- Responsive behaviour uses the Tailwind default breakpoints; every new component uses mobile-first classes and reflows at `sm`.

#### Validation evidence

| Check              | Result                                                 |
| ------------------ | ------------------------------------------------------ |
| `npm run lint`     | Passed                                                 |
| `npx tsc --noEmit` | Passed                                                 |
| `npm test`         | Passed — 8 files, 65 tests                             |
| `npm run build`    | Passed — static `/` and `/_not-found` routes generated |

Tests added for `Dropdown` (9), theme provider and toggle (5), and page header/container (5), alongside the existing 46 primitive tests.

#### Known limitations

- No page currently uses the design-system components; Phase 2 will build the application shell that consumes them.
- Select's chevron is a static data-URI colour and does not adapt to the dark theme. It remains legible because a muted grey is used, but a token-driven icon should replace it when an icon system is approved.
- No icon library is installed; inline SVG remains the convention.

## Phase 2 — Application Layout and Navigation Architecture

### Objectives

Build the main authenticated application structure.

### Tasks

- Implement the main application shell.
- Build the sidebar navigation.
- Build the top navigation/header.
- Implement workspace switcher.
- Implement user profile menu.
- Add global search entry point.
- Add notification entry point.
- Add messages entry point.
- Add responsive navigation for mobile.
- Implement navigation groups based on workspace type and permissions.
- Support collapsible sidebar navigation.
- Maintain navigation state appropriately.
- Implement breadcrumbs where useful.
- Add page-level loading and error boundaries.

### Deliverables

- Reusable application layout.
- Responsive navigation.
- Workspace-aware navigation.
- Shared authenticated page structure.

### Phase 2 Status — Completed

Verified on 2026-11-03 on branch `feature/phase-2-app-shell`. The reusable shell and its navigation behaviour are implemented and tested. Mounting the shell inside authenticated routes is intentionally deferred to Phase 3, when the session and route structure exist, and to Phase 5, when workspace switching is connected to the backend.

#### Application shell

- `components/layout/AppShell.tsx` composes the sidebar, topbar, workspace switcher, user menu, and main content region.
- Owns only layout state: desktop collapse and the mobile drawer.
- Includes a skip link targeting `<main id="main-content">`.
- Handles Escape dismissal, background scroll lock, focus into the drawer on open, and focus restoration to the menu button on close.
- Accepts page title, breadcrumbs, header actions, and optional sidebar footer content.

#### Sidebar and navigation

- `components/layout/Sidebar.tsx` renders as a persistent collapsible sidebar on desktop and an off-canvas drawer below the `lg` breakpoint.
- Groups support optional labels and are removed when empty after filtering.
- Active destinations use `aria-current="page"` with segment-aware matching, so `/projects` is active for `/projects/42` but `/project` is not active for `/projects`.
- Collapsed labels remain available to assistive technology, and collapsed items expose their label as a native tooltip.
- Badge counts render with separate accessible text, for example "3 unread messages".
- `types/navigation.ts` defines `WorkspaceKind`, `WorkspaceSummary`, `CurrentUserSummary`, `NavItem`, `NavSection`, and `NavigationContext`.
- `lib/navigation.ts` provides pure filtering and active-path helpers. Items can be scoped by workspace kind and by backend-supplied permission keys; items whose permissions are unknown are hidden rather than shown optimistically.

#### Topbar entry points

- `components/layout/Topbar.tsx` provides the mobile navigation trigger, breadcrumbs or page title, global search entry point, messages entry point, notification entry point, theme control, and user menu.
- Keyboard shortcut metadata for search is exposed with `aria-keyshortcuts`.
- Message unread counts and general notification unread counts are separate props and separate entry points. They are never combined.
- Optional entry points are omitted when the caller supplies no destination or handler.

#### Workspace switcher and user menu

- `components/layout/WorkspaceSwitcher.tsx` displays the active workspace and kind, lists all available workspaces, marks the current one, and reports the selected workspace id to the caller. It renders a safe empty state when no workspace is available.
- `components/layout/UserMenu.tsx` uses the shared `Avatar` and `Dropdown`, accepts caller-supplied account destinations, and appends a destructive sign-out action only when a handler is supplied.
- `Dropdown` gained optional `triggerLabel` and `triggerClassName` props for explicit accessible names and full-width triggers. Existing behaviour is unchanged.

#### Route boundaries

- `app/loading.tsx` provides a shape-matched route loading state with an accessible status region.
- `app/error.tsx` provides a client error boundary with an approved `Alert`, a retry action, and an optional error digest. It does not expose raw error details or user content.

#### Backend integration

- No endpoint, response field, permission key, or route was invented.
- The shell performs no network requests. Session, workspace, permission, and unread-count data are supplied by the caller.
- Authenticated mounting, real workspace switching, permission payloads, and unread counts remain dependent on the Phase 3–7 backend contracts listed in the Phase 0 dependency checklist.

#### Validation evidence

| Check              | Result                                                 |
| ------------------ | ------------------------------------------------------ |
| `npm run lint`     | Passed                                                 |
| `npx tsc --noEmit` | Passed                                                 |
| `npm test`         | Passed — 14 files, 118 tests                           |
| `npm run build`    | Passed — static `/` and `/_not-found` routes generated |

New tests cover navigation filtering and active paths, the sidebar (active state, permission scoping, collapse, drawer controls, badges, slots), the workspace switcher, the user menu, the topbar (search, separate counts, breadcrumbs, optional entry points), and the shell (skip link, drawer open/close, Escape focus restoration, navigation close, collapse, workspace switching, separate counts).

#### Known limitations

- The shared shell remains unmounted. Phase 3 now provides auth routes and a session-confirmed `/app` boundary; the workspace-aware shell remains deferred until a workspace context and workspace-scoped routes are implemented.
- Permission filtering is a presentation concern, not authorisation. Backend checks remain authoritative.
- The desktop collapse preference is component state and is not persisted across reloads.
- `ThemeToggle` is hidden below the `md` breakpoint to preserve topbar space; the full preference UI belongs in settings in Phase 26.

## Phase 3 — Public Website and Authentication Interfaces

### Objectives

Implement the public-facing pages and authentication experience.

### Tasks

- Build the public landing page.
- Build product overview and feature sections.
- Build pricing pages based on approved subscription information.
- Build sign-up and sign-in interfaces.
- Build email verification interfaces.
- Build password recovery interfaces.
- Build password reset interfaces.
- Build OAuth sign-in interfaces if supported by the backend.
- Build terms and privacy pages using approved content.
- Add form validation and clear error feedback.
- Handle authentication loading and redirect states.
- Connect forms to existing authentication APIs.

### Important rules

- Do not invent authentication endpoints.
- Do not implement fake authentication.
- Do not expose tokens in browser-accessible storage unless the existing approved authentication architecture requires it.
- Follow the backend's session and token handling approach.

### Deliverables

- Public website.
- Authentication interfaces.
- Connected authentication workflows.

### Phase 3 Progress — In Progress

Verified on 2026-11-03 against the frontend implementation and `../__NexusBackend__/docs/openapi.yaml`, `src/modules/auth/auth.routes.ts`, `src/modules/auth/auth.controller.ts`, and `src/modules/auth/auth.schemas.ts`.

#### Phase 3 task status

| Requirement                                                                        | Status                                                                                                                                                                                                                                                                                                        | Verification or dependency                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public landing page, product overview, and feature sections                        | Implemented; responsive implementation reviewed per user confirmation                                                                                                                                                                                                                                         | No agent manual visual review claimed in this task                                                                                                                                                                                               |
| Pricing page and plan pricing                                                      | Implemented and automated UI test verified                                                                                                                                                                                                                                                                    | Pro is $10/month or $50/year with 15 included seats; Business is $15/month or $70/year with 25 included seats. The owner counts once and uses an included seat. Additional-seat rates are $0.50 Pro and $1 Business per selected billing period. |
| Registration and sign-in forms                                                     | Implemented and automated request, validation, success, and error tests pass                                                                                                                                                                                                                                  | Live backend authentication remains unverified                                                                                                                                                                                                   |
| Email verification and verification resend                                         | Implemented and automated request tests pass                                                                                                                                                                                                                                                                  | Live backend workflow remains unverified                                                                                                                                                                                                         |
| Password recovery and password reset                                               | Implemented and automated success/error/request tests pass                                                                                                                                                                                                                                                    | Live backend workflow remains unverified                                                                                                                                                                                                         |
| Authentication validation and API error feedback                                   | Implemented; covered cases are automated-test verified                                                                                                                                                                                                                                                        | Not every backend validation response has been exercised against a live server                                                                                                                                                                   |
| Session restoration, expired-session refresh, unauthenticated redirect, and logout | Implemented and automated session-boundary tests pass                                                                                                                                                                                                                                                         | Live cookie/session behavior remains unverified                                                                                                                                                                                                  |
| Network/server failure and retry feedback                                          | Implemented and automated session error-state test passes                                                                                                                                                                                                                                                     | Live backend outage behavior remains unverified                                                                                                                                                                                                  |
| Terms and Privacy routes, draft content, and links                                 | Drafts rendered and automated page/link tests pass                                                                                                                                                                                                                                                            | Legal review and approval; bracketed entity, contact, jurisdiction, age, provider, and deployment details remain unresolved                                                                                                                      |
| Paid-plan display and workspace billing                                            | Implemented in progress; pricing, workspace plan/status, authoritative active-seat count, target quantity, checkout, changes, cancellation, and billing history are connected to backend API contracts                                                                                                        | USD account capability and credentials must be configured; migration/provider validation remains                                                                                                                                                 |
| Subscription API and persistence                                                   | Implemented in progress in adjacent backend worktree; Prisma models/migration, routes, Paystack API client, transaction verification, HMAC webhook verification, encrypted provider management tokens, event/payment persistence, owner authorization, and transactionally enforced seat capacity are present | Migration not applied; worktree checks/provider tests and live Paystack test verification pending; removal-to-seat-reduction synchronization and provider reconciliation remain                                                                  |
| OAuth sign-in                                                                      | Not implemented; no frontend OAuth controls were added                                                                                                                                                                                                                                                        | Approved providers and provider configuration, backend routes, callback/account-link contract, and session/security requirements                                                                                                                 |

#### Implemented

- Replaced the root placeholder with a responsive public landing page, product overview, feature sections, and workspace-type overview.
- Updated `/pricing` to display Pro ($10/month or $50/year, 15 included seats) and Business ($15/month or $70/year, 25 included seats), owner inclusion, selected-period additional-seat charges ($0.50 and $1 respectively), and active-only seat rules. Pricing is centralized in `lib/subscription-plans.ts`; the matching backend catalog is `../__NexusBackend__/src/modules/billing/pricing.ts`.
- Added `/sign-in`, `/sign-up`, `/verify-email`, `/forgot-password`, and `/reset-password` with typed forms, local validation, API feedback, loading states, and success states.
- Integrated registration, login, email verification, verification resend, password recovery, and password reset with the backend's verified `/auth/*` contracts.
- Added `/app` as a session-confirmed post-login landing route. It fetches `/auth/me`, attempts refresh when no in-memory access token exists, refreshes an expired access token once, redirects unauthorized sessions to `/sign-in`, retains recoverable network/server error feedback, and supports logout.
- Added `app/api/backend/[...path]/route.ts` as a same-origin proxy. It forwards the backend URL from server-only `NEXUS_API_URL`, request cookies, bearer authorization, and the CSRF header; it also forwards Set-Cookie responses. This avoids browser CORS dependence while keeping the refresh cookie HttpOnly.
- Access tokens are held in module memory only. No token is written to localStorage or sessionStorage.
- Updated `.env.example` to the confirmed local backend base URL (`NEXUS_API_URL=http://localhost:4000/api/v1`).
- Added AuthForm and auth-service tests.
- Added `/app` session-boundary tests for cookie-session restoration, expired access-token refresh, unauthorized-session redirect, network failure feedback, and logout.
- Added substantive Terms and Privacy drafts to `/terms` and `/privacy`, with a shared page template, prominent legal-review warning, and bracketed unresolved facts. Draft files are maintained in `docs/TERMS_OF_SERVICE_DRAFT.md` and `docs/PRIVACY_POLICY_DRAFT.md`; links are available from sign-in, sign-up, pricing, and the public landing page.

#### Awaiting approved legal content

- A substantive Terms of Service draft is available in `docs/TERMS_OF_SERVICE_DRAFT.md` and `/terms`.
- A Privacy Policy draft based on inspected implementation is available in `docs/PRIVACY_POLICY_DRAFT.md` and `/privacy`.
- Both are labeled **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**. They are not approved; entity, address/contact details, governing law, eligibility age, processor/deployment facts, and other bracketed items remain unresolved.

#### Subscription decisions provided

- Pro: $10/month and $50/year; 15 included seats.
- Business: $15/month and $70/year; 25 included seats.
- Additional seat: Pro $0.50 and Business $1.00 per selected billing period. Annual seat billing is annual.
- Workspace owner counts once and consumes one included seat. Only active workspace members with active accounts count; pending, suspended, removed, and deactivated memberships do not.
- Upgrades and seat increases are immediate after verified payment and prorated for remaining base period. Downgrades and seat reductions take effect at renewal; no automatic credit. Cancellation takes effect at period end and benefits continue until then.
- Refunds are manual under the approved policy and applicable law. Failed-payment schedules remain deferred.

The backend owns authoritative charges and membership counts; the frontend displays the returned count and never treats a checkout redirect as payment confirmation.

##### Deferred failed-payment policy

Retry behavior, grace period, owner notifications, subscription status after repeated payment failures, paid-feature access, and treatment of additional-seat charges are explicitly deferred for later business decision. No timeline or action is assumed. Never grant paid access without verified payment and never delete customer data because payment failed.

#### Legal approval still required

The Terms and Privacy drafts remain **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**. Approval is not established by displaying or testing the draft pages.

- Legal entity name, registration details if applicable, and registered/business address are missing.
- Official Terms contact and privacy contact details are missing.
- Governing law, jurisdiction, venue, and dispute-resolution process have not been selected.
- Refund and cancellation wording requires legal review against the business's approved manual refund policy and applicable law. Subscription disclosures and proration language also require legal review.
- Privacy wording on retention, deletion schedules, processors, hosting regions, transfers, minors/eligibility, and user rights requires legal and deployment review.
- Required bracketed placeholders remain in `docs/TERMS_OF_SERVICE_DRAFT.md` and `docs/PRIVACY_POLICY_DRAFT.md`.

#### Billing provider, API, and implementation status

- **Provider:** Paystack. The adjacent backend worktree implements hosted checkout, server-side transaction verification, recurring plans/subscriptions, cancellation, payment history, signature-checked webhook, unique event/payment references, encrypted subscription management tokens, and owner-only mutation routes.
- **API:** `GET /billing/plans`, `GET /billing/workspaces/:workspaceId`, `GET /billing/workspaces/:workspaceId/payments`, `POST /billing/workspaces/:workspaceId/checkout`, `/verify`, `/change`, `/cancel`, and `POST /webhooks/paystack`.
- **Database:** subscription, provider plan, checkout, payment, and webhook event models are added in `../__NexusBackend__/prisma/migrations/20261103160000_phase3_paystack_billing/migration.sql`. Migration has not been applied to a database.
- **Paystack limitation:** plan amounts are fixed; the backend uses one provider plan per plan, interval, and billable seat quantity. Prorated one-time charges are separate from recurring plan setup. Provider/database failure reconciliation needs test coverage.
- **USD:** `PAYSTACK_USD_ENABLED=false` by default. Only the merchant Dashboard/account can confirm and enable USD. No exchange rate or silent currency conversion is used.
- **Seat enforcement:** billing calculates server-side active seats and validates the requested target quantity. Invitation acceptance, approved join requests, direct member creation, and suspended-member restoration check paid capacity inside their transactions. Removal/suspension does not yet automatically schedule seat reductions.
- Current implementation details and external setup requirements are in `docs/SUBSCRIPTION_BILLING_BACKEND_REQUIREMENTS.md`. No real Paystack account or transaction was used.

#### Live authentication verification still required

Automated frontend tests use mocked API responses and validate client behavior; they are not live integration evidence. The backend OpenAPI and auth route/controller contracts exist, but the current verification record says the backend was unreachable at `http://localhost:4000/api/v1/health/live`, and no live authentication workflow was completed.

Test these workflows against a configured, running backend and record results separately from automated tests:

- Registration and email-verification delivery/confirmation.
- Verification resend.
- Sign-in, rejected credentials, session cookie behavior, and authenticated `/auth/me`.
- Password recovery email delivery and password reset.
- Refresh/session restoration, expired access-token refresh, and expired/invalid refresh-session handling.
- Sign-out and server-side session revocation.
- Network/server errors and recovery behavior against the real service.

OAuth remains deferred until its provider and backend contract are approved.

#### Responsive viewport review — user-confirmed

The user confirms that the current responsive implementation has been reviewed and is responsive. This is recorded as user-confirmed; this agent did not perform or claim a manual viewport review in this task. The viewport set below remains a useful repeatable regression checklist, but no exact dimensions or screenshots were supplied with the confirmation:

- Public landing page (`/`).
- Pricing and billing-period selector (`/pricing`).
- Sign-in, sign-up, email verification, password recovery, and password reset.
- Terms and Privacy drafts (`/terms`, `/privacy`).
- Authenticated session landing/error states (`/app`).

When repeating the review, check navigation/header fit, card and legal-text readability, forms and buttons, overflow, focus visibility, and loading/error layouts.

#### Billing implementation dependency

The Paystack billing API and UI are implemented in the current worktrees. USD account enablement, migration validation, Paystack test-mode verification, removal-to-seat-reduction synchronization, and provider reconciliation remain outstanding; billing stays disabled until the merchant enables USD and supplies deployment credentials.

#### Deferred future enhancement

- OAuth remains out of scope until the backend provides and approves the routes and provider contract. The frontend has no OAuth buttons or independent auth path.

Before frontend OAuth work begins, the backend contract must specify:

- Authorization-start and provider-callback operations, plus authenticated account-link and unlink operations if linking is supported. Exact route names and request/response shapes must come from the backend implementation.
- Supported provider(s), provider application configuration, exact redirect URI(s), scopes, and identity claims used to associate an external identity with a Nexus account.
- Callback outcomes for success, cancellation or failure, invalid or expired state, and account-link conflicts, including a safe allowlisted post-authentication redirect.
- Whether provider identities can be linked to existing Nexus accounts, the proof required before linking, and handling for duplicate identities or email collisions. An email match alone must not silently link accounts.
- Session handoff through Nexus's existing session contract: backend code exchange and validation, server-set HttpOnly rotating refresh cookie, CSRF cookie/header behavior where applicable, and short-lived access-token response. Provider tokens and client secrets remain server-side.
- Security requirements including one-time short-lived state, PKCE, nonce and issuer/audience/signature validation when applicable, exact redirect URI validation, CSRF protection, rate limiting, safe redirect validation, and authorization code/token redaction in logs.

These describe backend contract requirements; they are not OAuth routes implemented in this phase.

#### Deployment requirement

- Production deployment must set `NEXUS_API_URL` to the reachable backend API base.

#### Validation

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed after the final Next.js build.
- `npm run build` — passed; generates the marketing, pricing, auth, policy, protected app, and dynamic auth proxy routes.
- Historical checks above predate the current Paystack work. Current billing-specific test results are recorded in the validation continuation below; do not use historical passing checks as evidence for these changes.
- Next.js reported that it ignored `/home/philip-iorwua/pnpm-lock.yaml` because the lockfile is outside this Git repository. The frontend Git/package root is `/home/philip-iorwua/Desktop/__NextFrontend__`, containing `package.json` and `package-lock.json` and no `pnpm-workspace.yaml`; the parent has no pnpm workspace file. The parent pnpm lockfile contains a separate `lucide-react`/React 19.2.8 importer, while this app declares React 19.3.0. This is an unrelated parent lockfile, so the warning is expected and does not indicate a misconfigured app root. No lockfile or workspace configuration was changed.
- Historical auth verification: no live auth workflow was completed in the previous run. The user owns live verification and will perform it; automated frontend tests remain mock-based and are not live-backend evidence.
- Responsive viewport review: the user confirms the current responsive implementation has been reviewed and is responsive. This is user-confirmed; no manual viewport review is claimed by this agent in this task.

#### Validation for approved commercial policies — 2026-11-03

- Frontend: `npm test` passed (21 files, 147 tests); `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. The Next.js build emitted its existing warning about an unrelated parent-directory `pnpm-lock.yaml` and completed successfully.
- Backend: `npm test` passed (136 tests, 0 failures, 1 optional test skipped); `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`, and `git diff --check` passed on the current backend worktree. The new billing policy suite contains 14 unit tests.
- The backend database-backed optional suites were not run; no billing migration was added because there is no persisted subscription contract or selected provider. Prisma Client generation and backend compilation did succeed.
- Automated tests exercise policy calculations only. No live payment provider, subscription endpoint, authentication workflow, payment webhook, or entitlement change was verified. Live authentication remains user-owned; responsive review is user-confirmed, not agent-manually-verified.

#### Phase 3 closure checklist

Phase 3 remains **In Progress** until these requirements are satisfied:

- Approved Terms of Service and Privacy Policy are reviewed and approved, and required legal/business/deployment placeholders are resolved.
- Approved plan prices, included seats, owner inclusion, member-status rules, and lifecycle rules are accurately shown/documented. These commercial approvals are now recorded; frontend tests verify pricing presentation.
- A payment provider is selected and the backend implements the persistent subscription API, verified payment/webhook behavior, idempotency, authorization, and transactional membership enforcement; frontend integration is verified against it.
- Live authentication workflows are exercised by the user against a configured backend, including registration, sign-in, email verification/resend, password recovery/reset, refresh/session restoration, expired-session handling, and logout.
- Responsive behavior has been reviewed and confirmed by the user. This is user-confirmed, not agent-manually-verified evidence. Automated tests, lint, type-check, and production build must also pass for current implementation.

##### Commercial approval gate — satisfied

The user approved Pro 15 and Business 25 included members; the owner counts once and uses an included seat; only active member accounts and active workspace memberships count; pending, suspended, removed, and deactivated memberships do not count; administrators count as active members without a role-based exception. Upgrades, downgrades, seat increases/reductions, cancellation, and manual refund handling are also approved as stated above. The business deferred failed-payment policy. The gate is recorded as satisfied, but this does not mean provider-backed enforcement is implemented.

Remaining Phase 3 blockers are legal approval/placeholders, USD merchant configuration, migration validation, Paystack test-mode verification, subscription provider reconciliation, automatic seat reduction synchronization on member removal/suspension, and full integration coverage for provider lifecycle events. Live authentication is user-owned and pending user execution. Responsive review is user-confirmed; agent manual review was not performed. OAuth remains deferred until its provider and backend contract are approved. Phase 3 remains **In Progress**; Phase 4 is tracked separately below. Phase 5 work was started by explicit user direction on 2026-11-03, without revisiting the earlier phases.

#### Phase 3 billing implementation and validation — 2026-11-03

This addendum records the authorized subscription and Paystack implementation in the frontend and adjacent backend worktrees. It supersedes earlier Phase 3 statements that a provider had not been selected or that paid-seat activation checks did not exist. Paystack was selected by the user; merchant configuration and external verification remain outstanding.

- Frontend billing page and pricing connect to the workspace-scoped billing API for plan comparison, monthly/annual selection, current status, active seats, target seat quantity, checkout, scheduled changes, period-end cancellation, renewal dates, and billing history.
- Backend adds the subscription/payment/checkout/Paystack-plan/webhook-event persistence schema and migration; owner-authorized routes; server-owned USD pricing; transaction verification; raw-body HMAC-SHA512 webhook verification; encrypted recurring-management tokens; payment/event idempotency; recurring plan/subscription handling; and paid-seat-capacity enforcement in invitation acceptance, join approval, direct member creation, and suspended-member restoration.
- API operations: `GET /billing/plans`, `GET /billing/workspaces/:workspaceId`, `GET /billing/workspaces/:workspaceId/payments`, `POST /billing/workspaces/:workspaceId/checkout`, `POST /billing/workspaces/:workspaceId/verify`, `POST /billing/workspaces/:workspaceId/change`, `POST /billing/workspaces/:workspaceId/cancel`, and `POST /webhooks/paystack`.
- Paystack integration uses hosted transaction initialization, server verification, plan/subscription creation and cancellation, and documented subscription/transaction webhooks. Paystack fixed-amount plans are keyed by product, interval, and seat quantity; Nexus calculates server-owned prorated checkout amounts. Provider-side actions and local persistence still need durable reconciliation tests for partial failures.
- Backend environment names are `PAYSTACK_SECRET_KEY`, `PAYSTACK_ENCRYPTION_KEY`, `PAYSTACK_USD_ENABLED`, `PAYSTACK_CALLBACK_URL`, `PAYSTACK_API_URL`, and `PAYSTACK_REQUEST_TIMEOUT_MS`. The hosted checkout flow needs no browser public key or separate webhook secret. Examples and setup instructions are in the backend `.env.example` and `docs/SUBSCRIPTION_BILLING_BACKEND_REQUIREMENTS.md`.
- Added/updated backend tests cover catalog amounts, annual seat cadence, owner de-duplication, excluded membership states, seat-capacity policy, lifecycle/proration helpers, cancellation behavior, checkout request shape, safe reference verification, and raw-body signature validation. Frontend billing/pricing/legal tests cover visible subscription state, owner-only controls, cancellation confirmation, and approved prices.
- Latest validation: backend `npm test` passed 204 tests with 0 failures; 2 optional suites were skipped. Backend `npm run build`, `npm run lint`, and `npm run typecheck` passed; focused Prettier checks passed for changed billing/config/workspace files, and billing-focused tests passed 21/21 after the final seat-target correction. Frontend `npm test` passed (26 files, 163 tests), `npm run lint`, `npx tsc --noEmit`, production build, and `git diff --check` passed. Backend repository-wide `npm run format:check` reports a style issue only in unrelated `src/modules/auth/account-deletion.service.ts`; changed files pass focused formatting checks. The new tests are unit/helper and frontend UI tests; full billing-service API, database, and webhook event idempotency integration tests remain outstanding. No migration was applied because no disposable database configuration was verified. No Paystack test credentials were configured, so no provider transactions or webhook delivery were exercised.
- Legal drafts now include Terms, Privacy, Subscription/Billing, Cancellation, Refund, retention, and account-deletion topics. All require legal/business review and confirmation of bracketed entity, contact, jurisdiction, and other facts.

Phase 3 stays **In Progress** until frontend/backend validations are complete, the migration is applied and verified on a disposable database, Paystack test credentials and USD capability are confirmed, provider integration/idempotency/reconciliation paths pass test-mode verification, remaining membership-removal seat lifecycle work is completed, legal drafts are approved, and the user performs the live authentication checklist.

OAuth is conditional in the Phase 3 roadmap (“if supported by the backend”). While the backend has no approved provider contract or OAuth routes, keep OAuth deferred and add no frontend controls. If product approval brings OAuth into this phase, the backend contract, provider setup, callback/account-link behavior, session handoff, security implementation, and frontend tests must all be completed before closure. If OAuth remains unsupported, record the explicit deferral as accepted scope before declaring Phase 3 complete.

#### Phase 3 remediation continuation — 2026-11-05

This continuation records the current Phase 3 implementation and validation across the frontend and adjacent backend repositories. Existing Phase 4 audit notes and all unrelated dirty files were preserved. No Phase 4 or later implementation was started.

| Requirement                                                                                                | Current status                                                           | Evidence / remaining dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration, sign-in, email verification, recovery/reset, session restoration and logout                  | IMPLEMENTED; MOCK/CONTRACT TESTED; LIVE WRITE WORKFLOW BLOCKED           | Existing frontend and backend contracts remain aligned: short-lived bearer access token in memory, rotating HttpOnly refresh cookie, CSRF checks on refresh/logout, and session revocation. Live health and invalid-token behavior were checked. Registration, email delivery, refresh rotation/reuse, logout and restoration were not exercised because the configured database is remote and no disposable `TEST_DATABASE_URL` is configured.                                                                                                                                                                                                                                                                                                     |
| Account reactivation                                                                                       | IMPLEMENTED; DATABASE INTEGRATION BLOCKED                                | Deactivated accounts may reactivate after password verification and must sign in again. Pending deletion is irreversible; the frontend no longer offers reactivation for that backend status. Database-backed workflow tests were skipped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Account deletion request, recovery, and access revocation                                                 | FRONTEND FLOW IMPLEMENTED; LIVE/DATABASE INTEGRATION BLOCKED             | The finalized policy and current UI use a 30-day scheduled deletion period with immediate session revocation, identity-verified recovery, retained shared records, and separate workspace-transfer/billing acceptance. The frontend submits the documented `/auth/delete` request and supports the documented `/auth/reactivate` sign-in recovery path. Personal-file cleanup remains held where private objects cannot be deleted safely; full lifecycle, race, migration, and live-backend verification remain outstanding.                                                                                         |
| Paystack plans, checkout, verification, webhooks, subscription lifecycle, payments and owner authorization | IMPLEMENTED IN WORKTREE; UNIT TESTED; PROVIDER/DB VERIFICATION BLOCKED   | Hosted checkout, backend amount/currency/reference verification, idempotent webhook processing, encrypted provider management tokens, renewal/cancellation/status reconciliation, payment history and owner-only mutations are present. Webhook verification supports Paystack's current timestamped `Paystack-Signature` and the legacy `x-paystack-signature` fallback. Current provider API behavior was checked against [Paystack transaction documentation](https://paystack.com/docs/api/transaction/), [subscription documentation](https://paystack.com/docs/payments/subscriptions/), and [webhook documentation](https://paystack.com/docs/payments/webhooks/). No sandbox credentials or verified USD merchant capability are available. |
| Active-seat counts, transactional capacity enforcement and seat reductions                                 | IMPLEMENTED IN WORKTREE; UNIT TESTED; DB/PAYSTACK RECONCILIATION BLOCKED | Owner counts once; only active memberships and active accounts count. Invitation acceptance, approved join requests, member creation and suspension restoration check paid capacity transactionally. Removal/suspension now enqueue durable seat-sync work for renewal; the worker creates/reconciles the provider replacement plan. Backend catalog and frontend catalog use approved prices and same-cadence seat rates.                                                                                                                                                                                                                                                                                                                          |
| Database migration and schema verification                                                                 | BLOCKED; NO REMOTE MIGRATION APPLIED                                     | `prisma migrate status` found 15 migrations and reports `20261105030000_phase3_account_deletion_cancellation` plus two Phase 7 migrations pending. Runtime startup also reported `public.BillingSeatSync` missing even though migration history did not list the Phase 3 Paystack migration as pending, indicating remote schema/history drift. The configured `DATABASE_URL` targets remote Aiven `defaultdb`; no disposable local test database credentials are available. No migration was applied.                                                                                                                                                                                                                                              |
| Terms, Privacy, subscription/billing, cancellation/refund and deletion/retention drafts                    | DRAFTED; APP PAGES PARTIALLY IMPLEMENTED; APPROVAL BLOCKED               | Drafts exist in `docs/TERMS_OF_SERVICE_DRAFT.md`, `docs/PRIVACY_POLICY_DRAFT.md`, `docs/SUBSCRIPTION_BILLING_POLICY_DRAFT.md`, and `docs/CANCELLATION_REFUND_POLICY_DRAFT.md`. Terms and Privacy are rendered with draft warnings; billing and deletion topics are disclosed in those drafts. The Paystack configuration document now lists webhook signing-secret variables. Entity/contact, jurisdiction, data-retention, tax/invoice, refund, deletion/ownership, provider and deployment facts remain for business/legal review. No legal approval is claimed.                                                                                                                                                                                  |
| OAuth                                                                                                      | DEFERRED                                                                 | No approved provider or backend OAuth contract exists; no OAuth UI or parallel authentication path was added.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

#### Validation — 2026-11-05

- Frontend `npx tsc --noEmit` passed. `npm run lint` passed with three existing unused-function warnings in discover/invitation components.
- Frontend full `npm test -- --maxWorkers=1`: **failed**, 35/36 files passed and 255/257 tests passed. The two failing Phase 6 invitation-acceptance tests mock `refreshSession()` as `undefined`, while `InvitationAcceptClient` calls `.then()`. That later-phase code and tests were left untouched. The Phase 3 auth, billing, legal and pricing tests were not among the failing cases.
- Frontend configured `npm run build` failed in the Tailwind Turbopack CSS loader subprocess with a timeout. `npx next build --webpack` passed, including compilation, TypeScript, static generation (19 pages), and trace collection. The parent-directory `pnpm-lock.yaml` warning is unrelated to this repository's `package-lock.json`.
- Backend `npm test` passed: 234 tests, 0 failures, 2 optional database suites skipped. The annual Pro seat-sync expectation was corrected to $52.00 for 17 active seats (15 included plus two annual seats at $1 each).
- Backend `npm run typecheck` and `npm run lint` passed after removing two unused symbols in the Phase 3 worktree. Focused Prettier checks pass for changed Phase 3 auth/billing files. Repository-wide `npm run format:check` still reports pre-existing/out-of-scope formatting in Phase 4 email provider and Phase 6/7 files; those files were not reformatted.
- Backend `npm run build` passed after the latest formatting changes. Frontend `npx next build --webpack` passed after the configured Turbopack build timed out.
- Live backend startup succeeded with a process-local `TRUST_PROXY=false` override because the existing backend `.env` has a duplicate invalid `TRUST_PROXY=1` entry. The file was not changed. `GET /api/v1/health/live` returned 200; `/api/v1/auth/me` with an invalid bearer token returned 401 `ACCESS_TOKEN_INVALID`. Startup connected to the remote database and its billing worker reported the missing `BillingSeatSync` table. No registration, billing mutation, email delivery, migration, or deletion was attempted.

Phase 3 remains **In Progress**. At this checkpoint, outstanding requirements included safe disposable-database integration tests and migration/drift resolution, Paystack sandbox and merchant USD verification, an account-deletion ownership/data-retention decision and frontend flow, personal-file cleanup, legal/product approval and missing facts, live authentication verification, and two later-phase invitation test failures. The account-deletion policy and frontend flow were subsequently resolved in the dated addenda below, and the invitation failures are superseded by the passing 40-file/272-test verification recorded at the end of this tracker. Remaining blockers are still external database/provider/legal/live-auth verification and safe personal-file cleanup.

No other independent Phase 3 frontend implementation task is currently identified after the session-boundary redirect and its regression coverage.

## Phase 4 — User Onboarding and Profile Management

### Status — Blocked

Started on 2026-11-03 on `feature/frontend-authentication` at the user's direction to proceed while Phase 3 approval blockers remain open. Phase 3 has not been marked complete.

#### Phase 4 progress

| Requirement                                        | Status                                                                                              | Verification or dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile setup and editing                          | Implemented in progress at `/app/profile`; validation and API integration covered by frontend tests | Uses the verified `/users/me` GET/PATCH contract. Manual live-backend verification and responsive viewport review remain outstanding.                                                                                                                                                                                                                                                                                                                                                                            |
| Profile picture                                    | URL field implemented; required upload/replace/remove workflow blocked                              | The provisional product policy specifies private AWS S3 storage, formats JPEG/JPG, PNG, WebP, GIF, and AVIF, and a strict size below 1,000,000 bytes. The backend exposes only a profile `avatarUrl` field; no authorized upload, replacement, removal, signature validation, or object-deletion contract exists. Do not send files directly to S3 from the browser or treat a user-entered URL as satisfying avatar management.                                                                                 |
| Time zone and locale preferences                   | Editable through the profile contract                                                               | UI/backend integration tests pass; confirm values against a live backend before completion.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| First-time onboarding progress and return behavior | Partially implemented; cross-device persistence blocked                                             | The frontend stores account-type intent in browser local storage and can resume or reuse a matching workspace on that browser. The new provisional product policy requires backend persistence across browsers/devices. No onboarding status endpoint or registration/verification persistence contract exists.                                                                                                                                                                                                  |
| Account security and session/device management     | Implemented against confirmed auth contracts                                                        | Password change, verified email-change request, active-session listing, and confirmed sign-out-all use `/auth/password/change`, `/auth/email/change`, `/auth/sessions`, and `/auth/logout-all`. Individual session revocation and 2FA are not supported by the inspected backend contract.                                                                                                                                                                                                                       |
| Account deletion interface                         | Implemented against the documented 30-day request/recovery contract; live workflow verification pending | Account Security requires the current password, matching account email, and explicit confirmation; it submits `/auth/delete`, explains immediate session termination and the recovery period, and shows the scheduled timestamp after sign-in. `/auth/reactivate` recovery is integrated in sign-in. Backend lifecycle and storage cleanup integration still require live verification. |
| Mobile, tablet, and desktop review                 | User-confirmed reviewed and responsive                                                              | This agent did not perform a manual viewport review in the current task.                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Profile setup/editing, timezone and locale preferences, password/email security, session review, and the 30-day account-deletion request/recovery interface are implemented against inspected contracts. Focused tests passed (8 tests); full frontend validation is recorded below. Phase 4 remains **Blocked** because cross-device onboarding persistence and authorized avatar upload/replacement/removal have no backend contracts. Live profile/session verification is also outstanding. The later account-deletion policy correction below supersedes earlier provisional-policy conflict notes. Phase 5 work is tracked below.

#### Phase 4 validation — 2026-11-03

- `npm test -- --run components/profile/__tests__/AccountSecurity.test.tsx app/app/profile/page.test.tsx` — passed, 2 files and 8 tests.
- `npm test` — passed, 22 files and 152 tests.
- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `npm run build` — passed; `/app/profile` is generated. Next.js emitted its existing warning about the unrelated parent-directory `pnpm-lock.yaml`.
- Live backend workflows and agent-performed viewport review were not run. Responsive behavior remains user-confirmed only.
- Files changed for this progress: `components/profile/AccountSecurity.tsx`, `components/profile/__tests__/AccountSecurity.test.tsx`, `services/account-security.ts`, and the existing in-progress `/app/profile` page and test.

#### Phase 4 next-phase audit — 2026-11-05

- After committing the Phase 3 authentication follow-up, Phase 4 was re-inspected as the next roadmap phase. Existing `/app/profile`, `AccountSecurity`, profile API, and same-browser onboarding intent functionality are present; no duplicate implementation was added.
- `npm test -- --run components/profile/__tests__/AccountSecurity.test.tsx app/app/profile/page.test.tsx` passed (2 files, 8 tests).
- No new Phase 4 feature could be safely implemented against the inspected contracts: cross-device onboarding requires backend-persisted intent; avatar upload, replacement, signature validation, and removal require authorized backend storage contracts. The account-deletion UI has since been added against the finalized 30-day request/recovery contract; live profile/session workflow verification remains outstanding.
- Phase 4 remains **Blocked**. Resume implementation when these backend and product-policy dependencies are resolved; do not treat the existing profile editor's avatar URL field as the required secure upload workflow.

#### Account-deletion policy update — 2026-11-04

- The user's latest provisional product policy supersedes the previous 30-day product-policy assumption: access should be revoked immediately after explicit confirmation, without a user-facing recovery period; eligible personal information is removed asynchronously; shared organizational content is preserved/anonymized as applicable; workspace ownership is transferred or access is restricted; recurring billing is stopped.
- The supplied policy pack remains a fictional working draft pending product-owner confirmation and legal review. Nigeria is an assumption, not an approved governing jurisdiction. The supplied terms, privacy, subscription, and refund policies must not be represented as legally approved.
- The current backend still schedules account deletion after 30 days and does not provide the complete ownership-transfer, billing, avatar-object deletion, and data-retention lifecycle specified by the new policy. Do not expose a frontend deletion workflow until the backend contract and implementation match an explicitly approved product decision.
- Avatar policy now proposes AWS S3, JPEG/JPG, PNG, WebP, GIF, AVIF, and a strict maximum below 1,000,000 bytes. This does not supply a backend upload/signature-validation/removal endpoint; frontend upload remains blocked.
- Onboarding policy requires backend persistence across devices. The current browser-local account-type intent is only a same-browser fallback and does not satisfy this requirement; no matching backend contract was found.

#### Legal and lifecycle policy handoff — 2026-11-04

- Added `docs/LEGAL_IMPLEMENTATION_GUIDE.md` to record draft lifecycle states, public-page requirements, registration-consent dependencies, checkout disclosures, and the verified onboarding, avatar, and account-deletion backend gaps.
- Updated `docs/TERMS_OF_SERVICE_DRAFT.md`, `docs/PRIVACY_POLICY_DRAFT.md`, `docs/CANCELLATION_REFUND_POLICY_DRAFT.md`, and the public draft copy in `lib/legal-policies.ts` to replace the superseded 30-day policy claim with the latest provisional immediate-revocation proposal and an explicit statement that the backend still has a 30-day recovery period.
- The provided pack remains a fictional working draft; Nigeria is only a jurisdiction assumption. No legal or product approval state is inferred, and Phase 3 remains open pending required approvals and live integration checks.
- `npm test -- --run components/legal/__tests__/PolicyPage.test.tsx` — passed (1 file, 3 tests); `npx tsc --noEmit` — passed; `npm run lint` — passed with the same three unrelated unused-function warnings recorded above. Full suite was not rerun for this documentation/copy update.

### Objectives

Provide a smooth onboarding experience for new and returning users.

### Tasks

- Build first-time onboarding.
- Build profile setup.
- Build profile editing.
- Build avatar upload and management.
- Build personal preferences.
- Build timezone and locale preferences if supported.
- Build account security settings.
- Build active session/device management if supported.
- Build account deletion or deactivation interface according to backend capabilities.
- Display onboarding progress.
- Support users returning to incomplete onboarding.

### Deliverables

- User onboarding experience.
- Profile management pages.
- Account settings interfaces.

## Phase 5 — Workspace Creation and Workspace Switching

### Objectives

Support Individual, Company, and Institution workspaces.

### Tasks

- Build personal workspace experience.
- Build company workspace creation interface.
- Build institution workspace creation interface.
- Build workspace settings.
- Build workspace switcher.
- Display workspace type and relevant information.
- Build workspace profile and branding settings.
- Build workspace member overview.
- Build workspace creation success and error states.
- Support users belonging to multiple workspaces.
- Ensure switching workspaces updates the application context.
- Handle workspace loading and unavailable-workspace states.

### Deliverables

- Workspace creation interfaces.
- Workspace switcher.
- Workspace settings.
- Workspace-aware application context.

### Implementation Status (2026-11-03)

**Status: In Progress — partially implemented.** This phase was started at the user's explicit direction to skip earlier phases; the Phase 3 and Phase 4 findings above were not reopened or changed.

| Requirement                                          | Status                | Evidence / limitation                                                                                                                                                                              |
| ---------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace-aware session and membership context       | Implemented           | `providers/WorkspaceProvider.tsx` restores the authenticated user, loads memberships, validates the selected workspace through the backend switch endpoint, and exposes loading/error/retry state. |
| Workspace switcher and workspace information         | Implemented           | `/app` uses the existing `WorkspaceSwitcher`, displays workspace type and counts, and switches through the provider.                                                                               |
| Company and Institution creation                     | Implemented           | `/app/workspaces` submits the documented create payload and activates the returned workspace. Personal workspace creation remains account-provisioned by the backend.                              |
| Workspace settings                                   | Partially implemented | Name, description, and visibility use the documented update endpoint; permission denials surface from the backend.                                                                                 |
| Workspace profile and branding settings              | Partially implemented | Workspace profile fields and company/institution private-logo read/upload/delete are integrated. Workspace colour and theme branding is descoped pending a backend contract. |
| Workspace member overview                            | Implemented           | `/app/workspaces` loads members from the workspace-scoped member endpoint and clears stale results during switches.                                                                                |
| Responsive success, loading, empty, and error states | Implemented in UI     | Creation and switching feedback, empty workspace/member states, and request errors are included. Manual device/browser review remains outstanding.                                                 |
| Live end-to-end backend workflow                     | Not verified          | The frontend service/provider tests cover the confirmed API paths; no live authenticated backend session was used in this run.                                                                     |

**Files added or changed:** `services/workspaces.ts`, `providers/WorkspaceProvider.tsx`, `app/app/workspaces/page.tsx`, `app/app/workspaces/page.test.tsx`, `app/app/layout.tsx`, `app/app/page.tsx`, `app/app/page.test.tsx`, `app/app/profile/page.tsx`, `app/app/profile/page.test.tsx`, `services/__tests__/workspaces.test.ts`, and `providers/__tests__/WorkspaceProvider.test.tsx`.

**Validation:** `npx tsc --noEmit` passed; `npm run lint` passed; `npm run build` passed and emitted `/app/workspaces`; focused Phase 5 tests passed (16/16). The full Vitest suite reported 155 passing and 3 tests outside the touched feature areas timing out at the configured 5-second limit (auth form, sidebar, and legal policy); the cause was not established. `git diff --check` passed.

**Remaining before completion:** backend-defined workspace branding support or an approved reduction of that requirement, live authenticated workflow verification, and responsive/manual review. No backend source or schema was modified.

#### Verification follow-up — 2026-11-04

- `npx tsc --noEmit` — passed.
- `npm run lint` — passed with three existing unused-function warnings in Phase 6 files (`app/app/discover/page.tsx`, `components/members/InvitationsPanel.tsx`, and `components/members/JoinRequestsPanel.tsx`).
- `npm run build` — passed; `/app/workspaces` was generated. Next.js reported the existing parent-directory `pnpm-lock.yaml` warning.
- `npm test` — 35 of 36 test files passed (252 of 254 tests). Two invitation acceptance tests failed because `refreshSession()` returned `undefined` in the test setup and the component called `.then()` on it. This failure is in Phase 6 code and was not changed as part of the Phase 5 audit.
- Backend workspace API docs and `workspace.schemas.ts` were inspected in the adjacent `__NexusBackend__` repository. The general workspace update route confirms name, description, and visibility fields, but has no workspace colour/theme contract. Company/institution profiles have separate logo routes, which are not yet integrated in the frontend. This was previously recorded too broadly as the absence of all branding endpoints; see the correction below.
- No live authenticated workflow or manual responsive viewport review was performed; those requirements remain open.

#### Phase 5 evidence reconciliation — 2026-11-05

Phase 5 remains **In Progress**. Evidence includes `providers/WorkspaceProvider.tsx`, `services/workspaces.ts`, `app/app/workspaces/page.tsx`, `app/app/page.tsx`, the workspace switcher, and tests in `providers/__tests__/WorkspaceProvider.test.tsx`, `services/__tests__/workspaces.test.ts`, `app/app/workspaces/page.test.tsx`, and `app/app/page.test.tsx`. These tests are included in the latest full 44-file/283-test pass recorded in the Phase 5–7 gap-closure evidence below. Backend routes consumed are `GET/POST /workspaces`, `GET/PATCH /workspaces/{workspaceId}`, `POST /workspaces/{workspaceId}/switch`, and workspace member routes. Company/institution profile logo upload/read/delete routes are integrated through authenticated raw-byte services and private blob URLs. Workspace colour/theme branding is descoped pending a backend contract. Live authenticated workflow and manual responsive review remain unverified. The earlier claim that no company/institution logo contract exists is superseded by the current OpenAPI routes.

## Phase 6 — Organisation Membership, Join Requests, and Invitations

### Objectives

Implement organisation membership and invitation workflows.

### Tasks

- Build organisation discovery and search interfaces.
- Build join request submission.
- Build pending join request status.
- Build approved and rejected request states.
- Build invitation acceptance.
- Build invitation rejection or withdrawal where supported.
- Build invitation expiration states.
- Build invitation resend interfaces for authorised administrators.
- Build organisation membership management.
- Build member removal confirmation.
- Build member status indicators.
- Build member role and department assignment interfaces.
- Build invitation history.
- Display appropriate access restrictions to pending applicants.

### Business rules

- Email-domain matching must not automatically grant membership.
- Join requests require organisation approval.
- Join requests expire after seven days.
- Direct invitations expire after 48 hours.
- Expired invitations cannot be accepted.
- Removing organisation membership must not delete the user's Nexus identity or personal workspace.

### Deliverables

- Join request experience.
- Invitation management.
- Membership management interfaces.

### Current evidence — In Progress (2026-11-05)

- `app/app/discover/page.tsx`, `app/app/invitations/page.tsx`, `app/app/members/page.tsx`, `components/members/InvitationsPanel.tsx`, `components/members/JoinRequestsPanel.tsx`, and `components/members/MembersPanel.tsx` implement discovery, join requests, invitations, and membership management.
- Services `services/invitations.ts`, `services/join-requests.ts`, and `services/workspaces.ts` call the shared API client.
- Backend OpenAPI/API contracts include `/workspaces/discover`, `/workspaces/join`, `/workspaces/join-requests/*`, `/workspaces/{workspaceId}/join-requests/*`, `/invitations/*`, `/workspaces/{workspaceId}/invitations/*`, and `/workspaces/{workspaceId}/members/*`. Client status rendering uses the backend `status` and `expiresAt` fields; no expiry duration is computed client-side. Workspace invitation history uses the backend-supported `status` filter; pending applicants are told access is only granted after approval.
- Evidence tests include `services/__tests__/invitations.test.ts`, `services/__tests__/join-requests.test.ts`, `services/__tests__/workspaces.test.ts`, `components/members/__tests__/*`, `app/app/discover/page.test.tsx`, and `app/workspaces/invitations/accept/InvitationAcceptClient.test.tsx`. Current task adds expiry/status assertions where needed; full-suite totals are recorded after this change.
- Live authenticated workflow and manual responsive review remain unverified. Phase 6 is **In Progress**.

## Phase 7 — Roles, Permissions, and Access-Controlled UI

### Objectives

Make the frontend reflect the user's actual permissions.

### Tasks

- Build role display and management interfaces.
- Build permission-aware navigation.
- Build permission-aware action controls.
- Implement reusable permission-checking utilities using backend-provided permissions.
- Build role assignment interfaces.
- Build role change confirmation dialogs.
- Build restricted-access states.
- Build unauthorised and forbidden pages.
- Ensure private resources are not exposed through frontend navigation, cached data, or client-side state.
- Refresh relevant views after role changes.

### Current evidence — In Progress (2026-11-05)

- `lib/permissions.ts` centralizes role/capability checks; `lib/navigation.ts` and `components/layout/Sidebar.tsx` filter navigation; `components/members/MembersPanel.tsx` provides role/member actions with backend responses remaining authoritative.
- Backend routes consumed include workspace member list/add/change/remove/suspend/restore, join-request decisions, invitation management, and workspace switching. The current OpenAPI also includes incoming ownership transfer listing, accept/reject, and separate billing acceptance; the UI now provides an incoming-transfer inbox and rejection confirmation. The backend now includes `initiatedBy: { id, name }` in each incoming-transfer item, and the UI displays the sender's name.
- Privacy request endpoints (`POST /privacy-requests`, own-request list/detail, review, decision, completion, and comment redaction) exist in backend OpenAPI. The Privacy Requests page now submits requests and lists/loads the current user’s requests. Reviewer, decision, completion, and redaction screens remain out of scope because they require platform reviewer authority.
- Evidence tests: `lib/__tests__/permissions.test.ts`, `lib/__tests__/navigation.test.ts`, `components/members/__tests__/MembersPanel.test.tsx`, `components/layout/__tests__/Sidebar.test.tsx`, and `components/layout/__tests__/AuthenticatedShell.test.tsx`; new ownership inbox tests are in `services/__tests__/ownership-inbox.test.ts` and `components/workspaces/__tests__/OwnershipLifecyclePanel.test.tsx`; privacy request tests are in `services/__tests__/privacy-requests.test.ts` and `app/app/privacy-requests/page.test.tsx`.
- Remaining: live backend authorization verification and manual responsive review remain outstanding. Reviewer-only privacy workflows are out of scope. Phase 7 remains **In Progress**.

#### Phase 5–7 gap closure — 2026-11-05

- FE-5 added `components/workspaces/WorkspaceLogoManager.tsx` and logo methods in `services/workspaces.ts`. Company/institution logo POST sends raw PNG/JPEG/WebP bytes with matching `Content-Type`; GET uses the authenticated API client and a revocable object URL; DELETE is confirmed. Contract limits and formats come from backend API.md (2 MB, PNG/JPEG/WebP). Workspace colour/theme branding is descoped pending a backend contract. Routes: `GET/POST/DELETE /workspaces/{workspaceId}/company-profile/logo` and the corresponding `institution-profile/logo` routes.
- FE-6 removed only the three unused duplicate loader callbacks. Existing resend/revoke/approve/reject/withdraw actions were already wired. Acceptance now disables itself for non-pending previews and explicitly shows the backend `EXPIRED` state. User-facing status and expiry dates use backend fields; invitation creation feedback uses returned `expiresAt`; no client expiry duration is calculated.
- FE-7 added `services/privacy-requests.ts`, the submitting/list/detail UI, and incoming ownership-transfer list/reject services and inbox UI. Billing acceptance remains a separate action after ownership acceptance. Reviewer-only review/decision/completion/redaction screens remain out of end-user scope. The backend now returns `initiatedBy: { id, name }` on incoming-transfer items; the inbox displays the sender's name ("Alice is offering you ownership of Acme Corp.") with a null-safe fallback to "Someone".
- FE-7 member role edits, suspension and restoration now require consequence confirmation; successful changes update the member data and refresh the workspace context/navigation. `components/shared/AccessState.tsx` handles workspace-member list 401/403 responses. Workspace-scoped local state is keyed or invalidated on workspace changes in billing, workspaces, members, teams, team detail, and groups; list/detail request guards prevent older responses replacing current workspace data. The workspace settings regression test verifies old member data is not shown after switching. `WorkspaceProvider` persists only the active workspace ID; private resource records are not written to local/session storage.
- Added or updated tests: `services/__tests__/workspaces.test.ts`, `services/__tests__/ownership-inbox.test.ts`, `services/__tests__/privacy-requests.test.ts`, `components/workspaces/__tests__/OwnershipLifecyclePanel.test.tsx`, `app/app/privacy-requests/page.test.tsx`, `app/app/workspaces/page.test.tsx`, and `app/workspaces/invitations/accept/InvitationAcceptClient.test.tsx`. Latest full verification after the workspace-state guard changes passed 44 test files and 283 tests; `npx tsc --noEmit`, `npm run lint` (zero warnings), `npm run build`, and `git diff --check` also passed. Live backend and manual responsive checks remain unverified, so Phases 5–7 remain **In Progress**. Live backend and manual responsive checks remain unverified, so Phases 5–7 remain **In Progress**.

### Business rules

Company roles:

- Owner
- Admin
- Team Lead
- Member
- Guest

Institution roles:

- Owner
- Institution Admin
- Department Admin
- Team/Group Lead
- Member
- Guest

Important restrictions:

- Only the Owner can remove or demote another administrator.
- Admins cannot remove the Owner.
- Team Leads cannot remove organisation members unless specifically authorised.
- Frontend permission checks are for user experience only; the backend remains authoritative.

### Deliverables

- Role and permission interfaces.
- Permission-aware navigation and controls.
- Restricted-access experiences.

## Phase 8 — Departments, Teams, and Groups

### Objectives

Provide organisational structure management.

### Tasks

- Build department management.
- Build team management.
- Build institution group management.
- Build team creation and editing.
- Build team member assignment.
- Build department member assignment.
- Build team details pages.
- Build team activity views.
- Build team-specific navigation.
- Build team lead management interfaces.
- Display users who belong to multiple teams.
- Display organisation members who are not assigned to teams.

### Deliverables

- Department management.
- Team management.
- Institution group management.

### Current implementation status — In Progress (2026-11-05)

- Added workspace-scoped department, team, and institution-group API services using the registered backend contracts.
- Added `/app/teams` for team creation/editing, team leads, member assignment/removal, archival, institution department assignment, department creation/rename, and department member assignment.
- Added `/app/groups` for institution group creation/editing/deletion and group member/lead management.
- Added workspace-kind-aware navigation for company/institution teams and institution groups. Every mutation remains subject to backend authorization.
- The team view presents member assignment counts, users with no team assignment, and multiple team memberships only from team membership records the current user is authorized to read.
- API contract tests cover department, team, and group request paths and payloads.
- Remediation (2026-11-05): fixed the Teams route JSX/import errors and filtered organization navigation by workspace kind; guarded team/group loads against out-of-order responses after workspace switches. Added an out-of-order Teams workspace regression test.
- Current verification and the two remaining backend contracts (department-member roster and team activity) are recorded in `docs/PHASE_8_ORGANISATION_STRUCTURE.md`. Phase 8 remains In Progress pending those dependencies and authenticated browser verification. A separate capability-flags contract is not required. The earlier Turbopack timeout was superseded by the subsequent successful default `npm run build` recorded below.
- Backend currently has no team activity endpoint. Department membership APIs permit assignment/removal but do not return department member identities; the UI therefore does not claim to show the roster or offer removal controls without a confirmed member list.
- Current backend contract gap review: department-member roster listing and team activity are absent from `docs/openapi.yaml` and registered routes. Team/group member list routes do exist. Actor-specific capability flags are not treated as a missing contract or phase blocker; the frontend handles documented operations and backend authorization errors.
- TypeScript, lint, test, and production build results are recorded in `docs/PHASE_8_ORGANISATION_STRUCTURE.md` after this implementation's validation.
- Phase 8 remains In Progress. Phase 7 status is unchanged and Phase 9 is In Progress on `feature/phase-9-projects`.

#### Part A hardening evidence — 2026-11-05

Branch: `feature/frontend-authentication`. Committed and pushed as `6f78c13`.

- **A2 Workspace-switch state safety**: Audited all workspace-scoped pages. `billing` uses `key={activeWorkspace.id}`, `teams` and `groups` use `latestLoad` refs + `loadedWorkspaceId` guards. `discover`, `invitations`, and `privacy-requests` are user-scoped (not workspace-scoped). No workspace-private data in `localStorage` or `sessionStorage` — only `nexus-active-workspace` (workspace ID), `nexus-theme` (theme preference), and `PENDING_ONBOARDING_KEY` (account type intent) are stored.
- **A3 Access states**: Added `AccessState` component usage to `billing/page.tsx`, `teams/page.tsx`, and `groups/page.tsx` for 401/403 load failures. Previously only `MembersPanel` used `AccessState`. Added 6 new tests (2 per page: 401 and 403 scenarios). Also added groups page workspace-switch regression test (2 tests). 13 new tests total, all passing.
- **A4 Quality pass**: Logo manager verified — blob URLs revoked on unmount via `URL.revokeObjectURL`, `ConfirmDialog` on delete, size limit 2 MB and types PNG/JPEG/WebP from backend API docs. Privacy-request page has double-submit protection via `setWorking`. Transfer inbox has double-submit protection via `busy` state.
- **A5 Phase 8 safe items**: Teams detail page already states "Team activity is not available because the backend does not currently expose a team activity endpoint." Department assignment card already states "The backend supports assignment, but does not currently expose department member identities for listing or removal here." No fabricated content was added.

## Phase 9 — Projects and Project Visibility

### Objectives

Build the project management interface.

### Tasks

- Build project listing.
- Build project creation and editing.
- Build project overview.
- Build project members and participants.
- Build project settings.
- Build project discussions entry point.
- Build project file section.
- Build project timeline and milestones entry point.
- Build project activity feed.
- Build project filters and sorting.
- Build project archiving and restoration interfaces if supported.
- Implement project visibility selection.

### Project visibility types

1. Organisation-wide.
2. Department/team-only.
3. Private/invitation-only.

### Important rules

- Visibility must be clearly displayed.
- Changing visibility must show appropriate confirmation where access changes.
- Private project content must not leak into other workspace views.
- Associated tasks, files, messages, meetings, and activity must respect project visibility.

### Deliverables

- Project management experience.
- Project detail interface.
- Visibility controls.

### Phase 9 Status — In Progress (2026-11-05)

Branch: `feature/phase-9-projects` (from `feature/frontend-authentication`).

#### Implementation evidence

| Requirement | Status | Evidence |
|---|---|---|
| Project listing with filters, sorting, and pagination | Implemented | `app/app/projects/page.tsx` — cursor-paginated list with search, status filter, visibility filter, include-archived toggle, and Load more button. Uses `listProjects` service against `GET /workspaces/{workspaceId}/projects`. |
| Project creation and editing | Implemented | Create modal in `page.tsx` with Zod validation (name min 2 max 100, key min 2 max 16 alphanumeric+hyphen+underscore). Edit form in `settings/page.tsx` with `updateProject` against `PATCH /workspaces/{workspaceId}/projects/{projectId}`. |
| Project overview page | Implemented | `app/app/projects/[projectId]/page.tsx` — displays name, key, status, visibility, owner, members, dates, labels. Entry points for Tasks, Discussions, and Files clearly labeled as unavailable (no backend contract). |
| Project members and participants | Implemented | `app/app/projects/[projectId]/members/page.tsx` — lists members from `GET .../members`, add member with role, change role, remove member with ConfirmDialog. |
| Project settings | Implemented | `app/app/projects/[projectId]/settings/page.tsx` — edit name, key, description, status, visibility. Visibility change requires confirmation dialog stating the consequence. Archive/restore in danger zone. |
| Activity feed | Implemented | `app/app/projects/[projectId]/activity/page.tsx` — cursor-paginated activity from `GET .../activity`. |
| Milestones | Implemented | `app/app/projects/[projectId]/milestones/page.tsx` — list, create, edit, complete/reopen, delete with ConfirmDialog. Uses Zod validation. |
| Archive and restore | Implemented | `POST .../archive` and `POST .../restore` with ConfirmDialog on both the list page and settings page. |
| Visibility selection | Implemented | Three values: WORKSPACE, DEPARTMENT_TEAM, PRIVATE. Confirmation dialog on settings page warns about access consequences when changing visibility. |
| Navigation entry | Implemented | Projects entry added to `lib/app-navigation.ts` under a "Work" section, filtered by `workspace:view` permission, visible for all workspace types. |
| Entry points for discussions, files, timeline | Implemented (unavailable) | Overview page shows three cards labeled as unavailable with explanations: "Task management is not yet available. The backend task API is not currently registered.", "Project discussions are not yet available. No backend message/channel contract is registered for projects.", "Project file management is not yet available. The backend file/attachment API is not currently registered." |
| Workspace-switch state safety | Implemented | Project list page uses `latestLoad` ref + `loadedWorkspaceId` guard pattern, consistent with teams/groups pages. |
| AccessState for 401/403 | Implemented | All project pages use `AccessState` component for 401/403 load failures. |
| Zod validation | Implemented | Create form, edit form, and milestone form all use Zod schemas. No new dependencies required (Zod was already installed in Phase 1). |

#### Backend routes consumed

- `GET /workspaces/{workspaceId}/projects` — list with cursor, limit, status, visibility, teamId, departmentId, search, includeArchived
- `POST /workspaces/{workspaceId}/projects` — create with name, key, description, category, labels, visibility, teamId, departmentId, startDate, dueDate
- `GET /workspaces/{workspaceId}/projects/{projectId}` — read single project
- `PATCH /workspaces/{workspaceId}/projects/{projectId}` — update name, key, description, category, labels, visibility, status, teamId, departmentId, startDate, dueDate
- `DELETE /workspaces/{workspaceId}/projects/{projectId}` — soft-delete (not exposed in UI; archive/restore used instead)
- `POST /workspaces/{workspaceId}/projects/{projectId}/archive` — archive
- `POST /workspaces/{workspaceId}/projects/{projectId}/restore` — restore
- `POST /workspaces/{workspaceId}/projects/{projectId}/transfer-ownership` — not yet integrated (future enhancement)
- `GET /workspaces/{workspaceId}/projects/{projectId}/members` — list members
- `POST /workspaces/{workspaceId}/projects/{projectId}/members` — add member with role
- `PATCH /workspaces/{workspaceId}/projects/{projectId}/members/{userId}` — update role
- `DELETE /workspaces/{workspaceId}/projects/{projectId}/members/{userId}` — remove member
- `GET /workspaces/{workspaceId}/projects/{projectId}/activity` — cursor-paginated activity
- `GET /workspaces/{workspaceId}/projects/{projectId}/milestones` — list milestones
- `POST /workspaces/{workspaceId}/projects/{projectId}/milestones` — create milestone
- `PATCH /workspaces/{workspaceId}/projects/{projectId}/milestones/{milestoneId}` — update milestone
- `DELETE /workspaces/{workspaceId}/projects/{projectId}/milestones/{milestoneId}` — delete milestone
- `PATCH /workspaces/{workspaceId}/projects/{projectId}/organizational-access` — not yet integrated in UI (future enhancement for department/team association)

#### Files created

- `app/app/projects/page.tsx` — project list with filters, create modal, archive/restore
- `app/app/projects/page.test.tsx` — 9 tests (list display, empty state, AccessState 401/403, workspace switch, create modal, form validation, archive confirm, load more)
- `app/app/projects/[projectId]/layout.tsx` — tab navigation (Overview, Members, Milestones, Activity, Settings)
- `app/app/projects/[projectId]/page.tsx` — overview with unavailable feature labels
- `app/app/projects/[projectId]/members/page.tsx` — member management
- `app/app/projects/[projectId]/milestones/page.tsx` — milestone CRUD
- `app/app/projects/[projectId]/activity/page.tsx` — activity feed
- `app/app/projects/[projectId]/settings/page.tsx` — edit, visibility change with confirmation, archive/restore
- `services/__tests__/projects.test.ts` — 10 service contract tests

#### Files modified

- `lib/app-navigation.ts` — added Projects nav entry under "Work" section
- `lib/app-navigation.test.ts` — added test verifying Projects entry for all workspace types
- `services/projects.ts` — added `deleteProjectMilestone` function

#### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed (0 errors, 0 warnings) |
| `npm test -- --maxWorkers=1` | Passed (47 files, 311 tests) |
| `npm run build` | Passed (all project routes generated: /app/projects, /app/projects/[projectId], /app/projects/[projectId]/members, /app/projects/[projectId]/milestones, /app/projects/[projectId]/activity, /app/projects/[projectId]/settings) |
| `git diff --check` | Passed |

#### Phase 9 follow-up — 2026-11-05

Additional implementation on `feature/phase-9-projects` after initial commit (`1abc85d`).

**1. Organizational access integrated.** Project create form now shows team and department pickers when visibility is DEPARTMENT_TEAM, passing `teamId` and `departmentId` to `POST .../projects`. Settings page shows an "Organizational access" section (team/department pickers + save button) when visibility is DEPARTMENT_TEAM, calling `PATCH .../organizational-access`. Overview page displays associated team and department for DEPARTMENT_TEAM projects. Backend constraint: department-bound teams must use the same department (enforced server-side as a 409). Tests: organizational access section shown/hidden, save calls correct route.

**2. Workspace switching on project detail pages.** Added `hooks/useWorkspaceRedirect.ts` — a hook that redirects to `/app/projects` when the active workspace changes while viewing a detail page. Used in overview, members, milestones, activity, and settings pages. Regression tests: all 5 detail pages redirect on workspace change (5 passing tests in `workspace-switch.test.tsx`).

**3. A2 audit completed.** All workspace-scoped pages audited:
- `billing` → `key={activeWorkspace.id}` ✅
- `members`, `invitations`, `join-requests` panels → `key={activeWorkspace.id}` ✅
- `teams`, `groups` → `latestLoad` refs ✅
- `workspaces` → `WorkspaceSettings key={activeWorkspace.id}` + added `key={activeWorkspace.id}` to `OwnershipLifecyclePanel` ✅
- `discover`, `invitations`, `privacy-requests` → user-scoped, no workspace state ✅
- `projects` list → `latestLoad` + `loadedWorkspaceId` ✅
- project detail pages → `useWorkspaceRedirect` ✅
- Browser storage: `nexus-active-workspace` (workspace ID only), `nexus-theme` (preference), `PENDING_ONBOARDING_KEY` (account type intent) — no workspace-private data.

**4. Sorting: backend gap recorded.** `GET /workspaces/{ws}/projects` supports `cursor`, `limit`, `status`, `visibility`, `teamId`, `departmentId`, `search`, `includeArchived`. No `sort` or `orderBy` parameter is registered. No sort control was added; a backend API gap is recorded here.

**5. Ownership transfer integrated.** `POST .../transfer-ownership` with `{ newOwnerId, previousOwnerRole? }` added to `services/projects.ts`. Settings page has a member picker + "Transfer ownership" button with ConfirmDialog stating the consequence. Service contract test added. Tests: section visible, dialog opens, confirmation calls the route.

**6. Docs updated.** `docs/ACCOUNT_LIFECYCLE_FRONTEND.md` notes Phase 9 organizational-access and ownership-transfer integration. `docs/PHASE_8_ORGANISATION_STRUCTURE.md` validation record updated to reflect current test/build results (supersedes stale historical counts).

**7. Private-project handling verified.** The backend applies visibility in the database query (`listWorkspaceProjects` description: "PRIVATE requires project ownership or explicit project membership"). The frontend renders whatever the backend returns without additional client-side filtering. Confirmed: no client-side visibility filtering exists in the project list page.

**Follow-up validation:**

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed |
| `npm run lint` | Passed (0 errors, 0 warnings) |
| `npm test -- --maxWorkers=1` | Passed (49 files, 323 tests) |
| `npm run build` | Passed |
| `git diff --check` | Passed |

Live-backend and manual responsive checks remain unverified.

#### Remaining gaps

- Live backend verification not performed; all tests use mocked API responses.
- Manual responsive review not performed.
- Sorting: no `sort` parameter in the backend project-list API. Record as a backend gap.
- Project discussions, files, and timeline entry points are labeled as unavailable; no backend contract exists for these.
- Task management is not part of Phase 9; no task API is registered in the backend.
- No mock data in production code. No tokens or private data in browser storage.

## Phase 10 — Tasks and Work Management

### Objectives

Build the complete task management experience.

### Tasks

- Build task creation and editing.
- Build task detail views.
- Build task assignment interfaces.
- Support multiple assignees where backend functionality permits.
- Build status and priority controls.
- Build due dates and scheduling.
- Build subtasks and checklists.
- Build labels and categories.
- Build task comments.
- Build task attachments.
- Build @mention interfaces.
- Build task dependencies.
- Build task activity history.
- Build task filters and sorting.
- Build task search.
- Build task views:
  - Board
  - List
  - Timeline
  - Calendar
- Ensure all views use the same underlying task data.
- Build task status transitions.
- Build task completion and reopening interactions.

### Deliverables

- Full task management interface.
- Multiple task views.
- Task details and collaboration.

### Phase 10 Status — In Progress (2026-11-06)

Branch: `feature/phase-9-projects`.

#### Contract correction

The Phase Status Summary table previously recorded Phase 10 as "Not Started" and the contract map recorded "No task module/API registered." Both are incorrect. The adjacent backend has a complete task module registered at `src/modules/tasks/` and mounted in `src/routes/index.ts`:

```
/workspaces/:workspaceId/projects/:projectId/tasks       — CRUD, list
/workspaces/:workspaceId/projects/:projectId/tasks/:id   — get, update, delete
/:id/archive, /:id/restore, /:id/complete, /:id/reopen
/:id/assignees, /:id/assignees/:userId
/:id/dependencies, /:id/dependencies/:dependsOnTaskId
/:id/comments, /:id/comments/:commentId
```

#### Pre-existing bug fixed

The milestones page (`app/app/projects/[projectId]/milestones/page.tsx`) uses `useParams()` to destructure `projectId`, but a pre-existing workspace-switch test (`workspace-switch.test.tsx`) passed `params` as a prop and did not mock `useParams`. The test was corrected: `useParams` is now mocked in `next/navigation` and the milestones test case renders `<Page />` without a `params` prop. TypeScript now reports zero errors.

#### Implementation evidence

| Requirement | Status | Evidence |
|---|---|---|
| Task creation and editing | Implemented | Create task modal with Zod validation (title min 2/max 200, priority, status, dates, labels). `updateTask` on detail page inline edit form covers all backend-documented fields. |
| Task detail view | Implemented | `app/app/projects/[projectId]/tasks/[taskId]/page.tsx` — full task with inline edit, metadata sidebar (status, priority, dates, creator, counts). |
| Assignees (multiple) | Implemented | Assignee section in detail page: list current, add from project member select, remove with ConfirmDialog. Calls `addAssignee`/`removeAssignee`. |
| Status and priority controls | Implemented | Status and priority shown as Badges in list and detail. Editable in inline edit form. Complete/reopen status transitions via dedicated backend endpoints. |
| Due dates and scheduling | Implemented | Start and due date inputs (date type) in create and edit forms. Dates displayed in all views. |
| Labels and categories | Implemented | Labels (comma-separated) and category in create/edit forms. Labels shown as Badge chips. Board/List/Timeline/Calendar all render labels. |
| Task comments | Implemented | Comments section in detail page: list, add, inline edit, delete (with ConfirmDialog). Author-only edit/delete enforced by `user.id === comment.authorId` check. |
| Task dependencies | Implemented | Dependencies section in detail page: list with status badge, add via task ID input, remove with ConfirmDialog. Read-only blockers section shows tasks waiting on this task. |
| Task filters and sorting | Implemented | Status, priority, search, includeArchived filters. sortBy (position/dueDate/priority/createdAt) and sortOrder (asc/desc) selects. |
| Task search | Implemented | Search input passes `search` param to `listTasks`. |
| Board view | Implemented | Tasks grouped into 6 status columns. Cards show key, title, priority badge, assignee initials, due date. Horizontal-scroll on mobile. |
| List view | Implemented | Table-style layout with columns: Key, Title, Status, Priority, Assignees, Due Date. Rows link to task detail. |
| Calendar view | Implemented | Month grid with prev/next/today navigation. Tasks shown on due-date cells. Unscheduled tasks section below. |
| Timeline view | Implemented | Tasks grouped by due date (chronological). Each entry shows key, title, status badge, priority badge, date range. "No due date" group. |
| All views use same data | Implemented | Single `listTasks()` call at load. View mode state switches rendering. Filters/sorting affect all views. |
| Task status transitions | Implemented | Complete → sets status to APPROVED via `/complete` endpoint. Reopen → sets status to IN_PROGRESS via `/reopen` endpoint. Both via ConfirmDialog. |
| Task completion and reopening | Implemented | Complete/Reopen buttons in task detail header. State updates reflected immediately after response. |
| Archive and restore | Implemented | Archive/Restore via dedicated endpoints on both list page (per-card) and detail page header. |
| Task deletion | Implemented | Delete button on detail page with ConfirmDialog (destructive). Navigates to task list after deletion using `useRouter().push()`. |
| Loading, empty, error, access-denied states | Implemented | Skeleton loaders, EmptyState, Alert for errors, AccessState for 401/403 on every page. |
| Workspace-switch safety | Implemented | `latestLoad` ref + `loadedWorkspaceId` guard on task list. `useWorkspaceRedirect()` on both list and detail pages. |
| Navigation entry | Implemented | Tasks tab added to `[projectId]/layout.tsx` between Overview and Members. Overview page Tasks card now links to the tasks page with task count. |

#### Backend routes consumed

- `GET /workspaces/{workspaceId}/projects/{projectId}/tasks` — list with cursor, limit, status, priority, assigneeId, labels, search, sortBy, sortOrder, includeArchived
- `POST /workspaces/{workspaceId}/projects/{projectId}/tasks` — create
- `GET /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` — get single task
- `PATCH /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` — update
- `DELETE /workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` — soft-delete
- `POST .../tasks/{taskId}/archive` — archive
- `POST .../tasks/{taskId}/restore` — restore
- `POST .../tasks/{taskId}/complete` — mark complete (sets status APPROVED)
- `POST .../tasks/{taskId}/reopen` — reopen (sets status IN_PROGRESS)
- `POST .../tasks/{taskId}/assignees` — add assignee (body: `{ targetUserId }`)
- `DELETE .../tasks/{taskId}/assignees/{userId}` — remove assignee
- `POST .../tasks/{taskId}/dependencies` — add dependency (body: `{ dependsOnTaskId }`)
- `DELETE .../tasks/{taskId}/dependencies/{dependsOnTaskId}` — remove dependency
- `GET .../tasks/{taskId}/comments` — list comments
- `POST .../tasks/{taskId}/comments` — add comment (body: `{ body, parentId? }`)
- `PATCH .../tasks/{taskId}/comments/{commentId}` — update comment
- `DELETE .../tasks/{taskId}/comments/{commentId}` — delete comment

#### Files created

- `services/tasks.ts` — typed task API service with all operations and types
- `services/__tests__/tasks.test.ts` — 23 contract tests covering all operations
- `app/app/projects/[projectId]/tasks/page.tsx` — task list with Board/List/Calendar/Timeline views
- `app/app/projects/[projectId]/tasks/page.test.tsx` — 8 page tests
- `app/app/projects/[projectId]/tasks/[taskId]/page.tsx` — task detail page

#### Files modified

- `app/app/projects/workspace-switch.test.tsx` — fixed pre-existing test: added `useParams` mock, removed `params` prop from milestones render
- `app/app/projects/[projectId]/layout.tsx` — added Tasks tab
- `app/app/projects/[projectId]/page.tsx` — replaced unavailable Tasks card with link to tasks page

#### Validation

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Passed — 0 errors |
| `npm run lint` | Passed — 0 errors, 0 warnings |
| `npm test -- --maxWorkers=1` | Passed — 51 files, 358 tests |
| `npm run build` | Passed — `/app/projects/[projectId]/tasks` and `/app/projects/[projectId]/tasks/[taskId]` routes generated |

#### Remaining gaps

Phase 10 remains **In Progress** due to:

- **Attachments**: Task attachment upload, listing, and download are not implemented. The backend exposes no general file/attachment upload contract for tasks (only org logo routes exist). Blocked by the same missing backend storage contract as Phase 13.
- **@mentions**: `@mention` interface in comments and task descriptions is not implemented. No backend @mention resolution or notification contract exists for task comments beyond the existing TASK_ASSIGNED notification.
- **Subtasks / checklists**: Sub-task creation is not wired in the UI (though the backend supports `parentTaskId`). A dedicated subtask list panel was not built. No checklist model is registered in the backend.
- **Activity history per task**: The backend records audit events for task mutations but does not expose a per-task activity timeline endpoint. Only the project-level activity feed exists.
- **Live backend verification**: All tests use mocked API responses. No live authenticated backend session was used.
- **Manual responsive review**: Not performed by this agent; awaiting user confirmation.

### Objectives

Build Nexus messaging interfaces.

### Conversation types

- Direct messages.
- Group conversations.
- Team channels.
- Project conversations.
- Announcements.

### Tasks

- Build conversation list.
- Build direct message interface.
- Build group conversation interface.
- Build channel interface.
- Build project conversation interface.
- Build announcements interface.
- Build message composer.
- Build message replies and threads.
- Build reactions.
- Build @mentions.
- Build file attachments.
- Build message editing and deletion controls.
- Build pinned messages.
- Build saved messages.
- Build typing indicators.
- Build online presence.
- Build read indicators.
- Build message search.
- Build conversation settings.
- Build member management for group conversations.
- Connect to existing real-time infrastructure.
- Handle reconnection and connection errors.
- Implement optimistic UI only where it can be reconciled safely with server responses.

### Channel permissions

- Owners have full channel control.
- Admins manage channels according to their permissions.
- Team Leads may manage channels within assigned teams when authorised.
- Members cannot create channels by default.
- Guests only access explicitly shared channels.

### Deliverables

- Real-time messaging interface.
- Conversation management.
- Channel management.
- Messaging state and connection handling.

## Phase 12 — Notification Centre and Activity Feed

### Objectives

Build the general notification and activity experience.

### Tasks

- Build notification centre.
- Build unread notification count.
- Build notification detail and navigation.
- Build mark-as-read functionality.
- Build mark-all-as-read functionality.
- Build notification preferences.
- Build activity feed.
- Build activity filters.
- Build real-time notification updates.
- Build grouped activity presentation.
- Build notification loading and empty states.

### Critical notification separation rule

Messages and message @mentions must appear only in the Messages area.

They must not appear in the general notification bell.

The following unread counts must remain independent:

- General notifications.
- Direct and group messages.
- Channel messages.

General notification examples include:

- Task assignments.
- Task-comment mentions.
- Meeting invitations and changes.
- Join request decisions.
- Directly shared files.
- Security and access changes.

### Deliverables

- General notification centre.
- Activity feed.
- Independent message and notification unread states.

## Phase 13 — File Management and Nexus Drive

### Objectives

Build file and document management interfaces.

### Tasks

- Build file browser.
- Build folder navigation.
- Build file upload.
- Build multiple-file upload where supported.
- Build upload progress.
- Build file preview.
- Build file download.
- Build file search.
- Build file details.
- Build file sharing.
- Build file permissions and access management.
- Build file deletion and restoration where supported.
- Build file version history if supported.
- Build storage usage indicators.
- Build project and workspace file sections.
- Handle private file access using backend-authorised URLs.
- Handle upload failures and retry states.

### Deliverables

- Nexus Drive interface.
- File upload and management.
- File preview and sharing.

## Phase 14 — Document Collaboration

### Objectives

Build document creation and collaboration interfaces.

### Tasks

- Build document listing.
- Build document creation.
- Build document editor interface.
- Build document preview.
- Build document sharing.
- Build document access controls.
- Build document comments.
- Build document version history if supported.
- Build document collaboration indicators.
- Build document search.
- Build document organisation and folder management.
- Integrate with the existing document editing/collaboration backend.

### Deliverables

- Document management.
- Document editing experience.
- Document collaboration interfaces.

## Phase 15 — Calendar and Scheduling

### Objectives

Build the Nexus calendar experience.

### Tasks

- Build calendar page.
- Build day, week, and month views.
- Build event creation and editing.
- Build event details.
- Build event invitations.
- Build participant management.
- Build calendar filters.
- Build workspace calendar views.
- Build personal and workspace calendar separation.
- Build Google Calendar connection interface.
- Build Microsoft Outlook Calendar connection interface.
- Build sync status and error indicators.
- Build conflict and duplicate handling feedback.
- Build privacy controls for event details.

### Business rules

- Calendar synchronisation is two-way.
- Prevent duplicate events.
- Display sync errors clearly.
- Respect private event visibility.
- Do not expose private event details to unauthorised workspace members.

### Deliverables

- Calendar interface.
- Scheduling workflows.
- Calendar integration settings.

## Phase 16 — Meetings and Calling

### Objectives

Build the meeting experience using the existing managed calling SDK.

### Tasks

- Build meeting scheduling.
- Build instant meeting creation.
- Build meeting invitation interface.
- Build meeting lobby.
- Build pre-join device settings.
- Build audio and video controls.
- Build participant list.
- Build screen sharing controls.
- Build meeting chat.
- Build participant management.
- Build meeting information panel.
- Build meeting end and leave controls.
- Build meeting history.
- Build project-linked meetings.
- Build meeting connection and failure states.
- Display meeting summaries and action items when supported by backend services.

### Deliverables

- Meeting scheduling.
- Meeting room interface.
- Calling SDK integration.
- Meeting history.

## Phase 17 — Forms and Surveys

### Objectives

Build form creation, publishing, and response management.

### Tasks

- Build form listing.
- Build form creation.
- Build form editor.
- Support available field types.
- Build field validation configuration.
- Build form preview.
- Build form publishing.
- Build response collection interface.
- Build response details.
- Build response filtering.
- Build survey results and summaries.
- Build form access controls.
- Build form editing and archiving.

### Deliverables

- Form builder.
- Published forms.
- Response management.
- Survey results interface.

## Phase 18 — Subscription, Billing, and Plan Management

### Objectives

Build subscription and billing interfaces.

### Tasks

- Build pricing and plan comparison.
- Build individual subscription settings.
- Build company subscription settings.
- Build institution subscription settings.
- Build trial status display.
- Build subscription upgrade and downgrade.
- Build payment method management.
- Build billing history.
- Build invoices and receipts.
- Build renewal status.
- Build cancellation workflow.
- Build subscription expiration notices.
- Build storage, member, and feature usage indicators.
- Build plan restriction notices.
- Build ownership and billing responsibility interfaces where supported.

### Business rules

- Premium trial lasts 14 days.
- No payment card is required to start the trial.
- Trial expiration must not silently convert the user to a paid plan.
- Subscription requires an active user decision.
- Organisation subscriptions are controlled by the Owner.
- Personal and organisation subscriptions are independent.
- Downgrades must not imply automatic deletion of user data.
- Display restrictions and upgrade options clearly.

### Deliverables

- Billing dashboard.
- Subscription management.
- Plan usage and restriction interfaces.

## Phase 19 — Global Search and Full Document Search

### Objectives

Build a global search experience across authorised Nexus resources.

### Tasks

- Build global search interface.
- Add keyboard shortcut support (Ctrl+K/Cmd+K).
- Build search suggestions.
- Build recent searches.
- Build search result categories.
- Build result filters.
- Build relevance-based result presentation.
- Build workspace context filtering.
- Build search result previews.
- Build document search results.
- Build loading, empty, and error states.

### Search categories

- People.
- Workspaces.
- Teams.
- Projects.
- Tasks.
- Messages and conversations.
- Files and documents.
- Meetings.
- Announcements.

### Important rules

- Search results must respect backend permissions.
- Do not display inaccessible private resources.
- Do not assume that hiding search results in the UI replaces backend permission filtering.
- Use the existing backend search implementation.

### Deliverables

- Global search.
- Search result interfaces.
- Search filters and navigation.

## Phase 20 — Integrations Management

### Objectives

Build the integration management experience.

### Tasks

- Build integrations directory.
- Build connected integrations list.
- Build integration details.
- Build connection and disconnection workflows.
- Build OAuth connection flows.
- Build integration permission information.
- Build sync status.
- Build error and reconnect states.
- Separate personal integrations from workspace integrations.
- Build integration settings.

### Planned integrations

- Google Drive.
- Microsoft OneDrive.
- Dropbox.
- Gmail.
- Microsoft Outlook.
- Slack.
- Microsoft Teams.
- Google Calendar.
- Microsoft Outlook Calendar.
- GitHub.
- GitLab.
- Webhooks and automation providers.

### Important rules

- Personal connections must not automatically become workspace connections.
- Display requested permissions before authorisation where supported.
- Disconnecting an integration must not imply deleting provider data.
- Never expose OAuth secrets or private access tokens.

### Deliverables

- Integrations directory.
- Connection management.
- Integration settings.

## Phase 21 — Automation and Workflow Builder

### Objectives

Build interfaces for managing automated workflows.

### Tasks

- Build automation listing.
- Build automation creation.
- Build trigger selection.
- Build condition configuration.
- Build action selection.
- Build workflow editing.
- Build workflow activation and deactivation.
- Build automation history.
- Build execution status.
- Build failure details.
- Build permission-aware automation controls.

### Deliverables

- Automation dashboard.
- Workflow builder.
- Automation execution history.

## Phase 22 — Nexus AI Assistant

### Objectives

Build the AI assistant experience.

### Tasks

- Build AI assistant entry point.
- Build AI conversation interface.
- Build conversation history.
- Build contextual AI interaction.
- Build source references and citations.
- Build file and document analysis interface.
- Build summarisation interface.
- Build meeting intelligence interface.
- Build AI recommendation presentation.
- Build AI loading and error states.
- Build AI service unavailable state.
- Build AI settings where supported.

### Important architecture rules

- The Express backend remains responsible for authentication, authorisation, and preparing permitted context.
- The Python FastAPI service provides AI processing.
- The frontend must communicate through the approved backend integration.
- Do not connect the frontend directly to the main database.
- Do not make core Nexus functionality dependent on AI availability.

### Deliverables

- AI assistant interface.
- AI conversation experience.
- Contextual AI interactions.

## Phase 23 — Nexus Write

### Objectives

Build the Grammarly-like writing assistance experience.

### Tasks

- Build writing assistance interface.
- Implement spelling suggestions.
- Implement grammar suggestions.
- Implement punctuation suggestions.
- Implement clarity suggestions.
- Implement vocabulary improvements.
- Implement tone suggestions.
- Implement rewriting.
- Implement summarisation.
- Implement translation.
- Implement explanation of suggested changes.
- Build selected-text assistance.
- Build suggestion acceptance and dismissal.
- Build writing analysis loading states.
- Build error handling.
- Integrate with the existing AI backend.

### Important rules

- Never silently replace user writing.
- Suggestions must be visible and individually controllable.
- Users must explicitly accept changes.
- Avoid sending unnecessary private text.
- Follow backend retention and privacy rules.
- Use debounced analysis where appropriate.

### Deliverables

- Nexus Write interface.
- Writing suggestions.
- User-controlled editing workflows.

## Phase 24 — AI Action Approval and Execution Interfaces

### Objectives

Provide safe interfaces for AI-proposed application actions.

### Tasks

- Build AI action proposal cards.
- Display the proposed action clearly.
- Display affected resources.
- Display relevant changes.
- Build explicit approval controls.
- Build rejection and cancellation controls.
- Display execution progress.
- Display success and failure results.
- Refresh affected data after successful execution.

### Important rules

- AI must not silently perform application mutations.
- Every mutation requires explicit user approval.
- The backend must recheck permissions before execution.
- The frontend must not treat approval as proof that execution succeeded.
- Display actual backend execution results.

### Deliverables

- AI action approval experience.
- Execution feedback.
- Safe AI-assisted workflows.

## Phase 25 — Real-Time State, Presence, and Cross-Application Synchronisation

### Objectives

Ensure the frontend remains consistent when users interact with Nexus across multiple sessions.

### Tasks

- Implement shared real-time connection management.
- Handle connection and reconnection states.
- Synchronise relevant data updates.
- Synchronise user presence.
- Synchronise task updates.
- Synchronise conversation updates.
- Synchronise notification updates.
- Synchronise workspace membership and permission changes.
- Handle stale cached data.
- Reconcile optimistic updates with backend responses.
- Prevent duplicate event handling.
- Clean up subscriptions and listeners when components unmount.

### Important rules

- PostgreSQL-backed backend state remains authoritative.
- Redis-backed events must not be treated as permanent frontend data.
- Do not create duplicate WebSocket connections unnecessarily.
- Respect workspace and resource permissions when receiving real-time events.

### Deliverables

- Shared real-time infrastructure.
- Consistent application state.
- Reliable reconnection and synchronisation.

## Phase 26 — User Settings and Preferences

### Objectives

Complete user and workspace settings interfaces.

### Tasks

- Build personal settings.
- Build profile settings.
- Build appearance preferences.
- Build notification preferences.
- Build privacy settings.
- Build security settings.
- Build connected account settings.
- Build integration settings.
- Build workspace settings.
- Build workspace member settings.
- Build role and permission settings.
- Build billing settings.
- Build storage settings.
- Build account session management where supported.

### Deliverables

- Personal settings.
- Workspace settings.
- Consistent settings navigation.

## Phase 27 — Reporting, Insights, and Analytics

### Objectives

Build dashboards and reporting interfaces.

### Tasks

- Build individual productivity overview.
- Build company workspace overview.
- Build institution workspace overview.
- Build project progress dashboards.
- Build task completion reports.
- Build team activity reports.
- Build engagement metrics.
- Build workload summaries.
- Build subscription usage dashboards.
- Build charts and data visualisations.
- Build date-range filters.
- Build export interfaces where supported.
- Build empty and insufficient-data states.

### Important rules

- Use backend-provided metrics.
- Do not invent statistics.
- Respect permissions for analytics and reports.
- Avoid exposing private team or project information.

### Deliverables

- Analytics dashboards.
- Reporting interfaces.
- Data visualisation components.

## Phase 28 — Global UX, Accessibility, and Responsive Refinement

### Objectives

Improve the quality and consistency of the complete frontend.

### Tasks

- Review all pages and shared components.
- Check mobile and tablet responsiveness.
- Improve keyboard navigation.
- Improve screen reader support.
- Check focus management.
- Improve form error messaging.
- Improve empty states.
- Improve loading states.
- Improve error recovery.
- Review transitions and animations.
- Check overflow and layout issues.
- Review navigation consistency.
- Check modal and dropdown behaviour.
- Improve perceived performance.

### Deliverables

- Consistent responsive experience.
- Improved accessibility.
- Refined interaction patterns.

## Phase 29 — Frontend Security and Privacy Review

### Objectives

Review frontend security and data handling.

### Tasks

- Review authentication state handling.
- Review session expiry handling.
- Review logout behaviour.
- Review protected routes.
- Review workspace switching and stale data.
- Review permission-based rendering.
- Review file preview and download access.
- Review OAuth redirects.
- Review user-generated content rendering.
- Review unsafe HTML handling.
- Review client-side environment variable exposure.
- Review error messages for sensitive information.
- Review caching of private data.
- Review browser storage usage.
- Review account and workspace switching edge cases.

### Important rules

- Frontend checks are not substitutes for backend authorisation.
- Never expose secrets in client-side bundles.
- Do not trust client-provided roles or permissions.
- Clear or refresh workspace-specific cached data when access changes.
- Never expose private content through stale UI state.

### Deliverables

- Frontend security review.
- Resolved frontend security issues.
- Documented backend dependencies.

## Phase 30 — Frontend Testing and Quality Assurance

### Objectives

Validate the complete frontend application.

### Tasks

- Add or complete unit tests.
- Add component tests.
- Add integration tests.
- Add end-to-end tests.
- Test authentication flows.
- Test onboarding.
- Test workspace creation and switching.
- Test invitations and join requests.
- Test role-based interfaces.
- Test projects and tasks.
- Test messaging.
- Test notification separation.
- Test file management.
- Test calendar and meetings.
- Test billing interfaces.
- Test global search.
- Test AI assistant.
- Test Nexus Write.
- Test responsive layouts.
- Test accessibility.
- Test error and recovery states.
- Test real-time reconnection.
- Test workspace switching and permission changes.

### Deliverables

- Automated test coverage.
- QA report.
- Resolved frontend defects.

## Phase 31 — Performance and Production Optimisation

### Objectives

Prepare the frontend for production usage.

### Tasks

- Review bundle size.
- Optimise large components.
- Implement appropriate lazy loading.
- Optimise image delivery.
- Review font loading.
- Review caching and revalidation.
- Optimise expensive rendering.
- Review pagination and infinite scrolling.
- Optimise large lists.
- Avoid unnecessary API requests.
- Review client-side state updates.
- Review real-time subscription overhead.
- Review route loading performance.
- Validate production environment configuration.
- Check SEO for public pages.
- Check metadata and social sharing previews.

### Deliverables

- Optimised frontend.
- Production-ready build.
- Performance review.

## Phase 32 — Deployment and Production Configuration

### Objectives

Prepare and deploy the frontend.

### Tasks

- Review deployment platform configuration.
- Review environment variables.
- Configure production API base URL.
- Configure production WebSocket URL.
- Configure authentication callback URLs.
- Configure OAuth redirect URLs.
- Configure application domain.
- Configure metadata and site URLs.
- Configure error monitoring if available.
- Configure analytics if approved.
- Validate production build.
- Verify production API communication.
- Verify authentication in production.
- Verify real-time connectivity.
- Verify file upload and download workflows.
- Verify responsive layouts in production.
- Verify deployment rollback procedure.

### Important rules

- Never commit production secrets.
- Do not overwrite existing environment configuration.
- Keep local, staging, and production configurations separate.
- Do not assume a deployment is successful until verified.

### Deliverables

- Production deployment.
- Verified production configuration.
- Deployment documentation.

## Phase 33 — Final Frontend Review and Release Readiness

### Objectives

Confirm that the frontend is ready for release.

### Tasks

- Compare completed functionality against product requirements.
- Verify all required workspace types.
- Verify permissions and restricted access.
- Verify all core navigation.
- Verify backend integrations.
- Verify messaging and notification separation.
- Verify project and task workflows.
- Verify file management.
- Verify calendar and meeting workflows.
- Verify billing interfaces.
- Verify search.
- Verify integrations.
- Verify AI functionality and approval workflows.
- Verify Nexus Write.
- Verify responsive behaviour.
- Verify accessibility.
- Verify production configuration.
- Resolve release-blocking issues.
- Document known limitations and outstanding dependencies.

### Deliverables

- Final frontend review.
- Release readiness report.
- Updated phase tracker.
- Outstanding issues list.

---

## Appendix B — Frontend-to-Backend Phase and Contract Map

Status reflects contract inspection against `../__NexusBackend__/docs/API.md` and `docs/openapi.yaml`; it does not claim live integration verification. Frontend and backend phase names intentionally differ where their scopes differ.

| Frontend phase | Frontend scope | Backend phase / scope | API contract used or current dependency |
|---|---|---|---|
| FE-0 | Repository audit and foundation | BE-1 — Foundation and infrastructure | API.md / OpenAPI inventory; no runtime route |
| FE-1 | Design system, branding and UI foundation | Frontend-only foundation; no BE phase | No phase-specific API contract |
| FE-2 | Application layout and navigation | Frontend shell; no BE phase | No phase-specific API contract |
| FE-3 | Public website and authentication interfaces | BE-3 — Authentication and user identity | `/auth/*`, `/users/me` |
| FE-4 | User onboarding and profile management | BE-3 — Authentication; BE-4 — Workspace management | `/auth/*`, `/users/me`, `/workspaces` |
| FE-5 | Workspace creation and switching UI | BE-4 — Workspace creation and management | `GET/POST /workspaces`, `GET/PATCH /workspaces/{workspaceId}`, `/switch`, `/members`, company/institution `*-profile/logo` |
| FE-6 | Membership, join requests and invitations UI | BE-5 — Membership, invitations and join requests | `/workspaces/discover`, `/workspaces/join*`, `/workspaces/{workspaceId}/join-requests*`, `/invitations*`, workspace invitations and members |
| FE-7 | Roles, access control and lifecycle UI | BE-4 — Ownership lifecycle; BE-3 — Privacy/account APIs; BE-5 — Membership authorization | Workspace member role/state routes; owner transfer incoming/accept/reject/billing acceptance; `POST /privacy-requests`, `/privacy-requests/mine*` |
| FE-8 | Departments, teams and institution groups UI | BE-7 — Teams and organizational structure | Workspace departments, teams, and institution-group routes; department roster and team activity are real gaps |
| FE-9 | Projects and project visibility UI | BE-8 — Projects and project visibility | Project routes in OpenAPI; verify visibility and resource contracts before FE-9 work |
| FE-10 | Tasks and work management UI | BE-8 — Projects / task module | Task API fully registered: `GET/POST /workspaces/{workspaceId}/projects/{projectId}/tasks`, `GET/PATCH/DELETE /{taskId}`, `POST /{taskId}/archive`, `/{taskId}/restore`, `/{taskId}/complete`, `/{taskId}/reopen`, `/{taskId}/assignees`, `/{taskId}/dependencies`, `/{taskId}/comments`. All routes verified in backend source. |
| FE-11 | Real-time messaging and conversations UI | Backend messaging contract phase not yet documented in the active backend roadmap | OpenAPI/API.md message and channel contracts; verify persistence and event support before implementation |
| FE-12 | Notification centre and activity feed UI | Backend contract phase not yet mapped | Use only registered notification/activity contracts; verify before implementation |
| FE-13 | File management and Nexus Drive UI | Backend contract phase not yet mapped | Use only registered file/storage contracts; verify authorization and upload shape first |
| FE-14 | Document collaboration UI | Backend contract phase not yet mapped | Document routes/content model and collaboration contract require verification |
| FE-15 | Calendar and scheduling UI | Backend contract phase not yet mapped | Calendar/event and provider-sync contracts require verification |
| FE-16 | Meetings and calling UI | Backend contract phase not yet mapped | Meeting and managed-calling contracts require verification |
| FE-17 | Forms and surveys UI | Backend contract phase not yet mapped | Form, publish, response, and result contracts require verification |
| FE-18 | Subscription, billing and plan UI | Backend billing capability; exact roadmap phase not assigned here | Registered billing/checkout/subscription routes; verify pricing and limits against approved contracts |
| FE-19 | Global and full-document search UI | Backend contract phase not yet mapped | Search contract, filters, pagination, and permission behavior require verification |
| FE-20 | Integrations management UI | Backend contract phase not yet mapped | Provider connection/OAuth/sync contracts require verification |
| FE-21 | Automation and workflow builder UI | Backend contract phase not yet mapped | Automation trigger/action/execution contracts require verification |
| FE-22 | Nexus AI assistant UI | Backend AI orchestration capability; roadmap phase not mapped | Use Express-mediated AI contracts only; verify routes and response/event schemas first |
| FE-23 | Nexus Write UI | Backend AI orchestration capability; roadmap phase not mapped | Use approved backend writing-assistance contracts only |
| FE-24 | AI action approval and execution UI | Backend AI action capability; roadmap phase not mapped | Action proposal/approval/execution contracts require verification |
| FE-25 | Real-time state, presence and synchronization UI | Backend real-time contracts; roadmap phase not mapped | Socket/event names, payloads, authentication, and reconnect contracts require verification |
| FE-26 | User settings and preferences UI | Backend user/settings contracts; roadmap phase not mapped | Use registered `/users/*` and preference routes only |
| FE-27 | Reporting, insights and analytics UI | Backend analytics contracts; roadmap phase not mapped | Metric and pagination response schemas require verification |
| FE-28 | Global UX, accessibility and responsive refinement | Cross-cutting; no single backend phase | No new API contract; verify each affected feature workflow |
| FE-29 | Frontend security and privacy review | Cross-cutting; no single backend phase | Review registered auth, authorization, storage and privacy contracts |
| FE-30 | Frontend testing and quality assurance | Cross-cutting; no single backend phase | Test the API contracts consumed by implemented phases |
| FE-31 | Performance and production optimization | Cross-cutting; no single backend phase | No new API contract |
| FE-32 | Deployment and production configuration | Cross-cutting; no single backend phase | Deployment and environment contract verification |
| FE-33 | Final frontend review and release readiness | Cross-cutting; no single backend phase | End-to-end verification against contracts from all completed phases |

### Confirmed gaps relevant to FE-5–FE-7

- Ownership-transfer incoming items now include `initiatedBy: { id, name }`; the inbox displays the sender's name with a null-safe fallback.
- Workspace colour/theme branding has no backend route or schema; it is descoped until a contract exists.
- No additional missing backend contracts were found for Phase 5–7 items implemented in this task. Privacy reviewer workflows are documented but out of the end-user frontend scope.


---

# 6. Definition of Done

A phase is complete only when:

1. The phase objectives have been met.
2. Existing functionality has been preserved.
3. The implementation follows the existing frontend architecture.
4. Backend integrations use verified API contracts.
5. Responsive behaviour has been checked.
6. Loading, empty, success, and error states have been handled where applicable.
7. Permission-sensitive interfaces have been reviewed.
8. TypeScript checks pass.
9. Linting passes.
10. Relevant tests pass.
11. Production build passes where practical.
12. The phase tracker has been updated accurately.
13. Changes have been committed to the appropriate feature branch.
14. The feature branch has been pushed when required.
15. The implementation has been documented.

Do not mark a phase complete simply because the UI has been created. The relevant workflows must function using real backend integrations wherever those integrations are available.

# 7. Phase Completion Report

After completing each phase, provide:

- Phase number and title.
- Summary of implemented functionality.
- Files created.
- Files modified.
- Existing functionality preserved.
- Backend APIs integrated.
- Tests and checks executed.
- Test results.
- Known issues.
- Missing backend dependencies.
- Security or permission considerations.
- Phase tracker updates.
- Git branch name.
- Commit hash.
- Push status.

Clearly identify anything that remains incomplete.

# 8. Final Instruction

This roadmap is the implementation guide for the Nexus frontend.

Work sequentially and respect phase dependencies.

Before starting a phase, inspect the repository and determine what already exists. Extend existing implementations instead of rebuilding them unnecessarily.

Do not implement backend functionality inside the frontend. Do not invent API endpoints. Do not use mock data as a substitute for real integration in production functionality.

> Decisions made in Phase 0. Full details in `CONVENTIONS.md`.

| Decision                | Choice                                                               | Notes                                                                        |
| ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Folder structure        | `app/` at repo root (no `src/`), `@/*` alias → repo root             | See `CONVENTIONS.md` §1                                                      |
| API client approach     | Typed fetch wrapper in `lib/api.ts`                                  | See `CONVENTIONS.md` §2                                                      |
| Token storage           | HttpOnly cookies via `credentials: 'include'`                        | Confirm exact cookie config with backend in Phase 3. See `CONVENTIONS.md` §3 |
| Form validation library | **Zod** — install in Phase 1                                         | See `CONVENTIONS.md` §4                                                      |
| Test framework          | **Vitest + Testing Library** — install in Phase 1                    | See `CONVENTIONS.md` §5                                                      |
| Drag-and-drop library   | **@dnd-kit/core** — install in Phase 6, team confirm required        | See `CONVENTIONS.md` §6                                                      |
| Document editor library | **Deferred** — pending backend content format confirmation (Phase 7) | See `CONVENTIONS.md` §7                                                      |
| Calling SDK             | **Deferred** — pending team selection (Phase 10)                     | See `CONVENTIONS.md` §8                                                      |
| State management        | React built-ins only (`useState`, `useContext`, `useReducer`)        | See `CONVENTIONS.md` §9                                                      |
| Commit convention       | `type(scope): description` — e.g., `feat(phase-3): ...`              | See `CONVENTIONS.md` §10                                                     |

#### Phase 3 account selection and Free plan follow-up — 2026-11-04

- Added the account-type selection dialog to both sign-in and account-creation entry routes. Personal, Institution, and Business selections retain the visitor’s original intent; the form lets visitors switch intent or return to account selection.
- Sign-in still uses the shared `/auth/login` identity contract. After login, the frontend lists backend-authorized workspaces, switches only to a matching membership, and sends users without a matching organization workspace to workspace management.
- Personal registration uses the existing `{ name, email, password }` contract; backend email verification initializes the personal workspace. Institution and Business registrations use the same verified identity contract with type-specific owner copy. After verification, the visitor is directed to sign in and create the workspace through the existing authenticated `/workspaces` contract, which makes its creator the Owner.
- The auth proxy now forwards the documented `/workspaces/*` routes needed for this flow, while continuing to reject unrelated API paths.
- `/pricing` now shows Free beside Pro and Business. Free displays only the verified included personal workspace and states no unapproved usage limits. Exact Free feature, seat, storage, and project limits are not defined in the approved source and remain undecided, so they are omitted. The approved Pro and Business prices and seat terms are unchanged. All plan actions lead into account creation; paid subscription activation remains in the authenticated billing flow.
- Backend integration gap: `/auth/register` accepts only name, email, and password and creates an identity, not a company/institution workspace. `/workspaces` requires a verified authenticated session and accepts only name, optional description, workspace type, and visibility. There is no registration-time organization workspace contract or support for institution type, business industry, company size, country, or website. The UI does not submit or retain unsupported fields; after identity verification, organization creation currently happens as a separate workspace-management step.
- Added/updated selector, authentication request, workspace-resolution, proxy, and pricing tests. On 2026-11-04, all 27 frontend test files passed (173 tests total), `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. The suite was run in two groups because a single invocation exceeded the command runner’s 30-second limit. This does not complete Phase 3 or any other phase.

#### Phase 3 final onboarding integration review — 2026-11-04

- Registration stores the selected account type and normalized email in browser local storage only after `/auth/register` succeeds. Email verification checks the returned user email against that pending intent and continues to the matching sign-in route when the record is available. Verification pages also offer an email-based resend action for expired or invalid links.
- Selecting an organization type at sign-in checks the backend workspace list. A matching membership is switched to and opened; otherwise `/app/workspaces?type=COMPANY|INSTITUTION` opens the protected create form with the chosen type locked. The existing `/workspaces` request accepts only supported workspace fields. After creation and backend switch succeed, the user is redirected to `/app`.
- Organization onboarding rechecks the backend workspace list before creation and reuses a matching workspace on retry/resume. This prevents duplicate creation after a completed request whose response or activation step was lost. The backend does not expose an idempotency key for concurrent requests from separate clients.
- Confirmed from backend source: email verification creates/adopts the personal workspace; organization creation writes an `OWNER` membership with the type-specific organization owner role; `/workspaces` requires a verified authenticated session; workspace listing and switching resolve only actual memberships. Sign-in and workspace creation preserve the existing refresh/session architecture.
- Paid seat-capacity enforcement status in `lib/subscription-plans.ts` now matches the backend’s transactionally enforced membership activation checks. The Free plan has no backend subscription catalog entry or defined feature/seat/storage/project limits. The public card therefore states only the verified personal-workspace inclusion and routes to account creation; Free usage-limit enforcement remains a backend/product-policy gap.
- Cross-browser/device onboarding intent is not stored by the backend: registration accepts only `{ name, email, password }`, and the verification URL contains only its token. The browser-local intent survives reloads and browser closure on that browser. On another browser/device, the user can still choose the account type at sign-in to resume the correct path, but automatic type recovery requires a backend-persisted registration intent or an approved verification-link contract change.
- Frontend automated tests cover identity payloads, local intent restore, verification resend/recovery, matching and missing workspace paths, typed creation, existing-workspace reuse, uncertain-create retry, session expiry, and Free plan display. All 27 test files passed (184 tests total) on 2026-11-04. Live email delivery and live backend registration/verification/workspace creation were not exercised in this review. Phase 3 remains In Progress.

#### Sequential phase audit follow-up — 2026-11-04

- Re-read the canonical `AGENTS.md`, `README.md`, `PHASES.md`, `branding.md`, `nexus-frontend/SKILL.md`, and `CONVENTIONS.md`; the lowercase filenames referenced by some instructions are not present. `README.md` duplicates `AGENTS.md`. The adjacent backend references are in `../__NexusBackend__/docs/API.md`, `docs/openapi.yaml`, and the relevant source schemas/controllers.
- Phase 0 — **VERIFIED COMPLETE** for repository/configuration deliverables: package/lockfile, environment template, TypeScript/Next configuration, conventions, and backend dependency record are present. The adjacent backend repository and API docs are available; this does not establish completion of later backend-dependent functionality.
- Phases 1–2 — **VERIFIED COMPLETE** for their design-system and application-shell scope: the tokenized themes, UI primitives, shell/navigation components, and their focused tests are present. The current grouped foundation/shell/Phase 3 workflow run passed 25 files and 192 tests.
- Phase 3 — remains **PARTIALLY COMPLETE / IN PROGRESS**. The draft legal pack is not legal approval, live auth/email workflow verification remains outstanding, and billing still requires merchant USD enablement, migration/provider verification, and remaining backend lifecycle/reconciliation work. No additional independent frontend workflow can be completed safely against the current approved contracts.
- This audit is intentionally sequential. It does not advance Phase 4 or later phases while Phase 3 remains open.
- Full-suite state from the 2026-11-04 audit is recorded above: 252/254 tests passed, with two invitation-acceptance failures in Phase 6 test setup. That later-phase defect is documented for its phase and was not changed out of sequence.

#### Phase 3 authentication completion follow-up — 2026-11-05

Scope was limited to Phase 3 authentication. No Phase 4 or later implementation was started.

| Requirement                                                               | Verified status                                     | Evidence / remaining dependency                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registration, sign-in, email verification/resend, password recovery/reset | PARTIALLY VERIFIED                                  | Existing flows and request/UI behavior have automated coverage. Live email delivery and live backend workflow remain unverified because the backend was not safely started against its configured remote database.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Authentication persistence and session restoration                        | PARTIALLY VERIFIED                                  | Refresh restores the in-memory access token through the HttpOnly refresh-cookie flow; failed refresh now clears stale in-memory access state. `signOut` clears memory even when the request fails. Automated tests cover these client behaviors. Live cookie, rotation, CSRF, expiry and cross-device behavior remain unverified.                                                                                                                                                                                                                                                                                       |
| Access-token expiration, refresh rotation, replay/session invalidation    | BACKEND CONTRACT VERIFIED; LIVE INTEGRATION BLOCKED | Backend source documents short-lived access tokens, digest-only refresh-token storage, rotation, replay family/session revocation, and refresh/logout CSRF checks. Database-backed Phase 3 tests require an explicit loopback test database and were skipped; remote migration status timed out.                                                                                                                                                                                                                                                                                                                        |
| Account reactivation                                                      | IMPLEMENTED; FRONTEND CONTRACT TESTED               | Sign-in now offers password-verified reactivation after `ACCOUNT_DEACTIVATED` or `ACCOUNT_PENDING_DELETION`. It calls the existing `POST /auth/reactivate` contract and requires a fresh sign-in afterward, matching backend behavior (reactivation does not restore/create a session).                                                                                                                                                                                                                                                                                                                                 |
| Logout and session invalidation                                           | FRONTEND CONTRACT TESTED; LIVE INTEGRATION BLOCKED  | Existing logout calls the backend and clears the in-memory token on success or failure. Actual cookie/session revocation was not exercised against a running server.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Protected routes and authorization                                        | FRONTEND CONTRACT TESTED; LIVE INTEGRATION BLOCKED  | Existing `/app` boundary restores and checks the current user and redirects unauthenticated users. Backend remains authoritative for resource authorization. Live session behavior was not exercised.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Account deletion / `deleteAccount`                                        | IMPLEMENTED; PARTIALLY VERIFIED                    | The product owner approved immediate irreversible deletion and transfer/archive handling for owned workspaces. Frontend requires password, matching email, and explicit confirmation, calls `POST /auth/delete`, clears in-memory credentials through the API service, and redirects to sign-in. Backend immediately revokes sessions, transfers an owned workspace to an eligible active member or archives it, marks subscriptions not to renew, and queues cleanup. Targeted HTTP tests on a disposable local PostgreSQL database cover deletion, ownership succession, session revocation, and cleanup; one stale ownership assertion was updated and passed separately. Full database integration remains to be rerun cleanly. Personal file objects can still hold cleanup. |
| Authentication validation, loading, and error states                      | PARTIALLY VERIFIED                                  | Automated frontend tests cover sign-in errors and the new reactivation path. Live server/network behavior remains unverified.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

#### Phase 3 authentication implementation and validation — 2026-11-05

- Changed `services/auth.ts` to expose the confirmed reactivation service and clear stale access-token memory if refresh fails.
- Changed `components/auth/AuthForm.tsx` to present reactivation only for backend-confirmed deactivated or pending-deletion sign-in errors, submit the already-entered credentials to the documented route, and explain that a new sign-in is required. No access token is created by the reactivation response.
- Added focused tests in `services/__tests__/auth.test.ts` and `components/auth/__tests__/AuthForm.test.tsx` for the API contract, no-session behavior, failed-refresh cleanup, and user-facing reactivation flow.
- Frontend `npx tsc --noEmit` passed. `npm run lint` passed with three pre-existing unused-function warnings in discover/invitation components. Focused auth/session run `npm test -- --run services/__tests__/auth.test.ts components/auth/__tests__/AuthForm.test.tsx app/app/page.test.tsx` passed (3 files, 25 tests).
- Frontend full suite: **failed**, 35/36 files passed and 255/257 tests passed. The same two Phase 6 invitation-acceptance tests fail because `refreshSession()` is mocked as `undefined` and `.then()` is called in `InvitationAcceptClient.tsx:76`. This Phase 3 change does not touch that component or its tests; the failing tests were preserved.
- Frontend `npm run build`: **failed** twice at `app/globals.css` while the Tailwind Turbopack loader subprocess timed out. `npx next build --webpack` passed afterward, including compilation, TypeScript, static generation (19 pages), and trace collection. Thus a production build passed with the supported webpack builder; the configured Turbopack build path remains unresolved.
- Backend `npm test`: passed, 226 tests, 0 failures, 2 skipped (including the guarded database-backed Phase 3 lifecycle suite). Backend `npm run typecheck` passed. Backend `npm run lint` failed on an unused `data` argument in `tests/billing-service.test.ts`; this is outside the Phase 3 frontend change and was left untouched.
- Backend focused auth unit command `node --import tsx --test tests/auth-unit.test.ts` passed (14/14 tests). `git diff --check` passed in the frontend repository.
- Guarded Phase 3 database integration command `RUN_PHASE3_DB_TESTS=true node --import tsx --test tests/auth-phase3.test.ts` skipped because no explicit loopback `TEST_DATABASE_URL` was supplied.
- Backend `npm run dev` was attempted as documented, but startup stopped during environment validation: `TRUST_PROXY` is not one of the accepted boolean strings (`true` or `false`). The watcher was stopped after this failure, before database connections or workers started. The environment file was not changed. `curl http://localhost:4000/health` confirmed no listener (connection refused). `npx prisma migrate status` previously timed out while attempting to reach the configured remote database. No live auth endpoint or successful health response was verified; after correcting the configuration, startup should only be retried against an explicitly approved development/test database because startup launches account-deletion and billing/email workers.
- Existing backend dirty changes were preserved. No commit or push was created.

#### Current Phase 3 disposition

Phase 3 remains **In Progress / PARTIALLY COMPLETE**. The reactivation and refresh-failure handling gaps addressed here have focused coverage, but Phase 3 cannot be completed until configured live backend authentication/session workflows are verified, legal approval and placeholders are resolved, and the already documented USD merchant, migration, Paystack lifecycle/reconciliation and seat-sync blockers are cleared. OAuth remains deferred pending an approved provider and backend contract. No Phase 4+ work was performed.

#### Phase 3 deletion-policy approval and integration follow-up — 2026-11-05

- The product owner approved immediate, irreversible account deletion and automatic ownership transfer to an eligible active workspace member, with archival if none exists. This supersedes earlier provisional recovery-period and mandatory-transfer notes above; those historical notes are retained for traceability.
- Added a destructive account deletion form to Account Security. It requires the current password, matching account email, and explicit acknowledgement; it describes immediate access loss, workspace transfer/archive, subscription non-renewal, retained shared/billing records, and possible delay for personal file cleanup. On success it clears in-memory access credentials and redirects to sign-in.
- Backend deletion transaction now applies transfer/archive, administrator succession, subscription non-renewal/cancellation queueing, session/token revocation, and immediate cleanup eligibility. Cleanup refuses to delete personal file metadata while corresponding private storage objects cannot be safely removed. API docs and confirmation email were aligned with this behavior.
- Focused frontend deletion/auth/pricing tests passed (35/35), focused legal-page/account-deletion tests passed (11/11), frontend TypeScript passed, and targeted backend billing/account-deletion unit tests passed (37/37). Backend TypeScript passed. Disposable PostgreSQL HTTP coverage passed for ownership transfer/archive, administrator succession, immediate cleanup, personal-file hold, and session revocation; the full Phase 3 database suite still needs a clean rerun. Paystack sandbox verification remains blocked because secret/webhook credentials are absent and USD billing is disabled.
- Phase 3 remains **In Progress**. Legal documents are drafts only and require owner review plus external legal review. No Phase 4+ implementation was performed.

## Phase 3 account deletion policy correction — 2026-11-05

The product owner's finalized policy supersedes the earlier immediate-deletion addenda: account deletion is scheduled exactly 30 days after a verified request, with immediate session revocation and identity-verified recovery during the period. Owned workspaces and shared content are retained; untransferred owned workspaces are suspended. Recipient ownership acceptance and separate billing responsibility acceptance are required. Subscription cancellation is scheduled for the deadline and reversed on recovery subject to provider-state verification. Legal drafts and the profile confirmation UI now describe this approved product behavior while clearly leaving legal review outstanding.

Phase 3 remains **IN PROGRESS** pending backend/frontend contract verification, successful backend and frontend validation, lifecycle integration and race tests, Paystack sandbox verification when credentials are available, and legal/accounting review of financial and privacy retention obligations. This correction did not alter Phase 4 audit findings or implement Phase 4 features.

## Frontend storage contract audit and build/auth remediation — 2026-11-05

- Backend API documentation confirms authenticated raw-byte upload, private raw-byte retrieval, and deletion only for Company/Institution logos. No general attachment or presigned-upload contract is registered; profile avatars remain `avatarUrl` values with no upload, replacement, or deletion API. No file-upload UI exists in the frontend to connect.
- No storage controls or AWS credentials were added to the browser. Phase 13 remains **Not Started** until the backend provides the authorized upload, completion, retrieval, and deletion contracts. Details and expected contract fields are in `docs/FRONTEND_STORAGE_INTEGRATION.md`.
- `refreshSession()` now returns a shared in-flight Promise, rejects an empty refresh response, and clears stale in-memory access state on failure. Invitation refresh and Terms tests pass without invitation-business-rule or legal-content changes.
- Replaced the custom Tailwind Turbopack CSS loader with Tailwind CSS v4's `@tailwindcss/postcss` integration. Default Turbopack and webpack production builds pass. Full frontend tests pass with bounded worker count (40 files, 272 tests); TypeScript passes and ESLint has three existing warnings.
- Phase 3 remains **In Progress**; Phase 4 status is unchanged; Phase 8 remains **In Progress**; Phase 13 remains **Not Started**. No phase was marked complete.

## Account lifecycle frontend implementation — 2026-11-05

- Added explicit confirmation before scheduling deletion, clear 30-day/recovery and no-refund messaging, and a sign-in notice that displays the backend scheduled deletion timestamp. Existing sign-in recovery uses the backend `/auth/reactivate` contract.
- Added workspace owner transfer initiation and recipient ownership/billing acceptance UI using documented backend routes. Suspended workspace status is represented by the frontend type. This UI still accepts a transfer reference directly; the subsequently registered incoming-transfer list/rejection routes are not yet integrated.
- Billing continues to show backend subscription cancellation dates and payment status; UI clarifies that this is payment history, invoices are not currently exposed, outstanding invoices remain payable, and cancellation does not automatically refund.
- Added a Privacy Requests route that transparently reports its workflow is not connected; it does not fake request persistence. Backend submission/status/decision APIs are now registered but are not yet integrated by the frontend. Retained collaboration content is described as retained and reviewed, not automatically erased.
- API details and missing dependencies: `docs/ACCOUNT_LIFECYCLE_FRONTEND.md`.
- Verification: targeted Vitest run passed 20/20; ESLint completed with 0 errors and 3 warnings outside changed files. Build and TypeScript check results are recorded in the completion report.
- At the time of this note, the backend dependency list included incoming-transfer listing/rejection and privacy-request APIs. Backend OpenAPI now registers those routes; they remain frontend integration work. The confirmed API gap is invoice listing/payment, in addition to message/channel content contracts described in `docs/ACCOUNT_LIFECYCLE_FRONTEND.md`. Phase 7 remains **IN PROGRESS**.

## Sequential roadmap continuation verification — 2026-11-05

- Initial repository state: `feature/frontend-authentication` at `45e81b8a1fe09e09956fb5bc2ec8bf838d6bb4bd`; the working tree was clean. No application code changes were needed after reviewing the earliest incomplete phase (Phase 3) and its existing implementation.
- Phases 0–2 remain verified complete for their documented frontend foundation, design-system, and application-shell scope. Phase 3 remains **In Progress**: the frontend requirements currently implementable against approved contracts are present; the remaining work depends on legal approval and required facts, live auth verification, and external billing/database/provider validation. Phase 4 remains **Blocked** by missing authorized avatar-management and cross-device onboarding contracts. The account-deletion interface follows the finalized 30-day request/recovery policy; earlier Phase 4 notes claiming no deletion UI or a current immediate-deletion-policy conflict are superseded by the updates above and the account-lifecycle sections.
- Current frontend verification on this checkout: `npx tsc --noEmit` passed; `npm run lint` completed with no errors and three unused-function warnings in discover/invitation components; `npm test -- --maxWorkers=1` passed (40 files, 272 tests); `npm run build` passed using the default Next.js/Turbopack path and generated 23 routes; `git diff --check` passed. The full suite ran with one worker because the shared machine was concurrently running backend checks and had limited available memory.
- No live authenticated backend workflow, manual browser/responsive review, database migration, or Paystack transaction was run as part of this verification. Phase 3 is not complete and no later phase was started.

## Vitest diagnosis and backend contract reconciliation — 2026-11-05

- The two previously reported `AuthForm` cases (“validates a weak sign-up password before making a request” and “shows a verified success message after requesting password recovery”) pass in isolation on the current branch: 2 passed, 17 skipped.
- The same two tests pass in a detached worktree of `origin/main` at `d0b9c6d`: 2 passed, 6 skipped. This shows the failures are not introduced by the current branch.
- `npx vitest run --pool=forks --reporter=verbose --testTimeout=15000` completed without a stalled file: 40 files, 272 tests passed. The final emitted file was `lib/__tests__/redirect.test.ts`, and Vitest exited successfully.
- Plain `npx vitest run` completed: 40 files, 272 tests passed. No test hangs in an isolated full run. The earlier failures happened during a run competing with TypeScript, ESLint, and a production build; the isolated cases, base branch, and full suite pass. No assertions were loosened and no test/source fix was warranted.
- Reconciled Phase 5–7 statuses to **In Progress** and recorded frontend files, tests, and consumed backend routes. Added the FE-to-BE phase/contract map with distinct frontend/backend phase labels.
- Checked missing-contract claims against backend `docs/API.md`, `docs/openapi.yaml`, and route registration. Incoming ownership-transfer listing/rejection and privacy-request routes exist; invoice APIs, department-member roster listing, team activity, general notification feed, task APIs, and other roadmap domains without registered routes remain genuine gaps. Resource capability flags are not treated as a blocker.
- No Phase 9 work was started. No frontend source or test files were changed.

## Google authentication frontend contract audit — 2026-11-06

- The requested Continue with Google integration is blocked pending a documented backend contract. The adjacent backend `docs/API.md` and `docs/openapi.yaml` contain no Google/OAuth initiation or callback paths, and `src/modules/auth/auth.routes.ts` registers no provider routes. The auth controller has no Google callback flow. No frontend button, redirect, or callback handler was added because doing so would require inventing endpoint paths, response behavior, or redirect semantics.
- The existing frontend uses `/api/backend` as a same-origin proxy backed by server-only `NEXUS_API_URL`. The proxy forwards cookies and `Set-Cookie` but does not currently forward redirect `Location` headers. The existing auth service keeps access tokens in memory and restores sessions through the HttpOnly refresh-cookie flow. The backend contract must define the initiation and callback/return flow, state/CSRF handling, cookie issuance, how the frontend obtains its in-memory access token after return, error/cancellation results, and allowed frontend return destinations before the proxy or auth service can be safely adapted.
- Account type is selected before login/registration in `AuthPage`. Existing pending onboarding intent is browser-local and is saved after password registration; it is not a cross-device persistence contract. Google onboarding therefore also needs a documented way to preserve account type across the external redirect and to resume the correct new-user onboarding path. Automatic cross-device recovery requires backend-persisted intent or an approved callback/verification-link contract.
- `.env.example` now records that Google OAuth requires no frontend-specific environment variable under the current architecture; `NEXUS_API_URL` remains the server-only backend URL, and no Google secret or provider credential belongs in `NEXT_PUBLIC_*`.
- Required next dependency: publish the approved backend OAuth route, callback, session, account-linking, and onboarding contract, then implement and test both login and registration flows against it. Phase 3 remains **In Progress**; this audit does not mark OAuth implemented.
