import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, setAccessToken } from '@/lib/api';
import { readPendingOnboardingIntent, savePendingOnboardingIntent } from '@/lib/onboarding-intent';
import { AuthForm } from '../AuthForm';

const { router } = vi.hoisted(() => ({ router: { push: vi.fn() } }));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

/** Type a 6-digit code into the CodeInput boxes by pasting. */
async function typeCode(user: ReturnType<typeof userEvent.setup>, code: string) {
  // Paste into the first box — CodeInput handles paste across all boxes.
  const firstBox = screen.getByRole('textbox', { name: 'Verification code 1' });
  await user.click(firstBox);
  await user.paste(code);
}

describe('AuthForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setAccessToken(null);
    window.localStorage.clear();
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

  // ── FIXED: click "Send code" (not "Send reset link") and expect the code-flow notice ──
  it('shows a notice after requesting password recovery', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { message: 'If an account exists, we sent a code' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="forgot-password" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Send code' }));
    expect(await screen.findByText('If an account exists, we sent a code')).toBeInTheDocument();
  });

  // ── FIXED: assert router.push to /verify-email and new notice text ──
  it('submits registration and directs the user to verify their address', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@example.com' }, verificationRequired: true },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);
    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(
      `/verify-email?email=${encodeURIComponent('ada@example.com')}`,
    ));
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@example.com', password: 'Nexus-password-42' }),
    }));
  }, 15_000);

  // ── FIXED: assert router.push to /verify-email and readPendingOnboardingIntent ──
  it('registers an institution owner through the existing identity contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@school.example' }, verificationRequired: true },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" accountType="institution" />);
    await user.type(screen.getByLabelText(/Administrator or account owner name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Institution administrator email/), 'ada@school.example');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(
      `/verify-email?email=${encodeURIComponent('ada@school.example')}`,
    ));
    expect(readPendingOnboardingIntent('ada@school.example')).toEqual({ accountType: 'institution', email: 'ada@school.example' });
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@school.example', password: 'Nexus-password-42' }),
    }));
  });

  // ── FIXED: assert router.push to /verify-email and readPendingOnboardingIntent ──
  it('registers a business owner through the same identity contract without organization fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@acme.example' }, verificationRequired: true },
    }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" accountType="business" />);
    await user.type(screen.getByLabelText(/Administrator or account owner name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Business email/), 'ada@acme.example');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith(
      `/verify-email?email=${encodeURIComponent('ada@acme.example')}`,
    ));
    expect(readPendingOnboardingIntent('ada@acme.example')).toEqual({ accountType: 'business', email: 'ada@acme.example' });
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ name: 'Ada Lovelace', email: 'ada@acme.example', password: 'Nexus-password-42' }),
    }));
    const [, init] = fetchMock.mock.calls[0];
    expect(Object.keys(JSON.parse(String(init?.body))).sort()).toEqual(['email', 'name', 'password']);
  }, 15_000);

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

  it('offers recovery while an account is in the scheduled deletion period', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'ACCOUNT_PENDING_DELETION', message: 'This account is being deleted and can no longer sign in.' },
    }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" />);

    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Restore it within 30 days');
    expect(screen.getByRole('button', { name: 'Reactivate account' })).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
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

  it('resolves a selected business workspace using backend membership before continuing', async () => {
    const company = { id: 'company-id', type: 'COMPANY', isPersonal: false };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
        accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf', session: { id: 'session', expiresAt: '' },
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [
        { id: 'personal-id', type: 'INDIVIDUAL', isPersonal: true }, company,
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: company }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" accountType="business" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app'));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/company-id/switch', expect.objectContaining({ method: 'POST' }));
    expect(window.localStorage.getItem('nexus-active-workspace')).toBe('company-id');
  });

  it('carries an institution selection into protected workspace onboarding when no matching membership exists', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
        accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf', session: { id: 'session', expiresAt: '' },
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [
        { id: 'personal-id', type: 'INDIVIDUAL', isPersonal: true },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" accountType="institution" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app/workspaces?type=INSTITUTION'));
  });

  it('keeps Personal sign-in in the personal app route if the personal workspace is unexpectedly absent', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        user: { id: 'user-id', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
        accessToken: 'access-token', tokenType: 'Bearer', expiresIn: 900, csrfToken: 'csrf', session: { id: 'session', expiresAt: '' },
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [
        { id: 'company-id', type: 'COMPANY', isPersonal: false },
      ] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-in" accountType="personal" />);
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/app'));
    expect(router.push).not.toHaveBeenCalledWith('/app/workspaces');
  });

  // ── FIXED: use initialEmail + CodeInput (6-digit code boxes) instead of initialToken.
  // Pasting 6 digits triggers onComplete which auto-submits — no need to click "Verify email".
  it('submits a 6-digit verification code to the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialEmail="ada@example.com" />);

    // Pasting a complete 6-digit code triggers onComplete → handleVerifySubmit automatically.
    await typeCode(user, '123456');

    expect(await screen.findByText('Your email is verified. You can now sign in to Nexus.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/email/verify', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', code: '123456' }),
    }));
  });

  // ── FIXED: use initialEmail + code boxes, assert new endpoint ──
  it('resumes institution intent after verification and links to the selected sign-in flow', async () => {
    savePendingOnboardingIntent({ accountType: 'institution', email: 'ada@school.example' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@school.example', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: '2026-11-04T00:00:00.000Z', createdAt: '' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialEmail="ada@school.example" />);

    await typeCode(user, '654321');
    expect(await screen.findByText(/create or resume your institution workspace/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    expect(router.push).toHaveBeenCalledWith('/sign-in?accountType=institution');
  });

  // ── FIXED: use initialEmail + code boxes, assert new endpoint ──
  it.each([
    ['personal', 'Your email is verified. You can now sign in to Nexus.', '/sign-in?accountType=personal'],
    ['business', 'Your email is verified. Sign in to create or resume your business workspace.', '/sign-in?accountType=business'],
  ])('continues a verified %s account to the matching sign-in route', async (accountType, notice, route) => {
    savePendingOnboardingIntent({ accountType: accountType as 'personal' | 'business', email: 'ada@acme.example' });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { user: { id: 'user-id', email: 'ada@acme.example', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: '2026-11-04T00:00:00.000Z', createdAt: '' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialEmail="ada@acme.example" />);

    await typeCode(user, '111222');
    expect(await screen.findByText(notice)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    expect(router.push).toHaveBeenCalledWith(route);
  });

  // ── FIXED: wrong code returns INVALID_OR_EXPIRED_CODE, expect friendly message and cleared boxes ──
  it('shows a friendly error and clears the code boxes when the verification code is wrong', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: false,
      error: { code: 'INVALID_OR_EXPIRED_CODE', message: 'That code is incorrect or has expired.' },
    }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialEmail="ada@example.com" />);

    await typeCode(user, '999999');
    await user.click(screen.getByRole('button', { name: 'Verify email' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That code is incorrect or has expired.');
    // All 6 boxes should be cleared
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByRole('textbox', { name: `Verification code ${i}` })).toHaveValue('');
    }
  });

  // ── FIXED: "Resend code" button calls /api/backend/auth/email/resend and shows cooldown label ──
  it('calls the resend endpoint and shows a cooldown label when the resend button is clicked', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { user: { id: 'user-id' } },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { message: 'A new code has been sent.' },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="verify-email" initialEmail="ada@example.com" />);

    // The resend button is visible from the start (no code needed to see it)
    const resendButton = screen.getByRole('button', { name: 'Resend code' });
    await user.click(resendButton);

    // After clicking, the cooldown label should appear
    expect(await screen.findByRole('button', { name: /Resend code \(\d+s\)/ })).toBeInTheDocument();
    // And the resend endpoint should have been called
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledWith(
      '/api/backend/auth/email/resend',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'ada@example.com' }),
      }),
    );
  });

  // ── FIXED: use initialEmail + code boxes + new /auth/password/reset endpoint with {email, code, newPassword} ──
  it('submits a reset code and new password to the backend contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { message: 'Your password has been reset. Please sign in again.' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="reset-password" initialEmail="ada@example.com" />);

    await typeCode(user, '123456');
    await user.type(screen.getByLabelText(/New password/), 'Nexus-password-42');
    await user.type(screen.getByLabelText(/Confirm new password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByText('Your password has been reset. Please sign in again.')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Sign in with your new password' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/password/reset', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', code: '123456', newPassword: 'Nexus-password-42' }),
    }));
  });

  // ── FIXED: after registration, "Resend verification code" calls /api/backend/auth/email/resend ──
  it('resends the verification code after successful registration', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { user: { id: 'user-id', email: 'ada@example.com' }, verificationRequired: true } }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { message: 'A new code has been sent.' } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(<AuthForm mode="sign-up" />);

    await user.type(screen.getByLabelText(/Full name/), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    // After registration the "Resend verification code" button appears
    await user.click(await screen.findByRole('button', { name: 'Resend verification code' }));

    expect(await screen.findByText('A new code has been sent.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/backend/auth/email/resend', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com' }),
    }));
  });

  it('returns to a validated redirect target after signing in', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      success: true,
      data: { accessToken: 'fresh-token' },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const user = userEvent.setup();
    render(
      <AuthForm
        mode="sign-in"
        redirectPath="/workspaces/invitations/accept?token=abc_-123"
      />,
    );
    await user.type(screen.getByLabelText(/Email address/), 'ada@example.com');
    await user.type(screen.getByLabelText(/Password/), 'Nexus-password-42');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/workspaces/invitations/accept?token=abc_-123'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/auth/login', expect.objectContaining({ method: 'POST' }));
  });
});
