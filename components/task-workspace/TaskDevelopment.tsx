'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  canBrowseRepository,
  canLinkRepository,
  type DevBranchSummary,
  type DevPullRequestSummary,
  type LinkedProjectRepository,
  type TaskDevLink,
} from '@/services/dev-integrations';

function stateVariant(state?: string | null): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  const s = (state ?? '').toLowerCase();
  if (s === 'open') return 'success';
  if (s === 'merged') return 'info';
  if (s === 'closed') return 'warning';
  if (s === 'draft') return 'outline';
  return 'default';
}

function reviewBadgeLabel(reviewState?: string | null): string | null {
  switch ((reviewState ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'Approved';
    case 'CHANGES_REQUESTED':
      return 'Changes requested';
    case 'COMMENTED':
      return 'Commented';
    default:
      return null;
  }
}

function reviewBadgeVariant(reviewState?: string | null): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch ((reviewState ?? '').toUpperCase()) {
    case 'APPROVED':
      return 'success';
    case 'CHANGES_REQUESTED':
      return 'warning';
    case 'COMMENTED':
      return 'info';
    default:
      return 'default';
  }
}

function relativeTime(isoString?: string | null): string | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TaskDevelopment({
  linkedRepos,
  devLinks,
  loading,
  error,
  canLink,
  busy,
  onReload,
  onLoadBranches,
  onLoadPullRequests,
  onLink,
  onUnlink,
}: {
  linkedRepos: LinkedProjectRepository[];
  devLinks: TaskDevLink[];
  loading: boolean;
  error: string | null;
  canLink: boolean;
  busy: boolean;
  onReload: () => void | Promise<void>;
  onLoadBranches: (repositoryId: string, search?: string) => Promise<DevBranchSummary[]>;
  onLoadPullRequests: (repositoryId: string, search?: string, state?: 'open' | 'closed' | 'all') => Promise<DevPullRequestSummary[]>;
  onLink: (input: { projectRepositoryId: string; externalType: 'BRANCH' | 'PULL_REQUEST'; externalId: string; externalNumber?: number | null; title?: string | null; url?: string | null; ref?: string | null; headRef?: string | null; baseRef?: string | null; state?: string | null }) => Promise<void>;
  onUnlink: (devLinkId: string) => Promise<void>;
}) {
  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [mode, setMode] = useState<'PULL_REQUEST' | 'BRANCH'>('PULL_REQUEST');
  const [search, setSearch] = useState('');
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);
  const [branches, setBranches] = useState<DevBranchSummary[]>([]);
  const [prs, setPrs] = useState<DevPullRequestSummary[]>([]);
  const [unlinkTarget, setUnlinkTarget] = useState<TaskDevLink | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const visibleRepos = useMemo(
    () => linkedRepos.filter((r) => r.effectiveAccessLevel !== 'NONE'),
    [linkedRepos],
  );
  const selectedRepo = useMemo(() => visibleRepos.find((r) => r.id === selectedRepoId) ?? null, [visibleRepos, selectedRepoId]);
  const selectedRepoAccess = selectedRepo?.effectiveAccessLevel ?? null;
  const canBrowseSelected = canBrowseRepository(selectedRepoAccess);
  const canLinkSelected = canLink && canLinkRepository(selectedRepoAccess);
  const providerName = selectedRepo?.provider === 'GITLAB' ? 'GitLab' : selectedRepo?.provider === 'GITHUB' ? 'GitHub' : 'provider';

  async function browse() {
    if (!selectedRepoId || !canBrowseSelected) return;
    setBrowseLoading(true); setBrowseError(null); setLocalNotice(null);
    try {
      if (mode === 'BRANCH') {
        setPrs([]);
        const items = await onLoadBranches(selectedRepoId, search.trim() || undefined);
        setBranches(items);
      } else {
        setBranches([]);
        const items = await onLoadPullRequests(selectedRepoId, search.trim() || undefined, 'open');
        setPrs(items);
      }
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : `Could not load development items from ${providerName}.`);
    } finally {
      setBrowseLoading(false);
    }
  }

  const linkedKeys = useMemo(() => new Set(devLinks.map((l) => `${l.provider}:${l.externalType}:${l.externalId}`)), [devLinks]);

  async function handleLinkBranch(b: DevBranchSummary) {
    if (!selectedRepo) return;
    setLocalNotice(null); setBrowseError(null);
    try {
      await onLink({
        projectRepositoryId: selectedRepo.id,
        externalType: 'BRANCH',
        externalId: b.name,
        title: b.name,
        url: b.url ?? null,
        ref: b.name,
        state: b.protected ? 'protected' : null,
      });
      setLocalNotice(`Linked branch ${b.name}.`);
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : 'Could not link branch.');
    }
  }

  async function handleLinkPr(pr: DevPullRequestSummary) {
    if (!selectedRepo) return;
    setLocalNotice(null); setBrowseError(null);
    try {
      await onLink({
        projectRepositoryId: selectedRepo.id,
        externalType: 'PULL_REQUEST',
        externalId: pr.externalId,
        externalNumber: pr.number,
        title: pr.title,
        url: pr.url,
        ref: pr.headRef,
        headRef: pr.headRef,
        baseRef: pr.baseRef,
        state: pr.state,
      });
      setLocalNotice(`Linked PR #${pr.number}.`);
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : 'Could not link pull request.');
    }
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return;
    setBrowseError(null); setLocalNotice(null);
    try {
      await onUnlink(unlinkTarget.id);
      setLocalNotice('Development link removed.');
      setUnlinkTarget(null);
    } catch (e) {
      setBrowseError(e instanceof Error ? e.message : 'Could not remove development link.');
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Development</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Link branches and pull/merge requests to this task. PITERON links to source control providers and shows development status; it does not host or edit code.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void onReload()} disabled={loading || busy}>Refresh</Button>
        </div>

        {error && <Alert className="mt-3" variant="error">{error}</Alert>}
        {localNotice && <Alert className="mt-3" variant="success">{localNotice}</Alert>}

        <div className="mt-4">
          <h3 className="text-sm font-medium">Linked items</h3>
          {loading ? (
            <div className="mt-2 space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : devLinks.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">No branches or pull requests linked to this task yet.</p>
          ) : (
            <ul className="mt-2 space-y-2" role="list">
              {devLinks.map((link) => {
                const accessLevel = link.effectiveAccessLevel;
                const hasKnownLevel = accessLevel !== undefined;
                // Contract: restricted only from METADATA. null (no linked repo) renders as before, never restricted.
                // Legacy fallback: when effectiveAccessLevel is undefined (older shape), keep previous restricted heuristic.
                const restricted = hasKnownLevel ? accessLevel === 'METADATA' : (!link.url && !link.repositoryFullName);
                const canMutateByLevel = hasKnownLevel ? accessLevel === 'LINK' : accessLevel === undefined;
                const canUnlink = canLink && canMutateByLevel;
                const label = restricted
                  ? 'Restricted repository'
                  : link.externalType === 'PULL_REQUEST'
                    ? `PR #${link.externalNumber ?? ''}${link.title ? ` — ${link.title}` : ''}`
                    : link.externalType === 'BRANCH'
                      ? `Branch: ${link.ref ?? link.title ?? link.externalId}`
                      : `${link.externalType}: ${link.title ?? link.externalId}`;
                const reviewLabel = !restricted && link.externalType === 'PULL_REQUEST' ? reviewBadgeLabel(link.reviewState) : null;
                const reviewedAtLabel = !restricted && link.externalType === 'PULL_REQUEST' ? relativeTime(link.reviewedAt) : null;
                const merged = !restricted && ((link.state ?? '').toLowerCase() === 'merged' || !!link.mergedAt);

                return (
                  <li key={link.id} className="flex flex-col gap-2 rounded border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{link.externalType === 'PULL_REQUEST' ? 'Pull request' : link.externalType === 'BRANCH' ? 'Branch' : 'Commit'}</Badge>
                        {restricted ? <Badge variant="warning">Restricted</Badge> : null}
                        {!restricted && (merged ? <Badge variant="info">Merged</Badge> : link.state ? <Badge variant={stateVariant(link.state)}>{link.state}</Badge> : null)}
                        {reviewLabel ? <Badge variant={reviewBadgeVariant(link.reviewState)}>{reviewLabel}</Badge> : null}
                        {!restricted && link.repositoryFullName ? <span className="text-xs text-[var(--color-text-muted)]">{link.repositoryFullName}</span> : null}
                      </div>
                      <p className="mt-1 truncate font-medium text-[var(--color-text-primary)]">
                        {restricted ? (
                          <span className="text-[var(--color-text-muted)]">{label}</span>
                        ) : (() => {
                          const base = link.projectRepositoryId ? `/app/projects/${link.projectId}/code/${link.projectRepositoryId}` : null;
                          const inApp = !base ? null
                            : link.externalType === 'COMMIT' ? `${base}/commit/${link.externalId}`
                            : link.externalType === 'PULL_REQUEST' && link.externalNumber ? `${base}/pull/${link.externalNumber}`
                            : null;
                          if (inApp) return <Link className="underline underline-offset-2" href={inApp}>{label}</Link>;
                          return link.url ? <a className="underline underline-offset-2" href={link.url} target="_blank" rel="noreferrer">{label}</a> : label;
                        })()}
                      </p>
                      {restricted ? (
                        <p className="text-xs text-[var(--color-text-muted)]">Restricted repository. You do not have access to this repository content.</p>
                      ) : (
                        <>
                          {(link.headRef || link.baseRef) && <p className="text-xs text-[var(--color-text-muted)]">{link.headRef ?? '—'} → {link.baseRef ?? '—'}</p>}
                          {link.externalType === 'PULL_REQUEST' && (link.reviewerLogin || reviewedAtLabel) ? (
                            <p className="text-xs text-[var(--color-text-muted)]">
                              {link.reviewerLogin ? `Reviewed by ${link.reviewerLogin}` : 'Reviewed'}
                              {reviewedAtLabel ? ` · ${reviewedAtLabel}` : ''}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                    {canUnlink && (
                      <Button size="sm" variant="secondary" onClick={() => setUnlinkTarget(link)} disabled={busy}>Unlink</Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Link development work</h3>
        {!canLink ? (
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">Your task/project role cannot link or unlink development items.</p>
        ) : visibleRepos.length === 0 ? (
          <Alert className="mt-3" variant="info">
            {linkedRepos.length > 0 ? 'You do not have access to repositories linked to this project.' : 'No repositories are linked to this project. Link a GitHub or GitLab repository in Project Settings → Source control first.'}
          </Alert>
        ) : (
          <div className="mt-3 space-y-3">
            {browseError && <Alert variant="error">{browseError}</Alert>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="dev-repo"
                label="Repository"
                value={selectedRepoId}
                onChange={(e) => { setSelectedRepoId(e.target.value); setBranches([]); setPrs([]); }}
                options={[
                  { value: '', label: 'Select a linked repository…' },
                  ...visibleRepos.map((r) => ({ value: r.id, label: r.fullName })),
                ]}
              />
              <Select
                id="dev-type"
                label="Type"
                value={mode}
                onChange={(e) => { setMode(e.target.value as 'PULL_REQUEST' | 'BRANCH'); setBranches([]); setPrs([]); }}
                options={[
                  { value: 'PULL_REQUEST', label: 'Pull requests' },
                  { value: 'BRANCH', label: 'Branches' },
                ]}
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1">
                <Input id="dev-search" label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={mode === 'PULL_REQUEST' ? 'Title, number, or branch' : 'Branch name'} />
              </div>
              <Button variant="secondary" onClick={() => void browse()} loading={browseLoading} disabled={!selectedRepoId || busy || !canBrowseSelected}>Load from {selectedRepo ? providerName : 'provider'}</Button>
            </div>
            {selectedRepo && selectedRepoAccess === 'METADATA' && (
              <Alert variant="info">Restricted repository. You can see its name, but code activity cannot be browsed.</Alert>
            )}
            {selectedRepo && selectedRepoAccess !== null && selectedRepoAccess !== 'METADATA' && !canLinkSelected && (
              <Alert variant="info">You have read access to this repository. Linking and unlinking development work requires link access.</Alert>
            )}

            {browseLoading ? (
              <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
            ) : mode === 'PULL_REQUEST' ? (
              prs.length === 0 ? (selectedRepoId ? <p className="text-sm text-[var(--color-text-muted)]">No pull requests or merge requests loaded. Click “Load from {providerName}”.</p> : null) : (
                <ul className="space-y-2" role="list">
                  {prs.map((pr) => {
                    const already = linkedKeys.has(`${selectedRepo?.provider ?? 'GITHUB'}:PULL_REQUEST:${pr.externalId}`);
                    return (
                      <li key={pr.externalId} className="flex flex-col gap-2 rounded border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">#{pr.number} {pr.title}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">{pr.headRef ?? '—'} → {pr.baseRef ?? '—'} · {pr.state}{pr.authorLogin ? ` · ${pr.authorLogin}` : ''}</p>
                        </div>
                        {canLinkSelected ? (
                          <Button size="sm" onClick={() => void handleLinkPr(pr)} disabled={already || busy}>{already ? 'Linked' : 'Link'}</Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              branches.length === 0 ? (selectedRepoId ? <p className="text-sm text-[var(--color-text-muted)]">No branches loaded. Click “Load from {providerName}”.</p> : null) : (
                <ul className="space-y-2" role="list">
                  {branches.map((b) => {
                    const already = linkedKeys.has(`${selectedRepo?.provider ?? 'GITHUB'}:BRANCH:${b.name}`);
                    return (
                      <li key={b.name} className="flex flex-col gap-2 rounded border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium">{b.name}</p>
                          {b.commitSha ? <p className="text-xs text-[var(--color-text-muted)]">{b.commitSha.slice(0, 12)}</p> : null}
                        </div>
                        {canLinkSelected ? (
                          <Button size="sm" onClick={() => void handleLinkBranch(b)} disabled={already || busy}>{already ? 'Linked' : 'Link'}</Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!unlinkTarget}
        title="Remove development link"
        description={`Remove linked ${unlinkTarget?.externalType === 'PULL_REQUEST' ? 'pull request or merge request' : 'branch'} from this task? This does not affect ${unlinkTarget?.provider === 'GITLAB' ? 'GitLab' : 'GitHub'}.`}
        confirmLabel="Remove"
        destructive
        loading={busy}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={() => { void confirmUnlink(); }}
      />
    </div>
  );
}
