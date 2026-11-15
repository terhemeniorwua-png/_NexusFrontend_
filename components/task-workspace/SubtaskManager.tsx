'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { PermissionButton } from '@/components/shared/PermissionButton';
import type { TaskProgress, TaskSummary } from '@/services/tasks';
import { TaskProgressTracker } from './TaskProgressTracker';

export function SubtaskManager({
  parentTaskId,
  subtasks,
  progress,
  onComplete,
  busyId,
  isAssigneeOf,
}: {
  parentTaskId: string;
  subtasks: TaskSummary[];
  progress: TaskProgress;
  onComplete: (subtask: TaskSummary) => Promise<void> | void;
  busyId?: string | null;
  isAssigneeOf: (task: TaskSummary) => boolean;
}) {
  const [localBusy, setLocalBusy] = useState<string | null>(null);

  return (
    <section aria-labelledby="subtasks-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="subtasks-heading" className="mb-3 text-base font-semibold">Subtasks</h2>
        <TaskProgressTracker progress={progress} className="mb-4" />
        {subtasks.length === 0 ? (
          <EmptyState title="No subtasks" description="This task has no subtasks yet." />
        ) : (
          <ul className="space-y-2" role="list">
            {subtasks.map((sub) => {
              const done = sub.status === 'APPROVED';
              const canAttempt = isAssigneeOf(sub); // UI hint; backend enforces assignee/authorized collaborator
              const loading = busyId === sub.id || localBusy === sub.id;
              return (
                <li key={sub.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${done ? 'text-[var(--color-text-secondary)] line-through' : ''}`}>{sub.title}</span>
                      <Badge>{sub.status}</Badge>
                      {sub.requiresApproval ? <Badge>Approval required</Badge> : null}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{sub.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!done && sub.status !== 'SUBMITTED' && sub.status !== 'UNDER_REVIEW' ? (
                      <PermissionButton
                        permission="task.complete"
                        size="sm"
                        loading={loading}
                        onClick={async () => {
                          setLocalBusy(sub.id);
                          try { await onComplete(sub); } finally { setLocalBusy(null); }
                        }}
                        deniedReason="Your project role does not allow completing subtasks."
                        title={!canAttempt ? 'Only the assignee or an authorized collaborator can complete this subtask (backend enforced).' : undefined}
                      >
                        Mark complete
                      </PermissionButton>
                    ) : (
                      <span className="text-xs text-[var(--color-text-secondary)]">{done ? 'Done' : 'Pending review'}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
