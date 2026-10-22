---
name: nexus-testing-deployment
description: Testing strategy, quality checks, environment configuration, and deployment standards for the Nexus frontend — from Phase 1 test setup through Phase 14 production readiness.
---

# Nexus Testing and Deployment Skill

## 1. Purpose

This skill defines testing, quality verification, environment configuration, and deployment standards for the Nexus frontend.

Before implementing any test or deployment change:
1. Read `AGENTS.md`.
2. Read `PHASES.md` — Phase 13 (Testing, Security, Reliability) and Phase 14 (Production Configuration and Deployment) have detailed checklists.
3. Confirm available scripts in `package.json`.

## 2. Current State (Phase 0 Baseline)

| Check | Status |
|---|---|
| Available scripts | `dev`, `build`, `start`, `lint` |
| Test framework | **Not installed** — no `test` script |
| TypeScript check | Via `npm run build` or `npx tsc --noEmit` |
| Lint | `npm run lint` (eslint 9.x) |

A test framework must be selected and installed in Phase 1. Do not add a `test` script or import test utilities before the framework is chosen.

## 3. Test Framework Selection (Phase 1)

Select **one** of the following (confirm with team before Phase 1):

- **Recommended:** Vitest + `@testing-library/react` + `@testing-library/jest-dom`
- Alternative: Jest + `@testing-library/react` (heavier setup with Next.js)

After selection:
1. Install the chosen packages.
2. Add a `test` script to `package.json`.
3. Configure the test runner to support Next.js App Router and TypeScript.
4. Write initial tests for `Button`, `Input`, `Modal`, `ConfirmDialog`, and `EmptyState` (Phase 1 deliverable).

## 4. Testing Strategy by Phase

### Phase 1 — Unit tests for core UI components
- Button: renders variants, handles click, shows loading state, disabled state prevents click.
- Input: renders with label, shows error state, accessible.
- Modal: focus trap, Escape closes, accessible title.
- ConfirmDialog: does not call `window.alert()`, triggers callback on confirm.
- EmptyState: renders icon, title, description, and optional action.

### Phase 3 — Authentication tests
- `useAuth` hook unit tests (mock `services/auth.ts`).
- Login form: validation errors, loading state, API error display.
- Route protection: unauthenticated access redirects to `/login`.
- Session restoration: `getMe` success sets user; `401` sets unauthenticated.

### Phase 4 — Workspace / permission tests
- `usePermissions` hook with each role value.
- Member list: role badge rendering, remove confirmation.
- Role-gated button: Owner sees delete; Member does not.

### Phase 5 — Project tests
- Project list: filtering, sorting, empty state.
- Project creation: validation, error display.

### Phase 6 — Task tests
- Task card: status badge colors (not color alone).
- Task creation: title required validation.
- Kanban drag: `updateTaskStatus` called; rollback on failure.

### Phase 8 — Messaging tests
- Empty message composer prevents send.
- @mention autocomplete filters members.
- File upload shows progress indicator.

### Phase 9 — Socket tests
- Mock socket, emit `task:updated`, assert Kanban card updates.
- Listener cleanup: no duplicate listeners after remount.
- Notification mark-as-read interaction.

### Phase 13 — Comprehensive coverage
- Unit tests for all service functions (mocked HTTP).
- Unit tests for all custom hooks.
- API error state tests: 401, 403, 404, 422, 500 per service.
- Critical user journey tests (see Phase 13 in `PHASES.md`).
- Socket reconnection test.
- Optimistic update rollback test.
- Security: no secrets in bundle.

## 5. Quality Checks Before Marking Any Phase Complete

Run all applicable checks and fix any failures introduced by the current change:

```bash
npm run lint          # ESLint — must pass with zero errors
npx tsc --noEmit      # TypeScript — must pass with zero errors
npm test              # Test suite — must pass with zero failures (once configured)
npm run build         # Production build — must succeed
```

Do not claim a check passed without running it. If a check does not exist yet, note that explicitly.

## 6. Security Verification Checklist (Phase 13)

Before Phase 13 sign-off:

- [ ] No API keys, tokens, or secrets in the frontend bundle (`npm run build` + bundle inspection).
- [ ] `NEXT_PUBLIC_` variables contain only values intended for public exposure.
- [ ] No `dangerouslySetInnerHTML` usage without sanitization audit.
- [ ] File uploads validate type and size through backend before display.
- [ ] Auth tokens not logged in `console.log` or network requests.
- [ ] AI responses rendered safely — no unsanitized HTML injection.
- [ ] Removing a workspace member calls the backend — it does not only update local state.
- [ ] Role-gated checks are not the sole security mechanism — backend authorization enforces access.

## 7. Reliability Verification Checklist (Phase 13)

- [ ] Socket reconnection: disconnect mid-session → reconnect → state reconciled.
- [ ] Optimistic update rollback: force task status update failure → Kanban card reverts.
- [ ] Expired session handling: simulate `401` mid-session → redirects to login with preserved URL.
- [ ] Network failure in file upload: error state shown, retry available.
- [ ] Form submission during network error: input preserved.

## 8. Environment Configuration

### `.env.example` (maintained from Phase 0)

```dotenv
# Nexus backend REST API base URL
NEXT_PUBLIC_API_URL=http://localhost:5100/api

# Nexus Socket.IO server URL (required from Phase 9)
NEXT_PUBLIC_SOCKET_URL=http://localhost:5100
```

Rules:
- Commit `.env.example` with placeholder values only — never real secrets.
- Keep `.env.local` out of version control (it is in `.gitignore`).
- Update `.env.example` whenever a new required variable is introduced.
- Never populate `NEXT_PUBLIC_` variables with database credentials, AI API keys, JWT secrets, or private tokens.

## 9. Production Build Verification (Phase 14)

Before deploying:

- [ ] `npm run build` passes with production environment variables.
- [ ] Zero type errors in production build.
- [ ] Zero lint errors.
- [ ] No `localhost` or development URLs hardcoded in production code.
- [ ] No secrets in `NEXT_PUBLIC_` variables.
- [ ] Server-only secrets not leaked to the client bundle.
- [ ] Bundle spot-checked for sensitive strings.

## 10. Deployment Checklist (Phase 14)

- [ ] Production environment variables configured in hosting platform (not committed).
- [ ] `NEXT_PUBLIC_API_URL` points to deployed backend.
- [ ] `NEXT_PUBLIC_SOCKET_URL` points to deployed Socket.IO server.
- [ ] Node.js version on hosting platform is compatible with Next.js 16.4.2.
- [ ] WebSocket/long-poll support enabled on hosting platform for Socket.IO.
- [ ] CORS configured correctly between frontend and backend domains.
- [ ] `npm run start` is the correct start command (verify in `package.json`).
- [ ] Static asset caching strategy appropriate.
- [ ] Required HTTP security headers configured (CSP, HSTS, X-Frame-Options) via `next.config.ts`.

**Do not deploy to production without explicit authorization from the project owner.**

## 11. Smoke Test Checklist (Phase 14)

After deploying to staging, verify:

- [ ] Login and session restoration work.
- [ ] Create and view a task.
- [ ] Send a message in a conversation.
- [ ] Receive a real-time notification from another session.
- [ ] No `localhost` references in network requests.
- [ ] WebSocket connection established in staging environment.
- [ ] No secrets visible in browser developer tools.

## 12. DEPLOYMENT.md

Create `DEPLOYMENT.md` in Phase 14 documenting:
- Required environment variables and expected value format (no real secrets).
- Deployment procedure step by step.
- Rollback steps.
- Known production limitations and workarounds.
- Third-party service dependencies (calling SDK, AI provider, Socket.IO gateway).
