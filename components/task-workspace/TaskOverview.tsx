'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import type { TaskSummary, TaskProgress, TaskReportedBlocker } from '@/services/tasks';
import { TaskProgressTracker } from './TaskProgressTracker';

function nextAction(task: TaskSummary): string {
  switch (task.status) {
    case 'ASSIGNED':
      return 'Review the requirements and start working when ready.';
    case 'AWAITING_CLARIFICATION':
      return 'A clarification request is open. Wait for an answer before continuing.';
    case 'IN_PROGRESS':
      return task.requiresApproval ? 'Complete your work and submit it for review.' : 'Complete subtasks and mark work done when ready.';
    case 'SUBMITTED':
      return 'Your work is submitted. Wait for review feedback.';
    case 'UNDER_REVIEW':
      return 'A reviewer is checking your submission.';
    case 'CHANGES_REQUESTED':
      return 'Address the reviewer feedback and resubmit your work.';
    case 'APPROVED':
      return 'This task is approved. No further action needed.';
    default:
      return 'Review the task details.';
  }
}

export function TaskOverview({
  task,
  progress,
  projectName,
  reportedBlockers,
  canReportBlocker,
  canResolveBlocker,
  showReportForm,
  onOpenReport,
  onCancelReport,
  onReport,
  onResolve,
  busyBlockerId,
  blockerError,
}: {
  task: TaskSummary;
  progress: TaskProgress;
  projectName?: string;
  reportedBlockers?: TaskReportedBlocker[];
  canReportBlocker?: boolean;
  canResolveBlocker?: (blocker: TaskReportedBlocker) => boolean;
  showReportForm?: boolean;
  onOpenReport?: () => void;
  onCancelReport?: () => void;
  onReport?: (description: string) => Promise<void> | void;
  onResolve?: (blockerId: string) => Promise<void> | void;
  busyBlockerId?: string | null;
  blockerError?: string | null;
}) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reviewerName = task.reviewedBy?.name ?? null;
  const assignedBy = task.assignees.length === 1 ? task.assignees[0]?.assignedBy : null;
  const blockers = reportedBlockers ?? task.reportedBlockers ?? [];
  const openBlockers = blockers.filter((b) => b.status === 'OPEN');

  async function submitReport() {
    const value = description.trim();
    if (!value || !onReport) return;
    setSubmitting(true);
    try {
      await onReport(value);
      setDescription('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="overview-heading" className="space-y-4">
      {openBlockers.length > 0 ? (
        <Alert variant="warning" title="Blocked">
          This task has {openBlockers.length} open blocker{openBlockers.length === 1 ? '' : 's'} that may need attention.
        </Alert>
      ) : null}

      <Card className="p-4 sm:p-5">
        <h2 id="overview-heading" className="mb-3 text-base font-semibold">Overview</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--color-text-secondary)]">Title</dt><dd className="font-medium">{task.title}</dd></div>
          <div><dt className="text-[var(--color-text-secondary)]">Project</dt><dd>{projectName ?? task.projectId}</dd></div>
          <div><dt className="text-[var(--color-text-secondary)]">Priority</dt><dd><Badge>{task.priority}</Badge></dd></div>
          <div><dt className="text-[var(--color-text-secondary)]">Deadline</dt><dd>{task.dueDate ? new Date(task.dueDate).toLocaleString() : '—'}</dd></div>
          <div><dt className="text-[var(--color-text-secondary)]">Assigned by</dt><dd>{assignedBy ?? '—'}</dd></div>
          <div><dt className="text-[var(--color-text-secondary)]">Reviewer</dt><dd>{reviewerName ?? '—'}</dd></div>
        </dl>
        <div className="mt-4">
          <p className="mb-1 text-sm text-[var(--color-text-secondary)]">Description</p>
          <p className="whitespace-pre-wrap text-sm">{task.description || 'No description provided.'}</p>
        </div>
        <div className="mt-4">
          <TaskProgressTracker progress={progress} />
        </div>
      </Card>

      {task.expectedDeliverables && task.expectedDeliverables.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <h3 className="mb-2 text-sm font-semibold">Expected deliverables</h3>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {task.expectedDeliverables.map((d, i) => (
              <li key={d.id ?? `${d.label}-${i}`}>
                {d.label} {d.required === false ? <span className="text-[var(--color-text-secondary)]">(optional)</span> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-4 sm:p-5">
        <h3 className="mb-1 text-sm font-semibold">Your next action</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{nextAction(task)}</p>
      </Card>

      <div id="blockers">
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Blockers</h3>
          {canReportBlocker && onOpenReport ? (
            <Button size="sm" variant="secondary" onClick={onOpenReport}>Report a blocker</Button>
          ) : null}
        </div>
        {blockerError ? <Alert variant="error" className="mb-3">{blockerError}</Alert> : null}

        {showReportForm && canReportBlocker ? (
          <div className="mb-4 rounded border border-[var(--color-border)] p-3">
            <label htmlFor="blocker-desc" className="mb-1 block text-sm font-medium">Describe the blocker</label>
            <textarea
              id="blocker-desc"
              className="w-full rounded border border-[var(--color-border)] bg-transparent p-2 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is blocking progress?"
            />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => void submitReport()} disabled={submitting || !description.trim()}>Submit blocker</Button>
              <Button size="sm" variant="secondary" onClick={onCancelReport} disabled={submitting}>Cancel</Button>
            </div>
          </div>
        ) : null}

        {blockers.length === 0 ? (
          <p className="text-sm text-[var(--color-text-secondary)]">No reported blockers.</p>
        ) : (
          <ul className="space-y-3" role="list">
            {blockers.map((b) => {
              const resolvable = b.status === 'OPEN' && (canResolveBlocker ? canResolveBlocker(b) : false);
              return (
                <li key={b.id} className="rounded border border-[var(--color-border)] p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={b.status === 'OPEN' ? 'error' : 'success'}>{b.status === 'OPEN' ? 'Open' : 'Resolved'}</Badge>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      Reported by {b.reportedBy?.name ?? 'Unknown'} · {new Date(b.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{b.description}</p>
                  {b.status === 'RESOLVED' && b.resolvedBy ? (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Resolved by {b.resolvedBy.name}{b.resolvedAt ? ` · ${new Date(b.resolvedAt).toLocaleString()}` : ''}</p>
                  ) : null}
                  {resolvable && onResolve ? (
                    <div className="mt-2">
                      <Button size="sm" variant="secondary" onClick={() => void onResolve(b.id)} disabled={busyBlockerId === b.id}>
                        {busyBlockerId === b.id ? 'Resolving…' : 'Resolve blocker'}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      </div>
    </section>
  );
}
