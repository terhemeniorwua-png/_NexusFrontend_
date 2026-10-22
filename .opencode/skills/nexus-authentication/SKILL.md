---
name: nexus-authentication
description: Authentication flows, session management, route protection, and role-based permissions for the Nexus frontend — login, registration, session restore, and access control patterns.
---

# Nexus Authentication Skill

## 1. Purpose

This skill defines authentication, session, route protection, and role-permission standards for the Nexus frontend. Applies from Phase 3.

Before implementing: Read `AGENTS.md`, read Phase 3 in `PHASES.md`, confirm the backend auth contract.

**BLOCKED until backend authentication contract is confirmed.**

## 2. Architecture

- **Preferred storage:** HttpOnly cookies (per `AGENTS.md`).
- Never store tokens in `localStorage` by default.
- Follow the backend's actual session design — do not invent your own.

### Key files

| File | Purpose |
|---|---|
| `lib/api.ts` | Attaches credentials, handles 401 |
| `services/auth.ts` | login, register, logout, forgotPassword, resetPassword, getMe |
| `providers/AuthProvider.tsx` | React context: user, isAuthenticated, isLoading |
| `hooks/useAuth.ts` | Exposes user, isAuthenticated, isLoading, login, logout |
| `types/auth.ts` | User, LoginRequest, RegisterRequest, AuthResponse, SessionState |

## 3. Authentication Flows

**Login:** Validate → call login service → on success redirect to dashboard or preserved destination → on error show inline message.

**Session restoration:** Call `getMe` on `AuthProvider` init → success sets user → 401 sets unauthenticated (show loading state during restoration).

**Logout:** Call logout service → clear session → redirect to `/login`.

**Expired session:** `lib/api.ts` intercepts 401 → clear auth context → redirect to `/login?redirect=<url>` → restore after re-login.

## 4. Route Protection

Applied in `app/(auth)/layout.tsx`:
- While `isLoading`: show full-screen skeleton.
- If `!isAuthenticated`: redirect to `/login?redirect=<pathname>`.
- Authenticated user at `/login`: redirect to `/dashboard`.

See `nexus-frontend/references/authentication.md` for code patterns.

## 5. Roles and Permissions

| Role | Scope |
|---|---|
| OWNER | Full workspace/project administration |
| PM | Project planning and management |
| MEMBER | Participates in permitted activities |
| VIEWER | Read-only access |
| COLLABORATOR | Access to specifically granted resources |

Confirm exact role strings from the backend. Implement `hooks/usePermissions.ts` using backend-confirmed role values only.

Frontend permission checks improve UX — they do not replace backend authorization.

## 6. Security

- Never log passwords, tokens, or secrets.
- HttpOnly cookies not accessible to JavaScript — reduces XSS exposure.
- `401` responses trigger session expiry flow — never silently ignore.
- Loading state prevents flash of unauthenticated content.
- Frontend route guards are UX enhancements, not security boundaries.
