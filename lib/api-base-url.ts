/**
 * API base URL resolution.
 *
 * The Next.js server-side proxy at `/api/backend/[...path]` reads
 * `NEXUS_API_URL` from the environment.  When that variable is misconfigured
 * with multiple URLs separated by ", " — a common copy-paste mistake from
 * documentation that lists fallback addresses — `new URL(value)` silently
 * accepts it and produces a malformed upstream URL such as:
 *
 *   http://localhost:4000/api/v1,%20http://localhost:4000/api/v1/auth/login
 *
 * This helper sanitises the raw value before constructing a URL:
 *   1. Splits on commas.
 *   2. Trims whitespace from each part.
 *   3. Drops empty parts.
 *   4. Picks the first part that is a valid http(s) URL.
 *   5. Strips trailing slashes.
 *   6. Ensures the path ends with `/api/v1` exactly once.
 *
 * In development (NODE_ENV !== 'production') it falls back to
 * `http://localhost:4000/api/v1` and emits a console warning when the raw
 * value contained more than one URL candidate.
 *
 * In production it throws a clear error at call time rather than forwarding a
 * broken URL to the upstream backend.
 */

const DEV_FALLBACK = 'http://localhost:4000/api/v1';
const REQUIRED_SUFFIX = '/api/v1';

/**
 * Parse and sanitise the NEXUS_API_URL environment variable.
 *
 * @param rawValue - The raw string from process.env.NEXUS_API_URL
 * @param isDev    - Whether the app is running in development mode
 * @returns        - A clean base URL ending with /api/v1 and no trailing slash
 * @throws         - In production when no valid URL can be found
 */
export function resolveApiBaseUrl(rawValue: string | undefined, isDev: boolean): string {
  if (!rawValue || rawValue.trim() === '') {
    if (isDev) {
      console.warn(
        '[nexus] NEXUS_API_URL is not set. Falling back to ' + DEV_FALLBACK + ' for development.',
      );
      return DEV_FALLBACK;
    }
    throw new Error(
      'NEXUS_API_URL is not configured. Set it to a single URL such as ' +
        'https://api.example.com/api/v1.',
    );
  }

  // Split on commas to handle accidental multi-URL values.
  const candidates = rawValue
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (candidates.length > 1 && isDev) {
    console.warn(
      '[nexus] NEXUS_API_URL contains ' +
        candidates.length +
        ' comma-separated values. Only the first valid URL will be used. ' +
        'Set the variable to a single URL with no spaces or commas.',
    );
  }

  for (const candidate of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;

    // Strip trailing slashes from the full URL.
    let href = parsed.toString().replace(/\/+$/, '');

    // Ensure the path ends with /api/v1 exactly once.
    if (!href.endsWith(REQUIRED_SUFFIX)) {
      href = href + REQUIRED_SUFFIX;
    }

    return href;
  }

  // No valid URL found.
  if (isDev) {
    console.warn(
      '[nexus] NEXUS_API_URL ("' +
        rawValue.slice(0, 80) +
        '") does not contain a valid http(s) URL. ' +
        'Falling back to ' +
        DEV_FALLBACK +
        ' for development.',
    );
    return DEV_FALLBACK;
  }
  throw new Error(
    'NEXUS_API_URL ("' +
      rawValue.slice(0, 80) +
      '") does not contain a valid http(s) URL. ' +
      'Set it to a single URL such as https://api.example.com/api/v1.',
  );
}

/**
 * Return the sanitised API base URL for server-side use.
 *
 * Reads `process.env.NEXUS_API_URL` and `process.env.NODE_ENV`.
 * Never call this on the client — the env variable is server-only.
 */
export function getApiBaseUrl(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  return resolveApiBaseUrl(process.env.NEXUS_API_URL, isDev);
}

// ---------------------------------------------------------------------------
// Backend origin resolution (NEXT_PUBLIC_BACKEND_ORIGIN)
// ---------------------------------------------------------------------------

const ORIGIN_DEV_FALLBACK = 'http://localhost:4000';
const API_V1_SUFFIX = '/api/v1';

/**
 * Parse and sanitise NEXT_PUBLIC_BACKEND_ORIGIN.
 *
 * Rules (identical to resolveApiBaseUrl except the path handling):
 *   1. Splits on commas.
 *   2. Trims whitespace.
 *   3. Drops empty parts.
 *   4. Picks the first valid http(s) URL.
 *   5. Strips trailing slashes.
 *   6. Strips any trailing /api/v1 suffix — the caller appends its own path.
 *
 * In development falls back to http://localhost:4000 and warns when multiple
 * URL candidates were present.
 * In production throws if the value is missing or invalid.
 *
 * @param rawValue - The raw string from process.env.NEXT_PUBLIC_BACKEND_ORIGIN
 * @param isDev    - Whether the app is running in development mode
 * @returns        - A clean origin URL with no trailing slash and no /api/v1
 * @throws         - In production when no valid URL can be found
 */
export function resolveBackendOrigin(rawValue: string | undefined, isDev: boolean): string {
  if (!rawValue || rawValue.trim() === '') {
    if (isDev) {
      console.warn(
        '[nexus] NEXT_PUBLIC_BACKEND_ORIGIN is not set. ' +
          'Falling back to ' + ORIGIN_DEV_FALLBACK + ' for development.',
      );
      return ORIGIN_DEV_FALLBACK;
    }
    throw new Error(
      'NEXT_PUBLIC_BACKEND_ORIGIN is not configured. ' +
        'Set it to a single URL such as https://api.example.com.',
    );
  }

  const candidates = rawValue
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (candidates.length > 1 && isDev) {
    console.warn(
      '[nexus] NEXT_PUBLIC_BACKEND_ORIGIN contains ' +
        candidates.length +
        ' comma-separated values. Only the first valid URL will be used. ' +
        'Set the variable to a single URL with no spaces or commas.',
    );
  }

  for (const candidate of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;

    // Strip trailing slashes then strip /api/v1 suffix if present.
    let href = parsed.toString().replace(/\/+$/, '');
    if (href.endsWith(API_V1_SUFFIX)) {
      href = href.slice(0, href.length - API_V1_SUFFIX.length);
    }

    return href;
  }

  if (isDev) {
    console.warn(
      '[nexus] NEXT_PUBLIC_BACKEND_ORIGIN ("' +
        rawValue.slice(0, 80) +
        '") does not contain a valid http(s) URL. ' +
        'Falling back to ' + ORIGIN_DEV_FALLBACK + ' for development.',
    );
    return ORIGIN_DEV_FALLBACK;
  }
  throw new Error(
    'NEXT_PUBLIC_BACKEND_ORIGIN ("' +
      rawValue.slice(0, 80) +
      '") does not contain a valid http(s) URL. ' +
      'Set it to a single URL such as https://api.example.com.',
  );
}

/**
 * Return the sanitised backend origin for client-side OAuth starts.
 *
 * Reads `process.env.NEXT_PUBLIC_BACKEND_ORIGIN` and `process.env.NODE_ENV`.
 */
export function getBackendOrigin(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  return resolveBackendOrigin(process.env.NEXT_PUBLIC_BACKEND_ORIGIN, isDev);
}
