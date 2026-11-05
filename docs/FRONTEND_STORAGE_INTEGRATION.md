# Frontend storage integration status

**Status: Blocked on backend upload contracts**  
**Reviewed:** 2026-11-05

## Current frontend surfaces

The frontend currently has no file selection or upload/download workflow. A repository search found no `input[type=file]`, file upload component, presigned URL client, or file attachment service. `FormData` in the Teams and Workspaces pages is used only to read ordinary form fields. The profile screen edits a user-provided `avatarUrl`; it does not upload a file. The shared `Avatar` component renders that URL in profile and member interfaces.

No new upload control was added because a browser upload workflow cannot be implemented safely against the current backend contracts. No AWS credentials or storage URLs were added to frontend configuration.

## Verified backend contracts

The adjacent backend's `docs/API.md` and registered organization routes expose private organization-logo operations:

| Method and path | Contract | Authorization and limits |
| --- | --- | --- |
| `POST /workspaces/{workspaceId}/company-profile/logo` | Authenticated raw image bytes; matching `Content-Type`; JSON success envelope contains `{ logoReference }` | Active Company owner/admin; PNG, JPEG, or WebP; maximum 2 MiB |
| `GET /workspaces/{workspaceId}/company-profile/logo` | Authenticated response containing raw image bytes, not the standard JSON envelope | Active Company workspace member |
| `DELETE /workspaces/{workspaceId}/company-profile/logo` | Authenticated JSON success envelope; `{ logoReference: null, deleted: boolean }` | Active Company owner/admin |
| `POST/GET/DELETE /workspaces/{workspaceId}/institution-profile/logo` | Same raw-byte upload, raw-byte download, and JSON delete behavior for institution logos | Active Institution owner/admin for writes; active workspace member for reads; same image limits |

These endpoints proxy bytes through the backend's private object-storage adapter. They do **not** return presigned URLs, upload headers, expiry metadata, or upload completion identifiers. There is no existing frontend organization-logo management UI to connect, and this task prohibits adding a new product feature merely because these endpoints exist.

For avatars, the backend only accepts `avatarUrl` through `PATCH /users/me`; there is no avatar upload, replacement, removal, signature-validation, or private download contract. The product requirement documented in `PHASES.md` calls for JPEG/JPG, PNG, WebP, GIF, and AVIF files strictly below 1,000,000 bytes. No frontend file validation or upload control was introduced without the corresponding backend contract.

The backend API documentation and route search expose no general file-attachment upload authorization, completion, download-URL, or deletion endpoints. Database attachment metadata and account-deletion cleanup logic are not a client upload API.

## Contract needed before direct browser uploads

The backend must publish and implement a typed contract for:

1. **Upload authorization:** workspace/resource scope, file name or display name, declared MIME type, and byte size; response with a short-lived upload URL, HTTP method, required headers, expiry, and a stable backend upload/attachment reference.
2. **Upload completion:** only if required by the chosen backend storage workflow; it must accept the stable upload reference and return the permanent attachment record/reference, not the presigned URL.
3. **Authorized retrieval:** by permanent attachment ID/reference, returning a short-lived download URL or streaming the authorized object. Authorization must be checked for the caller and resource on every request.
4. **Deletion:** by permanent attachment ID/reference, with server-side authorization and idempotent result semantics.
5. **Validation and retention:** backend MIME/signature and size rules per resource type, avatar format and strict-size rules, object key ownership, and the existing account-deletion distinction between purely personal and shared attachments.

These are required contract fields, not implemented endpoint names. The frontend must use only the final backend routes, methods, request shapes, and response shapes after they are documented. For direct S3 PUT/GET requests, the frontend must use only the returned method and headers and must not attach the Nexus bearer token. A temporary signed URL must never be stored as the permanent file reference.

## Security and configuration

- The frontend has no AWS credential variables and requires none for the documented same-origin backend API proxy.
- AWS credentials, IAM role selection, bucket policy, public-access blocks, signing, key generation, object validation, deletion retries, and audit records belong to the backend.
- Presigned URLs are bearer-like temporary secrets: do not log them, persist them, include them in analytics, or reuse them as canonical file IDs.
- The browser must not implement AWS SigV4 or connect with long-lived AWS credentials.
- Once a direct browser upload contract exists, deployment must configure S3 CORS for only the real frontend origins and the returned upload method/headers.

## Authentication refresh and storage requests

Storage API requests must use the existing `lib/api.ts` authenticated request path. Protected service calls already retry once after a 401 by awaiting `refreshSession()`. `refreshSession()` now returns one shared in-flight `Promise<AuthResponse>` to concurrent callers, clears stale in-memory access state on failure, and does not retry itself. Upload requests to a presigned URL must be separate from the authenticated Nexus API request and must not include the bearer token.

## Build configuration

The default build previously failed in the custom `@tailwindcss/turbopack` CSS loader worker. The project now uses Tailwind CSS v4's official PostCSS plugin through `postcss.config.mjs`; Turbopack's filesystem root pin remains in `next.config.ts`. The global CSS import and design tokens are unchanged. Current build results are recorded in the task completion report and `PHASES.md`.

## Remaining work

- Implement the backend's AWS SDK v3 storage adapter and upload/retrieval/deletion contracts in the backend repository under an authorized backend task.
- Add the final endpoint and type documentation to the backend API docs.
- Integrate existing frontend flows after those backend contracts are available; add upload, authorization, expiry, deletion, avatar-boundary, and retry tests using mocked backend and presigned responses.
- Verify configured development/test bucket behavior without using production objects. No live AWS request was made for this frontend task.

## Verification — 2026-11-05

- Baseline auth, invitation, billing, legal, profile, workspace, and organization tests passed: 10 files, 66 tests.
- Focused auth, invitation, and legal regression tests passed after the refresh change: 5 files, 42 tests. These include refresh success, rejected/expired refresh, empty refresh response, shared concurrent refresh, invitation loading after success, anonymous behavior without a refresh session, and behavior after refresh rejection. The Terms wording/assertion already matched and required no legal-content change.
- The first full run with Vitest's default worker count had 14 test timeouts (Input, WorkspaceSwitcher, ConfirmDialog, Button, and WorkspaceProvider) and 258 passing tests. At the same time, unrelated backend TypeScript and lifecycle-test processes were consuming CPU; system swap was 4.0 GiB used with about 1 GiB available RAM. Retrying with bounded concurrency completed successfully: `npx vitest run --maxWorkers=2` — 40 files, 272 tests passed.
- `npx tsc --noEmit` passed. `npm run lint` passed with 0 errors and 3 pre-existing unused-function warnings in Discover, Invitations, and Join Requests. `git diff --check` passed.
- Baseline `npm run build` reproduced the CSS worker timeout. After removing the custom `@tailwindcss/turbopack` loader rule and configuring `@tailwindcss/postcss`, final `npm run build` passed with Turbopack and generated all 23 routes. `npx next build --webpack` also passed.
- No authenticated backend file request, browser upload, responsive browser run, or live AWS S3 operation was performed. The backend contracts needed for these tests and flows do not currently exist.
