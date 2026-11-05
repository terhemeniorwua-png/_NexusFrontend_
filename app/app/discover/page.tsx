'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  createJoinRequest,
  discoverWorkspaces,
  joinWorkspaceByCode,
  listMyJoinRequests,
  withdrawJoinRequest,
  type DiscoveredWorkspace,
  type JoinRequest,
} from '@/services/join-requests';

function errorText(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function workspaceTypeLabel(type: DiscoveredWorkspace['type']): string {
  return type === 'COMPANY' ? 'Company' : type === 'INSTITUTION' ? 'Institution' : 'Individual';
}

export default function DiscoverPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveredWorkspace[] | null>(null);
  const [searching, setSearching] = useState(true);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [joinTarget, setJoinTarget] = useState<DiscoveredWorkspace | null>(null);
  const [joinMessage, setJoinMessage] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeMessage, setCodeMessage] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<JoinRequest[] | null>(null);
  const [myError, setMyError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<JoinRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadResults = useCallback(async (search: string) => {
    try {
      const loaded = await discoverWorkspaces({ search, limit: 30 });
      setResults(loaded);
    } catch (cause) {
      setSearchError(errorText(cause, 'Public workspaces could not be loaded.'));
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [loadedResults, loadedRequests] = await Promise.all([
          discoverWorkspaces({ search: '', limit: 30 }),
          listMyJoinRequests(),
        ]);
        if (active) {
          setResults(loadedResults);
          setMyRequests(loadedRequests);
        }
      } catch (cause) {
        if (active) {
          setSearchError(errorText(cause, 'Public workspaces could not be loaded.'));
          setMyError(errorText(cause, 'Your join requests could not be loaded.'));
        }
      } finally {
        if (active) setSearching(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!joinTarget) return;
    setJoining(true);
    setJoinError(null);
    setNotice(null);
    try {
      const created = await createJoinRequest(joinTarget.id, joinMessage);
      setMyRequests((current) => [created, ...(current ?? []).filter((item) => item.id !== created.id)]);
      setNotice(`Your request to join ${joinTarget.name} is pending approval.`);
      setJoinTarget(null);
      setJoinMessage('');
    } catch (cause) {
      setJoinError(errorText(cause, 'The join request could not be sent.'));
    } finally {
      setJoining(false);
    }
  }

  async function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.trim().length < 20) {
      setCodeError('Enter the full join code from your invitation.');
      return;
    }
    setCodeBusy(true);
    setCodeError(null);
    setNotice(null);
    try {
      const created = await joinWorkspaceByCode(code, codeMessage);
      setMyRequests((current) => [created, ...(current ?? []).filter((item) => item.id !== created.id)]);
      setNotice(`Your request to join ${created.workspaceName} is pending approval.`);
      setCode('');
      setCodeMessage('');
    } catch (cause) {
      setCodeError(errorText(cause, 'The join code could not be used.'));
    } finally {
      setCodeBusy(false);
    }
  }

  async function confirmWithdraw() {
    if (!withdrawTarget) return;
    const request = withdrawTarget;
    setWithdrawing(true);
    setNotice(null);
    setMyError(null);
    try {
      const updated = await withdrawJoinRequest(request.id);
      setMyRequests((current) => current?.map((item) => item.id === updated.id ? updated : item) ?? null);
      setNotice(`Your request to join ${request.workspaceName} was withdrawn.`);
      setWithdrawTarget(null);
    } catch (cause) {
      setMyError(errorText(cause, 'The join request could not be withdrawn.'));
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Discover organisations"
        description="Find public Company and Institution workspaces. Joining always requires approval; an account does not gain access by discovering a workspace."
      />

      {notice && <Alert variant="success" title="Request sent">{notice}</Alert>}

      <Card className="p-5 sm:p-7">
        <h2 className="text-xl font-semibold">Search workspaces</h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            setSearching(true);
            setSearchError(null);
            void loadResults(query);
          }}
        >
          <div className="flex-1">
            <Input
              id="discover-search"
              label="Search by workspace name or slug"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search public workspaces"
            />
          </div>
          <Button type="submit" loading={searching}>Search</Button>
        </form>

        {searchError ? (
          <Alert variant="error" title="Search unavailable" className="mt-5">{searchError}</Alert>
        ) : searching ? (
          <p role="status" className="mt-5 text-sm text-[var(--color-text-secondary)]">Searching public workspaces…</p>
        ) : !results || results.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No public workspaces found" description="Try a different search, or ask an administrator for an invitation or join code." />
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-[var(--color-border)]">
            {results.map((workspace) => {
              const current = workspace.id === activeWorkspace?.id;
              return (
                <li key={workspace.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{workspace.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                      {workspaceTypeLabel(workspace.type)} · {workspace.memberCount} members · {workspace.slug}
                    </p>
                    {workspace.description && <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">{workspace.description}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Badge variant="outline">{workspaceTypeLabel(workspace.type)}</Badge>
                    {current ? (
                      <Badge variant="success">Current workspace</Badge>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => { setJoinTarget(workspace); setJoinMessage(''); setJoinError(null); }}>
                        Request to join
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Join with a code</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Use the code or link an administrator shared with you. Requests still require approval.
          </p>
          <form onSubmit={submitCode} className="mt-5 space-y-4">
            <Input
              id="join-code"
              label="Join code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
            <Textarea
              id="join-code-message"
              label="Message to the administrators (optional)"
              rows={2}
              maxLength={500}
              value={codeMessage}
              onChange={(event) => setCodeMessage(event.target.value)}
            />
            {codeError && <p role="alert" className="text-sm text-[var(--color-error)]">{codeError}</p>}
            <Button type="submit" loading={codeBusy}>Request access</Button>
          </form>
        </Card>

        <Card className="p-5 sm:p-7">
          <h2 className="text-xl font-semibold">Your join requests</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Request status and expiry dates are supplied by the workspace service.</p>
          {myError && <Alert variant="error" title="Requests unavailable" className="mt-4">{myError}</Alert>}
          {myRequests === null && !myError ? (
            <p role="status" className="mt-4 text-sm text-[var(--color-text-secondary)]">Loading your requests…</p>
          ) : myRequests && myRequests.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No join requests" description="You have not requested access to another workspace." />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--color-border)]">
              {myRequests?.map((request) => (
                <li key={request.id} className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{request.workspaceName}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Sent {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(request.createdAt))}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.expiresAt))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={request.status === 'PENDING' ? 'warning' : request.status === 'APPROVED' ? 'success' : request.status === 'EXPIRED' || request.status === 'REJECTED' ? 'error' : 'outline'}>
                      {request.status.toLowerCase()}
                    </Badge>
                    {request.status === 'PENDING' && (
                      <Button size="sm" variant="ghost" onClick={() => setWithdrawTarget(request)}>Withdraw</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={joinTarget !== null}
        onClose={() => setJoinTarget(null)}
        title={`Request to join ${joinTarget?.name ?? 'workspace'}`}
        description="An administrator reviews the request. You will not see private workspace content while it is pending."
        footer={(
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setJoinTarget(null)}>Cancel</Button>
            <Button type="submit" form="join-request-form" loading={joining}>Send request</Button>
          </div>
        )}
      >
        {joinError && <Alert variant="error" title="Request not sent" className="mb-4">{joinError}</Alert>}
        <form id="join-request-form" onSubmit={submitMessage}>
          <Textarea
            id="join-message"
            label="Message to the administrators (optional)"
            rows={3}
            maxLength={500}
            value={joinMessage}
            onChange={(event) => setJoinMessage(event.target.value)}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={withdrawTarget !== null}
        onClose={() => setWithdrawTarget(null)}
        onConfirm={() => { void confirmWithdraw(); }}
        title="Withdraw join request"
        description={withdrawTarget ? `Withdraw your request to join ${withdrawTarget.workspaceName}? You can request access again later.` : undefined}
        confirmLabel="Withdraw request"
        loading={withdrawing}
      />
    </div>
  );
}
