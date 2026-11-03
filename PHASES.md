# NEXUS FRONTEND — IMPLEMENTATION PHASES

## 1. Purpose

This document defines the phased implementation roadmap for the Nexus frontend.

Nexus is a Real-Time Workspace & Project Management Platform that combines project management, team collaboration, communication, document management, meetings, scheduling, automation, and AI-powered productivity.

The frontend must provide a consistent, responsive, accessible, and intuitive experience across three workspace types:

1. Individual
2. Company
3. Institution

All three workspace types share the same core application architecture. Their available features, navigation, permissions, and experiences are determined by the active workspace type, subscription plan, user role, and permissions.

The frontend must integrate with the existing Nexus backend rather than independently implementing backend business logic.

## 2. Core Frontend Technology

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

Last verified: 2026-11-03, on branch `feature/frontend-authentication`.

| Phase | Title | Status |
|---|---|---|
| 0 | Frontend Repository Audit and Project Foundation | Completed |
| 1 | Design System, Branding, and UI Foundation | Completed |
| 2 | Application Layout and Navigation Architecture | Completed |
| 3 | Public Website and Authentication Interfaces | In Progress |
| 4 | User Onboarding and Profile Management | Not Started |
| 5 | Workspace Creation and Workspace Switching | Not Started |
| 6 | Organisation Membership, Join Requests, and Invitations | Not Started |
| 7 | Roles, Permissions, and Access-Controlled UI | Not Started |
| 8 | Departments, Teams, and Groups | Not Started |
| 9 | Projects and Project Visibility | Not Started |
| 10 | Tasks and Work Management | Not Started |
| 11 | Real-Time Messaging and Conversations | Not Started |
| 12 | Notification Centre and Activity Feed | Not Started |
| 13 | File Management and Nexus Drive | Not Started |
| 14 | Document Collaboration | Not Started |
| 15 | Calendar and Scheduling | Not Started |
| 16 | Meetings and Calling | Not Started |
| 17 | Forms and Surveys | Not Started |
| 18 | Subscription, Billing, and Plan Management | Not Started |
| 19 | Global Search and Full Document Search | Not Started |
| 20 | Integrations Management | Not Started |
| 21 | Automation and Workflow Builder | Not Started |
| 22 | Nexus AI Assistant | Not Started |
| 23 | Nexus Write | Not Started |
| 24 | AI Action Approval and Execution Interfaces | Not Started |
| 25 | Real-Time State, Presence, and Cross-Application Synchronisation | Not Started |
| 26 | User Settings and Preferences | Not Started |
| 27 | Reporting, Insights, and Analytics | Not Started |
| 28 | Global UX, Accessibility, and Responsive Refinement | Not Started |
| 29 | Frontend Security and Privacy Review | Not Started |
| 30 | Frontend Testing and Quality Assurance | Not Started |
| 31 | Performance and Production Optimisation | Not Started |
| 32 | Deployment and Production Configuration | Not Started |
| 33 | Final Frontend Review and Release Readiness | Not Started |

Status meanings: **Not Started**, **In Progress**, **Blocked**, **Completed**. A phase is only marked **Completed** when its functional requirements, integrations, and validation requirements have been verified.

Phases 0, 1, and 2 are complete. Phase 3 is in progress on `feature/frontend-authentication`; the backend auth contract has been confirmed and connected through a same-origin Next.js proxy. Pro and Business base and additional-member prices are approved and displayed. Terms and Privacy drafts are prepared but require legal review and approval. Phase completion still depends on approval of included seats, billable membership statuses and remaining subscription policies, a billing API/provider implementation, legal approval, live authentication verification, and responsive viewport review. OAuth remains deferred because no provider or backend contract is approved. Phase 4 remains Not Started.

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

| Area | Verified state |
|---|---|
| Framework | Next.js `16.4.2`, App Router, Turbopack build |
| Language | TypeScript `5.x`, `strict: true` |
| UI runtime | React and React DOM `19.3.0` |
| Styling | Tailwind CSS `4.x` via `@tailwindcss/turbopack`, CSS-first `@theme` tokens in `app/globals.css` |
| Validation | Zod `^4.6.7` installed, not yet used in application code |
| Tests | Vitest `4.1.12`, Testing Library, jsdom `29.1.1` |
| Linting | ESLint `9.x` with `eslint-config-next` core-web-vitals and TypeScript rules |
| Package manager | npm (`package-lock.json` is the active lockfile) |
| Path alias | `@/*` resolves to the repository root, not `src/` |

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

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm test` | Passed — 5 files, 46 tests |
| `npm run build` | Passed — static `/` and `/_not-found` routes generated |

#### Backend dependency checklist

The following contracts must be verified against the backend before dependent phases begin. Phase 0 only inspected the frontend repository; Phase 3 has now verified the auth contracts against the adjacent backend repository.

| Dependency | Needed by | Status |
|---|---|---|
| API base URL and versioning convention | Phase 3 | Confirmed: backend OpenAPI server is `/api/v1`; local upstream is `http://localhost:4000` |
| Authentication/session contract (cookie vs token, refresh, logout) | Phase 3 | Confirmed: short-lived bearer access token in response; rotating refresh token in HttpOnly cookie; CSRF cookie plus header; session logout endpoints |
| User and session response shapes | Phase 3 | Confirmed in OpenAPI and auth controller; workspace permission shapes remain unconfirmed for later phases |
| Workspace list, switching, and scoping contract | Phase 5 | Unconfirmed |
| Membership, join request, and invitation contracts | Phase 6 | Unconfirmed |
| Role and permission payloads for Company and Institution | Phase 7 | Unconfirmed |
| Project, task, and visibility contracts | Phase 9–10 | Unconfirmed |
| Pagination, filtering, and sorting | Phase 3 onward | Unconfirmed |
| Error envelope | Phase 3 | Confirmed: `{ success: false, error: { code, message, details?, requestId } }` |
| Socket.IO URL, auth method, event names, and payloads | Phase 11, 25 | Unconfirmed |
| File upload/download and signed URL contract | Phase 13 | Unconfirmed |
| AI request, streaming, and action-approval contract | Phase 22–24 | Unconfirmed |

#### Known limitations recorded during the audit

- `branding.md` specifies an indigo/charcoal palette and Inter, while `app/globals.css` implements a slate/blue palette and the layout uses Geist. No unilateral retheme was performed.
- `types/ui.ts` contains a legacy `UserRole` union (`OWNER | PM | MEMBER | VIEWER | COLLABORATOR`) that does not match the Company and Institution role model in `branding.md`.
- `README.md` and `AGENTS.md` are byte-identical.
- `npm run build` warns that an out-of-repository `pnpm-lock.yaml` is ignored; the project uses npm.
- The backend repository and its API documentation are not available in this repository.

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

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm test` | Passed — 8 files, 65 tests |
| `npm run build` | Passed — static `/` and `/_not-found` routes generated |

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

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npx tsc --noEmit` | Passed |
| `npm test` | Passed — 14 files, 118 tests |
| `npm run build` | Passed — static `/` and `/_not-found` routes generated |

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

| Requirement | Status | Verification or dependency |
|---|---|---|
| Public landing page, product overview, and feature sections | Implemented; build verified, visual behavior not fully verified | Responsive classes are present; viewport-by-viewport browser review remains outstanding |
| Pricing page and plan pricing | Implemented and automated UI test verified | Pro is $10/month or $50/year plus $0.50 per additional member/month; Business is $15/month or $70/year plus $1 per additional member/month. Additional-member charges are monthly on annual plans; included-seat allowances remain unconfirmed. |
| Registration and sign-in forms | Implemented and automated request, validation, success, and error tests pass | Live backend authentication remains unverified |
| Email verification and verification resend | Implemented and automated request tests pass | Live backend workflow remains unverified |
| Password recovery and password reset | Implemented and automated success/error/request tests pass | Live backend workflow remains unverified |
| Authentication validation and API error feedback | Implemented; covered cases are automated-test verified | Not every backend validation response has been exercised against a live server |
| Session restoration, expired-session refresh, unauthenticated redirect, and logout | Implemented and automated session-boundary tests pass | Live cookie/session behavior remains unverified |
| Network/server failure and retry feedback | Implemented and automated session error-state test passes | Live backend outage behavior remains unverified |
| Terms and Privacy routes, draft content, and links | Drafts rendered and automated page/link tests pass | Legal review and approval; bracketed entity, contact, jurisdiction, age, provider, and deployment details remain unresolved |
| Paid-plan display | Approved Pro/Business base and additional-member prices displayed with monthly/annual switching; checkout remains unavailable; automated pricing tests pass | Pro/Business included-seat allowances remain unconfirmed |
| Subscription API integration | Not implemented; no billing endpoints, provider configuration, or response contract found | Backend billing contract and implementation; no purchase or management flow can be connected yet |
| OAuth sign-in | Not implemented; no frontend OAuth controls were added | Approved providers and provider configuration, backend routes, callback/account-link contract, and session/security requirements |

#### Implemented

- Replaced the root placeholder with a responsive public landing page, product overview, feature sections, and workspace-type overview.
- Updated `/pricing` to display Pro ($10/month or $50/year) and Business ($15/month or $70/year), additional-member charges ($0.50 and $1 per member/month respectively), and that additional members remain monthly on annual plans. Pending invitations are not billed. Included seat allowances remain explicitly unconfirmed; checkout and trial enrollment remain unavailable. Pricing values and presentation policy are centralized in `lib/subscription-plans.ts`.
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

- Pro: $10/month and $50/year.
- Business: $15/month and $70/year.
- Pro additional member: $0.50/member/month.
- Business additional member: $1/member/month.
- Additional members are charged monthly even when the base plan is annual; pending invitations are not billed.

#### Outstanding decisions requiring product approval

These are proposals or unresolved policies. They are not approved billing rules, and the frontend does not calculate or enforce member charges.

##### A. Included-seat allowances

| Plan/rule | Proposed decision | Status |
|---|---|---|
| Pro included members | 15 seats | **Awaiting explicit approval** |
| Business included members | 25 seats | **Awaiting explicit approval** |
| Organization owner included in the allowance | Yes | **Awaiting explicit approval** |

No allowance is displayed as approved until confirmation is recorded.

##### B. Billable membership statuses and roles

| Membership/account state | Current product rule or proposal | Approval/status |
|---|---|---|
| Active member | An accepted, active member is the proposed billable population, after applying an approved included-seat allowance. | **Approval required:** confirm active membership is billable and clarify which roles count. |
| Pending invitation | Not billable before acceptance and activation. | Approved product rule; recorded above and in the pricing/legal copy. |
| Suspended member | Whether suspension stops or preserves a recurring seat charge is unresolved. | **Approval required.** |
| Removed member | Future recurring charges should stop under provider-supported cycle/proration rules. | Principle approved; effective timing, quantity update, and proration treatment require approval. |
| Deactivated account | Treatment of a deactivated user who still has a workspace membership is unresolved. | **Approval required.** |
| Organization owner | Must be counted once, even if also represented by a membership row. The proposal is that the owner uses one of the included seats. | Count-once principle approved; included-seat treatment **awaits approval**. |
| Administrators | Admins are distinct roles but may also be active members. Whether/how role affects billability is unresolved. | **Approval required; do not count or exclude based on an assumed role rule.** |

Backend enforcement, distinct-member counting, and duplicate-charge prevention are not implemented. Frontend state and client-supplied counts must not be used as billing authority.

##### C. Subscription changes and cancellation

| Policy | Decision required |
|---|---|
| Pro-to-Business upgrade | Effective date and billing/proration treatment. |
| Business-to-Pro downgrade | Effective date, billing treatment, and resulting access/limits. |
| Additional-seat increase | When the increased quantity is charged and whether a partial-cycle charge applies. |
| Additional-seat removal | When future charges stop and whether/how provider proration or credit applies. |
| Cancellation | Effective date and treatment of already-paid amounts. |
| Paid feature access after cancellation | Whether access continues to the end of the paid billing period. |
| Refunds | Eligibility, timing, and refund policy. No refund rule is assumed. |

All items in this table are **awaiting product/legal approval**. Do not invent proration, effective dates, feature-access periods, or refunds.

##### D. Failed payments

Approval is required for payment retry behavior; the grace period before restricting paid features; notices to workspace/account owners; subscription state after repeated failures; and how failed additional-seat charges affect seat billing and access. No retry count, grace-period length, or restriction schedule is assumed.

#### Legal approval still required

The Terms and Privacy drafts remain **DRAFT — REQUIRES LEGAL REVIEW AND APPROVAL**. Approval is not established by displaying or testing the draft pages.

- Legal entity name, registration details if applicable, and registered/business address are missing.
- Official Terms contact and privacy contact details are missing.
- Governing law, jurisdiction, venue, and dispute-resolution process have not been selected.
- Refund, cancellation, upgrade/downgrade, failed-payment, and seat-proration wording requires product/legal approval.
- Privacy wording on retention, deletion schedules, processors, hosting regions, transfers, minors/eligibility, and user rights requires legal and deployment review.
- Required bracketed placeholders remain in `docs/TERMS_OF_SERVICE_DRAFT.md` and `docs/PRIVACY_POLICY_DRAFT.md`.

#### Billing provider, API, and implementation status

- **Payment provider:** none selected or configured in the inspected backend.
- **Subscription endpoints/API contract:** none found in `../__NexusBackend__/docs/openapi.yaml` or the backend modules.
- **Payment verification/webhooks:** no payment verification or payment webhook exists. The backend has a signed transactional-email webhook; that is not a payment webhook.
- **Additional-seat billing:** not implemented. No authoritative active-seat calculation, provider quantity synchronization, duplicate-charge prevention, or backend enforcement exists. The database uniqueness constraint on `(workspaceId, userId)` prevents duplicate membership rows only; it does not implement billing.
- **Subscription lifecycle:** activation-after-verified-payment, changes, cancellation, retry/expiry, invoices, and billing history are not implemented or verified.
- Required contract and data safeguards are documented in `docs/SUBSCRIPTION_BILLING_BACKEND_REQUIREMENTS.md`. Checkout, subscription management, and paid feature entitlement changes remain unavailable; no simulated billing path exists.

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

#### Responsive viewport review still required

Responsive utility classes and a successful production build are not manual viewport verification. Review the following pages at mobile (**375×812**), tablet (**768×1024**), and desktop (**1440×900**) viewports; record visual and keyboard findings:

- Public landing page (`/`).
- Pricing and billing-period selector (`/pricing`).
- Sign-in, sign-up, email verification, password recovery, and password reset.
- Terms and Privacy drafts (`/terms`, `/privacy`).
- Authenticated session landing/error states (`/app`).

Check navigation/header fit, card and legal-text readability, forms and buttons, overflow, focus visibility, and loading/error layouts. **Not reviewed.**

#### Billing implementation dependency

The backend/provider findings and required contract categories are recorded in “Billing provider, API, and implementation status” above and `docs/SUBSCRIPTION_BILLING_BACKEND_REQUIREMENTS.md`. Checkout and subscription management remain unavailable until the decisions are approved and the backend contract and implementation exist.

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
- `npm test` — passed, 20 files and 144 tests, including Pro/Business base and additional-member pricing, monthly billing on annual plans, unresolved included seats, draft Terms/Privacy route rendering, cross-links, and unavailable checkout.
- Next.js reported that it ignored `/home/philip-iorwua/pnpm-lock.yaml` because the lockfile is outside this Git repository. The frontend Git/package root is `/home/philip-iorwua/Desktop/__NextFrontend__`, containing `package.json` and `package-lock.json` and no `pnpm-workspace.yaml`; the parent has no pnpm workspace file. The parent pnpm lockfile contains a separate `lucide-react`/React 19.2.8 importer, while this app declares React 19.3.0. This is an unrelated parent lockfile, so the warning is expected and does not indicate a misconfigured app root. No lockfile or workspace configuration was changed.
- Manual auth/subscription API workflows — not run. The frontend `.env.local` is absent and the backend health endpoint at `http://localhost:4000/api/v1/health/live` did not accept a connection during this verification; a backend `.env` file exists but its contents were not inspected. Subscription operations are absent from the backend contract. Automated frontend tests do not verify a live backend.
- Responsive code uses mobile-first layouts and breakpoint styles; viewport-by-viewport visual QA was not performed in this checkout.
- Current commercial/legal-draft verification: `npm test` — passed, 20 files and 144 tests; `npm run lint` — passed; `npx tsc --noEmit` — passed; `npm run build` — passed with the expected parent-lockfile warning above. These checks verify frontend presentation and draft rendering only; they do not verify live authentication or subscription behavior against a backend. Server-side seat-counting, duplicate-charge prevention, and payment-webhook tests remain dependent on the unimplemented billing backend.

#### Phase 3 closure checklist

Phase 3 must remain **In Progress** until these unconditional requirements are satisfied:

- Approved Terms of Service and Privacy Policy content is supplied and replaces the clearly marked placeholders.
- Approved Pro and Business base prices and additional-member rates are shown on `/pricing`; additional members remain monthly on annual plans. Included seat allowances for both paid plans remain outstanding and are not advertised.
- Terms and Privacy drafts are available, but legal review/approval and all required legal/business/deployment placeholders must be resolved.
- The backend publishes and implements the approved subscription API contract, and the frontend integration, unavailable/error handling, and subscription interaction tests are verified against it.
- Live authentication workflows are exercised against a configured backend, including registration, sign-in, email verification/resend, password recovery/reset, refresh/session restoration, expired-session handling, and logout.
- Responsive behavior is reviewed at mobile, tablet, and desktop viewport sizes; automated tests, lint, type-check, and production build pass.

##### Explicit commercial approval gate

Phase 3 cannot be marked **Complete** until you explicitly approve both:

1. Included-seat allowances: Pro 15, Business 25, and whether the organization owner is included (proposed: yes).
2. Billable membership statuses and role handling, including active, invited, suspended, removed, deactivated members, owners, and administrators.

These are proposals awaiting approval, not current billing behavior. No billing calculation may be based on them before approval and backend implementation.

Other outstanding approval and verification conditions are legal approval of the Terms and Privacy drafts, a subscription backend API/provider implementation, live authentication verification, and responsive viewport review. OAuth remains deferred until its provider and backend contract are approved. Phase 3 remains **In Progress**; Phase 4 remains **Not Started**.

OAuth is conditional in the Phase 3 roadmap (“if supported by the backend”). While the backend has no approved provider contract or OAuth routes, keep OAuth deferred and add no frontend controls. If product approval brings OAuth into this phase, the backend contract, provider setup, callback/account-link behavior, session handoff, security implementation, and frontend tests must all be completed before closure. If OAuth remains unsupported, record the explicit deferral as accepted scope before declaring Phase 3 complete.

No other independent Phase 3 frontend implementation task is currently identified after the session-boundary redirect and its regression coverage.

## Phase 4 — User Onboarding and Profile Management

### Status — Not Started

#### Approved account-deletion policy for future implementation

- Account deletion requires authentication and explicit confirmation, followed by a 30-day secure recovery period.
- After the recovery period, permanent deletion removes the personal workspace and exclusively owned data while preserving shared organization content and assets referenced by valid shared resources.
- If the user is the only eligible organization owner, ownership must be transferred or separately resolved. Organization deletion remains a distinct authorized action.
- This is a product-policy decision only; no Phase 4 account-deletion interface work is included in the current task.
- Backend alignment must be reviewed before the flow is exposed. The current cleanup worker can hold deletion for manual resolution when a personal workspace has collaborators or file metadata and blocks deletion while workspace ownership remains; its storage cleanup behavior is not equivalent to the complete approved policy.

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

## Phase 11 — Real-Time Messaging and Conversations

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

# 5. Future Enhancements — Not Part of Initial Implementation

The following features may be considered for future versions. They must not be implemented as part of the current roadmap unless explicitly approved.

- Native Android and iOS applications.
- Advanced collaborative whiteboards.
- Advanced knowledge base and wiki.
- Advanced document collaboration.
- Custom role and permission builder.
- Workflow and automation marketplace.
- Advanced AI agents.
- More third-party integrations.
- Advanced enterprise security dashboards.
- Advanced analytics and reporting.
- Additional workspace customisation.
- Advanced offline capabilities.

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

The frontend must remain aligned with the Nexus backend, product architecture, user roles, workspace types, subscription rules, and security requirements.

The objective is to build a reliable, polished, responsive, accessible, and production-ready Nexus frontend without breaking existing functionality.
