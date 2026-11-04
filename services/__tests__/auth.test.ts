import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import { reactivateAccount, refreshSession, signIn } from '../auth';

describe('auth service', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  it('posts sign-in credentials and keeps the access token in memory', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
        accessToken: 'short-lived-access-token', tokenType: 'Bearer', expiresIn: 900,
        csrfToken: 'csrf-value', session: { id: 'session-id', expiresAt: '2026-01-02T00:00:00.000Z' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await signIn({ email: 'ada@example.com', password: 'Nexus-pass-123' });
    expect(result.user.name).toBe('Ada');
    expect(getAccessToken()).toBe('short-lived-access-token');
    expect(fetch).toHaveBeenCalledWith('/api/backend/auth/login', expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify({ email: 'ada@example.com', password: 'Nexus-pass-123' }),
    }));
  });

  it('reactivates an account through the confirmed public auth contract without creating a session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: '2026-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const result = await reactivateAccount({ email: 'ada@example.com', password: 'Nexus-pass-123' });

    expect(result.user.status).toBe('ACTIVE');
    expect(getAccessToken()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/reactivate', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email: 'ada@example.com', password: 'Nexus-pass-123' }),
    }));
  });

  it('clears an expired in-memory access token when refresh fails', async () => {
    setAccessToken('expired-access-token');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'SESSION_EXPIRED', message: 'Your session has expired.' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    await expect(refreshSession()).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    expect(getAccessToken()).toBeNull();
  });
});
