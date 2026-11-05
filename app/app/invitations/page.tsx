'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiRequestError } from '@/lib/api';
import { roleLabel } from '@/lib/permissions';
import { listMyInvitations, type Invitation } from '@/services/invitations';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/**
 * Invitations addressed to the signed-in account.
 *
 * The backend's invitation list deliberately omits the invitation token, so
 * acceptance and decline happen from the emailed link. This page is the
 * account's status view; it never fabricates an accept action the contract
 * cannot support.
 */
export default function MyInvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const loaded = await listMyInvitations();
      setInvitations(loaded);
    } catch (cause) {
      setError(errorText(cause, 'Your invitations could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function loadInvitations() {
      try {
        const loaded = await listMyInvitations();
        if (active) setInvitations(loaded);
      } catch (cause) {
        if (active) setError(errorText(cause, 'Your invitations could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadInvitations();
    return () => {
      active = false;
    };
  }, []);

  const pending = invitations?.filter((invitation) => invitation.status === 'PENDING') ?? [];
  const history = invitations?.filter((invitation) => invitation.status !== 'PENDING') ?? [];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Invitations"
        description="Workspace invitations addressed to your account. Open the invitation email to accept or decline; the emailed link carries the one-time token."
      />

      {loading ? (
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading invitations…</p>
      ) : error ? (
        <Card className="p-5 sm:p-7">
          <Alert variant="error" title="Invitations unavailable">{error}</Alert>
          <Button className="mt-4" onClick={() => { setLoading(true); setError(null); void load(); }}>Try again</Button>
        </Card>
      ) : (
        <>
          <Card className="p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Pending invitations</h2>
            {pending.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No pending invitations"
                  description="When someone invites you to a workspace, it appears here and in your email."
                  action={<Link href="/app/discover" className="text-[var(--color-primary)] underline">Discover public workspaces</Link>}
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)]">
                {pending.map((invitation) => (
                  <li key={invitation.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{invitation.workspaceName}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {roleLabel(invitation.role, invitation.organizationRole)} · invited by {invitation.invitedBy.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{invitation.status === 'EXPIRED' ? 'Expired' : `Expires ${dateTimeLabel(invitation.expiresAt)}`}</p>
                    </div>
                    <Badge variant="warning">Awaiting your response by email</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5 sm:p-7">
            <h2 className="text-xl font-semibold">Invitation history</h2>
            {history.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">No past invitations.</p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--color-border)]">
                {history.map((invitation) => (
                  <li key={invitation.id} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{invitation.workspaceName}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                        {roleLabel(invitation.role, invitation.organizationRole)} · sent {dateTimeLabel(invitation.createdAt)}
                      </p>
                    </div>
                    <Badge variant={invitation.status === 'ACCEPTED' ? 'success' : 'outline'}>{invitation.status.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
