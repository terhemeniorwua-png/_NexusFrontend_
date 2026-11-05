'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ApiRequestError } from '@/lib/api';
import { assignableRoleOptions, isOrganizationRole, roleLabel } from '@/lib/permissions';
import {
  createWorkspaceInvitation,
  listWorkspaceInvitations,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
  type Invitation,
  type InvitationListStatus,
} from '@/services/invitations';
import type { Workspace } from '@/services/workspaces';
import type { OrganizationRole, WorkspaceRole } from '@/types/workspace';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusVariant(status: Invitation['status']): 'success' | 'warning' | 'error' | 'outline' {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'PENDING') return 'warning';
  if (status === 'DECLINED' || status === 'REVOKED' || status === 'EXPIRED') return 'error';
  return 'outline';
}

const FILTER_OPTIONS: { value: InvitationListStatus; label: string }[] = [
  { value: 'ALL', label: 'All invitations' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'REVOKED', label: 'Revoked' },
  { value: 'EXPIRED', label: 'Expired' },
];

interface InvitationsPanelProps {
  workspace: Workspace;
  canManage: boolean;
}

/** Workspace invitations: create, resend, and revoke. */
export function InvitationsPanel({ workspace, canManage }: InvitationsPanelProps) {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [status, setStatus] = useState<InvitationListStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null);

  const roleOptions = assignableRoleOptions(workspace);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loaded = await listWorkspaceInvitations(workspace.id, status);
        if (active) setInvitations(loaded);
      } catch (cause) {
        if (active) setError(errorText(cause, 'Invitations could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [workspace.id, status]);

  // A role is required to invite, so fall back to the first grantable role
  // without mirroring it into state on every render.
  const effectiveRole = role || roleOptions[0]?.value || '';

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (!effectiveRole) {
      setFormError('Choose a role for the invitation.');
      return;
    }

    setInviting(true);
    setFormError(null);
    setError(null);
    setNotice(null);
    setWarning(null);
    try {
      const result = await createWorkspaceInvitation(workspace.id, {
        email: address,
        ...(isOrganizationRole(effectiveRole)
          ? { organizationRole: effectiveRole as OrganizationRole }
          : { role: effectiveRole as WorkspaceRole }),
      });
      setEmail('');
      setNotice(`Invitation sent to ${result.invitation.email}. It expires ${dateTimeLabel(result.invitation.expiresAt)}.`);
      if (!result.emailSent) {
        setWarning('The invitation was created, but the email could not be sent. Use Resend once mail delivery is available.');
      }
      if (status === 'ALL' || status === 'PENDING') {
        setInvitations((current) => [result.invitation, ...(current ?? [])]);
      } else {
        setLoading(true);
        setStatus('ALL');
      }
    } catch (cause) {
      setFormError(errorText(cause, 'The invitation could not be sent.'));
    } finally {
      setInviting(false);
    }
  }

  async function resend(invitation: Invitation) {
    setBusyInvitationId(invitation.id);
    setError(null);
    setNotice(null);
    setWarning(null);
    try {
      const result = await resendWorkspaceInvitation(workspace.id, invitation.id);
      setInvitations((current) => current?.map((item) => item.id === result.invitation.id ? result.invitation : item) ?? null);
      if (result.emailSent) {
        setNotice(`Invitation re-sent to ${invitation.email}.`);
      } else {
        setWarning('The invitation was reissued, but the email could not be sent.');
      }
    } catch (cause) {
      setError(errorText(cause, 'The invitation could not be resent.'));
    } finally {
      setBusyInvitationId(null);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const invitation = revokeTarget;
    setBusyInvitationId(invitation.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await revokeWorkspaceInvitation(workspace.id, invitation.id);
      setInvitations((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
      setNotice(`Invitation to ${invitation.email} was revoked.`);
      setRevokeTarget(null);
    } catch (cause) {
      setError(errorText(cause, 'The invitation could not be revoked.'));
    } finally {
      setBusyInvitationId(null);
    }
  }

  return (
    <div className="space-y-5">
      {notice && <Alert variant="success" title="Invitation updated">{notice}</Alert>}
      {warning && <Alert variant="warning" title="Email not delivered">{warning}</Alert>}
      {error && <Alert variant="error" title="Invitation action failed">{error}</Alert>}

      {canManage && (
        <Card className="p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Invite someone</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Send a workspace invitation by email. Its expiration time is supplied by the backend and it can be accepted once.
          </p>
          <form onSubmit={sendInvitation} noValidate className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-end">
            <Input
              id="invitation-email"
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={inviting}
            />
            <Select
              id="invitation-role"
              label="Role"
              value={effectiveRole}
              onChange={(event) => setRole(event.target.value)}
              options={roleOptions.map((option) => ({ value: option.value, label: option.label }))}
              disabled={inviting || roleOptions.length === 0}
            />
            <Button type="submit" loading={inviting} disabled={roleOptions.length === 0}>Send invitation</Button>
          </form>
          {formError && <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">{formError}</p>}
        </Card>
      )}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Invitation history</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Invitations issued for {workspace.name}.</p>
          </div>
          <div className="w-full sm:w-56">
            <Select
              id="invitation-filter"
              label="Filter invitations"
              srOnlyLabel
              value={status}
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setStatus(event.target.value as InvitationListStatus);
              }}
              options={FILTER_OPTIONS}
            />
          </div>
        </div>

        {loading ? (
          <p role="status" className="mt-5 text-sm text-[var(--color-text-secondary)]">Loading invitations…</p>
        ) : !invitations || invitations.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No invitations" description="No invitations match this filter." />
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--color-border)]">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    {roleLabel(invitation.role, invitation.organizationRole)} · invited by {invitation.invitedBy.name} · expires {dateTimeLabel(invitation.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant={statusVariant(invitation.status)}>{invitation.status.toLowerCase()}</Badge>
                  {canManage && invitation.status === 'PENDING' && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={busyInvitationId === invitation.id}
                        onClick={() => { void resend(invitation); }}
                      >
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRevokeTarget(invitation)}
                      >
                        Revoke
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => { void confirmRevoke(); }}
        title="Revoke invitation"
        description={revokeTarget ? `Revoke the invitation to ${revokeTarget.email}? The link will stop working.` : undefined}
        confirmLabel="Revoke invitation"
        destructive
        loading={revokeTarget !== null && busyInvitationId === revokeTarget.id}
      />
    </div>
  );
}
