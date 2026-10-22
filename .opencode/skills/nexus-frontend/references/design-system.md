# Nexus Frontend — Design System Reference

## Color Palette

| Token Name | Hex | Tailwind Custom Property | Purpose |
|---|---|---|---|
| Background | `#F8FAFC` | `--color-background` | Main page background |
| Surface | `#FFFFFF` | `--color-surface` | Cards, panels, dialogs |
| Secondary surface | `#F1F5F9` | `--color-surface-secondary` | Secondary sections |
| Primary text | `#0F172A` | `--color-text-primary` | Headings, important content |
| Secondary text | `#64748B` | `--color-text-secondary` | Supporting text, placeholders |
| Border | `#E2E8F0` | `--color-border` | Dividers, component edges |
| Primary action | `#2563EB` | `--color-primary` | Buttons, links, focus rings |
| Success | `#059669` | `--color-success` | Success, completion |
| Error / Destructive | `#DC2626` | `--color-error` | Errors, destructive actions |

## globals.css — Tailwind v4 Theme Configuration

Configure in `app/globals.css` using the Tailwind CSS v4 `@theme` directive:

```css
@import "tailwindcss";

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

  /* Typography */
  --font-sans: "Geist Sans", ui-sans-serif, system-ui, sans-serif;

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Do not use `tailwind.config.js` — Tailwind v4 uses CSS-first configuration.

## Task Status Badge Colors

Badge component must use **both color and text/icon** (never color alone):

| Status | Color | Text label |
|---|---|---|
| ASSIGNED | Blue (`#2563EB`) | "Assigned" |
| IN_PROGRESS | Amber | "In Progress" |
| SUBMITTED | Purple | "Submitted" |
| UNDER_REVIEW | Orange | "Under Review" |
| APPROVED | Green (`#059669`) | "Approved" |
| CHANGES_REQUESTED | Red (`#DC2626`) | "Changes Requested" |

## Spacing Scale

Use the Tailwind default spacing scale. Avoid arbitrary values outside the scale in components. For exceptions, document the reason.

## Typography Scale

| Use | Size | Weight |
|---|---|---|
| Page title (h1) | `text-2xl` or `text-3xl` | `font-semibold` |
| Section heading (h2) | `text-xl` | `font-semibold` |
| Sub-heading (h3) | `text-lg` | `font-medium` |
| Body text | `text-sm` or `text-base` | `font-normal` |
| Secondary text | `text-sm` | `font-normal` |
| Label | `text-sm` | `font-medium` |
| Caption / metadata | `text-xs` | `font-normal` |

## Breakpoints

| Name | Width | Notes |
|---|---|---|
| `sm` | 640px | Small breakpoint |
| `md` | 768px | Sidebar collapses below this |
| `lg` | 1024px | Desktop layout |
| `xl` | 1280px | Wide desktop |
| `2xl` | 1536px | Extra wide |

Test at: 320px, 375px (iPhone SE), 768px, 1024px, 1440px, 1920px.

## Component Design Tokens Summary

| Component | Background | Border | Text | Action |
|---|---|---|---|---|
| Page | `background` | — | `text-primary` | — |
| Card | `surface` | `border` | `text-primary` | — |
| Secondary panel | `surface-secondary` | `border` | `text-secondary` | — |
| Primary Button | `primary` | none | white | hover darken |
| Ghost Button | transparent | `border` | `primary` | hover `surface-secondary` |
| Destructive Button | `error` | none | white | hover darken |
| Input | `surface` | `border` | `text-primary` | focus `primary` ring |
| Input (error) | `surface` | `error` | `text-primary` | — |
