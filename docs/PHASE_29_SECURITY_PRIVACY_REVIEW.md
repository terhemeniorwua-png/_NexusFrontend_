# Phase 29 — Frontend Security and Privacy Review

**Date:** 2026-11-09  
**Branch:** `feature/phase-26-33-completion`  
**Status:** Completed (code-level review; backend authorisation remains authoritative)

## Scope

Reviewed authentication state, session handling, protected routes, workspace
isolation, permission rendering, file access, OAuth redirects, user-generated
content rendering, browser storage, environment exposure, and error messages.

## Findings and controls

### Authentication and session handling

- `lib/api.ts` keeps the short-lived access token in module memory only. It is
  never written to `localStorage` or `sessionStorage`.
- Refresh and logout requests send the `nexus_csrf` cookie value through the
  `x-csrf-token` header.
- Requests use `credentials: 'include'` so the backend's `HttpOnly` refresh
  cookie is used without exposing it to JavaScript.
- `lib/with-auth-retry.ts` refreshes once on `401` and retries the original
  request, avoiding refresh loops.
- `providers/WorkspaceProvider.tsx` restores the session before loading
  workspace-scoped data and clears workspace state when the active workspace
  changes.
- Logout clears the in-memory access token and workspace-scoped state.

### Protected routes and permission rendering

- `components/layout/AuthenticatedShell.tsx` redirects unauthenticated users
  and renders workspace-scoped navigation only after the session and workspace
  are resolved.
- `lib/permissions.ts` and navigation permission arrays hide actions the user
  cannot perform. These are presentation controls only; the backend still
  authorises every request.
- Private project, channel, file, and document data is fetched through
  authenticated service calls rather than client-side indexes.

### Same-origin API proxy

`app/api/backend/[...path]/route.ts`:

- Allows only known API prefixes (`auth`, `users`, `workspaces`, `invitations`,
  `billing`, `notifications`, `integrations`, `search`, `ai`,
  `privacy-requests`).
- Rejects path segments outside `[a-zA-Z0-9_-]`.
- Forwards only an allowlist of request and response headers.
- Disables caching and follows no redirects except the validated Google OAuth
  start.
- Returns generic error envelopes so upstream internals are not exposed.

### OAuth redirects

- `lib/google-oauth.ts` starts Google OAuth on the backend origin so the OAuth
  state cookie is set by the backend that receives the callback.
- The proxy validates that an OAuth redirect target is HTTPS and
  `accounts.google.com` before forwarding it.
- OAuth intent is stored in `sessionStorage` and removed after use.
- No OAuth client secret exists in the frontend repository or environment.

### User-generated content

- The only `dangerouslySetInnerHTML` usage is the static, non-user-controlled
  theme bootstrap script in `app/layout.tsx`.
- Message, task, document, and profile content is rendered as React text, not
  injected HTML.
- AI output is rendered as text, so it cannot inject markup.

### Browser storage

| Key | Storage | Contents | Sensitivity |
|---|---|---|---|
| `nexus-theme` | `localStorage` | `light` / `dark` / `system` | Non-sensitive preference |
| `nexus-active-workspace` | `localStorage` | Workspace id | Non-sensitive selector; server still authorises access |
| OAuth/invitation/onboarding intent | `sessionStorage` | Flow intent and safe redirect path | Cleared after use; no tokens |
| Access token | Module memory | Bearer token | Not persisted |

No refresh token, password, provider token, or API secret is stored in browser
storage.

### Environment exposure

- `NEXUS_API_URL` is server-only and read by the proxy route.
- `NEXT_PUBLIC_SOCKET_URL` and `NEXT_PUBLIC_BACKEND_ORIGIN` are origins only and
  contain no secrets.
- `.env.example` documents that Google OAuth client credentials belong to the
  backend repository and must never use a `NEXT_PUBLIC_` prefix.

### Error messages

- `ApiRequestError` surfaces backend-provided messages and generic fallbacks.
- Network failures return a connection message rather than raw exception text.
- The API-not-configured message was corrected in this phase to reference the
  server-only `NEXUS_API_URL` instead of a non-existent public variable.

## Fixes applied in this phase

- Corrected the stale `NEXT_PUBLIC_API_URL` configuration message in
  `lib/api.ts`.
- Confirmed the proxy allowlist and segment validation reject unknown prefixes
  and unsafe path segments.
- Confirmed no secrets are present in client bundles or `.env.example`.

## Backend dependencies

- Backend authorisation remains authoritative for every resource.
- Production cookie attributes (`Secure`, `SameSite`, domain, expiry) must be
  verified against the deployed backend.
- File and document access must continue to use backend-authorised streaming or
  signed URLs; the frontend must not cache private binary content beyond the
  active view.
