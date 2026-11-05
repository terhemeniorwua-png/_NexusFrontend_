'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError, getAccessToken } from '@/lib/api';
import { roleLabel } from '@/lib/permissions';
import { refreshSession } from '@/services/auth';
import {
  acceptInvitation,
  declineInvitation,
  previewInvitation,
  type InvitationPreview,
} from '@/services/invitations';

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: InvitationPreview }
  | { status: 'error'; message: string };

type SessionState = 'checking' | 'authenticated' | 'anonymous';

type Outcome =
  | { kind: 'accepted'; workspaceName: string }
  | { kind: 'declined'; workspaceName: string };

const ACCEPT_PATH = '/workspaces/invitations/accept';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function expiresLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/** The CSRF companion cookie indicates that a refresh-cookie session may exist. */
function hasRefreshSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry.startsWith('nexus_csrf='));
}

export function InvitationAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [session, setSession] = useState<SessionState>('checking');
  const [working, setWorking] = useState<'accept' | 'decline' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    // Resolve the session and the public preview independently: the preview
    // must render even when the visitor is not signed in.
    if (getAccessToken()) {
      // The in-memory access token is already the session state established by
      // the auth provider. Avoid a redundant refresh; protected API calls retry
      // once through their service layer if that token has expired.
      Promise.resolve().then(() => { if (active) setSession('authenticated'); });
    } else if (hasRefreshSessionHint()) {
      refreshSession()
        .then(() => { if (active) setSession('authenticated'); })
        .catch(() => { if (active) setSession('anonymous'); });
    } else {
      Promise.resolve().then(() => { if (active) setSession('anonymous'); });
    }

    previewInvitation(token)
      .then((result) => { if (active) setPreview({ status: 'ready', preview: result }); })
      .catch((cause) => {
        if (active) {
          setPreview({ status: 'error', message: errorText(cause, 'This invitation could not be loaded.') });
        }
      });

    return () => { active = false; };
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setWorking('accept');
    setActionError(null);
    try {
      const invitation = await acceptInvitation(token);
      // The workspace provider reads this key when it next mounts, so opening
      // the workspace lands on the workspace the invitation granted.
      window.localStorage.setItem('nexus-active-workspace', invitation.workspaceId);
      setOutcome({ kind: 'accepted', workspaceName: invitation.workspaceName });
    } catch (cause) {
      setActionError(errorText(cause, 'The invitation could not be accepted. Please try again.'));
    } finally {
      setWorking(null);
    }
  }

  async function handleDecline() {
    if (!token) return;
    setWorking('decline');
    setActionError(null);
    try {
      const invitation = await declineInvitation(token);
      setConfirmDecline(false);
      setOutcome({ kind: 'declined', workspaceName: invitation.workspaceName });
    } catch (cause) {
      setConfirmDecline(false);
      setActionError(errorText(cause, 'The invitation could not be declined. Please try again.'));
    } finally {
      setWorking(null);
    }
  }

  const redirectTarget = token ? `${ACCEPT_PATH}?token=${encodeURIComponent(token)}` : '/app';
  const signInHref = `/sign-in?redirect=${encodeURIComponent(redirectTarget)}`;
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(redirectTarget)}`;

  if (!token) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
        <Card className="p-6 sm:p-8">
          <EmptyState
            title="This invitation is not available"
            description="This invitation link is missing its token. Open the link from your invitation email."
            action={<Link href="/" className="text-[var(--color-primary)] underline">Return to Nexus</Link>}
          />
        </Card>
      </main>
    );
  }

  if (preview.status === 'loading') {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
        <Card className="p-6 sm:p-8">
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading invitation…</p>
        </Card>
      </main>
    );
  }

  if (preview.status === 'error') {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
        <Card className="p-6 sm:p-8">
          <EmptyState
            title="This invitation is not available"
            description={preview.message}
            action={<Link href="/" className="text-[var(--color-primary)] underline">Return to Nexus</Link>}
          />
        </Card>
      </main>
    );
  }

  const invitation = preview.preview;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
      <Link href="/" className="mb-6 inline-flex w-fit items-center gap-2 font-semibold tracking-tight" aria-label="Nexus home">
        <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">N</span>
        Nexus
      </Link>

      <Card className="p-6 sm:p-8">
        {outcome ? (
          <div className="space-y-5">
            <Alert variant="success" title={outcome.kind === 'accepted' ? 'Invitation accepted' : 'Invitation declined'}>
              {outcome.kind === 'accepted'
                ? `You are now a member of ${outcome.workspaceName}.`
                : `You declined the invitation to ${outcome.workspaceName}.`}
            </Alert>
            {outcome.kind === 'accepted' ? (
              <Button className="w-full" onClick={() => router.push('/app')}>Open workspace</Button>
            ) : (
              <Link href="/app" className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-secondary)]">
                Back to Nexus
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-[var(--color-primary)]">Workspace invitation</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Join {invitation.workspace.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {invitation.invitedBy.name} invited you to join this workspace.
              </p>
            </div>

            <dl className="grid gap-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-text-secondary)]">Role</dt>
                <dd><Badge variant="outline">{roleLabel(invitation.role, invitation.organizationRole)}</Badge></dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-text-secondary)]">Invitation for</dt>
                <dd className="font-medium">{invitation.maskedEmail}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-text-secondary)]">Expires</dt>
                <dd className="font-medium">{expiresLabel(invitation.expiresAt)}</dd>
              </div>
            </dl>

            {invitation.boundToAccount && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                This invitation is bound to an existing Nexus account. Sign in with that account to continue.
              </p>
            )}

            {actionError && <Alert variant="error" title="Action failed">{actionError}</Alert>}

            {session === 'checking' ? (
              <p role="status" className="text-sm text-[var(--color-text-secondary)]">Checking your session…</p>
            ) : session === 'authenticated' ? (
              <div className="space-y-3">
                <Button className="w-full" loading={working === 'accept'} disabled={working !== null} onClick={() => { void handleAccept(); }}>
                  Accept invitation
                </Button>
                <Button className="w-full" variant="ghost" disabled={working !== null} onClick={() => setConfirmDecline(true)}>
                  Decline
                </Button>
                <p className="text-center text-xs text-[var(--color-text-secondary)]">
                  The invitation must be accepted by the account it was sent to.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Sign in or create an account to accept this invitation.
                </p>
                <Link href={signInHref} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]">
                  Sign in to accept
                </Link>
                <Link href={signUpHref} className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-surface-secondary)]">
                  Create an account
                </Link>
              </div>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        onConfirm={() => { void handleDecline(); }}
        title="Decline invitation"
        description={`Decline the invitation to ${invitation.workspace.name}? You can be invited again later.`}
        confirmLabel="Decline invitation"
        destructive
        loading={working === 'decline'}
      />
    </main>
  );
}
