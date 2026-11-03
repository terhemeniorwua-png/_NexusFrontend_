---
name: nexus-frontend
description: Shared frontend development guide for OpenCode and Kiro agents working on the Nexus frontend — product understanding, branding, architecture, components, UI/UX, animation, feature guardrails, backend integration, security, performance, testing, phase management, and Git rules.
---

# Nexus Frontend Development Skill

> **Audience:** OpenCode and Kiro AI coding agents, and any human contributor working on the Nexus frontend.
>
> **Status:** Shared, tool-independent instruction document. It contains no agent-specific syntax, commands, configuration, or workflow features. Both agents must follow the same standards.
>
> **Repository snapshot:** Audited against the working tree on 3 November 2026. Verify the implementation before relying on any statement marked "planned" or "not implemented".

---

## 1. Purpose and Scope

### 1.1 Purpose

This file is the shared frontend development guide for **Nexus**, a Real-Time Workspace & Project Management Platform. It explains how to:

- Understand the Nexus product and its three workspace types.
- Apply the Nexus brand and design system correctly.
- Work within the verified Next.js/TypeScript architecture.
- Build consistent, accessible, responsive, and performant interfaces.
- Integrate safely with the existing Express/TypeScript backend.
- Respect authentication, authorisation, privacy, and workspace isolation.
- Follow the phase roadmap and finish work to a verifiable standard.

### 1.2 How OpenCode and Kiro agents must use it

1. Read the root instruction file and this skill before changing code.
2. Treat this file as the shared standard, not as a menu of optional suggestions.
3. Inspect the actual repository before assuming a file, component, route, API contract, or dependency exists.
4. Keep every change inside the assigned task and phase.
5. Report what was actually implemented and verified. Never infer success.

If a tool-specific skill copy disagrees with this file or with the root documentation, the root documentation and the actual repository take precedence. Do not maintain divergent standards for different agents.

### 1.3 Scope boundaries

In scope:

- The Nexus frontend repository only.
- UI, client-side interaction, routing, presentation logic, API consumption, real-time consumption, accessibility, and frontend tests.
- Frontend documentation updates explicitly required by the task.

Out of scope unless explicitly instructed:

- Backend implementation or contract changes.
- Database or Redis access from the frontend.
- AI service implementation.
- Dependency installation.
- Production deployment.
- Feature work outside the assigned phase.
- Rebranding or redesign of unrelated screens.

### 1.4 Instruction precedence

When instructions conflict, use this order:

1. Explicit instructions for the current task.
2. Approved product requirements and the current phase in `PHASES.md`.
3. `branding.md` for brand and product behaviour.
4. Root `AGENTS.md` / `README.md` for engineering and agent rules.
5. This skill for implementation standards.
6. Existing implementation patterns.

Do not silently resolve a conflict that could change product behaviour, security, or data handling. Document it and ask for a decision.

---

## 2. Mandatory Documentation and Pre-Implementation Checklist

### 2.1 Canonical documents

| Document | Exact path | Purpose |
|---|---|---|
| Agent instructions | `AGENTS.md` | Primary rules for AI agents and contributors |
| Project documentation | `README.md` | Project overview and agent instructions (currently identical to `AGENTS.md`) |
| Implementation roadmap | `PHASES.md` | Authoritative phase plan, tasks, and deliverables |
| Brand and product specification | `branding.md` | Brand identity, product behaviour, scope, and design direction |
| Shared frontend skill | `nexus-frontend/SKILL.md` | This document |

**Path notes:**

- There is no lowercase `agent.md` or `phases.md` at the repository root. The canonical files are `AGENTS.md` and `PHASES.md`.
- `README.md` and `AGENTS.md` currently contain identical content. Read both only if a task changes one of them.
- `branding.md` is currently untracked in Git. Do not delete, move, or overwrite it.
- Specialised agent skill folders may contain derivative copies. Treat them as secondary references, not as replacements for the root documents or this file.

### 2.2 Required checklist before implementation

1. Read `AGENTS.md`, `README.md`, `PHASES.md`, and `branding.md`.
2. Read this entire file.
3. Confirm the active phase and its acceptance criteria in `PHASES.md`.
4. Inspect `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, and `app/globals.css`.
5. Inspect the relevant routes, components, types, providers, services, hooks, and tests.
6. Run `git status` and `git branch --show-current`; identify pre-existing uncommitted work.
7. Confirm which libraries are actually installed; do not assume from documentation.
8. Confirm backend contracts from existing frontend code or backend documentation; do not invent them.
9. Identify loading, empty, success, error, permission, and responsive states.
10. Produce a short implementation plan before making substantial changes.

Do not begin by creating folders or files "for later". Create only what the task needs.

---

## 3. Nexus Product Understanding

### 3.1 What Nexus is

Nexus is a general-purpose **Real-Time Workspace & Project Management Platform**. It brings together:

- Project and task management.
- Team collaboration.
- Real-time messaging.
- Documents and file management.
- Calendars and meetings.
- Forms and surveys.
- Integrations and automation.
- AI-assisted productivity, including Nexus Write.

Nexus is **not** a developer-only tool. It serves individuals, companies, educational institutions, teams, and professional communities.

Do not describe or design Nexus as a coding platform, issue tracker, or developer console. Its identity is connection, productivity, intelligence, collaboration, organisation, reliability, efficiency, and professionalism.

### 3.2 Workspace types

Nexus has three workspace types built on one shared application architecture:

1. **Individual** — personal productivity: tasks, projects, calendar, documents, messages, meetings, Drive, forms, integrations, AI, settings.
2. **Company** — organisational collaboration: departments, teams, projects, tasks, communication, administration, billing, audit logs.
3. **Institution** — academic and institutional collaboration: departments, groups, research and academic projects, staff and student collaboration, administration.

Workspace type, subscription plan, role, and permissions determine navigation and available features. Do not build three separate frontends.

**Institution scope guardrail:** Nexus is not a Learning Management System in the initial release. Do not introduce course enrolment, examinations, grading, attendance registers, or student-result management without separate product approval.

### 3.3 One identity, many workspaces

A user has one Nexus identity and may belong to:

- A personal workspace.
- One or more company workspaces.
- One or more institution workspaces.
- Additional collaborative workspaces.

A user may hold different roles in different workspaces. Never assume one workspace, one role, or one permission set.

Membership in an organisation must never expose the user's personal workspace. Switching workspaces must switch all workspace-scoped data and navigation without requiring another login.

### 3.4 Capability map and implementation status

This table is orientation only. **Always confirm the active phase and real status in `PHASES.md` and the codebase before working on a capability.**

| Capability | Frontend phase | Verified frontend status |
|---|---|---|
| Repository audit and foundation | Phase 0 | Completed and verified; see Section 14 |
| Design system and UI primitives | Phase 1 | Completed: brand tokens, themes, and `components/ui/*` |
| Application shell and navigation | Phase 2 | Not implemented (only the root layout exists) |
| Public pages and authentication UI | Phase 3 | Not implemented |
| Onboarding and profile | Phase 4 | Not implemented |
| Workspace creation and switching | Phase 5 | Not implemented |
| Membership, join requests, invitations | Phase 6 | Not implemented |
| Roles, permissions, access-controlled UI | Phase 7 | Not implemented |
| Departments, teams, groups | Phase 8 | Not implemented |
| Projects and project visibility | Phase 9 | Not implemented |
| Tasks and work management | Phase 10 | Not implemented |
| Real-time messaging | Phase 11 | Not implemented |
| Notifications and activity feed | Phase 12 | Not implemented |
| Nexus Drive and file management | Phase 13 | Not implemented |
| Document collaboration | Phase 14 | Not implemented |
| Calendar and scheduling | Phase 15 | Not implemented |
| Meetings and calling | Phase 16 | Not implemented |
| Forms and surveys | Phase 17 | Not implemented |
| Subscription and billing | Phase 18 | Not implemented |
| Global and document search | Phase 19 | Not implemented |
| Integrations | Phase 20 | Not implemented |
| Automation | Phase 21 | Not implemented |
| AI assistant | Phase 22 | Not implemented |
| Nexus Write | Phase 23 | Not implemented |
| AI action approval | Phase 24 | Not implemented |
| Real-time state and presence | Phase 25 | Not implemented |
| User settings and preferences | Phase 26 | Not implemented |
| Reporting and analytics | Phase 27 | Not implemented |
| UX, accessibility, responsive refinement | Phase 28 | Not implemented |
| Security and privacy review | Phase 29 | Not implemented |
| Testing and QA | Phase 30 | Not implemented |
| Performance and production optimisation | Phase 31 | Not implemented |
| Deployment and production configuration | Phase 32 | Not implemented |
| Final review and release readiness | Phase 33 | Not implemented |

The current repository contains only the root layout, a placeholder home page, design tokens, and the Phase 1 UI component library. Do not imply that navigation, authentication, API integration, real-time features, or product screens exist.

---

## 4. Verified Frontend Technology and Architecture

### 4.1 Installed stack

Verified from `package.json`, configuration files, and source code:

| Area | Technology | Version / configuration |
|---|---|---|
| Framework | Next.js | `16.4.2`, App Router |
| UI runtime | React / React DOM | `19.3.0` |
| Language | TypeScript | `5.x`, `strict: true` |
| Styling | Tailwind CSS | `4.x`, CSS-first `@theme` configuration |
| Tailwind integration | `@tailwindcss/turbopack` | `^4` |
| Validation | Zod | `^4.6.7` installed, not yet used in source |
| Tests | Vitest | `4.1.12` |
| Test utilities | Testing Library (DOM, React, jest-dom, user-event) | Installed |
| Test environment | jsdom | `29.1.1` |
| Linting | ESLint | `9.x` + `eslint-config-next` core-web-vitals and TypeScript |
| Fonts | `next/font/google` | Inter as the primary font (`--font-inter`); system monospace stack for code |

**Not installed:** `socket.io-client`, a state-management library, a data-fetching/caching library, a form library, an animation library, an icon library, an end-to-end test framework, and a component styling utility such as `clsx`/`tailwind-merge`.

Do not install any of these without explicit approval. If an approved feature requires one, verify the need, propose the package, and record the decision.

### 4.2 Verified repository structure

```text
__NextFrontend__/
├── app/
│   ├── globals.css          # Brand tokens, dark/system overrides, motion, focus
│   ├── layout.tsx           # Root layout, metadata, Inter, pre-paint theme script
│   └── page.tsx             # Placeholder Nexus home page
├── components/
│   ├── layout/
│   │   ├── PageContainer.tsx  # Consistent page width, padding, centring
│   │   ├── PageHeader.tsx     # Title, description, breadcrumb, actions
│   │   └── __tests__/
│   └── ui/
│       ├── Alert.tsx        Avatar.tsx       Badge.tsx       Breadcrumb.tsx
│       ├── Button.tsx       Card.tsx         Checkbox.tsx    ConfirmDialog.tsx
│       ├── Dropdown.tsx     EmptyState.tsx   Input.tsx       Modal.tsx
│       ├── Radio.tsx        Select.tsx       Skeleton.tsx    Spinner.tsx
│       ├── Tabs.tsx         Textarea.tsx     ThemeToggle.tsx Tooltip.tsx
│       └── __tests__/       # Primitive, Dropdown, and ThemeToggle tests
├── providers/
│   ├── ThemeProvider.tsx    # light/dark/system preference and DOM application
│   └── __tests__/
├── types/
│   ├── api.ts               # Generic API types; client not implemented yet
│   ├── ui.ts                # Shared UI prop, size, status, and role types
│   └── jest-dom.d.ts
├── public/
├── AGENTS.md
├── README.md
├── PHASES.md
├── branding.md
├── nexus-frontend/SKILL.md  # This file
├── .env.example             # Public placeholder configuration only
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
├── vitest.config.mts        # jsdom, setup file, @ alias, test discovery
├── vitest.setup.ts
└── package-lock.json
```

**Important current-state facts:**

- Routes live in `app/` at the repository root. There is **no `src/` directory**.
- `features/`, `hooks/`, `lib/`, and `services/` **do not exist yet**. They are the intended structure for later phases (Section 4.4).
- `providers/ThemeProvider.tsx` and `components/layout/` now exist and are the shared home for theme state and page layout.
- No `.env` or `.env.local` file exists in the working tree. `.env.example` documents public placeholders only; it is not a source of confirmed backend configuration.
- No API client, authentication provider, service module, real-time client, or global data-state provider exists.
- Light, dark, and system themes are implemented through CSS variables and `ThemeProvider`. There is no separate theme stylesheet per component.

### 4.3 Path alias

`@/*` resolves to the repository root, not `src/`.

```ts
import { Button } from '@/components/ui/Button';
import type { ApiError } from '@/types/api';
```

Use the alias for cross-directory imports. Use relative imports only for siblings, for example `./Button` inside `components/ui`.

### 4.4 Intended structure for later phases

The following structure is documented in existing project references and phase plans. Treat it as a **convention to follow when a phase reaches that work**, not as existing code:

```text
app/
  (public)/          # landing, login, register, password recovery, invitation acceptance
  (auth)/            # authenticated routes: dashboard, workspace, profile, notifications
components/
  ui/                # reusable primitives (exists)
  layout/            # PageContainer and PageHeader exist; TopNav, Sidebar,
                     # WorkspaceSwitcher, MobileNav arrive in Phase 2
  shared/            # cross-feature components
features/            # domain UI and feature logic
hooks/               # useAuth, useWorkspace, usePermissions, useSocket
lib/                 # api.ts, routes.ts, socket.ts, utilities
providers/           # ThemeProvider exists; Auth, Workspace, Socket arrive later
services/            # typed API functions by domain
types/               # shared and domain types (api.ts, ui.ts exist)
```

Do not move existing files to match this structure. Add new folders only when the active phase requires them.

### 4.5 Next.js App Router conventions

- Use Server Components by default.
- Add `'use client'` only when a component needs state, effects, event handlers, refs, or browser APIs.
- Keep client boundaries small. Do not mark a whole route tree as client-side.
- Do not access `window`, `document`, or browser storage during server rendering.
- Use Next.js navigation utilities (`Link`, `useRouter`, `redirect`) rather than manipulating browser history.
- Add `loading.tsx`, `error.tsx`, and `not-found.tsx` at the appropriate route level when building routes.
- Use route groups `(public)` and `(auth)` when implementing Phase 2/3, following the planned structure.
- Use the metadata API in layouts/pages; do not hand-write `<head>` tags.
- Keep server-only configuration on the server. Only `NEXT_PUBLIC_*` values may reach the browser, and only for genuinely public configuration.

Current `next.config.ts` enables `cacheComponents` and `partialPrefetching` and configures the Tailwind Turbopack CSS loader. Do not disable or replace these settings without approval.

### 4.6 Current state management and data fetching

- No global state library is installed.
- No data-fetching/caching library is installed.
- Current code uses local component state (`useState`, `useId`, `useRef`), React Context for theme, and `useSyncExternalStore` for external preference subscriptions.
- Until an approved architecture exists, keep state local and lift it only when shared.
- Use React Context only for genuinely application-wide concerns such as theme now, and the future auth, workspace, or socket providers.
- Do not introduce Redux, Zustand, Jotai, React Query, SWR, or similar without explicit approval.

### 4.7 Forms and validation

- React Hook Form is not installed.
- Zod is installed but not yet used.
- Use native form elements and the existing `Input`, `Textarea`, `Select`, `Checkbox`, and `RadioGroup` components.
- When validation is required, use Zod schemas and derive types from them where practical.
- Validate before submission for usability, but treat backend validation as authoritative.
- Preserve user input after a failed request.
- Disable or guard submission while a request is in flight.
- Do not add another validation or form library without approval.

### 4.8 Animations

- No animation library is installed.
- Shared motion tokens live in `app/globals.css`: `--duration-fast`, `--duration-base`, `--duration-slow`, and `--ease-standard`.
- Shared keyframes `nx-fade-in`, `nx-pop-in`, and `nx-dialog-in` are used by `Modal` and `Dropdown`.
- Use CSS transitions and Tailwind utilities (`transition-colors`, `duration-150`, `animate-pulse`, `animate-spin`) for everything else.
- Do not add Framer Motion or another animation package without approval.
- See Section 8 for detailed rules.

### 4.9 Theme support

Light, dark, and system themes are implemented as required by `branding.md`:

- `app/globals.css` defines light values in `@theme` and overrides the same variables under `:root[data-theme="dark"]` and, for system preference, `:root[data-theme="system"]` inside `prefers-color-scheme`.
- `providers/ThemeProvider.tsx` owns the preference, persists it in `localStorage` under `nexus-theme`, resolves the system preference, and applies `data-theme` to `<html>`.
- `app/layout.tsx` runs a static pre-paint script so the wrong theme never flashes.
- `components/ui/ThemeToggle.tsx` provides an accessible light/dark/system control.

Consume semantic tokens rather than scattering `dark:` overrides. A `dark:` variant is defined for exception cases, but token-driven styling is the standard.

### 4.10 Scripts and checks

Verified from `package.json`:

| Command | Purpose | Notes |
|---|---|---|
| `npm run dev` | Start the development server | Next.js |
| `npm run build` | Production build | Also surfaces type and build errors |
| `npm run start` | Serve the production build | Requires `npm run build` first |
| `npm run lint` | Run ESLint | Script is `eslint` with the flat config |
| `npm test` | Run Vitest once | Script is `vitest run` |
| `npm run test:watch` | Run Vitest in watch mode | — |
| `npx tsc --noEmit` | Type-check without emitting | No dedicated `typecheck` script |

**Test configuration:** `vitest.config.mts` configures jsdom, the setup file, the `@` alias, and test discovery, and `npm test` runs the existing suite successfully. Do not delete this file, replace it silently, or remove tests to make a run pass.

There is no CI configuration and no end-to-end test framework in the repository.

---

## 5. Branding and Design System

### 5.1 Brand personality

Nexus should feel:

- Modern, intelligent, professional, mature, trustworthy.
- Connected, efficient, adaptable, innovative.
- Calm and confident, with a clean SaaS application language.

Avoid childish, overly playful, excessively futuristic, or heavily decorative design. The brand is a professional productivity platform.

**Voice:** direct, clear, helpful, confident, concise, friendly but professional. Avoid jargon with ordinary users. Do not over-promise.

### 5.2 Logo and iconography

- Logo direction: a minimal geometric **N** monogram communicating connected nodes and systems.
- It must work as an icon alone and with the Nexus wordmark, in monochrome, on light and dark backgrounds, and as a favicon.
- Do not redraw, distort, recolour, or approximate the logo.
- Use one consistent modern icon system with consistent stroke weight and alignment.
- Accompany ambiguous icons with labels or accessible names.
- Do not mix unrelated icon styles.

No icon library is installed. Existing components use inline SVG (for example, the modal close icon at `16×16`, `viewBox="0 0 24 24"`, `strokeWidth="2"`). Follow that approach until an icon system is approved.

### 5.3 Colour: source of truth and current implementation

**Brand specification (`branding.md`)** defines a restrained indigo and charcoal identity:

| Role | Value | Purpose |
|---|---|---|
| Primary Indigo | `#5146D8` | Brand identity and primary actions |
| Deep Indigo | `#3730A3` | Emphasis and active states |
| Soft Indigo | `#EEF0FF` | Subtle backgrounds and selected states |
| Charcoal | `#20232D` | Primary dark text |
| Deep Charcoal | `#151821` | Dark interface surfaces |
| White | `#FFFFFF` | Main light surfaces |
| Off White | `#F8F9FC` | Application background |
| Light Gray | `#F0F1F5` | Secondary surfaces |
| Border Gray | `#E4E6ED` | Borders and dividers |
| Muted Gray | `#858B9B` | Secondary text |
| Dark Gray | `#454B59` | Supporting text |
| Green / Red / Amber / Blue | Semantic | Success, error/destructive, warning, information |

**Current implementation (`app/globals.css`)** follows the brand specification. Light and dark values are defined for the same tokens:

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--color-primary` | `#5146D8` | `#7C74E8` | Primary action and focus |
| `--color-primary-hover` | `#3730A3` | `#918AF0` | Primary hover |
| `--color-primary-soft` | `#EEF0FF` | `#23214A` | Subtle selected backgrounds |
| `--color-background` | `#F8F9FC` | `#0F1117` | Application background |
| `--color-surface` | `#FFFFFF` | `#151821` | Cards, panels, dialogs |
| `--color-surface-secondary` | `#F0F1F5` | `#1C202B` | Secondary surfaces |
| `--color-text-primary` | `#20232D` | `#F4F5F8` | Primary text |
| `--color-text-secondary` | `#454B59` | `#A8AEBD` | Supporting text |
| `--color-text-muted` | `#858B9B` | `#858B9B` | Metadata and placeholders |
| `--color-border` | `#E4E6ED` | `#2A2F3D` | Borders and dividers |
| `--color-success` / `-bg` | `#059669` / `#ECFDF5` | `#6EE7B7` / `#06302A` | Success |
| `--color-error` / `-bg` | `#DC2626` / `#FEF2F2` | `#FCA5A5` / `#3B1214` | Error and destructive |
| `--color-warning` / `-bg` | `#D97706` / `#FFFBEB` | `#FCD34D` / `#3A2A06` | Warning |
| `--color-info` / `-bg` | `#0284C7` / `#F0F9FF` | `#7DD3FC` / `#082F49` | Information |

Task-status tokens follow the same pattern, with `--color-status-assigned` aligned to the brand indigo.

**Theme rules:**

1. `branding.md` is authoritative for brand direction; `app/globals.css` is the single implementation source for tokens.
2. Components must reference tokens through CSS variables, never raw hex values.
3. Add new semantic colours as tokens in both the light and dark blocks. Do not introduce a one-off colour in a component.
4. Prefer tokens over `dark:` utilities. A `dark:` variant exists for genuine exceptions.
5. Report any future brand change to the token layer rather than retheming individual screens.
6. The only static colour outside the token layer is the `Select` chevron data URI; it uses the muted grey and should be replaced when an icon system is approved.

### 5.4 Typography

- **Brand specification:** Inter.
- **Current implementation:** Inter, loaded through `next/font/google` in `app/layout.tsx`, exposed as `--font-inter` and mapped to `--font-sans` in `globals.css`. The mono token uses a system monospace stack.

Do not introduce a third font family or replace Inter without an approved brand change. Keep the hierarchy restrained:

| Use | Typical classes |
|---|---|
| Page title (h1) | `text-2xl` or `text-3xl`, `font-semibold` |
| Section heading (h2) | `text-xl`, `font-semibold` |
| Sub-heading (h3) | `text-lg`, `font-medium` |
| Body | `text-sm` or `text-base`, normal weight |
| Supporting text | `text-sm`, secondary text token |
| Label | `text-sm`, `font-medium` |
| Caption / metadata | `text-xs`, muted text token |

Avoid unnecessary font weights, all-caps body text, and decorative type treatments.

### 5.5 Spacing and layout

- Use the Tailwind default 4px spacing scale. Existing components use `gap-1` to `gap-4`, `p-4`/`p-5`, `px-3`/`px-4`/`px-6`, and `py-3`/`py-4`/`py-12`.
- Do not use arbitrary numeric values (`p-[13px]`) when a scale value exists.
- Arbitrary values are acceptable for token references, for example `bg-[var(--color-surface)]`, and for layout constraints that cannot be expressed with the scale.
- Design compactly but not densely. Use whitespace to establish grouping and hierarchy.
- Pages should have a clear header, content region, and action area.
- Do not nest cards inside cards without a strong information-architecture reason.

### 5.6 Borders, radii, shadows, and layers

Tokens in `app/globals.css`:

| Token | Value |
|---|---|
| `--radius-sm` | `0.25rem` (4px) |
| `--radius-md` | `0.375rem` (6px) |
| `--radius-lg` | `0.5rem` (8px) |
| `--radius-xl` | `0.75rem` (12px) |
| `--radius-2xl` | `1rem` (16px) |
| `--radius-full` | `9999px` |
| `--shadow-sm` | subtle card shadow |
| `--shadow-md` | raised element shadow |
| `--shadow-lg` | dialog shadow |
| `--z-dropdown` | `1000` |
| `--z-modal` | `1300` |
| `--z-tooltip` | `1400` |
| `--z-toast` | `1500` |

Conventions:

- Buttons and inputs: `--radius-md`.
- Cards: `--radius-lg`, `1px` border, `--shadow-sm`.
- Modals: `--radius-xl`, `--shadow-lg`, `40%` black overlay.
- Badges and avatars: full radius.
- Use borders for structure; use shadows sparingly for elevation.
- Do not create new z-index values outside the token scale. Add a token if a new layer is genuinely required.

### 5.7 Component styling standards

**Buttons**

- Variants: `primary`, `secondary`, `ghost`, `destructive`.
- Sizes: `sm` (`h-8`, `px-3`, `text-sm`), `md` (`h-9`, `px-4`, `text-sm`), `lg` (`h-11`, `px-6`, `text-base`).
- Default `type="button"` to prevent accidental form submission; pass `type="submit"` explicitly.
- Loading state shows a spinner, sets `aria-busy`, and disables interaction.
- Focus: visible 2px ring using the primary token, offset by 2.
- One primary action per region. Use secondary/ghost for supporting actions.

**Inputs, selects, textareas, checkboxes, radios**

- Always provide a visible `<label>` associated through `htmlFor`/`id`. `Input`, `Select`, and `Textarea` enforce `label` and `id` through `LabeledProps`; `Checkbox` does the same locally.
- Provide `helperText` and `errorMessage` where useful. Error text uses `role="alert"` and is linked via `aria-describedby`; `aria-invalid` is set when invalid.
- Focus uses the primary ring; error state uses the error border/ring.
- Do not use placeholder text as the only label.
- Do not build a second input component because the existing one lacks a prop; extend the existing component carefully.

**Cards**

- `Card`, `CardHeader`, `CardBody`, `CardFooter` are available.
- Default card padding is `p-4`; header/footer use `px-4 py-3` with a border.
- Use `noPadding` only when the card contains a full-bleed table, media, or custom layout.

**Dialogs and confirmations**

- Use `Modal` and `ConfirmDialog`. Never use `window.alert()` or `window.confirm()` for application interactions.
- `Modal` provides `role="dialog"`, `aria-modal`, focus trap, Escape close, focus restoration, and body scroll lock.
- Use `ConfirmDialog` for destructive or consequential actions, with `destructive` and `loading` where appropriate.
- Dialog titles must be meaningful; descriptions should state the consequence.

**Badges and status**

- Use `Badge` with text. Never communicate status by colour alone.
- Task status variants exist for `ASSIGNED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, and `CHANGES_REQUESTED`.
- Priority variants exist for `LOW`, `MEDIUM`, `HIGH`, and `URGENT`.
- The current status workflow is defined in `types/ui.ts`: `ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED`, with `CHANGES_REQUESTED → IN_PROGRESS`. Valid transitions are backend-enforced; never allow arbitrary status changes in the UI.

**Menus and dropdowns**

- Use `Dropdown` for contextual actions. Do not build ad-hoc menu markup.
- It supports click and keyboard opening, arrow-key navigation, Escape, outside-click dismissal, disabled items, destructive items, separators, and link items.
- Menu actions that change or delete data must still use `ConfirmDialog` when confirmation is appropriate.
- Link items render as anchors. When typed routes exist, pass route constants rather than hardcoded strings.

**Page structure**

- Use `PageContainer` once per route for width, padding, and centring.
- Use `PageHeader` for the single `h1`, optional description, breadcrumb slot, and actions slot.
- Do not create a second page-level title inside the content.

**Navigation**

- Navigation is not implemented yet. Phase 2 must implement the application shell described in `branding.md`: sidebar, workspace switcher, main content, contextual panels, global search, notifications, messages, and user menu.
- Navigation must adapt to workspace type and permissions.
- The sidebar must be collapsible and usable on mobile.
- Do not hardcode navigation paths once `lib/routes.ts` exists; use typed route constants.
- Keep the Messages entry point and the general notification bell visually and functionally separate.

### 5.8 Task status colours

Tokens exist for each task status, including foreground and background values. Use the `Badge` component rather than hand-building status pills. Include a text label such as "In Progress" alongside the colour.

### 5.9 Responsive design

The desktop experience is the primary design target, but the interface must work on desktop, laptop, tablet, and mobile browsers.

| Range | Expectation |
|---|---|
| Mobile (320px–767px) | Single column, full-width forms, drawer or bottom navigation, no cramped multi-column layouts |
| Tablet (768px–1023px) | Optional sidebar, two-column layouts where useful |
| Desktop (1024px+) | Full sidebar and content layout |

Test at 320px, 375px, 768px, 1024px, 1440px, and 1920px where relevant. Check navigation, tables, dialogs, forms, search, conversation layouts, file previews, calendar views, and dashboards.

Intentional horizontal scrolling (for example, a Kanban board) is allowed. Accidental page-level horizontal overflow is not.

### 5.10 Accessibility

Target **WCAG 2.1 AA**:

- Semantic HTML and a logical heading order.
- Every form control has a label.
- All interactive elements are keyboard reachable with a visible focus indicator.
- Icon-only buttons have accessible names.
- Dialogs trap focus, close on Escape, and restore focus.
- Use `aria-live` for important asynchronous status changes.
- Do not convey information by colour alone.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for UI boundaries.
- Respect `prefers-reduced-motion` (already enforced globally in `globals.css`).
- Do not make functionality available only on hover.

---

## 6. Component Development Standards

### 6.1 Existing component inventory

UI primitives live in `components/ui/` and are imported through `@/components/ui/<Name>`. Page layout components live in `components/layout/`.

| Component | Export(s) | Key props / behaviour |
|---|---|---|
| `Alert` | `Alert`, `ErrorMessage` | `variant`: info/success/warning/error; `ErrorMessage` for inline errors |
| `Avatar` | `Avatar` | `src`, `name`, `size`: xs/sm/md/lg; falls back to initials |
| `Badge` | `Badge` | `variant`: default/outline/alert/task status/priority |
| `Breadcrumb` | `Breadcrumb` | `items` array; navigation trail |
| `Button` | `Button` | `variant`, `size`, `loading`, native button props |
| `Card` | `Card`, `CardHeader`, `CardBody`, `CardFooter` | `noPadding` on `Card` |
| `Checkbox` | `Checkbox` | `label`, `id`, `errorMessage`, `helperText` |
| `ConfirmDialog` | `ConfirmDialog` | `open`, `onClose`, `onConfirm`, `destructive`, `loading` |
| `Dropdown` | `Dropdown` | `items`, `label`, `align`; keyboard navigation, Escape, outside click, disabled/destructive/link items |
| `EmptyState` | `EmptyState` | `icon`, `title`, `description`, `action` |
| `Input` | `Input` | `label`, `id`, `type`, `size`, `helperText`, `errorMessage`, `srOnlyLabel` |
| `Modal` | `Modal` | `open`, `onClose`, `title`, `description`, `footer`, `maxWidth` |
| `Radio` | `RadioGroup` | Group of labelled radio options |
| `Select` | `Select` | `label`, `id`, `size`, `helperText`, `errorMessage` |
| `Skeleton` | `Skeleton`, `SkeletonText`, `SkeletonCard` | Shape-matched loading placeholders |
| `Spinner` | `Spinner` | `size`: sm/md/lg |
| `Tabs` | `Tabs` | `tabs`, controlled/uncontrolled `activeTab`, arrow-key navigation |
| `Textarea` | `Textarea` | `label`, `id`, `resize`, `helperText`, `errorMessage` |
| `ThemeToggle` | `ThemeToggle` | Segmented light/dark/system control; requires `ThemeProvider` |
| `Tooltip` | `Tooltip` | `content`, single focusable child, `position` |
| `PageContainer` | `PageContainer` | `width`, `noPadding`; consistent page width and padding |
| `PageHeader` | `PageHeader` | `title`, `description`, `breadcrumb`, `actions`; single page `h1` |

Do not duplicate these primitives in feature folders. Extend the shared component when a genuine requirement applies broadly.

### 6.2 Established component conventions

Follow the patterns already in the codebase:

- **Named exports.** Use `export function ComponentName`. Do not add default exports for UI primitives.
- **Local props interfaces.** Define `interface XProps` in the component file. Use shared types from `@/types/ui` for variants, sizes, labels, and common props.
- **Extend native props** where appropriate, for example `React.ButtonHTMLAttributes<HTMLButtonElement>`. Omit conflicting native props (`size`, `id`) when the component owns them.
- **`className` support.** Accept `className?: string`, default to `''`, and merge it last.
- **Class joining.** The current convention is an array of class strings with `.filter(Boolean).join(' ')`. Do not add `clsx` or `tailwind-merge` without approval.
- **Design tokens.** Reference CSS variables in arbitrary values, for example `bg-[var(--color-surface)]` and `rounded-[var(--radius-md)]`. Do not hardcode hex colours.
- **`'use client'`.** Add it only when the component uses state, effects, refs, event handlers, or browser APIs. `Button`, `Input`, `Modal`, `Tabs`, and `Tooltip` are client components; `Card`, `Badge`, `Alert`, `EmptyState`, `Skeleton`, and `Spinner` are not.
- **Accessibility is part of the component contract.** Do not remove focus styles, ARIA attributes, or keyboard behaviour to simplify styling.
- **Default button type.** Interactive buttons default to `type="button"` unless explicitly submitting a form.
- **Refs.** Existing components do not use `forwardRef`. If a new component needs a ref, use the React 19 ref-as-prop pattern or follow the codebase's established approach consistently.

### 6.3 Component layers

| Layer | Location | Responsibility |
|---|---|---|
| Primitives | `components/ui/` | Generic, reusable, domain-agnostic UI |
| Layout | `components/layout/` | Page container and page header exist; application shell arrives in Phase 2 |
| Shared | `components/shared/` (planned) | Cross-feature composites such as user pickers or file uploaders |
| Feature | `features/<domain>/` (planned) | Domain-specific forms, lists, boards, and interactions |
| Page | `app/**/page.tsx` | Route entry, data orchestration, composition |

Rules:

- Primitives must not know about projects, tasks, workspaces, or API endpoints.
- Feature components may compose primitives and call services.
- Page components should compose feature components, not contain large amounts of markup and business logic.
- Keep server/client boundaries at the smallest sensible level.

### 6.4 TypeScript standards

- TypeScript is mandatory. Never convert the project to JavaScript.
- Avoid `any`. Use explicit interfaces, generics, discriminated unions, or `unknown` with validation.
- Type component props, event handlers, hook returns, API payloads, and API responses.
- Use `import type` for type-only imports.
- Model async state explicitly. `types/api.ts` already provides `ApiResult<T>` and `ApiError`.
- Do not use type assertions to bypass validating untrusted data.
- Do not use `@ts-ignore` or `@ts-expect-error` to hide a real problem. If an exception is unavoidable, document why and keep it narrow.
- Do not duplicate types. Reuse `types/api.ts`, `types/ui.ts`, and future domain types.
- Represent nullable and optional fields accurately.

### 6.5 Adding a component

Before creating a new component, check whether an existing primitive can be extended. If a new component is justified:

1. Confirm it is not a near-duplicate of an existing component.
2. Decide whether it belongs in `components/ui`, `components/shared`, or a feature folder.
3. Define typed props and accessible behaviour.
4. Use design tokens exclusively.
5. Cover loading, disabled, error, and empty states where relevant.
6. Add a co-located test under `__tests__/` if the component has meaningful behaviour.
7. Verify keyboard interaction and screen-reader semantics.

---

## 7. UI/UX Development Standards

### 7.1 General quality bar

Interfaces must be clean, modern, professional, and trustworthy:

- Clear visual hierarchy: page title, primary action, content, secondary actions.
- Consistent spacing and alignment.
- Obvious interactive states: hover, focus, active, disabled, loading.
- Predictable navigation and back behaviour.
- No decorative clutter.
- No unexplained disabled controls; explain why an action is unavailable.

### 7.2 Required UI states

Every data-dependent view must handle:

| State | Requirement |
|---|---|
| Loading | Skeleton or spinner that matches the content shape; avoid layout shift |
| Success | Render the data and confirm mutations |
| Empty | Explain what is missing and offer a relevant next action |
| Error | Human-readable message, retry where safe, no stack traces or internals |
| Unauthorised | Clear restricted-access state; do not reveal private content |
| Partial / stale | Indicate refresh or incomplete data where relevant |

Do not render a blank screen while loading. Do not show stale content from a previous workspace.

### 7.3 Feedback and confirmations

- Confirm successful saves, uploads, invitations, deletions, and permission changes.
- Use inline validation for forms and a summary alert for request-level failures.
- Use `ConfirmDialog` for destructive actions and consequential changes.
- Never use browser `alert()` or `confirm()` for normal application interactions.
- Do not swallow errors. Do not expose raw backend messages that contain internals, stack traces, tokens, or private resource names.
- Provide retry only when retrying is safe. Do not encourage duplicate mutations.

### 7.4 Forms

- Keep labels visible; placeholders are examples, not labels.
- Mark required fields and explain unusual constraints.
- Validate on submit and, where helpful, on blur. Avoid aggressive validation while typing.
- Show field-level errors next to the field and a general error for non-field failures.
- Preserve input after failure.
- Prevent double submission.
- Provide a clear cancel/back path.
- Ensure tab order is logical and the first invalid field receives focus after submission where practical.

### 7.5 Navigation and information architecture

- Navigation must reflect workspace type, plan, role, and permissions.
- Never show a link to a resource the user cannot access.
- Breadcrumbs should reflect the real hierarchy.
- Preserve the user's context when switching views within a project or conversation.
- On workspace switch, reset workspace-scoped state and refetch; do not carry over the previous workspace's data.
- The Messages area and the general notification bell are separate destinations with separate counts.

### 7.6 Tables, lists, and long content

- Use tables for genuinely tabular data; use cards/lists for activity and conversational content.
- Provide column priorities and horizontal scroll on small screens rather than squeezing text.
- Paginate or incrementally load large collections.
- Keep row actions discoverable and keyboard accessible.
- Use truncation with a way to reveal full content; do not hide critical information.

### 7.7 Copy and tone

- Be direct and helpful. Say what happened and what the user can do next.
- Use sentence case for labels and buttons.
- Avoid blaming the user. Avoid vague errors such as "Something went wrong" when a more specific, safe message is possible.
- Do not expose technical jargon in ordinary user flows.

---

## 8. Animation and Interaction Standards

### 8.1 Approach

Nexus currently uses CSS transitions and Tailwind utilities only. There is no animation library. Continue with CSS unless an approved need justifies a dependency.

Animations should improve orientation and feedback, not decorate the interface.

### 8.2 Approved patterns

| Interaction | Guidance |
|---|---|
| Hover / focus | Short colour and background transitions, typically `150ms`; focus must remain immediately visible |
| Buttons | `transition-colors duration-150`; loading spinner uses `animate-spin` |
| Dropdowns / menus | Subtle fade/translate; close on Escape and outside click |
| Modals | Fade backdrop and a short scale/fade panel; do not animate for longer than the interaction takes |
| Sidebar | Smooth collapse/expand; preserve keyboard focus and labels |
| Loading | Skeletons for content, spinners for short actions; match the final layout |
| Page transitions | Subtle and fast; do not block navigation |
| Real-time indicators | Small, calm pulses or dots; avoid distracting motion on frequently updating data |
| Scroll-triggered | Only where it aids comprehension; do not hide essential content behind scroll animations |

### 8.3 Rules

- Respect `prefers-reduced-motion`. The global rule in `globals.css` already reduces all animation and transition durations; do not override it.
- Do not animate layout properties when transform/opacity will do.
- Do not animate large lists, tables, or message streams on every update.
- Do not chain animations that delay access to content.
- Do not use animation to communicate state without a text or ARIA equivalent.
- Keep durations consistent. Existing components use `150ms`; stay in the short range unless there is a reason.
- Test on lower-powered devices and with reduced motion enabled.

---

## 9. Nexus Feature Awareness and Phase Guardrails

The following capabilities are part of the Nexus product. **None of them should be assumed implemented.** Check `PHASES.md` and the codebase before starting work. The phase numbers refer to the current `PHASES.md` roadmap (Phases 0–33).

### 9.1 Identity, workspaces, and membership

| Capability | Frontend implications | Phase |
|---|---|---|
| Individual, Company, Institution workspaces | Shared components; workspace-type-aware navigation, terminology, dashboards, and settings. Do not fork the app. | 5 |
| Workspace switching | Update active workspace context, reset workspace-scoped caches/state, refetch data, update navigation. No cross-workspace leakage. | 5 |
| Organisation discovery | Search/browse organisations respecting visibility; do not expose private organisations. | 6 |
| Join requests | Pending/approved/rejected/withdrawn/expired states; seven-day expiry; applicant cannot access private content before approval. | 6 |
| Invitations | Accept/decline, expiry (48 hours), resend/revoke for administrators; enforce expiry on the backend. | 6 |
| Membership management | Separate organisation and team membership; removing membership must not delete the Nexus identity or personal workspace. | 6 |
| Departments, teams, groups | Organisation structure is configurable; membership and permissions are separate from organisation roles. | 8 |
| Roles and permissions | Render from backend-provided permissions; hide/disable unauthorised actions; refresh after changes. | 7 |

**Canonical organisation roles (from `branding.md`):**

- Company: Owner, Administrator, Team Lead, Member, Guest.
- Institution: Owner, Institution Administrator, Department Administrator, Team/Group Lead, Member, Guest.

**Project roles (proposed in `branding.md`):** Project Owner, Project Manager, Contributor, Viewer, Guest. Project roles are separate from organisation roles.

**Known type discrepancy:** `types/ui.ts` currently declares `UserRole = 'OWNER' | 'PM' | 'MEMBER' | 'VIEWER' | 'COLLABORATOR'`. This is a legacy/placeholder union and does not match the canonical organisation role model. Do not use it as the authoritative permission matrix. When Phase 7 begins, align frontend types with the backend contract and update consumers deliberately. Never invent permissions or role strings.

### 9.2 Projects and tasks

| Capability | Frontend implications | Phase |
|---|---|---|
| Projects | Create/edit, overview, members, discussions, files, milestones, activity, settings, visibility. | 9 |
| Project visibility | Organisation-wide, department/team-only, private/invitation-only. Apply the same restriction to tasks, messages, files, meetings, activity, search, and AI context. | 9 |
| Tasks | Title, description, creator, owner, assignees, priority, status, dates, subtasks, checklists, comments, mentions, attachments, labels, dependencies, activity. | 10 |
| Task views | Board, List, Timeline, Calendar use the same underlying task data; changing view must not create duplicate tasks. | 10 |
| Status workflow | Current types use `ASSIGNED → IN_PROGRESS → SUBMITTED → UNDER_REVIEW → APPROVED`, with `CHANGES_REQUESTED`. Confirm transitions and permissions with the backend. | 10 |
| Message-to-task | Preserve a reference to the original conversation and message; create a separate task notification. | 10/11 |

Do not compute authoritative project progress differently from the backend. Use the backend's weighting and aggregation.

### 9.3 Messaging and notifications

| Capability | Frontend implications | Phase |
|---|---|---|
| Direct messages, group conversations, team channels, project conversations, announcements | Conversation list, active thread, responsive layout, threads, reactions, mentions, attachments, edit/delete, pin/save, read state, typing, presence, search, settings. | 11 |
| Channel management | Owner full control; administrators per permissions; Team Leads within assigned teams when authorised; members cannot create channels by default; guests only explicitly shared channels. | 11 |
| General notification centre | Task assignments, project updates, meeting invitations/changes, file sharing, join decisions, workspace invitations, approvals, security events. | 12 |
| Activity feed | Grouped activity with navigation to the affected resource, permission-aware. | 12 |

**Critical unread-count separation (non-negotiable):**

- Direct messages, group messages, channel messages, and message mentions belong to the **Messages** area.
- They must **not** increment the general notification bell.
- Message unread counts and general notification unread counts must use separate state and separate backend sources.
- Marking a message read must not clear general notifications, and vice versa.
- Never combine these counters in a single client-side store or visual badge.

### 9.4 Files and documents

| Capability | Frontend implications | Phase |
|---|---|---|
| Nexus Drive | Folder browsing, upload/progress, preview, download, rename/move/copy/delete, search, sharing, details, permissions, favourites, recent files, storage usage, version history where supported. | 13 |
| Contextual files | Files can appear in projects, tasks, conversations, channels, meetings, documents, departments, and teams without unnecessary duplication. | 13 |
| Documents | Listing, creation, editing, preview, comments, sharing, access control, version history. Real-time collaboration only if the backend and editor architecture support it. | 14 |

Security rules:

- Access files through authorised backend endpoints or signed URLs.
- Never expose storage credentials or private object keys.
- Knowing a URL must not be treated as permission.
- Do not cache private file content beyond approved behaviour.
- Revoked members must lose access promptly.

### 9.5 Calendar and meetings

| Capability | Frontend implications | Phase |
|---|---|---|
| Calendar | Day/week/month/agenda views, event creation/editing, invitations, participant management, filters, personal and workspace calendars, Google/Outlook sync, conflict feedback, availability, booking links. | 15 |
| Meetings | Scheduling, instant meetings, invitations, pre-join device settings, audio/video, participants, screen sharing, chat, history, project-linked meetings, recording/transcription where approved. | 16 |

- Calendar sync is two-way. Prevent duplicate events and update loops; surface conflicts rather than silently overwriting.
- Use the approved managed calling SDK. Do not replace it without approval.
- Private event details and recordings must not leak to unauthorised users.
- Notify participants before recording and respect consent and retention policies.

### 9.6 Forms, billing, search, integrations, automation

| Capability | Frontend implications | Phase |
|---|---|---|
| Forms and surveys | Builder, field configuration, validation, conditional logic, preview, publish, distribution, response collection, response dashboard, export. | 17 |
| Subscription and billing | Plans, 14-day Premium trial, upgrade/downgrade, payment method, billing history, invoices, renewal, cancellation, usage limits. | 18 |
| Global and document search | Ctrl/Cmd+K, suggestions, recent searches, filters, workspace context, previews, highlighted matches, excerpts, pagination. Search results must be permission-filtered. | 19 |
| Integrations | Directory, connection flows, OAuth redirects, connected accounts, sync status, reconnect/disconnect, scopes, personal vs workspace separation. | 20 |
| Automation | Listing, trigger/condition/action builder, activation, execution history, status, error details, pause/resume. | 21 |

Billing rules:

- The trial requires no payment card and must not silently convert to paid.
- Organisation billing is controlled by the Owner.
- Personal and organisation subscriptions are independent.
- Downgrading must not delete data.
- Never invent pricing, plan limits, or billing rules.

Search rules:

- Never expose inaccessible private resources through results, suggestions, previews, excerpts, or history.
- Do not build a client-side index of private documents.
- Use the backend search API and respect workspace context.

### 9.7 AI and Nexus Write

| Capability | Frontend implications | Phase |
|---|---|---|
| Nexus AI | Conversation UI, history, contextual assistance, document analysis, summaries, recommendations, source references, loading/error/unavailable states. | 22 |
| Nexus Write | Spelling, grammar, punctuation, clarity, vocabulary, tone, rewriting, summarisation, translation, explanation; selected-text assistance; debounced analysis; accept/dismiss. | 23 |
| AI action approval | Show the proposed action and affected resources; approve/reject/cancel; show execution progress and the actual backend result; refresh affected data. | 24 |

Rules:

- The Express backend remains authoritative. The frontend never calls the Python AI service directly and never bypasses Express authorisation.
- AI must never silently mutate data. Every mutation needs explicit user approval and backend revalidation.
- Do not fabricate AI responses, meeting summaries, or action items.
- Do not present AI output as verified project data.
- Nexus Write must never silently replace user writing. Every suggestion is under user control.
- Minimise private text sent for analysis and respect retention rules.
- Core Nexus functionality must continue when the AI service is unavailable.

### 9.8 Settings, reporting, and security

| Capability | Frontend implications | Phase |
|---|---|---|
| User settings and preferences | Profile, security, notifications, appearance, language/timezone, quiet hours, muted conversations. | 26 |
| Reports and analytics | Project progress, task completion, overdue tasks, team activity, milestones, meetings, files, forms. Respect permissions; avoid invasive individual surveillance. | 27 |
| Personal security | Active sessions, devices, login history, failed attempts, password/2FA changes, session termination, log out other devices. | 26/29 |
| Organisation audit logs | Searchable, filterable, exportable records of membership, roles, teams, projects, files, security, integrations, billing, administration. Records are not editable by ordinary administrators. | 27/29 |

Never expose another user's sessions, private messages, credentials, or private resource details through settings, reports, audit logs, or error messages.

### 9.9 Explicitly deferred features

`branding.md` defers Whiteboards, Knowledge Base/Wiki, an advanced unified cross-workspace activity feed, native mobile apps, an organisation security dashboard, and custom roles/permission builders. Do not implement these unless product scope changes and `PHASES.md` is updated.

---

## 10. Backend Integration and Data Handling

### 10.1 Authority and boundaries

- The Express/TypeScript backend is the authoritative source for authentication, authorisation, business rules, data, and AI action execution.
- PostgreSQL and Redis are backend concerns. The frontend must never connect to them directly.
- The Python/FastAPI AI service is not the application backend. The frontend integrates through Express only.
- Backend permissions, visibility rules, and validation are authoritative. Frontend checks are UX aids, not security controls.

### 10.2 API client status and conventions

**Current state:** No API client exists. `types/api.ts` defines the intended generic types; its comments reference a future `lib/api.ts` (planned for Phase 3). Do not claim an API layer exists.

When the client is implemented:

- Centralise the base URL and request behaviour in one client module.
- Provide typed wrapper functions; do not call `fetch` ad hoc throughout components.
- Keep API functions in `services/<domain>.ts` and types in `types/<domain>.ts`.
- Use `credentials` and token/session handling exactly as the backend contract requires.
- Normalise non-2xx responses into `ApiError` (`status`, `message`, optional field `errors`).
- Do not hardcode deployment URLs.
- Do not invent endpoints, methods, payloads, query parameters, response shapes, or error formats.
- Do not use mock responses as production behaviour. Test fixtures are acceptable only in tests.

**Documented environment variables (intended, not yet present):**

Existing references name `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`. `.env.example` records them as placeholders, not confirmed values. Confirm the actual names and any additional configuration with the backend/deployment configuration before relying on them. Never place private secrets in `NEXT_PUBLIC_*`.

### 10.3 Contract verification

Before integrating any endpoint, confirm:

1. HTTP method and path.
2. Required and optional request fields.
3. Authentication and session requirements.
4. Authorisation rules and resource visibility.
5. Full response shape.
6. Pagination, filtering, sorting, and search parameters.
7. Validation error format and field names.
8. Status codes for success, validation, auth, permission, missing, conflict, rate limit, and server failure.
9. Real-time events and payloads, if applicable.
10. File upload/download mechanics, size limits, and signed URL behaviour.

If an endpoint or contract is missing, document the dependency and stop short of faking integration. Do not modify the backend unless explicitly instructed.

### 10.4 Error handling

Map errors to safe, actionable UI:

| Status | Handling |
|---|---|
| `400` / `422` | Show field-level errors when provided; otherwise a general validation message |
| `401` | Trigger the approved session-expiry flow; preserve the intended destination |
| `403` | Show a restricted-access state; do not reveal private resource details |
| `404` | Show not-found or no-access consistently, according to the backend contract |
| `409` | Explain the conflict and offer a refresh or resolution path |
| `429` | Explain rate limiting and allow retry after the indicated period |
| `5xx` | General failure message, retry for safe reads, no internal details |
| Network failure | Offline/connection message with retry for safe operations |

Use `isApiError` to narrow unknown errors. Never display raw stack traces, SQL, internal IDs, tokens, or provider messages.

### 10.5 Loading, retries, and mutations

- Every request has an explicit loading state.
- Retry only idempotent reads, with a small bounded number of attempts and backoff.
- Do not automatically retry mutations such as create, update, delete, invite, payment, or AI action execution.
- Prevent duplicate submissions with disabled/loading controls and request guards.
- After a successful mutation, refresh or invalidate the affected data. If optimistic updates are used, provide rollback on failure and reconcile with the backend response.
- Never show success before the backend confirms it.

### 10.6 Pagination, filtering, and search

- Use the backend's pagination contract. `types/api.ts` defines `PaginatedResponse<T>` with `data`, `total`, `page`, `pageSize`, and `hasMore`; its field names must match the real backend response.
- Reset to the first page when filters change.
- Debounce search input and cancel or ignore stale responses so an older request cannot overwrite a newer query.
- Preserve filters in the URL where the user expects to share or return to a view.
- Do not load unbounded collections.

### 10.7 Real-time updates

**Current state:** `socket.io-client` is not installed and no socket provider exists. All event names in older reference documents are placeholders, not confirmed contracts.

When real-time work is assigned (Phase 25 and the relevant feature phases):

- Reuse one shared connection; do not create a socket per component.
- Authenticate using the backend's actual socket authentication method.
- Subscribe to documented rooms/channels only.
- Clean up every listener on unmount and on dependency change.
- Prevent duplicate listeners and duplicate messages.
- Handle reconnect, disconnection, and missed-event recovery.
- Reconcile events with REST data; the backend remains authoritative.
- Keep message unread counts and general notification counts separate.
- Do not treat real-time events as durable storage.

### 10.8 Files and uploads

- Use backend-authorised upload/download flows, including signed URLs or streaming endpoints.
- Show upload progress and support cancellation where the backend allows it.
- Validate type and size before upload for UX, but rely on backend validation.
- Never expose storage credentials, private bucket names, or permanent private URLs.
- Do not cache private file content beyond approved behaviour.
- Handle permission revocation and expired links gracefully.

### 10.9 Permission-aware rendering

- Derive capabilities from backend-provided roles/permissions, not from hardcoded email addresses, user IDs, or client flags.
- Hide or disable actions the user cannot perform, and explain restricted states.
- Still handle `401`/`403` from the backend, because UI state can be stale.
- Refresh role- and permission-dependent UI after membership or role changes.
- Do not treat a hidden button as access control.

---

## 11. Security and Privacy

### 11.1 Authentication and sessions

- Follow the backend's approved session/token strategy. Do not invent one.
- Do not treat client-side authentication state as proof of authorisation.
- Do not hardcode administrator access or bypass login.
- Do not store passwords, access tokens, or refresh tokens in `localStorage` as a convenience.
- Prefer secure, HttpOnly cookies when the backend supports them.
- If browser-accessible tokens are explicitly required, follow the documented model and minimise exposure.
- Handle expired sessions consistently and clear sensitive cached data on logout.
- Prevent redirect loops and preserve the intended destination after login.
- Show a loading state during session restoration; do not flash protected content.

### 11.2 Secrets and environment variables

- Never commit secrets, private keys, provider tokens, or credentials.
- Never place a secret in a `NEXT_PUBLIC_*` variable; those values are embedded in the browser bundle.
- Do not log tokens, passwords, private messages, transcripts, or personal data.
- Do not expose private environment values through error messages or client-side configuration dumps.
- Preserve existing `.env*` files. Never overwrite or delete them.
- Add only genuinely required variables and document public placeholders in `.env.example`. Never add real secret values there or to any tracked file.

### 11.3 User-generated content

- Treat API responses and user content as untrusted.
- Render text through React's normal escaping.
- Do not use `dangerouslySetInnerHTML` without a documented, sanitised requirement and an approved sanitisation library.
- Validate URLs and file names; do not render arbitrary protocols.
- Be cautious with links in messages and documents; use safe link handling and warn on external navigation where appropriate.

### 11.4 Workspace isolation

- Every workspace-scoped view must use the active workspace context.
- On workspace switch, clear or refetch all workspace-scoped data. Never render the previous workspace's projects, tasks, messages, files, or members while the new context loads.
- Do not derive workspace permissions from the user's role in a different workspace.
- Personal workspace data must remain independent of organisation membership.
- Resource links must not bypass backend permission checks.
- Private project, conversation, document, and file data must remain restricted in lists, previews, search, notifications, and AI context.

### 11.5 Permissions and privacy

- Use backend-provided roles and permissions.
- Only the Owner can remove or demote another administrator.
- An administrator cannot remove the Owner.
- Administrators may remove ordinary members and guests.
- Team Leads cannot remove organisation members unless explicitly authorised.
- Guests only access explicitly shared resources.
- Organisation membership and team membership are separate.
- An organisation administrator does not automatically gain access to every private project.
- Removing organisation membership must not delete the Nexus identity or personal workspace.

### 11.6 AI privacy

- Send only the minimum text needed for the requested AI operation.
- Do not send private workspace data to an AI provider outside the approved backend flow.
- Respect retention and consent rules.
- Do not surface AI context, sources, or summaries to users who lack permission for the underlying resource.

---

## 12. Performance and Code Quality

### 12.1 Performance

- Prefer Server Components and keep client boundaries small.
- Avoid unnecessary client-side JavaScript and large dependencies.
- Use `next/image` for images where appropriate and provide dimensions or aspect ratios.
- Lazy-load genuinely heavy client features with dynamic imports.
- Paginate or incrementally load large collections; virtualise where evidence shows a need.
- Debounce search and resize handlers.
- Avoid duplicate API requests caused by unstable effects or repeated subscriptions.
- Clean up listeners, timers, and subscriptions.
- Avoid re-rendering large trees on every keystroke or real-time event.
- Do not add memoisation, complex caching, or premature optimisation without evidence.

### 12.2 Code quality

- Keep components focused and reasonably small.
- Extract repeated logic into hooks or utilities when it improves clarity.
- Keep API communication out of presentation primitives.
- Avoid prop drilling more than a level or two; use composition or a scoped provider.
- Avoid unnecessary global state.
- Use clear, descriptive names.
- Remove debug statements, commented-out code, and unused imports before finishing.
- Do not suppress TypeScript or ESLint errors to make checks pass.
- Do not leave `console.log` in production paths.
- Do not create abstractions for a single use without a clear reason.

### 12.3 Dependency discipline

- Inspect `package.json` and the lockfile before proposing a dependency.
- Do not replace existing libraries because of personal preference.
- Do not install a package for a small utility that can be implemented clearly in the codebase.
- Do not add a second library for a concern already covered.
- Any new dependency needs explicit approval and a documented reason.

---

## 13. Testing and Verification

### 13.1 Installed tools

- Vitest.
- Testing Library: DOM, React, jest-dom, user-event.
- jsdom.
- `vitest.setup.ts` imports `@testing-library/jest-dom`.

There is no end-to-end framework, visual regression tool, or CI configuration.

### 13.2 Commands

Run the checks that apply to the change:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Use `npm run test:watch` during development. Do not invent scripts that are not in `package.json`.

**Test configuration:** `vitest.config.mts` is present and configures jsdom, `vitest.setup.ts`, the `@` alias, and test discovery. If `npm test` cannot start, report the configuration problem; do not delete tests, silently skip them, or claim they passed.

### 13.3 Test expectations by change type

| Change | Minimum verification |
|---|---|
| UI primitive | Rendering, variants, disabled/loading, keyboard interaction, accessible name |
| Form | Labels, validation, error display, submission guard, preserved input |
| Data view | Loading, success, empty, error, unauthorised |
| Permission-sensitive UI | Each relevant role/permission state; backend `403` handling |
| Workspace-scoped view | Correct data after switch; no previous-workspace leakage |
| API/service function | Request shape, success mapping, error mapping, status codes |
| Real-time handler | Subscribe, update, duplicate prevention, cleanup on unmount |
| Destructive action | Confirmation, cancel, loading, failure, success |
| Responsive layout | 320px, 375px, 768px, 1024px, 1440px; no accidental overflow |
| Accessibility | Keyboard-only path, focus order, labels, dialog behaviour, contrast |

### 13.4 Test conventions

- Co-locate component tests in `__tests__/` beside the component, as the existing UI tests do.
- Use `.test.tsx` for components and `.test.ts` for utilities/hooks.
- Query by role, label, or visible text; avoid brittle CSS selectors.
- Use `user-event` for interactions.
- Test behaviour and accessibility, not implementation details.
- Do not rely on snapshots alone.
- Do not remove or weaken tests to make a change pass.

### 13.5 Manual verification

Automated tests do not replace manual checks. When relevant, verify:

- The full user path, including back/cancel and refresh.
- Keyboard-only use.
- Screen-reader names and live announcements.
- Reduced-motion behaviour.
- Empty, error, slow, and offline states.
- Workspace switching and permission changes.
- Mobile and tablet layouts.
- No console errors or hydration warnings.

### 13.6 Honest reporting

- Do not claim a command passed unless it was executed and passed.
- Distinguish pre-existing failures from regressions introduced by the change.
- If a check could not run, say why.
- Document unresolved failures and blockers instead of hiding them.

---

## 14. Documentation and Phase Management

### 14.1 Documentation first

Before relevant work, read:

- `AGENTS.md` / `README.md`.
- `PHASES.md`.
- `branding.md`.
- This skill.
- Relevant backend API documentation and feature notes, if available.

Do not modify `AGENTS.md`, `README.md`, `branding.md`, or `PHASES.md` unless the task explicitly asks for a documentation update. This skill file is the designated shared frontend guide.

### 14.2 Phase workflow

1. Identify the active phase and its deliverable.
2. Verify the previous phase's dependencies and acceptance criteria.
3. Inspect existing implementation; do not rebuild working features.
4. Plan the smallest safe change.
5. Implement only the phase's scope and necessary supporting work.
6. Run the applicable checks.
7. Update `PHASES.md` only when progress is verified.
8. Report completed work, verification, and blockers.

### 14.3 Phase statuses

Use: **Not Started**, **In Progress**, **Blocked**, **Completed**.

A phase is not complete because its UI exists. It must satisfy its functional requirements, integrations, and validation requirements.

### 14.4 Current phase evidence

Verified on 2026-11-03:

- `PHASES.md` now contains an explicit phase status summary: Phase 0 **Completed**, Phase 1 **Completed**, Phases 2–33 **Not Started**.
- Phase 0 foundation work is complete: audit recorded, `vitest.config.mts` restored, `.env.example` added, and lint, type-check, tests, and production build verified.
- Phase 1 is complete: brand-aligned tokens, Inter typography, light/dark/system themes, shared motion, `Dropdown`, `ThemeToggle`, `PageHeader`, and `PageContainer` are implemented and tested.
- Phase 2 (application layout and navigation) has not been implemented.

Therefore:

- Phase 2 is the next incomplete phase. Do not start it without an explicit instruction from the user.
- Confirm the active phase with the user or the tracker before starting.
- Update phase status only after the corresponding requirements and checks have been verified.

### 14.5 Blockers and missing contracts

If a backend dependency is missing:

1. Confirm it is genuinely missing.
2. Document the required endpoint or capability and why the frontend needs it.
3. Identify the affected UI and phase.
4. Implement only what can be completed safely.
5. Do not fake a successful integration.

Record blockers honestly in the task report and, when appropriate and authorised, in `PHASES.md`.

### 14.6 Documentation consistency

- Keep documentation aligned with actual implementation.
- Do not document a feature as complete when it is only designed or partially built.
- Do not invent APIs, statuses, permissions, or product rules.
- If documentation and code disagree, report the discrepancy and use the precedence rules in Section 1.4.

---

## 15. Git and Change Management

### 15.1 Before changing anything

```bash
git status
git branch --show-current
```

- Identify pre-existing modified, deleted, and untracked files. Preserve them.
- Never discard user changes.
- Never assume a clean working tree.

At audit time the working tree contains uncommitted documentation changes, untracked `branding.md`, and deleted test/public files. Treat these as user work. Do not revert, restore, or commit them unless explicitly instructed.

### 15.2 Branch rules

- Never develop or commit directly on `main`.
- Use a dedicated feature branch for the task or phase, for example:
  - `feature/frontend-authentication`
  - `feature/frontend-workspace-management`
  - `feature/frontend-messaging`
  - `fix/frontend-navigation`
  - `docs/frontend-documentation`
- If the current branch is wrong for the task, report it before changing branches.
- Do not delete branches without approval.
- Do not merge into `main` without explicit approval.
- Never force-push or rewrite history.

### 15.3 Commits and pushes

- Commit only when the task or project workflow authorises it.
- Do not commit unrelated files.
- Review the diff before committing.
- Confirm no secrets, credentials, or private data are included.
- Use clear messages, for example:
  - `feat(frontend): implement workspace switcher`
  - `fix(frontend): resolve workspace navigation issue`
  - `docs(frontend): update shared skill guidance`
- Push the feature branch only when requested.
- Do not automatically merge or deploy.

### 15.4 Scope discipline

- Keep the change focused on the assigned task.
- Do not refactor unrelated code.
- Do not redesign unrelated pages.
- Do not delete working functionality because another approach seems cleaner.
- If a related issue belongs to another phase, document it instead of expanding scope.
- Address it only if it blocks the current task or the user approves the extra work.

---

## 16. Rules for Both OpenCode and Kiro

This document is intentionally tool-independent. Both agents must follow the same standards.

### 16.1 Shared requirements

Both agents must:

- Read the same root documentation and this skill.
- Use the same brand tokens, component patterns, and architecture.
- Apply the same TypeScript, accessibility, responsive, security, and performance standards.
- Verify backend contracts before integration.
- Run the same available checks and report results honestly.
- Preserve user changes and follow the same Git rules.
- Keep work within the assigned phase.
- Report files changed, behaviour implemented, checks run, and outstanding issues.

### 16.2 Tool independence

Do not rely on tool-specific:

- Commands, flags, or configuration files.
- Agent syntax, prompts, or orchestration features.
- Session, worktree, or model behaviour.
- Automatic commit, push, merge, or deploy behaviour.

If a tool offers an automation that conflicts with these rules, the rules win. Do not use a tool feature to bypass review, testing, or approval.

### 16.3 When to ask

Ask for clarification when ambiguity materially affects:

- Product behaviour.
- Architecture.
- Security or privacy.
- Data handling.
- Workspace isolation.
- Permissions.
- Brand direction.
- Scope or phase boundaries.

Before asking, inspect the documentation and code. Ask a focused question with the options and your recommendation.

---

## 17. Definition of Done

A frontend change is complete when:

- It meets the assigned task and phase requirements.
- It follows the Nexus design system and existing component conventions.
- It is responsive across supported sizes.
- It is keyboard accessible and screen-reader friendly.
- It uses strict TypeScript types and no unexplained `any` or suppressions.
- It integrates only with verified backend contracts.
- It handles loading, success, empty, error, unauthorised, and offline states as relevant.
- It respects authentication, permissions, workspace isolation, and privacy.
- It does not break existing functionality.
- It adds or updates tests where behaviour warrants it.
- Applicable lint, type-check, test, and build commands have been run.
- Remaining limitations and blockers are documented honestly.

### Completion report template

```text
Task / Phase:
Status: Completed | In Progress | Blocked

Implemented:
- ...

Files changed:
- ...

Backend / real-time integration:
- Endpoints/events used (or "none"):
- Contract verification:
- Missing dependencies:

Validation:
- npm run lint: pass/fail/not run
- npx tsc --noEmit: pass/fail/not run
- npm test: pass/fail/not run (reason)
- npm run build: pass/fail/not run
- Manual checks:

Outstanding issues / blockers:
- ...

Git:
- Branch:
- Commit:
- Push status:
```

---

## 18. Known Gaps and Unresolved Contradictions

These are recorded so agents do not silently guess. Resolve them with the project owner when they affect the task.

1. **Role model mismatch.** `branding.md` defines Company/Institution organisation roles and separate project roles. `types/ui.ts` declares `OWNER | PM | MEMBER | VIEWER | COLLABORATOR`, which is a legacy/placeholder union. Backend permissions are authoritative; align types in Phase 7.
2. **Task status contract.** `types/ui.ts` and the design tokens define a status workflow, but the backend contract has not been verified in this repository. Confirm transitions before building controls.
3. **Phase status drift risk.** `PHASES.md` records Phases 0 and 1 as Completed. Keep those markers accurate; do not mark a phase complete without implementation and check evidence.
4. **No API/auth/real-time layers implemented.** `lib/`, `services/`, and `hooks/` do not exist, and no auth, workspace, or socket provider exists. Documentation references are plans, not current capabilities.
5. **Unconfirmed environment configuration.** `.env.example` documents `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` as placeholders only; no real environment values or backend-confirmed names exist in this repository.
6. **Select chevron is not theme-aware.** The chevron is a static data-URI in `components/ui/Select.tsx`. It uses the muted grey and is legible in both themes, but it should be replaced by a token-driven icon when an icon system is approved.
7. **No icon library.** Inline SVG remains the convention; do not introduce an icon package without approval.
8. **Document filename casing.** The canonical agent instructions are `AGENTS.md` and the roadmap is `PHASES.md`; there is no `agent.md` or `phases.md`. This shared skill is `nexus-frontend/SKILL.md`.
9. **Duplicate documentation.** `README.md` and `AGENTS.md` are currently identical, and derivative agent skill copies exist in tool-specific folders. Do not create additional duplicate `skill.md` files or diverge their standards.

---

## 19. Final Operating Instruction

Build Nexus as one coherent, professional product.

- Understand the product before changing the interface.
- Inspect the repository before assuming anything exists.
- Follow the brand and the implemented token layer.
- Reuse components and patterns.
- Keep TypeScript strict and components focused.
- Respect permissions, privacy, and workspace isolation.
- Keep message unread counts separate from general notifications.
- Never let AI act without approval or rewrite user writing silently.
- Integrate only with verified backend contracts.
- Test what you change and report honestly.
- Stay within the assigned phase.
- Preserve user work and never perform destructive Git operations without approval.

When the documentation is silent, inspect the code. When the code and documentation conflict, report the conflict rather than inventing a third interpretation.
