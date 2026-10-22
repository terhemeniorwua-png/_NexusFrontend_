---
name: nexus-frontend
description: Core Nexus frontend standards for Next.js App Router, TypeScript, Tailwind CSS v4, architecture conventions, phase workflow (Phases 0–15), and agent behavior for the Nexus real-time workspace platform.
---

# Nexus Frontend — Development Skill

## 1. Skill Overview

**Project:** Nexus — Real-Time Workspace & Project Management Platform  
**Area:** Frontend engineering  
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Styling:** Tailwind CSS v4  
**Communication:** REST API and Socket.IO/WebSockets  
**Backend:** Separate Express + TypeScript repository  
**Database ownership:** The backend owns database operations; the frontend communicates through documented backend APIs.

### Purpose

This skill defines the standards, architecture, implementation phases, design principles, integration requirements, and verification procedures that AI coding agents must follow when developing the Nexus frontend.

Nexus combines the core ideas of Trello, Notion, and Slack into one connected workspace. Users should be able to manage projects and tasks, collaborate on documents, communicate with teammates, attend meetings, receive notifications, and use AI-assisted productivity features.

The frontend must feel like one coherent product, not a collection of unrelated pages.

## 2. Mandatory Instructions for Coding Agents

Before modifying any code:

1. Read the root `AGENTS.md` file — it is the primary instruction file for this repository.
2. Read `PHASES.md` to identify the current implementation phase and its acceptance criteria.
3. Read this `SKILL.md` file completely.
4. Inspect the existing repository, including `package.json`, application routes, components, dependencies, environment files, API utilities, types, and tests.
5. Identify completed features and existing architectural decisions.
6. Produce a concise implementation plan for the current task before making substantial changes.

> **Note:** The root instruction file is `AGENTS.md`, not `agent.md`. The roadmap is `PHASES.md`. Both are at the repository root.

### Repository protection rules

- Preserve existing working features, styles, components, and routes.
- Do not replace the application with a new starter project when one already exists.
- Do not delete or overwrite `.env` files, credentials, configuration, or user-created files.
- Do not replace useful dependencies without a clear reason.
- Avoid duplicating components, hooks, utilities, API clients, or types that already exist.
- Do not silently change API contracts or invent backend endpoints.
- Do not mark a phase complete merely because its files have been created.
- Never claim that a feature works without verifying it.
- Keep frontend implementation within the frontend repository unless explicitly instructed otherwise.
- If a requirement depends on an unavailable backend capability, document the dependency instead of faking successful integration.

## 3. Technology and Architecture Standards

### Required technology

- Next.js with App Router
- TypeScript
- React
- Tailwind CSS v4
- REST API integration with the Nexus backend
- Socket.IO client or the backend's explicitly documented real-time transport
- A consistent form validation strategy
- A reusable notification and error-feedback system
- Automated testing appropriate to the existing project

Use the existing package manager and dependency versions. Do not migrate frameworks or introduce a new state-management library without first assessing the current architecture.

### TypeScript rules

- Use TypeScript for all application components, hooks, services, and utilities.
- Avoid `any`; prefer explicit interfaces, types, generics, and `unknown` where appropriate.
- Define reusable API request and response types.
- Use discriminated unions for complex states where helpful.
- Validate untrusted API responses when runtime validation is important.
- Avoid duplicating backend domain types unnecessarily.
- Use the `import type` syntax for type-only imports where appropriate.
- Keep types close to their feature when they are feature-specific and in shared type modules when genuinely reusable.

### App Router rules

- Organize routes using the Next.js App Router.
- Use Server Components by default.
- Add `'use client'` only when browser APIs, React client state, effects, or client-side interaction require it.
- Keep client components as small as practical.
- Do not expose server-only secrets through client components or `NEXT_PUBLIC_` environment variables.
- Use route groups and nested layouts when they improve organization.
- Implement loading, error, empty, and not-found states where appropriate.
- Avoid turning the entire application into a Client Component without a justified architectural reason.

Suggested organization, to be adapted to the existing repository:

> **Important:** This repository uses `app/` at the **repository root** — there is no `src/` directory. The `@/*` path alias resolves to the repository root (not `src/`). Do not create or reference a `src/` directory.

```text
app/                          # Next.js App Router routes — at repo root
├── (public)/                 # Unauthenticated routes
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   ├── verify-email/page.tsx
│   └── invite/[token]/page.tsx
├── (auth)/                   # Authenticated routes
│   ├── layout.tsx            # Auth shell with providers
│   ├── dashboard/page.tsx
│   ├── workspace/[workspaceId]/
│   │   ├── page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx
│   │   │   └── [projectId]/
│   │   │       ├── page.tsx
│   │   │       ├── tasks/page.tsx
│   │   │       ├── board/page.tsx
│   │   │       ├── documents/page.tsx
│   │   │       └── settings/page.tsx
│   │   ├── messages/
│   │   │   ├── page.tsx
│   │   │   └── [conversationId]/page.tsx
│   │   ├── members/page.tsx
│   │   └── settings/page.tsx
│   ├── profile/page.tsx
│   ├── notifications/page.tsx
│   └── search/page.tsx
├── layout.tsx
├── globals.css
├── not-found.tsx
├── error.tsx
└── loading.tsx
components/
├── ui/                       # Reusable primitives
├── layout/                   # TopNav, Sidebar, MobileNav, PageHeader
└── shared/                   # Cross-feature shared components
features/
├── auth/
├── workspaces/
├── teams/
├── projects/
├── tasks/
├── documents/
├── messaging/
├── meetings/
├── notifications/
└── ai-assistant/
hooks/
lib/                          # api.ts, routes.ts, socket.ts
providers/                    # AuthProvider, WorkspaceProvider, SocketProvider
services/
types/
```

This is a reference structure. Adapt to the actual repository. Do not move existing files to match this layout.

## 4. Design System and User Experience

### Brand identity

Nexus is a professional, modern collaboration platform. Its interface should communicate clarity, productivity, reliability, and connected teamwork.

Use the established palette:

- Main background: `#F8FAFC`
- Surface and cards: `#FFFFFF`
- Secondary background: `#F1F5F9`
- Primary text: `#0F172A`
- Secondary text: `#64748B`
- Borders: `#E2E8F0`
- Primary action: `#2563EB`
- Success: `#059669`
- Destructive/error: `#DC2626`

Use these colors consistently through the existing Tailwind CSS v4 theme configuration or shared design tokens. Do not scatter arbitrary color values throughout components.

### Design requirements

- Create a consistent design system with reusable buttons, inputs, dialogs, dropdowns, badges, tooltips, cards, and navigation components.
- Build a responsive interface for desktop, tablet, and mobile.
- Use a consistent spacing scale, typography hierarchy, border radius, and icon style.
- Add subtle transitions and purposeful animations.
- Respect reduced-motion preferences.
- Use skeletons for loading states where appropriate.
- Include useful empty states with clear calls to action.
- Show clear validation messages and operation results.
- Use modal or dialog confirmations for destructive actions when appropriate.
- Avoid browser `alert()` and `confirm()` for routine application interactions.
- Avoid unnecessary gradients, excessive shadows, excessive animations, and decorative elements that interfere with productivity.
- Ensure keyboard navigation, visible focus indicators, semantic HTML, and accessible dialog behavior.
- Do not use color alone to communicate task status, errors, or success.
- Use realistic sample data only for explicitly identified mockups or development fixtures.

### Product consistency

The sidebar, workspace switcher, global search, breadcrumbs, user menu, notification center, and command actions should behave consistently across relevant routes.

Task boards, documents, conversations, and meetings should connect to their associated workspace, project, team, or task wherever appropriate.

## 5. Implementation Phases

Follow the phase sequence in `PHASES.md`. That file is the authoritative source for task lists, backend dependencies, acceptance criteria, and completion status. The summary below is for orientation only — always read the full phase definition in `PHASES.md` before starting work.

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
| 11 | Search, Activity, Dashboards, and Cross-Feature Integration | NOT_STARTED |
| 12 | UI Polish, Accessibility, and Responsive Validation | NOT_STARTED |
| 13 | Testing, Security, and Reliability | NOT_STARTED |
| 14 | Production Configuration and Deployment | NOT_STARTED |
| 15 | Final Acceptance and Handover | NOT_STARTED |

**Phase dependency chain:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → (7 and 8 in parallel) → 9 → 10 → 11 → 12 → 13 → 14 → 15.

Phase 7 requires Phase 5. Phase 8 requires Phases 4 and 6. Phase 9 requires Phases 3, 6, and 8.

### Phase 0 — Repository Audit and Project Foundation

**Objectives:** Establish a verified understanding of the repository's actual state, resolve environment and tooling gaps, and create the conventions every subsequent phase will follow.

**Key tasks:** Create `.env.example`, run baseline lint and build, document folder structure convention, decide API client approach, decide token storage strategy, identify form/test libraries to install in Phase 1, record backend API contracts dependency checklist.

**Acceptance criteria:** `.env.example` committed with placeholder values; folder structure convention recorded; baseline lint and build clean or pre-existing issues catalogued; no secrets committed.

**Status:** `IN_PROGRESS`

### Phase 1 — Application Architecture and Design System

**Objectives:** Install agreed tooling, replace default bootstrap styles with Nexus design tokens, build the reusable UI component library.

**Key tasks:** Install form validation and test framework; replace `globals.css` with Nexus `@theme` tokens (Tailwind CSS v4); build Button, Input, Textarea, Select, Checkbox, Radio, Badge, Avatar, Card, Modal, Tooltip, Spinner, Skeleton, EmptyState, ErrorMessage, Alert, ConfirmDialog, Tabs, Breadcrumb; create `types/ui.ts` and `types/api.ts`; write component tests.

**Acceptance criteria:** Nexus design tokens active; all listed components implemented, tested, and accessible; `npm run lint`, `npm run build`, `npm test` pass.

**Status:** `NOT_STARTED`

### Phase 2 — Routing, Public Pages, and Application Shell

**Objectives:** Establish the full App Router route tree; build the application shell (TopNav, Sidebar, WorkspaceSwitcher, MobileNav); create public page shells (landing, login, register, forgot-password).

**Key tasks:** Define full route hierarchy with placeholder pages; create `app/(public)/layout.tsx` and `app/(auth)/layout.tsx`; build shell components; implement `not-found.tsx`, `error.tsx`, `loading.tsx`; create `lib/routes.ts` typed route constants.

**Acceptance criteria:** All routes accessible without 404; authenticated layout renders sidebar and nav; responsive at mobile/tablet/desktop; lint and build pass.

**Status:** `NOT_STARTED`

### Phase 3 — Authentication and User Profile

**Objectives:** Wire up real authentication: login, registration, logout, session restoration, protected route guards, expired-session handling, password recovery, user profile editing.

**Key tasks:** Create `lib/api.ts` typed fetch wrapper; create `services/auth.ts`; implement `providers/AuthProvider.tsx` and `hooks/useAuth.ts`; wire login, register, forgot-password, reset-password pages; apply route protection to `app/(auth)/layout.tsx`; implement profile page.

**BLOCKED until:** Backend authentication contract confirmed (endpoints, token/cookie strategy, error shapes, refresh mechanism).

**Acceptance criteria:** Users can register, log in, log out against live backend; protected routes inaccessible to unauthenticated users; session persists across reload; no tokens logged or exposed.

**Status:** `NOT_STARTED`

### Phase 4 — Workspaces, Teams, Members, and Roles

**Objectives:** Build workspace management, team management, member/invitation flows, and role-sensitive UI.

**Key tasks:** `services/workspaces.ts`, `services/teams.ts`, `services/members.ts`; `providers/WorkspaceProvider.tsx`; `hooks/useWorkspace.ts`, `hooks/usePermissions.ts`; workspace overview and settings pages; member list with invite, role-change, and remove; invitation acceptance page; wire `WorkspaceSwitcher`.

**Acceptance criteria:** Workspace switcher loads real data; owner-only actions hidden from lower roles; invitations can be sent and accepted; empty states render correctly.

**Status:** `NOT_STARTED`

### Phase 5 — Projects and Project Management

**Objectives:** Build project listing, creation, editing, archiving, deletion, and member management within workspaces.

**Key tasks:** `services/projects.ts`; projects list page with search/filter/sort/pagination; project creation modal; project overview page; project settings page; project member management; progress bar using backend-provided data.

**Acceptance criteria:** Projects are listed, searchable, filterable, sortable; role-gated controls work; progress comes from backend; empty states present.

**Status:** `NOT_STARTED`

### Phase 6 — Tasks and Kanban Boards

**Objectives:** Full task management: list view, Kanban board, task detail, comments, attachments, activity history, drag-and-drop.

**Key tasks:** `services/tasks.ts`; task list page with filters/sort/pagination; Kanban board with drag-and-drop respecting status transition rules; task creation modal; task detail panel with comments, activity, attachments; progress indicators.

**BLOCKED until:** Backend status transition matrix confirmed.

**Acceptance criteria:** Status transitions follow confirmed backend rules; drag-and-drop rolls back on failure; comments and attachments work; Kanban is keyboard-accessible.

**Status:** `NOT_STARTED`

### Phase 7 — Documents and Collaborative Workspace Content

**Objectives:** Document listing, creation, editing with save-state handling, unsaved-change warnings, and access controls.

**Key tasks:** `services/documents.ts`; document list page; document editor with save/saving/saved/error indicator; unsaved-change navigation guard; read-only mode for non-editors; do not claim real-time collaboration unless backend service confirmed.

**BLOCKED until:** Backend document content format confirmed; editor library selected.

**Acceptance criteria:** Documents save correctly; unsaved-change warning works; access control enforced; no fake real-time collaboration.

**Status:** `NOT_STARTED`

### Phase 8 — Messaging and Work-Connected Communication

**Objectives:** Conversation list, message threads, @mentions, file sharing, message-to-task conversion. REST-based only — real-time delivery added in Phase 9.

**Key tasks:** `services/messages.ts`; conversation list; message thread with pagination; composer with @mention autocomplete; file attachment upload; message-to-task conversion.

**Acceptance criteria:** Messages sent/edited/deleted per role; file attachments work; @mention autocomplete filters members; unread counts visible.

**Status:** `NOT_STARTED`

### Phase 9 — Real-Time Updates and Notifications

**Objectives:** Add the Socket.IO layer: connection management, task/message live updates, typing indicators, online presence, and the notification system.

**Key tasks:** Install `socket.io-client`; create `lib/socket.ts` singleton; `providers/SocketProvider.tsx`; subscribe to task, message, and notification events; clean up listeners on unmount; build notification inbox page and TopNav bell.

**BLOCKED until:** All Socket.IO event contracts confirmed with backend (URL, auth method, event names, payload shapes, room conventions).

**Acceptance criteria:** Socket connects, authenticates, reconnects automatically; task and message updates delivered in real time; no duplicate listeners; notification inbox accurate.

**Status:** `NOT_STARTED`

### Phase 10 — Meetings and AI-Assisted Features

**Objectives:** Meeting scheduling/call UI, AI assistant panel, streaming responses, AI task plan review, unavailability states.

**Key tasks:** `services/meetings.ts`, `services/ai.ts`; meeting scheduling and active call pages; AI assistant panel with streaming; suggestion review before applying; calling SDK integration.

**BLOCKED until:** (1) Calling SDK/provider selected; (2) AI backend endpoint contracts confirmed.

**Acceptance criteria:** AI output clearly labelled as suggestion; no AI provider keys in browser bundle; task plans require user approval before creating records.

**Status:** `NOT_STARTED`

### Phase 11 — Search, Activity, Dashboards, and Cross-Feature Integration

**Objectives:** Unified search, workspace and project activity feeds, real dashboard with backend analytics, cross-feature navigation verification, global state consistency.

**Key tasks:** `services/search.ts`, `services/activity.ts`, `services/analytics.ts`; full search page with entity-type filtering; command palette (`Cmd+K`); activity feeds wired to real data; dashboard with analytics widgets; cross-feature navigation audit.

**Acceptance criteria:** Search covers all entity types; command palette keyboard-accessible; dashboard shows backend-provided metrics only; cross-feature navigation correct; no stale data inconsistencies.

**Status:** `NOT_STARTED`

### Phase 12 — UI Polish, Accessibility, and Responsive Validation

**Objectives:** Systematic audit of visual consistency, accessibility (WCAG 2.1 AA), and responsive behavior across all pages.

**Key tasks:** Responsive tests at 320px, 375px, 768px, 1024px, 1440px; `axe-core` accessibility audit; fix all AA violations; verify focus indicators, color contrast, semantic headings, reduced-motion; confirm `ConfirmDialog` used everywhere (no `window.alert()`).

**Acceptance criteria:** All pages pass axe AA checks; all viewports render correctly; all empty/error states present; lint and build pass.

**Status:** `NOT_STARTED`

### Phase 13 — Testing, Security, and Reliability

**Objectives:** Comprehensive test coverage, security review, and reliability verification.

**Key tasks:** Unit tests for all services and hooks; component tests for all critical interactions; socket event tests; critical user journey tests; security checklist (no secrets in bundle, no unsafe HTML, tokens not logged); reliability checks (socket reconnection, optimistic rollback, expired session, file upload failure).

**Acceptance criteria:** `npm run lint`, TypeScript check, `npm test`, `npm run build` all pass with zero errors; security checklist complete; no secrets in bundle.

**Status:** `NOT_STARTED`

### Phase 14 — Production Configuration and Deployment

**Objectives:** Validate environment configuration, verify production build against staging backend, document deployment.

**Key tasks:** Confirm production environment variables; run production build; spot-check bundle for secrets; smoke test against staging (login, task, message, real-time notification); create `DEPLOYMENT.md`.

**Do not deploy to production without explicit authorization from the project owner.**

**Acceptance criteria:** Production build clean; smoke test passes; `DEPLOYMENT.md` complete; no secrets committed.

**Status:** `NOT_STARTED`

### Phase 15 — Final Acceptance and Handover

**Objectives:** Verify all phase acceptance criteria, execute critical user journeys end-to-end, produce final handover documentation.

**Key tasks:** Re-read and verify each phase's acceptance criteria; execute all critical user journeys; update `PHASES.md` statuses; update `README.md`; write final implementation summary.

**Acceptance criteria:** Every journey completes against staging; every phase marked COMPLETED or outstanding items documented; `README.md` accurate; no secrets in repository.

**Status:** `NOT_STARTED`

## 6. State Management Standards

Choose the simplest state-management approach that fits the actual requirements.

- Use React state for local component state.
- Use URL search parameters for shareable filters, pagination, and navigation state where appropriate.
- Use a server-state solution only if the existing architecture requires one.
- Avoid introducing a global store for every piece of state.
- Keep authentication state consistent with the agreed session architecture.
- Keep transient UI state separate from persisted backend data.
- Avoid duplicating server state across independent stores.
- Use optimistic updates selectively and implement rollback or reconciliation.
- Prevent stale requests from overwriting newer results.

### Browser storage

Use `localStorage` and `sessionStorage` only for appropriate non-sensitive client-side data, such as UI preferences or temporary form progress.

Do not treat browser storage as the authoritative source of authentication, authorization, permissions, or permanent project data.

## 7. API and Real-Time Integration Standards

### REST API

- Follow the backend's documented endpoints, HTTP methods, payloads, and response schemas.
- Keep request construction in reusable service modules.
- Normalize error responses consistently.
- Handle validation errors at the relevant form fields.
- Handle `401` and `403` responses according to the authentication and authorization design.
- Do not automatically retry non-idempotent mutations without a safe retry strategy.
- Use pagination and filtering when supported rather than downloading unlimited datasets.

### Socket.IO and WebSockets

- Use the backend's actual event names and payload definitions.
- Authenticate connections using the approved backend mechanism.
- Handle connection failures, reconnects, and expired authentication.
- Clean up listeners and subscriptions.
- Reconcile incoming events with the current UI and server state.
- Never treat frontend room selection as proof of authorization.
- Do not create duplicate socket connections for individual components when a shared connection is appropriate.
- Keep real-time behavior separate from ordinary REST data fetching while allowing the two to work together.

## 8. Accessibility and Responsive Design

Every significant feature should be usable by people with different devices and accessibility needs.

- Use semantic HTML elements.
- Associate labels and descriptions with form fields.
- Provide accessible validation and error messages.
- Ensure interactive elements are keyboard-accessible.
- Provide visible focus indicators.
- Use appropriate ARIA attributes only where necessary.
- Ensure dialogs manage focus correctly.
- Respect reduced-motion preferences.
- Test layouts at narrow and wide viewport sizes.
- Avoid relying on hover alone to expose essential controls.
- Maintain readable contrast and usable touch targets.

## 9. Testing and Verification Workflow

For every implementation task, follow this sequence:

1. **Inspect:** Review relevant code, types, routes, dependencies, and API contracts.
2. **Plan:** Identify the smallest safe implementation that satisfies the requirements.
3. **Implement:** Follow the existing architecture and reuse components.
4. **Validate:** Run the relevant lint, type-check, test, and build commands available in the repository.
5. **Exercise:** Verify the affected user journey and relevant error states.
6. **Review:** Inspect the diff for regressions, accidental deletions, exposed secrets, duplicated logic, and accessibility issues.
7. **Report:** Summarize changes, verification results, and remaining blockers.

Use the scripts defined by the repository. Do not invent script names or claim a command passed without running it.

### Minimum verification for a feature

- The intended page or component renders.
- Valid input follows the intended path.
- Invalid input produces understandable feedback.
- Loading and failure states work.
- Backend integration follows the actual API contract.
- TypeScript and lint checks pass where configured.
- Relevant tests pass.
- Existing related functionality remains intact.

## 10. Code Quality and Maintainability

- Use clear, descriptive component and variable names.
- Prefer small components with focused responsibilities.
- Keep business logic out of large presentation components.
- Extract reusable hooks and utilities when repetition justifies them.
- Avoid unnecessary abstraction and premature optimization.
- Keep files organized by feature and responsibility.
- Use consistent error-handling patterns.
- Remove temporary debugging statements before completing a task.
- Do not suppress TypeScript or lint errors merely to make checks pass.
- Document non-obvious architectural decisions.
- Keep dependencies justified and maintained.
- Follow existing conventions unless there is a documented reason to improve them.

## 11. Working with Backend Dependencies

The Nexus frontend and backend are maintained in separate repositories.

The frontend agent must not assume that a frontend change automatically changes the backend.

When a feature requires backend work:

1. Identify the missing endpoint, event, response field, permission, or service.
2. Document the expected request and response contract.
3. Check the backend repository's documentation or provided API specifications when available.
4. Keep the frontend integration aligned with the confirmed contract.
5. Report any backend dependency that remains incomplete.
6. Never hide a missing integration behind a fake success response.

The frontend must not connect directly to PostgreSQL or Redis. All application data access must use the authorized backend or explicitly approved service interfaces.

## 12. Completion Reporting

At the end of each task, report:

### Implemented
Describe the files, components, routes, and behaviors changed.

### Verification
List the commands actually run and their results.

### Integration
State which backend endpoints or real-time events were used and whether they were verified.

### Remaining work
List missing dependencies, unresolved failures, and external configuration still required.

### Phase status
Classify the phase as one of:

- **Complete:** All required acceptance criteria are verified.
- **In progress:** Some criteria are implemented but remain unverified or incomplete.
- **Blocked:** Progress depends on an unresolved external or architectural dependency.

Do not claim a phase is complete while required criteria remain unmet.

## 13. Final Development Principles

Every Nexus frontend implementation must follow these principles:

1. Preserve working code and existing user decisions.
2. Use Next.js App Router and TypeScript consistently.
3. Maintain a professional, cohesive, responsive interface.
4. Use real backend integrations instead of production-facing mock behavior.
5. Follow documented authentication, authorization, and API contracts.
6. Keep sensitive data and credentials out of unsafe browser storage.
7. Connect communication to the workspace, project, task, or team context.
8. Treat accessibility, error handling, testing, and security as part of implementation, not optional finishing work.
9. Follow `PHASES.md` and complete acceptance criteria before advancing.
10. Verify all significant changes and report limitations honestly.

**Primary objective:** Deliver a maintainable, secure, accessible, and polished Nexus frontend in which project management, documents, messaging, notifications, meetings, and AI-assisted productivity work together as one connected platform.

## 14. Specialized Skill References

For detailed standards in specific technical areas, consult the companion skills in `.opencode/skills/`:

- `nexus-ui-design` — Design system, Tailwind v4 tokens, component library, accessibility, responsive design.
- `nexus-api-integration` — REST API client, typed requests, service modules, error handling, backend contract verification.
- `nexus-authentication` — Login, registration, session handling, route protection, role-based permissions.
- `nexus-realtime` — Socket.IO client, live task and message updates, typing indicators, notification system.
- `nexus-testing-deployment` — Testing strategy, quality checks, environment configuration, deployment.

And reference documents in `references/` (within this skill directory):

- `references/architecture.md` — Folder structure, App Router conventions, path alias, module responsibilities.
- `references/design-system.md` — Color tokens, typography, Tailwind v4 theme config, component token summary.
- `references/api-integration.md` — API client pattern, service module examples, error handling, pagination.
- `references/authentication.md` — Auth flows, session, route protection patterns, role model, permissions.
- `references/realtime.md` — Socket.IO setup, event contracts, notification types, listener lifecycle.
- `references/testing-deployment.md` — Test scripts, test priorities by phase, environment files, deployment commands.
