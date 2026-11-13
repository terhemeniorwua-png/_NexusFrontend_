'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { Input } from '@/components/ui/Input';
import { ApiRequestError, setAccessToken } from '@/lib/api';
import { beginGoogleOAuth } from '@/lib/google-oauth';
import { clearPendingOnboardingIntent, readPendingOnboardingIntent, savePendingOnboardingIntent, subscribePendingOnboardingIntent } from '@/lib/onboarding-intent';
import { safeRedirectPath } from '@/lib/redirect';
import {
  register,
  requestPasswordResetCode,
  resendVerificationCode,
  resetPasswordWithCode,
  signIn,
  verifyEmailWithCode,
  reactivateAccount,
} from '@/services/auth';
import { listWorkspaces, switchWorkspace } from '@/services/workspaces';
import type { AuthAccountType } from '@/types/auth';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | 'verify-email';
type ForgotStage = 'email' | 'code' | 'done';

const AUTH_EMAIL_STORAGE_KEY = 'nexus-auth-email';
const RESEND_COOLDOWN_SECONDS = 60;

const passwordSchema = z.string().min(8, 'Use at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Include at least one letter and one number.');
const emailSchema = z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.');

const modeContent: Record<AuthMode, { title: string; subtitle: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to continue to your workspace.' },
  'sign-up': { title: 'Create your Nexus account', subtitle: 'One account for all your workspaces.' },
  'forgot-password': { title: 'Reset your password', subtitle: 'We’ll send a one-time code to your email if an account matches.' },
  'reset-password': { title: 'Choose a new password', subtitle: 'Use a strong password you have not used before.' },
  'verify-email': { title: 'Check your email', subtitle: 'We sent a six-digit code to verify your account.' },
};

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5 shrink-0">
      <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z" />
      <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.7-5.1c-1.8 1.2-4 1.9-6.8 1.9-5.2 0-9.6-3.5-11.2-8.2H5.9v5.2A20 20 0 0 0 24 44Z" />
      <path fill="#FBBC05" d="M12.8 27.7a12 12 0 0 1 0-7.4v-5.2H5.9a20 20 0 0 0 0 17.8l6.9-5.2Z" />
      <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 6 29.5 4 24 4A20 20 0 0 0 5.9 15.1l6.9 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
    </svg>
  );
}

function readStoredAuthEmail(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveStoredAuthEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (email) window.sessionStorage.setItem(AUTH_EMAIL_STORAGE_KEY, email.trim().toLowerCase());
    else window.sessionStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function clearStoredAuthEmail(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(AUTH_EMAIL_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browser contexts.
  }
}

function friendlyError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return 'Something went wrong. Please try again.';
  if (error.code === 'INVALID_OR_EXPIRED_CODE') return 'That code is incorrect or has expired.';
  if (error.code === 'TOO_MANY_ATTEMPTS') return 'Too many attempts. Request a new code to continue.';
  if (error.status === 401) return 'That email and password combination was not recognised.';
  if (error.code === 'ACCOUNT_DEACTIVATED') return 'This account is deactivated. You can reactivate it with your current password.';
  if (error.code === 'ACCOUNT_PENDING_DELETION') return 'This account is scheduled for deletion. Restore it within 30 days to sign in.';
  if (error.status === 429) return 'Too many attempts, try again in a few minutes.';
  if (error.status === 403) return error.message;
  if (error.status === 409) return 'An account with this email already exists. Try signing in instead.';
  return error.message;
}

async function postLoginPath(accountType?: AuthAccountType, redirectPath?: string): Promise<string> {
  const safeRedirect = safeRedirectPath(redirectPath);
  if (safeRedirect) return safeRedirect;
  if (!accountType) return '/app';

  const workspaceType = accountType === 'business' ? 'COMPANY' : accountType === 'institution' ? 'INSTITUTION' : 'INDIVIDUAL';
  try {
    const workspaces = await listWorkspaces();
    const workspace = accountType === 'personal'
      ? workspaces.find((item) => item.isPersonal) ?? workspaces.find((item) => item.type === workspaceType)
      : workspaces.find((item) => item.type === workspaceType);
    if (workspace) {
      const activeWorkspace = await switchWorkspace(workspace.id);
      try {
        window.localStorage.setItem('nexus-active-workspace', activeWorkspace.id);
      } catch {
        // Workspace switching already succeeded on the backend.
      }
      return '/app';
    }
  } catch {
    // The authenticated application can retry workspace loading after redirect.
  }

  if (workspaceType === 'COMPANY' || workspaceType === 'INSTITUTION') {
    return `/app/workspaces?type=${workspaceType}`;
  }
  return '/app';
}

export function AuthForm({ mode, initialEmail = '', accountType, redirectPath, deletionScheduledAt, onSwitchMode, onBackToAccountType }: { mode: AuthMode; initialToken?: string; initialEmail?: string; accountType?: AuthAccountType; redirectPath?: string; deletionScheduledAt?: string; onSwitchMode?: (mode: 'sign-in' | 'sign-up') => void; onBackToAccountType?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  // Only the verify and reset pages restore the email from this tab's session, so sign-in
  // and sign-up never prefill (or accumulate) an address typed on an earlier visit.
  const [email, setEmail] = useState(
    initialEmail || (mode === 'verify-email' || mode === 'reset-password' ? readStoredAuthEmail() : ''),
  );
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const googleStartInProgress = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [forgotStage, setForgotStage] = useState<ForgotStage>(mode === 'forgot-password' ? 'email' : 'code');
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [resending, setResending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [reactivationAvailable, setReactivationAvailable] = useState(false);
  const [verifiedAccountType, setVerifiedAccountType] = useState<AuthAccountType | null>(null);
  const pendingEmail = useSyncExternalStore(
    subscribePendingOnboardingIntent,
    () => readPendingOnboardingIntent()?.email ?? initialEmail,
    () => initialEmail,
  );

  const deletionDate = deletionScheduledAt && !Number.isNaN(Date.parse(deletionScheduledAt))
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(deletionScheduledAt))
    : null;

  const content = modeContent[mode];

  useEffect(() => {
    if (mode === 'verify-email' || mode === 'forgot-password' || mode === 'reset-password') {
      saveStoredAuthEmail(email);
    }
  }, [email, mode]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  function handleGoogleSignIn() {
    if (mode !== 'sign-in' && mode !== 'sign-up') return;
    if (busy || googleStartInProgress.current) return;
    googleStartInProgress.current = true;
    setGoogleBusy(true);
    beginGoogleOAuth({ mode, accountType, redirectPath }, (path) => window.location.assign(path));
  }

  function withRedirect(path: string): string {
    if (!redirectPath) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}redirect=${encodeURIComponent(redirectPath)}`;
  }

  async function handleResendCode() {
    const validEmail = emailSchema.safeParse(email || pendingEmail);
    if (!validEmail.success) {
      setError('Enter a valid email address.');
      return;
    }
    if (cooldownLeft > 0 || resending) return;
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === 'verify-email') {
        const response = await resendVerificationCode(validEmail.data);
        setNotice(response.message || 'A new code has been sent.');
      } else {
        const response = await requestPasswordResetCode(validEmail.data);
        setNotice(response.message || 'If an account exists, we sent a code');
      }
      setCooldownLeft(RESEND_COOLDOWN_SECONDS);
      setCode('');
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setResending(false);
    }
  }

  // codeOverride lets auto-submit pass the freshly typed code instead of the stale state value.
  async function handleVerifySubmit(event?: FormEvent<HTMLFormElement>, codeOverride?: string) {
    event?.preventDefault();
    const currentCode = codeOverride ?? code;
    const validatedEmail = emailSchema.safeParse(email || pendingEmail);
    if (!validatedEmail.success) {
      setError(validatedEmail.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(currentCode)) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await verifyEmailWithCode({ email: validatedEmail.data, code: currentCode });
      if ('accessToken' in result && typeof result.accessToken === 'string') {
        setAccessToken(result.accessToken);
        const destination = await postLoginPath(accountType, redirectPath);
        clearStoredAuthEmail();
        router.push(destination);
        return;
      }
      setComplete(true);
      const pending = readPendingOnboardingIntent(validatedEmail.data);
      if (pending) setVerifiedAccountType(pending.accountType);
      setNotice(pending?.accountType === 'institution'
        ? 'Your email is verified. Sign in to create or resume your institution workspace.'
        : pending?.accountType === 'business'
          ? 'Your email is verified. Sign in to create or resume your business workspace.'
          : 'Your email is verified. You can now sign in to Nexus.');
    } catch (requestError) {
      setError(friendlyError(requestError));
      if (requestError instanceof ApiRequestError && requestError.code === 'INVALID_OR_EXPIRED_CODE') {
        setCode('');
        setTimeout(() => { if (typeof document !== 'undefined') document.getElementById('verify-code-0')?.focus(); }, 0);
      }
      if (requestError instanceof ApiRequestError && requestError.code === 'TOO_MANY_ATTEMPTS') {
        setCode('');
        setCooldownLeft(0);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleForgotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (forgotStage === 'email') {
      const valid = emailSchema.safeParse(email);
      if (!valid.success) {
        setError(valid.error.issues[0]?.message ?? 'Enter a valid email address.');
        return;
      }
      setBusy(true);
      try {
        await requestPasswordResetCode(valid.data);
        setForgotStage('code');
        setCooldownLeft(RESEND_COOLDOWN_SECONDS);
        setNotice('If an account exists, we sent a code');
        setCode('');
      } catch (requestError) {
        setError(friendlyError(requestError));
      } finally {
        setBusy(false);
      }
      return;
    }

    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) {
      setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    const validPassword = passwordSchema.safeParse(password);
    if (!validPassword.success) {
      setError(validPassword.error.issues[0]?.message ?? 'Enter a valid password.');
      return;
    }
    if (password !== confirmation) {
      setError('Your passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await resetPasswordWithCode({ email: validEmail.data, code, newPassword: password });
      setForgotStage('done');
      setNotice('Your password has been reset. Please sign in again.');
      setCode('');
      setPassword('');
      setConfirmation('');
    } catch (requestError) {
      setError(friendlyError(requestError));
      if (requestError instanceof ApiRequestError && requestError.code === 'INVALID_OR_EXPIRED_CODE') {
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResetSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) {
      setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code.');
      return;
    }
    const validPassword = passwordSchema.safeParse(password);
    if (!validPassword.success) {
      setError(validPassword.error.issues[0]?.message ?? 'Enter a valid password.');
      return;
    }
    if (password !== confirmation) {
      setError('Your passwords do not match.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await resetPasswordWithCode({ email: validEmail.data, code, newPassword: password });
      setComplete(true);
      setNotice('Your password has been reset. Please sign in again.');
      setCode('');
      setPassword('');
      setConfirmation('');
    } catch (requestError) {
      setError(friendlyError(requestError));
      if (requestError instanceof ApiRequestError && requestError.code === 'INVALID_OR_EXPIRED_CODE') {
        setCode('');
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setReactivationAvailable(false);

    if (mode === 'sign-in' || mode === 'sign-up' || mode === 'forgot-password') {
      const validEmail = emailSchema.safeParse(email);
      if (!validEmail.success) { setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.'); return; }
    }
    if (mode === 'sign-up') {
      const validName = z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be 100 characters or fewer.').safeParse(name);
      if (!validName.success) { setError(validName.error.issues[0]?.message ?? 'Enter your name.'); return; }
      const result = passwordSchema.safeParse(password);
      if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter a valid password.'); return; }
    }

    // The code-based modes have their own handlers and form submit paths.
    if (mode === 'forgot-password') {
      await handleForgotSubmit(event);
      return;
    }
    if (mode === 'reset-password') {
      await handleResetSubmit(event);
      return;
    }
    if (mode === 'verify-email') {
      await handleVerifySubmit(event);
      return;
    }

    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn({ email, password });
        if (redirectPath) {
          clearPendingOnboardingIntent(email);
          router.push(redirectPath);
        } else if (accountType) {
          const workspaces = await listWorkspaces();
          const wantedType = accountType === 'personal' ? 'INDIVIDUAL' : accountType === 'business' ? 'COMPANY' : 'INSTITUTION';
          const workspace = accountType === 'personal'
            ? workspaces.find((item) => item.isPersonal) ?? workspaces.find((item) => item.type === wantedType)
            : workspaces.find((item) => item.type === wantedType);
          if (workspace) {
            const activeWorkspace = await switchWorkspace(workspace.id);
            window.localStorage.setItem('nexus-active-workspace', activeWorkspace.id);
            clearPendingOnboardingIntent(email);
            router.push('/app');
          } else if (accountType === 'personal') {
            clearPendingOnboardingIntent(email);
            router.push('/app');
          } else {
            const workspaceType = accountType === 'business' ? 'COMPANY' : 'INSTITUTION';
            router.push(`/app/workspaces?type=${workspaceType}`);
          }
        } else {
          clearPendingOnboardingIntent(email);
          router.push('/app');
        }
      } else {
        const registration = await register({ name, email, password });
        savePendingOnboardingIntent({ accountType: accountType ?? 'personal', email: registration.user.email });
        saveStoredAuthEmail(registration.user.email);
        setComplete(true);
        setNotice('Check your email for the 6-digit verification code.');
        // Preserve the redirect through the verify-email step so that the user
        // lands on the correct destination (e.g. invitation accept page) after
        // verifying their email and signing in.
        const verifyPath = redirectPath
          ? `/verify-email?email=${encodeURIComponent(registration.user.email)}&redirect=${encodeURIComponent(redirectPath)}`
          : `/verify-email?email=${encodeURIComponent(registration.user.email)}`;
        router.push(verifyPath);
      }
    } catch (requestError) {
      setError(friendlyError(requestError));
      if (
        mode === 'sign-in' &&
        requestError instanceof ApiRequestError &&
        (requestError.code === 'ACCOUNT_DEACTIVATED' || requestError.code === 'ACCOUNT_PENDING_DELETION')
      ) {
        setReactivationAvailable(true);
      }
      if (mode === 'sign-in' && requestError instanceof ApiRequestError && (requestError.code === 'EMAIL_NOT_VERIFIED' || requestError.code === 'ACCOUNT_NOT_VERIFIED' || requestError.code === 'VERIFICATION_REQUIRED')) {
        const nextEmail = email.trim();
        if (nextEmail) {
          saveStoredAuthEmail(nextEmail);
          router.push(`/verify-email?email=${encodeURIComponent(nextEmail)}`);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleReactivate() {
    const validEmail = emailSchema.safeParse(email);
    if (!validEmail.success) {
      setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your current password to reactivate this account.');
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await reactivateAccount({ email: validEmail.data, password });
      setReactivationAvailable(false);
      setNotice(result.user.status === 'PENDING_VERIFICATION'
        ? 'Your account is restored. Check your email to verify it, then sign in.'
        : 'Your account is restored. Sign in again to start a new secure session.');
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    const validEmail = emailSchema.safeParse(email || pendingEmail);
    if (!validEmail.success) {
      setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await resendVerificationCode(validEmail.data);
      setNotice(response.message || 'A new code has been sent.');
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setBusy(false);
    }
  }

  const resendLabel = resending ? 'Sending…' : cooldownLeft > 0 ? `Resend code (${cooldownLeft}s)` : 'Resend code';

  const renderVerifyEmail = () => {
    if (complete) {
      return (
        <Button className="w-full" onClick={() => router.push(verifiedAccountType ? withRedirect(`/sign-in?accountType=${verifiedAccountType}`) : withRedirect('/sign-in'))}>
          Continue to sign in
        </Button>
      );
    }
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-border bg-surface-secondary p-4">
          <p className="text-sm text-text-secondary">We sent a six-digit code to</p>
          <p className="mt-1 text-base font-semibold text-text-primary">{email || pendingEmail || 'your email address'}</p>
        </div>
        <form onSubmit={(event) => { void handleVerifySubmit(event); }} className="space-y-4">
          <CodeInput
            id="verify-code"
            label="Verification code"
            value={code}
            onChange={setCode}
            onComplete={(value) => {
              if (value.length === 6 && !busy) void handleVerifySubmit(undefined, value);
            }}
            disabled={busy}
            autoFocus
          />
          <Button type="submit" className="w-full" size="lg" loading={busy} disabled={busy || code.length !== 6}>
            Verify email
          </Button>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => { void handleResendCode(); }} disabled={cooldownLeft > 0 || resending} className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
              {resendLabel}
            </button>
            <Link href={withRedirect('/sign-up')} className="text-sm font-medium text-primary hover:underline">
              Use a different email
            </Link>
          </div>
        </form>
      </div>
    );
  };

  const renderForgot = () => {
    if (forgotStage === 'done') {
      return <Button className="w-full" onClick={() => router.push(withRedirect('/sign-in'))}>Back to sign in</Button>;
    }

    if (forgotStage === 'email') {
      return (
        <form className="space-y-5" onSubmit={(event) => { void handleForgotSubmit(event); }} noValidate>
          <Input id="forgot-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />
          <Button type="submit" className="w-full" size="lg" loading={busy} disabled={busy}>
            Send code
          </Button>
        </form>
      );
    }

    return (
      <form className="space-y-5" onSubmit={(event) => { void handleForgotSubmit(event); }} noValidate>
        <CodeInput
          id="forgot-code"
          label="Verification code"
          value={code}
          onChange={setCode}
          disabled={busy}
          autoFocus
        />
        <Input id="reset-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />
        <Input id="new-password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} helperText="At least 8 characters, including a letter and a number." />
        <Input id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={128} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" className="w-full sm:w-auto" size="lg" loading={busy} disabled={busy || code.length !== 6}>
            Reset password
          </Button>
          <button type="button" onClick={() => { void handleResendCode(); }} disabled={cooldownLeft > 0 || resending} className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
            {resendLabel}
          </button>
        </div>
      </form>
    );
  };

  const renderResetPassword = () => {
    if (complete) {
      return <Button className="w-full" onClick={() => router.push(withRedirect('/sign-in'))}>Sign in with your new password</Button>;
    }
    return (
      <form className="space-y-5" onSubmit={(event) => { void handleResetSubmit(event); }} noValidate>
        <p className="text-sm text-text-secondary">Enter the six-digit code we sent to your email and set a new password.</p>
        <CodeInput
          id="reset-code"
          label="Verification code"
          value={code}
          onChange={setCode}
          disabled={busy}
          autoFocus
        />
        <Input id="reset-email" label="Email address" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />
        <Input id="new-password" label="New password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} helperText="At least 8 characters, including a letter and a number." />
        <Input id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={128} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button type="submit" className="w-full sm:w-auto" size="lg" loading={busy} disabled={busy || code.length !== 6}>
            Reset password
          </Button>
          <button type="button" onClick={() => { void handleResendCode(); }} disabled={cooldownLeft > 0 || resending} className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50">
            {resendLabel}
          </button>
        </div>
      </form>
    );
  };

  const renderStandardAuth = () => (
    <>
      {(mode === 'sign-in' || mode === 'sign-up') && (
        <div className="mb-5 space-y-4">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full"
            loading={googleBusy}
            disabled={busy || googleBusy}
            onClick={handleGoogleSignIn}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-border" />
            <span>or continue with email</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {mode === 'sign-up' && (
          <Input
            id="name"
            label={accountType === 'business' || accountType === 'institution' ? 'Administrator or account owner name' : 'Full name'}
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={2}
            maxLength={100}
          />
        )}
        {(mode === 'sign-in' || mode === 'sign-up') && (
          <Input
            id="email"
            label={mode === 'sign-up' && accountType === 'institution' ? 'Institution administrator email' : mode === 'sign-up' && accountType === 'business' ? 'Business email' : 'Email address'}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
          />
        )}
        {(mode === 'sign-in' || mode === 'sign-up') && (
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={128}
            helperText={mode === 'sign-in' ? undefined : 'At least 8 characters, including a letter and a number.'}
          />
        )}
        {mode === 'sign-in' && (
          <div className="-mt-2 text-right">
            <Link className="text-sm font-medium text-primary hover:underline" href="/forgot-password">Forgot password?</Link>
          </div>
        )}
        <Button type="submit" className="w-full" size="lg" loading={busy}>
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </Button>
      </form>
    </>
  );

  return (
    <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-lg sm:p-8">
      <div className="mb-7">
        <div className="relative mb-8 flex min-h-10 items-center gap-3 sm:flex-row sm:justify-between sm:items-center">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold tracking-tight text-text-primary" aria-label="Nexus home">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-base font-bold text-white">N</span>
            Nexus
          </Link>
          {onBackToAccountType && (
            <button
              type="button"
              onClick={onBackToAccountType}
              className="whitespace-nowrap text-xs border border-border rounded-md px-2.5 py-1 text-text-secondary transition-colors hover:border-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-text-primary)]"
            >
              Change account type
            </button>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{mode === 'sign-up' && accountType === 'business' ? 'Create a business account' : mode === 'sign-up' && accountType === 'institution' ? 'Create an institution account' : content.title}</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{accountType ? `${accountType === 'personal' ? 'Personal' : accountType === 'business' ? 'Business' : 'Institution'} account · ${mode === 'sign-in' ? 'Sign in with your Nexus identity.' : content.subtitle}` : content.subtitle}</p>
        {mode === 'sign-up' && accountType === 'business' && <p className="mt-2 text-sm leading-6 text-text-secondary">Register the business owner’s Nexus identity first. After email verification, create your company workspace; its creator becomes the Owner.</p>}
        {mode === 'sign-up' && accountType === 'institution' && <p className="mt-2 text-sm leading-6 text-text-secondary">Register the institution administrator’s Nexus identity first. After email verification, create your institution workspace; its creator becomes the Owner.</p>}
      </div>

      {error && <Alert variant="error" className="mb-5">{error}</Alert>}
      {notice && <Alert variant={complete || forgotStage === 'done' ? 'success' : 'info'} className="mb-5">{notice}</Alert>}
      {mode === 'sign-in' && deletionDate && <Alert variant="success" title="Deletion scheduled" className="mb-5">Your account is scheduled for final deletion on {deletionDate}. Sign in with your email and password and choose Restore account before then to cancel deletion. No session is restored automatically.</Alert>}
      {reactivationAvailable && mode === 'sign-in' && <div className="mb-5 space-y-2"><p className="text-sm text-text-secondary">Use the email and password above to restore access. You will need to sign in again afterward.</p><Button type="button" className="w-full" variant="secondary" loading={busy} onClick={() => { void handleReactivate(); }}>Reactivate account</Button></div>}

      {mode === 'verify-email' && renderVerifyEmail()}
      {mode === 'forgot-password' && renderForgot()}
      {mode === 'reset-password' && renderResetPassword()}
      {(mode === 'sign-in' || mode === 'sign-up') && renderStandardAuth()}
      {mode === 'sign-up' && complete && (
        <div className="mt-5 space-y-4">
          <Button className="w-full" onClick={() => { void handleResend(); }} loading={busy}>Resend verification code</Button>
          <p className="text-center text-sm text-text-secondary">Already verified? {onSwitchMode ? <button type="button" onClick={() => onSwitchMode('sign-in')} className="font-medium text-primary hover:underline">Sign in</button> : <Link className="font-medium text-primary hover:underline" href={withRedirect('/sign-in')}>Sign in</Link>}</p>
        </div>
      )}
      {mode === 'verify-email' && !complete && !emailSchema.safeParse(email || pendingEmail).success && (
        <div className="mt-5 border-t border-border pt-5">
          <Input id="resend-email" label="Email address" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} helperText="Enter the email you signed up with, then request a new code." />
        </div>
      )}

      {(mode === 'sign-in' || mode === 'sign-up') && <p className="mt-6 text-center text-sm text-text-secondary">{mode === 'sign-in' ? 'New to Nexus?' : 'Already have an account?'}{' '}{onSwitchMode ? <button type="button" onClick={() => onSwitchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="font-medium text-primary hover:underline">{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</button> : <Link className="font-medium text-primary hover:underline" href={withRedirect(mode === 'sign-in' ? '/sign-up' : '/sign-in')}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link>}</p>}
      {(mode === 'forgot-password' || mode === 'reset-password') && <p className="mt-6 text-center text-sm"><Link className="font-medium text-primary hover:underline" href={withRedirect('/sign-in')}>Back to sign in</Link></p>}
      {mode === 'sign-up' && (
        <p className="mt-5 text-center text-xs leading-5 text-text-muted">
          By creating an account you agree to the{' '}
          <Link className="font-medium text-primary hover:underline" href="/terms">Terms of Service</Link>{' '}and{' '}
          <Link className="font-medium text-primary hover:underline" href="/privacy">Privacy Policy</Link>.
          The policy pages are drafts awaiting legal review.
        </p>
      )}
    </section>
  );
}