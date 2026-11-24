'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { Can } from '@/components/shared/Can';
import { ApiRequestError } from '@/lib/api';
import { sprintReportReasonCopy } from '@/lib/sprint-report-reasons';
import { sprintErrorMessage } from '@/services/sprint-errors';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  getSprintBoard,
  getSprintReportSummary,
  getSprintReportBurndown,
  addTasksToSprint,
  removeTaskFromSprint,
  type Sprint,
  type SprintStatus,
  type SprintBoard,
  type SprintReportSummary,
  type SprintReportBurndown,
} from '@/services/sprints';
import { listTasks, type TaskSummary, type TaskStatus } from '@/services/tasks';

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function statusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'outline' {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'IN_PROGRESS': return 'default';
    case 'SUBMITTED': return 'outline';
    case 'UNDER_REVIEW': return 'outline';
    case 'CHANGES_REQUESTED': return 'error';
    case 'AWAITING_CLARIFICATION': return 'outline';
    default: return 'default';
  }
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function taskCardClasses(status: TaskStatus): string {
  const base = 'rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3';
  if (status === 'APPROVED') return base + ' border-[var(--color-secondary)] bg-[var(--color-secondary-muted)]';
  return base;
}

function sprintMembershipLabel(task: TaskSummary, currentSprintId: string): string {
  if (task.sprintId && task.sprintId !== currentSprintId) {
    return task.sprintName
      ? `In another sprint (${task.sprintName}), will be moved`
      : 'In another sprint, will be moved';
  }
  return 'In backlog';
}

function assignmentButtonLabel(selectedCount: number, moveCount: number): string {
  const taskLabel = selectedCount === 1 ? 'task' : 'tasks';
  if (selectedCount > 0 && moveCount === selectedCount) return `Move ${selectedCount} ${taskLabel}`;
  const moveSuffix = moveCount > 0 ? ` — ${moveCount} will be moved` : '';
  return `Add ${selectedCount} ${taskLabel}${moveSuffix}`;
}

function moveWarningText(moveCount: number): string {
  const taskLabel = moveCount === 1 ? 'task' : 'tasks';
  return `Warning: ${moveCount} selected ${taskLabel} will be moved from another sprint.`;
}

export default function SprintDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const sprintIdFromParams = useParams<{ sprintId: string }>().sprintId;
  const { can, isLoading: permissionsLoading } = usePermissions();
  const router = useRouter();
  useWorkspaceRedirect();

  const sprintId = sprintIdFromParams ?? '';

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [board, setBoard] = useState<SprintBoard | null>(null);
  const [summary, setSummary] = useState<SprintReportSummary | null>(null);
  const [burndown, setBurndown] = useState<SprintReportBurndown | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState<string | null>(null);

  // Assign tasks modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTasks, setAssignTasks] = useState<TaskSummary[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignHasMore, setAssignHasMore] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [assignQuery, setAssignQuery] = useState<{ status: TaskStatus | ''; search: string }>({ status: '', search: '' });

  // Remove task confirm
  const [removeTarget, setRemoveTarget] = useState<{ taskId: string; taskTitle: string } | null>(null);

  const loadAll = useCallback(async () => {
    if (!activeWorkspace || !sprintId) return;
    setLoading(true);
    setError(null);
    setAccessStatus(null);
    try {
      const [b, s, bur] = await Promise.all([
        getSprintBoard(activeWorkspace.id, projectId, sprintId),
        getSprintReportSummary(activeWorkspace.id, projectId, sprintId),
        getSprintReportBurndown(activeWorkspace.id, projectId, sprintId),
      ]);
      setBoard(b);
      setSprint(b.sprint);
      setSummary(s);
      setBurndown(bur);
    } catch (cause) {
      if (cause instanceof ApiRequestError && cause.status === 401) {
        setAccessStatus(401);
      } else {
        setError(sprintErrorMessage(cause, 'Sprint data could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, projectId, sprintId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? loadAll() : undefined);
    return () => { active = false; };
  }, [loadAll]);

  async function handleRemoveTask(taskId: string, taskTitle: string) {
    setRemoveTarget({ taskId, taskTitle });
  }

  async function handleConfirmRemove() {
    if (!activeWorkspace || !sprintId || !removeTarget) return;
    setRemoveBusy(removeTarget.taskId);
    try {
      await removeTaskFromSprint(activeWorkspace.id, projectId, sprintId, removeTarget.taskId);
      setRemoveTarget(null);
      setNotice('Task removed from sprint.');
      await loadAll();
    } catch (cause) {
      setError(sprintErrorMessage(cause, 'Task could not be removed from sprint.'));
    } finally {
      setRemoveBusy(null);
    }
  }

  async function handleAssign() {
    if (!activeWorkspace || selectedTaskIds.size === 0) return;
    setBusy(true);
    setAssignError(null);
    try {
      await addTasksToSprint(activeWorkspace.id, projectId, sprintId, {
        taskIds: Array.from(selectedTaskIds),
      });
      setAssignOpen(false);
      setSelectedTaskIds(new Set());
      setNotice('Tasks added to sprint.');
      await loadAll();
    } catch (cause) {
      setAssignError(sprintErrorMessage(cause, 'Tasks could not be added to sprint.'));
    } finally {
      setBusy(false);
    }
  }

  async function loadAssignableTasks(
    query: { status: TaskStatus | ''; search: string } = assignQuery,
  ) {
    if (!activeWorkspace) return;
    setAssignLoading(true);
    setAssignError(null);
    setAssignHasMore(false);
    try {
      const data = await listTasks(activeWorkspace.id, projectId, {
        status: query.status || undefined,
        search: query.search || undefined,
        limit: 100,
      });
      const inSprintIds = new Set(board?.columns.flatMap((c) => c.tasks.map((t) => t.id)) ?? []);
      setAssignTasks(data.items.filter((t) => !inSprintIds.has(t.id)));
      setAssignHasMore(Boolean(data.nextCursor) || data.items.length >= 100);
    } catch (cause) {
      setAssignError(sprintErrorMessage(cause, 'Tasks could not be loaded.'));
    } finally {
      setAssignLoading(false);
    }
  }

  const boardColumns = board?.columns ?? [];
  const totalTasks = board?.totals.taskCount ?? 0;
  const doneCount = board?.totals.doneCount ?? 0;
  const progressNotReconstructable = summary?.scopeReconstructable === false;
  const burndownNotReconstructable = burndown?.scopeReconstructable === false;
  const progressReason = sprintReportReasonCopy(summary?.reason);
  const burndownReason = sprintReportReasonCopy(burndown?.reason);
  const selectedMoveCount = assignTasks.filter(
    (task) => selectedTaskIds.has(task.id) && Boolean(task.sprintId) && task.sprintId !== sprintId,
  ).length;

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading sprint board">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void loadAll()} />;
  if (!can('project.view')) {
    return (
      <PageAccessState
        title="Sprint not available"
        description="This sprint may have been deleted, or it is private and you are not a member."
        backHref={`/app/projects/${encodeURIComponent(projectId)}/sprints`}
        backLabel="Back to sprints"
      />
    );
  }
  if (!sprint || !board) return <Alert variant="error">{error ?? 'Sprint not found.'}</Alert>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{sprint.name}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {statusLabel(sprint.status as SprintStatus)} · {dateLabel(sprint.startDate)} — {dateLabel(sprint.endDate)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Can permission="task.update">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setSelectedTaskIds(new Set()); setAssignOpen(true); void loadAssignableTasks(); }}
              disabled={busy || sprint.status !== 'PLANNED' && sprint.status !== 'ACTIVE'}
            >
              Assign tasks
            </Button>
          </Can>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {/* Progress summary (R12) */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Progress</h2>
        {progressNotReconstructable ? (
          <Alert variant="info">
            {progressReason ?? 'This sprint has no recorded scope history.'}
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-center p-4 border rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)]">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Total tasks</p>
                <p className="text-xl font-mono">{summary?.summary?.totalTasks ?? totalTasks}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Done (APPROVED)</p>
                <p className="text-xl font-mono">{summary?.summary?.doneTasks ?? doneCount}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Remaining</p>
                <p className="text-xl font-mono">{summary?.summary?.remainingTasks ?? totalTasks - doneCount}</p>
              </div>
            </div>
            {summary && summary.summary?.completionRate !== undefined && (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Completion rate: {(summary.summary.completionRate * 100).toFixed(0)}%
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Metric: task count (done = APPROVED)
        </p>
      </Card>

      {/* Burndown (R13) */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3">Burndown</h2>
        {burndownNotReconstructable ? (
          <Alert variant="info">
            {burndownReason ?? 'This sprint has no recorded scope history.'}
          </Alert>
        ) : burndown?.series.length === 0 ? (
          <div className="p-6 border rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] text-center text-sm text-[var(--color-text-secondary)]">
            No burndown data yet. This sprint has not started.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <caption className="sr-only">
                  Burndown by UTC day: Remaining, Ideal, Scope and Completed task counts (done = APPROVED)
                </caption>
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="pb-2 text-[var(--color-text-muted)] font-medium">Date</th>
                    <th className="pb-2 text-[var(--color-text-muted)] font-medium">Remaining</th>
                    <th className="pb-2 text-[var(--color-text-muted)] font-medium">Ideal</th>
                    <th className="pb-2 text-[var(--color-text-muted)] font-medium">Scope</th>
                    <th className="pb-2 text-[var(--color-text-muted)] font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {(burndown?.series ?? []).map((point) => (
                    <tr key={point.date} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                      <td className="py-2 font-mono">{point.date}</td>
                      <td className="py-2">{point.remaining}</td>
                      <td className="py-2 text-[var(--color-text-muted)]">{point.ideal}</td>
                      <td className="py-2">{point.scope}</td>
                      <td className="py-2">{point.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-muted)]">
              Scroll horizontally to view the full table.
            </p>
            {burndown?.totals && (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                Initial scope: {burndown.totals.initialScope}, completed: {burndown.totals.completed}, remaining: {burndown.totals.remaining}
              </p>
            )}
          </>
        )}
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Metric: task count (done = APPROVED)
        </p>
      </Card>

      {/* Board (R11) */}
      <div className="flex flex-col lg:flex-row gap-4">
        {boardColumns.map((column) => (
          <Card key={column.status} className="flex-1 flex flex-col min-w-[260px]">
            <div className="flex items-center justify-between mb-2 px-3">
              <h2 className="text-sm font-semibold">{column.status.replaceAll('_', ' ')}</h2>
              <Badge>{column.count}</Badge>
            </div>
            <div className="flex-1 min-h-[300px] overflow-y-auto space-y-2 p-3">
              {column.tasks.length === 0 ? (
                <div className="text-xs text-[var(--color-text-muted)] text-center py-4">
                  No tasks
                </div>
              ) : (
                column.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={taskCardClasses(task.status)}
                    onClick={() => {
                      router.push(`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`); }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-mono font-medium">{task.key}</span>
                      {can('task.update') && task.archivedAt ? (
                        <Badge variant="outline">Archived</Badge>
                      ) : null}
                    </div>
                    <div className="mt-1 text-sm font-medium">{task.title}</div>
                    <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                      {task.assignees.map((a) => (
                        <span key={a.userId} className="truncate max-w-[120px]">{a.name}</span>
                      ))}
                      {task.dueDate && <span>· {dateLabel(task.dueDate)}</span>}
                    </div>
                    {can('task.update') && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); void handleRemoveTask(task.id, task.title); }}
                        disabled={removeBusy === task.id}
                      >
                        Remove from sprint
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        ))}
      </div>

      <p className="text-xs text-[var(--color-text-muted)] mt-2">
        {totalTasks} task{totalTasks !== 1 ? 's' : ''} total · {doneCount} done
      </p>

      {/* Assign tasks modal */}
      {assignOpen && (
        <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign tasks to sprint" maxWidth="lg">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Select tasks to add to this sprint. Tasks already in the sprint are excluded.
          </p>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="assign-status" className="block text-sm font-medium mb-1">
                  Filter by status
                </label>
                <Select
                  id="assign-status"
                  label="Filter by status"
                  srOnlyLabel
                  value={assignQuery.status}
                  onChange={(event) => { const next = { ...assignQuery, status: event.target.value as TaskStatus | '' }; setAssignQuery(next); void loadAssignableTasks(next); }}
                  options={[
                    { value: '', label: 'Any status' },
                    { value: 'ASSIGNED', label: 'Assigned' },
                    { value: 'AWAITING_CLARIFICATION', label: 'Awaiting clarification' },
                    { value: 'IN_PROGRESS', label: 'In progress' },
                    { value: 'SUBMITTED', label: 'Submitted' },
                    { value: 'UNDER_REVIEW', label: 'Under review' },
                    { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
                    { value: 'APPROVED', label: 'Approved' },
                  ]}
                />
              </div>
              <div>
                <label htmlFor="assign-search" className="block text-sm font-medium mb-1">
                  Search
                </label>
                <Input
                  id="assign-search"
                  label="Search"
                  srOnlyLabel
                  value={assignQuery.search}
                  onChange={(event) => { const next = { ...assignQuery, search: event.target.value }; setAssignQuery(next); void loadAssignableTasks(next); }}
                  placeholder="Search tasks…"
                />
              </div>
            </div>
            {assignError && <Alert variant="error">{assignError}</Alert>}
            {selectedMoveCount > 0 && (
              <Alert variant="warning">
                <span aria-hidden="true" className="mr-2">⚠</span>
                <span>{moveWarningText(selectedMoveCount)}</span>
              </Alert>
            )}
            {assignHasMore && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Showing a partial list. Narrow with status or search to find others.
              </p>
            )}
            {assignLoading ? (
              <div className="h-32 flex items-center justify-center">
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto border rounded-[var(--radius-md)]">
                {assignError ? null : assignTasks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
                    No tasks available here. Try another status or search term.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {assignTasks.map((task) => (
                      <li key={task.id} className="p-3 flex items-center justify-between hover:bg-[var(--color-surface-secondary)]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-mono font-medium">{task.key}</span>
                            <Badge variant={statusColor(task.status)}>
                              {task.status.replaceAll('_', ' ')}
                            </Badge>
                          </div>
                          <div className="mt-1 text-sm font-medium line-clamp-2">{task.title}</div>
                          <div className="mt-1 text-xs text-[var(--color-text-muted)]">
                            {sprintMembershipLabel(task, sprintId)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.has(task.id)}
                            onChange={() => {
                              const next = new Set(selectedTaskIds);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              setSelectedTaskIds(next);
                            }}
                            className="rounded border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)] focus:ring-0"
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAssignOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleAssign()}
                disabled={busy || selectedTaskIds.size === 0}
              >
                {assignmentButtonLabel(selectedTaskIds.size, selectedMoveCount)}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Remove task confirm */}
      {removeTarget && (
        <ConfirmDialog
          open={Boolean(removeTarget)}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => void handleConfirmRemove()}
          title="Remove task from sprint?"
          description={`Remove \"${removeTarget.taskTitle}\" from this sprint? It will return to the backlog.`}
          confirmLabel="Remove"
          loading={removeBusy === removeTarget.taskId}
        />
      )}
    </div>
  );
}
