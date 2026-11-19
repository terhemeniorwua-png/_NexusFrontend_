'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  getRepositoryPullRequest,
  listPullRequestCommits,
  listPullRequestFiles,
  type DevChangedFile,
  type DevCommitSummary,
  type DevPullRequestDetail,
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

function lineClass(line: string): string {
  if (line.startsWith('+')) return 'bg-green-500/10 text-green-400';
  if (line.startsWith('-')) return 'bg-red-500/10 text-red-400';
  if (line.startsWith('@@')) return 'bg-blue-500/10 text-blue-300';
  return 'text-[var(--color-text-secondary)]';
}

function DiffView({ file }: { file: DevChangedFile }) {
  if (!file.patch) {
    return <p className="p-3 text-xs text-[var(--color-text-muted)]">No text diff available (binary or very large file).</p>;
  }
  return (
    <div className="overflow-x-auto">
      <pre className="min-w-full text-xs leading-5">
        {file.patch.split('\n').map((line, i) => (
          <div key={i} className={`px-3 font-mono whitespace-pre ${lineClass(line)}`}>{line || ' '}</div>
        ))}
      </pre>
      {file.patchTruncated && (
        <p className="p-3 text-xs text-[var(--color-text-muted)]">This diff was shortened. View the full file on GitHub.</p>
      )}
    </div>
  );
}

export default function PullRequestDetailPage() {
  const { projectId, repositoryId, number } = useParams<{ projectId: string; repositoryId: string; number: string }>();
  const prNumber = Number(number);
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;

  const [pr, setPr] = useState<DevPullRequestDetail | null>(null);
  const [files, setFiles] = useState<DevChangedFile[]>([]);
  const [commits, setCommits] = useState<DevCommitSummary[]>([]);
  const [filesPage, setFilesPage] = useState(1);
  const [moreFiles, setMoreFiles] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'files' | 'commits'>('files');

  useEffect(() => {
    if (!workspaceId || !Number.isFinite(prNumber)) return;
    let active = true;
    (async () => {
      try {
        const [detail, f, c] = await Promise.all([
          getRepositoryPullRequest(workspaceId, projectId, repositoryId, prNumber),
          listPullRequestFiles(workspaceId, projectId, repositoryId, prNumber, 1),
          listPullRequestCommits(workspaceId, projectId, repositoryId, prNumber, 1),
        ]);
        if (!active) return;
        setPr(detail);
        setFiles(f.items);
        setMoreFiles(f.items.length >= 30);
        setCommits(c.items);
      } catch (cause) {
        if (active) setError(errMsg(cause, 'This pull request could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, projectId, repositoryId, prNumber]);

  async function loadMoreFiles() {
    if (!workspaceId) return;
    const next = filesPage + 1;
    try {
      const f = await listPullRequestFiles(workspaceId, projectId, repositoryId, prNumber, next);
      setFiles((current) => [...current, ...f.items]);
      setFilesPage(next);
      setMoreFiles(f.items.length >= 30);
    } catch (cause) {
      setError(errMsg(cause, 'More files could not be loaded.'));
    }
  }

  if (workspaceLoading || loading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (error || !pr) {
    return (
      <div className="space-y-3">
        <Link href={`/app/projects/${projectId}/code`} className="text-sm text-[var(--color-primary)] underline">← Back to code</Link>
        <Alert variant="error" title="Could not load">{error ?? 'Pull request not found.'}</Alert>
      </div>
    );
  }

  const checks = pr.checks;

  return (
    <div className="space-y-5">
      <Link href={`/app/projects/${projectId}/code`} className="text-sm text-[var(--color-primary)] underline">← Back to code</Link>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-semibold">#{pr.number} {pr.title}</h2>
          <Badge variant={stateVariant(pr.state)}>{pr.state}</Badge>
          {checks && checks.total > 0 && (
            <Badge variant={checks.failed > 0 ? 'error' : checks.pending > 0 ? 'warning' : 'success'}>
              Checks: {checks.passed}/{checks.total} passed
            </Badge>
          )}
        </div>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {pr.authorLogin ?? 'unknown'} wants to merge <code>{pr.headRef}</code> into <code>{pr.baseRef}</code> ·{' '}
          {pr.changedFiles} files · <span className="text-green-400">+{pr.additions}</span>{' '}
          <span className="text-red-400">−{pr.deletions}</span>
          {pr.url && <> · <a href={pr.url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">Open on GitHub</a></>}
        </p>
        {pr.body && (
          <pre className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">{pr.body}</pre>
        )}
      </div>

      <div className="flex gap-1" role="tablist" aria-label="Pull request sections">
        {(['files', 'commits'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={['h-9 rounded-[var(--radius-md)] px-3 text-sm font-medium',
              tab === t ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'].join(' ')}
          >
            {t === 'files' ? `Files changed (${pr.changedFiles})` : `Commits (${pr.commits})`}
          </button>
        ))}
      </div>

      {tab === 'files' ? (
        <div className="space-y-4">
          {files.map((f) => (
            <details key={f.filename} open className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <summary className="cursor-pointer p-3 text-sm font-medium">
                <span className="font-mono">{f.filename}</span>{' '}
                <span className="text-xs text-[var(--color-text-muted)]">
                  {f.status} · <span className="text-green-400">+{f.additions}</span> <span className="text-red-400">−{f.deletions}</span>
                </span>
              </summary>
              <DiffView file={f} />
            </details>
          ))}
          {moreFiles && (
            <button type="button" onClick={() => void loadMoreFiles()} className="text-sm text-[var(--color-primary)] underline">
              Load more files
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {commits.map((c) => (
            <li key={c.sha} className="flex items-center justify-between gap-3 p-4">
              <span className="min-w-0">
                <span className="block truncate font-medium">{c.message.split('\n')[0]}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">{c.authorLogin ?? c.authorName ?? 'unknown'}</span>
              </span>
              <span className="shrink-0 font-mono text-xs">{c.sha.slice(0, 7)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
