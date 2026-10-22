---
name: nexus-ui-design
description: Nexus design system standards — Tailwind CSS v4 design tokens, reusable UI component library, accessibility requirements, and responsive layout conventions for the Nexus frontend.
---

# Nexus UI Design Skill

## 1. Purpose

This skill defines visual design, component, accessibility, and responsive layout standards for the Nexus frontend. Apply these standards in Phase 1 and maintain them throughout all subsequent phases.

Consult `AGENTS.md` and `PHASES.md` before implementing design changes. Do not redesign unrelated pages when making a focused change.

## 2. Design System — Color Tokens

Use the Nexus palette consistently. In Phase 1, configure these as Tailwind CSS v4 `@theme` custom properties in `app/globals.css`.

| Token | Hex | Purpose |
|---|---|---|
| Background | `#F8FAFC` | Main page background |
| Surface | `#FFFFFF` | Cards, panels, dialogs |
| Secondary surface | `#F1F5F9` | Secondary sections, subtle backgrounds |
| Primary text | `#0F172A` | Headings, important content |
| Secondary text | `#64748B` | Supporting text, metadata, placeholders |
| Border | `#E2E8F0` | Dividers, component boundaries |
| Primary action | `#2563EB` | Primary buttons, active states, focus rings |
| Success | `#059669` | Success indicators, completion badges |
| Error / Destructive | `#DC2626` | Errors, destructive actions |

Do not scatter arbitrary hex values throughout components. Reference design tokens through Tailwind utilities.

## 3. Tailwind CSS v4 Configuration

- Use Tailwind CSS 4.x with the `@tailwindcss/turbopack` plugin.
- Define custom properties in `app/globals.css` using the `@theme` directive.
- Define consistent spacing scale, type scale, border radii, and box-shadow tokens.
- All animations must respect `prefers-reduced-motion`.
- Do not add `tailwind.config.js` — Tailwind v4 uses CSS-first configuration.

Example `@theme` block (adapt to actual implementation):
```css
@theme {
  --color-background: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-secondary: #F1F5F9;
  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --color-border: #E2E8F0;
  --color-primary: #2563EB;
  --color-success: #059669;
  --color-error: #DC2626;
}
```

## 4. Core UI Component Library (Phase 1 deliverables)

All components must be:
- Keyboard-navigable.
- Screen-reader compatible.
- Responsive.
- Using Nexus design tokens.

### Button
- Variants: `primary`, `secondary`, `ghost`, `destructive`.
- Sizes: `sm`, `md`, `lg`.
- States: `loading` (spinner), `disabled` (opacity + cursor).
- Never use `window.alert()` or `window.confirm()` — use `ConfirmDialog` instead.

### Input
- Types: `text`, `email`, `password`, `search`.
- Always associate with a visible `<label>` (not placeholder-only).
- States: `default`, `error` (red border + error message below), `disabled`.
- Include helper text slot.

### Textarea
- Label association required.
- Configurable resize behavior.
- Error state same as Input.

### Select / Dropdown
- Accessible single-select with keyboard navigation.
- Use a custom component — do not rely solely on native `<select>` if custom styling is required.

### Checkbox and Radio
- Accessible, keyboard-focusable, styled consistently.

### Badge
- Map to task states: ASSIGNED (blue), IN_PROGRESS (amber), SUBMITTED (purple), UNDER_REVIEW (orange), APPROVED (green), CHANGES_REQUESTED (red).
- Map to notification and role types.
- Never rely on color alone — include text or icon.

### Avatar
- Image with fallback to initials.
- Sizes: `xs`, `sm`, `md`, `lg`.

### Card
- Surface container with optional header, body, and footer slots.

### Modal / Dialog
- Trap focus within dialog when open.
- Close on `Escape` key.
- Accessible title using `aria-labelledby`.
- Backdrop click to close (configurable).
- Return focus to trigger element on close.

### Tooltip
- Accessible, keyboard-triggerable.
- Do not use hover-only for essential information.

### Spinner / Skeleton
- `Spinner` for inline loading.
- `Skeleton` for loading states of lists, cards, and page regions (match shape of content).

### EmptyState
- Icon, title, description, and optional action slot.
- Required for every list component: tasks, projects, messages, documents, members, notifications, search results.

### ErrorMessage / Alert
- Variants: `info`, `success`, `warning`, `error`.
- Inline field errors and page-level alerts.

### ConfirmDialog
- Reusable destructive-action confirmation.
- Required for: delete project, delete task, delete workspace, remove member.
- Never `window.alert()` or `window.confirm()`.

### Tabs
- Accessible ARIA tab panel pattern.
- Keyboard: arrow keys to switch tabs.

### Breadcrumb
- Accessible navigation landmark using `<nav aria-label="Breadcrumb">`.
- Present on all deep nested pages.

## 5. Layout Components (Phase 2 deliverables)

### TopNav
- Workspace name, user avatar, notifications bell (unread badge), user menu.
- Accessible: keyboard-navigable, all controls labeled.

### Sidebar
- Links: Dashboard, Projects, Messages, Members, Notifications.
- Collapses to drawer or bottom navigation on mobile (< 768px breakpoint).
- Keyboard-navigable, visible focus indicators.

### WorkspaceSwitcher
- Dropdown of accessible workspaces.
- Shell in Phase 2, wired to real data in Phase 4.

### MobileNav
- Bottom navigation bar or slide-out drawer for screens < 768px.

### PageHeader
- Reusable: page title + breadcrumb + action slot.

## 6. Accessibility Requirements

**Minimum standard: WCAG 2.1 AA.**

- Use semantic HTML (`<main>`, `<nav>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`).
- Associate all form controls with `<label>` elements.
- Provide visible focus indicators for all interactive elements.
- Use `aria-label` or `sr-only` text for icon-only buttons.
- Ensure color contrast meets 4.5:1 for text and 3:1 for UI components.
- Do not convey information by color alone — use icons or text labels too.
- Ensure dialogs trap focus and return focus on close.
- `Escape` closes dropdowns, modals, and the command palette.
- Respect `prefers-reduced-motion` for all CSS transitions and animations.
- Announce async state changes to screen readers using `aria-live` regions where appropriate.
- Verify `Tab` order is logical in all forms.

Run `axe-core` accessibility checks in Phase 12 and fix all AA violations.

## 7. Responsive Design

Target breakpoints:

| Breakpoint | Width | Use |
|---|---|---|
| Mobile | 320px–767px | Sidebar collapses, forms full-width |
| Tablet | 768px–1023px | Sidebar optional, two-column layouts |
| Desktop | 1024px+ | Full layout |

Rules:
- No horizontal overflow except intentional scroll areas (Kanban board).
- Dialogs and dropdowns usable on touch screens.
- Kanban board has horizontal touch scroll on mobile/tablet.
- Forms remain usable with on-screen keyboard (viewport does not obscure inputs).
- Test at: 320px, 375px, 768px, 1024px, 1440px.

## 8. Typography and Spacing

- Use Geist Sans (configured in Phase 1) as the primary typeface.
- Maintain semantic heading hierarchy: `h1` → `h2` → `h3` per page — do not skip levels.
- Use consistent line-height, letter-spacing, and font weights from the design token scale.
- Apply consistent spacing scale (avoid arbitrary padding/margin values outside the system).

## 9. Design Principles

1. Clear visual hierarchy — headings, primary actions, and content are easy to distinguish.
2. Consistent patterns — the same action type always looks the same across features.
3. Purposeful animation — transitions aid comprehension; disable them under reduced-motion.
4. Useful empty states — every empty list has guidance.
5. Actionable errors — error messages explain what went wrong and what to do.
6. Confirmations for destructive actions — always use `ConfirmDialog`, never `window.alert()`.
7. Productive over decorative — avoid gratuitous gradients, shadows, and animations.
8. One product — sidebar, navigation, and global components behave consistently across all routes.
