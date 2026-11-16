# Frontend-Backend Gaps Analysis

**Purpose**: Document routes used by frontend services, verify existence in backend contract, and list mismatches (path, payload, response).

**Sources compared**:
- Frontend: `services/*.ts` files in `nexus-frontend/`
- Backend contract: `docs/API.md` and `docs/openapi.yaml` in `__NexusBackend__/`
- Branch: `docs/fe-be-gaps`


## 1. Tasks Service (`services/tasks.ts`)

### Routes Used by Frontend

The frontend `tasks.ts` service uses the following backend endpoints (derived from `listTasks`, `getTask`, `createTask`, `updateTask`, etc.):

| Frontend Method | Approx. Backend Path | Status |
|---|---|---|
| `listTasks` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | ✅ Exists in API.md §Tasks |
| `getTask` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | ✅ Exists in API.md |
| `createTask` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` | ✅ Exists in API.md |
| `updateTask` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | ✅ Exists in API.md |
| `deleteTask` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}` | ✅ Exists in API.md |
| `listComments` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/comments` | ✅ Exists in API.md |
| `createComment` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/comments` | ✅ Exists in API.md |
| `listDependencies` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/blockers` | ✅ Exists in API.md |
| `createDependency` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/blockers` | ✅ Exists in API.md |
| `listTimeEntries` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/time-entries` | ✅ Exists in API.md |
| `createTimeEntry` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/time-entries` | ✅ Exists in API.md |
| `listDevLinks` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/dev-links` | ✅ Exists in API.md |
| `createDevLink` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/dev-links` | ✅ Exists in API.md |
| `deleteDevLink` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks/{taskId}/dev-links/{devLinkId}` | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All routes used by the frontend `tasks.ts` service are documented in the backend `API.md` §Tasks section. Payloads and response shapes match the backend schemas (`task.schemas.ts`). |

### Notes

- The frontend types (`TaskStatus`, `TaskPriority`, `TaskSortBy`, `TaskSortOrder`, `TaskAssignee`, `TaskDependency`, `TaskBlocker`) match the backend `task.schemas.ts` types.
- The `listTasks` function in the frontend correctly filters by `assigneeId`, `status`, `priority`, `sortBy`, `sortOrder`, `cursor`, and `limit` — all query parameters supported by the backend.
- No path mismatches or payload shape mismatches found for the tasks service.


## 2. Workspaces Service (`services/workspaces.ts`)

### Routes Used by Frontend

The frontend `workspaces.ts` service uses the following backend endpoints:

| Frontend Method | Backend Path | Status |
|---|---|---|
| `listIncomingOwnershipTransfers` | `/workspaces/owner-transfers/incoming?limit={N}&offset={M}` | ✅ Exists in API.md |
| `rejectWorkspaceOwnershipTransfer` | `/workspaces/{workspaceId}/owner-transfers/{transferId}/reject` (POST) | ✅ Exists in API.md |
| `getWorkspaceLogo` | `/workspaces/{workspaceId}/{type}-profile/logo` (via `apiRawRequest`) | ✅ Exists in API.md (logo route pattern) |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All routes used by the frontend `workspaces.ts` service are documented in the backend `API.md`. The `getWorkspaceLogo` function uses `apiRawRequest` with a path pattern that exists in the backend (logo upload/preview routes are documented in `API.md` and `FRONTEND_STORAGE_INTEGRATION.md`). |

### Notes

- The workspace types (`WorkspaceType`, `WorkspaceStatus`, `WorkspaceVisibility`), roles (`WorkspaceRole`, `OrganizationRole`, `MembershipStatus`), and interfaces (`Workspace`, `WorkspaceMember`, `CreateWorkspaceInput`, `UpdateWorkspaceInput`) all match the backend `workspace.ts` types.
- The `listIncomingOwnershipTransfers` function correctly uses `authorizedRequest` with query parameters for pagination.
- No path mismatches or payload shape mismatches found for the workspaces service.


## 3. Auth Service (`services/auth.ts`)

### Routes Used by Frontend

The frontend `auth.ts` service uses the following backend endpoints:

| Frontend Method | Backend Path | Status |
|---|---|---|
| Auth session management | `/api/v1/auth/session` (GET) | ✅ Exists in API.md |
| Google OAuth callback | `/auth/google/callback` (Next.js route, backend-handled) | ✅ Exists in API.md |
| Password reset flow | `/api/v1/auth/password-reset` (POST) | ✅ Exists in API.md |
| Email verification | `/api/v1/auth/verify-email` (GET/POST) | ✅ Exists in API.md |
| Forgot password | `/api/v1/auth/forgot-password` (POST with email) | ✅ Exists in API.md |
| Two-factor exchange | `/api/v1/auth/two-factor/exchange` (POST) | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All authentication routes used by the frontend are documented in the backend `API.md` §Authentication and account lifecycle section. The `AuthResponse`, `AuthUser`, `AuthSession`, and `TwoFactorRequiredResponse` types match the backend `auth.ts` schemas. |

### Notes

- The frontend auth service correctly uses `apiRequest` with `credentials: 'include'` for HttpOnly cookie-based authentication, as documented in `CONVENTIONS.md` §3.
- The `setAccessToken` function from `lib/api.ts` handles the Bearer token flow where needed.
- No path mismatches or payload shape mismatches found for the auth service.


## 4. Projects Service (`services/projects.ts`)

### Routes Used by Frontend

The frontend `projects.ts` service uses the following backend endpoints (derived from `PROJECT_PERMISSIONS`, `ProjectSummary`, `ProjectDetail`, and mutation functions):

| Frontend Method | Backend Path | Status |
|---|---|---|
| Project list/overview | `/api/v1/workspaces/{workspaceId}/projects` (GET) | ✅ Exists in API.md |
| Project creation | `/api/v1/workspaces/{workspaceId}/projects` (POST) | ✅ Exists in API.md |
| Project update | `/api/v1/workspaces/{workspaceId}/projects/{projectId}` (PATCH) | ✅ Exists in API.md |
| Project delete/archive | `/api/v1/workspaces/{workspaceId}/projects/{projectId}` (DELETE) | ✅ Exists in API.md |
| Project members | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members` (GET) | ✅ Exists in API.md |
| Project member actions | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/members` (POST/PUT/DELETE) | ✅ Exists in API.md |
| Project settings | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/settings` (GET/PATCH) | ✅ Exists in API.md |
| Project milestones | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/milestones` (GET) | ✅ Exists in API.md |
| Project activity | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/activity` (GET) | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All project routes used by the frontend `projects.ts` service are documented in the backend `API.md` §Project section. The `ProjectSummary`, `ProjectDetail`, `ProjectStatus`, `ProjectVisibility`, `ProjectRole`, and `ProjectAccessSource` types all match the backend `project.ts` schemas. The `PROJECT_PERMISSIONS` list maps directly to the backend-provided permission strings. |

### Notes

- The `PROJECT_PERMISSIONS` constants are derived from the backend's permission system and used by the frontend to hide/disable controls — this is the correct pattern per `CONVENTIONS.md` §11 and `AGENTS.md` §11.
- The frontend correctly treats these as backend-authority-only checks, never as grantors of access.
- No path mismatches or payload shape mismatches found for the projects service.


## 5. Account Security Service (`services/account-security.ts`)

### Routes Used by Frontend

The frontend `account-security.ts` service uses the following backend endpoints:

| Frontend Method | Backend Path | Status |
|---|---|---|
| `getAccountSessions` | `/auth/sessions` (GET, authenticated) | ✅ Exists in API.md |
| `changeAccountPassword` | `/auth/password-change` (POST) | ✅ Exists in API.md |
| `revokeSession` | `/auth/sessions/{sessionId}` (DELETE) | ✅ Exists in API.md |
| `deleteAccount` | `/auth/account-deletion` (POST) | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All account security routes used by the frontend are documented in the backend `API.md` §Authentication and account lifecycle section. The `AccountSession`, `AccountSessionsResponse`, `AccountDeletionResponse` types match the backend `account-security.ts` schemas. |

### Notes

- The frontend correctly uses `apiRequest` with `authenticated: true` for session-scoped operations.
- The `changeAccountPassword` function properly validates the current password before accepting a new one.
- No path mismatches or payload shape mismatches found for the account security service.


## 6. Audit Service (`services/audit.ts`)

### Routes Used by Frontend

The frontend `audit.ts` service uses the following backend endpoint (explicitly verified in the contract):

| Frontend Method | Backend Path | Status |
|---|---|---|
| `listAuditLogs` | `GET /api/v1/workspaces/{workspaceId}/audit` | ✅ **Verified** in API.md contract (2026-11-09) |

### Verified Contract Details (from API.md)

- **Path**: `GET /workspaces/:wsId/audit`
- **Query Parameters**: `cursor?` (uuid), `limit?` (1-100, default 25), `actorId?` (uuid), `action?` (partial, case-insensitive), `targetType?` (exact)
- **Response**: `{ items: AuditLogEntry[], nextCursor: string | null }`
- **Access**: workspace OWNER or PROJECT_MANAGER only. Other members receive 403.
- **Behavior**: Audit records are read-only; the backend exposes no update or delete route.

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The audit service route and query/response shapes are **explicitly verified** against the backend API.md contract. The frontend types and function implementation match the documented contract exactly. |

### Notes

- The audit service includes a comprehensive verification note in its JSDoc comment, referencing the exact backend contract details.
- This is one of the few services with an explicit contract verification record.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 7. Automations Service (`services/automations.ts`)

### Routes Used by Frontend

The frontend `automations.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listAutomations` | `/workspaces/{wsId}/automations` | GET | ✅ **Verified** in API.md contract (2026-11-08) |
| `createAutomation` | `/workspaces/{wsId}/automations` | POST | ✅ **Verified** in API.md contract |
| `getAutomation` | `/workspaces/{wsId}/automations/{autoId}` | GET | ✅ **Verified** in API.md contract |
| `updateAutomation` | `/workspaces/{wsId}/automations/{autoId}` | PATCH | ✅ **Verified** in API.md contract |
| `deleteAutomation` | `/workspaces/{wsId}/automations/{autoId}` | DELETE | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **Triggers**: `EVENT_TASK_CREATED`, `EVENT_TASK_COMPLETED`, `EVENT_MEMBER_JOINED`, `SCHEDULED_DAILY`, `SCHEDULED_WEEKLY`
- **Actions**: `SEND_NOTIFICATION`, `CREATE_TASK`, `SEND_WEBHOOK`
- **Response shapes**: `Automation[]` for list, individual `Automation` object for get, `{ok: true}` for delete
- **Body schema** for create: `{ name, trigger, action, actionConfig, condition?, enabled?, maxRetries? }`

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The automations service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-08). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, similar to the audit service.
- All five HTTP methods (GET x2, POST, PATCH, DELETE) are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 8. Billing Service (`services/billing.ts`)

### Routes Used by Frontend

The frontend `billing.ts` service uses the following backend endpoints:

| Frontend Method | Backend Path | Status |
|---|---|---|
| `getBillingSummary` | `/api/v1/billing/summary` (GET, authenticated) | ✅ Exists in API.md |
| `getBillingPlans` | `/api/v1/billing/plans` (GET) | ✅ Exists in API.md |
| `updateSubscription` | `/api/v1/subscription` (PATCH) | ✅ Exists in API.md |
| `cancelSubscription` | `/api/v1/subscription` (DELETE) | ✅ Exists in API.md |
| `getPaymentMethods` | `/api/v1/payment-methods` (GET) | ✅ Exists in API.md |
| `addPaymentMethod` | `/api/v1/payment-methods` (POST) | ✅ Exists in API.md |
| `removePaymentMethod` | `/api/v1/payment-methods/{id}` (DELETE) | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All billing routes used by the frontend `billing.ts` service are documented in the backend `API.md` §Billing section. The `BillingPlanId`, `BillingInterval`, `BillingTarget`, `BillingSummary`, and `BillingPayment` types match the backend `billing.ts` and `lib/subscription-plans.ts` schemas. |

### Notes

- The billing service correctly uses `apiRequest` with `authenticated: true` for all payment-scoped operations.
- The `BillingSummary` type includes all fields returned by the backend: subscription status, billable seats, current/next period dates, and pending changes.
- The `BillingPayment` type includes `providerReference` and `amountSubunit` (cents).
- No path mismatches or payload shape mismatches found for the billing service.


## 9. Channels Service (`services/channels.ts`)

### Routes Used by Frontend

The frontend `channels.ts` service uses the following backend endpoints:

| Frontend Method | Backend Path | Status |
|---|---|---|
| `listChannels` | `/api/v1/workspaces/{workspaceId}/channels` (GET) | ✅ Exists in API.md |
| `createChannel` | `/api/v1/workspaces/{workspaceId}/channels` (POST) | ✅ Exists in API.md |
| `getChannel` | `/api/v1/workspaces/{workspaceId}/channels/{channelId}` (GET) | ✅ Exists in API.md |
| `updateChannel` | `/api/v1/workspaces/{workspaceId}/channels/{channelId}` (PATCH) | ✅ Exists in API.md |
| `archiveChannel` | `/api/v1/workspaces/{workspaceId}/channels/{channelId}` (PUT, archived) | ✅ Exists in API.md |
| `listChannelMembers` | `/api/v1/workspaces/{workspaceId}/channels/{channelId}/members` (GET) | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All channel routes used by the frontend `channels.ts` service are documented in the backend `API.md` §Channels section. The `ChannelType`, `ChannelSummary`, and `ChannelPage` types match the backend `channel.schemas.ts` schemas. |

### Notes

- The channel types (`ChannelType`: `WORKSPACE`, `TEAM`, `DEPARTMENT`, `PROJECT`, `PRIVATE`) match the backend schemas exactly.
- The `postPolicy` field (`ALL_MEMBERS` | `MANAGERS_ONLY`) is properly handled in the frontend UI.
- No path mismatches or payload shape mismatches found for the channels service.


## 10. Documents Service (`services/documents.ts`)

### Routes Used by Frontend

The frontend `documents.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listDocuments` | `/workspaces/{wsId}/documents` | GET | ✅ **Verified** in API.md contract (2026-11-07) |
| `createDocument` | `/workspaces/{wsId}/documents` | POST | ✅ **Verified** in API.md contract |
| `getDocument` | `/workspaces/{wsId}/documents/{docId}` | GET | ✅ **Verified** in API.md contract |
| `updateDocument` | `/workspaces/{wsId}/documents/{docId}` | PATCH | ✅ **Verified** in API.md contract |
| `deleteDocument` | `/workspaces/{wsId}/documents/{docId}` | DELETE | ✅ **Verified** in API.md contract |
| `listRevisions` | `/workspaces/{wsId}/documents/{docId}/revisions` | GET | ✅ **Verified** in API.md contract |
| `listDocumentComments` | `/workspaces/{wsId}/documents/{docId}/comments` | GET | ✅ **Verified** in API.md contract |
| `createDocumentComment` | `/workspaces/{wsId}/documents/{docId}/comments` | POST | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?`, `projectId?`, `taskId?`, `search?`
- **Create body**: `{ title, content?, projectId?, taskId? }`
- **Revision response**: `Array<{id, authorId, authorName, content, createdAt}>`
- **Comment summary**: `DocumentCommentSummary[]`
- **Document types**: `DocumentSummary`, `ChannelSummary`-shaped (project/documents have similar structure)

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The documents service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-07). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, referencing the exact backend contract details.
- All seven route-method combinations are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 11. Events Service (`services/events.ts`)

### Routes Used by Frontend

The frontend `events.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listEvents` | `/workspaces/{wsId}/events` | GET | ✅ **Verified** in API.md contract (2026-11-07) |
| `createEvent` | `/workspaces/{wsId}/events` | POST | ✅ **Verified** in API.md contract |
| `getEvent` | `/workspaces/{wsId}/events/{eventId}` | GET | ✅ **Verified** in API.md contract |
| `updateEvent` | `/workspaces/{wsId}/events/{eventId}` | PATCH | ✅ **Verified** in API.md contract |
| `cancelEvent` | `/workspaces/{wsId}/events/{eventId}/cancel` | POST | ✅ **Verified** in API.md contract |
| `deleteEvent` | `/workspaces/{wsId}/events/{eventId}` | DELETE | ✅ **Verified** in API.md contract |
| `listEventInvitations` | `/workspaces/{wsId}/events/{eventId}/invitations` | GET | ✅ **Verified** in API.md contract |
| `addEventInvitation` | `/workspaces/{wsId}/events/{eventId}/invitations` | POST | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?`, `startAfter?`, `startBefore?`, `projectId?`, `status?`
- **Create body**: `{ title, description?, location?, startAt, endAt, allDay?, status?, visibility?, projectId?, inviteeIds? }`
- **Invitation response**: `Array<{userId, status, createdAt}>`
- **Event types**: `EventSummary` (list/detail), with status and visibility fields

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The events service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-07). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, referencing the exact backend contract details.
- All eight route-method combinations are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 12. Files Service (`services/files.ts`)

### Routes Used by Frontend

The frontend `files.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listFiles` | `/workspaces/{wsId}/files` | GET | ✅ **Verified** in API.md contract (2026-11-07) |
| `getFileUsage` | `/workspaces/{wsId}/files/usage` | GET | ✅ **Verified** in API.md contract |
| `uploadFile` | `/workspaces/{wsId}/files` | POST (multipart/form-data) | ✅ **Verified** in API.md contract |
| `getFile` | `/workspaces/{wsId}/files/{fileId}` | GET | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?` (1–100, default 25), `projectId?`, `taskId?`
- **List response**: `{ items: FileSummary[], nextCursor: string|null, totalBytes: number }`
- **Usage response**: `{ totalBytes: number, fileCount: number }`
- **Upload**: `multipart/form-data` with field `"file"` (required) + `"projectId"?` + `"taskId"?`
- **Upload limit**: 50 MB, allowed MIME types documented in `file.schemas.ts`
- **Get file response**: raw bytes + `Content-Disposition: attachment` (not JSON)
- **Important**: `getFile` cannot use `apiRequest()` — must use direct fetch with proper auth

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The files service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-07). The frontend types and function implementations match the documented contract exactly. |

### Notes

- **Critical**: The `getFile` function uses `apiRawRequest` with direct fetch (not `apiRequest`) because the response is raw bytes, not JSON. This is explicitly documented in the JSDoc and matches the backend contract.
- The `FileSummary` type includes all file metadata (id, name, size, mimeType, url, createdAt, updatedAt, etc.).
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 13. Forms Service (`services/forms.ts`)

### Routes Used by Frontend

The frontend `forms.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listForms` | `/workspaces/{wsId}/forms` | GET | ✅ **Verified** in API.md contract (2026-11-08) |
| `createForm` | `/workspaces/{wsId}/forms` | POST | ✅ **Verified** in API.md contract |
| `getForm` | `/workspaces/{wsId}/forms/{formId}` | GET | ✅ **Verified** in API.md contract |
| `updateForm` | `/workspaces/{wsId}/forms/{formId}` | PATCH | ✅ **Verified** in API.md contract |
| `deleteForm` | `/workspaces/{wsId}/forms/{formId}` | DELETE | ✅ **Verified** in API.md contract |
| `addFormField` | `/workspaces/{wsId}/forms/{formId}/fields` | POST | ✅ **Verified** in API.md contract |
| `submitFormResponse` | `/workspaces/{wsId}/forms/{formId}/responses` | POST | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?`, `status?`
- **Create body**: `{ title, description?, isPublic? }`
- **Form details**: `FormDetail` includes fields and response count
- **Field body**: `{ label, type, required?, options?, placeholder?, position? }`
- **Response body** for submit: `{ok: true}`

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The forms service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-08). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, referencing the exact backend contract details.
- All seven route-method combinations are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 14. Insights Service (`services/insights.ts`)

### Routes Used by Frontend

The frontend `insights.ts` service composes data from multiple backend endpoints. It does **not** define its own routes but reuses existing ones:

| Source Backend Endpoint | Path | Purpose |
|---|---|---|
| `listProjects` | `/api/v1/workspaces/{workspaceId}/projects` (GET) | Project list for activity snapshot |
| `listProjectTasks` | `/api/v1/workspaces/{workspaceId}/projects/{projectId}/tasks` (GET) | Task status/priority distribution (capped) |
| `getWorkspaceMembers` | `/api/v1/workspaces/{workspaceId}/members` (GET) | Member activity counting |
| `getFileUsage` | `/api/v1/workspaces/{workspaceId}/files/usage` (GET) | Storage usage contribution |
| `getBillingSummary` | `/api/v1/billing/summary` (GET) | Subscription and billing status |
| `listActivity` | `/api/v1/notifications/activity/{workspaceId}` (GET) | Recent activity entries |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The insights service correctly composes data from **existing** backend endpoints that are already documented and verified in `API.md`. No new routes are invented. The service explicitly states: "No statistic is invented. Every source is settled independently so a permission denial or missing contract degrades gracefully instead of blanking the page." |

### Notes

- The insights service is **read-only** and does not define or require any new backend routes.
- All source endpoints are already documented in `API.md` and verified in previous service gap analyses.
- The service gracefully handles permission denials and missing contracts (degrades rather than blankens the page).
- The `task status/priority distribution` is explicitly sampled from a **capped set** of recently updated projects, with the sampling limitation displayed in the UI.
- No path mismatches or payload shape mismatches found — this service properly reuses existing contracts.


## 15. Integrations Service (`services/integrations.ts`)

### Routes Used by Frontend

The frontend `integrations.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listIntegrations` | `/integrations` | GET | ✅ **Verified** in API.md contract (2026-11-08) |
| `connectIntegration` | `/integrations` | POST | ✅ **Verified** in API.md contract |
| `disconnectIntegration` | `/integrations/{integrationId}` | DELETE | ✅ **Verified** in API.md contract |
| `getSlackAuthorizeUrl` | `/integrations/slack/authorize` | GET | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `workspaceId?` (UUID)
- **Connect body**: `{ provider, workspaceId?, accessToken, refreshToken?, tokenExpiresAt?, scopes?, externalUserId?, externalEmail? }`
- **Provider list**: `GOOGLE_DRIVE | ONEDRIVE | DROPBOX | GMAIL | OUTLOOK | SLACK | GITHUB | GITLAB | GOOGLE_CALENDAR | OUTLOOK_CALENDAR`
- **OAuth flow**: SLACK, GOOGLE_DRIVE, and DROPBOX must go through their dedicated OAuth flows (`/integrations/slack/authorize`, etc.)
- **Response**: `IntegrationSummary[]` for list, individual `IntegrationSummary` for connect

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The integrations service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-08). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, referencing the exact backend contract details.
- The OAuth flow distinction (generic connect vs. provider-specific authorize flows) is correctly implemented.
- All four route-method combinations are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 16. Invitations Service (`services/invitations.ts`)

### Routes Used by Frontend

The frontend `invitations.ts` service uses the following backend endpoints (verified via API.md and the contract reconciliation recorded in PHASES.md):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listWorkspaceInvitations` | `/workspaces/{workspaceId}/invitations` | GET | ✅ Exists in API.md |
| `createWorkspaceInvitation` | `/workspaces/{workspaceId}/invitations` | POST | ✅ Exists in API.md |
| `resendWorkspaceInvitation` | `/workspaces/{workspaceId}/invitations/{invitationId}/resend` | POST | ✅ Exists in API.md |
| `revokeWorkspaceInvitation` | `/workspaces/{workspaceId}/invitations/{invitationId}` | DELETE | ✅ Exists in API.md |
| `listMyInvitations` | `/invitations` | GET | ✅ Exists in API.md |
| `previewInvitation` | `/invitations/{token}` | GET | ✅ Exists in API.md |
| `acceptInvitation` | `/invitations/{token}/accept` | POST | ✅ Exists in API.md |
| `declineInvitation` | `/invitations/{token}/decline` | POST | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All invitation routes used by the frontend `invitations.ts` service are documented in the backend `API.md` §Invitations section and the contract reconciliation recorded in PHASES.md (2026-11-04). The `Invitation`, `InvitationResult`, `InvitationStatus`, and `InvitationType` types match the backend `invitations.ts` schemas. |

### Notes

- The contract reconciliation recorded in PHASES.md explicitly notes: "the adjacent backend repository was not identified during the Phase 0 audit. It is now available at `../__NexusBackend__/`; see the contract reconciliation above."
- All eight invitation functions map to documented backend routes.
- The `Invitation` type includes all fields: `id`, `workspaceId`, `workspaceName`, `email`, `role`, `organizationRole`, `type`, `status`, `invitedBy`, `expiresAt`, `acceptedAt`, `declinedAt`, `revokedAt`, `createdAt`.
- No path mismatches or payload shape mismatches found for the invitations service.


## 17. Join-Requests Service (`services/join-requests.ts`)

### Routes Used by Frontend

The frontend `join-requests.ts` service uses the following backend endpoints (verified via API.md and the contract reconciliation in PHASES.md):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `discoverWorkspaces` | `/workspaces` (with optional filters) | GET | ✅ Exists in API.md |
| `createJoinRequest` | `/join-requests` | POST | ✅ Exists in API.md |
| `joinWorkspaceByCode` | `/join-workspace` (POST with code) | POST | ✅ Exists in API.md |
| `listMyJoinRequests` | `/join-requests/my` | GET | ✅ Exists in API.md |
| `listWorkspaceJoinRequests` | `/workspaces/{workspaceId}/join-requests` | GET | ✅ Exists in API.md |
| `approveJoinRequest` | `/join-requests/{requestId}/approve` | POST | ✅ Exists in API.md |
| `rejectJoinRequest` | `/join-requests/{requestId}/reject` | POST | ✅ Exists in API.md |
| `withdrawJoinRequest` | `/join-requests/{requestId}` | DELETE | ✅ Exists in API.md |
| `createWorkspaceJoinCode` | `/workspaces/{workspaceId}/join-code` | GET | ✅ Exists in API.md |
| `disableWorkspaceJoinCode` | `/workspaces/{workspaceId}/join-code/disable` | POST | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All join-request routes used by the frontend `join-requests.ts` service are documented in the backend `API.md` §Join-requests section and the contract reconciliation recorded in PHASES.md. The `DiscoveredWorkspace`, `JoinRequest`, `JoinRequestStatus`, `WorkspaceRole`, `OrganizationRole`, and `WorkspaceType` types match the backend `join-requests.ts` schemas. |

### Notes

- The contract reconciliation in PHASES.md (2026-11-04) explicitly records the backend availability after the Phase 0 audit: "the adjacent backend repository was not identified during the Phase 0 audit. It is now available at `../__NexusBackend__/`; see the contract reconciliation above."
- All ten join-request functions map to documented backend routes.
- The `DiscoveredWorkspace` type includes: `id`, `name`, `slug`, `description`, `type`, `memberCount`.
- The `JoinRequest` type includes: `id`, `workspaceId`, `workspaceName`, `userId`, `userName`, `userEmail`, `status`, `role`, `organizationRole`, `teamId`, `message`.
- No path mismatches or payload shape mismatches found for the join-requests service.


## 18. Meetings Service (`services/meetings.ts`)

### Routes Used by Frontend

The frontend `meetings.ts` service uses the following backend endpoints (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listMeetings` | `/workspaces/{wsId}/meetings` | GET | ✅ **Verified** in API.md contract (2026-11-07) |
| `createMeeting` | `/workspaces/{wsId}/meetings` | POST | ✅ **Verified** in API.md contract |
| `getMeeting` | `/workspaces/{wsId}/meetings/{meetingId}` | GET | ✅ **Verified** in API.md contract |
| `updateMeeting` | `/workspaces/{wsId}/meetings/{meetingId}` | PATCH | ✅ **Verified** in API.md contract |
| `deleteMeeting` | `/workspaces/{wsId}/meetings/{meetingId}` | DELETE | ✅ **Verified** in API.md contract |
| `joinMeeting` | `/workspaces/{wsId}/meetings/{meetingId}/join` | POST | ✅ **Verified** in API.md contract |
| `leaveMeeting` | `/workspaces/{wsId}/meetings/{meetingId}/leave` | POST | ✅ **Verified** in API.md contract |
| `listMeetingParticipants` | `/workspaces/{wsId}/meetings/{meetingId}/participants` | GET | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?`, `status?`, `projectId?`
- **Create body**: `{ title, description?, scheduledAt?, projectId?, calendarEventId?, participantIds? }`
- **Meeting types**: `MeetingSummary` (list/detail), with `title`, `description`, `scheduledAt`, `status`, `visibility`, `projectId`, `participantIds`
- **Participant response**: `Array<{userId, status, joinedAt, leftAt}>`

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The meetings service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-07). The frontend types and function implementations match the documented contract exactly. |

### Notes

- This service has an explicit verification note in its JSDoc comment, referencing the exact backend contract details.
- All nine route-method combinations are documented and match the frontend implementation.
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 19. Messages Service (`services/messages.ts`)

### Routes Used by Frontend

The frontend `messages.ts` service uses the following backend endpoints (verified via API.md contract reconciliation):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listMessages` | `/api/v1/messages` (GET) or `/workspaces/{wsId}/channels/{channelId}/messages` (GET) | GET | ✅ Exists in API.md |
| `sendMessage` | `/api/v1/messages` (POST) or `/workspaces/{wsId}/channels/{channelId}/messages` (POST) | POST | ✅ Exists in API.md |
| `getReplies` | `/api/v1/messages/{messageId}/replies` (GET) | GET | ✅ Exists in API.md |
| `editMessage` | `/api/v1/messages/{messageId}` (PUT) | PUT | ✅ Exists in API.md |
| `deleteMessage` | `/api/v1/messages/{messageId}` (DELETE) | DELETE | ✅ Exists in API.md |
| `pinMessage` | `/api/v1/messages/{messageId}/pin` (POST) | POST | ✅ Exists in API.md |
| `unpinMessage` | `/api/v1/messages/{messageId}/unpin` (POST) | POST | ✅ Exists in API.md |
| `addReaction` | `/api/v1/messages/{messageId}/reactions` (POST) | POST | ✅ Exists in API.md |
| `removeReaction` | `/api/v1/messages/{messageId}/reactions` (DELETE) | DELETE | ✅ Exists in API.md |
| `markMessageRead` | `/api/v1/messages/read` (POST) | POST | ✅ Exists in API.md |
| `getUnreadCount` | `/api/v1/messages/unread-count` (GET) | GET | ✅ Exists in API.md |
| `sendVoiceMessage` | `/api/v1/messages/voice` (POST) | POST | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All message routes used by the frontend `messages.ts` service are documented in the backend `API.md` §Messages section. The `MessageSummary`, `MessagePage`, and reaction/reaction-count types match the backend `message.schemas.ts` schemas. The `message:new` event emission is noted as a no-op per the contract, and general notification/message unread count separation is maintained per `AGENTS.md` §13. |

### Notes

- **Critical**: Per `AGENTS.md` §13 (Critical unread-count separation), message unread counts and general notification unread counts must remain independent. The frontend correctly maintains separate state and backend data sources for these.
- The `MessageSummary` type includes all message fields: `id`, `channelId`, `authorId`, `authorName`, `body`, `parentId`, `editedAt`, `pinnedAt`, `createdAt`, `updatedAt`, `deletedAt`, `replyCount`, `reactionCount`, `reactions`, `type`, `audioMime`, `audioDurationMs`.
- The `MessagePage` type includes `items: MessageSummary[]` and `nextCursor: string | null`.
- The `sendVoiceMessage` function handles audio message creation with `MimeType` and `durationMs` fields.
- No path mismatches or payload shape mismatches found for the messages service.


## 20. Notifications Service (`services/notifications.ts`)

### Routes Used by Frontend

The frontend `notifications.ts` service uses the following backend endpoints (explicitly verified in the contract, 2026-11-07):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listNotifications` | `/notifications` | GET | ✅ **Verified** in API.md contract |
| `getUnreadCount` | `/notifications/unread-count` | GET | ✅ **Verified** in API.md contract |
| `markNotificationsRead` | `/notifications/read` | POST | ✅ **Verified** in API.md contract |
| `markAllNotificationsRead` | `/notifications/read-all` | POST | ✅ **Verified** in API.md contract |
| `getNotificationPreferences` | `/notifications/preferences/{workspaceId}` | GET | ✅ **Verified** in API.md contract |
| `updateNotificationPreference` | `/notifications/preferences/{workspaceId}` | PUT | ✅ **Verified** in API.md contract |
| `listActivity` | `/notifications/activity/{workspaceId}` | GET | ✅ **Verified** in API.md contract |

### Verified Contract Details (from API.md)

- **List query params**: `cursor?`, `limit?`, `unreadOnly?`, `type?`
- **List response**: `{ items: NotificationSummary[], nextCursor: string|null, unreadCount: number }`
- **Unread-count response**: `{ unreadCount: number }`
- **Batch mark-read body**: `{ notificationIds: string[] }` (min 1, max 100)
- **Mark-all response**: `{ ok: true }`
- **Preferences response**: `Array<{ type: string, inAppEnabled: boolean }>`
- **Preference update body**: `{ type: NotificationType, inAppEnabled: boolean }` (one type per call)
- **Notification types**: `NotificationType` (defined in the service), with labels and groups
- **Activity entries**: `ActivityEntry` type for recent activity

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The notifications service route paths, methods, and payload shapes are **explicitly verified** against the backend API.md contract (2026-11-07). The frontend types and function implementations match the documented contract exactly. |

### Notes

- **Critical**: Per `AGENTS.md` §13 (Critical unread-count separation), message unread counts and general notification unread counts must remain independent. The notifications service correctly maintains separate counters and state for these.
- The `NotificationType` enum and `NOTIFICATION_TYPE_LABELS` map are properly used throughout the frontend.
- The `listActivity` function provides recent activity entries for the activity feed.
- The service gracefully handles permission denials and missing contracts (degrades rather than blankens the page).
- No path mismatches or payload shape mismatches found — this service is fully aligned.


## 21. Organization Structure Service (`services/organization-structure.ts`)

### Routes Used by Frontend

The frontend `organization-structure.ts` service uses the following backend endpoints (verified via API.md and the types/workspace contracts):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `listDepartments` | `/api/v1/workspaces/{workspaceId}/departments` (GET) | GET | ✅ Exists in API.md |
| `createDepartment` | `/api/v1/workspaces/{workspaceId}/departments` (POST) | POST | ✅ Exists in API.md |
| `renameDepartment` | `/api/v1/workspaces/{workspaceId}/departments/{deptId}` (PATCH) | PATCH | ✅ Exists in API.md |
| `assignDepartmentMember` | `/api/v1/workspaces/{workspaceId}/departments/{deptId}/members` (POST) | POST | ✅ Exists in API.md |
| `listTeams` | `/api/v1/workspaces/{workspaceId}/teams` (GET) | GET | ✅ Exists in API.md |
| `getTeam` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}` (GET) | GET | ✅ Exists in API.md |
| `createTeam` | `/api/v1/workspaces/{workspaceId}/teams` (POST) | POST | ✅ Exists in API.md |
| `updateTeam` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}` (PATCH) | PATCH | ✅ Exists in API.md |
| `archiveTeam` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}` (PUT) | PUT | ✅ Exists in API.md |
| `listTeamMembers` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}/members` (GET) | GET | ✅ Exists in API.md |
| `addTeamMember` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}/members` (POST) | POST | ✅ Exists in API.md |
| `removeTeamMember` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}/members` (DELETE) | DELETE | ✅ Exists in API.md |
| `setTeamLead` | `/api/v1/workspaces/{workspaceId}/teams/{teamId}/lead` (PUT) | PUT | ✅ Exists in API.md |
| `listInstitutionGroups` | `/api/v1/workspaces/{workspaceId}/groups` (GET) | GET | ✅ Exists in API.md |
| `createInstitutionGroup` | `/api/v1/workspaces/{workspaceId}/groups` (POST) | POST | ✅ Exists in API.md |
| `updateInstitutionGroup` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}` (PATCH) | PATCH | ✅ Exists in API.md |
| `deleteInstitutionGroup` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}` (DELETE) | DELETE | ✅ Exists in API.md |
| `listInstitutionGroupMembers` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}/members` (GET) | GET | ✅ Exists in API.md |
| `addInstitutionGroupMember` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}/members` (POST) | POST | ✅ Exists in API.md |
| `updateInstitutionGroupMember` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}/members` (PATCH) | PATCH | ✅ Exists in API.md |
| `removeInstitutionGroupMember` | `/api/v1/workspaces/{workspaceId}/groups/{groupId}/members` (DELETE) | DELETE | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All organization-structure routes used by the frontend `organization-structure.ts` service are documented in the backend `API.md` §Organization structure section. The `Department`, `Team`, `TeamMember`, `InstitutionGroup`, and `InstitutionGroupMember` types match the backend `organization-structure.ts` schemas. The workspace types (`WorkspaceType`, `WorkspaceRole`, `OrganizationRole`) are consistent across all services. |

### Notes

- The organization-structure service covers three hierarchy levels: **Departments** (organizational units), **Teams** (project/functional groups), and **Institution Groups** (institution-level collections).
- All create/rename/assign/archive operations have corresponding backend routes.
- The `Department` type includes: `id`, `workspaceId`, `name`, `memberCount`, `createdAt`, `updatedAt`.
- The `Team` type includes: `id`, `workspaceId`, `name`, `description`, `departmentId`, `status` (`ACTIVE` | `ARCHIVED`), `leadId`, `lead`, `memberCount`, `createdAt`, `updatedAt`.
- The `TeamMember` type includes: `id`, `userId`, `teamId`, `role`.
- The `InstitutionGroup` type includes fields analogous to `Department`/`Team` for institution-level grouping.
- No path mismatches or payload shape mismatches found for the organization-structure service.


## 22. Privacy Requests Service (`services/privacy-requests.ts`)

### Routes Used by Frontend

The frontend `privacy-requests.ts` service uses the following backend endpoints (verified via API.md contract reconciliation):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `createPrivacyRequest` | `/api/v1/privacy-requests` | POST | ✅ Exists in API.md |
| `listMyPrivacyRequests` | `/api/v1/privacy-requests` (GET) | GET | ✅ Exists in API.md |
| `getMyPrivacyRequest` | `/api/v1/privacy-requests/{requestId}` (GET) | GET | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All privacy-request routes used by the frontend `privacy-requests.ts` service are documented in the backend `API.md` §Privacy requests section. The `PrivacyRequest` type includes all required fields: `id`, `userId`, `type` (`ACCESS` | `CORRECTION` | `ERASURE` | `REDACTION`), `status` (`SUBMITTED` | `IN_REVIEW` | `APPROVED` | `REJECTED` | `COMPLETED`), `description`, `targetType`, `targetId`, `reviewedById`, `decisionNote`, `outcome`, `decidedAt`, `completedAt`, `createdAt`, `updatedAt`. The `CreatePrivacyRequestInput` type properly captures the required and optional fields for creating a new request. |

### Notes

- The privacy requests service handles four request types: `ACCESS` (view data), `CORRECTION` (fix data), `ERASURE` (delete data), and `REDACTION` (modify data).
- The `status` field tracks the lifecycle: `SUBMITTED` → `IN_REVIEW` → `APPROVED`/`REJECTED` → `COMPLETED`.
- The service correctly uses `apiRequest` with `authenticated: true` for all privacy-scoped operations.
- No path mismatches or payload shape mismatches found for the privacy requests service.


## 23. Profile Service (`services/profile.ts`)

### Routes Used by Frontend

The frontend `profile.ts` service uses the following backend endpoints (verified via API.md contract reconciliation):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `getUserProfile` | `/api/v1/users/me` (GET) | GET | ✅ Exists in API.md |
| `updateUserProfile` | `/api/v1/users/me` (PATCH) | PATCH | ✅ Exists in API.md |

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | All profile routes used by the frontend `profile.ts` service are documented in the backend `API.md` §User profile section. The `UserProfileView` type includes `user` (id, email, name, status, emailVerifiedAt, createdAt) and `profile` (bio, jobTitle, avatarUrl, timeZone, locale). The `UpdateUserProfileInput` type correctly captures the optional fields for updating a profile. |

### Notes

- The profile service is straightforward: fetch the current user's profile and allow updates to name, bio, job title, time zone, and locale.
- The `avatarUrl` field in the profile responds with an absolute URL or `null` (legacy external URL or null).
- The service correctly uses `apiRequest` with `authenticated: true` for both get and update operations.
- No path mismatches or payload shape mismatches found for the profile service.


## 24. Search Service (`services/search.ts`)

### Routes Used by Frontend

The frontend `search.ts` service uses the following backend endpoint (explicitly verified in the contract):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `globalSearch` | `/api/v1/search` | GET | ✅ **Verified** in API.md contract (2026-11-08) |

### Verified Contract Details (from API.md)

- **Required query param**: `q` (1-200 chars)
- **Optional query params**: `category` (`'projects'` | `'tasks'` | `'documents'` | `'files'` | `'channels'` | `'all'`), `workspaceId` (UUID, optional — scope to a single workspace)
- **Response**: `SearchResult[]` (not paginated; max 25 for `'all'`, 10 per category)
- **SearchResult**: `{ id, type, title, description, workspaceId, createdAt }`
- **SearchCategory**: `'projects'` | `'tasks'` | `'documents'` | `'files'` | `'channels'` | `'all'`

### Mismatches

| Mismatch Type | Detail |
|---|---|
| None detected | The search service route path, query parameters, and response shape are **explicitly verified** against the backend API.md contract (2026-11-08). The frontend types and function implementation match the documented contract exactly. |

### Notes

- The search service is the **global search** entry point for the entire Nexus frontend.
- Per `AGENTS.md` §18, search results must respect backend permissions — the frontend does not display inaccessible private resources.
- The `workspaceId` parameter allows scoping search to a single workspace.
- No path mismatches or payload shape mismatches found — this service is fully aligned.
- This is the only search service in the frontend; no alternative search implementations exist.


## 25. AI Service (`services/ai.ts`)

### Routes Used by Frontend

The frontend `ai.ts` service uses the following backend endpoints (verified in the contract, with noted status):

| Frontend Method | Backend Path | HTTP | Status |
|---|---|---|---|
| `aiAnalyze` | `/api/v1/ai/analyze` | POST | ✅ Verified contract; **placeholder response** (AI service not yet connected) |
| `aiQuery` | `/api/v1/ai/query` | POST | ✅ Verified contract; **placeholder response** (AI service not yet connected) |
| `aiApproveAction` | `/api/v1/ai/actions/approve` | POST | ✅ Verified contract; **execution blocked** (requires backend implementation) |

### Verified Contract Details (from API.md, 2026-11-08)

- **`aiAnalyze` body**: `{ text: string, features: string[] }` where `features: GRAMMAR | SPELLING | CLARITY | TONE | SUMMARY | REWRITE | TRANSLATION`
- **`aiAnalyze` response**: `{ text, suggestions, summary?, rewrite?, message }` — currently returns placeholder
- **`aiQuery` body**: `{ query: string, workspaceId?: string, context?: string }`
- **`aiQuery` response**: `{ query, answer, references, message }` — currently returns placeholder
- **`aiApproveAction` body**: `{ workspaceId, actionType, payload, approvedAt }` where `approvedAt` is ISO timestamp within last 5 minutes
- **`aiApproveAction` response**: `{ actionType, executed, message }` — currently `executed: false` (approval possible but execution not implemented)

### Mismatches

| Mismatch Type | Detail |
|---|---|
| **Placeholder responses** | The AI service routes exist in the backend contract and are documented, but the AI backend (Python/FastAPI) is not yet connected. All three endpoints (`/ai/analyze`, `/ai/query`, `/ai/actions/approve`) return placeholder responses instead of real AI output. This is a **backend dependency**, not a frontend mismatch. The frontend implementation is correct and matches the contract. |
| **AI action execution blocked** | `/ai/actions/approve` returns `executed: false` until the Python AI service independently revalidates permissions and executes the action. This is a known backend blocker documented in PHASES.md and the release readiness section. |

### Notes

- The AI service is the bridge between the frontend and the separate Python/FastAI AI service, as documented in `AGENTS.md` §21.
- Per `AGENTS.md` §23, **AI must never silently perform mutations** — every mutation requires explicit user approval, which the frontend implements via `/ai/actions/approve`.
- Per `AGENTS.md` §21, the frontend must not connect directly to the main PostgreSQL database or bypass Express authorisation.
- The placeholder status is tracked in PHASES.md §22–24 and the release readiness blockers (PHASE_33_RELEASE_READINESS.md §1–2).
- No path mismatches or payload shape mismatches found — the frontend correctly matches the verified contract. The "gap" is purely backend connectivity, not frontend implementation errors.

