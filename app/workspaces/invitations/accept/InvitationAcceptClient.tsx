'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { InvitationConfirmDialog } from '@/components/auth/InvitationConfirmDialog';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ApiRequestError, getAccessToken } from '@/lib/api';
import {
  clearInvitationIntent,
  readInvitationIntent,
  saveInvitationIntent,
  type InvitationIntent,
} from '@/lib/invitation-intent';
import { isOrganizationRole, roleLabel } from '@/lib/permissions';
import { refreshSession } from '@/services/auth';
import {
  previewInvitation,
  type InvitationPreview,
} from '@/services/invitations';

type PreviewState =
  | { status: 'loading' }
  | { status: 'ready'; preview: InvitationPreview }
  | { status: 'error'; message: string };

type SessionState = 'checking' | 'authenticated' | 'anonymous';

const ACCEPT_PATH = '/workspaces/invitations/accept';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function expiresLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** The CSRF companion cookie indicates that a refresh-cookie session may exist. */
function hasRefreshSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split('; ').some((entry) => entry.startsWith('nexus_csrf='));
}

/**
 * Build an InvitationIntent from the public preview data and token.
 * This is saved to sessionStorage before redirecting unauthenticated users
 * to sign-in, so the confirmation dialog can be shown immediately on return.
 */
function intentFromPreview(token: string, preview: InvitationPreview): InvitationIntent {
  return {
    token,
    workspaceId: preview.workspace.id,
    workspaceName: preview.workspace.name,
    workspaceSlug: preview.workspace.slug,
    invitedByName: preview.invitedBy.name,
    maskedEmail: preview.maskedEmail,
    boundToAccount: preview.boundToAccount,
    expiresAt: preview.expiresAt,
    role: preview.role,
    organizationRole: preview.organizationRole,
  };
}

export function InvitationAcceptClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [preview, setPreview] = useState<PreviewState>({ status: 'loading' });
  const [session, setSession] = useState<SessionState>('checking');

  // Whether to show the confirmation dialog overlay (used when user comes back
  // from authentication with a saved invitation intent).
  const [dialogIntent, setDialogIntent] = useState<InvitationIntent | null>(null);
  // Set to true when the user just created a new account (came via /sign-up flow).
  const [accountCreated, setAccountCreated] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;

    // Check whether the user just returned from an auth flow with a saved intent.
    // The `from` query param is set by the auth form after successful sign-in/registration.
    const from = searchParams.get('from');
    const savedIntent = readInvitationIntent();

    if (savedIntent && savedIntent.token === token && (from === 'auth' || from === 'register')) {
      // Schedule the dialog open in the next microtask to avoid calling
      // setState synchronously inside the effect body.
      const isRegister = from === 'register';
      Promise.resolve().then(() => {
        if (!active) return;
        setAccountCreated(isRegister);
        setDialogIntent(savedIntent);
      });
    }

    // Session resolution
    if (getAccessToken()) {
      Promise.resolve().then(() => { if (active) setSession('authenticated'); });
    } else if (hasRefreshSessionHint()) {
      refreshSession()
        .then(() => { if (active) setSession('authenticated'); })
        .catch(() => { if (active) setSession('anonymous'); });
    } else {
      Promise.resolve().then(() => { if (active) setSession('anonymous'); });
    }

    previewInvitation(token)
      .then((result) => {
        if (!active) return;
        setPreview({ status: 'ready', preview: result });
        // Keep the saved intent up-to-date with fresh preview data.
        // Only save/update when the invitation is still PENDING.
        if (result.status === 'PENDING') {
          saveInvitationIntent(intentFromPreview(token, result));
        }
      })
      .catch((cause) => {
        if (active) {
          setPreview({ status: 'error', message: errorText(cause, 'This invitation could not be loaded.') });
        }
      });

    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleDialogDismiss() {
    setDialogIntent(null);
    clearInvitationIntent();
    router.push('/app');
  }

  /**
   * Build sign-in/sign-up hrefs. We append `from=auth` / `from=register` so
   * that when the user lands back on this page after authenticating, we know
   * to open the confirmation dialog automatically.
   */
  // For sign-in: land back with from=auth so the dialog opens immediately.
  // For sign-up: land back with from=register so we can show the account-created notice.
  const signInReturnPath = `${ACCEPT_PATH}?token=${encodeURIComponent(token)}&from=auth`;
  const signUpReturnPath = `${ACCEPT_PATH}?token=${encodeURIComponent(token)}&from=register`;
  const signInHref = `/sign-in?redirect=${encodeURIComponent(signInReturnPath)}`;
  const signUpHref = `/sign-up?redirect=${encodeURIComponent(signUpReturnPath)}`;

  // --- Render: missing token ---
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

  // --- Render: loading ---
  if (preview.status === 'loading') {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
        <Card className="p-6 sm:p-8">
          <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading invitation…</p>
        </Card>
      </main>
    );
  }

  // --- Render: error (expired / not found / revoked etc.) ---
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
    <>
      {/* Confirmation dialog — shown when user just returned from auth */}
      {dialogIntent && (
        <InvitationConfirmDialog
          open
          intent={dialogIntent}
          onDismiss={handleDialogDismiss}
          accountCreated={accountCreated}
        />
      )}

      <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-8">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit items-center gap-2 font-semibold tracking-tight"
          aria-label="Nexus home"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-[var(--color-primary)] text-sm font-bold text-white">
            N
          </span>
          Nexus
        </Link>

        <Card className="p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium text-[var(--color-primary)]">Workspace invitation</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Join {invitation.workspace.name}</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {invitation.invitedBy.name} invited you to join this workspace.
              </p>
            </div>

            {invitation.status === 'EXPIRED' && (
              <Alert variant="error" title="Invitation expired">
                This invitation has expired and can no longer be accepted.
              </Alert>
            )}
            {invitation.status !== 'PENDING' && invitation.status !== 'EXPIRED' && (
              <Alert variant="warning" title="Invitation already resolved">
                This invitation is {invitation.status.toLowerCase()} and can no longer be accepted.
              </Alert>
            )}

            <dl className="grid gap-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-text-secondary)]">Role</dt>
                <dd>
                  <Badge variant="outline">
                    {roleLabel(
                      invitation.role,
                      invitation.organizationRole && isOrganizationRole(invitation.organizationRole)
                        ? invitation.organizationRole
                        : null,
                    )}
                  </Badge>
                </dd>
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

            {session === 'checking' ? (
              <p role="status" className="text-sm text-[var(--color-text-secondary)]">
                Checking your session…
              </p>
            ) : session === 'authenticated' && invitation.status === 'PENDING' ? (
              /* Authenticated — show accept/decline inline on the card.
                 For users who just came back from auth, the dialog takes priority
                 via the dialogIntent state set in the useEffect above. */
              <InlineActions token={token} workspaceName={invitation.workspace.name} />
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Sign in or create an account to accept this invitation.
                </p>
                <Link
                  href={signInHref}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Sign in to accept
                </Link>
                <Link
                  href={signUpHref}
                  className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium hover:bg-[var(--color-surface-secondary)]"
                >
                  Create an account
                </Link>
              </div>
            )}
          </div>
        </Card>
      </main>
    </>
  );
}

// ── Inline accept/decline for already-authenticated users ────────────────────

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { acceptInvitation, declineInvitation } from '@/services/invitations';

interface InlineActionsProps {
  token: string;
  workspaceName: string;
}

function InlineActions({ token, workspaceName }: InlineActionsProps) {
  const router = useRouter();
  const [working, setWorking] = useState<'accept' | 'decline' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  async function handleAccept() {
    setWorking('accept');
    setActionError(null);
    try {
      const invitation = await acceptInvitation(token);
      try {
        window.localStorage.setItem('nexus-active-workspace', invitation.workspaceId);
      } catch {
        // localStorage may be unavailable; workspace provider will handle it.
      }
      clearInvitationIntent();
      router.push('/app');
    } catch (cause) {
      setActionError(cause instanceof ApiRequestError ? cause.message : 'The invitation could not be accepted. Please try again.');
      setWorking(null);
    }
  }

  async function handleDecline() {
    setWorking('decline');
    setActionError(null);
    try {
      await declineInvitation(token);
      setConfirmDecline(false);
      clearInvitationIntent();
      router.push('/app');
    } catch (cause) {
      setConfirmDecline(false);
      setActionError(cause instanceof ApiRequestError ? cause.message : 'The invitation could not be declined. Please try again.');
      setWorking(null);
    }
  }

  return (
    <>
      <div className="space-y-3">
        {actionError && <Alert variant="error" title="Action failed">{actionError}</Alert>}
        <Button
          className="w-full"
          loading={working === 'accept'}
          disabled={working !== null}
          onClick={() => { void handleAccept(); }}
        >
          Accept invitation
        </Button>
        <Button
          className="w-full"
          variant="ghost"
          disabled={working !== null}
          onClick={() => setConfirmDecline(true)}
        >
          Decline
        </Button>
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          The invitation must be accepted by the account it was sent to.
        </p>
      </div>

      <ConfirmDialog
        open={confirmDecline}
        onClose={() => setConfirmDecline(false)}
        onConfirm={() => { void handleDecline(); }}
        title="Decline invitation"
        description={`Decline the invitation to ${workspaceName}? You can be invited again later.`}
        confirmLabel="Decline invitation"
        destructive
        loading={working === 'decline'}
      />
    </>
  );
}
