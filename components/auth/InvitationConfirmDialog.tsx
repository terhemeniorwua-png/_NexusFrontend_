'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ApiRequestError } from '@/lib/api';
import { clearInvitationIntent, type InvitationIntent } from '@/lib/invitation-intent';
import { isOrganizationRole, roleLabel } from '@/lib/permissions';
import { acceptInvitation, declineInvitation } from '@/services/invitations';

interface InvitationConfirmDialogProps {
  open: boolean;
  /** The saved invitation context from sessionStorage. */
  intent: InvitationIntent;
  /**
   * Called when the dialog is dismissed without a final action, e.g. clicking
   * the X button. The parent should treat this as a navigate-to-/app signal.
   */
  onDismiss: () => void;
  /**
   * Optional: called when the account was just created, allowing the parent
   * to show the account-created success notice before the dialog content.
   */
  accountCreated?: boolean;
}

type Working = 'accept' | 'decline' | null;

function friendlyActionError(error: unknown): string {
  if (!(error instanceof ApiRequestError)) {
    return 'Something went wrong. Please try again.';
  }
  if (error.code === 'INVITATION_EXPIRED') return 'This invitation has expired.';
  if (error.code === 'INVITATION_ALREADY_ACCEPTED') return 'This invitation has already been accepted.';
  if (error.code === 'INVITATION_REVOKED') return 'This invitation has been revoked.';
  if (error.code === 'INVITATION_NOT_FOUND') return 'This invitation could not be found.';
  if (error.code === 'EMAIL_MISMATCH' || error.code === 'INVITATION_EMAIL_MISMATCH') {
    return 'This invitation was sent to a different email address.';
  }
  return error.message || 'Something went wrong. Please try again.';
}

/**
 * InvitationConfirmDialog
 *
 * Shown immediately after a user signs in or creates an account when an
 * invitation intent was saved before the auth redirect. Lets the user
 * accept or decline the invitation without navigating away from the app.
 *
 * On accept:  sets nexus-active-workspace, clears the intent, navigates to /app.
 * On decline: clears the intent, navigates to /app (personal dashboard).
 * On dismiss: clears the intent, navigates to /app.
 */
export function InvitationConfirmDialog({
  open,
  intent,
  onDismiss,
  accountCreated = false,
}: InvitationConfirmDialogProps) {
  const router = useRouter();
  const [working, setWorking] = useState<Working>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDecline, setConfirmDecline] = useState(false);

  function dismiss() {
    clearInvitationIntent();
    onDismiss();
  }

  async function handleAccept() {
    setWorking('accept');
    setActionError(null);
    try {
      const invitation = await acceptInvitation(intent.token);
      // Prime the workspace switcher to open directly on the invited workspace.
      try {
        window.localStorage.setItem('nexus-active-workspace', invitation.workspaceId);
      } catch {
        // localStorage may be unavailable; the workspace provider will fall
        // back to the server-side active workspace.
      }
      clearInvitationIntent();
      router.push('/app');
    } catch (cause) {
      setActionError(friendlyActionError(cause));
      setWorking(null);
    }
  }

  async function handleDecline() {
    setWorking('decline');
    setActionError(null);
    try {
      await declineInvitation(intent.token);
      clearInvitationIntent();
      router.push('/app');
    } catch (cause) {
      setActionError(friendlyActionError(cause));
      setWorking(null);
      setConfirmDecline(false);
    }
  }

  // Decline confirmation step
  if (confirmDecline) {
    return (
      <Modal
        open={open}
        onClose={() => setConfirmDecline(false)}
        title="Decline invitation"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={working !== null}
              onClick={() => setConfirmDecline(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={working === 'decline'}
              disabled={working !== null}
              onClick={() => { void handleDecline(); }}
            >
              Decline invitation
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          Decline the invitation to{' '}
          <strong className="text-[var(--color-text-primary)]">{intent.workspaceName}</strong>?
          You can be re-invited later.
        </p>
        {actionError && (
          <Alert variant="error" className="mt-4">
            {actionError}
          </Alert>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={`Join ${intent.workspaceName}`}
      maxWidth="sm"
      footer={
        <>
          <Button
            variant="ghost"
            disabled={working !== null}
            onClick={() => setConfirmDecline(true)}
          >
            Decline
          </Button>
          <Button
            loading={working === 'accept'}
            disabled={working !== null}
            onClick={() => { void handleAccept(); }}
          >
            Accept invitation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {accountCreated && (
          <Alert variant="success" title="Account created">
            Your Nexus account is ready. Accept or decline the workspace invitation below.
          </Alert>
        )}

        <p className="text-sm text-[var(--color-text-secondary)]">
          <strong className="text-[var(--color-text-primary)]">{intent.invitedByName}</strong>{' '}
          invited you to join this workspace.
        </p>

        <dl className="grid gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface-secondary)] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--color-text-secondary)]">Workspace</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">{intent.workspaceName}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--color-text-secondary)]">Invited as</dt>
            <dd>
              <Badge variant="outline">
                {roleLabel(
                  intent.role,
                  intent.organizationRole && isOrganizationRole(intent.organizationRole)
                    ? intent.organizationRole
                    : null,
                )}
              </Badge>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[var(--color-text-secondary)]">Invitation for</dt>
            <dd className="font-medium text-[var(--color-text-primary)]">{intent.maskedEmail}</dd>
          </div>
        </dl>

        {intent.boundToAccount && (
          <p className="text-xs text-[var(--color-text-secondary)]">
            This invitation is bound to the account it was sent to. Make sure you are signed in with the correct account.
          </p>
        )}

        {actionError && (
          <Alert variant="error" title="Action failed">
            {actionError}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
