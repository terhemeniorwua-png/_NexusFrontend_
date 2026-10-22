---
name: nexus-testing-deployment
description: Testing strategy, quality checks, environment configuration, and deployment standards for the Nexus frontend — from Phase 1 test setup through Phase 14 production readiness.
---

# Nexus Testing and Deployment Skill

## 1. Purpose

This skill defines testing, quality, environment, and deployment standards for the Nexus frontend.

Before implementing: Read `AGENTS.md`, read Phases 13 and 14 in `PHASES.md`.

## 2. Available Scripts

| Script | Command | Status |
|---|---|---|
| Lint | `npm run lint` | Available |
| Type check | `npx tsc --noEmit` | Available via build |
| Build | `npm run build` | Available |
| Test | `npm test` | **Not configured** — add in Phase 1 |

## 3. Test Framework (Choose in Phase 1)

Recommended: Vitest + `@testing-library/react` + `@testing-library/jest-dom`.

Must be selected and confirmed with team before Phase 1. Add `test` script to `package.json` after setup.

## 4. Testing Priorities by Phase

| Phase | Tests required |
|---|---|
| 1 | Button, Input, Modal, ConfirmDialog, EmptyState |
| 3 | useAuth hook, login form, route protection |
| 4 | usePermissions hook, role-gated buttons |
| 6 | Task creation validation, Kanban drag rollback |
| 9 | Socket event handlers, listener cleanup |
| 13 | All services, all hooks, API error states, security checklist |

## 5. Quality Checks Before Marking Any Phase Complete

```bash
npm run lint      # Must pass with zero errors
npx tsc --noEmit  # Must pass with zero errors
npm test          # Must pass (once configured)
npm run build     # Must succeed
```

Do not claim a check passed without running it.

## 6. Security Checklist (Phase 13)

- [ ] No API keys, tokens, or secrets in the bundle.
- [ ] `NEXT_PUBLIC_` variables contain only public values.
- [ ] No `dangerouslySetInnerHTML` without sanitization.
- [ ] Auth tokens not logged.
- [ ] AI responses rendered safely.
- [ ] Backend authorization not bypassed by frontend role checks.

## 7. Environment Configuration

```dotenv
# .env.example — commit with placeholder values only
NEXT_PUBLIC_API_URL=http://localhost:5100/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5100
```

- `.env.local` in `.gitignore` — never commit.
- Update `.env.example` when new variables are introduced.
- Never put secrets in `NEXT_PUBLIC_` variables.

## 8. Production Deployment (Phase 14)

- `npm run build` must pass with production environment variables.
- No `localhost` references in production code.
- WebSocket/long-poll support required on hosting platform for Socket.IO.
- CORS configured between frontend and backend domains.
- Create `DEPLOYMENT.md` with full deployment documentation.

**Do not deploy to production without explicit authorization from the project owner.**

See `nexus-frontend/references/testing-deployment.md` for full checklists.
