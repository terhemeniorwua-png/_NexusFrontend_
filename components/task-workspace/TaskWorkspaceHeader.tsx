'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { TaskStatus } from '@/services/tasks';

const STATUS_LABEL: Record<TaskStatus, string> = {
  ASSIGNED: 'Assigned',
  AWAITING_CLARIFICATION: 'Awaiting clarification',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
};

export type SaveSyncState = 'idle' | 'saving' | 'saved' | 'failed' | 'conflict';

export function TaskWorkspaceHeader({
  workspaceName,
  projectId,
  projectName,
  taskTitle,
  status,
  saveState,
  blocked,
}: {
  workspaceName?: string;
  projectId: string;
  projectName?: string;
  taskTitle: string;
  status: TaskStatus;
  saveState: SaveSyncState;
  blocked?: boolean;
}) {
  const syncText =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'conflict'
          ? 'Conflict'
          : saveState === 'failed'
            ? 'Failed'
            : null;

  return (
    <header className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-[var(--color-text-secondary)]">
          <ol className="flex flex-wrap items-center gap-1">
            {workspaceName ? <li>{workspaceName}</li> : null}
            {workspaceName ? <li aria-hidden="true">/</li> : null}
            <li>
              <Link href={`/app/projects/${encodeURIComponent(projectId)}`} className="hover:underline">
                {projectName || 'Project'}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate font-medium text-[var(--color-text-primary)]">{taskTitle}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-lg font-semibold text-[var(--color-text-primary)] sm:text-xl">{taskTitle}</h1>
          <Badge>{STATUS_LABEL[status] ?? status}</Badge>
          {blocked ? <Badge variant="error">Blocked</Badge> : null}
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm" aria-live="polite">
        {syncText ? (
          <span
            className={
              saveState === 'failed' || saveState === 'conflict'
                ? 'text-[var(--color-danger)]'
                : saveState === 'saving'
                  ? 'text-[var(--color-text-secondary)]'
                  : 'text-[var(--color-success,#16a34a)]'
            }
          >
            {syncText}
          </span>
        ) : null}
      </div>
    </header>
  );
}
