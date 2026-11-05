'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ApiRequestError } from '@/lib/api';
import { assignableRoleOptions, isOrganizationRole, roleLabel } from '@/lib/permissions';
import {
  approveJoinRequest,
  createWorkspaceJoinCode,
  disableWorkspaceJoinCode,
  listWorkspaceJoinRequests,
  rejectJoinRequest,
  type JoinCode,
  type JoinRequest,
  type JoinRequestListStatus,
} from '@/services/join-requests';
import type { Workspace } from '@/services/workspaces';
import type { OrganizationRole, WorkspaceRole } from '@/types/workspace';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const FILTER_OPTIONS: { value: JoinRequestListStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending requests' },
  { value: 'ALL', label: 'All requests' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
  { value: 'EXPIRED', label: 'Expired' },
];

interface JoinRequestsPanelProps {
  workspace: Workspace;
  canManage: boolean;
}

/** Join-request review and join-code management for the active workspace. */
export function JoinRequestsPanel({ workspace, canManage }: JoinRequestsPanelProps) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [status, setStatus] = useState<JoinRequestListStatus>('PENDING');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [role, setRole] = useState('');
  const [rejectTarget, setRejectTarget] = useState<JoinRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [joinCode, setJoinCode] = useState<JoinCode | null>(null);
  const [joinCodeEnabled, setJoinCodeEnabled] = useState(workspace.joinCodeEnabled);
  const [joinCodeBusy, setJoinCodeBusy] = useState(false);
  const [confirmJoinCodeOff, setConfirmJoinCodeOff] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const roleOptions = assignableRoleOptions(workspace);
  // A grantable role is required for approval; derive the default instead of
  // copying it into state from an effect.
  const effectiveRole = role || roleOptions[0]?.value || '';

  const loadRequests = useCallback(async (nextStatus: JoinRequestListStatus) => {
    try {
      const loaded = await listWorkspaceJoinRequests(workspace.id, nextStatus);
      setRequests(loaded);
    } catch (cause) {
      setError(errorText(cause, 'Join requests could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const loaded = await listWorkspaceJoinRequests(workspace.id, status);
        if (active) setRequests(loaded);
      } catch (cause) {
        if (active) setError(errorText(cause, 'Join requests could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [workspace.id, status]);

  async function approve(request: JoinRequest) {
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await approveJoinRequest(workspace.id, request.id, {
        ...(effectiveRole && isOrganizationRole(effectiveRole)
          ? { organizationRole: effectiveRole as OrganizationRole }
          : effectiveRole
            ? { role: effectiveRole as WorkspaceRole }
            : {}),
      });
      setRequests((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
      setNotice(`${request.userName} joined ${workspace.name} as ${roleLabel(updated.role, updated.organizationRole)}.`);
    } catch (cause) {
      setError(errorText(cause, 'The request could not be approved.'));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const request = rejectTarget;
    setBusyId(request.id);
    setError(null);
    setNotice(null);
    try {
      const updated = await rejectJoinRequest(workspace.id, request.id, rejectNote);
      setRequests((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
      setNotice(`${request.userName}’s join request was rejected.`);
      setRejectTarget(null);
      setRejectNote('');
    } catch (cause) {
      setError(errorText(cause, 'The request could not be rejected.'));
    } finally {
      setBusyId(null);
    }
  }

  async function createCode() {
    setJoinCodeBusy(true);
    setError(null);
    setNotice(null);
    setCopyStatus(null);
    try {
      const created = await createWorkspaceJoinCode(workspace.id);
      setJoinCode(created);
      setJoinCodeEnabled(true);
      setNotice('A new join code was created. The previous code, if any, no longer works.');
    } catch (cause) {
      setError(errorText(cause, 'A join code could not be created.'));
    } finally {
      setJoinCodeBusy(false);
    }
  }

  async function disableCode() {
    setJoinCodeBusy(true);
    setError(null);
    setNotice(null);
    try {
      await disableWorkspaceJoinCode(workspace.id);
      setJoinCode(null);
      setJoinCodeEnabled(false);
      setConfirmJoinCodeOff(false);
      setNotice('The join code was disabled.');
    } catch (cause) {
      setError(errorText(cause, 'The join code could not be disabled.'));
    } finally {
      setJoinCodeBusy(false);
    }
  }

  async function copyInvite() {
    if (!joinCode) return;
    try {
      await navigator.clipboard.writeText(joinCode.link);
      setCopyStatus('Join link copied.');
    } catch {
      setCopyStatus('Copy was blocked by the browser. Select and copy the link manually.');
    }
  }

  return (
    <div className="space-y-5">
      {notice && <Alert variant="success" title="Join request updated">{notice}</Alert>}
      {error && <Alert variant="error" title="Join request action failed">{error}</Alert>}

      <Card className="p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Join requests</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Requests expire after seven days. Applicants gain no workspace access until a request is approved.
            </p>
          </div>
          <div className="w-full sm:w-56">
            <Select
              id="join-request-filter"
              label="Filter join requests"
              srOnlyLabel
              value={status}
              onChange={(event) => {
                setLoading(true);
                setError(null);
                setStatus(event.target.value as JoinRequestListStatus);
              }}
              options={FILTER_OPTIONS}
            />
          </div>
        </div>

        {canManage && roleOptions.length > 0 && (
          <div className="mt-5 max-w-xs">
            <Select
              id="approval-role"
              label="Role for approved members"
              value={effectiveRole}
              onChange={(event) => setRole(event.target.value)}
              options={roleOptions.map((option) => ({ value: option.value, label: option.label }))}
              helperText="Applied to members you approve from this page."
            />
          </div>
        )}

        {loading ? (
          <p role="status" className="mt-5 text-sm text-[var(--color-text-secondary)]">Loading join requests…</p>
        ) : !requests || requests.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No join requests" description="No requests match this filter." />
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--color-border)]">
            {requests.map((request) => (
              <li key={request.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{request.userName}</p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">{request.userEmail}</p>
                  {request.message && <p className="mt-2 max-w-xl text-sm text-[var(--color-text-primary)]">“{request.message}”</p>}
                  <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                    Requested {dateTimeLabel(request.createdAt)} · expires {dateTimeLabel(request.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <Badge variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : request.status === 'EXPIRED' ? 'error' : 'outline'}>
                    {request.status.toLowerCase()}
                  </Badge>
                  {canManage && request.status === 'PENDING' && (
                    <>
                      <Button size="sm" loading={busyId === request.id} onClick={() => { void approve(request); }}>Approve</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRejectTarget(request); setRejectNote(''); }}>Reject</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {canManage && workspace.type !== 'INDIVIDUAL' && (
        <Card className="p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Join code</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            A join code lets people request access to this workspace without finding it in Discover. Every request still needs approval.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => { void createCode(); }} loading={joinCodeBusy}>
              {joinCodeEnabled ? 'Generate a new code' : 'Create join code'}
            </Button>
            {joinCodeEnabled && (
              <Button variant="secondary" onClick={() => setConfirmJoinCodeOff(true)}>Disable join code</Button>
            )}
          </div>
          {joinCode && (
            <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-4">
              <p className="text-xs text-[var(--color-text-secondary)]">Share this code once; it is not shown again.</p>
              <p className="mt-2 break-all font-mono text-sm">{joinCode.code}</p>
              <p className="mt-2 break-all text-xs text-[var(--color-text-secondary)]">{joinCode.link}</p>
              <Button className="mt-3" size="sm" variant="secondary" onClick={() => { void copyInvite(); }}>Copy join link</Button>
              {copyStatus && <p role="status" className="mt-2 text-xs text-[var(--color-text-secondary)]">{copyStatus}</p>}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title={`Reject ${rejectTarget?.userName ?? 'join request'}`}
        description="The applicant is not added to the workspace. A short note is optional."
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" loading={rejectTarget !== null && busyId === rejectTarget.id} onClick={() => { void confirmReject(); }}>Reject request</Button>
          </div>
        )}
      >
        <Textarea
          id="rejection-note"
          label="Note for the decision record"
          rows={3}
          maxLength={500}
          value={rejectNote}
          onChange={(event) => setRejectNote(event.target.value)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmJoinCodeOff}
        onClose={() => setConfirmJoinCodeOff(false)}
        onConfirm={() => { void disableCode(); }}
        title="Disable join code"
        description="People will no longer be able to use the current join code. Existing requests are unaffected."
        confirmLabel="Disable code"
        destructive
        loading={joinCodeBusy}
      />
    </div>
  );
}
