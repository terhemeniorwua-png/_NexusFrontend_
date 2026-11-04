import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

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

  it('proxies the confirmed workspace API for account-type workspace resolution', async () => {
    process.env.NEXUS_API_URL = 'http://localhost:4000/api/v1';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/workspaces');

    const response = await (await import('./route')).GET(request, {
      params: Promise.resolve({ path: ['workspaces'] }),
    });

    expect(response.status).toBe(200);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:4000/api/v1/workspaces');
  });

  it('does not proxy routes outside the confirmed auth and workspace APIs', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const request = new NextRequest('http://localhost/api/backend/users');

    const response = await (await import('./route')).GET(request, {
      params: Promise.resolve({ path: ['users'] }),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
