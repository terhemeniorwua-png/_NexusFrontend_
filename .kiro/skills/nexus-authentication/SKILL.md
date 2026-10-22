---
name: nexus-authentication
description: Authentication flows, session management, route protection, and role-based permissions for the Nexus frontend — login, registration, session restore, and access control patterns.
---

# Nexus Authentication Skill

## 1. Purpose

This skill defines authentication, session, route protection, and role-permission standards for the Nexus frontend. These standards apply from Phase 3 and must be maintained in all subsequent phases.

Before implementing any authentication feature:
1. Read `AGENTS.md`.
2. Read Phase 3 in `PHASES.md` for its tasks, backend dependencies, and acceptance criteria.
3. Confirm the backend authentication contract before writing any auth code.

**BLOCKED until backend authentication contract is confirmed.** Do not fabricate a token, cookie, or session strategy.

## 2. Authentication Architecture

### Preferred approach

- `AGENTS.md` specifies **HttpOnly cookies** as the preferred token storage strategy.
- Confirm the exact mechanism with the backend team before implementing.
- Never store passwords, JWTs, or access tokens in `localStorage` or `sessionStorage` by default.
- Follow the backend's actual session design — do not invent your own.

### Key modules (Phase 3 deliverables)

| File | Responsibility |
|---|---|
| `lib/api.ts` | Typed fetch wrapper that attaches auth credentials, handles 401 |
| `services/auth.ts` | API calls: login, register, logout, forgotPassword, resetPassword, getMe |
| `providers/AuthProvider.tsx` | React context: current user, authentication status, loading state |
| `hooks/useAuth.ts` | Consumes AuthProvider: `user`, `isAuthenticated`, `isLoading`, `login`, `logout` |
| `types/auth.ts` | Types: User, LoginRequest, RegisterRequest, AuthResponse, SessionState |

## 3. Authentication Flows

### Login
1. User submits email + password.
2. Call `services/auth.ts → login`.
3. On success: store session per backend contract, redirect to dashboard or preserved destination.
4. On error: display field-level or general error from backend response.
5. Disable submit while in-flight. Prevent duplicate submissions.
6. Do not display different errors for "wrong email" vs "wrong password" if the backend returns a generic message (avoid account enumeration).

### Registration
1. Validate: name required, email format, password requirements (per backend rules).
2. Call `services/auth.ts → register`.
3. On success: redirect or email verification prompt per backend behavior.
4. On error: display backend validation errors (duplicate email, weak password, etc.).

### Session restoration
1. On `AuthProvider` initialization, call `services/auth.ts → getMe`.
2. If successful: set authenticated user in context.
3. If `401`: set unauthenticated state — do not redirect yet (let route guards handle it).
4. Show a loading state while restoration is in progress to prevent flash of unauthenticated content.

### Logout
1. Call `services/auth.ts → logout`.
2. Clear session per backend contract.
3. Redirect to `/login`.
4. Do not leave stale authenticated state after logout.

### Expired session
1. The API client (`lib/api.ts`) intercepts `401` responses from any endpoint.
2. Trigger the session expiry handler: clear auth context, preserve the current URL, redirect to `/login?redirect=<url>`.
3. After re-login, restore navigation to the preserved URL.

### Password recovery
1. Forgot password: submit email → backend sends reset link.
2. Reset password: accept token from URL query parameter, submit new password.
3. Handle: expired token, invalid token, success confirmation.

## 4. Route Protection

### Implementation

- Apply route protection at `app/(auth)/layout.tsx`.
- If `!isAuthenticated && !isLoading`: redirect to `/login`.
- Preserve the intended destination in the redirect: `/login?redirect=/workspace/123/projects`.
- After login, navigate to the preserved destination.

### Redirect loop prevention

- If an authenticated user navigates to `/login` or `/register`: redirect to `/dashboard`.
- If an unauthenticated user navigates to a public page: allow.
- Never redirect loops (auth → login → auth → ...).

### Loading state

- While `isLoading` is true (session restoration in progress): show a full-screen skeleton or spinner, not unauthenticated content.
- Once restoration completes: apply the correct redirect or render the protected page.

## 5. Roles and Permissions

### Defined roles

| Role | Scope |
|---|---|
| Owner | Workspace/project administration |
| PM | Project planning and management |
| Member | Participates in permitted activities |
| Viewer | Read-only access |
| Collaborator | Access to specifically granted resources |

Exact role strings must be confirmed from the backend before implementing `usePermissions`.

### Permission hook (`hooks/usePermissions.ts`)

- Returns boolean permission flags derived from the current user's role in the current workspace/project.
- Do not invent permissions. Derive them from the backend response.
- Example flags: `canDeleteWorkspace`, `canInviteMembers`, `canManageRoles`, `canCreateProject`, `canEditTask`.

### Applying permissions in UI

- Hide or disable actions the user cannot perform (improves UX).
- **Never treat frontend permission checks as a security boundary** — the backend must enforce authorization independently.
- Handle `403 Forbidden` responses gracefully: display an access-denied state, not raw error JSON.
- Do not expose restricted information in rendered HTML even if the action button is hidden.

## 6. Security Requirements

- Never log passwords, access tokens, refresh tokens, or session secrets.
- Never expose auth tokens in DOM attributes, URL parameters, or `console.log`.
- Prefer HttpOnly cookies — they are not accessible to JavaScript, reducing XSS exposure.
- If browser-accessible tokens are required, document the security rationale and minimize exposure.
- Do not cache authenticated user data in a way that leaks between user sessions.
- Destructive account actions (delete account, change email) must use confirmation dialogs.
- Frontend route protection improves UX — it does not replace backend authorization.

## 7. Email Verification

- If the backend requires email verification, create:
  - A "verification pending" page shown after registration.
  - A confirmation-link handler route: `app/(public)/verify-email/page.tsx`.
- If the backend does not yet implement verification, create the UI shell and mark the integration as **BLOCKED**.

## 8. Workspace Invitation Acceptance

- Implement `app/(public)/invite/[token]/page.tsx`.
- Accept an invitation token from the URL.
- Call the backend invitation-acceptance endpoint.
- For new users: redirect through registration flow.
- For existing users: redirect to the workspace after acceptance.
- Handle: expired token, already-accepted invitation, invalid token.
- Coordinate the boundary between Phase 3 and Phase 4 to avoid duplication.

## 9. Testing Requirements

- Unit tests for `useAuth` hook (mock `services/auth.ts`).
- Component tests for login form: validation errors, submit loading state, API error display.
- Route protection test: unauthenticated access to a protected route redirects to `/login`.
- Session restoration test: `getMe` success sets authenticated state; `401` sets unauthenticated.
- Redirect loop test: authenticated user hitting `/login` is redirected to `/dashboard`.
