import type { ApiError } from '@/types/api';
import { showToast } from '@/lib/toast';

function getApiBaseUrl(): string | undefined {
  return '/api/backend';
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

interface ApiEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean;
  /**
   * Suppress the global PERMISSION_DENIED toast and permission-refresh event.
   * Used by the permission fetch itself so a denied refresh cannot loop.
   */
  suppressPermissionEvents?: boolean;
}

type PermissionDeniedListener = () => void;

const permissionDeniedListeners = new Set<PermissionDeniedListener>();

/**
 * Subscribe to backend PERMISSION_DENIED responses. The project permission
 * provider uses this to re-fetch permissions after a role change.
 */
export function onPermissionDenied(listener: PermissionDeniedListener): () => void {
  permissionDeniedListeners.add(listener);
  return () => {
    permissionDeniedListeners.delete(listener);
  };
}

/** Notify subscribers that the backend denied an action for lack of permission. */
export function notifyPermissionDenied(): void {
  permissionDeniedListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A stale subscriber must not break the API error path.
    }
  });
}

function handlePermissionDenied(): void {
  showToast({
    message: 'Your project role has changed or does not allow that action. Refreshing your permissions…',
    variant: 'warning',
  });
  notifyPermissionDenied();
}


function readCsrfCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('nexus_csrf='));
  return cookie ? decodeURIComponent(cookie.slice('nexus_csrf='.length)) : undefined;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new ApiRequestError('The API is not configured. Set NEXUS_API_URL on the server.', 0);
  }

  const { authenticated = false, suppressPermissionEvents = false, headers: inputHeaders, ...requestOptions } = options;
  const headers = new Headers(inputHeaders);
  // Only set the default JSON content-type when the body is a plain string or
  // Buffer. When it is a FormData the browser must set the content-type itself
  // (with the correct multipart boundary), so we must not override it.
  if (requestOptions.body && !(requestOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (authenticated && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const csrfToken = readCsrfCookie();
  if ((path === '/auth/refresh' || path === '/auth/logout') && csrfToken) {
    headers.set('x-csrf-token', csrfToken);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestOptions,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiRequestError('Unable to reach Nexus. Check your connection and try again.', 0);
  }

  if (response.status === 204) return undefined as T;

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError('The server returned an unreadable response.', response.status);
  }

  if (!response.ok) {
    const body = payload as {
      error?: { message?: string; code?: string };
      message?: string;
    };
    const message = body.error?.message ?? body.message ?? 'Something went wrong. Please try again.';
    const code = body.error?.code;
    if (!suppressPermissionEvents && code === 'PERMISSION_DENIED') handlePermissionDenied();
    const error: ApiError = { status: response.status, message };
    throw new ApiRequestError(error.message, error.status, code);
  }

  return (payload as ApiEnvelope<T>).data;
}

/** Authenticated raw-response request for private binary resources. */
export async function apiRawRequest(
  path: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const { authenticated = false, suppressPermissionEvents = false, headers: inputHeaders, ...requestOptions } = options;
  const headers = new Headers(inputHeaders);
  if (authenticated && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const csrfToken = readCsrfCookie();
  if ((path === '/auth/refresh' || path === '/auth/logout') && csrfToken) headers.set('x-csrf-token', csrfToken);
  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, { ...requestOptions, headers, credentials: 'include' });
  } catch {
    throw new ApiRequestError('Unable to reach Nexus. Check your connection and try again.', 0);
  }
  if (!response.ok) {
    let message = 'Something went wrong. Please try again.';
    let code: string | undefined;
    try {
      const body = await response.clone().json() as { error?: { message?: string; code?: string }; message?: string };
      message = body.error?.message ?? body.message ?? message;
      code = body.error?.code;
    } catch { /* Binary endpoint may return an empty error body. */ }
    if (!suppressPermissionEvents && code === 'PERMISSION_DENIED') handlePermissionDenied();
    throw new ApiRequestError(message, response.status, code);
  }
  return response;
}
