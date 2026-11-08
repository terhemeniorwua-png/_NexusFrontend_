import type { NextRequest } from 'next/server';

const REQUEST_HEADERS = ['authorization', 'content-type', 'cookie', 'user-agent', 'x-csrf-token'] as const;
const RESPONSE_HEADERS = ['cache-control', 'content-type', 'x-request-id'] as const;

/**
 * Backend API prefixes the browser is allowed to reach through the same-origin
 * proxy. Every prefix is a module the frontend actually consumes; anything
 * else is rejected so the proxy cannot become an open relay.
 */
const ALLOWED_API_PREFIXES = ['auth', 'users', 'workspaces', 'invitations', 'billing', 'notifications', 'integrations', 'search'] as const;

/** Path segments must be URL-safe; invitation and join-code tokens are base64url. */
const SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

async function forwardRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
): Promise<Response> {
  const configuredBase = process.env.NEXUS_API_URL;
  if (!configuredBase) {
    return Response.json({ success: false, error: { code: 'API_NOT_CONFIGURED', message: 'The Nexus API is not configured.' } }, { status: 503 });
  }

  let requestPath: string[] = [];
  let upstreamUrl: URL;
  try {
    const { path } = await context.params;
    requestPath = path;
    const prefix = path[0] ?? '';
    if (!(ALLOWED_API_PREFIXES as readonly string[]).includes(prefix)
      || path.some((segment) => !SEGMENT_PATTERN.test(segment))) {
      return Response.json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested API route was not found.' } }, { status: 404 });
    }
    const base = new URL(configuredBase);
    if (base.protocol !== 'http:' && base.protocol !== 'https:') throw new Error('Unsupported protocol');
    const normalizedBase = base.toString().replace(/\/$/, '');
    upstreamUrl = new URL(`${normalizedBase}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`);
  } catch {
    return Response.json({ success: false, error: { code: 'API_NOT_CONFIGURED', message: 'The Nexus API configuration is invalid.' } }, { status: 503 });
  }

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      ...(request.method === 'GET' || request.method === 'HEAD' ? {} : { body: await request.arrayBuffer() }),
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch {
    return Response.json({ success: false, error: { code: 'API_UNAVAILABLE', message: 'Unable to reach Nexus. Check your connection and try again.' } }, { status: 502 });
  }

  const isGoogleInitiation = requestPath.length === 2 && requestPath[0] === 'auth' && requestPath[1] === 'google';
  const upstreamLocation = upstream.headers.get('location');
  if (isGoogleInitiation && upstream.status >= 300 && upstream.status < 400) {
    try {
      const googleUrl = upstreamLocation ? new URL(upstreamLocation) : null;
      if (!googleUrl || googleUrl.protocol !== 'https:' || googleUrl.hostname !== 'accounts.google.com') {
        throw new Error('Invalid Google authorization redirect');
      }
    } catch {
      return Response.redirect(new URL('/auth/google/callback?error=OAUTH_FAILED', request.nextUrl.origin), 303);
    }
  } else if (isGoogleInitiation && !upstream.ok) {
    let errorCode = 'OAUTH_FAILED';
    try {
      const payload = await upstream.clone().json() as { error?: { code?: string } };
      if (payload.error?.code === 'GOOGLE_AUTH_UNAVAILABLE' || payload.error?.code === 'LOGIN_RATE_LIMITED') {
        errorCode = payload.error.code;
      }
    } catch {
      // A malformed upstream error uses the generic callback message.
    }
    return Response.redirect(new URL(`/auth/google/callback?error=${errorCode}`, request.nextUrl.origin), 303);
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  if (isGoogleInitiation && upstreamLocation) responseHeaders.set('location', upstreamLocation);
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export const GET = forwardRequest;
export const POST = forwardRequest;
export const PATCH = forwardRequest;
export const PUT = forwardRequest;
export const DELETE = forwardRequest;
