/**
 * types/api.ts
 *
 * Generic TypeScript types for Nexus backend API communication.
 * Used by lib/api.ts (Phase 3) and all service modules in services/.
 */

// ─── Response envelopes ───────────────────────────────────────────────────────

/**
 * Generic paginated response from list endpoints.
 * Field names must match the backend's actual response shape once confirmed.
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Discriminated union for async data states.
 * Use this to represent the result of an API call in component state.
 */
export type ApiResult<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// ─── Error types ──────────────────────────────────────────────────────────────

/**
 * Normalized API error shape.
 * lib/api.ts (Phase 3) throws this for all non-2xx responses.
 */
export interface ApiError {
  /** HTTP status code (400, 401, 403, 404, 422, 500, …) */
  status: number;
  /** Human-readable error message (from backend or generated client-side) */
  message: string;
  /**
   * Field-level validation errors keyed by field name.
   * Present on 422 Unprocessable Entity responses.
   * @example { email: ['Email is already in use'], password: ['Too short'] }
   */
  errors?: Record<string, string[]>;
}

/** Type guard to check if an unknown value is an ApiError */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    'message' in value &&
    typeof (value as ApiError).status === 'number' &&
    typeof (value as ApiError).message === 'string'
  );
}

// ─── Common request types ─────────────────────────────────────────────────────

/** Standard pagination query parameters for list endpoints */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

/** Standard sort parameters */
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Combined list query params */
export type ListParams = PaginationParams & SortParams & {
  search?: string;
};
