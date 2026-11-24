'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { Can } from '@/components/shared/Can';
import { ApiRequestError } from '@/lib/api';
import { sprintErrorMessage } from '@/services/sprint-errors';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  listSprints,
  createSprint,
  updateSprint,
  startSprint,
  completeSprint,
  restoreSprint,
  type Sprint,
  type SprintStatus,
  type CompleteSprintInput,
} from '@/services/sprints';

function statusLabel(s: SprintStatus): string {
  if (s === 'PLANNED') return 'Planned';
  if (s === 'ACTIVE') return 'Active';
  if (s === 'COMPLETED') return 'Completed';
  return 'Archived';
}

function statusVariant(s: SprintStatus): 'default' | 'success' | 'warning' | 'error' | 'outline' {
  if (s === 'ACTIVE') return 'success';
  if (s === 'PLANNED') return 'default';
  return 'outline';
}

const STATUS_ORDER: Record<SprintStatus, number> = {
  PLANNED: 0,
  ACTIVE: 1,
  COMPLETED: 2,
  ARCHIVED: 3,
};

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

export default function SprintsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();
  useWorkspaceRedirect();

  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create sprint
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createGoal, setCreateGoal] = useState('');
  const [createStartDate, setCreateStartDate] = useState<string>('');
  const [createEndDate, setCreateEndDate] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit sprint
  const [editOpen, setEditOpen] = useState(false);
  const [editSprintId, setEditSprintId] = useState<string>('');
  const [editName, setEditName] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);

  // Complete sprint
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSprintId, setCompleteSprintId] = useState<string>('');
  const [completeTarget, setCompleteTarget] = useState<'BACKLOG' | 'NEXT_SPRINT'>('BACKLOG');
  const [completeNextSprintId, setCompleteNextSprintId] = useState<string>('');
  const [completeError, setCompleteError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    setActionError(null);
    setLoadMoreError(null);
    setAccessStatus(null);
    try {
      const data = await listSprints(activeWorkspace.id, projectId);
      setSprints(data.items);
      setNextCursor(data.nextCursor);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setAccessStatus(401);
      } else {
        setError(sprintErrorMessage(cause, 'Sprints could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, projectId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!activeWorkspace || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const data = await listSprints(activeWorkspace.id, projectId, { cursor: nextCursor });
      setSprints((prev) => {
        const byId = new Map(prev.map((sprint) => [sprint.id, sprint]));
        data.items.forEach((sprint) => byId.set(sprint.id, sprint));
        return Array.from(byId.values());
      });
      setNextCursor(data.nextCursor);
    } catch (cause) {
      setLoadMoreError(sprintErrorMessage(cause, 'More sprints could not be loaded.'));
    } finally {
      setLoadingMore(false);
    }
  }, [activeWorkspace, projectId, nextCursor, loadingMore]);

  async function handleCreate() {
    if (!activeWorkspace) return;
    if (!createName.trim()) return;
    setBusy(true);
    setCreateError(null);
    try {
      const created = await createSprint(activeWorkspace.id, projectId, {
        name: createName.trim(),
        goal: createGoal.trim() || undefined,
        startDate: createStartDate || null,
        endDate: createEndDate || null,
      });
      setSprints((prev) => [created, ...prev.filter((sprint) => sprint.id !== created.id)]);
      setCreateOpen(false);
      setCreateName('');
      setCreateGoal('');
      setCreateStartDate('');
      setCreateEndDate('');
      setNotice('Sprint created.');
    } catch (cause) {
      setCreateError(sprintErrorMessage(cause, 'Sprint could not be created.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate() {
    if (!activeWorkspace || !editSprintId) return;
    setBusy(true);
    setEditError(null);
    try {
      const updated = await updateSprint(activeWorkspace.id, projectId, editSprintId, {
        name: editName.trim() || undefined,
        goal: editGoal.trim() || undefined,
        startDate: editStartDate || null,
        endDate: editEndDate || null,
      });
      setSprints((prev) => prev.map((s) => (s.id === editSprintId ? updated : s)));
      setEditOpen(false);
      setNotice('Sprint updated.');
    } catch (cause) {
      setEditError(sprintErrorMessage(cause, 'Sprint could not be updated.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleStart(sprintId: string) {
    if (!activeWorkspace) return;
    setBusy(true);
    setActionError(null);
    try {
      await startSprint(activeWorkspace.id, projectId, sprintId);
      await load();
      setNotice('Sprint started.');
    } catch (cause) {
      setActionError(sprintErrorMessage(cause, 'Sprint could not be started.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(sprintId: string) {
    if (!activeWorkspace) return;
    setCompleteSprintId(sprintId);
    setCompleteTarget('BACKLOG');
    setCompleteNextSprintId('');
    setCompleteError(null);
    setCompleteOpen(true);
  }

  async function handleConfirmComplete() {
    if (!activeWorkspace || !completeSprintId) return;
    setBusy(true);
    setCompleteError(null);
    try {
      const input: CompleteSprintInput = { target: completeTarget };
      if (completeTarget === 'NEXT_SPRINT') {
        if (!completeNextSprintId) {
          setCompleteError('Please select a target sprint.');
          return;
        }
        input.nextSprintId = completeNextSprintId;
      }
      await completeSprint(activeWorkspace.id, projectId, completeSprintId, input);
      setCompleteOpen(false);
      await load();
      setNotice('Sprint completed.');
    } catch (cause) {
      setCompleteError(sprintErrorMessage(cause, 'Sprint could not be completed.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(sprintId: string) {
    if (!activeWorkspace) return;
    setBusy(true);
    setActionError(null);
    try {
      await restoreSprint(activeWorkspace.id, projectId, sprintId);
      await load();
      setNotice('Sprint restored.');
    } catch (cause) {
      setActionError(sprintErrorMessage(cause, 'Sprint could not be restored.'));
    } finally {
      setBusy(false);
    }
  }

  const sortedSprints = [...sprints].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  const currentSprints = sortedSprints.filter((s) => s.status === 'PLANNED' || s.status === 'ACTIVE');
  const historySprints = sortedSprints.filter((s) => s.status === 'COMPLETED' || s.status === 'ARCHIVED');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');

  const sprintCard = (sprint: Sprint) => (
    <Card key={sprint.id} className="p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h2 className="text-lg font-semibold">{sprint.name}</h2>
        <Badge variant={statusVariant(sprint.status)}>
          {statusLabel(sprint.status)}
        </Badge>
      </div>
      {sprint.goal && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{sprint.goal}</p>}
      <div className="mt-2 space-y-1 text-sm text-[var(--color-text-muted)]">
        <p>
          <span className="font-medium">Start:</span> {dateLabel(sprint.startDate)}
        </p>
        <p>
          <span className="font-medium">End:</span> {dateLabel(sprint.endDate)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/app/projects/${encodeURIComponent(projectId)}/sprints/${encodeURIComponent(sprint.id)}`)}
        >
          Open board
        </Button>
        {can('project.update') && sprint.status === 'PLANNED' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditSprintId(sprint.id);
                setEditName(sprint.name);
                setEditGoal(sprint.goal ?? '');
                setEditStartDate(sprint.startDate ? new Date(sprint.startDate).toISOString().slice(0, 16) : '');
                setEditEndDate(sprint.endDate ? new Date(sprint.endDate).toISOString().slice(0, 16) : '');
                setEditOpen(true);
              }}
              disabled={busy}
            >
              Edit
            </Button>
            <Button
              onClick={() => void handleStart(sprint.id)}
              disabled={busy}
            >
              Start sprint
            </Button>
          </>
        )}
        {can('project.update') && sprint.status === 'ACTIVE' && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleComplete(sprint.id)}
            disabled={busy}
          >
            Complete sprint
          </Button>
        )}
        {can('project.update') && sprint.status === 'ARCHIVED' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void handleRestore(sprint.id)}
            disabled={busy}
          >
            Restore
          </Button>
        )}
      </div>
    </Card>
  );

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading sprints">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!can('project.view')) {
    return (
      <PageAccessState
        title="Sprints not available"
        description="This project may have been deleted, or it is private and you are not a member."
        backHref={`/app/projects/${encodeURIComponent(projectId)}`}
        backLabel="Back to project"
      />
    );
  }
  if (error && !sprints.length) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sprints</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Plan and track work in time-boxed sprints.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Can permission="project.update">
            <Button onClick={() => setCreateOpen(true)} disabled={busy}>
              Create sprint
            </Button>
          </Can>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {actionError && <Alert variant="error">{actionError}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {sprints.length === 0 ? (
        can('project.update') ? (
          <EmptyState
            title="No sprints yet"
            description="Create your first sprint to start planning work."
            action={
              <Button onClick={() => setCreateOpen(true)} disabled={busy}>
                Create sprint
              </Button>
            }
          />
        ) : (
          <EmptyState title="No sprints yet. A project manager can create one." />
        )
      ) : (
        <>
          {currentSprints.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentSprints.map(sprintCard)}
            </div>
          )}
          {historySprints.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-[var(--color-text-secondary)]">
                History
              </summary>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                {historySprints.map(sprintCard)}
              </div>
            </details>
          )}
          {nextCursor && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => void loadMore()} disabled={loadingMore || busy}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
              {loadMoreError && (
                <span role="alert" className="text-sm text-[var(--color-error)]">
                  {loadMoreError}
                </span>
              )}
            </div>
          )}
        </>
      )}

      {/* Create sprint modal */}
      {createOpen && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create sprint" maxWidth="md">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Name your sprint and optionally set a goal and dates.
          </p>
          {createError && <Alert variant="error">{createError}</Alert>}
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
            <Input
              id="create-sprint-name"
              label="Sprint name"
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
            <Input
              id="create-sprint-goal"
              label="Goal (optional)"
              value={createGoal}
              onChange={(event) => setCreateGoal(event.target.value)}
              maxLength={10000}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="create-sprint-start" className="block text-sm font-medium mb-1">
                  Start date
                </label>
                <input
                  id="create-sprint-start"
                  type="datetime-local"
                  value={createStartDate}
                  onChange={(event) => setCreateStartDate(event.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label htmlFor="create-sprint-end" className="block text-sm font-medium mb-1">
                  End date
                </label>
                <input
                  id="create-sprint-end"
                  type="datetime-local"
                  value={createEndDate}
                  onChange={(event) => setCreateEndDate(event.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </form>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={busy || !createName.trim()}>
              Create sprint
            </Button>
          </div>
        </Modal>
      )}

      {/* Edit sprint modal */}
      {editOpen && (
        <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit sprint" maxWidth="md">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Only planned sprints can be edited.
          </p>
          {editError && <Alert variant="error">{editError}</Alert>}
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void handleUpdate(); }}>
            <Input
              id="edit-sprint-name"
              label="Sprint name"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
            <Input
              id="edit-sprint-goal"
              label="Goal (optional)"
              value={editGoal}
              onChange={(event) => setEditGoal(event.target.value)}
              maxLength={10000}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-sprint-start" className="block text-sm font-medium mb-1">
                  Start date
                </label>
                <input
                  id="edit-sprint-start"
                  type="datetime-local"
                  value={editStartDate}
                  onChange={(event) => setEditStartDate(event.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
              <div>
                <label htmlFor="edit-sprint-end" className="block text-sm font-medium mb-1">
                  End date
                </label>
                <input
                  id="edit-sprint-end"
                  type="datetime-local"
                  value={editEndDate}
                  onChange={(event) => setEditEndDate(event.target.value)}
                  className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                />
              </div>
            </div>
          </form>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdate()} disabled={busy || !editName.trim()}>
              Save changes
            </Button>
          </div>
        </Modal>
      )}

      {/* Complete sprint modal */}
      {completeOpen && (
        <Modal open={completeOpen} onClose={() => setCompleteOpen(false)} title="Complete sprint" maxWidth="md">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Choose what happens to unfinished tasks (status not APPROVED).
          </p>
          {completeError && <Alert variant="error">{completeError}</Alert>}
          <form className="mt-4 space-y-4" onSubmit={(event) => { event.preventDefault(); void handleConfirmComplete(); }}>
            <Select
              id="complete-target"
              label="Destination for unfinished tasks"
              value={completeTarget}
              onChange={(event) => setCompleteTarget(event.target.value as 'BACKLOG' | 'NEXT_SPRINT')}
              options={[
                { value: 'BACKLOG', label: 'Backlog — tasks leave the sprint and return to the backlog' },
                { value: 'NEXT_SPRINT', label: 'Next sprint — move unfinished tasks to another planned sprint' },
              ]}
            />
            {completeTarget === 'NEXT_SPRINT' && (
              <div>
                <label htmlFor="complete-next-sprint" className="block text-sm font-medium mb-1">
                  Target sprint
                </label>
                <Select
                  id="complete-next-sprint"
                  label="Target sprint"
                  value={completeNextSprintId}
                  onChange={(event) => setCompleteNextSprintId(event.target.value)}
                  options={plannedSprints
                    .filter((s) => s.id !== completeSprintId)
                    .map((s) => ({ value: s.id, label: s.name }))
                  }
                  placeholder="Select a planned sprint…"
                />
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  The target sprint must be in the same project and have status Planned.
                </p>
              </div>
            )}
          </form>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCompleteOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleConfirmComplete()}
              disabled={busy || (completeTarget === 'NEXT_SPRINT' && !completeNextSprintId)}
            >
              Complete sprint
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
