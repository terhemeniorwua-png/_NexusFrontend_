'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
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
  canEditWeight = false,
  onUpdateWeight,
  canCreateSubtask = false,
  canDeleteSubtask = false,
  onCreate,
  onDelete,
}: {
  parentTaskId: string;
  subtasks: TaskSummary[];
  progress: TaskProgress;
  onComplete: (subtask: TaskSummary) => Promise<void> | void;
  busyId?: string | null;
  isAssigneeOf: (task: TaskSummary) => boolean;
  canEditWeight?: boolean;
  onUpdateWeight?: (subtaskId: string, weight: number) => Promise<void> | void;
  canCreateSubtask?: boolean;
  canDeleteSubtask?: boolean;
  onCreate?: (input: {
    title: string;
    parentTaskId: string;
    position: number;
    weight: number;
  }) => Promise<void> | void;
  onDelete?: (subtask: TaskSummary) => Promise<void> | void;
}) {
  const [localBusy, setLocalBusy] = useState<string | null>(null);
  const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
  const [draftWeight, setDraftWeight] = useState<string>('1');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWeight, setNewWeight] = useState('1');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function saveWeight(subtask: TaskSummary) {
    setWeightError(null);
    const parsed = Number(draftWeight);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setWeightError('Weight must be a positive integer.');
      return;
    }
    if (!onUpdateWeight) return;
    try {
      await onUpdateWeight(subtask.id, parsed);
      setEditingWeightId(null);
    } catch (e) {
      setWeightError(e instanceof Error ? e.message : 'Could not update weight.');
    }
  }

  async function createSubtask() {
    setCreateError(null);
    const title = newTitle.trim();
    const parsedWeight = Number(newWeight);
    if (title.length < 2 || title.length > 200) {
      setCreateError('Title must be between 2 and 200 characters.');
      return;
    }
    if (!Number.isInteger(parsedWeight) || parsedWeight < 1) {
      setCreateError('Weight must be a positive integer.');
      return;
    }
    if (!onCreate) return;

    setCreateBusy(true);
    try {
      await onCreate({
        title,
        parentTaskId,
        position: subtasks.length,
        weight: parsedWeight,
      });
      setNewTitle('');
      setNewWeight('1');
      setShowCreate(false);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not create subtask.');
    } finally {
      setCreateBusy(false);
    }
  }

  async function deleteSubtask() {
    if (!deleteTarget || !onDelete) return;
    setDeleteBusy(true); setDeleteError(null);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete subtask.');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section aria-labelledby="subtasks-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="subtasks-heading" className="mb-3 text-base font-semibold">Subtasks</h2>
        <TaskProgressTracker progress={progress} className="mb-4" />

        {canCreateSubtask && onCreate ? (
          <div className="mb-4 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
            {showCreate ? (
              <div className="space-y-3">
                <Input
                  id="subtask-title"
                  label="Title"
                  required
                  value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); setCreateError(null); }}
                  placeholder="Describe the subtask"
                  disabled={createBusy}
                />
                <Input
                  id="subtask-weight"
                  label="Weight"
                  type="number"
                  min={1}
                  step={1}
                  value={newWeight}
                  onChange={(e) => { setNewWeight(e.target.value); setCreateError(null); }}
                  disabled={createBusy}
                />
                {createError ? <p className="text-sm text-[var(--color-danger)]" role="alert">{createError}</p> : null}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void createSubtask()} loading={createBusy} disabled={createBusy}>
                    Create subtask
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setShowCreate(false); setCreateError(null); }}
                    disabled={createBusy}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setShowCreate(true); setCreateError(null); }}>
                Add subtask
              </Button>
            )}
          </div>
        ) : null}

        {deleteError ? <p className="mb-3 text-sm text-[var(--color-danger)]" role="alert">{deleteError}</p> : null}
        {weightError ? <p className="mb-3 text-sm text-[var(--color-danger)]" role="alert">{weightError}</p> : null}
        {subtasks.length === 0 ? (
          <EmptyState title="No subtasks" description="This task has no subtasks yet." />
        ) : (
          <ul className="space-y-2" role="list">
            {subtasks.map((sub) => {
              const done = sub.status === 'APPROVED';
              const canAttempt = isAssigneeOf(sub);
              const loading = busyId === sub.id || localBusy === sub.id;
              const weight = sub.weight ?? 1;
              const editing = editingWeightId === sub.id;
              return (
                <li key={sub.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`font-medium ${done ? 'text-[var(--color-text-secondary)] line-through' : ''}`}>{sub.title}</span>
                      <Badge>{sub.status}</Badge>
                      {sub.requiresApproval ? <Badge>Approval required</Badge> : null}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">{sub.key}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      {editing ? (
                        <>
                          <label htmlFor={`weight-${sub.id}`} className="text-[var(--color-text-secondary)]">Weight</label>
                          <input
                            id={`weight-${sub.id}`}
                            type="number"
                            min={1}
                            step={1}
                            value={draftWeight}
                            onChange={(e) => setDraftWeight(e.target.value)}
                            className="h-8 w-20 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                          />
                          <Button size="sm" variant="secondary" onClick={() => void saveWeight(sub)} disabled={loading}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingWeightId(null); setWeightError(null); }} disabled={loading}>Cancel</Button>
                        </>
                      ) : (
                        <>
                          <span className="text-[var(--color-text-secondary)]">Weight: <span className="font-medium text-[var(--color-text-primary)]">{weight}</span></span>
                          {canEditWeight && onUpdateWeight ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setEditingWeightId(sub.id); setDraftWeight(String(weight)); setWeightError(null); }}
                              disabled={loading}
                            >
                              Edit weight
                            </Button>
                          ) : null}
                        </>
                      )}
                    </div>
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
                    {canDeleteSubtask && onDelete ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setDeleteTarget(sub); setDeleteError(null); }}
                        disabled={loading || deleteBusy}
                        aria-label={`Delete ${sub.title}`}
                      >
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void deleteSubtask()}
        title={`Delete ${deleteTarget?.title ?? 'subtask'}?`}
        description="The subtask will be removed from this list. Its deletion is recorded by the backend."
        confirmLabel="Delete subtask"
        destructive
        loading={deleteBusy}
      />
    </section>
  );
}
