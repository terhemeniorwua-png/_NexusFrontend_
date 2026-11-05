'use client';

import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { ApiRequestError } from '@/lib/api';
import {
  acceptWorkspaceBillingResponsibility,
  acceptWorkspaceOwnershipTransfer,
  initiateWorkspaceOwnershipTransfer,
  listIncomingOwnershipTransfers,
  rejectWorkspaceOwnershipTransfer,
  type IncomingOwnershipTransfer,
  type Workspace,
  type WorkspaceMember,
} from '@/services/workspaces';

function message(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : 'The ownership request could not be completed.';
}

export function OwnershipLifecyclePanel({
  workspace,
  members,
  userId,
  onChanged,
}: {
  workspace: Workspace;
  members: WorkspaceMember[];
  userId: string;
  onChanged: () => void;
}) {
  const [recipientId, setRecipientId] = useState('');
  const [incoming, setIncoming] = useState<IncomingOwnershipTransfer[] | null>(null);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<IncomingOwnershipTransfer | null>(null);
  const [billingTransfer, setBillingTransfer] = useState<{ workspaceId: string; id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = workspace.ownerId === userId;
  const eligibleMembers = members.filter((member) => member.userId !== userId && member.status === 'ACTIVE' && member.membershipStatus === 'ACTIVE');

  async function loadIncoming() {
    try {
      const result = await listIncomingOwnershipTransfers();
      setIncoming(result.items);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setIncomingLoading(false);
    }
  }

  useEffect(() => { let active = true; void listIncomingOwnershipTransfers().then((result) => { if (active) setIncoming(result.items); }).catch((cause: unknown) => { if (active) setError(message(cause)); }).finally(() => { if (active) setIncomingLoading(false); }); return () => { active = false; }; }, []);

  async function startTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipientId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await initiateWorkspaceOwnershipTransfer(workspace.id, recipientId);
      setNotice('Transfer request created. Billing responsibility remains a separate decision.');
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function acceptTransfer(transfer: IncomingOwnershipTransfer) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await acceptWorkspaceOwnershipTransfer(transfer.workspaceId, transfer.id);
      setNotice(result.billingAcceptanceRequired
        ? 'Ownership accepted. This workspace remains suspended until you separately accept billing responsibility.'
        : 'Workspace ownership accepted.');
      setIncoming((current) => current?.filter((item) => item.id !== transfer.id) ?? null);
      if (result.billingAcceptanceRequired) setBillingTransfer({ workspaceId: transfer.workspaceId, id: transfer.id });
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function acceptBilling() {
    if (!billingTransfer) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await acceptWorkspaceBillingResponsibility(billingTransfer.workspaceId, billingTransfer.id);
      setNotice('Billing responsibility accepted separately.');
      setBillingTransfer(null);
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function rejectTransfer() {
    if (!rejectTarget) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await rejectWorkspaceOwnershipTransfer(rejectTarget.workspaceId, rejectTarget.id);
      setIncoming((current) => current?.filter((item) => item.id !== rejectTarget.id) ?? null);
      setNotice(`The transfer offer for ${rejectTarget.workspace.name} was rejected.`); setRejectTarget(null);
    } catch (cause) { setError(message(cause)); await loadIncoming(); }
    finally { setBusy(false); }
  }

  return (
    <Card className="space-y-5 p-5 sm:p-7">
      <div>
        <h2 className="text-xl font-semibold">Workspace ownership</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Ownership changes only after the recipient accepts. Billing responsibility always requires a separate explicit acceptance.
        </p>
      </div>
      {workspace.status === 'SUSPENDED' && <Alert variant="warning" title="Workspace suspended">This workspace remains suspended until an eligible owner and any required billing responsibility are resolved.</Alert>}
      {error && <Alert variant="error" title="Ownership action failed">{error}</Alert>}
      {notice && <Alert variant="success" title="Ownership update">{notice}</Alert>}

      {isOwner && !workspace.isPersonal && <form onSubmit={(event) => void startTransfer(event)} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Select id="ownership-recipient" label="Transfer to an active member" value={recipientId} onChange={(event) => setRecipientId(event.target.value)} options={[{ value: '', label: 'Choose a member' }, ...eligibleMembers.map((member) => ({ value: member.userId, label: `${member.name} · ${member.email}` }))]} />
        <Button type="submit" loading={busy} disabled={!recipientId}>Start transfer</Button>
      </form>}

      <div className="border-t border-[var(--color-border)] pt-5"><h3 className="font-semibold">Incoming ownership transfers</h3><p className="mt-1 text-sm text-[var(--color-text-secondary)]">Only pending offers addressed to your active account appear here.</p>{incomingLoading ? <p role="status" className="mt-4 text-sm">Loading transfers…</p> : incoming?.length ? <ul className="mt-3 divide-y divide-[var(--color-border)]">{incoming.map((transfer) => <li key={transfer.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{transfer.workspace.name}</p><p className="text-xs text-[var(--color-text-secondary)]">Sent {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(transfer.createdAt))} · Sender details are not included by the backend contract.</p></div><div className="flex gap-2"><Button size="sm" loading={busy} disabled={busy} onClick={() => void acceptTransfer(transfer)}>Accept</Button><Button size="sm" variant="secondary" disabled={busy} onClick={() => setRejectTarget(transfer)}>Reject</Button></div></li>)}</ul> : <EmptyState title="No incoming transfers" description="Ownership offers sent to you will appear here." />}</div>

      {billingTransfer && <div className="border-t border-[var(--color-border)] pt-5">
        <h3 className="font-semibold">Billing responsibility</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Accept only if you understand and agree to take responsibility for this workspace subscription. This is not implied by accepting ownership.</p>
        <Button className="mt-3" type="button" variant="secondary" loading={busy} onClick={() => void acceptBilling()}>Accept billing responsibility</Button>
      </div>}

      {!isOwner && eligibleMembers.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">The current account is not the workspace owner. The backend remains authoritative for transfer permissions.</p>}
      <ConfirmDialog open={rejectTarget !== null} onClose={() => setRejectTarget(null)} onConfirm={() => void rejectTransfer()} title="Reject ownership transfer?" description={rejectTarget ? `Reject the offer to take ownership of ${rejectTarget.workspace.name}? This does not accept billing responsibility.` : undefined} confirmLabel="Reject transfer" destructive loading={busy} />
    </Card>
  );
}
