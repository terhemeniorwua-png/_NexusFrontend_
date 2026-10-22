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

All components must be: keyboard-navigable, screen-reader compatible, responsive, and using Nexus design tokens.

### Button
- Variants: `primary`, `secondary`, `ghost`, `destructive`.
- Sizes: `sm`, `md`, `lg`.
- States: `loading` (spinner), `disabled`.
- Never use `window.alert()` or `window.confirm()` — use `ConfirmDialog` instead.

### Input
- Types: `text`, `email`, `password`, `search`.
- Always associate with a visible `<label>` (not placeholder-only).
- States: `default`, `error`, `disabled`.

### Other required components
Textarea, Select/Dropdown, Checkbox, Radio, Badge (task status mapped), Avatar, Card, Modal/Dialog (focus trap + Escape), Tooltip, Spinner/Skeleton, EmptyState, ErrorMessage/Alert, ConfirmDialog, Tabs, Breadcrumb.

See `nexus-frontend/references/design-system.md` for full component specifications.

## 5. Layout Components (Phase 2 deliverables)

- `TopNav`: workspace name, avatar, notifications bell, user menu.
- `Sidebar`: navigation links, collapses to mobile nav on < 768px.
- `WorkspaceSwitcher`: shell in Phase 2, real data in Phase 4.
- `MobileNav`: bottom nav or drawer for screens < 768px.
- `PageHeader`: page title + breadcrumb + action slot.

## 6. Accessibility Requirements

**Minimum standard: WCAG 2.1 AA.**

- Semantic HTML for all page structure.
- All form controls associated with `<label>` elements.
- Visible focus indicators on all interactive elements.
- `aria-label` or `sr-only` text for icon-only buttons.
- Color contrast: 4.5:1 for text, 3:1 for UI components.
- Never use color alone to convey information — add icons or text labels.
- Dialogs trap focus; `Escape` closes modals and dropdowns.
- `prefers-reduced-motion` respected for all animations.
- Screen-reader `aria-live` announcements for async state changes.

Run `axe-core` in Phase 12 and fix all AA violations.

## 7. Responsive Design

| Breakpoint | Width | Behavior |
|---|---|---|
| Mobile | 320px–767px | Sidebar collapses, forms full-width |
| Tablet | 768px–1023px | Optional sidebar, two-column layouts |
| Desktop | 1024px+ | Full layout with sidebar |

- No horizontal overflow except intentional Kanban scroll.
- Dialogs usable on touch screens.
- Kanban board has horizontal touch scroll.
- Test at: 320px, 375px, 768px, 1024px, 1440px.

## 8. Design Principles

1. Clear visual hierarchy — headings, actions, content easy to distinguish.
2. Consistent patterns — same action type looks the same across all features.
3. Purposeful animation — disabled under `prefers-reduced-motion`.
4. Useful empty states — every list has guidance when empty.
5. Actionable errors — explain what failed and what to do.
6. Confirmations for destructive actions — always `ConfirmDialog`, never `window.alert()`.
7. Productive over decorative — no gratuitous shadows or animations.
8. One product — consistent nav and global components across all routes.
