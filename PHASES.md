# Nexus Frontend — Implementation Roadmap

> **Repository:** `__NextFrontend__` (Next.js App Router, TypeScript, Tailwind CSS 4, React 19)
> **Last Audited:** 2026-10-21
> **Instruction Files:** `AGENTS.md` (root), `nexus-frontend/SKILL.md`
> **Backend:** Separate repository. All integration is through documented REST and Socket.IO contracts.

---

## Audit Baseline (recorded 2026-10-21)

| Check | Result |
|---|---|
| Framework | Next.js 16.4.2, App Router |
| React | 19.3.0 |
| Tailwind CSS | 4.x (`@tailwindcss/turbopack`) |
| TypeScript | 5.x |
| Socket.IO client | **Not installed** |
| Form validation library | **Not installed** |
| Test framework | **Not installed** (no `test` script in `package.json`) |
| State management library | **Not installed** |
| Available scripts | `dev`, `build`, `start`, `lint` |
| App directory contents | `layout.tsx`, `page.tsx`, `globals.css`, `favicon.ico` only |
| Feature folders | None exist (`components/`, `features/`, `hooks/`, `services/`, `types/`, `lib/`, `providers/` are all absent) |
| Design tokens | `globals.css` uses Next.js defaults, not Nexus palette |
| Path alias | `@/*` → repo root (defined in `tsconfig.json`) |
| Environment file | No `.env` present |
| Nexus features implemented | **Zero** |

All phases began at `NOT_STARTED`. Phase 0 is now `COMPLETE`: all foundation tasks have been finished and committed. One item remains open (backend repository location — must be resolved before Phase 3). Phase 1 is next.

---

## Phase Dependency Overview

```
Phase 0  →  Phase 1  →  Phase 2  →  Phase 3
                                        ↓
                                     Phase 4
                                        ↓
                                     Phase 5
                                        ↓
                                     Phase 6
                              ↓         ↓
                           Phase 7   Phase 8
                         (terminal)     ↓
                                     Phase 9  (shared Socket.IO foundation)
                                        ↓
                                    Phase 10
                                        ↓
                                    Phase 11
                                        ↓
                                    Phase 12
                                        ↓
                                    Phase 13
                                        ↓
                                    Phase 14
                                        ↓
                                    Phase 15
```

Phases 7 and 8 can proceed in parallel once their own prerequisites are met (Phase 7 requires Phase 5; Phase 8 requires Phases 4 and 6). Phase 9 requires Phases 3, 6, and 8 — it does not depend on Phase 7. Phases 10 and 11 additionally require Phase 9; Phase 11 also depends on Phase 10 when AI-generated insights are surfaced on the dashboard.

---

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
- [ ] Confirm backend repository location and documentation access.

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

| Deliverable | Status | Commit |
|---|---|---|
| `.env.example` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` | ✅ Done | `5438cf2` |
| `.gitignore` updated to allow `!.env.example` | ✅ Done | `5438cf2` |
| Baseline `npm run lint` — zero errors | ✅ Done | recorded |
| Baseline `npm run build` — zero errors (1 pre-existing pnpm warning) | ✅ Done | recorded |
| `CONVENTIONS.md` — folder structure, API client, token storage, libraries | ✅ Done | `1072238` |
| Backend API contracts checklist — Appendix B populated | ✅ Done | this commit |
| Appendix C conventions reference updated | ✅ Done | this commit |

**Remaining open item:**
- Backend repository location and documentation are still unknown. This must be resolved before Phase 3 begins.

### Notes and Blockers
- The root instruction file is `AGENTS.md`, not `agent.md`. All future agents must read `AGENTS.md`.
- `SKILL.md` is located at `nexus-frontend/SKILL.md`, not the repo root.
- `SKILL.md` §3 refers to a `src/app` structure. This repository uses `app/` at the repo root; follow the actual structure (documented in `CONVENTIONS.md` §1).
- Test framework decided: Vitest + Testing Library. Install in Phase 1. See `CONVENTIONS.md` §5.
- Form validation library decided: Zod. Install in Phase 1. See `CONVENTIONS.md` §4.
- Drag-and-drop library decided: `@dnd-kit/core`. Install in Phase 6. See `CONVENTIONS.md` §6.
- **OPEN:** Backend repository location and documentation are unknown at audit time. This must be resolved before Phase 3.

---

## Phase 1 — Application Architecture and Design System

### Objective
Replace the default Next.js bootstrap styles and establish the Nexus design system. Install and configure all shared tooling (form validation, test framework) decided in Phase 0. Build a library of reusable, accessible UI components that every later phase will depend on. No feature routes are created in this phase.

### Prerequisites
- Phase 0 complete: folder structure convention confirmed, tooling decisions made.
- Nexus design tokens confirmed (`AGENTS.md` §5).

### Implementation Tasks

**Environment and tooling**
- [x] Install and configure the agreed form validation library (e.g., Zod or similar; confirm with team first).
- [x] Install and configure the agreed test framework (e.g., Vitest + `@testing-library/react`).
- [x] Add a `test` script to `package.json`.
- [x] Verify `eslint` runs cleanly after tooling changes.

**Design tokens**
- [x] Replace `globals.css` default tokens with the Nexus palette using Tailwind CSS 4 `@theme` syntax:
  - Background: `#F8FAFC`
  - Surface: `#FFFFFF`
  - Secondary surface: `#F1F5F9`
  - Primary text: `#0F172A`
  - Secondary text: `#64748B`
  - Borders: `#E2E8F0`
  - Primary action: `#2563EB`
  - Success: `#059669`
  - Error: `#DC2626`
- [x] Define consistent spacing scale, type scale, border radii, and box-shadow tokens.
- [x] Add a Geist Sans font configuration that maps to the Nexus body typeface.
- [x] Verify reduced-motion media query handling is respected in all animation utilities.

**Base layout and structure**
- [x] Create `app/layout.tsx` as the Nexus root layout (replacing the default title/description metadata).
- [x] Confirm `@/*` path alias resolves correctly.
- [x] Create `components/` folder with an `index.ts` barrel where appropriate.

**Core UI components** (all must be accessible, keyboard-navigable, and responsive)
- [x] `Button` — variants: primary, secondary, ghost, destructive; sizes: sm, md, lg; loading and disabled states.
- [x] `Input` — text, email, password, search; label association; error state; helper text.
- [x] `Textarea` — label association; resize behavior; error state.
- [x] `Select` / `Dropdown` — accessible single-select; keyboard navigation.
- [x] `Checkbox` and `Radio` — accessible, styled.
- [x] `Badge` — status colors mapped to task states and notification types.
- [x] `Avatar` — image with fallback initials; size variants.
- [x] `Card` — surface container with optional header, body, footer.
- [x] `Modal` / `Dialog` — focus trap, `Escape` to close, backdrop, accessible title.
- [x] `Tooltip` — accessible, keyboard-triggerable.
- [x] `Spinner` / `Skeleton` — loading states for lists, cards, and page regions.
- [x] `EmptyState` — icon, title, description, and optional action slot.
- [x] `ErrorMessage` / `Alert` — inline field errors and page-level alerts (info, success, warning, error).
- [x] `ConfirmDialog` — reusable destructive-action confirmation (not `window.alert()`).
- [x] `Tabs` — accessible tab panel.
- [x] `Breadcrumb` — accessible navigation landmark.

**Type definitions**
- [x] Create `types/ui.ts` with shared prop types (variants, sizes, color roles).
- [x] Create `types/api.ts` with generic API response envelope types (`ApiResponse<T>`, `PaginatedResponse<T>`, `ApiError`).

**Tests**
- [x] Unit tests for `Button`, `Input`, `Modal`, `ConfirmDialog`, and `EmptyState`.
- [x] Confirm test runner executes with `npm test`.

### Frontend Deliverables
- Updated `globals.css` with Nexus design tokens.
- `components/` folder with all listed components.
- `types/ui.ts` and `types/api.ts`.
- Working test runner with initial component tests.

### Backend Dependencies
None. This phase is entirely frontend infrastructure.

### Validation and Tests
- Visual check: all components render with Nexus colors and typography.
- All components are keyboard-accessible (Tab, Enter, Escape where appropriate).
- `ConfirmDialog` does not use `window.alert()`.
- `npm run lint` passes cleanly.
- `npm run build` passes cleanly.
- `npm test` runs and initial component tests pass.
- No hardcoded production URLs or secrets.

### Acceptance Criteria
- Nexus design tokens active in `globals.css`.
- All listed components implemented, tested, and accessible.
- `npm run lint`, `npm run build`, and `npm test` pass.
- No default Next.js boilerplate styles remain in active use.

### Completion Status
`COMPLETE`

### Completion Record (Phase 1)

| Deliverable | Status | Commit |
|---|---|---|
| Zod, Vitest, Testing Library installed; `test`/`test:watch` scripts added | ✅ Done | `68f6ee8` |
| `globals.css` replaced with Nexus design tokens (`@theme` syntax) | ✅ Done | `8c7d869` |
| `app/layout.tsx` updated with Nexus metadata | ✅ Done | `8c7d869` |
| `tsconfig.json` excludes vitest configs from Next.js TS build | ✅ Done | `8c7d869` |
| `types/ui.ts` and `types/api.ts` created | ✅ Done | `dd4bb28` |
| Button, Input, Textarea, Checkbox, RadioGroup, Select | ✅ Done | `465e21b` |
| Badge, Avatar, Card, Spinner, Skeleton, EmptyState | ✅ Done | `c4b2910` |
| Modal, ConfirmDialog, Tooltip, Alert, ErrorMessage | ✅ Done | `35e154b` |
| Tabs, Breadcrumb | ✅ Done | `d499e5d` |
| 46 tests passing — Button (11), Input (8), Modal (9), ConfirmDialog (10), EmptyState (8) | ✅ Done | `2099886` |
| `types/jest-dom.d.ts` for build compatibility | ✅ Done | `2099886` |

**Verification:** `npm run lint` ✅ · `npm run build` ✅ · `npm test` 46/46 ✅

### Notes and Blockers
- Form validation: Zod installed. Test framework: Vitest + Testing Library configured.
- Light/dark mode: not implemented in this phase. Token layer uses light palette only. Retrofitting for dark mode is a future decision.
- `window.alert()` and `window.confirm()` are not used anywhere — `ConfirmDialog` handles all destructive confirmations.
- `components/` barrel index not created — components are imported directly. Add when the number of exports justifies it.

---

## Phase 2 — Routing, Public Pages, and Application Shell

### Objective
Establish the full Next.js App Router route tree for both public and authenticated sections. Build the application shell: the sidebar, top navigation bar, workspace switcher, and responsive navigation. Create public-facing pages (landing, login, register placeholders). No authentication logic is wired in this phase — that comes in Phase 3.

### Prerequisites
- Phase 1 complete: design system and UI components available.
- Folder structure convention from Phase 0 confirmed.

### Implementation Tasks

**Route structure**
- [ ] Define the full App Router route hierarchy:
  ```
  app/
    (public)/
      page.tsx                  ← Landing page
      login/page.tsx            ← Login (shell only)
      register/page.tsx         ← Register (shell only)
      forgot-password/page.tsx  ← Forgot password (shell only)
    (auth)/
      layout.tsx                ← Authenticated root layout
      dashboard/page.tsx        ← Post-login landing
      workspace/
        [workspaceId]/
          layout.tsx
          page.tsx              ← Workspace overview
          projects/
            page.tsx
            [projectId]/
              page.tsx
              tasks/page.tsx
              board/page.tsx
              documents/page.tsx
              settings/page.tsx
          messages/
            page.tsx
            [conversationId]/page.tsx
          members/page.tsx
          settings/page.tsx
      profile/page.tsx
      notifications/page.tsx
      search/page.tsx
  app/
    not-found.tsx
    error.tsx
    loading.tsx
  ```
- [ ] Create placeholder `page.tsx` files for every route listed (render a heading identifying the page; no data fetching yet).
- [ ] Create `app/(public)/layout.tsx` — minimal layout for unauthenticated pages.
- [ ] Create `app/(auth)/layout.tsx` — authenticated shell layout with sidebar and top nav slots.

**Application shell components**
- [ ] `TopNav` — workspace name, user avatar, notifications bell, user menu.
- [ ] `Sidebar` — navigation links for Dashboard, Projects, Messages, Members, Notifications; collapse behavior on mobile.
- [ ] `WorkspaceSwitcher` — placeholder list of workspaces; switcher UI without real data.
- [ ] `MobileNav` — bottom navigation bar or slide-out drawer for screens < md breakpoint.
- [ ] `PageHeader` — reusable page title + breadcrumb + action slot.

**Public pages (shell only)**
- [ ] Landing page: Nexus product heading, primary CTA linking to `/login` and `/register`; no external links or marketing copy beyond what is required.
- [ ] Login page shell: form layout with Email and Password fields, submit button, link to register. No submission handler yet.
- [ ] Register page shell: form layout with Name, Email, Password fields, submit button, link to login. No submission handler yet.
- [ ] Forgot Password page shell: Email field and submit button shell.

**Global states**
- [ ] `app/not-found.tsx` — friendly 404 page with a link back to dashboard or home.
- [ ] `app/error.tsx` — global error boundary with a retry button.
- [ ] `app/loading.tsx` — global loading skeleton (used by Next.js Suspense).

**Navigation and routing utilities**
- [ ] `lib/routes.ts` — typed route constants for all application paths; no hardcoded strings scattered across components.

**Types**
- [ ] `types/navigation.ts` — types for nav item configurations, breadcrumb entries.

### Frontend Deliverables
- Complete App Router route tree with placeholder pages.
- `TopNav`, `Sidebar`, `WorkspaceSwitcher`, `MobileNav`, `PageHeader` components.
- `lib/routes.ts` typed route constants.
- `not-found.tsx`, `error.tsx`, `loading.tsx`.
- Public page shells: landing, login, register, forgot-password.

### Backend Dependencies
None required in this phase. All pages are shells with no data fetching.

### Validation and Tests
- Each route renders its placeholder heading without errors.
- Sidebar collapses correctly on mobile (< md).
- Keyboard navigation works through sidebar and top nav links.
- `not-found.tsx` renders for unknown routes.
- `error.tsx` renders when an error boundary is triggered.
- `npm run lint` and `npm run build` pass.

### Acceptance Criteria
- All routes in the hierarchy above are accessible without a 404 (in development).
- Authenticated layout renders the sidebar and top nav correctly.
- Public layout renders without the authenticated shell.
- Responsive behavior is correct at mobile (< 768px), tablet (768–1024px), and desktop (> 1024px).
- Route constants in `lib/routes.ts` cover all defined paths.
- Lint and build pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- The exact route structure may need to change once workspace and project data shapes are confirmed in Phase 4/5.
- The `WorkspaceSwitcher` is a UI shell in this phase. Real data and workspace selection logic are added in Phase 4.
- No authentication guards are applied here. Phase 3 adds them.

---

## Phase 3 — Authentication and User Profile

### Objective
Wire up real authentication: login, registration, logout, session restoration, protected route guards, expired-session handling, and user profile editing. This phase requires a working backend authentication contract.

### Prerequisites
- Phase 2 complete: login, register, forgot-password page shells exist.
- Backend authentication contract confirmed: endpoints, token/cookie strategy, error response shape, refresh mechanism.
- `.env.example` defines `NEXT_PUBLIC_API_URL`.

### Implementation Tasks

**API client**
- [ ] Create `lib/api.ts` — a typed fetch wrapper that:
  - Prepends `NEXT_PUBLIC_API_URL`.
  - Attaches authentication credentials (cookie or Authorization header per backend contract).
  - Normalizes error responses to a consistent `ApiError` shape.
  - Handles 401 responses (triggers session expiry flow).
  - Does not log tokens or passwords.
- [ ] Create `services/auth.ts` with functions for: `login`, `register`, `logout`, `forgotPassword`, `resetPassword`, `verifyEmail`, `getMe`.

**Authentication state**
- [ ] Create `providers/AuthProvider.tsx` — React context provider that holds the current user object, loading state, and authentication status.
- [ ] Create `hooks/useAuth.ts` — consumes `AuthProvider`; exposes `user`, `isAuthenticated`, `isLoading`, `login`, `logout`.
- [ ] Add `AuthProvider` to `app/(auth)/layout.tsx`.
- [ ] Implement session restoration on app load (`getMe` call in `AuthProvider` initialization).

**Route protection**
- [ ] Create `components/ProtectedRoute.tsx` (or use a layout-level guard) — redirects unauthenticated users to `/login` without exposing protected page content.
- [ ] Apply route protection to `app/(auth)/layout.tsx`.
- [ ] Handle redirect-after-login: preserve the intended destination and navigate there after successful authentication.
- [ ] Prevent redirect loops (authenticated users hitting `/login` are redirected to `/dashboard`).

**Login page**
- [ ] Wire up the login form with validation (email format, required fields).
- [ ] Call `services/auth.ts → login`.
- [ ] Handle success: store session (per backend contract), redirect to dashboard or preserved destination.
- [ ] Handle errors: display field-level or general error from backend response.
- [ ] Disable submit while in-flight; prevent duplicate submissions.

**Registration page**
- [ ] Wire up the registration form with validation (name required, email format, password requirements per backend rules).
- [ ] Call `services/auth.ts → register`.
- [ ] Handle success (redirect or email verification prompt per backend behavior).
- [ ] Handle errors from the backend (duplicate email, validation failures).

**Forgot password / reset password**
- [ ] Implement forgot-password form (email field) calling the backend password-reset endpoint.
- [ ] Create `app/(public)/reset-password/page.tsx` — accepts token from URL, validates, submits new password.
- [ ] Display confirmation and error states clearly.

**Email verification**
- [ ] If the backend requires email verification, create a verification pending page and a confirmation-link handler route (`app/(public)/verify-email/page.tsx`).
- [ ] Mark as `BLOCKED` if the backend does not yet implement email verification.

**User profile**
- [ ] `app/(auth)/profile/page.tsx` — display current user's name, email, avatar.
- [ ] Allow editing name and avatar.
- [ ] Allow password change (current password + new password, submitted to backend).
- [ ] Display backend validation errors inline.

**Types**
- [ ] `types/auth.ts` — `User`, `LoginRequest`, `RegisterRequest`, `AuthResponse`, `SessionState`.

**Tests**
- [ ] Unit tests for `useAuth` hook (mock `services/auth.ts`).
- [ ] Component tests for login form: validation errors, submit loading state, API error display.
- [ ] Route protection test: unauthenticated access to a protected route redirects to `/login`.

### Frontend Deliverables
- `lib/api.ts` typed fetch wrapper.
- `services/auth.ts`.
- `providers/AuthProvider.tsx`.
- `hooks/useAuth.ts`.
- `types/auth.ts`.
- Functional login, register, forgot-password, and reset-password pages.
- Route protection applied to all authenticated routes.
- User profile page with editing.

### Backend Dependencies
| Contract | Status |
|---|---|
| `POST /auth/login` — request/response shape, cookie vs. token strategy | Requires confirmation |
| `POST /auth/register` — validation rules, email verification flow | Requires confirmation |
| `POST /auth/logout` — cookie clearing or token revocation | Requires confirmation |
| `POST /auth/forgot-password` | Requires confirmation |
| `POST /auth/reset-password` — token parameter, expiry behavior | Requires confirmation |
| `GET /auth/verify-email` — query parameter name and flow | Requires confirmation |
| `GET /users/me` — response shape including roles/workspace memberships | Requires confirmation |
| `PATCH /users/me` — updatable fields, validation rules | Requires confirmation |
| 401 response format and refresh token behavior | Requires confirmation |

### Validation and Tests
- Login with valid credentials redirects to dashboard.
- Login with invalid credentials displays an error without exposing token values.
- Unauthenticated navigation to `/dashboard` redirects to `/login`.
- Authenticated navigation to `/login` redirects to `/dashboard`.
- Logout clears session and redirects to `/login`.
- Session is restored on page reload.
- Forms disable submit button while in-flight.
- Password and token values do not appear in console logs or DOM attributes.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Users can register, log in, and log out against the live or staged backend.
- Protected routes are inaccessible to unauthenticated users.
- Session persists across page reload.
- Expired sessions redirect to login with context preserved.
- Profile can be viewed and edited.
- No authentication tokens logged or exposed in client-accessible storage contrary to the agreed security model.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **BLOCKED** until backend authentication contract is confirmed. Do not fabricate the contract.
- The token storage approach (HttpOnly cookie vs. localStorage) must be confirmed with the backend team. `AGENTS.md` prefers HttpOnly cookies.
- Email verification implementation depends on backend support. If not yet available, create the UI shell and mark the integration as pending.
- Workspace invitation acceptance (email link to a registration flow) should be handled here or in Phase 4; confirm with backend.

---

## Phase 4 — Workspaces, Teams, Members, and Roles

### Objective
Build the workspace management experience: creating and switching between workspaces, managing teams and members, handling invitations, and surfacing the correct role-sensitive UI for Owners, PMs, Members, Viewers, and Collaborators.

### Prerequisites
- Phase 3 complete: authenticated session available, `useAuth` hook and API client in place.
- Backend workspace, team, member, and invitation APIs confirmed.

### Implementation Tasks

**Workspace**
- [ ] `services/workspaces.ts` — API functions: `getWorkspaces`, `getWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`.
- [ ] `hooks/useWorkspace.ts` — current workspace context, switcher logic.
- [ ] `providers/WorkspaceProvider.tsx` — stores current workspace ID, exposes workspace context to all authenticated children.
- [ ] Wire `WorkspaceSwitcher` component (Phase 2 shell) to real workspace data.
- [ ] Workspace creation form with validation.
- [ ] `app/(auth)/workspace/[workspaceId]/page.tsx` — workspace overview: name, description, member count, recent activity placeholder.
- [ ] `app/(auth)/workspace/[workspaceId]/settings/page.tsx` — workspace settings: name, description editing; delete workspace (Owner only, with `ConfirmDialog`).
- [ ] Empty state for users with no workspaces (prompt to create one).

**Teams**
- [ ] `services/teams.ts` — `getTeams`, `getTeam`, `createTeam`, `updateTeam`, `deleteTeam`.
- [ ] Team listing within a workspace.
- [ ] Team creation and editing (with validation).
- [ ] Delete team with `ConfirmDialog` (Owner/PM only).

**Members and invitations**
- [ ] `services/members.ts` — `getMembers`, `inviteMember`, `updateMemberRole`, `removeMember`.
- [ ] `app/(auth)/workspace/[workspaceId]/members/page.tsx` — member list with role badges, invite form, role change, and remove member controls.
- [ ] Role change control (Owner only or per backend permission matrix).
- [ ] Remove member with `ConfirmDialog`.
- [ ] Invitation flow: send invite by email; display pending/accepted status.
- [ ] Accept-invitation page (`app/(public)/invite/[token]/page.tsx`) for new users receiving email invites.

**Role-sensitive UI**
- [ ] `hooks/usePermissions.ts` — returns boolean permission flags based on the current user's role in the current workspace (derived from backend response; do not invent permissions).
- [ ] Apply permission gates to destructive and administrative actions throughout the workspace UI.
- [ ] Handle `403 Forbidden` responses gracefully (display an access-denied message, do not expose restricted data).

**Types**
- [ ] `types/workspace.ts` — `Workspace`, `WorkspaceMember`, `Team`, `Invitation`, `Role`.

**Tests**
- [ ] Unit tests for `usePermissions` with each role value.
- [ ] Component tests for member list: role badge rendering, invite form validation, remove confirmation.

### Frontend Deliverables
- `services/workspaces.ts`, `services/teams.ts`, `services/members.ts`.
- `providers/WorkspaceProvider.tsx`, `hooks/useWorkspace.ts`, `hooks/usePermissions.ts`.
- `types/workspace.ts`.
- Workspace overview, settings, and member management pages.
- Team creation and management components.
- Invitation flow and accept-invitation page.
- Functional `WorkspaceSwitcher`.

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /workspaces` — list user's workspaces | Requires confirmation |
| `POST /workspaces` — create workspace, validation rules | Requires confirmation |
| `GET /workspaces/:id` | Requires confirmation |
| `PATCH /workspaces/:id` | Requires confirmation |
| `DELETE /workspaces/:id` | Requires confirmation |
| `GET /workspaces/:id/members` — includes role field | Requires confirmation |
| `POST /workspaces/:id/invite` — email, role | Requires confirmation |
| `PATCH /workspaces/:id/members/:userId` — role update | Requires confirmation |
| `DELETE /workspaces/:id/members/:userId` | Requires confirmation |
| `GET /teams` or `GET /workspaces/:id/teams` | Requires confirmation |
| `POST /teams`, `PATCH /teams/:id`, `DELETE /teams/:id` | Requires confirmation |
| `POST /invitations/:token/accept` — for email-link acceptance | Requires confirmation |
| Role enum values: `OWNER`, `PM`, `MEMBER`, `VIEWER`, `COLLABORATOR` — confirm exact strings | Requires confirmation |

### Validation and Tests
- Workspace switcher loads all workspaces for the authenticated user.
- Creating a workspace with a duplicate name shows a backend validation error.
- Non-Owner users cannot see role-change or delete controls.
- Removing a member requires `ConfirmDialog` confirmation.
- `403` responses display an access-denied state, not raw error JSON.
- Invitation email flow: pending state shown until accepted.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Authenticated users can create, view, and switch between workspaces.
- Members page lists all workspace members with correct role badges.
- Invitations can be sent and accepted.
- Owner-only actions are hidden from lower-privileged roles.
- Backend permission enforcement reflected correctly in UI (no role-check fabrication).
- Empty states render for zero members, zero teams, zero workspaces.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- Exact role enum strings must be confirmed from the backend before `usePermissions` can be implemented correctly.
- The workspace onboarding flow (first login, create workspace prompt) overlaps with Phase 3. Coordinate boundary.
- Workspace deletion is irreversible; require explicit typed confirmation if the backend supports it.

---

## Phase 5 — Projects and Project Management

### Objective
Build the full project management experience: listing, creating, editing, archiving, and navigating projects within a workspace. Display project overviews, membership, privacy settings, and role-gated controls.

### Prerequisites
- Phase 4 complete: workspace context provider in place, roles and permissions available.
- Backend project APIs confirmed.

### Implementation Tasks

**Project listing**
- [ ] `services/projects.ts` — `getProjects`, `getProject`, `createProject`, `updateProject`, `archiveProject`, `deleteProject`, `getProjectMembers`, `addProjectMember`, `removeProjectMember`.
- [ ] `app/(auth)/workspace/[workspaceId]/projects/page.tsx` — paginated project list with search, filter (status: active/archived), and sort (name, date, progress).
- [ ] Project card component: name, description, member count, progress bar, status badge, last-updated date.
- [ ] Empty state for no projects.

**Project creation**
- [ ] Create project modal or page: name, description, privacy (public/private per backend), initial members.
- [ ] Validation and error handling.
- [ ] Redirect to new project page on success.

**Project detail**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/page.tsx` — project overview: name, description, progress, members, recent activity.
- [ ] Project sub-navigation: Overview, Tasks, Board, Documents, Settings (tabs or sidebar links).
- [ ] Project header with edit, archive, and delete controls (role-gated).

**Project settings**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/settings/page.tsx` — edit name, description, privacy, and manage project members.
- [ ] Archive project with `ConfirmDialog` (reversible).
- [ ] Delete project with `ConfirmDialog` (irreversible; Owner/PM only).

**Project membership**
- [ ] Add member to project from workspace member list.
- [ ] Remove project member with `ConfirmDialog`.
- [ ] Role display within project context.

**Types**
- [ ] `types/project.ts` — `Project`, `ProjectMember`, `ProjectStatus`, `ProjectPrivacy`.

**Tests**
- [ ] Component tests for project list: filtering, sorting, empty state.
- [ ] Component tests for project creation form: validation, error display.

### Frontend Deliverables
- `services/projects.ts`.
- `types/project.ts`.
- Projects list page with search/filter/sort/pagination.
- Project creation modal.
- Project overview, settings pages.
- Project member management.
- Project progress display.

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /workspaces/:id/projects` — pagination, filter, sort params | Requires confirmation |
| `POST /projects` | Requires confirmation |
| `GET /projects/:id` — includes progress calculation field | Requires confirmation |
| `PATCH /projects/:id` | Requires confirmation |
| `POST /projects/:id/archive` or `PATCH` with status field | Requires confirmation |
| `DELETE /projects/:id` | Requires confirmation |
| `GET /projects/:id/members` | Requires confirmation |
| `POST /projects/:id/members` | Requires confirmation |
| `DELETE /projects/:id/members/:userId` | Requires confirmation |
| Progress field: confirm whether the backend returns a numeric percentage or raw data | Requires confirmation |

### Validation and Tests
- Project list paginates correctly when more projects than page size.
- Archived projects are filterable and not shown by default.
- Non-PM/Owner users cannot see archive or delete controls.
- Project creation with an empty name shows a validation error.
- Deleting a project requires confirmation.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Projects are listed, searchable, filterable, and sortable.
- Projects can be created, edited, archived, and deleted per role permissions.
- Project overview page shows accurate progress from backend data.
- Members can be added and removed from projects.
- Empty states render for zero projects and zero project members.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- Progress calculation must come from the backend. Do not recalculate task completion percentages on the frontend.
- Privacy settings depend on whether the backend exposes a `privacy` field; confirm before building the UI control.

---

## Phase 6 — Tasks and Kanban Boards

### Objective
Build the full task management experience: creating, editing, assigning, and tracking tasks through the defined workflow. Implement Kanban board and list views with filtering, searching, drag-and-drop reordering, comments, and activity history.

### Prerequisites
- Phase 5 complete: project context available, project pages exist.
- Backend task APIs confirmed, including accepted status transitions and permission rules.
- Kanban drag-and-drop library decided (e.g., `@dnd-kit/core`; confirm before Phase 1 installation).

### Implementation Tasks

**Task data layer**
- [ ] `services/tasks.ts` — `getTasks`, `getTask`, `createTask`, `updateTask`, `deleteTask`, `updateTaskStatus`, `addComment`, `getComments`, `addAttachment`, `getActivity`.
- [ ] `types/tasks.ts` — `Task`, `TaskStatus`, `TaskPriority`, `Comment`, `Attachment`, `ActivityEntry`, `TaskFilters`.

**Task status workflow** (implement only confirmed transitions)
```
ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED
                                   ↘ CHANGES_REQUESTED → IN_PROGRESS
```
- [ ] Confirm exact allowed status transitions and which roles may trigger each with the backend team.
- [ ] Build status transition controls that only offer permitted next states for the current user's role.

**List view**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/tasks/page.tsx` — grouped task list with columns for status or a flat filterable list.
- [ ] Filters: status, assignee, priority, due date range, search by title.
- [ ] Sort: due date, priority, created date, title.
- [ ] Pagination or infinite scroll (per backend support).
- [ ] Inline status change via dropdown.

**Kanban board view**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/board/page.tsx` — columns per status.
- [ ] Task cards: title, assignee avatar, priority badge, due date, comment count.
- [ ] Drag-and-drop to change status (calls `updateTaskStatus`; reflects transition rules).
- [ ] Horizontal scroll for boards with many columns (desktop).
- [ ] Keyboard-accessible drag-and-drop alternative (arrow keys or accessible action menu).
- [ ] Optimistic UI update with rollback on failure.

**Task creation**
- [ ] Create task modal: title (required), description, assignee, priority, due date, status.
- [ ] Validation: title required, due date not in the past warning.
- [ ] Subtask creation (if backend supports it; otherwise defer).

**Task detail**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/tasks/[taskId]/page.tsx` (or slide-over panel).
- [ ] Edit title, description, assignee, priority, due date inline.
- [ ] Status transition control.
- [ ] Comments section: paginated, add comment, edit/delete own comments.
- [ ] Activity history: read-only log of status changes, assignments, comments.
- [ ] File attachments: upload, preview (image/PDF where possible), download, delete.
- [ ] Subtask list if supported by backend.
- [ ] Dependencies display if supported by backend.
- [ ] Link to parent project and workspace via breadcrumb.

**Progress indicators**
- [ ] Project task progress bar derived from backend-provided aggregation (do not recalculate).
- [ ] Visual priority indicators (color/icon mapped to priority level).

**Types and tests**
- [ ] `types/tasks.ts` as defined above.
- [ ] Component tests: task card rendering, status badge colors, create-task form validation.
- [ ] Integration test: drag a card to a new column, confirm `updateTaskStatus` was called.

### Frontend Deliverables
- `services/tasks.ts`.
- `types/tasks.ts`.
- Task list page with filters, sort, and pagination.
- Kanban board with drag-and-drop and keyboard alternative.
- Task creation modal.
- Task detail page/panel with comments, activity, attachments.
- Progress bar component consuming backend data.

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /projects/:id/tasks` — filter params, sort, pagination | Requires confirmation |
| `POST /tasks` — required fields, validation rules | Requires confirmation |
| `GET /tasks/:id` — full detail including comments, activity | Requires confirmation |
| `PATCH /tasks/:id` | Requires confirmation |
| `DELETE /tasks/:id` | Requires confirmation |
| `PATCH /tasks/:id/status` — accepted transitions per role | **Must be confirmed before implementation** |
| `GET /tasks/:id/comments`, `POST /tasks/:id/comments` | Requires confirmation |
| `PATCH /comments/:id`, `DELETE /comments/:id` | Requires confirmation |
| `POST /tasks/:id/attachments`, `DELETE /attachments/:id` | Requires confirmation |
| `GET /tasks/:id/activity` | Requires confirmation |
| Progress aggregation: confirm whether endpoint returns a `progress` field or raw counts | Requires confirmation |

### Validation and Tests
- Creating a task with no title shows validation error.
- Dragging a card to a disallowed status (per role) is rejected; UI rolls back.
- Comments can be added, edited (own), and deleted (own).
- Attachments can be uploaded and downloaded; backend file-size limits enforced.
- Kanban board is keyboard-navigable.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Tasks can be created, viewed, edited, and deleted per role.
- Status transitions follow the confirmed backend workflow.
- Kanban board reflects task status columns accurately.
- Drag-and-drop works and rolls back on API failure.
- Comments and activity history are visible.
- Attachments can be uploaded and downloaded.
- Filters and search narrow the task list correctly.
- Progress bar matches backend-provided data.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **BLOCKED** on confirmed status transition matrix from backend before Kanban logic is finalized.
- Drag-and-drop library must be installed (approved by team) before this phase begins.
- Subtask and dependency features depend on backend support; implement as shells if backend not ready.
- Attachment upload must respect the backend's file-size and file-type restrictions. Do not implement client-side bypasses.

---

## Phase 7 — Documents and Collaborative Workspace Content

### Objective
Build the document management experience within projects: listing, creating, viewing, and editing workspace documents. Implement save-state handling, unsaved-change warnings, and access controls. Do not claim real-time collaborative editing unless the backend provides a compatible collaboration service (e.g., Yjs, Operational Transformation, or equivalent).

### Prerequisites
- Phase 5 complete: project context available.
- Backend document APIs confirmed.
- Decision made on editor library (e.g., Tiptap, Plate — confirm with team before installing).

### Implementation Tasks

**Document data layer**
- [ ] `services/documents.ts` — `getDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument`.
- [ ] `types/documents.ts` — `Document`, `DocumentBlock`, `DocumentMeta`, `SaveState`.

**Document listing**
- [ ] `app/(auth)/workspace/[workspaceId]/projects/[projectId]/documents/page.tsx` — document list with title, last-modified date, author, and access badge.
- [ ] Create document button (role-gated).
- [ ] Empty state for no documents.
- [ ] Search/filter by title.

**Document editor**
- [ ] Install and configure the approved editor library.
- [ ] Document edit page: toolbar, content area, save/saving/saved/error status indicator.
- [ ] Auto-save on change with debounce (or explicit save button — confirm UX with product).
- [ ] Unsaved-change warning on navigation away (`beforeunload` + Next.js router event).
- [ ] Read-only mode for Viewers and users without edit permission.

**Collaboration state**
- [ ] If the backend does not yet provide a real-time collaboration service:
  - Implement single-user save-based editing only.
  - Display a notice: "Collaborative editing is not yet available."
  - Do not simulate live cursors or presence.
- [ ] If the backend provides a collaboration service, document the integration contract here before implementing.

**Access control**
- [ ] Display documents only to users with project access.
- [ ] Handle `403` on document fetch with an access-denied state.
- [ ] Restrict editing controls to roles with edit permission.

**Types and tests**
- [ ] Component tests: document list rendering, empty state, save-state indicator.
- [ ] Test unsaved-change warning triggers on navigation.

### Frontend Deliverables
- `services/documents.ts`, `types/documents.ts`.
- Document list page.
- Document editor page with save-state indicator.
- Unsaved-change navigation guard.
- Access-denied state for unauthorized access.

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /projects/:id/documents` | Requires confirmation |
| `POST /documents` | Requires confirmation |
| `GET /documents/:id` | Requires confirmation |
| `PATCH /documents/:id` — content format (JSON blocks, Markdown, or HTML) | **Must be confirmed before editor installation** |
| `DELETE /documents/:id` | Requires confirmation |
| Real-time collaboration service (Yjs/OT/CRDT) | Unknown — confirm before implementation |
| Document access permissions per role | Requires confirmation |

### Validation and Tests
- Document saves correctly; save indicator shows saved/saving/error state.
- Navigation away with unsaved changes prompts a warning.
- Viewer role cannot access the edit toolbar.
- Unauthorized document access shows an access-denied page, not a blank screen.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Documents can be listed, created, edited, and deleted per permissions.
- Save state is accurately reflected in the UI.
- Unsaved-change warning prevents accidental data loss.
- Collaborative editing is not claimed unless the backend integration is confirmed and tested.
- Access control is enforced.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **BLOCKED** on content format confirmation from backend before editor library can be selected and installed.
- Real-time collaboration requires a confirmed backend service. If unavailable, single-user editing is the deliverable for this phase.
- Editor library choice (Tiptap, Plate, etc.) is a significant dependency. Choose before this phase begins and record the decision.

---

## Phase 8 — Messaging and Work-Connected Communication

### Objective
Build the messaging experience: team and project channels, direct messages, task-linked discussions, @mentions, message-to-task conversion, file sharing, and message history. This phase covers the UI and REST-based initial data loading. Real-time delivery is added in Phase 9.

### Prerequisites
- Phase 4 complete: workspace and member context available.
- Phase 6 complete: task types and services available (for message-to-task conversion).
- Backend messaging REST APIs confirmed.

### Implementation Tasks

**Messaging data layer**
- [ ] `services/messages.ts` — `getConversations`, `getMessages`, `sendMessage`, `editMessage`, `deleteMessage`, `addReaction`, `pinMessage`, `searchMessages`, `convertToTask`.
- [ ] `types/messages.ts` — `Conversation`, `Message`, `MessageType`, `Reaction`, `ConversationKind` (direct / team / project / task-linked).

**Conversation list**
- [ ] `app/(auth)/workspace/[workspaceId]/messages/page.tsx` — sidebar list of conversations: DMs, team channels, project channels.
- [ ] Unread count badges per conversation (from REST data; real-time updates in Phase 9).
- [ ] Search conversations.
- [ ] New DM and new group conversation buttons.

**Message thread**
- [ ] `app/(auth)/workspace/[workspaceId]/messages/[conversationId]/page.tsx` — message list with pagination (load older messages on scroll up).
- [ ] Message composer: text input, file attachment button, `@mention` triggering a user picker, emoji picker (if required).
- [ ] Message bubbles: sender avatar, name, timestamp, message content, reactions, edit/delete for own messages, pin action.
- [ ] Reply/thread display if backend supports threaded messages.
- [ ] Read receipts display if backend supports it.

**Mentions**
- [ ] `@mention` autocomplete: show workspace members matching the typed name.
- [ ] Highlight @mentions in rendered message text.
- [ ] Navigate to notification when a mention is clicked (Phase 9 wires real-time; this phase handles REST).

**File sharing**
- [ ] File attachment in message composer: file picker, upload progress, inline preview for images.
- [ ] Respect backend file-size and type limits.
- [ ] Download link for non-previewable files.

**Task-linked discussions**
- [ ] Link a conversation to a task (display task title as a header above the message thread if supported by backend).
- [ ] Convert message to task: opens the task creation modal pre-filled with message content.

**Project and team channels**
- [ ] Automatically surface project channels within project navigation (link from project page to its channel).
- [ ] Team channels accessible from team or workspace navigation.

**Message search**
- [ ] `app/(auth)/workspace/[workspaceId]/search/page.tsx` — search across messages (uses `searchMessages`; full cross-entity search in Phase 11).

**Types and tests**
- [ ] Component tests: message bubble rendering, composer validation (empty message prevention), mention autocomplete.

### Frontend Deliverables
- `services/messages.ts`, `types/messages.ts`.
- Conversation list page.
- Message thread page with composer, pagination, reactions, edit/delete.
- @mention autocomplete.
- File attachment in composer.
- Message-to-task conversion flow.
- Message search (basic).

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /conversations` — filter by type (direct/team/project) | Requires confirmation |
| `POST /conversations` | Requires confirmation |
| `GET /conversations/:id/messages` — pagination | Requires confirmation |
| `POST /conversations/:id/messages` — text, file attachment | Requires confirmation |
| `PATCH /messages/:id` | Requires confirmation |
| `DELETE /messages/:id` | Requires confirmation |
| `POST /messages/:id/reactions` | Requires confirmation |
| `POST /messages/:id/pin` | Requires confirmation |
| `GET /conversations/:id/search` or global message search endpoint | Requires confirmation |
| `POST /messages/:id/convert-to-task` or task creation from message | Requires confirmation |
| Message mention format (`@userId` or `@username`) | Requires confirmation |
| File attachment endpoint and size limits | Requires confirmation |
| Thread/reply support | Requires confirmation |
| Read receipt endpoint | Requires confirmation |

### Validation and Tests
- Sending a message with empty content is prevented.
- File upload shows progress indicator.
- Messages load oldest-first with pagination (load more on scroll).
- @mention autocomplete filters workspace members.
- Edit and delete are only available on own messages.
- `403` on conversation access shows access-denied state.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Conversations are listed and navigable.
- Messages are sent, edited, and deleted per role/ownership.
- File attachments upload and display correctly.
- @mention autocomplete works.
- Message-to-task conversion opens the task creation modal correctly.
- Unread counts are visible (REST-based; real-time in Phase 9).
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- Thread/reply support and read receipts depend on backend implementation; mark as pending if unavailable.
- Real-time message delivery is explicitly deferred to Phase 9. This phase must not simulate real-time behavior.
- Message-to-task conversion requires the task creation modal from Phase 6 to be complete.

---

## Phase 9 — Real-Time Updates and Notifications

### Objective
Add the Socket.IO layer: shared client configuration, connection management, real-time task and project updates, live message delivery, typing indicators, online presence, and the full notification system (centralized inbox, unread counts, read/mark-all-read).

### Prerequisites
- Phase 3 complete: authentication available (socket authentication requires a valid session).
- Phase 6 complete: task types and update handlers available.
- Phase 8 complete: message types and conversation components available.
- Backend Socket.IO gateway confirmed: URL, authentication method, event names, room naming conventions, payload shapes.
- `socket.io-client` package confirmed and installed.

### Implementation Tasks

**Socket.IO client**
- [ ] Install `socket.io-client` (confirm version compatible with backend).
- [ ] `lib/socket.ts` — singleton socket client:
  - Connects to `NEXT_PUBLIC_SOCKET_URL`.
  - Authenticates per backend contract (token in handshake, cookie, or query param).
  - Manages connection/reconnection state.
  - Does not log auth tokens.
- [ ] `providers/SocketProvider.tsx` — provides socket instance and connection status to authenticated app tree.
- [ ] `hooks/useSocket.ts` — accesses socket and connection status.
- [ ] Connection state indicator in `TopNav` (connected / reconnecting / disconnected).

**Task real-time updates**
- [ ] Subscribe to workspace/project task update events.
- [ ] Update task list and Kanban board on `task:created`, `task:updated`, `task:deleted` events.
- [ ] Update task detail panel on `task:updated` for the open task.
- [ ] Clean up listeners on component unmount.
- [ ] Prevent duplicate event listeners from multiple subscriptions.
- [ ] Handle optimistic-update reconciliation (Phase 6 drag-and-drop already sends API calls; Phase 9 handles incoming events from other users).

**Real-time messaging**
- [ ] Subscribe to conversation message events: `message:created`, `message:edited`, `message:deleted`, `message:reaction`.
- [ ] Append new messages to the active conversation thread without a full refresh.
- [ ] Update conversation list unread counts on new messages.
- [ ] Typing indicator: send typing event on composer input; display "X is typing…" in thread.
- [ ] Online/presence indicator on user avatars (if backend provides `user:online` / `user:offline` events).

**Notifications**
- [ ] `services/notifications.ts` — `getNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`.
- [ ] `types/notifications.ts` — `Notification`, `NotificationType`, `NotificationStatus`.
- [ ] `app/(auth)/notifications/page.tsx` — notification inbox: paginated list, filter by type, mark-as-read, mark-all-read.
- [ ] `TopNav` notification bell: unread count badge, dropdown preview of latest notifications.
- [ ] Navigate from notification to the relevant task, project, message, or conversation.
- [ ] Subscribe to `notification:created` socket event to push new notification badge counts without polling.
- [ ] Prevent duplicate notifications from REST response + socket event (deduplication by notification ID).

**Types and tests**
- [ ] `types/notifications.ts` as above.
- [ ] Unit tests for socket event handlers: mock socket, emit a `task:updated` event, confirm component updates.
- [ ] Test listener cleanup: confirm no duplicate listeners after component remount.
- [ ] Component tests for notification list: unread badge, mark-as-read interaction.

### Frontend Deliverables
- `lib/socket.ts` singleton client.
- `providers/SocketProvider.tsx`, `hooks/useSocket.ts`.
- Real-time task update subscriptions.
- Real-time message delivery in conversation threads.
- Typing indicators.
- Online presence badges (if backend supports).
- `services/notifications.ts`, `types/notifications.ts`.
- Notification inbox page.
- TopNav notification bell with unread count.
- Notification navigation links.

### Backend Dependencies
| Contract | Status |
|---|---|
| Socket.IO gateway URL and authentication method | **Must be confirmed before implementation** |
| `task:created`, `task:updated`, `task:deleted` — payload shapes | **Must be confirmed** |
| `message:created`, `message:edited`, `message:deleted`, `message:reaction` — payload shapes | **Must be confirmed** |
| `typing:start`, `typing:stop` — room/channel convention | **Must be confirmed** |
| `user:online`, `user:offline` — presence events and payload | Requires confirmation |
| `notification:created` — payload shape | **Must be confirmed** |
| Room naming convention (workspace ID, project ID, conversation ID based) | **Must be confirmed** |
| `GET /notifications` — pagination, filter params | Requires confirmation |
| `POST /notifications/:id/read` or `PATCH` | Requires confirmation |
| `POST /notifications/read-all` | Requires confirmation |

### Validation and Tests
- Socket connects successfully with a valid session and disconnects on logout.
- A task status change made by another user appears in the Kanban board without a page reload.
- A new message from another user appears in the active conversation without a page reload.
- Typing indicator appears and disappears correctly.
- Notification bell badge increments on new notification event.
- Navigating from a notification opens the correct task or message.
- Duplicate notifications do not appear.
- Listeners are cleaned up on component unmount (no memory leaks).
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Socket client connects, authenticates, and reconnects automatically.
- Task and message updates are delivered in real time to all connected users in the same workspace.
- Notification inbox is accurate and navigable.
- Unread counts update in real time.
- No duplicate listeners, no duplicate notifications, no leaked subscriptions.
- Connection state is visibly indicated.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **BLOCKED** on all Socket.IO event contracts from the backend. Do not invent event names or payload shapes.
- `socket.io-client` version must match the backend's `socket.io` server version. Confirm before installing.
- Online presence events may not be implemented in the initial backend release. Mark as a deferred feature if unavailable.

---

## Phase 10 — Meetings and AI-Assisted Features

### Objective
Build meeting entry points, meeting status UIs, and AI-assisted productivity interfaces. Meetings integrate with projects, teams, and conversations. AI features include task planning, project summaries, writing assistance, and suggested next actions. All AI responses are clearly labelled as suggestions and go through the backend — no direct AI provider calls from the browser.

### Prerequisites
- Phase 4 complete: workspace and team context.
- Phase 8 complete: conversation context (meetings can be initiated from conversations).
- Phase 9 complete: notification infrastructure for meeting invites and AI job completions.
- Backend meeting and AI API contracts confirmed.

### Implementation Tasks

**Meeting infrastructure**
- [ ] Decide on and document the calling SDK/WebRTC provider (e.g., Daily.co, Agora, LiveKit, or native WebRTC). This decision must be made with the team before implementation.
- [ ] `services/meetings.ts` — `getMeetings`, `getMeeting`, `createMeeting`, `joinMeeting`, `endMeeting`, `getMeetingHistory`.
- [ ] `types/meetings.ts` — `Meeting`, `MeetingStatus`, `MeetingParticipant`, `MeetingLink`.

**Meeting pages and components**
- [ ] Meeting scheduling: create meeting linked to a project, team, or conversation; set title, time, participants.
- [ ] Meeting invitation notification and calendar display.
- [ ] Active meeting page: participant list, audio/video controls (mute, camera on/off), end call, screen share (if SDK supports).
- [ ] Incoming call UI: accept/decline with caller identity.
- [ ] Call history: list of past calls with duration, participants, and link to recording/summary (if available).
- [ ] Missed call indicator in notifications.
- [ ] Meeting scheduling from conversation (button in `TopNav` or message composer).
- [ ] Permission prompts for microphone and camera access.
- [ ] Device-selection controls where SDK supports it.
- [ ] Clear connection-state indicators (connecting, connected, reconnecting, failed).
- [ ] Recording status indicator and consent prompt when recording is active.

**AI assistant interface**
- [ ] `services/ai.ts` — `askAI`, `generateTaskPlan`, `summarizeProject`, `summarizeConversation`, `suggestNextActions`, `writeAssistance`.
- [ ] `types/ai.ts` — `AIRequest`, `AIResponse`, `AIStreamChunk`, `AITaskPlan`, `AISuggestion`.
- [ ] AI assistant panel or sidebar accessible from dashboard, project, and task pages.
- [ ] Streaming response rendering (if backend supports SSE or chunked responses).
- [ ] Clearly label all AI output as a suggestion, visually distinct from confirmed application data.
- [ ] Let users review and apply AI-suggested task plans (calls real create-task APIs only after user approval).
- [ ] Display links to related tasks or projects when provided in the AI response.
- [ ] Loading, processing, error, timeout, and usage-limit states for all AI calls.
- [ ] Prevent duplicate expensive AI requests (disable button while in-flight).
- [ ] Graceful unavailability message when AI service is not configured.

**AI-specific features**
- [ ] Project summary panel in project overview page.
- [ ] Conversation summary accessible from message thread header.
- [ ] Meeting summary and action items displayed after a meeting ends (if backend provides them).
- [ ] Writing assistance in document editor (Phase 7 hook-in point).
- [ ] AI blocker and next-action suggestions in task detail (Phase 6 hook-in point).

**Types and tests**
- [ ] Component tests: AI panel loading state, error state, suggestion review flow.
- [ ] Test that AI suggestions do not mutate data without user confirmation.

### Frontend Deliverables
- `services/meetings.ts`, `types/meetings.ts`.
- `services/ai.ts`, `types/ai.ts`.
- Meeting scheduling and management pages.
- Active call UI with audio/video controls.
- AI assistant panel.
- Streaming response renderer.
- AI suggestion review and apply flow.
- Unavailability states for AI and calling.

### Backend Dependencies
| Contract | Status |
|---|---|
| Calling SDK provider and credentials model | **Must be confirmed before implementation** |
| `POST /meetings` — creation params | Requires confirmation |
| `GET /meetings/:id` — join token/URL from backend | Requires confirmation |
| `POST /meetings/:id/end` | Requires confirmation |
| `GET /meetings` — history, filter by project/team | Requires confirmation |
| `POST /ai/ask` or streaming AI endpoint | Requires confirmation |
| `POST /ai/task-plan` | Requires confirmation |
| `POST /ai/summarize-project/:id` | Requires confirmation |
| `POST /ai/summarize-conversation/:id` | Requires confirmation |
| AI response streaming protocol (SSE vs. chunked JSON) | Requires confirmation |
| AI usage limits and rate-limit response format | Requires confirmation |
| Meeting recording and summary endpoints | Requires confirmation |

### Validation and Tests
- AI suggestion panel labels output as "AI suggestion" not confirmed data.
- Applying a task plan creates tasks via the real task creation API, not a mock.
- AI calls are disabled while a previous request is in-flight.
- AI unavailability message shown when backend returns a configuration error.
- Meeting call page requests microphone/camera permission before connecting.
- Recording consent prompt appears when recording is active.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Meetings can be scheduled, joined, and ended.
- Call UI displays participants, audio/video controls, and connection state.
- AI assistant returns suggestions clearly labelled as such.
- AI task plans require explicit user approval before any data is created.
- All AI, meeting, and streaming error states are handled gracefully.
- No AI provider keys appear in the frontend bundle.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **BLOCKED** on: (1) calling provider selection by the team, (2) AI backend endpoint confirmation.
- Do not display fabricated AI results or simulated meeting data.
- Meeting recording requires explicit user consent before enabling. Do not assume recording is always off.
- Streaming AI responses require a backend that supports SSE or HTTP streaming. If not available, implement polling or non-streaming responses as a fallback, and document the limitation.

---

## Phase 11 — Search, Activity, Dashboards, and Cross-Feature Integration

### Objective
Build unified search across supported workspace entities (tasks, projects, messages, documents, members), workspace-wide activity feeds, the real post-login dashboard with backend-provided analytics and insights (`AGENTS.md` §4.H), and cross-feature navigation (navigate from a notification to its task, from a message to its linked project, etc.). Ensure consistent global state and data refresh after cross-feature mutations.

### Prerequisites
- Phases 5, 6, 7, 8, and 9 complete: all major feature services and types exist.
- Phase 10 complete if AI-generated insights are to be surfaced on the dashboard.
- Backend search, activity feed, and analytics/aggregation APIs confirmed.

### Implementation Tasks

**Unified search**
- [ ] `services/search.ts` — `search(query, filters)` against backend global search endpoint.
- [ ] `types/search.ts` — `SearchResult`, `SearchResultKind` (task / project / message / document / member), `SearchFilters`.
- [ ] `app/(auth)/workspace/[workspaceId]/search/page.tsx` — full search page (extends the message search stub from Phase 8):
  - Search input with debounce.
  - Filter tabs by entity type.
  - Result cards that link to the correct entity page.
  - Keyboard navigation through results.
  - Empty state and no-results state.
  - Loading skeleton.
- [ ] Global search shortcut (e.g., `Cmd/Ctrl + K`) opening a command palette modal.
- [ ] Highlight matched search terms in result excerpts.

**Activity feeds**
- [ ] `services/activity.ts` — `getWorkspaceActivity`, `getProjectActivity`.
- [ ] `types/activity.ts` — `ActivityEvent`, `ActivityActor`, `ActivityResourceKind`.
- [ ] Workspace-level activity feed in dashboard or workspace overview page.
- [ ] Project-level activity feed in project overview page (already stubbed; wire real data here).
- [ ] Paginated, load-more activity list.
- [ ] Activity event icons and formatted descriptions (e.g., "Alice assigned a task to Bob in Project X").

**Dashboard and insights**
- [ ] `app/(auth)/dashboard/page.tsx` — replace the Phase 2 placeholder with the real post-login dashboard: greeting, current workspace summary, task counts by status, overdue work, upcoming deadlines, and recent activity.
- [ ] `services/analytics.ts` — `getWorkspaceAnalytics`, `getProjectAnalytics`, defined strictly against confirmed backend aggregation endpoints.
- [ ] `types/analytics.ts` — `AnalyticsSummary`, `TaskCompletionStat`, `WorkloadStat`, `DeadlineStat`.
- [ ] Dashboard widget components: task completion, overdue work, upcoming deadlines, team workload, activity trend.
- [ ] Render only metrics the backend returns. Do not compute authoritative project or task progress on the frontend and do not display fabricated production data (`AGENTS.md` §4.H).
- [ ] AI-generated insights section fed by the Phase 10 AI service, visually labelled as AI suggestions and linked to the supporting tasks or projects when the response provides them.
- [ ] Loading skeleton, empty state, and error state with retry for every dashboard widget.
- [ ] Do not surface workspace analytics to users without access to the underlying workspace data; handle `403` with an access-denied state.

**Cross-feature navigation**
- [ ] Verify that every navigable notification type opens the correct target page without a 404.
- [ ] Task cards in Kanban link to task detail.
- [ ] Message mentions of tasks link to task detail.
- [ ] Activity events link to their referenced resource.
- [ ] Meeting summaries link back to the originating project or conversation.
- [ ] Breadcrumbs on every deep page correctly reflect the workspace → project → entity hierarchy.

**Global state and data consistency**
- [ ] Verify that creating a task in Phase 6 updates the project progress bar without a full page reload.
- [ ] Verify that deleting a project in Phase 5 removes it from the workspace project list immediately.
- [ ] Verify that accepting an invitation in Phase 4 updates the member list immediately.
- [ ] Document any race conditions or stale-data issues found and apply targeted fixes.
- [ ] Confirm that React context or caching strategy invalidates correctly after cross-feature mutations.

**Tests**
- [ ] Component test: search result list keyboard navigation.
- [ ] Integration test: search query triggers debounced API call with correct params.
- [ ] Test: clicking a notification for a task navigates to the correct task page.
- [ ] Component test: dashboard widget renders loading, empty, error, and populated states from mocked analytics data.

### Frontend Deliverables
- `services/search.ts`, `types/search.ts`.
- `services/activity.ts`, `types/activity.ts`.
- `services/analytics.ts`, `types/analytics.ts`.
- Full search page with entity-type filtering.
- Command palette (`Cmd+K`).
- Workspace and project activity feeds wired to real data.
- Dashboard page with analytics widgets driven by backend data, plus labelled AI insights.
- Cross-feature navigation verified.
- Global state consistency confirmed.

### Backend Dependencies
| Contract | Status |
|---|---|
| `GET /search?q=&type=` — response shape, supported entity types | Requires confirmation |
| Pagination for search results | Requires confirmation |
| `GET /workspaces/:id/activity` | Requires confirmation |
| `GET /projects/:id/activity` (may already exist from Phase 5/6) | Requires confirmation |
| Activity event schema: actor, verb, resource type, resource ID | Requires confirmation |
| `GET /workspaces/:id/analytics` or equivalent aggregation endpoint — metric list and response shape | Requires confirmation |
| `GET /projects/:id/analytics` or equivalent | Requires confirmation |
| Dashboard metrics: completion, overdue, workload, deadlines, activity trend — confirm which are provided | Requires confirmation |
| AI insights endpoint (Phase 10 contract) and payload shape | Requires confirmation |

### Validation and Tests
- Search returns results across task, project, message, and document entities.
- Results link to the correct entity page.
- Debounce prevents a request on every keystroke.
- Command palette opens with keyboard shortcut and closes with `Escape`.
- Activity feeds paginate and load older events on scroll.
- All notification navigation targets resolve without a 404.
- Dashboard shows backend-provided data only; loading, empty, and error states render correctly.
- AI insight cards are labelled as suggestions and link to supporting resources.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- Unified search covers all supported entity types.
- Command palette is accessible and keyboard-navigable.
- Activity feeds display real data for workspace and project contexts.
- Dashboard replaces the Phase 2 placeholder and displays only backend-provided metrics.
- AI-generated insights are clearly labelled and never presented as confirmed application data.
- Cross-feature navigation is correct for all notification types and activity events.
- No stale data inconsistencies found in cross-feature mutation scenarios.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- Global search scope (which entities are indexed) must be confirmed with the backend.
- If backend does not yet support global search, implement per-entity search within each feature and defer unified search to when the backend is ready.
- The dashboard must not invent analytics. If the backend aggregation endpoints are unavailable, ship the dashboard with activity feed and real feature links only, and record the analytics widgets as blocked.

---

## Phase 12 — UI Polish, Accessibility, and Responsive Validation

### Objective
Systematic audit and remediation of visual consistency, accessibility, and responsive behavior across every implemented feature. This phase does not add new features; it brings all existing screens up to the Nexus design and accessibility standards.

### Prerequisites
- Phases 1–11 complete (or substantially complete).
- All primary user journeys functional.

### Implementation Tasks

**Responsive validation**
- [ ] Test every page at: 320px (small mobile), 375px (iPhone SE), 768px (tablet), 1024px (small laptop), 1440px (desktop), 1920px (wide desktop).
- [ ] Fix horizontal overflow (except intentional scroll areas like Kanban board).
- [ ] Ensure sidebar collapses to a drawer or bottom nav on mobile.
- [ ] Ensure modals, dialogs, and dropdowns are usable on touch screens.
- [ ] Ensure Kanban board has horizontal scroll on tablet/mobile with touch support.
- [ ] Ensure file attachment previews scale correctly.
- [ ] Ensure forms are usable with the on-screen keyboard on mobile (viewport does not obscure inputs).

**Accessibility audit**
- [ ] Run an automated accessibility scan (e.g., `axe-core` via Testing Library or a browser extension) on all pages.
- [ ] Fix all `axe` violations of level AA or above.
- [ ] Verify every interactive element has a visible focus indicator.
- [ ] Verify every icon-only button has an accessible label (`aria-label` or `sr-only` text).
- [ ] Verify all form fields have associated labels (not just placeholder text).
- [ ] Verify color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for large text and UI components).
- [ ] Verify task status colors are not the only indicator of status (use icons or text labels too).
- [ ] Verify dialogs and modals trap focus correctly.
- [ ] Verify `Tab` order is logical in all forms and navigation.
- [ ] Verify `Escape` closes dropdowns, modals, and the command palette.
- [ ] Verify screen-reader announcements for async state changes (loading complete, error appeared).

**Design consistency**
- [ ] Audit all pages for consistent use of Nexus design tokens (no stray hex values or arbitrary Tailwind values outside the design system).
- [ ] Verify button, input, badge, and card styles are consistent across all features.
- [ ] Verify loading skeletons match the shape of the content they replace.
- [ ] Verify empty states are present for every list (tasks, projects, messages, documents, members, notifications, search results).
- [ ] Verify error states are present and actionable for every async operation.
- [ ] Verify confirmation dialogs are used for all destructive actions (no `window.alert()`).

**Animation and motion**
- [ ] Verify all CSS transitions and animations respect `prefers-reduced-motion`.
- [ ] Remove or replace any animations that are not functional (do not add decoration for its own sake).

**Typography and spacing**
- [ ] Verify heading hierarchy (`h1` → `h2` → `h3`) is semantically correct on all pages.
- [ ] Verify line lengths, padding, and margin are consistent with the design system.

**Tests**
- [ ] Add accessibility tests using `@testing-library/jest-dom` or `axe-core` matchers for critical components.
- [ ] Snapshot or visual regression tests for key component states (if a tool is configured).

### Frontend Deliverables
- Accessibility audit report (checklist of issues found and fixed).
- Responsive validation report (list of breakpoints tested and issues fixed).
- Updated components and pages with accessibility and responsive fixes.

### Backend Dependencies
None. This phase is frontend-only.

### Validation and Tests
- Zero `axe` AA violations on the dashboard, task board, and message thread pages.
- All interactive elements focusable by keyboard.
- No horizontal overflow at 375px on core pages.
- All empty and error states visible.
- All animations suppressed under `prefers-reduced-motion: reduce`.
- `npm run lint`, `npm run build`, `npm test` pass.

### Acceptance Criteria
- All pages pass automated accessibility checks at WCAG 2.1 AA level.
- All pages render correctly at mobile, tablet, and desktop breakpoints.
- Design token usage is consistent across all features.
- All destructive actions use `ConfirmDialog`, not browser dialogs.
- All empty and error states are present and useful.
- Lint, build, and tests pass.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- If an accessibility issue is found that requires a backend API change (e.g., missing accessible names in server-returned HTML fragments), document it as a backend dependency.
- Do not redesign entire pages in this phase; fix issues without altering approved layouts.

---

## Phase 13 — Testing, Security, and Reliability

### Objective
Achieve comprehensive test coverage, complete a security review, and confirm the application is reliable under realistic conditions. This phase adds integration and end-to-end tests for critical user journeys, validates role-gated behavior, and confirms the production build is clean.

### Prerequisites
- Phases 1–12 substantially complete.
- Test framework configured and initial tests passing (from Phase 1).

### Implementation Tasks

**Test coverage expansion**
- [ ] Unit tests for all service functions (`auth`, `workspaces`, `projects`, `tasks`, `messages`, `notifications`, `search`, `ai`).
- [ ] Unit tests for all custom hooks.
- [ ] Component tests for all critical user interactions:
  - Login/register form with validation errors and API failure states.
  - Protected route redirect behavior.
  - Task creation, status change, and delete with confirmation.
  - Message send with empty content prevention.
  - Notification mark-as-read.
  - Role-gated button visibility (Owner sees delete; Viewer does not).
- [ ] Socket event tests: mock socket, emit events, assert UI state changes.
- [ ] API error state tests: 401, 403, 404, 422, 500 response handling per service.
- [ ] Form validation tests: every form in the application.

**Critical user journey tests**
- [ ] Register → email verify → login → create workspace → create project → create task → change task status.
- [ ] Login → open message thread → send message → receive real-time message (mock socket).
- [ ] Login → create meeting → join meeting → end meeting.
- [ ] Login as Viewer → attempt to access Owner actions → confirm blocked.

**Security review**
- [ ] Confirm no API keys, tokens, or secrets appear in the frontend bundle (`npm run build` + bundle analysis).
- [ ] Confirm `NEXT_PUBLIC_` variables only contain values intended for public exposure.
- [ ] Confirm no `dangerouslySetInnerHTML` usage without sanitization audit.
- [ ] Confirm file uploads validate type and size through the backend before display.
- [ ] Confirm authentication tokens are not logged.
- [ ] Confirm AI responses are rendered safely (no unsanitized HTML injection from AI output).
- [ ] Confirm that removing a workspace member from the UI calls the backend and does not only update local state.

**Reliability checks**
- [ ] Test socket reconnection: disconnect socket mid-session, confirm reconnection and state recovery.
- [ ] Test optimistic update rollback: force a task status update failure, confirm Kanban card reverts.
- [ ] Test expired session handling: simulate a 401 response mid-session, confirm redirect to login.
- [ ] Test network failure in file upload: confirm error state and retry availability.
- [ ] Test form submission during network error: confirm input is preserved.

**Build and quality**
- [ ] Run `npm run lint` — must pass with zero errors.
- [ ] Run TypeScript type check — must pass with zero errors (`tsc --noEmit` or via `npm run build`).
- [ ] Run `npm test` — must pass with zero failures.
- [ ] Run `npm run build` — must produce a clean production bundle.
- [ ] Record bundle size of key routes.

### Frontend Deliverables
- Comprehensive test suite covering all services, hooks, and critical components.
- Security review checklist with findings.
- Reliability test results.
- Clean lint, type-check, test, and build reports.

### Backend Dependencies
- All backend contracts must be finalized to write accurate integration tests. Use realistic mock fixtures where the live backend is unavailable in CI.

### Validation and Tests
Self-referential: the deliverable of this phase is the test suite itself, which must pass.

### Acceptance Criteria
- `npm run lint` passes with zero errors.
- TypeScript type check passes with zero errors.
- `npm test` passes with zero failures.
- `npm run build` completes without errors.
- Critical user journeys covered by tests.
- No secrets in the frontend bundle.
- Security review checklist completed with all identified issues resolved.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- The `package.json` does not currently have a `test` script. This must be added in Phase 1.
- If a CI pipeline exists or is being configured in parallel, ensure test commands match what CI expects.
- Bundle analysis tooling (e.g., `@next/bundle-analyzer`) should be installed if not already available.

---

## Phase 14 — Production Configuration and Deployment

### Objective
Validate environment configuration for production, confirm the production build integrates correctly with the deployed backend and Socket.IO server, and verify deployment settings on the target hosting platform.

> **Do not deploy to production without explicit authorization from the project owner.**

### Prerequisites
- Phase 13 complete: lint, tests, and production build all passing.
- Target hosting platform confirmed (e.g., Vercel, AWS, Render, self-hosted).
- Backend deployed to a staging or production environment.
- Production environment variables available (stored securely, not committed).

### Implementation Tasks

**Environment configuration**
- [ ] Confirm all required environment variables exist in the production environment:
  - `NEXT_PUBLIC_API_URL` — backend HTTP API base URL.
  - `NEXT_PUBLIC_SOCKET_URL` — Socket.IO server URL.
  - Any additional variables introduced during implementation.
- [ ] Update `.env.example` with any new variable names discovered during implementation (placeholder values only).
- [ ] Verify no development-only URLs or `localhost` values are hardcoded in production code.
- [ ] Verify no secrets or private API keys are present in `NEXT_PUBLIC_` variables.

**Production build verification**
- [ ] Run `npm run build` against production environment variables.
- [ ] Verify the build succeeds without type errors or lint failures.
- [ ] Verify no server-only environment variables are leaked to the client bundle.
- [ ] Spot-check bundle for sensitive strings (API keys, passwords, tokens).

**Deployment settings**
- [ ] Confirm the deployment target's Node.js version supports the installed Next.js version.
- [ ] Configure any required headers (CORS, Content-Security-Policy, HSTS) through `next.config.ts` or the hosting platform.
- [ ] Confirm static asset caching strategy is appropriate.
- [ ] Confirm WebSocket/long-poll support is enabled on the hosting platform for Socket.IO.
- [ ] Confirm that `npm run start` is the correct start command (or document an alternative if required).

**Integration verification**
- [ ] Perform a smoke test of the production build against the staging backend:
  - Login and session restoration.
  - Create and view a task.
  - Send a message.
  - Receive a real-time notification.
- [ ] Document any integration failures as blockers before production release.

**Documentation**
- [ ] Document all required environment variables and their expected values (without real secrets) in a `DEPLOYMENT.md` or equivalent.
- [ ] Document deployment procedure, rollback steps, and any known production limitations.

### Frontend Deliverables
- Updated `.env.example`.
- `DEPLOYMENT.md` with deployment prerequisites and instructions.
- Smoke test report from staging.

### Backend Dependencies
- Deployed staging backend with working authentication and Socket.IO gateway.
- Production environment variables provided through secure channel.

### Validation and Tests
- `npm run build` succeeds with production environment variables.
- Smoke test against staging backend: login, task creation, message, real-time notification all work.
- No `localhost` references in the production bundle.
- No secrets in `NEXT_PUBLIC_` variables.
- WebSocket connection established in staging environment.

### Acceptance Criteria
- Production build is clean (zero lint errors, zero type errors).
- Smoke test against staging passes all listed checks.
- `DEPLOYMENT.md` documents all required environment variables and deployment steps.
- No secrets committed to the repository.
- Deployment authorized by the project owner before proceeding to production.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- **Blocked** until the backend is deployed to a stable staging environment.
- Production deployment requires explicit authorization. Do not trigger it autonomously.
- If the hosting platform does not support WebSocket connections (e.g., serverless without sticky sessions), Socket.IO must be configured to fall back to long-polling. Document this as a hosting requirement.

---

## Phase 15 — Final Acceptance and Handover

### Objective
Verify that all phases have met their acceptance criteria, confirm all critical user journeys end-to-end, document the completed feature set and any outstanding issues, and produce a final handover summary.

### Prerequisites
- Phase 14 complete: production build clean and smoke test passed.
- All prior phase acceptance criteria verified.

### Implementation Tasks

**Phase-by-phase acceptance verification**
- [ ] Re-read each phase's acceptance criteria in this file.
- [ ] For each phase, confirm that its criteria are met by checking the actual application state (not memory or assumption).
- [ ] Mark phases as `COMPLETED` only after verification.
- [ ] List any criteria that have not been met as outstanding issues.

**Critical user journey sign-off**
Execute and document the result of each journey:
- [ ] **Registration:** New user registers, verifies email (if applicable), and arrives at the dashboard.
- [ ] **Login / Logout:** User logs in, uses the app, logs out, and cannot access protected pages.
- [ ] **Session restore:** User closes and reopens the browser; the session is restored.
- [ ] **Workspace:** User creates a workspace, invites a member, and the member accepts the invitation.
- [ ] **Project:** User creates a project, adds members, and views the project overview.
- [ ] **Task lifecycle:** User creates a task, moves it through `ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED`.
- [ ] **Messaging:** User sends a message in a project channel; another user receives it in real time.
- [ ] **Notifications:** User receives a task assignment notification and navigates to the task.
- [ ] **Search:** User searches for a task by title and clicks through to the task detail.
- [ ] **AI:** User requests a project summary and reviews the AI suggestion before applying it.
- [ ] **Meeting:** User schedules a meeting, joins it, and ends it.
- [ ] **Mobile:** Core journeys (login, view task, send message) work correctly on a 375px viewport.

**Documentation**
- [ ] Write a final implementation summary covering:
  - Features completed per phase.
  - Features partially complete with a description of what remains.
  - Features not implemented and the reason (backend not available, out of scope, deferred).
  - Known bugs or limitations.
  - Outstanding backend dependencies.
  - Environment variables required for production.
  - Third-party service dependencies (calling SDK, AI provider, Socket.IO gateway).
  - Recommendations for next development cycle.

**Handover checklist**
- [ ] All source code committed and pushed to the correct branch.
- [ ] No secrets or credentials in the repository.
- [ ] `PHASES.md` is up to date with final completion statuses.
- [ ] `DEPLOYMENT.md` is up to date.
- [ ] `README.md` updated with project-specific getting-started instructions (replacing the default Next.js content).
- [ ] Open issues or follow-on work items documented (GitHub issues or equivalent).

### Frontend Deliverables
- Final implementation summary document.
- Updated `PHASES.md` with final completion statuses.
- Updated `README.md`.
- Open issues documented.

### Backend Dependencies
- All backend endpoints that affect unresolved acceptance criteria must be confirmed or documented as outstanding.

### Validation and Tests
- All critical user journeys executed and results documented.
- All phase acceptance criteria confirmed as met or documented as outstanding.
- `npm run lint`, `npm test`, `npm run build` pass on the final code.

### Acceptance Criteria
- Every critical user journey completes successfully against the production or staging environment.
- Every phase is marked `COMPLETED` or its outstanding items are documented with clear follow-up actions.
- `README.md` provides accurate getting-started instructions.
- No secrets in the repository.
- Final implementation summary written and available.

### Completion Status
`NOT_STARTED`

### Notes and Blockers
- This phase cannot begin until Phase 14 is complete.
- Any journeys that cannot be executed (e.g., meeting features if the calling SDK is not provisioned) must be documented as outstanding items with the specific blocker recorded.

---

## Appendix A — Environment Variables Reference

| Variable | Scope | Purpose | Required |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Client | Nexus backend HTTP API base URL | Yes |
| `NEXT_PUBLIC_SOCKET_URL` | Client | Socket.IO server URL | Yes (Phase 9+) |

> Additional variables will be documented here as they are identified during implementation. Never populate this table with real values; use placeholders in `.env.example`.

---

## Appendix B — Backend Contract Tracking

All backend contracts marked "Requires confirmation" in the phases above are listed here. Update the Status and Confirmed Date columns as contracts are verified with the backend team.

| Phase | Contract | Status | Confirmed Date |
|---|---|---|---|
| Phase 3 | `POST /auth/login` — request/response shape, cookie vs. token strategy | Pending | — |
| Phase 3 | `POST /auth/register` — validation rules, email verification flow | Pending | — |
| Phase 3 | `POST /auth/logout` — cookie clearing or token revocation | Pending | — |
| Phase 3 | `POST /auth/forgot-password` | Pending | — |
| Phase 3 | `POST /auth/reset-password` — token param, expiry behavior | Pending | — |
| Phase 3 | `GET /auth/verify-email` — query param name and flow | Pending | — |
| Phase 3 | `GET /users/me` — response shape including roles/workspace memberships | Pending | — |
| Phase 3 | `PATCH /users/me` — updatable fields, validation rules | Pending | — |
| Phase 3 | 401 response format and refresh token behavior | Pending | — |
| Phase 4 | `GET /workspaces` — list user's workspaces | Pending | — |
| Phase 4 | `POST /workspaces` — create workspace, validation rules | Pending | — |
| Phase 4 | `GET /workspaces/:id` | Pending | — |
| Phase 4 | `PATCH /workspaces/:id` | Pending | — |
| Phase 4 | `DELETE /workspaces/:id` | Pending | — |
| Phase 4 | `GET /workspaces/:id/members` — includes role field | Pending | — |
| Phase 4 | `POST /workspaces/:id/invite` — email, role | Pending | — |
| Phase 4 | `PATCH /workspaces/:id/members/:userId` — role update | Pending | — |
| Phase 4 | `DELETE /workspaces/:id/members/:userId` | Pending | — |
| Phase 4 | `GET /teams` or `GET /workspaces/:id/teams` | Pending | — |
| Phase 4 | `POST /teams`, `PATCH /teams/:id`, `DELETE /teams/:id` | Pending | — |
| Phase 4 | `POST /invitations/:token/accept` — for email-link acceptance | Pending | — |
| Phase 4 | Role enum values: `OWNER`, `PM`, `MEMBER`, `VIEWER`, `COLLABORATOR` — confirm exact strings | Pending | — |
| Phase 5 | `GET /workspaces/:id/projects` — pagination, filter, sort params | Pending | — |
| Phase 5 | `POST /projects` | Pending | — |
| Phase 5 | `GET /projects/:id` — includes progress calculation field | Pending | — |
| Phase 5 | `PATCH /projects/:id` | Pending | — |
| Phase 5 | `POST /projects/:id/archive` or `PATCH` with status field | Pending | — |
| Phase 5 | `DELETE /projects/:id` | Pending | — |
| Phase 5 | `GET /projects/:id/members` | Pending | — |
| Phase 5 | `POST /projects/:id/members` | Pending | — |
| Phase 5 | `DELETE /projects/:id/members/:userId` | Pending | — |
| Phase 5 | Progress field — confirm whether backend returns a numeric percentage or raw counts | Pending | — |
| Phase 6 | `GET /projects/:id/tasks` — filter params, sort, pagination | Pending | — |
| Phase 6 | `POST /tasks` — required fields, validation rules | Pending | — |
| Phase 6 | `GET /tasks/:id` — full detail including comments, activity | Pending | — |
| Phase 6 | `PATCH /tasks/:id` | Pending | — |
| Phase 6 | `DELETE /tasks/:id` | Pending | — |
| Phase 6 | `PATCH /tasks/:id/status` — accepted transitions per role | **Pending (required before Kanban)** | — |
| Phase 6 | `GET /tasks/:id/comments`, `POST /tasks/:id/comments` | Pending | — |
| Phase 6 | `PATCH /comments/:id`, `DELETE /comments/:id` | Pending | — |
| Phase 6 | `POST /tasks/:id/attachments`, `DELETE /attachments/:id` — file size/type limits | Pending | — |
| Phase 6 | `GET /tasks/:id/activity` | Pending | — |
| Phase 6 | Progress aggregation — confirm whether endpoint returns `progress` field or raw counts | Pending | — |
| Phase 7 | `GET /projects/:id/documents` | Pending | — |
| Phase 7 | `POST /documents` | Pending | — |
| Phase 7 | `GET /documents/:id` | Pending | — |
| Phase 7 | `PATCH /documents/:id` — content format (JSON blocks, Markdown, or HTML) | **Pending (required before editor install)** | — |
| Phase 7 | `DELETE /documents/:id` | Pending | — |
| Phase 7 | Real-time collaboration service (Yjs/OT/CRDT), if any | Pending | — |
| Phase 7 | Document access permissions per role | Pending | — |
| Phase 8 | `GET /conversations` — filter by type (direct/team/project) | Pending | — |
| Phase 8 | `POST /conversations` | Pending | — |
| Phase 8 | `GET /conversations/:id/messages` — pagination | Pending | — |
| Phase 8 | `POST /conversations/:id/messages` — text, file attachment | Pending | — |
| Phase 8 | `PATCH /messages/:id` | Pending | — |
| Phase 8 | `DELETE /messages/:id` | Pending | — |
| Phase 8 | `POST /messages/:id/reactions` | Pending | — |
| Phase 8 | `POST /messages/:id/pin` | Pending | — |
| Phase 8 | Message search endpoint | Pending | — |
| Phase 8 | `POST /messages/:id/convert-to-task` | Pending | — |
| Phase 8 | Message mention format (`@userId` or `@username`) | Pending | — |
| Phase 8 | File attachment endpoint and size limits | Pending | — |
| Phase 8 | Thread/reply support | Pending | — |
| Phase 8 | Read receipt endpoint | Pending | — |
| Phase 9 | Socket.IO gateway URL and authentication method | **Pending (required before Phase 9)** | — |
| Phase 9 | `task:created`, `task:updated`, `task:deleted` — payload shapes | **Pending** | — |
| Phase 9 | `message:created`, `message:edited`, `message:deleted`, `message:reaction` — payload shapes | **Pending** | — |
| Phase 9 | `typing:start`, `typing:stop` — room/channel convention | **Pending** | — |
| Phase 9 | `user:online`, `user:offline` — presence events and payload | Pending | — |
| Phase 9 | `notification:created` — payload shape | **Pending** | — |
| Phase 9 | Room naming convention (workspace/project/conversation ID based) | **Pending** | — |
| Phase 9 | `GET /notifications` — pagination, filter params | Pending | — |
| Phase 9 | `POST /notifications/:id/read` or `PATCH` | Pending | — |
| Phase 9 | `POST /notifications/read-all` | Pending | — |
| Phase 10 | Calling SDK provider and credentials model | **Pending (required before Phase 10)** | — |
| Phase 10 | `POST /meetings` — creation params | Pending | — |
| Phase 10 | `GET /meetings/:id` — join token/URL from backend | Pending | — |
| Phase 10 | `POST /meetings/:id/end` | Pending | — |
| Phase 10 | `GET /meetings` — history, filter by project/team | Pending | — |
| Phase 10 | `POST /ai/ask` or streaming AI endpoint | Pending | — |
| Phase 10 | `POST /ai/task-plan` | Pending | — |
| Phase 10 | `POST /ai/summarize-project/:id` | Pending | — |
| Phase 10 | `POST /ai/summarize-conversation/:id` | Pending | — |
| Phase 10 | AI response streaming protocol (SSE vs. chunked JSON) | Pending | — |
| Phase 10 | AI usage limits and rate-limit response format | Pending | — |
| Phase 10 | Meeting recording and summary endpoints | Pending | — |
| Phase 11 | `GET /search?q=&type=` — response shape, supported entity types | Pending | — |
| Phase 11 | Pagination for search results | Pending | — |
| Phase 11 | `GET /workspaces/:id/activity` | Pending | — |
| Phase 11 | `GET /projects/:id/activity` | Pending | — |
| Phase 11 | Activity event schema: actor, verb, resource type, resource ID | Pending | — |
| Phase 11 | `GET /workspaces/:id/analytics` — metric list and response shape | Pending | — |
| Phase 11 | `GET /projects/:id/analytics` | Pending | — |
| Phase 11 | Dashboard metrics: completion, overdue, workload, deadlines, activity trend | Pending | — |

---

## Appendix C — Conventions Reference

> Decisions made in Phase 0. Full details in `CONVENTIONS.md`.

| Decision | Choice | Notes |
|---|---|---|
| Folder structure | `app/` at repo root (no `src/`), `@/*` alias → repo root | See `CONVENTIONS.md` §1 |
| API client approach | Typed fetch wrapper in `lib/api.ts` | See `CONVENTIONS.md` §2 |
| Token storage | HttpOnly cookies via `credentials: 'include'` | Confirm exact cookie config with backend in Phase 3. See `CONVENTIONS.md` §3 |
| Form validation library | **Zod** — install in Phase 1 | See `CONVENTIONS.md` §4 |
| Test framework | **Vitest + Testing Library** — install in Phase 1 | See `CONVENTIONS.md` §5 |
| Drag-and-drop library | **@dnd-kit/core** — install in Phase 6, team confirm required | See `CONVENTIONS.md` §6 |
| Document editor library | **Deferred** — pending backend content format confirmation (Phase 7) | See `CONVENTIONS.md` §7 |
| Calling SDK | **Deferred** — pending team selection (Phase 10) | See `CONVENTIONS.md` §8 |
| State management | React built-ins only (`useState`, `useContext`, `useReducer`) | See `CONVENTIONS.md` §9 |
| Commit convention | `type(scope): description` — e.g., `feat(phase-3): ...` | See `CONVENTIONS.md` §10 |
