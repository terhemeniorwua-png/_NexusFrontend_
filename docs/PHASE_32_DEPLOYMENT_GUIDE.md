# Phase 32 — Deployment and Production Configuration Guide

**Date:** 2026-11-09  
**Branch:** `feature/phase-26-33-completion`  
**Status:** In Progress (configuration documented and build validated; production deployment not performed)

## Runtime

- Next.js 16.4.2 (App Router).
- React 19.3.0.
- Node.js 20.9 or newer is required by Next.js 16. The reviewed local runtime is
  Node.js 20.20.0.
- Package manager: npm with `package-lock.json`.

## Environment variables

Only the following variables are required by the current frontend.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXUS_API_URL` | Server only | Yes | Base URL of the Nexus API including `/api/v1`. Read by the same-origin proxy. |
| `NEXT_PUBLIC_SOCKET_URL` | Browser | Yes | Socket.IO origin. WebSocket upgrades connect directly, not through the proxy. |
| `NEXT_PUBLIC_BACKEND_ORIGIN` | Browser | Yes for Google sign-in/Calendar | Backend origin used to start OAuth so the state cookie is set on the backend host. |

Example production values:

```dotenv
NEXUS_API_URL=https://api.example.com/api/v1
NEXT_PUBLIC_SOCKET_URL=https://api.example.com
NEXT_PUBLIC_BACKEND_ORIGIN=https://api.example.com
```

Rules:

- Never commit real secrets.
- Never place provider client secrets in a `NEXT_PUBLIC_` variable.
- Keep local, staging, and production values separate.
- Google OAuth client credentials and callback URLs belong to the backend
  repository.

## Build and run

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test -- --maxWorkers=1
npm run build
npm start
```

`next.config.ts` enables `cacheComponents`, `partialPrefetching`, and pins the
Turbopack root to the checkout directory.

## Backend connectivity

- Browser REST calls go to `/api/backend/*`.
- `app/api/backend/[...path]/route.ts` forwards only allowlisted API prefixes to
  `NEXUS_API_URL`.
- The proxy forwards authentication, content type, cookies, user agent, and CSRF
  headers, and returns the backend's `set-cookie`, content type, cache control,
  and request id headers.
- Private responses are not cached.

## Real-time connectivity

- `lib/socket.ts` connects directly to `NEXT_PUBLIC_SOCKET_URL`.
- The socket authenticates with the in-memory access token and refreshes the
  session if the token is missing.
- The browser must be able to reach the Socket.IO origin over HTTPS/WSS in
  production.
- `NEXT_PUBLIC_SOCKET_URL` must not include a trailing slash.

## OAuth redirect configuration

- Google sign-in and Google Calendar connection start at
  `${NEXT_PUBLIC_BACKEND_ORIGIN}/api/v1/auth/google`.
- The backend must allow the deployed frontend origin as an OAuth return target.
- The frontend callback route is `/auth/google/callback`.
- Verify that the OAuth state cookie is set by the backend host that receives
  Google's callback.

## Health checks

The backend exposes `/health`, `/health/live`, and `/health/ready`. The frontend
does not currently expose its own health endpoint. A platform-level HTTP check
against `/` or a dedicated static page can be used until one is added.

## Rollback

1. Keep the previous deployment available in the hosting platform.
2. Roll back by promoting the previous build or redeploying the previous commit.
3. Re-check `/`, `/sign-in`, `/app`, `/app/settings`, and `/app/insights`.
4. Confirm REST and Socket.IO connectivity after rollback.
5. Do not roll back by force-pushing or rewriting Git history.

## Production verification checklist

These items are **not yet verified** and must be completed against the deployed
environment:

- [ ] Production API base URL responds through `/api/backend`.
- [ ] Sign-in, refresh, logout, and session expiry behave correctly.
- [ ] Google OAuth start and callback complete on the production domain.
- [ ] Socket.IO connects, joins the workspace room, and reconnects.
- [ ] File upload/download works through authorised backend endpoints.
- [ ] Responsive layouts are checked on real devices.
- [ ] Cookies are `Secure`, `HttpOnly` where applicable, and correctly scoped.
- [ ] Error monitoring and approved analytics are configured, if required.
- [ ] Rollback procedure is rehearsed.
