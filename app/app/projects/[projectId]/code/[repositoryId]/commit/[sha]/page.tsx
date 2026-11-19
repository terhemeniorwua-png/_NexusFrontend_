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
  getRepositoryCommit,
  type DevChangedFile,
  type DevCommitDetail,
} from '@/services/dev-integrations';

function errMsg(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError ? cause.message : fallback;
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
        <p className="p-3 text-xs text-[var(--color-text-muted)]">This diff was shortened. Use “Open on GitHub” for the full file.</p>
      )}
    </div>
  );
}

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'outline' {
  if (status === 'added') return 'success';
  if (status === 'removed') return 'error';
  if (status === 'modified') return 'warning';
  return 'outline';
}

export default function CommitDetailPage() {
  const { projectId, repositoryId, sha } = useParams<{ projectId: string; repositoryId: string; sha: string }>();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;

  const [commit, setCommit] = useState<DevCommitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    (async () => {
      try {
        const c = await getRepositoryCommit(workspaceId, projectId, repositoryId, sha);
        if (active) setCommit(c);
      } catch (cause) {
        if (active) setError(errMsg(cause, 'This commit could not be loaded.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [workspaceId, projectId, repositoryId, sha]);

  const backHref = `/app/projects/${projectId}/code`;

  if (workspaceLoading || loading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>;
  }

  if (error || !commit) {
    return (
      <div className="space-y-3">
        <Link href={backHref} className="text-sm text-[var(--color-primary)] underline">← Back to code</Link>
        <Alert variant="error" title="Could not load">{error ?? 'Commit not found.'}</Alert>
      </div>
    );
  }

  const [title, ...rest] = commit.message.split('\n');
  const description = rest.join('\n').trim();

  return (
    <div className="space-y-5">
      <Link href={backHref} className="text-sm text-[var(--color-primary)] underline">← Back to code</Link>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {commit.authorLogin ?? commit.authorName ?? 'unknown'}
          {commit.date && <> · {new Date(commit.date).toLocaleString()}</>}
          {' '}· <code>{commit.sha.slice(0, 7)}</code>
          {commit.parents.length > 0 && <> · parent <code>{commit.parents[0].slice(0, 7)}</code></>}
        </p>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {commit.files.length} files · <span className="text-green-400">+{commit.additions}</span>{' '}
          <span className="text-red-400">−{commit.deletions}</span>
          {commit.url && <> · <a href={commit.url} target="_blank" rel="noreferrer" className="text-[var(--color-primary)] underline">Open on GitHub</a></>}
        </p>
        {description && (
          <pre className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 text-sm">{description}</pre>
        )}
      </div>

      <div className="space-y-4">
        {commit.files.map((f) => (
          <details key={f.filename} open={f.changes <= 300} className="rounded-[var(--radius-md)] border border-[var(--color-border)]">
            <summary className="cursor-pointer p-3 text-sm font-medium">
              <span className="font-mono">{f.filename}</span>{' '}
              <Badge variant={statusVariant(f.status)}>{f.status}</Badge>{' '}
              <span className="text-xs">
                <span className="text-green-400">+{f.additions}</span> <span className="text-red-400">−{f.deletions}</span>
              </span>
            </summary>
            <DiffView file={f} />
          </details>
        ))}
        {commit.files.length >= 300 && (
          <p className="text-xs text-[var(--color-text-muted)]">Only the first 300 files are shown. Use “Open on GitHub” to see the rest.</p>
        )}
      </div>
    </div>
  );
}
