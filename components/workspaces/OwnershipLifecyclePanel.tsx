'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ApiRequestError } from '@/lib/api';
import {
  acceptWorkspaceBillingResponsibility,
  acceptWorkspaceOwnershipTransfer,
  initiateWorkspaceOwnershipTransfer,
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
  const [transferId, setTransferId] = useState('');
  const [createdTransferId, setCreatedTransferId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = workspace.ownerId === userId;
  const eligibleMembers = members.filter((member) => member.userId !== userId && member.status === 'ACTIVE' && member.membershipStatus === 'ACTIVE');

  async function startTransfer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipientId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await initiateWorkspaceOwnershipTransfer(workspace.id, recipientId);
      setCreatedTransferId(result.transferId);
      setNotice('Transfer request created. Give the transfer reference to the selected member so they can accept it. Billing responsibility is a separate decision.');
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function acceptTransfer() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await acceptWorkspaceOwnershipTransfer(workspace.id, transferId.trim());
      setNotice(result.billingAcceptanceRequired
        ? 'Ownership accepted. This workspace remains suspended until you separately accept billing responsibility.'
        : 'Workspace ownership accepted.');
      if (result.billingAcceptanceRequired) setCreatedTransferId(transferId.trim());
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  async function acceptBilling() {
    const id = createdTransferId ?? transferId.trim();
    if (!id) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await acceptWorkspaceBillingResponsibility(workspace.id, id);
      setNotice('Billing responsibility accepted separately.');
      onChanged();
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  }

  if (workspace.isPersonal) return null;

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
      {notice && <Alert variant="success" title="Ownership update">{notice}{createdTransferId && <span className="mt-2 block break-all">Transfer reference: {createdTransferId}</span>}</Alert>}

      {isOwner && <form onSubmit={(event) => void startTransfer(event)} className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Select id="ownership-recipient" label="Transfer to an active member" value={recipientId} onChange={(event) => setRecipientId(event.target.value)} options={[{ value: '', label: 'Choose a member' }, ...eligibleMembers.map((member) => ({ value: member.userId, label: `${member.name} · ${member.email}` }))]} />
        <Button type="submit" loading={busy} disabled={!recipientId}>Start transfer</Button>
      </form>}

      <div className="border-t border-[var(--color-border)] pt-5">
        <h3 className="font-semibold">Accept an ownership transfer</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Enter the transfer reference provided by the current owner. The backend verifies that you are the intended active member.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <Input id="ownership-transfer-id" label="Transfer reference" value={transferId} onChange={(event) => setTransferId(event.target.value)} />
          <Button type="button" variant="secondary" loading={busy} disabled={!transferId.trim()} onClick={() => void acceptTransfer()}>Accept ownership</Button>
        </div>
      </div>

      {createdTransferId && <div className="border-t border-[var(--color-border)] pt-5">
        <h3 className="font-semibold">Billing responsibility</h3>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Accept only if you understand and agree to take responsibility for this workspace subscription. This is not implied by accepting ownership.</p>
        <Button className="mt-3" type="button" variant="secondary" loading={busy} onClick={() => void acceptBilling()}>Accept billing responsibility</Button>
      </div>}

      {!isOwner && eligibleMembers.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">The current account is not the workspace owner. The backend remains authoritative for transfer permissions.</p>}
    </Card>
  );
}
