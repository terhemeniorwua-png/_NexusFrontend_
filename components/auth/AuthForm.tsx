'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PolicyLinks } from '@/components/legal/PolicyLinks';
import { ApiRequestError } from '@/lib/api';
import { listWorkspaces, switchWorkspace } from '@/services/workspaces';
import type { AuthAccountType } from './AccountTypeSelector';
import {
  register,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  signIn,
  verifyEmail,
} from '@/services/auth';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password' | 'reset-password' | 'verify-email';

const passwordSchema = z.string().min(8, 'Use at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), 'Include at least one letter and one number.');
const emailSchema = z.string().trim().email('Enter a valid email address.').max(254, 'Email address is too long.');

const modeContent: Record<AuthMode, { title: string; subtitle: string }> = {
  'sign-in': { title: 'Welcome back', subtitle: 'Sign in to continue to your workspace.' },
  'sign-up': { title: 'Create your Nexus account', subtitle: 'One account for all your workspaces.' },
  'forgot-password': { title: 'Reset your password', subtitle: 'We’ll email you a secure reset link if an account matches.' },
  'reset-password': { title: 'Choose a new password', subtitle: 'Use a strong password you have not used before.' },
  'verify-email': { title: 'Verify your email', subtitle: 'Confirm your email address to activate your Nexus account.' },
};

function friendlyError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return 'Something went wrong. Please try again.';
  if (error.status === 401) return 'That email and password combination was not recognised.';
  if (error.status === 403) return error.message;
  if (error.status === 409) return 'An account with this email already exists. Try signing in instead.';
  if (error.status === 429) return 'Too many attempts. Please wait a little and try again.';
  if (error.status === 0) return error.message;
  return error.message;
}

export function AuthForm({ mode, initialToken = '', initialEmail = '', accountType, onSwitchMode, onBackToAccountType }: { mode: AuthMode; initialToken?: string; initialEmail?: string; accountType?: AuthAccountType; onSwitchMode?: (mode: 'sign-in' | 'sign-up') => void; onBackToAccountType?: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [token] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const content = modeContent[mode];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === 'sign-in' || mode === 'sign-up' || mode === 'forgot-password') {
      const validEmail = emailSchema.safeParse(email);
      if (!validEmail.success) { setError(validEmail.error.issues[0]?.message ?? 'Enter a valid email address.'); return; }
    }
    if (mode === 'sign-up') {
      const validName = z.string().trim().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be 100 characters or fewer.').safeParse(name);
      if (!validName.success) { setError(validName.error.issues[0]?.message ?? 'Enter your name.'); return; }
    }

    if (mode === 'sign-up') {
      const result = passwordSchema.safeParse(password);
      if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter a valid password.'); return; }
    }
    if (mode === 'reset-password') {
      const result = passwordSchema.safeParse(password);
      if (!result.success) { setError(result.error.issues[0]?.message ?? 'Enter a valid password.'); return; }
      if (password !== confirmation) { setError('Your passwords do not match.'); return; }
      if (!token) { setError('This reset link is missing its token. Request a new one.'); return; }
    }
    if (mode === 'verify-email' && !token) { setError('This verification link is missing its token.'); return; }

    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await signIn({ email, password });
        if (accountType) {
          const workspaces = await listWorkspaces();
          const wantedType = accountType === 'personal' ? 'INDIVIDUAL' : accountType === 'business' ? 'COMPANY' : 'INSTITUTION';
          const workspace = accountType === 'personal'
            ? workspaces.find((item) => item.isPersonal) ?? workspaces.find((item) => item.type === wantedType)
            : workspaces.find((item) => item.type === wantedType);
          if (workspace) {
            const activeWorkspace = await switchWorkspace(workspace.id);
            window.localStorage.setItem('nexus-active-workspace', activeWorkspace.id);
            router.push('/app');
          } else {
            router.push('/app/workspaces');
          }
        } else {
          router.push('/app');
        }
      } else if (mode === 'sign-up') {
        await register({ name, email, password });
        setComplete(true);
        setNotice(accountType && accountType !== 'personal'
          ? `Your Nexus identity is ready. Verify your email, then sign in and create your ${accountType === 'business' ? 'business' : 'institution'} workspace from Workspaces. The workspace creator becomes its Owner.`
          : 'Your account is ready. Check your inbox for the verification link.');
      } else if (mode === 'forgot-password') {
        const response = await requestPasswordReset(email);
        setComplete(true);
        setNotice(response.message);
      } else if (mode === 'reset-password') {
        const response = await resetPassword({ token, password });
        setComplete(true);
        setNotice(response.message);
      } else {
        await verifyEmail(token);
        setComplete(true);
        setNotice('Your email is verified. You can now sign in to Nexus.');
      }
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    setBusy(true);
    setError(null);
    try {
      const response = await resendVerification(email);
      setNotice(response.message);
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-lg)] sm:p-8">
      <div className="mb-7">
        {onBackToAccountType && <button type="button" onClick={onBackToAccountType} className="mb-5 text-sm font-medium text-[var(--color-primary)] hover:underline">← Change account type</button>}
        <Link href="/" className="mb-8 inline-flex items-center gap-2 font-semibold tracking-tight text-[var(--color-text-primary)]" aria-label="Nexus home">
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">N</span>
          Nexus
        </Link>
        <h1 className="mt-7 text-2xl font-semibold tracking-tight">{mode === 'sign-up' && accountType === 'business' ? 'Create a business account' : mode === 'sign-up' && accountType === 'institution' ? 'Create an institution account' : content.title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{accountType ? `${accountType === 'personal' ? 'Personal' : accountType === 'business' ? 'Business' : 'Institution'} account · ${mode === 'sign-in' ? 'Sign in with your Nexus identity.' : content.subtitle}` : content.subtitle}</p>
        {mode === 'sign-up' && accountType === 'business' && <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Register the business owner’s Nexus identity first. After email verification, create your company workspace; its creator becomes the Owner.</p>}
        {mode === 'sign-up' && accountType === 'institution' && <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">Register the institution administrator’s Nexus identity first. After email verification, create your institution workspace; its creator becomes the Owner.</p>}
      </div>

      {error && <Alert variant="error" className="mb-5">{error}</Alert>}
      {notice && <Alert variant={complete ? 'success' : 'info'} className="mb-5">{notice}</Alert>}

      {mode === 'sign-up' && complete ? (
        <div className="space-y-4">
          <Button className="w-full" onClick={handleResend} loading={busy}>Resend verification email</Button>
          <p className="text-center text-sm text-[var(--color-text-secondary)]">Already verified? {onSwitchMode ? <button type="button" onClick={() => onSwitchMode('sign-in')} className="font-medium text-[var(--color-primary)] hover:underline">Sign in</button> : <Link className="font-medium text-[var(--color-primary)] hover:underline" href="/sign-in">Sign in</Link>}</p>
        </div>
      ) : mode === 'verify-email' && complete ? (
        <Button className="w-full" onClick={() => router.push('/sign-in')}>Continue to sign in</Button>
      ) : mode === 'reset-password' && complete ? (
        <Button className="w-full" onClick={() => router.push('/sign-in')}>Sign in with your new password</Button>
      ) : mode === 'forgot-password' && complete ? (
        <p className="text-sm text-[var(--color-text-secondary)]">For your security, the response is the same whether or not that address has a Nexus account.</p>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          {mode === 'sign-up' && <Input id="name" label={accountType === 'business' || accountType === 'institution' ? 'Administrator or account owner name' : 'Full name'} autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} />}
          {(mode !== 'verify-email' && mode !== 'reset-password') && <Input id="email" label={mode === 'sign-up' && accountType === 'institution' ? 'Institution administrator email' : mode === 'sign-up' && accountType === 'business' ? 'Business email' : 'Email address'} type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} />}
          {(mode === 'sign-in' || mode === 'sign-up' || mode === 'reset-password') && <Input id="password" label={mode === 'sign-in' ? 'Password' : 'Password'} type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} required value={password} onChange={(event) => setPassword(event.target.value)} maxLength={128} helperText={mode === 'sign-in' ? undefined : 'At least 8 characters, including a letter and a number.'} />}
          {mode === 'reset-password' && <Input id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} maxLength={128} />}
          {mode === 'sign-in' && <div className="-mt-2 text-right"><Link className="text-sm font-medium text-[var(--color-primary)] hover:underline" href="/forgot-password">Forgot password?</Link></div>}
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            {mode === 'sign-in' ? 'Sign in' : mode === 'sign-up' ? 'Create account' : mode === 'forgot-password' ? 'Send reset link' : mode === 'reset-password' ? 'Reset password' : 'Verify email'}
          </Button>
        </form>
      )}

      {(mode === 'sign-in' || mode === 'sign-up') && <p className="mt-6 text-center text-sm text-[var(--color-text-secondary)]">{mode === 'sign-in' ? 'New to Nexus?' : 'Already have an account?'}{' '}{onSwitchMode ? <button type="button" onClick={() => onSwitchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="font-medium text-[var(--color-primary)] hover:underline">{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</button> : <Link className="font-medium text-[var(--color-primary)] hover:underline" href={mode === 'sign-in' ? '/sign-up' : '/sign-in'}>{mode === 'sign-in' ? 'Create an account' : 'Sign in'}</Link>}</p>}
      {(mode === 'forgot-password' || mode === 'reset-password') && <p className="mt-6 text-center text-sm"><Link className="font-medium text-[var(--color-primary)] hover:underline" href="/sign-in">Back to sign in</Link></p>}
      {mode === 'sign-up' && <p className="mt-5 text-center text-xs leading-5 text-[var(--color-text-muted)]">The policy pages are placeholders awaiting approved content.</p>}
      <PolicyLinks className="mt-4" />
    </section>
  );
}
