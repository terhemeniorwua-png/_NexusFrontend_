'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  listProjectRepositories,
  listRepositoryBranches,
  listRepositoryCommits,
  listRepositoryPullRequests,
  type DevBranchSummary,
  type DevCommitSummary,
  type DevPullRequestSummary,
  type LinkedProjectRepository,
} from '@/services/dev-integrations';

function errMsg(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError ? cause.message : fallback;
}

function stateVariant(state: string): 'success' | 'info' | 'warning' | 'outline' | 'default' {
  const s = state.toLowerCase();
  if (s === 'open') return 'success';
  if (s === 'merged') return 'info';
  if (s === 'closed') return 'warning';
  if (s === 'draft') return 'outline';
  return 'default';
}

function dateLabel(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '';
}

const selectClass =
  'h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm';

export default function ProjectCodePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;

  const [repos, setRepos] = useState<LinkedProjectRepository[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [repoId, setRepoId] = useState('');
  const [mode, setMode] = useState<'pulls' | 'commits'>('pulls');
  const [prState, setPrState] = useState<'open' | 'closed' | 'all'>('open');
  const [branch, setBranch] = useState('');
  const [branches, setBranches] = useState<DevBranchSummary[]>([]);
  const [prs, setPrs] = useState<DevPullRequestSummary[]>([]);
  const [commits, setCommits] = useState<DevCommitSummary[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    (async () => {
      try {
        const list = await listProjectRepositories(workspaceId, projectId);
        if (!active) return;
        setRepos(list);
        setRepoId((current) => current || list[0]?.id || '');
      } catch (cause) {
        if (active) setError(errMsg(cause, 'Linked repositories could not be loaded.'));
      } finally {
        if (active) setReposLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, projectId]);

  useEffect(() => {
    if (!workspaceId || !repoId) return;
    let active = true;
    listRepositoryBranches(workspaceId, projectId, repoId, { perPage: 100 })
      .then((r) => { if (active) setBranches(r.items); })
      .catch(() => { if (active) setBranches([]); });
    return () => { active = false; };
  }, [workspaceId, projectId, repoId]);

  useEffect(() => {
    if (!workspaceId || !repoId) return;
    let active = true;
    (async () => {
      setItemsLoading(true);
      setError(null);
      try {
        if (mode === 'pulls') {
          const r = await listRepositoryPullRequests(workspaceId, projectId, repoId, { state: prState, perPage: 50 });
          if (active) setPrs(r.items);
        } else {
          const r = await listRepositoryCommits(workspaceId, projectId, repoId, branch || undefined);
          if (active) setCommits(r.items);
        }
      } catch (cause) {
        if (active) setError(errMsg(cause, 'GitHub data could not be loaded.'));
      } finally {
        if (active) setItemsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, projectId, repoId, mode, prState, branch]);

  if (workspaceLoading || reposLoading) {
    return <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading code…</p>;
  }

  if (!repos.length) {
    return (
      <EmptyState
        title="No repository linked"
        description="Link a GitHub repository to this project from Integrations to browse its code here."
        action={<Link href="/app/integrations" className="text-[var(--color-primary)] underline">Open Integrations</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Repository" className={selectClass} value={repoId} onChange={(e) => setRepoId(e.target.value)}>
          {repos.map((r) => <option key={r.id} value={r.id}>{r.fullName}</option>)}
        </select>
        <div className="flex gap-1" role="tablist" aria-label="Code view">
          {(['pulls', 'commits'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={['h-9 rounded-[var(--radius-md)] px-3 text-sm font-medium',
                mode === m ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'].join(' ')}
            >
              {m === 'pulls' ? 'Pull requests' : 'Commits'}
            </button>
          ))}
        </div>
        {mode === 'pulls' ? (
          <select aria-label="Pull request state" className={selectClass} value={prState} onChange={(e) => setPrState(e.target.value as 'open' | 'closed' | 'all')}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        ) : (
          <select aria-label="Branch" className={selectClass} value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Default branch</option>
            {branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
        )}
      </div>

      {error && <Alert variant="error" title="Could not load">{error}</Alert>}

      {itemsLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : mode === 'pulls' ? (
        prs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No pull requests found.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
            {prs.map((pr) => (
              <li key={pr.number}>
                <Link
                  href={`/app/projects/${projectId}/code/${repoId}/pull/${pr.number}`}
                  className="flex items-center justify-between gap-3 p-4 hover:bg-[var(--color-surface-secondary)]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">#{pr.number} {pr.title}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {pr.authorLogin ?? 'unknown'} · {pr.headRef} → {pr.baseRef} · {dateLabel(pr.updatedAt)}
                    </span>
                  </span>
                  <Badge variant={stateVariant(pr.state)}>{pr.state}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : commits.length === 0 ? (
        <p className="text-sm text-[var(--color-text-secondary)]">No commits found.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {commits.map((c) => (
            <li key={c.sha} className="flex items-center justify-between gap-3 p-4">
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.message.split('\n')[0]}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">
                  {c.authorLogin ?? c.authorName ?? 'unknown'} · {dateLabel(c.date)}
                </span>
              </span>
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer" className="shrink-0 font-mono text-xs text-[var(--color-primary)] underline">
                  {c.sha.slice(0, 7)}
                </a>
              ) : (
                <span className="shrink-0 font-mono text-xs">{c.sha.slice(0, 7)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
