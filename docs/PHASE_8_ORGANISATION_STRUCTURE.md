# Phase 8 — Organisation Structure Frontend

**Status: In Progress**  
**Last checked:** 2026-11-05

## Implemented

- `services/organization-structure.ts` consumes the backend's workspace-scoped department, team, and institution-group routes through the existing API client.
- `/app/teams` provides team creation and editing, team lead assignment, team member assignment/removal, team archival, institution department association, department create/rename, and department member assignment.
- `/app/groups` provides institution group create/edit/delete and member/lead management.
- Sidebar navigation exposes Teams and structure to company/institution workspaces and Institution groups to institution workspaces.
- API client contract tests check HTTP paths, methods, bodies, and authenticated proxy use.

## Authorization and data scope

The backend is authoritative for access checks. The UI displays API errors (including permission failures) and does not infer management permission from an unverified client role. Workspace members are loaded from the active workspace endpoint. Group membership visibility is supplied by the backend. Team membership summaries are included only where the individual team member endpoint permits access; inaccessible team rosters are omitted. The backend remains responsible for preventing cross-workspace reads and writes.

The frontend does not assume unprovided resource capability flags. It displays controls according to the available role/permission context, submits only documented operations, and surfaces backend authorization failures. A separate actor-capability response is not an accepted requirement or blocker for this phase.

## Backend contracts verified

The backend checkout at `/home/philip-iorwua/Desktop/__NexusBackend__` contains registered, implemented contracts:

- Departments: `GET/POST /workspaces/{workspaceId}/departments`, `PATCH /.../departments/{departmentId}`, `POST /.../{departmentId}/members`, and `DELETE /.../{departmentId}/members/{targetUserId}`.
- Teams: list/create/get/update/archive/delete, member list/add/update/remove, and team lead assignment under `/workspaces/{workspaceId}/teams`.
- Institution groups: list/create/update/delete and member list/add/update/remove under `/workspaces/{workspaceId}/institution-groups`.

## Remaining dependencies and limitations

- The backend has no department-members list endpoint. Current frontend can assign a member and show aggregate counts but cannot verify/display department rosters or offer safe per-member removal. Backend dependency: expose authorized department membership records before that UI is added.
- No team activity API is registered. Team activity view depends on an approved backend route/contract and cannot be implemented against the current API.
- Team and institution-group member-list routes are present in the backend API/OpenAPI; those roster APIs are not missing contracts.
- A dedicated `/app/teams/{teamId}` page now displays team details and its authorized member roster; activity remains unavailable.
- Membership overview is permission-filtered by backend-readable rosters. A count does not reveal membership identities, and inaccessible rosters are not inferred.
- End-to-end integration against a configured backend session and representative Company/Institution workspaces remains necessary; mocked service tests alone do not prove live integration.

## Validation

Results from 2026-11-05:

- `npx vitest run services/__tests__/organization-structure.test.ts` — passed, 3 tests.
- `npx tsc --noEmit` — passed.
- `npm run lint` — passed.
- `npm test` — 36 files passed; 2 files failed, with 261 tests passed and 3 failed (264 total). Existing failures are in invitation acceptance tests (two failures: test mock returns `undefined` for `refreshSession`, then `.then` is called) and the Terms policy page test (assertion expects obsolete exact 30-day sentence). No Phase 8 test failed.
- `npm run build` — failed before application compilation in `app/globals.css`: Tailwind Turbopack worker timed out/crashed. It also reports the existing parent-directory `pnpm-lock.yaml` warning. No successful production build is claimed.
- Live authenticated backend integration and responsive browser/E2E validation were not run; no configured user session/workspace was exercised. Service tests validate request contracts only.

No tests or checks were run against production data or a real storage system.

## Phase 8 remediation and verification — 2026-11-05

The previous validation record above is historical. The following results supersede it for this remediation run.

### Corrections completed

- Fixed a mismatched JSX wrapper and added the missing `ConfirmDialog` import in `/app/teams`; the page had not been parsed by the earlier test run because the page test was not collected successfully.
- Filtered workspace-kind navigation entries in `buildAppNavigation`, so Company, Institution, and Individual navigation results match the active workspace type. Permission filtering remains in the authenticated sidebar and the backend remains authoritative.
- Added latest-request guards to team and group list loading. A delayed response from an earlier workspace can no longer replace data from the currently selected workspace. The Teams page also clears prior workspace data on a failed current load.
- Added a Teams page regression test for out-of-order workspace responses.
- The current invitation and Terms focused tests pass without production changes. Inspection confirms the invitation session refresh service returns a promise; no current failure reproduces from the earlier report, and the Terms assertion matches the current approved product wording. Those tests were not weakened.

### Backend dependencies and requested contracts

These contracts were checked against the adjacent backend `docs/API.md`, `docs/openapi.yaml`, source routes, and route registrations. The real missing APIs are the first two items below. The former capability-flags proposal is withdrawn: no separate endpoint or response field is needed for the current scope.

1. **Department roster listing**
   - Need: list department-member identities and roles so the UI can show an authorized roster and offer removal only for known assignments.
   - Missing behavior: current routes support listing departments, assignment, and removal by target user ID, but not listing membership records.
   - Proposed route: `GET /workspaces/:workspaceId/departments/:departmentId/members`, with required `workspaceId` and `departmentId` path parameters and optional cursor/limit pagination if roster size requires it.
   - Proposed success data: `{ items: [{ userId, name, email, role: 'HEAD' | 'MEMBER', joinedAt }], nextCursor }` (or a documented unpaginated array for bounded rosters). Keep any aggregate count explicitly separate from the returned page.
   - Authorization: require an active authenticated member and enforce workspace scope; return only identities the caller is allowed to see. Mutations must continue revalidating assignment/removal permissions server-side.
   - Blocks roster display and safe per-member removal; department create/rename/assignment remain available.

2. **Team activity**
   - Need: show the team activity view without fabricated entries.
   - Missing behavior: no team activity route/contract is registered.
   - Proposed route: `GET /workspaces/:workspaceId/teams/:teamId/activity?cursor=&limit=`.
   - Proposed success data: `{ items: [{ id, actor: { id, name }, action, resourceType, resourceId, summary, createdAt }], nextCursor }`; omit private resource details the caller cannot access.
   - Authorization: require active workspace membership plus team/activity visibility; enforce resource visibility for linked resources.
   - Blocks live activity rendering only; team details and membership remain usable.

### Verification results

- Historical validation above predates subsequent Phases 5–7 and Phase 9 work. The full suite on `feature/phase-9-projects` passed 47 files, 311 tests with `npm test -- --maxWorkers=1`; `npm run lint` passed with 0 errors and 0 warnings; `npx tsc --noEmit` passed; `npm run build` passed. These supersede the historical counts.
- Phase 8 AccessState additions (commit `6f78c13` on `feature/frontend-authentication`) added 13 tests for 401/403 handling on teams, groups, and billing pages; full suite after that commit: 47 files, 311 tests passed.

### Remaining limitations and disposition

- Department roster listing and team activity remain backend dependencies with proposed contracts above. Actor-specific resource capability flags are not considered a missing contract or blocker.
- Live authenticated backend integration and browser responsive testing remain manual verification requirements.
- The separate AWS S3 SDK integration request is backend-owned. The current task explicitly prohibits backend-repository modifications; the frontend repository has no storage adapter or backend storage setup guide, so no S3 implementation/configuration was changed here. The backend adapter was inspected read-only and currently uses a custom S3-compatible SigV4 fetch implementation that requires a non-empty endpoint; it does not yet meet the requested AWS SDK v3/default-endpoint requirement. This remains unimplemented and must be handled in an authorized backend task.
- Phase 8 remains **In Progress** pending the user's manual verification. Phase 7 status is unchanged. Phase 9 implementation is authorized separately on `feature/phase-9-projects`.
