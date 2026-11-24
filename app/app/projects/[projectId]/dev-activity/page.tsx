'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { devActivityErrorMessage } from '@/services/dev-activity-errors';
import {
  listDevActivityCommits,
  listDevActivityDevelopers,
  type DevActivityCommit,
  type DevActivityDeveloper,
  type DevActivityDevelopersReport,
} from '@/services/dev-integrations';

type CommitFilters = {
  repositoryId: string;
  authorLogin: string;
  from: string;
  to: string;
};

const EMPTY_FILTERS: CommitFilters = { repositoryId: '', authorLogin: '', from: '', to: '' };

function localDateToIsoStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}

function localDateToIsoEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

function isoToLocalDateValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function firstMessageLine(message: string): string {
  return message.split(/\r?\n/, 1)[0] ?? '';
}

function hasFullMessageDisclosure(message: string): boolean {
  const first = firstMessageLine(message);
  return message.includes('\n') || message.includes('\r') || first.length > 120;
}

function commitAuthorLabel(commit: DevActivityCommit): string {
  const name = commit.authorUser?.name?.trim();
  if (name) return name;
  const authorName = commit.authorName?.trim();
  if (authorName) return authorName;
  const login = commit.authorLogin?.trim();
  if (login) return `@${login}`;
  return 'Unknown author';
}

function hasActiveCommitFilters(filters: CommitFilters): boolean {
  return Boolean(filters.repositoryId || filters.authorLogin.trim() || filters.from || filters.to);
}

function buildCommitsParams(filters: CommitFilters, cursor?: string) {
  return {
    cursor,
    limit: 20,
    repositoryId: filters.repositoryId || undefined,
    authorLogin: filters.authorLogin.trim() || undefined,
    from: filters.from ? localDateToIsoStart(filters.from) : undefined,
    to: filters.to ? localDateToIsoEnd(filters.to) : undefined,
  };
}

function CommitRow({ commit }: { commit: DevActivityCommit }) {
  const [expanded, setExpanded] = useState(false);
  const firstLine = firstMessageLine(commit.message);
  const showDisclosure = hasFullMessageDisclosure(commit.message);
  const sha7 = shortSha(commit.sha);
  const messageId = `commit-message-${commit.id}`;

  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {commit.url ? (
              <a
                href={commit.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Commit ${sha7} (opens in new tab)`}
                className="font-mono text-[var(--color-primary)] underline underline-offset-2"
              >
                <code>{sha7}</code>
              </a>
            ) : (
              <code className="font-mono text-[var(--color-text-secondary)]">{sha7}</code>
            )}
            <span className="min-w-0 break-words font-medium text-[var(--color-text-primary)]">
              {firstLine || <span className="text-[var(--color-text-muted)]">No commit message</span>}
            </span>
          </div>

          {showDisclosure && (
            <div className="mt-1">
              <button
                type="button"
                className="text-xs font-medium text-[var(--color-primary)] underline underline-offset-2"
                aria-expanded={expanded}
                aria-controls={messageId}
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? 'Hide full message' : 'Show full message'}
              </button>
              {expanded && (
                <pre
                  id={messageId}
                  className="mt-2 whitespace-pre-wrap break-words rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-secondary)]"
                >
                  {commit.message}
                </pre>
              )}
            </div>
          )}

          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            <span>{commit.repositoryFullName}</span>
            {commit.branch ? <span> · {commit.branch}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            <span>{commitAuthorLabel(commit)}</span>
            <span> · </span>
            <time dateTime={commit.committedAt}>{formatDateTime(commit.committedAt)}</time>
          </p>
        </div>
      </div>
    </li>
  );
}

function CommitsPanel({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const [draftFilters, setDraftFilters] = useState<CommitFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<CommitFilters>(EMPTY_FILTERS);
  const [dateError, setDateError] = useState<string | null>(null);
  const [items, setItems] = useState<DevActivityCommit[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [repoOptions, setRepoOptions] = useState<Array<{ id: string; fullName: string }>>([]);
  const requestRef = useRef(0);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  const mergeRepoOptions = useCallback((rows: DevActivityCommit[]) => {
    setRepoOptions((current) => {
      const map = new Map(current.map((r) => [r.id, r]));
      for (const row of rows) {
        if (!map.has(row.repositoryId)) {
          map.set(row.repositoryId, { id: row.repositoryId, fullName: row.repositoryFullName });
        }
      }
      return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
    });
  }, []);

  const loadPage = useCallback(
    async (filters: CommitFilters, cursor?: string, append = false) => {
      const reqId = ++requestRef.current;
      if (append) {
        setLoadingMore(true);
        setLoadMoreError(null);
      } else {
        setLoading(true);
        setError(null);
        setLoadMoreError(null);
      }
      try {
        const page = await listDevActivityCommits(workspaceId, projectId, buildCommitsParams(filters, cursor));
        if (reqId !== requestRef.current) return;
        mergeRepoOptions(page.items);
        setNextCursor(page.nextCursor);
        setItems((current) => {
          if (!append) return page.items;
          const seen = new Set(current.map((i) => i.id));
          const merged = [...current];
          for (const item of page.items) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              merged.push(item);
            }
          }
          return merged;
        });
        if (append && !page.nextCursor) {
          queueMicrotask(() => statusRef.current?.focus());
        }
      } catch (cause) {
        if (reqId !== requestRef.current) return;
        const message = devActivityErrorMessage(cause, 'commits');
        if (append) {
          setLoadMoreError(message);
        } else {
          if (cause instanceof ApiRequestError && cause.status === 404) {
            setDraftFilters((f) => ({ ...f, repositoryId: '' }));
            setAppliedFilters((f) => ({ ...f, repositoryId: '' }));
            setError(message);
            setItems([]);
            setNextCursor(null);
          } else {
            setError(message);
            setItems([]);
            setNextCursor(null);
          }
        }
      } finally {
        if (reqId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [mergeRepoOptions, projectId, workspaceId],
  );

  useEffect(() => {
    void loadPage(EMPTY_FILTERS);
  }, [loadPage]);

  function applyFilters() {
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setDateError('The start date must be before the end date.');
      return;
    }
    setDateError(null);
    const next = { ...draftFilters, authorLogin: draftFilters.authorLogin.trim() };
    setAppliedFilters(next);
    setItems([]);
    setNextCursor(null);
    void loadPage(next);
  }

  function clearFilters() {
    setDateError(null);
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setItems([]);
    setNextCursor(null);
    void loadPage(EMPTY_FILTERS);
  }

  const activeFilters = hasActiveCommitFilters(appliedFilters);

  return (
    <section aria-labelledby="dev-commits-heading" className="space-y-4">
      <h2 id="dev-commits-heading" className="text-xl font-semibold">Commits</h2>

      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
        Showing activity from the default branch of linked repositories you can read. History starts when the repository was connected.
      </div>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Repository</span>
            <select
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              value={draftFilters.repositoryId}
              onChange={(e) => setDraftFilters((f) => ({ ...f, repositoryId: e.target.value }))}
            >
              <option value="">All repositories</option>
              {repoOptions.map((repo) => (
                <option key={repo.id} value={repo.id}>{repo.fullName}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Author login</span>
            <input
              type="text"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              placeholder="e.g. octocat"
              value={draftFilters.authorLogin}
              onChange={(e) => setDraftFilters((f) => ({ ...f, authorLogin: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">From</span>
            <input
              type="date"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              value={draftFilters.from}
              onChange={(e) => setDraftFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">To</span>
            <input
              type="date"
              className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              value={draftFilters.to}
              onChange={(e) => setDraftFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </label>

          <div className="flex items-end gap-2">
            <Button type="button" onClick={applyFilters}>Apply filters</Button>
            {activeFilters && (
              <Button type="button" variant="secondary" onClick={clearFilters}>Clear filters</Button>
            )}
          </div>
        </div>
        {dateError && <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">{dateError}</p>}
      </Card>

      <p ref={statusRef} tabIndex={-1} className="sr-only" role="status">
        {!loading && !loadingMore && !nextCursor && items.length > 0 ? 'All commits loaded.' : ''}
      </p>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading commits">
          <p className="sr-only">Loading commits…</p>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <div className="space-y-3">
          <Alert variant="error" title="Could not load commits" role="alert">{error}</Alert>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => void loadPage(appliedFilters)}>Retry</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}>Clear filters</Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        activeFilters ? (
          <EmptyState
            title="No commits match these filters."
            description="Try changing or clearing filters."
            action={<Button type="button" variant="secondary" onClick={clearFilters}>Clear filters</Button>}
          />
        ) : (
          <EmptyState title="No commits have been recorded for this project yet." description="Commits will appear when linked repositories have default-branch activity." />
        )
      ) : (
        <Card className="p-4">
          <ul className="divide-y divide-[var(--color-border)]" aria-label="Commits">
            {items.map((commit) => <CommitRow key={commit.id} commit={commit} />)}
          </ul>

          {loadMoreError && (
            <div className="mt-4 space-y-2">
              <Alert variant="error" role="alert">{loadMoreError}</Alert>
              <Button type="button" variant="secondary" onClick={() => void loadPage(appliedFilters, nextCursor ?? undefined, true)}>
                Try again
              </Button>
            </div>
          )}

          {nextCursor && !loadMoreError && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                loading={loadingMore}
                disabled={loadingMore}
                onClick={() => void loadPage(appliedFilters, nextCursor, true)}
              >
                {loadingMore ? 'Loading more…' : 'Load more'}
              </Button>
            </div>
          )}
          {loadingMore && <p className="sr-only" role="status">Loading more commits…</p>}
        </Card>
      )}
    </section>
  );
}

type DevSortKey = 'displayName' | 'commits' | 'pullRequestsOpened' | 'pullRequestsMerged' | 'reviewsGiven';
type SortDir = 'asc' | 'desc';

function compareDevelopers(a: DevActivityDeveloper, b: DevActivityDeveloper, key: DevSortKey, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1;
  let cmp = 0;
  if (key === 'displayName') {
    cmp = a.displayName.localeCompare(b.displayName);
  } else {
    cmp = a[key] - b[key];
  }
  if (cmp !== 0) return cmp * mul;
  // stable tie-breaker: commits desc, then displayName asc
  if (key !== 'commits') {
    const c = b.commits - a.commits;
    if (c !== 0) return c;
  }
  return a.displayName.localeCompare(b.displayName);
}

function developerRowKey(dev: DevActivityDeveloper): string {
  if (dev.type === 'workspace_user' && dev.user?.id) return `user:${dev.user.id}`;
  const login = (dev.providerLogin ?? dev.displayName).toLowerCase();
  return `unmapped:${login}`;
}

function developerLabel(dev: DevActivityDeveloper): string {
  if (dev.type === 'workspace_user') return dev.user?.name?.trim() || dev.displayName;
  return `@${dev.providerLogin ?? dev.displayName ?? 'Unknown developer'}`;
}

function defaultDeveloperRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: isoToLocalDateValue(from.toISOString()), to: isoToLocalDateValue(to.toISOString()) };
}

function DeveloperReportPanel({ workspaceId, projectId }: { workspaceId: string; projectId: string }) {
  const defaults = useMemo(() => defaultDeveloperRange(), []);
  const [draftFrom, setDraftFrom] = useState(defaults.from);
  const [draftTo, setDraftTo] = useState(defaults.to);
  const [applied, setApplied] = useState(defaults);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [report, setReport] = useState<DevActivityDevelopersReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sortKey, setSortKey] = useState<DevSortKey>('commits');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [caveatsOpen, setCaveatsOpen] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(async (range: { from: string; to: string }) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    setError(null);
    setAccessDenied(false);
    try {
      const params = {
        from: localDateToIsoStart(range.from),
        to: localDateToIsoEnd(range.to),
      };
      const data = await listDevActivityDevelopers(workspaceId, projectId, params);
      if (reqId !== requestRef.current) return;
      setReport(data);
    } catch (cause) {
      if (reqId !== requestRef.current) return;
      if (cause instanceof ApiRequestError && cause.status === 403) {
        setAccessDenied(true);
        setReport(null);
      } else {
        setError(devActivityErrorMessage(cause, 'developers'));
      }
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, [projectId, workspaceId]);

  useEffect(() => {
    void load(defaults);
  }, [defaults, load]);

  function applyRange() {
    if (!draftFrom || !draftTo) {
      setRangeError('Select a start and end date.');
      return;
    }
    const fromIso = localDateToIsoStart(draftFrom);
    const toIso = localDateToIsoEnd(draftTo);
    const fromMs = new Date(fromIso).getTime();
    const toMs = new Date(toIso).getTime();
    if (!(fromMs < toMs)) {
      setRangeError('The start date must be before the end date.');
      return;
    }
    const maxRangeMs = 90 * 24 * 60 * 60 * 1000;
    if (toMs - fromMs > maxRangeMs) {
      setRangeError('Choose a range of 90 days or less.');
      return;
    }
    setRangeError(null);
    const next = { from: draftFrom, to: draftTo };
    setApplied(next);
    void load(next);
  }

  function toggleSort(key: DevSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'displayName' ? 'asc' : 'desc');
    }
  }

  const sortedDevelopers = useMemo(() => {
    const rows = report?.developers ?? [];
    return [...rows].sort((a, b) => compareDevelopers(a, b, sortKey, sortDir));
  }, [report, sortKey, sortDir]);

  if (accessDenied) {
    return (
      <section aria-labelledby="dev-developers-heading" className="space-y-4">
        <h2 id="dev-developers-heading" className="text-xl font-semibold">Developer activity</h2>
        <Alert variant="error" role="alert">You do not have access to this report.</Alert>
      </section>
    );
  }

  const ariaSort = (key: DevSortKey): 'ascending' | 'descending' | 'none' =>
    sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none';

  const sortButton = (key: DevSortKey, label: string) => (
    <th scope="col" aria-sort={ariaSort(key)} className="px-3 py-2 text-left text-xs font-medium text-[var(--color-text-muted)]">
      <button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" onClick={() => toggleSort(key)}>
        {label}
      </button>
    </th>
  );

  return (
    <section aria-labelledby="dev-developers-heading" className="space-y-4">
      <h2 id="dev-developers-heading" className="text-xl font-semibold">Developer activity</h2>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Start date</span>
            <input type="date" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">End date</span>
            <input type="date" className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </label>
          <Button type="button" onClick={applyRange}>Apply</Button>
        </div>
        {rangeError && <p className="mt-2 text-sm text-[var(--color-danger)]" role="alert">{rangeError}</p>}
        <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
          {report?.coverageStartedAt
            ? `Activity is counted from ${formatDate(report.coverageStartedAt)}. Earlier history is not included.`
            : 'No activity has been recorded yet.'}
        </p>
      </Card>

      <div>
        <button
          type="button"
          className="text-sm font-medium text-[var(--color-primary)] underline underline-offset-2"
          aria-expanded={caveatsOpen}
          aria-controls="dev-activity-caveats"
          onClick={() => setCaveatsOpen((v) => !v)}
        >
          How these counts work
        </button>
        {caveatsOpen && (
          <ul id="dev-activity-caveats" className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--color-text-secondary)]">
            <li>Merge commits are counted.</li>
            <li>Force-pushes can leave rewritten history in the counts.</li>
            <li>Partial push truncation is not detected.</li>
            <li>History starts when the repository was connected and is not backfilled.</li>
          </ul>
        )}
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading developer activity">
          <p className="sr-only">Loading developer activity…</p>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : error ? (
        <div className="space-y-3">
          <Alert variant="error" role="alert">{error}</Alert>
          <Button type="button" variant="secondary" onClick={() => void load(applied)}>Retry</Button>
        </div>
      ) : sortedDevelopers.length === 0 ? (
        <EmptyState title="No developer activity in this range." description="Try a different date range." />
      ) : (
        <>
          <div className="hidden md:block">
            <Card className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <caption className="sr-only">Developer activity summary</caption>
                <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
                  <tr>
                    {sortButton('displayName', 'Developer')}
                    <th scope="col" aria-sort={ariaSort('commits')} className="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">
                      <button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" onClick={() => toggleSort('commits')}>Commits</button>
                    </th>
                    <th scope="col" aria-sort={ariaSort('pullRequestsOpened')} className="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">
                      <button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" onClick={() => toggleSort('pullRequestsOpened')}>PRs opened</button>
                    </th>
                    <th scope="col" aria-sort={ariaSort('pullRequestsMerged')} className="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">
                      <button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" onClick={() => toggleSort('pullRequestsMerged')}>PRs merged</button>
                    </th>
                    <th scope="col" aria-sort={ariaSort('reviewsGiven')} className="px-3 py-2 text-right text-xs font-medium text-[var(--color-text-muted)]">
                      <button type="button" className="inline-flex items-center gap-1 underline-offset-2 hover:underline" onClick={() => toggleSort('reviewsGiven')}>Reviews given</button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {sortedDevelopers.map((dev) => (
                    <tr key={developerRowKey(dev)}>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{developerLabel(dev)}</span>
                          {dev.type === 'unmapped' && (
                            <span title="This GitHub account is not linked to a workspace member.">
                              <Badge variant="outline">Unmapped</Badge>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{dev.commits}</td>
                      <td className="px-3 py-2 text-right">{dev.pullRequestsOpened}</td>
                      <td className="px-3 py-2 text-right">{dev.pullRequestsMerged}</td>
                      <td className="px-3 py-2 text-right">{dev.reviewsGiven}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Sort by</span>
                <select
                  className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as DevSortKey)}
                >
                  <option value="commits">Commits</option>
                  <option value="pullRequestsOpened">PRs opened</option>
                  <option value="pullRequestsMerged">PRs merged</option>
                  <option value="reviewsGiven">Reviews given</option>
                  <option value="displayName">Developer</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button type="button" variant="secondary" onClick={() => setSortDir((d) => d === 'asc' ? 'desc' : 'asc')}>
                  {sortDir === 'asc' ? 'Ascending' : 'Descending'}
                </Button>
              </div>
            </div>

            {sortedDevelopers.map((dev) => (
              <Card key={developerRowKey(dev)} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{developerLabel(dev)}</p>
                  {dev.type === 'unmapped' && (
                    <span title="This GitHub account is not linked to a workspace member.">
                      <Badge variant="outline">Unmapped</Badge>
                    </span>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-[var(--color-text-muted)]">Commits</dt><dd className="font-medium">{dev.commits}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">PRs opened</dt><dd className="font-medium">{dev.pullRequestsOpened}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">PRs merged</dt><dd className="font-medium">{dev.pullRequestsMerged}</dd></div>
                  <div><dt className="text-[var(--color-text-muted)]">Reviews given</dt><dd className="font-medium">{dev.reviewsGiven}</dd></div>
                </dl>
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default function ProjectDevActivityPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  useWorkspaceRedirect();

  if (workspaceLoading || permissionsLoading) {
    return <div role="status" className="text-sm text-[var(--color-text-secondary)]">Loading dev activity…</div>;
  }

  if (!activeWorkspace) return <PageAccessState status={401} />;

  const canViewDevelopers = can('project.update');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dev activity</h1>
      <CommitsPanel workspaceId={activeWorkspace.id} projectId={projectId} />
      {canViewDevelopers ? <DeveloperReportPanel workspaceId={activeWorkspace.id} projectId={projectId} /> : null}
    </div>
  );
}
