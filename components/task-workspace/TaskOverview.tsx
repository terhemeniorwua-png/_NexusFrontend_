'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { TaskSummary, TaskProgress } from '@/services/tasks';
import { TaskProgressTracker } from './TaskProgressTracker';

function nextAction(task: TaskSummary): string {
  switch (task.status) {
    case 'ASSIGNED':
      return 'Review the requirements and start working when ready.';
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
}: {
  task: TaskSummary;
  progress: TaskProgress;
  projectName?: string;
}) {
  const reviewerName = task.reviewedBy?.name ?? null;
  const assignedBy = task.assignees.length === 1 ? task.assignees[0]?.assignedBy : null;

  return (
    <section aria-labelledby="overview-heading" className="space-y-4">
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
    </section>
  );
}
