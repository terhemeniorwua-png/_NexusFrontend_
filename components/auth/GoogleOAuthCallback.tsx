'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ApiRequestError } from '@/lib/api';
import { clearGoogleOAuthIntent, readGoogleOAuthIntent } from '@/lib/google-oauth';
import { safeRedirectPath } from '@/lib/redirect';
import { completeTwoFactorLogin, exchangeGoogleLoginCode } from '@/services/auth';
import { listWorkspaces, switchWorkspace } from '@/services/workspaces';
import type { AuthAccountType } from '@/types/auth';

type CallbackStatus = 'loading' | 'error' | 'two-factor';

function oauthErrorMessage(error: string): string {
  if (error === 'OAUTH_CANCELLED') return 'Google sign-in was cancelled. You can try again.';
  if (error === 'GOOGLE_AUTH_UNAVAILABLE') return 'Google sign-in is temporarily unavailable. Please try again later.';
  if (error === 'GOOGLE_ACCOUNT_LINK_REQUIRED') return 'A Nexus account already uses this email. Sign in to that account first; Google accounts are not linked automatically.';
  if (error === 'LOGIN_RATE_LIMITED') return 'Too many Google sign-in attempts. Please wait a few minutes and try again.';
  return `We could not complete Google sign-in (${error}). Please try again.`;
}

function requestErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return 'Unable to reach Nexus. Check your connection and try again.';
  if (error.code === 'GOOGLE_ACCOUNT_LINK_REQUIRED') return oauthErrorMessage(error.code);
  if (error.code === 'GOOGLE_AUTH_UNAVAILABLE') return oauthErrorMessage(error.code);
  if (error.code === 'OAUTH_CANCELLED') return oauthErrorMessage(error.code);
  if (error.code === 'MFA_CODE_INVALID') return 'That security code is incorrect. Try again.';
  if (error.code === 'MFA_LOCKED') return 'Too many incorrect codes. Start Google sign-in again to get a new challenge.';
  if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  if (error.status === 0) return error.message;
  return 'We could not complete Google sign-in. Please try again.';
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



export function GoogleOAuthCallback({ code, error }: { code?: string; error?: string }) {
  const router = useRouter();

  // Errors known from the URL are derived during render, so no setState is needed inside the effect.
  const immediateError = error
    ? oauthErrorMessage(error)
    : !code
      ? 'The Google sign-in response was incomplete. Please try again.'
      : null;

  const [status, setStatus] = useState<CallbackStatus>(immediateError ? 'error' : 'loading');
  const [message, setMessage] = useState(immediateError ?? 'Completing Google sign-in…');
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);

  const finishLogin = useCallback(async (): Promise<void> => {
    const intent = readGoogleOAuthIntent();
    const destination = await postLoginPath(intent?.accountType, intent?.redirectPath);
    clearGoogleOAuthIntent();
    router.replace(destination);
  }, [router]);

  useEffect(() => {
    // Remove the short-lived exchange code before making any further request.
    window.history.replaceState(window.history.state, '', '/auth/google/callback');

    if (immediateError || !code) {
      clearGoogleOAuthIntent();
      return;
    }

    let active = true;

    void exchangeGoogleLoginCode(code).then(async (result) => {
      if (!active) return;
      if ('twoFactorRequired' in result) {
        setChallengeToken(result.challengeToken);
        setMessage('Enter the two-factor code for your Nexus account.');
        setStatus('two-factor');
        return;
      }
      await finishLogin();
    }).catch((cause: unknown) => {
      if (!active) return;
      clearGoogleOAuthIntent();
      setMessage(requestErrorMessage(cause));
      setStatus('error');
    });

    return () => { active = false; };
  }, [code, immediateError, finishLogin]);
  async function handleTwoFactorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challengeToken) return;
    const normalizedProof = recoveryMode ? proof.trim() : proof.replace(/\D/g, '');
    if (!normalizedProof || (!recoveryMode && normalizedProof.length !== 6)) {
      setMessage(recoveryMode ? 'Enter your recovery code.' : 'Enter the six-digit code from your authenticator app.');
      return;
    }

    setBusy(true);
    try {
      await completeTwoFactorLogin({
        challengeToken,
        ...(recoveryMode ? { recoveryCode: normalizedProof } : { code: normalizedProof }),
      });
      await finishLogin();
    } catch (cause) {
      setMessage(requestErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const intent = readGoogleOAuthIntent();
  const retryHref = intent?.mode === 'sign-up' ? '/sign-up' : '/sign-in';

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--color-background)] px-4 py-10">
      <Card className="w-full max-w-md p-6 shadow-[var(--shadow-lg)] sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Continue with Google</h1>
        {status === 'loading' ? (
          <p role="status" className="mt-4 text-sm text-[var(--color-text-secondary)]">{message}</p>
        ) : status === 'error' ? (
          <>
            <Alert variant="error" className="mt-5">{message}</Alert>
            <Link href={retryHref} className="mt-5 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline">
              Return to sign in
            </Link>
          </>
        ) : (
          <form className="mt-5 space-y-4" onSubmit={handleTwoFactorSubmit}>
            <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
            <Input
              id="google-two-factor-proof"
              label={recoveryMode ? 'Recovery code' : 'Authentication code'}
              type="text"
              inputMode={recoveryMode ? 'text' : 'numeric'}
              autoComplete={recoveryMode ? 'off' : 'one-time-code'}
              required
              maxLength={recoveryMode ? 32 : 6}
              value={proof}
              onChange={(event) => setProof(recoveryMode ? event.target.value : event.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              Verify and continue
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => { setRecoveryMode((current) => !current); setProof(''); setMessage('Enter the two-factor code for your Nexus account.'); }}
              className="text-sm font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
            >
              {recoveryMode ? 'Use an authenticator code' : 'Use a recovery code'}
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
