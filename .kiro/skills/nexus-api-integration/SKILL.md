---
name: nexus-api-integration
description: Standards for REST API integration with the Nexus backend — typed fetch client, service modules, error handling, pagination, and backend contract verification.
---

# Nexus API Integration Skill

## 1. Purpose

This skill defines how the Nexus frontend communicates with the separate Nexus backend. Apply these standards from Phase 3 onward.

Consult `AGENTS.md` and `PHASES.md` before implementing API features. Never invent endpoint contracts or claim an integration works without verifying it against the actual backend.

## 2. Backend Relationship

- The frontend and backend are in **separate repositories**.
- All communication is through documented REST API endpoints and Socket.IO events.
- The frontend must not connect to PostgreSQL or Redis directly.
- All API base URLs must be configured through environment variables, not hardcoded.
- Never assume an endpoint exists without checking backend documentation or implementation.

## 3. API Client (`lib/api.ts`)

Create a typed fetch wrapper in `lib/api.ts` in Phase 3.

Required behaviors:
- Prepend `NEXT_PUBLIC_API_URL` to all request paths.
- Attach authentication credentials per backend contract (cookie or `Authorization` header).
- Normalize error responses to a consistent `ApiError` shape.
- Handle `401 Unauthorized` — trigger session expiry flow (see `nexus-authentication` skill).
- Handle `403 Forbidden` — display access-denied state.
- Handle `422 Unprocessable Entity` — extract field-level validation errors.
- Handle `500 Server Error` — display a recoverable error state.
- Never log tokens, passwords, or session secrets.
- Support optional request cancellation (AbortController) for expensive or navigated-away requests.

Example response type pattern:
```typescript
type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>; // Field-level validation errors
}
```

## 4. Service Modules

Organize API calls into feature-level service modules in `services/`:

| Module | Phase | Purpose |
|---|---|---|
| `services/auth.ts` | 3 | login, register, logout, forgotPassword, resetPassword, getMe |
| `services/workspaces.ts` | 4 | getWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace |
| `services/teams.ts` | 4 | getTeams, createTeam, updateTeam, deleteTeam |
| `services/members.ts` | 4 | getMembers, inviteMember, updateMemberRole, removeMember |
| `services/projects.ts` | 5 | getProjects, getProject, createProject, updateProject, archiveProject, deleteProject |
| `services/tasks.ts` | 6 | getTasks, getTask, createTask, updateTask, deleteTask, updateTaskStatus, addComment |
| `services/documents.ts` | 7 | getDocuments, getDocument, createDocument, updateDocument, deleteDocument |
| `services/messages.ts` | 8 | getConversations, getMessages, sendMessage, editMessage, deleteMessage |
| `services/notifications.ts` | 9 | getNotifications, markAsRead, markAllAsRead |
| `services/meetings.ts` | 10 | getMeetings, createMeeting, joinMeeting, endMeeting |
| `services/ai.ts` | 10 | askAI, generateTaskPlan, summarizeProject, summarizeConversation |
| `services/search.ts` | 11 | search |
| `services/activity.ts` | 11 | getWorkspaceActivity, getProjectActivity |
| `services/analytics.ts` | 11 | getWorkspaceAnalytics, getProjectAnalytics |

Rules:
- Do not place raw `fetch` calls in UI components.
- Do not duplicate service functions.
- Return typed results — define request and response types in `types/<feature>.ts`.

## 5. TypeScript Types for API

Define in `types/api.ts`:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
```

Define feature-specific types in `types/<feature>.ts` (e.g., `types/tasks.ts`, `types/workspace.ts`).

Never duplicate backend domain models blindly. Represent the actual frontend-facing API contract.

## 6. Error Handling Rules

- Every API call must handle: loading, success, empty, validation error, auth error, forbidden, server error.
- Display field-level errors next to the relevant form input when the backend provides them.
- Show a recoverable error message for non-form errors (not a raw JSON dump).
- Provide a retry action for failed data loading operations.
- Do not silently swallow errors.
- Do not display internal server error messages, stack traces, or secret values to the user.
- Do not fabricate a success response when a request fails.

## 7. Pagination and Filtering

- Use backend-provided pagination parameters: `page`, `pageSize` (or `limit`/`offset` — confirm per endpoint).
- Do not request unlimited datasets.
- Apply `search`, `filter`, and `sort` query parameters as documented by the backend.
- Invalidate cached pagination after mutations (adding or deleting items).

## 8. Authentication on Requests

- Follow the agreed authentication strategy from Phase 3 (HttpOnly cookie preferred per `AGENTS.md`).
- The API client must transparently attach credentials on every authenticated request.
- On `401` response: call the session expiry handler — do not silently ignore it.
- Never log or expose tokens in network requests or console output.
- See `nexus-authentication` skill for full session lifecycle.

## 9. Backend Contract Verification Checklist

Before implementing any API integration, confirm:

- [ ] HTTP method and endpoint path.
- [ ] Request body shape and required fields.
- [ ] Authentication requirement.
- [ ] Authorization rules (which roles can call this endpoint).
- [ ] Response shape including all relevant fields.
- [ ] Pagination and filtering behavior.
- [ ] Validation error format and field names.
- [ ] Error status codes and their meanings.
- [ ] Real-time event contracts where applicable.

If an endpoint is unavailable or undocumented, record it in `PHASES.md` Appendix B and implement only what can be safely completed without faking the integration.

## 10. Environment Variable Rules

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Browser | HTTP API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Browser | Socket.IO URL |

- Never hardcode URLs in service modules.
- Never expose secrets in `NEXT_PUBLIC_` variables.
- Document all new variables in `.env.example` with placeholder values.
