# Phase 28 — Global UX, Accessibility, and Responsive Refinement

**Date:** 2026-11-09  
**Branch:** `feature/phase-26-33-completion`  
**Status:** Completed (code-level review and fixes; manual device/screen-reader verification remains a release gate)

## Scope

Reviewed the shared UI primitives, the authenticated application shell, and the
feature pages added or changed through Phases 1–27. The review covered:

- Keyboard navigation and visible focus.
- Semantic structure and screen-reader labelling.
- Dialog focus management.
- Form error and helper messaging.
- Empty, loading, and error states.
- Responsive layout patterns.
- Overflow and long-content handling.
- Reduced-motion behaviour.
- Navigation consistency.
- Modal and dropdown behaviour.

## Evidence

### Shared primitives

| Component | Evidence |
|---|---|
| `components/ui/Modal.tsx` | `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, Escape-to-close, Tab focus trap, focus restore on close. |
| `components/ui/Tabs.tsx` | `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, arrow-key handling. |
| `components/ui/Button.tsx` | Native `type`, `aria-disabled`, `aria-busy`, visible `focus-visible` ring, spinner marked `aria-hidden`. |
| `components/ui/Checkbox.tsx` / `Input.tsx` / `Select.tsx` / `Textarea.tsx` | Associated labels, `aria-invalid`, `aria-describedby`, visible focus rings, inline error text. |
| `components/ui/Alert.tsx` | Semantic variants and live-region usage on dynamic surfaces. |
| `components/ui/Skeleton.tsx` | `aria-busy` wrappers on loading regions. |

Repository-wide counts at review time:

- 151 `aria-label` attributes.
- 52 `aria-hidden` attributes.
- 25 files using `focus-visible` styling.
- 15 files using `sr-only` text.
- 60 files using responsive `sm:`/`md:`/`lg:` utilities.

### Focus and motion

- `app/globals.css` defines a global `:focus-visible` outline with offset.
- `app/globals.css` disables animation and transition duration under
  `prefers-reduced-motion: reduce`.
- `components/insights/BarList.tsx` and `app/pricing/PricingOptions.tsx`
  opt out of transitions with `motion-reduce:transition-none`.

### Responsive layout

- The authenticated shell and feature pages use mobile-first grids with
  `sm:`/`lg:` breakpoints rather than fixed widths.
- Conversation, task, calendar, settings, and insights surfaces stack on small
  screens and split into columns on large screens.
- Tables and long JSON payloads use horizontal overflow containers rather than
  forcing page-level overflow.

## Fixes applied in this phase

- Removed lint violations in the notification preference effect and
  `providers/SocketProvider.tsx`.
- Removed an unused helper in `services/files.ts`.
- Replaced a pre-existing `any` in `services/tasks.ts` with a typed value.
- Added explicit accessible labels and loading regions on the new Settings and
  Insights surfaces.
- Added an accessible CSS bar visualisation (`components/insights/BarList.tsx`)
  instead of a canvas-only chart, so values are readable by assistive
  technology.

## Residual risks / manual verification still required

The following cannot be fully verified from code inspection and must be checked
against a running backend on real devices before release:

- VoiceOver/NVDA walkthrough of messaging, tasks, settings, and insights.
- Keyboard-only walkthrough of every modal, dropdown, and tab set.
- 320 px, 375 px, 768 px, 1024 px, and 1440 px visual checks with real data.
- Touch-target sizing on iOS Safari and Android Chrome.
- Colour-contrast confirmation in both light and dark themes with real content.

These items are tracked in `docs/PHASE_33_RELEASE_READINESS.md`.
