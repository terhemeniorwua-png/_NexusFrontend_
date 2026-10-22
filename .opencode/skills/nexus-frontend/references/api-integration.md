# Nexus Frontend — API Integration Reference

## API Client Pattern (`lib/api.ts`)

```typescript
// lib/api.ts — Phase 3 implementation
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options;

  const url = new URL(path, BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url.toString(), {
    ...init,
    credentials: 'include', // adjust per backend auth contract
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const error = await parseApiError(response);
    throw error;
  }

  return response.json() as Promise<T>;
}
```

Adapt this pattern to the actual backend authentication contract confirmed in Phase 3.

## Error Handling Pattern

```typescript
// types/api.ts
export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>; // field-level validation errors
}

export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };

// Handle API errors in components:
try {
  const data = await services.tasks.createTask(payload);
  // handle success
} catch (error: unknown) {
  if (isApiError(error)) {
    if (error.status === 422) {
      // show field errors
    } else if (error.status === 401) {
      // session expired - handled by API client
    } else {
      // show general error
    }
  }
}
```

## Service Module Pattern

```typescript
// services/tasks.ts
import { request } from '@/lib/api';
import type { Task, CreateTaskRequest, TaskFilters, PaginatedResponse } from '@/types/tasks';

export async function getTasks(
  projectId: string,
  filters?: TaskFilters
): Promise<PaginatedResponse<Task>> {
  return request(`/projects/${projectId}/tasks`, { params: filters });
}

export async function createTask(payload: CreateTaskRequest): Promise<Task> {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus
): Promise<Task> {
  return request(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
```

## Backend Contract Verification

Before implementing any integration, confirm from the backend:

1. HTTP method and path.
2. Request body shape and required fields.
3. Authentication requirement.
4. Authorization rules (which roles).
5. Response shape — all fields.
6. Pagination parameters.
7. Validation error format and field names.
8. Error status codes.
9. Real-time event contracts where applicable.

Record all pending contracts in `PHASES.md` Appendix B.

## Pagination Pattern

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Usage in a component:
const [page, setPage] = useState(1);
const { data, total, hasMore } = await getTasks(projectId, { page, pageSize: 20 });
```

## Backend Contract Tracking

All backend contracts are tracked in `PHASES.md` Appendix B. Check that appendix to see which contracts are confirmed vs. pending before implementing a feature.

## Environment Variables

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Browser | HTTP API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | Browser | Socket.IO URL |

Never hardcode these values. Configure per-environment in hosting platform.
