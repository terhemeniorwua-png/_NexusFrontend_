import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import AppHomePage from './page';

const { router } = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

const userResponse = {
  id: 'user-id',
  email: 'ada@example.com',
  name: 'Ada',
  status: 'ACTIVE' as const,
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function successResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('AppHomePage session boundary', () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
    router.push.mockReset();
    router.replace.mockReset();
  });

  it('shows a loading state while restoring a cookie session, then loads the user', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successResponse({ accessToken: 'memory-token', user: userResponse, tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf', session: { id: 'session-id', expiresAt: '2026-01-02T00:00:00.000Z' } }))
      .mockResolvedValueOnce(successResponse({ user: userResponse }));

    render(<AppHomePage />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(await screen.findByRole('heading', { name: 'Welcome, Ada.' })).toBeInTheDocument();
    expect(getAccessToken()).toBe('memory-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      '/api/backend/auth/refresh',
      '/api/backend/auth/me',
    ]);
  });

  it('refreshes an expired access token once and then reloads the session user', async () => {
    setAccessToken('expired-access-token');
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: false,
        error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in is required.' },
      }), { status: 401, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(successResponse({ accessToken: 'renewed-access-token', user: userResponse, tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf', session: { id: 'session-id', expiresAt: '2026-01-02T00:00:00.000Z' } }))
      .mockResolvedValueOnce(successResponse({ user: userResponse }));

    render(<AppHomePage />);

    expect(await screen.findByRole('heading', { name: 'Welcome, Ada.' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([input]) => input)).toEqual([
      '/api/backend/auth/me',
      '/api/backend/auth/refresh',
      '/api/backend/auth/me',
    ]);
    expect(getAccessToken()).toBe('renewed-access-token');
  });

  it('redirects to sign-in when the session refresh is unauthorized', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      success: false,
      error: { code: 'REFRESH_TOKEN_INVALID', message: 'No active session was found.' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }));

    render(<AppHomePage />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/sign-in'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your session has expired. Redirecting to sign in');
    expect(screen.queryByRole('heading', { name: /Welcome,/ })).not.toBeInTheDocument();
  });

  it('keeps a recoverable error state when the API cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));

    render(<AppHomePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach Nexus');
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('clears the in-memory access token and returns home after sign-out', async () => {
    setAccessToken('memory-token');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(successResponse({ user: userResponse }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const user = userEvent.setup();

    render(<AppHomePage />);
    await screen.findByRole('heading', { name: 'Welcome, Ada.' });
    await user.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/'));
    expect(getAccessToken()).toBeNull();
  });
});
