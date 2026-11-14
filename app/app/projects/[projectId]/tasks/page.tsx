'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { z } from 'zod';

import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Dropdown, type DropdownItem } from '@/components/ui/Dropdown';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { AccessState } from '@/components/shared/AccessState';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { listProjectMembers, type ProjectMember } from '@/services/projects';
import {
  addAssignee,
  archiveTask,
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  removeAssignee,
  reopenTask,
  restoreTask,
  type CreateTaskInput,
  type ListTasksQuery,
  type TaskPage,
  type TaskPriority,
  type TaskSortBy,
  type TaskSortOrder,
  type TaskStatus,
  type TaskSummary,
} from '@/services/tasks';

// ---------------------------------------------------------------------------
// Validation schema (Zod)
// ---------------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200, 'Title must be at most 200 characters'),
  description: z.string().trim().max(10000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED']),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  labels: z.string().optional(),
}).refine((data) => {
  if (data.startDate && data.dueDate) return new Date(data.startDate) <= new Date(data.dueDate);
  return true;
}, { message: 'Start date must be on or before the due date', path: ['dueDate'] });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ViewMode = 'board' | 'list' | 'calendar' | 'timeline';

const STATUS_COLUMNS: TaskStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
];

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All priorities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  ...STATUS_COLUMNS.map((s) => ({ value: s, label: statusLabel(s) })),
];

const SORT_BY_OPTIONS: { value: TaskSortBy; label: string }[] = [
  { value: 'position', label: 'Position' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created' },
];

const SORT_ORDER_OPTIONS: { value: TaskSortOrder; label: string }[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

function statusLabel(s: TaskStatus): string {
  return s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function priorityLabel(p: TaskPriority): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function shortDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)) : '';
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  return cause.message;
}

/** Build a 6-row calendar grid (42 cells) for the given month. */
function monthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startDay);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function groupByDate(tasks: TaskSummary[]): Map<string, TaskSummary[]> {
  const groups = new Map<string, TaskSummary[]>();
  for (const task of tasks) {
    const key = task.dueDate ? task.dueDate.slice(0, 10) : '__no_due_date__';
    const list = groups.get(key);
    if (list) list.push(task);
    else groups.set(key, [task]);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProjectTasksPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  useWorkspaceRedirect();

  const canView = can('task.view');
  const canCreate = can('task.create');
  const canAssign = can('task.assign');
  const canReassign = can('task.reassign');
  const canDelete = can('task.delete');
  const canComplete = can('task.complete');
  const canUpdate = can('task.update');
  const canManageAssignees = canAssign || canReassign;

  // --- Data state ---
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // --- Filters ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // --- Sorting ---
  const [sortBy, setSortBy] = useState<TaskSortBy>('position');
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('asc');

  // --- View mode ---
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // --- Create modal ---
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<TaskPriority>('MEDIUM');
  const [createStatus, setCreateStatus] = useState<TaskStatus>('ASSIGNED');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createLabels, setCreateLabels] = useState('');
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // --- Task actions ---
  const [archiveTarget, setArchiveTarget] = useState<TaskSummary | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<TaskSummary | null>(null);
  const [completeTarget, setCompleteTarget] = useState<TaskSummary | null>(null);
  const [reopenTarget, setReopenTarget] = useState<TaskSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<TaskSummary | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [taskActionBusy, setTaskActionBusy] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  // --- Calendar state ---
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // --- Workspace-switch safety refs ---
  const latestLoad = useRef(0);
  const activeWorkspaceIdRef = useRef<string | undefined>(activeWorkspace?.id);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspace?.id; }, [activeWorkspace?.id]);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const load = useCallback(async (append = false) => {
    if (!activeWorkspace || !canView) {
      setLoading(false);
      return;
    }
    if (activeWorkspace.id !== activeWorkspaceIdRef.current) return;
    const loadId = ++latestLoad.current;
    if (!append) {
      setTasks([]); setNextCursor(null); setLoadedWorkspaceId(''); setAccessStatus(null); setError(null);
    }
    setLoading(true);
    try {
      const cursor = append ? nextCursor ?? undefined : undefined;
      const query: ListTasksQuery = {
        cursor,
        limit: 25,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        sortBy,
        sortOrder,
        includeArchived: includeArchived || undefined,
      };
      const page: TaskPage = await listTasks(activeWorkspace.id, projectId, query);
      if (loadId !== latestLoad.current) return;
      setTasks((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor);
      setLoadedWorkspaceId(activeWorkspace.id);
    } catch (cause) {
      if (loadId !== latestLoad.current) return;
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setError(requestError(cause, 'Tasks could not be loaded.'));
      }
    } finally {
      if (loadId === latestLoad.current) setLoading(false);
    }
  }, [activeWorkspace, projectId, canView, search, statusFilter, priorityFilter, sortBy, sortOrder, includeArchived, nextCursor]);

  useEffect(() => {
    if (!activeWorkspace || !canView) return;
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [activeWorkspace, canView, load]);

  // Load project members only when the caller can change assignees. A failure
  // here must never prevent the task list from rendering.
  useEffect(() => {
    if (!activeWorkspace || !canManageAssignees) return;
    let active = true;
    void listProjectMembers(activeWorkspace.id, projectId)
      .then((list) => { if (active) setMembers(list); })
      .catch(() => { /* The assignee picker stays empty; tasks remain usable. */ });
    return () => { active = false; };
  }, [activeWorkspace, projectId, canManageAssignees]);

  // -----------------------------------------------------------------------
  // Create task
  // -----------------------------------------------------------------------

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace) return;
    const parsed = createSchema.safeParse({
      title: createTitle,
      description: createDescription.trim() || undefined,
      priority: createPriority,
      status: createStatus,
      startDate: createStartDate || undefined,
      dueDate: createDueDate || undefined,
      labels: createLabels || undefined,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message;
      setCreateErrors(errors);
      return;
    }
    setBusy(true); setError(null); setCreateErrors({});
    try {
      const input: CreateTaskInput = {
        title: parsed.data.title,
        ...(parsed.data.description ? { description: parsed.data.description } : {}),
        status: parsed.data.status,
        priority: parsed.data.priority,
        ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
        ...(parsed.data.dueDate ? { dueDate: parsed.data.dueDate } : {}),
        ...(parsed.data.labels ? { labels: parsed.data.labels.split(',').map((l) => l.trim()).filter(Boolean) } : {}),
      };
      await createTask(activeWorkspace.id, projectId, input);
      setShowCreate(false);
      resetCreateForm();
      setNotice('Task created.');
      await load();
    } catch (cause) {
      setError(requestError(cause, 'Task could not be created.'));
    } finally { setBusy(false); }
  }

  function resetCreateForm() {
    setCreateTitle(''); setCreateDescription(''); setCreatePriority('MEDIUM');
    setCreateStatus('ASSIGNED'); setCreateStartDate(''); setCreateDueDate('');
    setCreateLabels(''); setCreateErrors({});
  }

  // -----------------------------------------------------------------------
  // Task actions
  // -----------------------------------------------------------------------

  async function handleArchive() {
    if (!activeWorkspace || !archiveTarget) return;
    setBusy(true); setError(null);
    try {
      await archiveTask(activeWorkspace.id, projectId, archiveTarget.id);
      setArchiveTarget(null); setNotice(`Task ${archiveTarget.key} archived.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Task could not be archived.')); }
    finally { setBusy(false); }
  }

  async function handleRestore() {
    if (!activeWorkspace || !restoreTarget) return;
    setBusy(true); setError(null);
    try {
      await restoreTask(activeWorkspace.id, projectId, restoreTarget.id);
      setRestoreTarget(null); setNotice(`Task ${restoreTarget.key} restored.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Task could not be restored.')); }
    finally { setBusy(false); }
  }

  async function handleComplete() {
    if (!activeWorkspace || !completeTarget) return;
    setBusy(true); setError(null);
    try {
      await completeTask(activeWorkspace.id, projectId, completeTarget.id);
      setCompleteTarget(null); setNotice(`Task ${completeTarget.key} completed.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Task could not be completed.')); }
    finally { setBusy(false); }
  }

  async function handleReopen() {
    if (!activeWorkspace || !reopenTarget) return;
    setBusy(true); setError(null);
    try {
      await reopenTask(activeWorkspace.id, projectId, reopenTarget.id);
      setReopenTarget(null); setNotice(`Task ${reopenTarget.key} reopened.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Task could not be reopened.')); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!activeWorkspace || !deleteTarget) return;
    setTaskActionBusy(true); setError(null);
    try {
      await deleteTask(activeWorkspace.id, projectId, deleteTarget.id);
      setDeleteTarget(null);
      setNotice(`Task ${deleteTarget.key} deleted.`);
      await load();
    } catch (cause) { setError(requestError(cause, 'Task could not be deleted.')); }
    finally { setTaskActionBusy(false); }
  }

  async function handleAddAssignee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeWorkspace || !assignTarget || !assignUserId) return;
    setTaskActionBusy(true); setError(null);
    try {
      await addAssignee(activeWorkspace.id, projectId, assignTarget.id, assignUserId);
      setAssignUserId('');
      setNotice('Assignee added.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Assignee could not be added.')); }
    finally { setTaskActionBusy(false); }
  }

  async function handleRemoveAssignee(userId: string) {
    if (!activeWorkspace || !assignTarget) return;
    setTaskActionBusy(true); setError(null);
    try {
      await removeAssignee(activeWorkspace.id, projectId, assignTarget.id, userId);
      setNotice('Assignee removed.');
      await load();
    } catch (cause) { setError(requestError(cause, 'Assignee could not be removed.')); }
    finally { setTaskActionBusy(false); }
  }

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------

  const taskDetailHref = (taskId: string) =>
    `/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`;

  const currentAssignTarget = assignTarget
    ? tasks.find((task) => task.id === assignTarget.id) ?? assignTarget
    : null;
  const assignedIds = new Set(currentAssignTarget?.assignees.map((a) => a.userId) ?? []);
  const assignableMembers = members
    .filter((member) => !assignedIds.has(member.userId))
    .map((member) => ({ value: member.userId, label: `${member.user.name} · ${member.user.email}` }));

  function taskActionItems(task: TaskSummary): DropdownItem[] {
    const items: DropdownItem[] = [];
    if (canManageAssignees) {
      items.push({
        id: 'assign',
        label: 'Manage assignees',
        onSelect: () => { setAssignTarget(task); setAssignUserId(''); },
      });
    }
    if (canComplete) {
      items.push({
        id: 'complete',
        label: task.status === 'APPROVED' ? 'Reopen task' : 'Mark complete',
        onSelect: () => (task.status === 'APPROVED' ? setReopenTarget(task) : setCompleteTarget(task)),
      });
    }
    if (canUpdate) {
      items.push({
        id: 'archive',
        label: task.archivedAt ? 'Restore task' : 'Archive task',
        onSelect: () => (task.archivedAt ? setRestoreTarget(task) : setArchiveTarget(task)),
      });
    }
    if (canDelete) {
      items.push({
        id: 'delete',
        label: 'Delete task',
        destructive: true,
        separatorBefore: items.length > 0,
        onSelect: () => setDeleteTarget(task),
      });
    }
    return items;
  }

  const isLoading = loading && loadedWorkspaceId !== activeWorkspace?.id;

  if (workspaceLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace…</p>
      </div>
    );
  }

  if (!activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <EmptyState
          title="Choose a workspace"
          description="Select a workspace to view and manage its tasks."
          action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
        />
      </div>
    );
  }

  if (permissionsLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-3 px-5 py-8 sm:px-8" role="status" aria-label="Loading tasks">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!canView) {
    return (
      <PageAccessState
        description="Your project role does not include access to the task list."
        backHref={`/app/projects/${encodeURIComponent(projectId)}`}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader
        title="Tasks"
        description="Create, track, and manage tasks for this project. Switch between board, list, calendar, and timeline views."
        actions={
          <PermissionButton
            permission="task.create"
            onClick={() => setShowCreate(true)}
            deniedReason="Your project role cannot create tasks."
          >
            New task
          </PermissionButton>
        }
      />

      {error && <Alert variant="error" title="Could not complete request">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {accessStatus && <AccessState status={accessStatus} onRetry={() => void load()} />}

      {/* ----------------------------------------------------------------- */}
      {/* Filters & sorting                                                 */}
      {/* ----------------------------------------------------------------- */}
      {!accessStatus && (
        <Card className="p-4">
          <form
            className="flex flex-wrap items-end gap-3"
            role="search"
            aria-label="Filter tasks"
            onSubmit={(event) => { event.preventDefault(); void load(); }}
          >
            <div className="flex-1 min-w-40">
              <Input
                id="task-search"
                label="Search"
                placeholder="Task title or key…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="min-w-36">
              <Select
                id="status-filter"
                label="Status"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as TaskStatus | '')}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="min-w-36">
              <Select
                id="priority-filter"
                label="Priority"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as TaskPriority | '')}
                options={PRIORITY_OPTIONS}
              />
            </div>
            <div className="min-w-32">
              <Select
                id="sort-by"
                label="Sort by"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as TaskSortBy)}
                options={SORT_BY_OPTIONS}
              />
            </div>
            <div className="min-w-32">
              <Select
                id="sort-order"
                label="Order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as TaskSortOrder)}
                options={SORT_ORDER_OPTIONS}
              />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <input
                type="checkbox"
                id="include-archived-tasks"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
                className="h-4 w-4 rounded border border-[var(--color-border)]"
              />
              <label htmlFor="include-archived-tasks" className="text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                Include archived
              </label>
            </div>
            <Button type="submit" variant="secondary" loading={isLoading}>Search</Button>
          </form>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* View mode selector                                                */}
      {/* ----------------------------------------------------------------- */}
      {!accessStatus && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Task view">
          {(['board', 'list', 'calendar', 'timeline'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={[
                'inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium capitalize transition-colors',
                viewMode === mode
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]',
              ].join(' ')}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Content                                                            */}
      {/* ----------------------------------------------------------------- */}
      {!accessStatus && (
        <>
          {isLoading ? (
            <div className="space-y-3" aria-label="Loading tasks" role="status">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description={search || statusFilter || priorityFilter ? 'No tasks match the current filters.' : 'Create your first task to get started.'}
              action={
                !search && !statusFilter && !priorityFilter && canCreate
                  ? <Button onClick={() => setShowCreate(true)}>Create task</Button>
                  : undefined
              }
            />
          ) : (
            <>
              {/* ============================================================= */}
              {/* Board view                                                     */}
              {/* ============================================================= */}
              {viewMode === 'board' && (
                <div className="overflow-x-auto pb-2">
                  <div className="flex gap-4 min-w-max">
                    {STATUS_COLUMNS.map((status) => {
                      const columnTasks = tasks.filter((t) => t.status === status);
                      return (
                        <div
                          key={status}
                          className="flex w-72 shrink-0 flex-col gap-2"
                          role="group"
                          aria-label={`${statusLabel(status)} column`}
                        >
                          <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={status}>{statusLabel(status)}</Badge>
                              <span className="text-xs text-[var(--color-text-muted)]">{columnTasks.length}</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {columnTasks.length === 0 ? (
                              <p className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">No tasks</p>
                            ) : (
                              columnTasks.map((task) => {
                                const actions = taskActionItems(task);
                                return (
                                  <div
                                    key={task.id}
                                    className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md"
                                  >
                                    <Link
                                      href={taskDetailHref(task.id)}
                                      className="block rounded-t-[var(--radius-md)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <span className="font-mono text-xs text-[var(--color-text-muted)]">{task.key}</span>
                                        <Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge>
                                      </div>
                                      <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">{task.title}</p>
                                      <div className="mt-2 flex items-center justify-between">
                                        <div className="flex -space-x-1.5">
                                          {task.assignees.slice(0, 3).map((a) => (
                                            <span
                                              key={a.userId}
                                              title={a.user.name}
                                              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] font-medium text-[var(--color-text-secondary)]"
                                            >
                                              {initials(a.user.name)}
                                            </span>
                                          ))}
                                          {task.assignees.length > 3 && (
                                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] text-[var(--color-text-muted)]">
                                              +{task.assignees.length - 3}
                                            </span>
                                          )}
                                        </div>
                                        {task.dueDate && (
                                          <span className="text-xs text-[var(--color-text-muted)]">{shortDate(task.dueDate)}</span>
                                        )}
                                      </div>
                                    </Link>
                                    {actions.length > 0 && (
                                      <div className="flex items-center justify-end border-t border-[var(--color-border)] px-2 py-1">
                                        <Dropdown
                                          items={actions}
                                          label={`Actions for ${task.key}`}
                                          triggerLabel={`Actions for ${task.key}`}
                                          align="end"
                                          triggerClassName="h-7 px-2 text-xs"
                                        >
                                          Actions
                                        </Dropdown>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ============================================================= */}
              {/* List view                                                      */}
              {/* ============================================================= */}
              {viewMode === 'list' && (
                <Card className="p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] text-left">
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Key</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Title</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Status</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Priority</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Assignees</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Due date</th>
                          <th scope="col" className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border)]">
                        {tasks.map((task) => {
                          const actions = taskActionItems(task);
                          return (
                          <tr
                            key={task.id}
                            className="hover:bg-[var(--color-surface-secondary)] transition-colors"
                          >
                            <td className="px-4 py-2.5">
                              <Link
                                href={taskDetailHref(task.id)}
                                className="font-mono text-xs text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                              >
                                {task.key}
                              </Link>
                            </td>
                            <td className="px-4 py-2.5">
                              <Link
                                href={taskDetailHref(task.id)}
                                className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded"
                              >
                                {task.title}
                              </Link>
                              {task.archivedAt && <span className="ml-2 text-xs text-[var(--color-text-muted)]">(archived)</span>}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex -space-x-1.5">
                                {task.assignees.length === 0 ? (
                                  <span className="text-xs text-[var(--color-text-muted)]">—</span>
                                ) : (
                                  <>
                                    {task.assignees.slice(0, 3).map((a) => (
                                      <span
                                        key={a.userId}
                                        title={a.user.name}
                                        className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] font-medium text-[var(--color-text-secondary)]"
                                      >
                                        {initials(a.user.name)}
                                      </span>
                                    ))}
                                    {task.assignees.length > 3 && (
                                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] text-[var(--color-text-muted)]">
                                        +{task.assignees.length - 3}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text-secondary)]">
                              {dateLabel(task.dueDate)}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              {actions.length === 0 ? (
                                <span className="text-xs text-[var(--color-text-muted)]">—</span>
                              ) : (
                                <Dropdown
                                  items={actions}
                                  label={`Actions for ${task.key}`}
                                  triggerLabel={`Actions for ${task.key}`}
                                  align="end"
                                  triggerClassName="h-7 px-2 text-xs"
                                >
                                  Actions
                                </Dropdown>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* ============================================================= */}
              {/* Calendar view                                                  */}
              {/* ============================================================= */}
              {viewMode === 'calendar' && (
                <div className="space-y-4">
                  {/* Calendar navigation */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">
                      {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarDate)}
                    </h3>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        aria-label="Previous month"
                      >
                        ←
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCalendarDate(new Date())}
                      >
                        Today
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setCalendarDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        aria-label="Next month"
                      >
                        →
                      </Button>
                    </div>
                  </div>

                  {/* Calendar grid */}
                  <Card className="p-0 overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="px-1 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]">
                          <span className="hidden sm:inline">{day}</span>
                          <span className="sm:hidden">{day[0]}</span>
                        </div>
                      ))}
                    </div>
                    {/* Calendar cells */}
                    <div className="grid grid-cols-7">
                      {(() => {
                        const grid = monthGrid(calendarDate.getFullYear(), calendarDate.getMonth());
                        const today = new Date();
                        return grid.map((day) => {
                          const isCurrentMonth = day.getMonth() === calendarDate.getMonth();
                          const dayTasks = tasks.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), day));
                          return (
                            <div
                              key={day.toISOString()}
                              className={[
                                'min-h-16 border-b border-r border-[var(--color-border)] p-1 sm:min-h-24',
                                isCurrentMonth ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-secondary)]',
                                day.getDay() === 6 ? 'border-r-0' : '',
                              ].join(' ')}
                            >
                              <span
                                className={[
                                  'text-xs',
                                  sameDay(day, today) ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-muted)]',
                                ].join(' ')}
                              >
                                {day.getDate()}
                              </span>
                              <div className="mt-0.5 flex flex-col gap-0.5">
                                {dayTasks.slice(0, 3).map((task) => (
                                  <Link
                                    key={task.id}
                                    href={taskDetailHref(task.id)}
                                    className="block truncate rounded bg-[var(--color-surface-secondary)] px-1 py-0.5 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] sm:text-xs"
                                  >
                                    <span className="font-mono">{task.key}</span> {task.title}
                                  </Link>
                                ))}
                                {dayTasks.length > 3 && (
                                  <span className="px-1 text-[10px] text-[var(--color-text-muted)]">+{dayTasks.length - 3} more</span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </Card>

                  {/* Unscheduled tasks */}
                  {(() => {
                    const unscheduled = tasks.filter((t) => !t.dueDate);
                    if (unscheduled.length === 0) return null;
                    return (
                      <div>
                        <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">Unscheduled tasks</h4>
                        <div className="flex flex-col gap-2">
                          {unscheduled.map((task) => (
                            <Link
                              key={task.id}
                              href={taskDetailHref(task.id)}
                              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                            >
                              <span className="font-mono text-xs text-[var(--color-text-muted)]">{task.key}</span>
                              <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{task.title}</span>
                              <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ============================================================= */}
              {/* Timeline view                                                 */}
              {/* ============================================================= */}
              {viewMode === 'timeline' && (
                <div className="space-y-4">
                  {(() => {
                    const groups = groupByDate(tasks);
                    const sortedKeys = [...groups.keys()].sort((a, b) => {
                      if (a === '__no_due_date__') return 1;
                      if (b === '__no_due_date__') return -1;
                      return a.localeCompare(b);
                    });
                    return sortedKeys.map((key) => {
                      const groupTasks = groups.get(key)!;
                      const isNoDue = key === '__no_due_date__';
                      return (
                        <div key={key}>
                          <h4 className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                            {isNoDue ? 'No due date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(key))}
                            <span className="ml-2 text-xs text-[var(--color-text-muted)]">({groupTasks.length})</span>
                          </h4>
                          <div className="flex flex-col gap-2">
                            {groupTasks.map((task) => (
                              <Link
                                key={task.id}
                                href={taskDetailHref(task.id)}
                                className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                  <span className="font-mono text-xs text-[var(--color-text-muted)] whitespace-nowrap">{task.key}</span>
                                  <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{task.title}</span>
                                </div>
                                <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                                <Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge>
                                {task.startDate && task.dueDate && !isNoDue && (
                                  <span className="hidden text-xs text-[var(--color-text-muted)] sm:inline">
                                    {shortDate(task.startDate)} — {shortDate(task.dueDate)}
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* ============================================================= */}
              {/* Pagination (load more)                                        */}
              {/* ============================================================= */}
              {nextCursor && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="secondary"
                    loading={loading}
                    onClick={() => void load(true)}
                  >
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Create task modal                                                  */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); resetCreateForm(); }}
        title="New task"
      >
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <Input
            id="create-task-title"
            label="Title"
            value={createTitle}
            onChange={(event) => setCreateTitle(event.target.value)}
            required
            minLength={2}
            maxLength={200}
            errorMessage={createErrors.title}
          />
          <Textarea
            id="create-task-description"
            label="Description (optional)"
            value={createDescription}
            onChange={(event) => setCreateDescription(event.target.value)}
            maxLength={10000}
            rows={3}
            errorMessage={createErrors.description}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              id="create-task-priority"
              label="Priority"
              value={createPriority}
              onChange={(event) => setCreatePriority(event.target.value as TaskPriority)}
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
            />
            <Select
              id="create-task-status"
              label="Status"
              value={createStatus}
              onChange={(event) => setCreateStatus(event.target.value as TaskStatus)}
              options={STATUS_COLUMNS.map((s) => ({ value: s, label: statusLabel(s) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="create-task-start-date" className="block text-sm font-medium text-[var(--color-text-primary)]">
                Start date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>
              <input
                id="create-task-start-date"
                type="date"
                value={createStartDate}
                onChange={(event) => setCreateStartDate(event.target.value)}
                className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
            </div>
            <div>
              <label htmlFor="create-task-due-date" className="block text-sm font-medium text-[var(--color-text-primary)]">
                Due date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
              </label>
              <input
                id="create-task-due-date"
                type="date"
                value={createDueDate}
                onChange={(event) => setCreateDueDate(event.target.value)}
                className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              />
              {createErrors.dueDate && (
                <p className="mt-1 text-xs text-[var(--color-error)]">{createErrors.dueDate}</p>
              )}
            </div>
          </div>
          <Input
            id="create-task-labels"
            label="Labels (optional)"
            placeholder="e.g. bug, frontend, urgent"
            value={createLabels}
            onChange={(event) => setCreateLabels(event.target.value)}
            helperText="Comma-separated labels"
          />
          {error && <Alert variant="error">{error}</Alert>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancel</Button>
            <Button type="submit" loading={busy}>Create task</Button>
          </div>
        </form>
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Manage assignees modal                                             */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        open={Boolean(currentAssignTarget)}
        onClose={() => { setAssignTarget(null); setAssignUserId(''); }}
        title={`Manage assignees${currentAssignTarget ? ` · ${currentAssignTarget.key}` : ''}`}
        footer={
          <Button
            variant="secondary"
            onClick={() => { setAssignTarget(null); setAssignUserId(''); }}
            disabled={taskActionBusy}
          >
            Done
          </Button>
        }
      >
        {currentAssignTarget && (
          <div className="space-y-4">
            {currentAssignTarget.assignees.length === 0 ? (
              <p className="text-sm text-[var(--color-text-secondary)]">No assignees yet.</p>
            ) : (
              <ul className="space-y-2" aria-label="Task assignee list">
                {currentAssignTarget.assignees.map((assignee) => (
                  <li key={assignee.userId} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{assignee.user.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{assignee.user.email}</p>
                    </div>
                    {canReassign && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={taskActionBusy}
                        onClick={() => void handleRemoveAssignee(assignee.userId)}
                        aria-label={`Remove ${assignee.user.name} as assignee`}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canAssign && (
              assignableMembers.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Every available project member is already assigned to this task.
                </p>
              ) : (
                <form onSubmit={(event) => void handleAddAssignee(event)} className="flex flex-wrap items-end gap-2" aria-label="Add assignee">
                  <div className="min-w-48 flex-1">
                    <Select
                      id="list-add-assignee"
                      label="Add assignee"
                      value={assignUserId}
                      onChange={(event) => setAssignUserId(event.target.value)}
                      options={assignableMembers}
                      placeholder="Select a project member…"
                    />
                  </div>
                  <Button type="submit" loading={taskActionBusy} disabled={!assignUserId}>Add</Button>
                </form>
              )
            )}

            {!canAssign && canReassign && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Your role can remove assignees but cannot add new ones.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* ----------------------------------------------------------------- */}
      {/* Confirmation dialogs                                               */}
      {/* ----------------------------------------------------------------- */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title={`Delete ${deleteTarget?.key}?`}
        description="This task will be permanently deleted. This cannot be undone."
        confirmLabel="Delete task"
        destructive
        loading={taskActionBusy}
      />

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => void handleArchive()}
        title={`Archive ${archiveTarget?.key}?`}
        description="Archived tasks are hidden from the default task list. Existing data is preserved and the task can be restored."
        confirmLabel="Archive task"
        destructive
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(restoreTarget)}
        onClose={() => setRestoreTarget(null)}
        onConfirm={() => void handleRestore()}
        title={`Restore ${restoreTarget?.key}?`}
        description="The task will become active again and appear in the task list."
        confirmLabel="Restore task"
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(completeTarget)}
        onClose={() => setCompleteTarget(null)}
        onConfirm={() => void handleComplete()}
        title={`Complete ${completeTarget?.key}?`}
        description="The task will be marked as completed. You can reopen it later."
        confirmLabel="Complete task"
        loading={busy}
      />

      <ConfirmDialog
        open={Boolean(reopenTarget)}
        onClose={() => setReopenTarget(null)}
        onConfirm={() => void handleReopen()}
        title={`Reopen ${reopenTarget?.key}?`}
        description="The task will be reopened and returned to its previous status."
        confirmLabel="Reopen task"
        loading={busy}
      />
    </div>
  );
}
