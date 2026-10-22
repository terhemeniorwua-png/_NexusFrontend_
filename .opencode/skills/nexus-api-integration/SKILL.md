---
name: nexus-api-integration
description: Standards for REST API integration with the Nexus backend — typed fetch client, service modules, error handling, pagination, and backend contract verification.
---

# Nexus API Integration Skill

## 1. Purpose

This skill defines how the Nexus frontend communicates with the separate Nexus backend. Apply from Phase 3 onward.

Consult `AGENTS.md` and `PHASES.md` before implementing API features. Never invent endpoint contracts or claim an integration works without verifying it.

## 2. Backend Relationship

- Frontend and backend are in **separate repositories**.
- All communication is through documented REST API endpoints and Socket.IO events.
- The frontend must not connect to PostgreSQL or Redis directly.
- All base URLs must be configured through environment variables.
- Never assume an endpoint exists without checking backend documentation.

## 3. API Client (`lib/api.ts`)

Create a typed fetch wrapper in Phase 3:
- Prepend `NEXT_PUBLIC_API_URL` to all request paths.
- Attach auth credentials per backend contract.
- Normalize errors to a consistent `ApiError` shape.
- Handle `401` — trigger session expiry flow.
- Handle `403` — display access-denied state.
- Handle `422` — extract field-level validation errors.
- Never log tokens or passwords.

## 4. Service Modules (`services/`)

Organize by domain: `auth.ts`, `workspaces.ts`, `teams.ts`, `members.ts`, `projects.ts`, `tasks.ts`, `documents.ts`, `messages.ts`, `notifications.ts`, `meetings.ts`, `ai.ts`, `search.ts`, `activity.ts`, `analytics.ts`.

See `nexus-frontend/references/api-integration.md` for implementation patterns.

## 5. TypeScript Types

Define in `types/api.ts`:

```typescript
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
}
```

Define feature types in `types/<feature>.ts`.

## 6. Error Handling Rules

- Every API call must handle: loading, success, empty, validation error, auth error, forbidden, server error.
- Display field-level errors next to form inputs when provided.
- Show recoverable error state for non-form errors.
- Provide retry action for failed data loading.
- Do not silently swallow errors.
- Do not fabricate a success response when a request fails.

## 7. Backend Contract Verification

Before integrating, confirm: HTTP method, path, request shape, auth requirement, authorization rules, response shape, pagination, validation error format, error status codes.

Record pending contracts in `PHASES.md` Appendix B.

## 8. Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Browser | HTTP API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Browser | Socket.IO URL |

Never hardcode. Document in `.env.example` with placeholder values only.
