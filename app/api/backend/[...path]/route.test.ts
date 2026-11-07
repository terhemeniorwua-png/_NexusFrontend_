import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

describe('same-origin backend proxy', () => {
  beforeEach(() => {
    vi.stubEnv('NEXUS_API_URL', 'http://localhost:4000/api/v1');
    vi.restoreAllMocks();
  });

  it('forwards authentication headers and preserves backend cookies', async () => {
    const upstreamHeaders = new Headers({ 'Content-Type': 'application/json' });
    upstreamHeaders.append('Set-Cookie', 'nexus_rt=opaque; HttpOnly; SameSite=Lax; Path=/');
    upstreamHeaders.append('Set-Cookie', 'nexus_csrf=csrf; SameSite=Lax; Path=/');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {} }), {
      status: 200,
      headers: upstreamHeaders,
    }));
    vi.stubGlobal('fetch', fetchMock);

    const request = new NextRequest('http://localhost/api/backend/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'nexus_rt=opaque; nexus_csrf=csrf',
        'User-Agent': 'Nexus browser test',
        'x-csrf-token': 'csrf',
        Authorization: 'Bearer access-token',
      },
      body: JSON.stringify({ email: 'ada@example.com', password: 'secret' }),
    });
    const response = await POST(request, { params: Promise.resolve({ path: ['auth', 'login'] }) });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    const requestHeaders = new Headers(init.headers);
    expect(String(url)).toBe('http://localhost:4000/api/v1/auth/login');
    expect(init).toMatchObject({ method: 'POST', cache: 'no-store' });
    expect(requestHeaders.get('authorization')).toBe('Bearer access-token');
    expect(requestHeaders.get('cookie')).toBe('nexus_rt=opaque; nexus_csrf=csrf');
    expect(requestHeaders.get('user-agent')).toBe('Nexus browser test');
    expect(requestHeaders.get('x-csrf-token')).toBe('csrf');
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      'nexus_rt=opaque; HttpOnly; SameSite=Lax; Path=/',
      'nexus_csrf=csrf; SameSite=Lax; Path=/',
    ]);
  });

  it('passes the backend Google authorization redirect through the same-origin proxy', async () => {
    const googleUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=opaque-state';
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: googleUrl },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/auth/google');

    const response = await GET(request, { params: Promise.resolve({ path: ['auth', 'google'] }) });

    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:4000/api/v1/auth/google');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(googleUrl);
  });

  it('returns Google initiation failures to the styled frontend callback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'GOOGLE_AUTH_UNAVAILABLE', message: 'Google sign-in is not configured.' },
    }), { status: 503, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/auth/google');

    const response = await GET(request, { params: Promise.resolve({ path: ['auth', 'google'] }) });

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost/auth/google/callback?error=GOOGLE_AUTH_UNAVAILABLE');
  });

  it('proxies the confirmed workspace API for account-type workspace resolution', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/workspaces');

    const response = await GET(request, {
      params: Promise.resolve({ path: ['workspaces'] }),
    });

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:4000/api/v1/workspaces');
  });

  it.each([
    [['users', 'me'], 'http://localhost:4000/api/v1/users/me'],
    [['billing', 'plans'], 'http://localhost:4000/api/v1/billing/plans'],
    [['invitations'], 'http://localhost:4000/api/v1/invitations'],
    [['notifications'], 'http://localhost:4000/api/v1/notifications'],
    [['notifications', 'unread-count'], 'http://localhost:4000/api/v1/notifications/unread-count'],
  ])('proxies the confirmed %s module', async (path, expectedUrl) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest(`http://localhost/api/backend/${path.join('/')}`);

    const response = await GET(request, { params: Promise.resolve({ path }) });

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(expectedUrl);
  });

  it('forwards base64url invitation tokens without mangling them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: {} }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const token = 'AbC_-123xyz';
    const request = new NextRequest(`http://localhost/api/backend/invitations/${token}`);

    const response = await GET(request, { params: Promise.resolve({ path: ['invitations', token] }) });

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`http://localhost:4000/api/v1/invitations/${token}`);
  });

  it('does not proxy modules outside the confirmed allowlist', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/teams');

    const response = await GET(request, { params: Promise.resolve({ path: ['teams'] }) });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsafe path segments', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/workspaces/%2E%2E');

    const response = await GET(request, { params: Promise.resolve({ path: ['workspaces', '..'] }) });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
