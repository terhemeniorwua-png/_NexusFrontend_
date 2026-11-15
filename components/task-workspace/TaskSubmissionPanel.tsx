'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { PermissionButton } from '@/components/shared/PermissionButton';
import type { TaskSummary } from '@/services/tasks';

export function TaskSubmissionPanel({
  task,
  onSubmit,
  busy,
  error,
}: {
  task: TaskSummary;
  onSubmit: (workSummary: string) => Promise<void> | void;
  busy: boolean;
  error: string | null;
}) {
  const [summary, setSummary] = useState(task.submissionSummary ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const canSubmitStatus = ['ASSIGNED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'SUBMITTED'].includes(task.status);
  const changesRequested = task.status === 'CHANGES_REQUESTED';
  const submitted = task.status === 'SUBMITTED' || task.status === 'UNDER_REVIEW' || task.status === 'APPROVED';

  return (
    <section aria-labelledby="submission-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="submission-heading" className="mb-3 text-base font-semibold">Submission</h2>
        {error || localError ? <Alert variant="error" title="Submission error">{localError ?? error}</Alert> : null}
        {task.reviewFeedback ? (
          <Alert variant={changesRequested ? 'warning' : 'info'} title="Reviewer feedback" className="mb-3">
            <p className="whitespace-pre-wrap text-sm">{task.reviewFeedback}</p>
          </Alert>
        ) : null}
        {task.requiresApproval ? (
          <p className="mb-3 text-sm text-[var(--color-text-secondary)]">
            This task requires approval. It cannot be marked complete from the frontend.
          </p>
        ) : null}
        <div className="space-y-2">
          <Textarea
            id="work-summary"
            label="Work summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            placeholder="Describe what you completed, links, or notes for the reviewer…"
          />
          <div className="flex flex-wrap gap-2">
            {canSubmitStatus ? (
              summary.trim() ? (
                <PermissionButton
                  permission="submission.submit"
                  loading={busy}
                  onClick={async () => {
                    setLocalError(null);
                    try { await onSubmit(summary.trim()); } catch (e) { setLocalError(e instanceof Error ? e.message : 'Could not submit.'); }
                  }}
                >
                  {changesRequested ? 'Resubmit' : 'Submit for Review'}
                </PermissionButton>
              ) : (
                <Button disabled>{changesRequested ? 'Resubmit' : 'Submit for Review'}</Button>
              )
            ) : null}
          </div>
          {submitted && !changesRequested ? (
            <p className="text-xs text-[var(--color-text-secondary)]">Submission recorded. Review is handled by authorized reviewers on the backend.</p>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
