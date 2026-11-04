/**
 * lib/redirect.ts
 *
 * Validation for post-authentication redirect targets.
 *
 * A redirect target arrives from the URL, so it must never be trusted as-is:
 * accepting an absolute URL would turn sign-in into an open redirect. Only
 * same-origin absolute paths are allowed, and the same-origin API proxy is
 * excluded so a redirect can never be used to replay a backend request.
 */

const MAX_REDIRECT_LENGTH = 2048;

export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const path = value.trim();
  if (!path || path.length > MAX_REDIRECT_LENGTH) return null;

  // A single leading slash keeps the target on this origin. `//host` and
  // `/\host` are treated as protocol-relative by browsers, so reject both.
  if (!path.startsWith('/')) return null;
  if (path.startsWith('//')) return null;
  if (path.includes('\\')) return null;

  // The proxy is an implementation detail, not a page.
  if (path === '/api' || path.startsWith('/api/') || path.startsWith('/api?')) return null;

  return path;
}
