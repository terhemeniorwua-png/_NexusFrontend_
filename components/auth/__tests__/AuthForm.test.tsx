import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import { AuthForm } from '../AuthForm';

const { router } = vi.hoisted(() => ({ router: { push: vi.fn() } }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
    router.push.mockReset();
  });

  it('validates a weak sign-up password before making a request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 8 characters.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a verified success message after requesting password recovery', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { message: 'If the address can be used, a message with the next step has been sent.' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="forgot-password" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByText(/For your security/)).toBeInTheDocument();
  });

  it('submits registration and directs the user to verify their address', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id' }, verificationRequired: true },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);
    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Check your inbox for the verification link/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'Nexus-password-42' }),
    }));
  });

  it('shows an authentication error when sign-in is rejected', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'The email address or password is incorrect.' },
    }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password combination was not recognised.');
  });

  it('stores the returned access token in memory and continues to the app after sign-in', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: {
        user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '2026-01-01T00:00:00.000Z' },
        accessToken: 'short-lived-access-token', tokenType: 'Bearer', expiresIn: 900,
        csrfToken: 'csrf-value', session: { id: 'session-id', expiresAt: '2026-01-02T00:00:00.000Z' },
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" />);

    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app'));
    expect(getAccessToken()).toBe('short-lived-access-token');
  });

  it('submits an email verification token to the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialToken="a-valid-verification-token-from-email" />);

    await user.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByText('Your email is verified. You can now sign in to Nexus.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/verify-email', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'a-valid-verification-token-from-email' }),
    }));
  });

  it('resends verification after successful registration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { user: { id: 'user-id' }, verificationRequired: true } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { message: 'If the address can be used, a message with the next step has been sent.' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);

    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await screen.findByText(/Check your inbox for the verification link/);
    await user.click(screen.getByRole('button', { name: 'Resend verification email' }));

    expect(await screen.findByText(/If the address can be used/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/backend/auth/resend-verification', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com' }),
    }));
  });

  it('submits password reset tokens to the backend contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { message: 'Your password has been reset. Please sign in again.' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="reset-password" initialToken="a-valid-reset-token-from-email" />);
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.type(screen.getByLabelText(/Confirm new password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Your password has been reset. Please sign in again.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/password/reset', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'a-valid-reset-token-from-email', password: 'Nexus-password-42' }),
    }));
  });
});
