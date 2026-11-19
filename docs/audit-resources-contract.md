# PITERON Frontend — Resources API Contract Audit

**Branch:** `fix/resources-api-paths` (from latest `main`, commit `a16cf2e`)
**Date:** Thu Nov 19 2026
**Status:** Phase 1 audit + Phase 2 fixes — uncommitted

Source of truth: the backend contract supplied for this task. All paths below are the
service-level paths passed to `apiRequest` (the proxy prepends `/api/backend`, so the
full browser URL is `/api/backend/...`; the backend mounts the same paths under
`/api/v1`).

- Workspace resources base: `/workspaces/:workspaceId/resources`
- Project resources base: `/workspaces/:workspaceId/projects/:projectId/resources`

Response/request body shapes are **not** part of the contract. Every shape assumed by
callers is listed under SHAPE-ASSUMPTION and is left unchanged.

## Phase 1: exported function audit

| Exported function | Frontend method + URL (before) | Backend method + URL (contract) | Status |
|---|---|---|---|
| `getOverview(workspaceId, projectId)` | GET `/workspaces/:ws/projects/:pid/overview` | GET `/workspaces/:ws/projects/:pid/resources/dashboard/overview` | PATH-MISMATCH |
| `getDashboardPreferences(workspaceId)` | GET `/workspaces/:ws/dashboard/preferences` | GET `/workspaces/:ws/projects/:pid/resources/dashboard/preferences` | PATH-MISMATCH (workspace-scoped, no projectId; route only exists on project router) |
| `saveDashboardPreferences(workspaceId, input)` | PATCH `/workspaces/:ws/dashboard/preferences` | PUT `/workspaces/:ws/projects/:pid/resources/dashboard/preferences` | PATH-MISMATCH + METHOD-MISMATCH |
| `listFolders(workspaceId, parentId?)` | GET `/workspaces/:ws/folders?parentId=…` | GET `/workspaces/:ws/resources/folders` | PATH-MISMATCH; `parentId` query param name is SHAPE-ASSUMPTION |
| `createFolder(workspaceId, input)` | POST `/workspaces/:ws/folders` | POST `/workspaces/:ws/resources/folders` | PATH-MISMATCH |
| `updateFolder(workspaceId, folderId, input)` | PATCH `/workspaces/:ws/folders/:folderId` | PATCH `/workspaces/:ws/resources/folders/:folderId` | PATH-MISMATCH |
| `deleteFolder(workspaceId, folderId)` | DELETE `/workspaces/:ws/folders/:folderId` (assumes `cascadeCount` in DELETE response) | GET `/workspaces/:ws/resources/folders/:folderId/delete-impact` then DELETE `/workspaces/:ws/resources/folders/:folderId` | PATH-MISMATCH + SHAPE-ASSUMPTION |
| `listBookmarks(workspaceId)` | GET `/workspaces/:ws/bookmarks` | GET `/workspaces/:ws/resources/bookmarks` | PATH-MISMATCH |
| `createBookmark(workspaceId, input)` | POST `/workspaces/:ws/bookmarks` | POST `/workspaces/:ws/resources/bookmarks` | PATH-MISMATCH |
| `updateBookmark(workspaceId, bookmarkId, input)` | PATCH `/workspaces/:ws/bookmarks/:bookmarkId` | PATCH `/workspaces/:ws/resources/bookmarks/:bookmarkId` | PATH-MISMATCH |
| `deleteBookmark(workspaceId, bookmarkId)` | DELETE `/workspaces/:ws/bookmarks/:bookmarkId` | DELETE `/workspaces/:ws/resources/bookmarks/:bookmarkId` | PATH-MISMATCH |
| `uploadFolder(params)` | No direct contract URL; loops over `uploadFile()` which posts multipart to `/workspaces/:ws/files` (a separate verified files endpoint). Backend has `POST /files/folder-upload` on both routers, but its multipart field names/response are not supplied. | UNVERIFIED / SHAPE-ASSUMPTION — no path invented; left as-is. |

### Status key
- **MATCH** — method and path already agree with the contract.
- **PATH-MISMATCH** — wrong URL; fixed in Phase 2.
- **METHOD-MISMATCH** — wrong HTTP verb; fixed in Phase 2.
- **SHAPE-ASSUMPTION** — request/response body or query shape assumed; not verifiable from the contract, left unchanged.
- **UNVERIFIED** — no equivalent contract route used by the frontend function; no path invented.

## SHAPE-ASSUMPTION inventory (caller assumptions — unchanged)

### `app/app/projects/[projectId]/page.tsx` — `getOverview` result (`OverviewData`)
Assumes a top-level object with all of these arrays and maps over each:

- `recentItems: Array<{ id: string; type: 'task'|'doc'|'file'; title: string; url: string; updatedAt: string }>`
- `docs: Array<{ id: string; title: string; updatedAt: string; /* also typed: taskId, createdById, createdBy{id,name} */ }>`
- `bookmarks: Array<{ id: string; title: string; url: string }>`
- `folders: Array<{ id: string; name: string; itemCount: number; /* also typed: workspaceId, parentId, createdAt, updatedAt */ }>`
- `files: Array<FileSummary>` (`id, fileName, mimeType, sizeBytes, createdAt, uploadedById`)
- `lists: Array<{ id: string; name: string; taskCount: number; completedCount: number; url: string }>`
- `workload: Array<{ userId: string; user: { id: string; name: string }; statusCounts: Record<string, number>; total: number }>`

### `components/dashboard/DashboardGrid.tsx` — preferences shape
- `getDashboardPreferences` returns `{ cards: Array<{ id, label, visible, position }>, autoRefresh: boolean }`; if `cards` is a non-empty array it replaces the defaults.
- `saveDashboardPreferences` sends `{ cards, autoRefresh: false }` and expects `{ cards }` back.
- Defaults: all seven cards (`recent`, `docs`, `bookmarks`, `folders`, `files`, `lists`, `workload`) visible, positions 0–6.
- On preference load/save failure the UI keeps defaults / shows an error alert and remains usable (no localStorage).

### `components/resources/BookmarkDialog.tsx` — `createBookmark` result
- Typed as `Bookmark { id, title, url, createdAt }`; the dialog only awaits success and refreshes, it does not read response fields.

### `components/resources/ResourcesPage.tsx`
- Uses `listFiles`/`downloadFile`/`fetchFileBlob`/`deleteFile` from `services/files.ts` (separate verified contract), and `BookmarkDialog` for `createBookmark`.
- Resource row item shape: `{ id, name, type: 'file'|'folder', mimeType?, sizeBytes?, createdAt, updatedAt, uploadedBy }`.
- Delete confirmation currently calls `deleteFile` (file delete only); there is no folder-delete confirmation UI in this screen, so the delete-impact flow is implemented at the service layer.

## Phase 2: fixes applied

1. `getOverview` → `GET /workspaces/:ws/projects/:pid/resources/dashboard/overview`.
2. `getDashboardPreferences(workspaceId, projectId)` and
   `saveDashboardPreferences(workspaceId, projectId, input)` → project-scoped
   `/workspaces/:ws/projects/:pid/resources/dashboard/preferences`; save uses **PUT**.
3. All workspace folder/bookmark paths re-based under `/workspaces/:ws/resources/…`,
   including `/:id` PATCH and DELETE paths.
4. Delete-impact flow: new exported `getFolderDeleteImpact(workspaceId, folderId)`
   issues `GET …/folders/:id/delete-impact`; `deleteFolder` calls it first, then
   `DELETE …/folders/:id`, and derives `cascadeCount` from the impact response
   (never from the DELETE response).
5. `DashboardGrid` gains a `projectId` prop; the project Overview page passes it.
6. Service tests assert exact URL and method for every call.

## Phase 3: verification

- `npx tsc --noEmit` — passes (exit 0, no output).
- `npm run build` — passes (exit 0; 67 routes prerendered).
- `npx vitest run services/__tests__/resources.test.ts` — 13/13 pass.
- `npx eslint` on all changed files — 0 errors.
- Full `npm test` — 864 pass / 20 fail / 884 total. The 20 failures are **pre-existing**: the same 20 failures (same 8 files — `playwright/tests/e2e-tests.spec.ts`, `lib/app-navigation.test.ts`, `services/__tests__/notifications.test.ts`, `services/__tests__/search.test.ts`, `app/app/messages/page.test.tsx`, `app/app/workspaces/page.test.tsx`, `components/layout/__tests__/AuthenticatedShell.test.tsx`, `app/workspaces/invitations/accept/InvitationAcceptClient.test.tsx`) were reproduced on a clean checkout of `main` (commit `a16cf2e`) by stashing all changes in this branch. None involve `services/resources.ts`, `DashboardGrid.tsx`, the project Overview page, or the new resources test.

## UNVERIFIED list (needs backend detail before any change)

| Item | What it needs |
|---|---|
| `uploadFolder` folder-upload path | Multipart field names and response shape for `POST /workspaces/:ws/resources/files/folder-upload` (or the project equivalent) before switching from per-file `uploadFile` calls. |
| `parentId` query on `listFolders` | Confirmation of the exact query parameter name/shape for "list filters" on `GET /folders`. |
| All response shapes in the table above | Request/response schemas for overview, preferences, folders, bookmarks, and delete-impact (field names, envelope, `cascadeCount` field name). |
| Workspace-level overview/recent/preferences | Contract confirms these exist **only** on the project router; no workspace-level attempt will be added. |
