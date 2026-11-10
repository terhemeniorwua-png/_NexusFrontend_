# Phase 31 — Performance and Production Optimisation Review

**Date:** 2026-11-09  
**Branch:** `feature/phase-26-33-completion`  
**Status:** Completed (production build and code-level performance review)

## Production build

`npm run build` completed successfully:

- Compilation: 3.2 s.
- TypeScript check: 10.5 s.
- Static generation: 49 pages.
- Route model: static, partial prerender, and one dynamic proxy route.

## Bundle measurements

Measured from `.next/static` after the production build:

| Asset group | Size |
|---|---|
| Client JavaScript chunks | 1.9 MB |
| Total JavaScript under `.next/static` | 1.70 MB |
| CSS | 57.4 KB |
| Largest single chunk | 224.2 KB |
| Second-largest chunk | 159.7 KB |

The application uses Next.js App Router route-level code splitting, so feature
pages are not all loaded in the initial shell. There are currently no explicit
`next/dynamic` imports; route boundaries provide the primary splitting.

## Optimisations confirmed

- **Fonts:** Inter is loaded through `next/font/google` with `display: 'swap'`
  and a CSS variable, avoiding layout shift and render-blocking font requests.
- **Images:** Workspace logos use `next/image` for optimisation. Other UI
  imagery is CSS/vector based.
- **Pagination:** Cursor or offset pagination is implemented in the services
  that support it (channels, documents, events, files, forms, meetings,
  projects, tasks, join requests).
- **Bounded analytics sampling:** `services/insights.ts` caps projects at 50,
  task samples at 8 projects × 100 tasks, and activity at 100 entries, and
  surfaces truncation warnings.
- **Real-time overhead:** A single shared Socket.IO connection is created by
  `providers/SocketProvider.tsx`; listeners are removed on unmount and the
  workspace room is left on switch.
- **Rendering:** Long lists use keyed React lists and derived values are memoised
  where they are expensive (socket context, presence list).
- **Caching:** The backend proxy uses `cache: 'no-store'` for private data.
  Public marketing/policy pages are statically rendered.

## Risks and follow-ups

- The largest chunk (224 KB) should be inspected with a bundle analyser before
  adding more heavy dependencies.
- The authenticated shell ships shared providers to every app route. If startup
  cost becomes an issue, provider work can be deferred or split by route group.
- Insights sampling is intentionally bounded; aggregate reporting should move to
  backend aggregate endpoints when they exist.
- No Lighthouse/Core Web Vitals field data has been collected yet.

## Recommendation

Run Lighthouse against staging on desktop and mobile, capture LCP/CLS/INP, and
add bundle analysis to CI. Re-check the largest chunk after any new dependency.
