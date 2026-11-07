import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import { completeTwoFactorLogin, exchangeGoogleLoginCode } from '@/services/auth';

const authResponse = {
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    status: 'ACTIVE' as const,
    emailVerifiedAt: '2026-11-07T00:00:00.000Z',
    createdAt: '2026-11-07T00:00:00.000Z',
  },
  accessToken: 'access-token',
  tokenType: 'Bearer' as const,
  expiresIn: 900,
  csrfToken: 'csrf-token',
  session: { id: 'session-1', expiresAt: '2026-11-08T00:00:00.000Z' },
};

function apiResponse(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Google OAuth auth services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
  });

  it('exchanges the one-time callback code and keeps the access token in memory', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(apiResponse(authResponse));

    const result = await exchangeGoogleLoginCode('one-time-google-code');

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/google/exchange', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ code: 'one-time-google-code' }),
    }));
    expect(result).toEqual(authResponse);
    expect(getAccessToken()).toBe('access-token');
  });

  it('shares the same in-flight exchange to prevent duplicate callback requests', async () => {
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise((resolve) => {
      resolveFetch = resolve;
    }));

    const first = exchangeGoogleLoginCode('one-time-google-code');
    const second = exchangeGoogleLoginCode('one-time-google-code');
    expect(fetchMock).toHaveBeenCalledOnce();
    resolveFetch?.(apiResponse(authResponse));
    await expect(Promise.all([first, second])).resolves.toEqual([authResponse, authResponse]);
  });

  it('returns a second-factor challenge without creating an access token', async () => {
    const challenge = { twoFactorRequired: true as const, challengeToken: 'short-lived-challenge', expiresIn: 300 };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(apiResponse(challenge));

    await expect(exchangeGoogleLoginCode('one-time-google-code')).resolves.toEqual(challenge);
    expect(getAccessToken()).toBeNull();
  });

  it('completes a two-factor challenge and stores the returned access token in memory', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(apiResponse(authResponse));

    await completeTwoFactorLogin({ challengeToken: 'challenge-token', code: '123456' });

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/2fa/challenge', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ challengeToken: 'challenge-token', code: '123456' }),
    }));
    expect(getAccessToken()).toBe('access-token');
  });
});
