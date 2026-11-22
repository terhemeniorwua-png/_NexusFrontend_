'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { TaskProgressUpdate } from '@/services/tasks';

const NOTE_MAX_LENGTH = 2000;

function createClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `progress-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatPercent(percent: number | null): string {
  return percent === null ? '' : `${percent}%`;
}

export interface TaskProgressUpdateDraft {
  note: string;
  percent?: number | null;
  clientRequestId: string;
}

export function TaskProgressUpdates({
  updates,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  canPost,
  onSubmit,
  submitBusy,
  submitError,
  resolveAuthorName,
}: {
  updates: TaskProgressUpdate[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  canPost: boolean;
  onSubmit: (draft: TaskProgressUpdateDraft) => Promise<void> | void;
  submitBusy: boolean;
  submitError: string | null;
  resolveAuthorName: (authorId: string) => string;
}) {
  const [note, setNote] = useState('');
  const [percent, setPercent] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const submitInFlightRef = useRef(false);

  async function handleSubmit() {
    if (submitInFlightRef.current || submitBusy) return;

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setLocalError('A progress note is required.');
      return;
    }
    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      setLocalError(`Progress note must be ${NOTE_MAX_LENGTH} characters or fewer.`);
      return;
    }

    let parsedPercent: number | null | undefined;
    if (percent.trim() !== '') {
      const value = Number(percent);
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        setLocalError('Percent must be a whole number from 0 to 100.');
        return;
      }
      parsedPercent = value;
    }

    setLocalError(null);
    submitInFlightRef.current = true;
    try {
      await onSubmit({
        note: trimmedNote,
        percent: parsedPercent,
        clientRequestId: createClientRequestId(),
      });
      setNote('');
      setPercent('');
    } finally {
      submitInFlightRef.current = false;
    }
  }

  return (
    <section aria-labelledby="progress-updates-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="progress-updates-heading" className="mb-3 text-base font-semibold">Progress updates</h2>

        {canPost ? (
          <div className="mb-6 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-4">
            <div className="space-y-1">
              <Textarea
                id="progress-update-note"
                label="Update note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                maxLength={NOTE_MAX_LENGTH}
                placeholder="Share what changed, what’s blocked, or what’s next…"
                disabled={submitBusy}
              />
              <div className="flex justify-end text-xs text-[var(--color-text-secondary)]" aria-live="polite">
                {note.length}/{NOTE_MAX_LENGTH}
              </div>
            </div>

            <Input
              id="progress-update-percent"
              label="Self-reported percent (optional)"
              type="number"
              min={0}
              max={100}
              step={1}
              inputMode="numeric"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="0-100"
              disabled={submitBusy}
              helperText="Self-reported by the assignee. This does not change the computed task progress bar."
            />

            {localError || submitError ? (
              <Alert variant="error" title="Could not post progress update">
                {localError ?? submitError}
              </Alert>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                loading={submitBusy}
                disabled={submitBusy}
              >
                Post update
              </Button>
            </div>
          </div>
        ) : (
          <p className="mb-4 text-sm text-[var(--color-text-secondary)]">
            Progress updates are read-only here. Only a live assignee can post updates while the task is in progress or changes requested.
          </p>
        )}

        {error ? <Alert variant="error" title="Progress updates error">{error}</Alert> : null}
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading progress updates…</p> : null}

        {!loading && updates.length === 0 ? (
          <EmptyState title="No progress updates yet" description="Assignee progress updates will appear here." />
        ) : null}

        {!loading && updates.length > 0 ? (
          <ul className="space-y-3" role="list">
            {updates.map((update) => (
              <li key={update.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{resolveAuthorName(update.authorId)}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{new Date(update.createdAt).toLocaleString()}</p>
                  </div>
                  {update.percent !== null ? (
                    <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
                      Self-reported: {formatPercent(update.percent)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-primary)]">{update.note}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {hasMore ? (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore} disabled={loadingMore}>
              Load more
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
