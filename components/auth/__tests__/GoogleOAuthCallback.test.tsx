import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleOAuthCallback } from '../GoogleOAuthCallback';
import { saveGoogleOAuthIntent } from '@/lib/google-oauth';

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  exchange: vi.fn(),
  completeTwoFactor: vi.fn(),
  listWorkspaces: vi.fn(),
  switchWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/services/auth', () => ({
  exchangeGoogleLoginCode: mocks.exchange,
  completeTwoFactorLogin: mocks.completeTwoFactor,
}));
vi.mock('@/services/workspaces', () => ({
  listWorkspaces: mocks.listWorkspaces,
  switchWorkspace: mocks.switchWorkspace,
}));

const authResponse = {
  user: {
    id: 'user-1', email: 'ada@example.com', name: 'Ada Lovelace', status: 'ACTIVE',
    emailVerifiedAt: '2026-11-07T00:00:00.000Z', createdAt: '2026-11-07T00:00:00.000Z',
  },
  accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf-token',
  session: { id: 'session-1', expiresAt: '2026-11-08T00:00:00.000Z' },
};

describe('Google OAuth callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.listWorkspaces.mockResolvedValue([]);
  });

  it('exchanges the callback code, removes it from browser history, and resumes company setup', async () => {
    mocks.exchange.mockResolvedValue(authResponse);
    saveGoogleOAuthIntent({ mode: 'sign-up', accountType: 'business' });
    const historySpy = vi.spyOn(window.history, 'replaceState');

    render(<GoogleOAuthCallback code="short-lived-code" />);

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/app/workspaces?type=COMPANY'));
    expect(mocks.exchange).toHaveBeenCalledWith('short-lived-code');
    expect(historySpy).toHaveBeenCalledWith(null, '', '/auth/google/callback');
    expect(window.sessionStorage.getItem('nexus-google-oauth-intent')).toBeNull();
  });

  it('shows a useful cancellation message without attempting code exchange', async () => {
    render(<GoogleOAuthCallback error="OAUTH_CANCELLED" />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Google sign-in was cancelled/i);
    expect(mocks.exchange).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Return to sign in' })).toHaveAttribute('href', '/sign-in');
  });

  it('completes the backend second-factor challenge before redirecting', async () => {
    mocks.exchange.mockResolvedValue({
      twoFactorRequired: true,
      challengeToken: 'challenge-token',
      expiresIn: 300,
    });
    mocks.completeTwoFactor.mockResolvedValue(authResponse);
    const user = userEvent.setup();

    render(<GoogleOAuthCallback code="short-lived-code" />);
    await user.type(await screen.findByLabelText(/Authentication code/), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/app'));
    expect(mocks.completeTwoFactor).toHaveBeenCalledWith({ challengeToken: 'challenge-token', code: '123456' });
  });
});
