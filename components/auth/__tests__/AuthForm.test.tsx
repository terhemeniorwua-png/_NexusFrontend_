import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from '../AuthForm';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('AuthForm', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

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
