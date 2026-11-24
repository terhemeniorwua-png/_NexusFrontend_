'use client';

import Link from 'next/link';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
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
import { CustomFieldInput, formatCustomFieldValue } from '@/components/tasks/CustomFieldInputs';
import { TaskGanttView } from '@/components/tasks/TaskGanttView';
import { ApiRequestError } from '@/lib/api';
import { formatTaskStatusLabel } from '@/lib/status-label';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { listProjectMembers, type ProjectMember } from '@/services/projects';
import {
  addAssignee,
  archiveTask,
  completeTask,
  createProjectCustomField,
  createTask,
  createTaskFromTemplate,
  createTaskSavedView,
  deleteProjectCustomField,
  deleteTask,
  deleteTaskRecurrence,
  deleteTaskSavedView,
  generateTaskRecurrenceInstance,
  getTaskCustomFieldValues,
  getTaskRecurrence,
  listProjectCustomFields,
  listTaskSavedViews,
  listTaskTemplates,
  listTasks,
  removeAssignee,
  reopenTask,
  restoreTask,
  setTaskCustomFieldValues,
  updateProjectCustomField,
  updateTask,
  updateTaskSavedView,
  upsertTaskRecurrence,
  type CreateTaskInput,
  type CustomFieldOption,
  type CustomFieldType,
  type ListTasksQuery,
  type ProjectCustomField,
  type SavedViewConfigV1,
  type TaskPage,
  type TaskPriority,
  type TaskRecurrenceFrequency,
  type TaskRecurrenceRule,
  type TaskSavedView,
  type TaskSortBy,
  type TaskSortOrder,
  type TaskStatus,
  type TaskSummary,
  type TaskTemplate,
} from '@/services/tasks';

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

type ViewMode = 'board' | 'list' | 'calendar' | 'timeline' | 'table' | 'gantt';

const STATUS_COLUMNS: TaskStatus[] = ['ASSIGNED', 'AWAITING_CLARIFICATION', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'];
const PRIORITY_OPTIONS: { value: string; label: string }[] = [{ value: '', label: 'All priorities' }, { value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' }];
const STATUS_OPTIONS: { value: string; label: string }[] = [{ value: '', label: 'All statuses' }, ...STATUS_COLUMNS.map((s) => ({ value: s, label: statusLabel(s) }))];
const SORT_BY_OPTIONS: { value: TaskSortBy; label: string }[] = [{ value: 'position', label: 'Position' }, { value: 'dueDate', label: 'Due date' }, { value: 'priority', label: 'Priority' }, { value: 'createdAt', label: 'Created' }];
const SORT_ORDER_OPTIONS: { value: TaskSortOrder; label: string }[] = [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }];

function statusLabel(s: TaskStatus): string { return formatTaskStatusLabel(s); }
function priorityLabel(p: TaskPriority): string { return p.charAt(0) + p.slice(1).toLowerCase(); }
function dateLabel(value: string | null): string { return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—'; }
function shortDate(value: string | null): string { return value ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value)) : ''; }
function initials(name: string): string { return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase(); }
function requestError(cause: unknown, fallback: string): string {
  if (!(cause instanceof ApiRequestError)) return fallback;
  if (cause.status === 403) return 'Your current role does not allow this action.';
  return cause.message;
}
function reviewerRequestError(cause: unknown, fallback: string): string {
  if (cause instanceof ApiRequestError && /reviewer/i.test(cause.message)) return cause.message;
  return requestError(cause, fallback);
}
function monthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startDay);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  return days;
}
function sameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function groupByDate(tasks: TaskSummary[]): Map<string, TaskSummary[]> {
  const groups = new Map<string, TaskSummary[]>();
  for (const task of tasks) {
    const key = task.dueDate ? task.dueDate.slice(0, 10) : '__no_due_date__';
    const list = groups.get(key);
    if (list) list.push(task); else groups.set(key, [task]);
  }
  return groups;
}
function parseSelectOptions(raw: string): CustomFieldOption[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((token) => {
    const [value, label] = token.includes(':') ? [token.split(':')[0].trim(), token.split(':').slice(1).join(':').trim()] : [token, token];
    return { value: value || label, label: label || value };
  }).filter((o) => o.value && o.label);
}
function defaultSavedConfig(): SavedViewConfigV1 { return { version: 1, filters: {}, sort: null, group: null }; }
function applyViewConfig(view: TaskSavedView, setters: { setSearch: (v: string) => void; setStatusFilter: (v: TaskStatus | '') => void; setPriorityFilter: (v: TaskPriority | '') => void; setSortBy: (v: TaskSortBy) => void; setSortOrder: (v: TaskSortOrder) => void; setViewMode: (v: ViewMode) => void; }) {
  const cfg = view.config || defaultSavedConfig();
  const f = (cfg.filters ?? {}) as Record<string, unknown>;
  setters.setSearch(typeof f.search === 'string' ? f.search : '');
  setters.setStatusFilter(typeof f.status === 'string' ? (f.status as TaskStatus) : '');
  setters.setPriorityFilter(typeof f.priority === 'string' ? (f.priority as TaskPriority) : '');
  const sort = (cfg.sort ?? null) as Record<string, unknown> | null;
  if (sort?.by && ['position', 'dueDate', 'priority', 'createdAt'].includes(String(sort.by))) setters.setSortBy(sort.by as TaskSortBy);
  if (sort?.order && ['asc', 'desc'].includes(String(sort.order))) setters.setSortOrder(sort.order as TaskSortOrder);
  if (f.viewMode && ['board', 'list', 'calendar', 'timeline', 'table', 'gantt'].includes(String(f.viewMode))) setters.setViewMode(f.viewMode as ViewMode);
}
function buildCurrentConfig(input: { search: string; statusFilter: TaskStatus | ''; priorityFilter: TaskPriority | ''; sortBy: TaskSortBy; sortOrder: TaskSortOrder; viewMode: ViewMode; }): SavedViewConfigV1 {
  const filters: Record<string, unknown> = { viewMode: input.viewMode };
  if (input.search.trim()) filters.search = input.search.trim();
  if (input.statusFilter) filters.status = input.statusFilter;
  if (input.priorityFilter) filters.priority = input.priorityFilter;
  return { version: 1, filters, sort: { by: input.sortBy, order: input.sortOrder }, group: null };
}

export default function ProjectTasksPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const createParamHandled = useRef(false);
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace, loading: workspaceLoading } = useWorkspaceContext();
  const { can, roleDefinitions, isLoading: permissionsLoading } = usePermissions();
  useWorkspaceRedirect();

  const canView = can('task.view');
  const canCreate = can('task.create');
  const canAssign = can('task.assign');
  const canReassign = can('task.reassign');
  const canDelete = can('task.delete');
  const canComplete = can('task.complete');
  const canUpdate = can('task.update');
  const canManageAssignees = canAssign || canReassign;
  const canManageReviewer = canAssign;
  const canManageProject = can('project.update') || canUpdate;

  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedWorkspaceId, setLoadedWorkspaceId] = useState('');
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [sortBy, setSortBy] = useState<TaskSortBy>('position');
  const [sortOrder, setSortOrder] = useState<TaskSortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  const [customFields, setCustomFields] = useState<ProjectCustomField[]>([]);
  const [taskCustomValues, setTaskCustomValues] = useState<Record<string, Record<string, unknown>>>({});
  const [savedViews, setSavedViews] = useState<TaskSavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createPriority, setCreatePriority] = useState<TaskPriority>('MEDIUM');
  const [createStatus, setCreateStatus] = useState<TaskStatus>('ASSIGNED');
  const [createStartDate, setCreateStartDate] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createLabels, setCreateLabels] = useState('');
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [createTemplateId, setCreateTemplateId] = useState('');
  const [createCustomValues, setCreateCustomValues] = useState<Record<string, unknown>>({});
  const [createReviewerId, setCreateReviewerId] = useState('');

  const [archiveTarget, setArchiveTarget] = useState<TaskSummary | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<TaskSummary | null>(null);
  const [completeTarget, setCompleteTarget] = useState<TaskSummary | null>(null);
  const [reopenTarget, setReopenTarget] = useState<TaskSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaskSummary | null>(null);
  const [assignTarget, setAssignTarget] = useState<TaskSummary | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [taskActionBusy, setTaskActionBusy] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);

  const [showSaveView, setShowSaveView] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const [saveViewShared, setSaveViewShared] = useState(false);

  const [showFieldManager, setShowFieldManager] = useState(false);
  const [fieldName, setFieldName] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldType>('TEXT');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptionsRaw, setFieldOptionsRaw] = useState('');
  const [editingField, setEditingField] = useState<ProjectCustomField | null>(null);

  const [recurrenceTarget, setRecurrenceTarget] = useState<TaskSummary | null>(null);
  const [recurrence, setRecurrence] = useState<TaskRecurrenceRule | null>(null);
  const [recurrenceLoading, setRecurrenceLoading] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<TaskRecurrenceFrequency>('WEEKLY');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([1]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | ''>('');
  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState('');
  const [recurrenceMax, setRecurrenceMax] = useState<number | ''>('');
  const [recurrenceActive, setRecurrenceActive] = useState(true);

  const [cfEditTask, setCfEditTask] = useState<TaskSummary | null>(null);
  const [cfEditValues, setCfEditValues] = useState<Record<string, unknown>>({});
  const [cfEditBusy, setCfEditBusy] = useState(false);

  const [calendarDate, setCalendarDate] = useState(() => new Date());

  const latestLoad = useRef(0);
  const activeWorkspaceIdRef = useRef<string | undefined>(activeWorkspace?.id);
  useEffect(() => { activeWorkspaceIdRef.current = activeWorkspace?.id; }, [activeWorkspace?.id]);

  const loadAdvancedMeta = useCallback(async () => {
    if (!activeWorkspace || !canView) return;
    try {
      const [fields, views, templates] = await Promise.all([
        listProjectCustomFields(activeWorkspace.id, projectId).catch(() => [] as ProjectCustomField[]),
        listTaskSavedViews(activeWorkspace.id, projectId).catch(() => [] as TaskSavedView[]),
        listTaskTemplates(activeWorkspace.id, projectId).catch(() => [] as TaskTemplate[]),
      ]);
      setCustomFields(fields); setSavedViews(views); setTaskTemplates(templates);
    } catch {}
  }, [activeWorkspace, projectId, canView]);

  const loadTaskCustomValues = useCallback(async (taskIds: string[]) => {
    if (!activeWorkspace || taskIds.length === 0) return;
    const entries = await Promise.all(taskIds.map(async (id) => {
      try {
        const rows = await getTaskCustomFieldValues(activeWorkspace.id, projectId, id);
        const map: Record<string, unknown> = {};
        for (const r of rows) map[r.fieldId] = r.value;
        return [id, map] as const;
      } catch { return [id, {} as Record<string, unknown>] as const; }
    }));
    setTaskCustomValues((prev) => { const next = { ...prev }; for (const [id, map] of entries) next[id] = { ...(next[id] ?? {}), ...map }; return next; });
  }, [activeWorkspace, projectId]);

  const load = useCallback(async (append = false) => {
    if (!activeWorkspace || !canView) { setLoading(false); return; }
    if (activeWorkspace.id !== activeWorkspaceIdRef.current) return;
    const loadId = ++latestLoad.current;
    if (!append) { setTasks([]); setNextCursor(null); setLoadedWorkspaceId(''); setAccessStatus(null); setError(null); }
    setLoading(true);
    try {
      const cursor = append ? nextCursor ?? undefined : undefined;
      const query: ListTasksQuery = { cursor, limit: 25, ...(search.trim() ? { search: search.trim() } : {}), ...(statusFilter ? { status: statusFilter } : {}), ...(priorityFilter ? { priority: priorityFilter } : {}), sortBy, sortOrder, includeArchived: includeArchived || undefined };
      const page: TaskPage = await listTasks(activeWorkspace.id, projectId, query);
      if (loadId !== latestLoad.current) return;
      setTasks((current) => append ? [...current, ...page.items] : page.items);
      setNextCursor(page.nextCursor); setLoadedWorkspaceId(activeWorkspace.id);
      void loadTaskCustomValues(page.items.map((t) => t.id));
    } catch (cause) {
      if (loadId !== latestLoad.current) return;
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) setAccessStatus(cause.status);
      else setError(requestError(cause, 'Tasks could not be loaded.'));
    } finally { if (loadId === latestLoad.current) setLoading(false); }
  }, [activeWorkspace, projectId, canView, search, statusFilter, priorityFilter, sortBy, sortOrder, includeArchived, nextCursor, loadTaskCustomValues]);

  useEffect(() => { if (!activeWorkspace || !canView) return; let active = true; void Promise.resolve().then(() => { if (active) { void load(); void loadAdvancedMeta(); } }); return () => { active = false; }; }, [activeWorkspace, canView]);
  useEffect(() => { if (!activeWorkspace || !canManageAssignees) return; let active = true; void listProjectMembers(activeWorkspace.id, projectId).then((list) => { if (active) setMembers(list); }).catch(() => {}); return () => { active = false; }; }, [activeWorkspace, projectId, canManageAssignees]);
  useEffect(() => {
    if (permissionsLoading || !canCreate || searchParams.get('create') !== '1' || createParamHandled.current) return;
    createParamHandled.current = true;
    setShowCreate(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('create');
    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [canCreate, pathname, permissionsLoading, router, searchParams]);

  const sortedVisibleTasks = useMemo(() => tasks, [tasks]);

  const reviewerRoles = useMemo(
    () => new Set(roleDefinitions.filter((definition) => definition.permissions.includes('submission.review') || definition.permissions.includes('submission.approve')).map((definition) => definition.role)),
    [roleDefinitions],
  );
  const reviewerOptions = useMemo(
    () => [{ value: '', label: 'No reviewer' }, ...members.filter((member) => reviewerRoles.has(member.role)).map((member) => ({ value: member.user.id, label: member.user.name }))],
    [members, reviewerRoles],
  );

  function resetCreateForm() { setCreateTitle(''); setCreateDescription(''); setCreatePriority('MEDIUM'); setCreateStatus('ASSIGNED'); setCreateStartDate(''); setCreateDueDate(''); setCreateLabels(''); setCreateErrors({}); setCreateTemplateId(''); setCreateCustomValues({}); setCreateReviewerId(''); }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!activeWorkspace) return;
    if (createTemplateId) {
      setBusy(true); setError(null);
      try {
        await createTaskFromTemplate(activeWorkspace.id, projectId, createTemplateId, { ...(createTitle.trim() ? { title: createTitle.trim() } : {}), ...(createStartDate ? { startDate: new Date(`${createStartDate}T00:00:00.000Z`).toISOString() } : {}), ...(createDueDate ? { dueDate: new Date(`${createDueDate}T00:00:00.000Z`).toISOString() } : {}) });
        setShowCreate(false); resetCreateForm(); setNotice('Task created from template.'); await load(); await loadAdvancedMeta();
      } catch (cause) { setError(requestError(cause, 'Task could not be created from template.')); } finally { setBusy(false); }
      return;
    }
    const parsed = createSchema.safeParse({ title: createTitle, description: createDescription.trim() || undefined, priority: createPriority, status: createStatus, startDate: createStartDate || undefined, dueDate: createDueDate || undefined, labels: createLabels || undefined });
    if (!parsed.success) { const errors: Record<string, string> = {}; for (const issue of parsed.error.issues) errors[issue.path[0] as string] = issue.message; setCreateErrors(errors); return; }
    setBusy(true); setError(null); setCreateErrors({});
    try {
      const input: CreateTaskInput = { title: parsed.data.title, ...(parsed.data.description ? { description: parsed.data.description } : {}), status: parsed.data.status, priority: parsed.data.priority, ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}), ...(parsed.data.dueDate ? { dueDate: parsed.data.dueDate } : {}), ...(parsed.data.labels ? { labels: parsed.data.labels.split(',').map((l) => l.trim()).filter(Boolean) } : {}), ...(canManageReviewer && createReviewerId ? { reviewerId: createReviewerId } : {}) };
      const created = await createTask(activeWorkspace.id, projectId, input);
      const cfPairs = Object.entries(createCustomValues).filter(([, v]) => v !== null && v !== undefined && v !== '');
      if (cfPairs.length > 0) { try { await setTaskCustomFieldValues(activeWorkspace.id, projectId, created.id, cfPairs.map(([fieldId, value]) => ({ fieldId, value }))); } catch {} }
      setShowCreate(false); resetCreateForm(); setNotice('Task created.'); await load();
    } catch (cause) { setError(reviewerRequestError(cause, 'Task could not be created.')); } finally { setBusy(false); }
  }

  async function handleArchive() { if (!activeWorkspace || !archiveTarget) return; setBusy(true); setError(null); try { await archiveTask(activeWorkspace.id, projectId, archiveTarget.id); setArchiveTarget(null); setNotice(`Task ${archiveTarget.key} archived.`); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be archived.')); } finally { setBusy(false); } }
  async function handleRestore() { if (!activeWorkspace || !restoreTarget) return; setBusy(true); setError(null); try { await restoreTask(activeWorkspace.id, projectId, restoreTarget.id); setRestoreTarget(null); setNotice(`Task ${restoreTarget.key} restored.`); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be restored.')); } finally { setBusy(false); } }
  async function handleComplete() { if (!activeWorkspace || !completeTarget) return; setBusy(true); setError(null); try { await completeTask(activeWorkspace.id, projectId, completeTarget.id); setCompleteTarget(null); setNotice(`Task ${completeTarget.key} completed.`); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be completed.')); } finally { setBusy(false); } }
  async function handleReopen() { if (!activeWorkspace || !reopenTarget) return; setBusy(true); setError(null); try { await reopenTask(activeWorkspace.id, projectId, reopenTarget.id); setReopenTarget(null); setNotice(`Task ${reopenTarget.key} reopened.`); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be reopened.')); } finally { setBusy(false); } }
  async function handleDelete() { if (!activeWorkspace || !deleteTarget) return; setTaskActionBusy(true); setError(null); try { await deleteTask(activeWorkspace.id, projectId, deleteTarget.id); setDeleteTarget(null); setNotice(`Task ${deleteTarget.key} deleted.`); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be deleted.')); } finally { setTaskActionBusy(false); } }
  async function handleAddAssignee(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!activeWorkspace || !assignTarget || !assignUserId) return; setTaskActionBusy(true); setError(null); try { await addAssignee(activeWorkspace.id, projectId, assignTarget.id, assignUserId); setAssignUserId(''); setNotice('Assignee added.'); await load(); } catch (cause) { setError(requestError(cause, 'Assignee could not be added.')); } finally { setTaskActionBusy(false); } }
  async function handleRemoveAssignee(userId: string) { if (!activeWorkspace || !assignTarget) return; setTaskActionBusy(true); setError(null); try { await removeAssignee(activeWorkspace.id, projectId, assignTarget.id, userId); setNotice('Assignee removed.'); await load(); } catch (cause) { setError(requestError(cause, 'Assignee could not be removed.')); } finally { setTaskActionBusy(false); } }
  async function handleReschedule(taskId: string, startDate: string | null, dueDate: string | null) { if (!activeWorkspace) return; setBusy(true); setError(null); try { await updateTask(activeWorkspace.id, projectId, taskId, { startDate, dueDate }); setNotice('Task rescheduled.'); await load(); } catch (cause) { setError(requestError(cause, 'Task could not be rescheduled.')); } finally { setBusy(false); } }

  async function handleSaveCurrentView() { if (!activeWorkspace || !saveViewName.trim()) return; setBusy(true); setError(null); try { const config = buildCurrentConfig({ search, statusFilter, priorityFilter, sortBy, sortOrder, viewMode }); if (activeViewId) { await updateTaskSavedView(activeWorkspace.id, projectId, activeViewId, { name: saveViewName.trim(), isShared: saveViewShared, config }); setNotice('Saved view updated.'); } else { const created = await createTaskSavedView(activeWorkspace.id, projectId, { name: saveViewName.trim(), isShared: saveViewShared, config }); setActiveViewId(created.id); setNotice('View saved.'); } setShowSaveView(false); setSaveViewName(''); await loadAdvancedMeta(); } catch (cause) { setError(requestError(cause, 'Saved view could not be saved.')); } finally { setBusy(false); } }
  async function handleDeleteView(view: TaskSavedView) { if (!activeWorkspace) return; setBusy(true); setError(null); try { await deleteTaskSavedView(activeWorkspace.id, projectId, view.id); if (activeViewId === view.id) setActiveViewId(null); setNotice('Saved view deleted.'); await loadAdvancedMeta(); } catch (cause) { setError(requestError(cause, 'Saved view could not be deleted.')); } finally { setBusy(false); } }

  function resetFieldForm() { setFieldName(''); setFieldType('TEXT'); setFieldRequired(false); setFieldOptionsRaw(''); setEditingField(null); }
  async function handleSaveFieldDef(event: FormEvent) { event.preventDefault(); if (!activeWorkspace || !fieldName.trim()) return; setBusy(true); setError(null); try { const options = (fieldType === 'SELECT' || fieldType === 'MULTI_SELECT') ? parseSelectOptions(fieldOptionsRaw) : undefined; if (editingField) { await updateProjectCustomField(activeWorkspace.id, projectId, editingField.id, { name: fieldName.trim(), required: fieldRequired, ...(options !== undefined ? { options } : {}) }); setNotice('Custom field updated.'); } else { await createProjectCustomField(activeWorkspace.id, projectId, { name: fieldName.trim(), type: fieldType, required: fieldRequired, ...(options ? { options } : {}) }); setNotice('Custom field created.'); } resetFieldForm(); await loadAdvancedMeta(); } catch (cause) { setError(requestError(cause, 'Custom field could not be saved.')); } finally { setBusy(false); } }
  async function handleDeleteFieldDef(field: ProjectCustomField) { if (!activeWorkspace) return; setBusy(true); setError(null); try { await deleteProjectCustomField(activeWorkspace.id, projectId, field.id); setNotice('Custom field deleted.'); await loadAdvancedMeta(); await load(); } catch (cause) { setError(requestError(cause, 'Custom field could not be deleted.')); } finally { setBusy(false); } }

  function openCfEditor(task: TaskSummary) { setCfEditTask(task); setCfEditValues({ ...(taskCustomValues[task.id] ?? {}) }); }
  async function saveCfEditor() { if (!activeWorkspace || !cfEditTask) return; setCfEditBusy(true); setError(null); try { const values = customFields.map((f) => ({ fieldId: f.id, value: cfEditValues[f.id] ?? null })); await setTaskCustomFieldValues(activeWorkspace.id, projectId, cfEditTask.id, values); setTaskCustomValues((prev) => ({ ...prev, [cfEditTask.id]: { ...(prev[cfEditTask.id] ?? {}), ...cfEditValues } })); setNotice('Custom field values saved.'); setCfEditTask(null); } catch (cause) { setError(requestError(cause, 'Custom field values could not be saved.')); } finally { setCfEditBusy(false); } }

  async function openRecurrence(task: TaskSummary) { if (!activeWorkspace) return; setRecurrenceTarget(task); setRecurrence(null); setRecurrenceLoading(true); try { const rule = await getTaskRecurrence(activeWorkspace.id, projectId, task.id); setRecurrence(rule); setRecurrenceFrequency(rule.frequency); setRecurrenceInterval(rule.interval || 1); setRecurrenceDays(rule.daysOfWeek || []); setRecurrenceDayOfMonth(rule.dayOfMonth ?? ''); setRecurrenceEndsAt(rule.endsAt ? rule.endsAt.slice(0, 10) : ''); setRecurrenceMax(rule.maxOccurrences ?? ''); setRecurrenceActive(rule.active); } catch { setRecurrence(null); setRecurrenceFrequency('WEEKLY'); setRecurrenceInterval(1); setRecurrenceDays([1]); setRecurrenceDayOfMonth(''); setRecurrenceEndsAt(''); setRecurrenceMax(''); setRecurrenceActive(true); } finally { setRecurrenceLoading(false); } }
  async function saveRecurrence() { if (!activeWorkspace || !recurrenceTarget) return; setBusy(true); setError(null); try { await upsertTaskRecurrence(activeWorkspace.id, projectId, recurrenceTarget.id, { frequency: recurrenceFrequency, interval: Math.max(1, recurrenceInterval || 1), daysOfWeek: recurrenceFrequency === 'WEEKLY' ? recurrenceDays : [], dayOfMonth: recurrenceFrequency === 'MONTHLY' ? (recurrenceDayOfMonth === '' ? null : Number(recurrenceDayOfMonth)) : null, endsAt: recurrenceEndsAt ? new Date(`${recurrenceEndsAt}T23:59:59.000Z`).toISOString() : null, maxOccurrences: recurrenceMax === '' ? null : Number(recurrenceMax), active: recurrenceActive }); setNotice('Recurrence settings saved.'); setRecurrenceTarget(null); await load(); } catch (cause) { setError(requestError(cause, 'Recurrence settings could not be saved.')); } finally { setBusy(false); } }
  async function removeRecurrence() { if (!activeWorkspace || !recurrenceTarget) return; setBusy(true); setError(null); try { await deleteTaskRecurrence(activeWorkspace.id, projectId, recurrenceTarget.id); setNotice('Recurrence removed.'); setRecurrenceTarget(null); await load(); } catch (cause) { setError(requestError(cause, 'Recurrence could not be removed.')); } finally { setBusy(false); } }
  async function triggerRecurrenceGenerate() { if (!activeWorkspace || !recurrenceTarget) return; setBusy(true); setError(null); try { await generateTaskRecurrenceInstance(activeWorkspace.id, projectId, recurrenceTarget.id); setNotice('Recurrence instance generated.'); await load(); } catch (cause) { setError(requestError(cause, 'Could not generate recurrence instance.')); } finally { setBusy(false); } }

  const taskDetailHref = (taskId: string) => `/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}`;
  const currentAssignTarget = assignTarget ? tasks.find((t) => t.id === assignTarget.id) ?? assignTarget : null;
  const assignedIds = new Set(currentAssignTarget?.assignees.map((a) => a.userId) ?? []);
  const assignableMembers = members.filter((m) => !assignedIds.has(m.userId)).map((m) => ({ value: m.userId, label: `${m.user.name} · ${m.user.email}` }));

  function taskActionItems(task: TaskSummary): DropdownItem[] {
    const items: DropdownItem[] = [];
    if (canManageAssignees) items.push({ id: 'assign', label: 'Manage assignees', onSelect: () => { setAssignTarget(task); setAssignUserId(''); } });
    if (canUpdate) items.push({ id: 'custom-fields', label: 'Edit custom fields', onSelect: () => openCfEditor(task) });
    if (canUpdate) items.push({ id: 'recurrence', label: 'Recurrence settings', onSelect: () => void openRecurrence(task) });
    if (canComplete) items.push({ id: 'complete', label: task.status === 'APPROVED' ? 'Reopen task' : 'Mark complete', onSelect: () => (task.status === 'APPROVED' ? setReopenTarget(task) : setCompleteTarget(task)) });
    if (canUpdate) items.push({ id: 'archive', label: task.archivedAt ? 'Restore task' : 'Archive task', onSelect: () => (task.archivedAt ? setRestoreTarget(task) : setArchiveTarget(task)) });
    if (canDelete) items.push({ id: 'delete', label: 'Delete task', destructive: true, separatorBefore: items.length > 0, onSelect: () => setDeleteTarget(task) });
    return items;
  }

  const isLoading = loading && loadedWorkspaceId !== activeWorkspace?.id;

  if (workspaceLoading) return <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8"><p role="status" className="text-sm text-[var(--color-text-secondary)]">Loading workspace…</p></div>;
  if (!activeWorkspace) return <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8"><EmptyState title="Choose a workspace" description="Select a workspace to view and manage its tasks." action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>} /></div>;
  if (permissionsLoading) return <div className="mx-auto w-full max-w-6xl space-y-3 px-5 py-8 sm:px-8" role="status" aria-label="Loading tasks"><Skeleton className="h-10 w-1/3 rounded-lg" /><Skeleton className="h-20 w-full rounded-lg" /><Skeleton className="h-64 w-full rounded-lg" /></div>;
  if (!canView) return <PageAccessState description="Your project role does not include access to the task list." backHref={`/app/projects/${encodeURIComponent(projectId)}`} />;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-5 py-8 sm:px-8">
      <PageHeader title="Tasks" description="Create, track, and manage tasks. Use board, list, calendar, timeline, table, and Gantt views with saved views, custom fields, recurrence, and templates." actions={<div className="flex flex-wrap gap-2">{canManageProject && <Button variant="secondary" onClick={() => setShowFieldManager(true)}>Custom fields</Button>}<PermissionButton permission="task.create" onClick={() => setShowCreate(true)} deniedReason="Your project role cannot create tasks.">New task</PermissionButton></div>} />

      {error && <Alert variant="error" title="Could not complete request">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}
      {accessStatus && <AccessState status={accessStatus} onRetry={() => void load()} />}

      {!accessStatus && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Saved views:</span>
            <button type="button" onClick={() => { setActiveViewId(null); setSearch(''); setStatusFilter(''); setPriorityFilter(''); setSortBy('position'); setSortOrder('asc'); setViewMode('board'); }} className={`rounded-[var(--radius-md)] px-2.5 py-1 text-sm ${activeViewId === null ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-secondary)]'}`}>Default</button>
            {savedViews.map((v) => (
              <div key={v.id} className={`inline-flex items-center gap-1 rounded-[var(--radius-md)] border ${activeViewId === v.id ? 'border-[var(--color-primary)]' : 'border-transparent'}`}>
                <button type="button" onClick={() => { setActiveViewId(v.id); setSaveViewName(v.name); setSaveViewShared(v.isShared); applyViewConfig(v, { setSearch, setStatusFilter, setPriorityFilter, setSortBy, setSortOrder, setViewMode }); setTimeout(() => void load(), 0); }} className={`px-2.5 py-1 text-sm rounded-l-[var(--radius-md)] ${activeViewId === v.id ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-secondary)]'}`} title={v.isShared ? 'Shared view' : 'Private view'}>{v.name}{v.isShared ? ' · shared' : ''}</button>
                <button type="button" onClick={() => void handleDeleteView(v)} className="px-1.5 py-1 text-xs hover:bg-[var(--color-surface-secondary)] rounded-r-[var(--radius-md)]" aria-label={`Delete view ${v.name}`}>×</button>
              </div>
            ))}
            <div className="ml-auto flex gap-2"><Button size="sm" variant="secondary" onClick={() => { setSaveViewName(activeViewId ? (savedViews.find((v) => v.id === activeViewId)?.name ?? '') : ''); setSaveViewShared(Boolean(savedViews.find((v) => v.id === activeViewId)?.isShared)); setShowSaveView(true); }}>{activeViewId ? 'Update view' : 'Save view'}</Button></div>
          </div>
        </Card>
      )}

      {!accessStatus && (
        <Card className="p-4">
          <form className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter tasks" onSubmit={(e) => { e.preventDefault(); void load(); }}>
            <div className="flex-1 min-w-40"><Input id="task-search" label="Search" placeholder="Task title or key…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="min-w-36"><Select id="status-filter" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')} options={STATUS_OPTIONS} /></div>
            <div className="min-w-36"><Select id="priority-filter" label="Priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')} options={PRIORITY_OPTIONS} /></div>
            <div className="min-w-32"><Select id="sort-by" label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as TaskSortBy)} options={SORT_BY_OPTIONS} /></div>
            <div className="min-w-32"><Select id="sort-order" label="Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as TaskSortOrder)} options={SORT_ORDER_OPTIONS} /></div>
            <div className="flex items-center gap-2 pb-1"><input type="checkbox" id="include-archived-tasks" checked={includeArchived} onChange={(e) => setIncludeArchived(e.target.checked)} className="h-4 w-4 rounded border border-[var(--color-border)]" /><label htmlFor="include-archived-tasks" className="text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">Include archived</label></div>
            <Button type="submit" variant="secondary" loading={isLoading}>Search</Button>
          </form>
        </Card>
      )}

      {!accessStatus && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Task view">
          {(['board', 'list', 'calendar', 'timeline', 'table', 'gantt'] as ViewMode[]).map((mode) => (
            <button key={mode} role="tab" aria-selected={viewMode === mode} onClick={() => setViewMode(mode)} className={['inline-flex h-9 items-center rounded-[var(--radius-md)] px-3 text-sm font-medium capitalize transition-colors', viewMode === mode ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]'].join(' ')}>{mode}</button>
          ))}
        </div>
      )}

      {!accessStatus && (
        <>
          {isLoading ? <div className="space-y-3" aria-label="Loading tasks" role="status">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          : tasks.length === 0 ? <EmptyState title="No tasks found" description={search || statusFilter || priorityFilter ? 'No tasks match the current filters.' : 'Create your first task or create from a template to get started.'} action={!search && !statusFilter && !priorityFilter && canCreate ? <Button onClick={() => setShowCreate(true)}>Create task</Button> : undefined} />
          : (
            <>
              {viewMode === 'board' && (
                <div className="overflow-x-auto pb-2"><div className="flex gap-4 min-w-max">
                  {STATUS_COLUMNS.map((status) => {
                    const columnTasks = sortedVisibleTasks.filter((t) => t.status === status);
                    return (
                      <div key={status} className="flex w-72 shrink-0 flex-col gap-2" role="group" aria-label={`${statusLabel(status)} column`}>
                        <div className="flex items-center justify-between rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] px-3 py-2"><div className="flex items-center gap-2"><Badge variant={status}>{statusLabel(status)}</Badge><span className="text-xs text-[var(--color-text-muted)]">{columnTasks.length}</span></div></div>
                        <div className="flex flex-col gap-2">
                          {columnTasks.length === 0 ? <p className="px-3 py-4 text-center text-xs text-[var(--color-text-muted)]">No tasks</p> : columnTasks.map((task) => {
                            const actions = taskActionItems(task);
                            return (
                              <div key={task.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-md">
                                <Link href={taskDetailHref(task.id)} className="block rounded-t-[var(--radius-md)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]">
                                  <div className="flex items-start justify-between gap-2"><span className="font-mono text-xs text-[var(--color-text-muted)]">{task.key}</span><Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge></div>
                                  <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">{task.title}</p>
                                  <div className="mt-2 flex items-center justify-between"><div className="flex -space-x-1.5">{task.assignees.slice(0, 3).map((a) => <span key={a.userId} title={a.user.name} className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] font-medium text-[var(--color-text-secondary)]">{initials(a.user.name)}</span>)}{task.assignees.length > 3 && <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] text-[var(--color-text-muted)]">+{task.assignees.length - 3}</span>}</div>{task.dueDate && <span className="text-xs text-[var(--color-text-muted)]">{shortDate(task.dueDate)}</span>}</div>
                                </Link>
                                {actions.length > 0 && <div className="flex items-center justify-end border-t border-[var(--color-border)] px-2 py-1"><Dropdown items={actions} label={`Actions for ${task.key}`} triggerLabel={`Actions for ${task.key}`} align="end" triggerClassName="h-7 px-2 text-xs">Actions</Dropdown></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div></div>
              )}

              {viewMode === 'list' && (
                <Card className="p-0 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[var(--color-border)] text-left"><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Key</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)]">Title</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Status</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Priority</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Assignees</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Due date</th><th className="px-4 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{sortedVisibleTasks.map((task) => { const actions = taskActionItems(task); return (<tr key={task.id} className="hover:bg-[var(--color-surface-secondary)] transition-colors"><td className="px-4 py-2.5"><Link href={taskDetailHref(task.id)} className="font-mono text-xs text-[var(--color-primary)] hover:underline">{task.key}</Link></td><td className="px-4 py-2.5"><Link href={taskDetailHref(task.id)} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] hover:underline">{task.title}</Link>{task.archivedAt && <span className="ml-2 text-xs text-[var(--color-text-muted)]">(archived)</span>}</td><td className="px-4 py-2.5 whitespace-nowrap"><Badge variant={task.status}>{statusLabel(task.status)}</Badge></td><td className="px-4 py-2.5 whitespace-nowrap"><Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge></td><td className="px-4 py-2.5"><div className="flex -space-x-1.5">{task.assignees.length === 0 ? <span className="text-xs text-[var(--color-text-muted)]">—</span> : <>{task.assignees.slice(0, 3).map((a) => <span key={a.userId} title={a.user.name} className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] font-medium text-[var(--color-text-secondary)]">{initials(a.user.name)}</span>)}{task.assignees.length > 3 && <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-surface)] bg-[var(--color-surface-secondary)] text-[10px] text-[var(--color-text-muted)]">+{task.assignees.length - 3}</span>}</>}</div></td><td className="px-4 py-2.5 whitespace-nowrap text-[var(--color-text-secondary)]">{dateLabel(task.dueDate)}</td><td className="px-4 py-2.5 whitespace-nowrap">{actions.length === 0 ? <span className="text-xs text-[var(--color-text-muted)]">—</span> : <Dropdown items={actions} label={`Actions for ${task.key}`} triggerLabel={`Actions for ${task.key}`} align="end" triggerClassName="h-7 px-2 text-xs">Actions</Dropdown>}</td></tr>); })}</tbody></table></div></Card>
              )}

              {viewMode === 'table' && (
                <Card className="p-0 overflow-hidden">
                  <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-[var(--color-border)] text-left"><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Key</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Title</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Status</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Priority</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Assignees</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Start</th><th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Due</th>{customFields.map((f) => <th key={f.id} className="px-3 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">{f.name}</th>)}<th className="px-3 py-2 font-medium text-[var(--color-text-secondary)]">Actions</th></tr></thead><tbody className="divide-y divide-[var(--color-border)]">{sortedVisibleTasks.map((task) => { const actions = taskActionItems(task); const vals = taskCustomValues[task.id] ?? {}; return (<tr key={task.id} className="hover:bg-[var(--color-surface-secondary)]"><td className="px-3 py-2 font-mono text-xs"><Link href={taskDetailHref(task.id)} className="text-[var(--color-primary)] hover:underline">{task.key}</Link></td><td className="px-3 py-2 font-medium">{task.title}</td><td className="px-3 py-2"><Badge variant={task.status}>{statusLabel(task.status)}</Badge></td><td className="px-3 py-2"><Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge></td><td className="px-3 py-2">{task.assignees.length ? task.assignees.map((a) => a.user.name).join(', ') : '—'}</td><td className="px-3 py-2 whitespace-nowrap">{dateLabel(task.startDate)}</td><td className="px-3 py-2 whitespace-nowrap">{dateLabel(task.dueDate)}</td>{customFields.map((f) => <td key={f.id} className="px-3 py-2 text-[var(--color-text-secondary)]">{formatCustomFieldValue(f, vals[f.id])}</td>)}<td className="px-3 py-2"><div className="flex items-center gap-2">{canUpdate && <Button size="sm" variant="ghost" onClick={() => openCfEditor(task)}>Fields</Button>}{actions.length > 0 && <Dropdown items={actions} label={`Actions for ${task.key}`} triggerLabel={`Actions for ${task.key}`} align="end" triggerClassName="h-7 px-2 text-xs">Actions</Dropdown>}</div></td></tr>); })}</tbody></table></div>
                  {customFields.length === 0 && <p className="px-4 py-3 text-xs text-[var(--color-text-muted)]">No custom fields defined yet. Use “Custom fields” to add project fields and show them as columns.</p>}
                </Card>
              )}

              {viewMode === 'gantt' && <TaskGanttView tasks={sortedVisibleTasks} canEdit={canUpdate} onOpenTask={(id) => router.push(taskDetailHref(id))} onReschedule={handleReschedule} />}

              {viewMode === 'calendar' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><h3 className="text-base font-semibold">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(calendarDate)}</h3><div className="flex gap-1"><Button size="sm" variant="secondary" onClick={() => setCalendarDate((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))} aria-label="Previous month">←</Button><Button size="sm" variant="secondary" onClick={() => setCalendarDate(new Date())}>Today</Button><Button size="sm" variant="secondary" onClick={() => setCalendarDate((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))} aria-label="Next month">→</Button></div></div>
                  <Card className="p-0 overflow-hidden"><div className="grid grid-cols-7 border-b border-[var(--color-border)]">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-1 py-2 text-center text-xs font-medium text-[var(--color-text-muted)]"><span className="hidden sm:inline">{day}</span><span className="sm:hidden">{day[0]}</span></div>)}</div><div className="grid grid-cols-7">{monthGrid(calendarDate.getFullYear(), calendarDate.getMonth()).map((day) => { const isCurrentMonth = day.getMonth() === calendarDate.getMonth(); const dayTasks = tasks.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), day)); return (<div key={day.toISOString()} className={['min-h-16 border-b border-r border-[var(--color-border)] p-1 sm:min-h-24', isCurrentMonth ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface-secondary)]', day.getDay() === 6 ? 'border-r-0' : ''].join(' ')}><span className={['text-xs', sameDay(day, new Date()) ? 'flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] text-white font-medium' : 'text-[var(--color-text-muted)]'].join(' ')}>{day.getDate()}</span><div className="mt-0.5 flex flex-col gap-0.5">{dayTasks.slice(0, 3).map((task) => <Link key={task.id} href={taskDetailHref(task.id)} className="block truncate rounded bg-[var(--color-surface-secondary)] px-1 py-0.5 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] sm:text-xs"><span className="font-mono">{task.key}</span> {task.title}</Link>)}{dayTasks.length > 3 && <span className="px-1 text-[10px] text-[var(--color-text-muted)]">+{dayTasks.length - 3} more</span>}</div></div>); })}</div></Card>
                </div>
              )}

              {viewMode === 'timeline' && <div className="space-y-4">{(() => { const groups = groupByDate(tasks); const sortedKeys = [...groups.keys()].sort((a, b) => { if (a === '__no_due_date__') return 1; if (b === '__no_due_date__') return -1; return a.localeCompare(b); }); return sortedKeys.map((key) => { const groupTasks = groups.get(key)!; const isNoDue = key === '__no_due_date__'; return (<div key={key}><h4 className="mb-2 text-sm font-semibold text-[var(--color-text-secondary)]">{isNoDue ? 'No due date' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(key))}<span className="ml-2 text-xs text-[var(--color-text-muted)]">({groupTasks.length})</span></h4><div className="flex flex-col gap-2">{groupTasks.map((task) => <Link key={task.id} href={taskDetailHref(task.id)} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="font-mono text-xs text-[var(--color-text-muted)] whitespace-nowrap">{task.key}</span><span className="truncate text-sm font-medium text-[var(--color-text-primary)]">{task.title}</span></div><Badge variant={task.status}>{statusLabel(task.status)}</Badge><Badge variant={task.priority}>{priorityLabel(task.priority)}</Badge></Link>)}</div></div>); }); })()}</div>}

              {nextCursor && <div className="flex justify-center pt-2"><Button variant="secondary" loading={loading} onClick={() => void load(true)}>Load more</Button></div>}
            </>
          )}
        </>
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); resetCreateForm(); }} title="New task">
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <div><label htmlFor="create-task-template" className="block text-sm font-medium text-[var(--color-text-primary)]">Task template <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label><select id="create-task-template" value={createTemplateId} onChange={(e) => setCreateTemplateId(e.target.value)} className="mt-1 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"><option value="">None — create manually</option>{taskTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{createTemplateId && <p className="mt-1 text-xs text-[var(--color-text-muted)]">When using a template, title/dates below can override template defaults.</p>}</div>
          <Input id="create-task-title" label={createTemplateId ? 'Title override (optional)' : 'Title'} value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} required={!createTemplateId} minLength={createTemplateId ? undefined : 2} maxLength={200} errorMessage={createErrors.title} />
          {!createTemplateId && (<><Textarea id="create-task-description" label="Description (optional)" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} maxLength={10000} rows={3} errorMessage={createErrors.description} /><div className="grid grid-cols-2 gap-4"><Select id="create-task-priority" label="Priority" value={createPriority} onChange={(e) => setCreatePriority(e.target.value as TaskPriority)} options={[{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }, { value: 'URGENT', label: 'Urgent' }]} /><Select id="create-task-status" label="Status" value={createStatus} onChange={(e) => setCreateStatus(e.target.value as TaskStatus)} options={STATUS_COLUMNS.filter((s) => s !== 'AWAITING_CLARIFICATION').map((s) => ({ value: s, label: statusLabel(s) }))} /></div><Input id="create-task-labels" label="Labels (optional)" placeholder="e.g. bug, frontend, urgent" value={createLabels} onChange={(e) => setCreateLabels(e.target.value)} helperText="Comma-separated labels" />{canManageReviewer && <Select id="create-task-reviewer" label="Reviewer (optional)" value={createReviewerId} onChange={(e) => setCreateReviewerId(e.target.value)} options={reviewerOptions} helperText="Eligible reviewers are project members with review or approval permission." />}{customFields.length > 0 && <div className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"><p className="text-sm font-medium text-[var(--color-text-primary)]">Custom fields</p>{customFields.map((f) => <CustomFieldInput key={f.id} field={f} idPrefix="create-cf" value={createCustomValues[f.id] ?? null} onChange={(v) => setCreateCustomValues((prev) => ({ ...prev, [f.id]: v }))} />)}</div>}</>)}
          <div className="grid grid-cols-2 gap-4"><div><label htmlFor="create-task-start-date" className="block text-sm font-medium text-[var(--color-text-primary)]">Start date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label><input id="create-task-start-date" type="date" value={createStartDate} onChange={(e) => setCreateStartDate(e.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" /></div><div><label htmlFor="create-task-due-date" className="block text-sm font-medium text-[var(--color-text-primary)]">Due date <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label><input id="create-task-due-date" type="date" value={createDueDate} onChange={(e) => setCreateDueDate(e.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]" />{createErrors.dueDate && <p className="mt-1 text-xs text-[var(--color-error)]">{createErrors.dueDate}</p>}</div></div>
          <div className="flex justify-end gap-3 pt-2"><Button type="button" variant="secondary" onClick={() => { setShowCreate(false); resetCreateForm(); }}>Cancel</Button><Button type="submit" loading={busy}>{createTemplateId ? 'Create from template' : 'Create task'}</Button></div>
        </form>
      </Modal>

      <Modal open={showSaveView} onClose={() => setShowSaveView(false)} title={activeViewId ? 'Update saved view' : 'Save current view'}><div className="space-y-4"><Input id="save-view-name" label="View name" value={saveViewName} onChange={(e) => setSaveViewName(e.target.value)} required /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveViewShared} onChange={(e) => setSaveViewShared(e.target.checked)} className="h-4 w-4 rounded border border-[var(--color-border)]" /> Shared with project members (project admins can manage shared views)</label><div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowSaveView(false)}>Cancel</Button><Button onClick={() => void handleSaveCurrentView()} disabled={!saveViewName.trim()} loading={busy}>Save</Button></div></div></Modal>

      <Modal open={showFieldManager} onClose={() => { setShowFieldManager(false); resetFieldForm(); }} title="Project custom fields">
        <div className="space-y-4">
          <form onSubmit={(e) => void handleSaveFieldDef(e)} className="space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
            <p className="text-sm font-medium">{editingField ? 'Edit field' : 'Add field'}</p>
            <Input id="cf-name" label="Field name" value={fieldName} onChange={(e) => setFieldName(e.target.value)} required />
            {!editingField && <Select id="cf-type" label="Type" value={fieldType} onChange={(e) => setFieldType(e.target.value as CustomFieldType)} options={[{ value: 'TEXT', label: 'Text' }, { value: 'NUMBER', label: 'Number' }, { value: 'DATE', label: 'Date' }, { value: 'SELECT', label: 'Select' }, { value: 'MULTI_SELECT', label: 'Multi-select' }, { value: 'USER', label: 'User' }, { value: 'CHECKBOX', label: 'Checkbox' }]} />}
            {(fieldType === 'SELECT' || fieldType === 'MULTI_SELECT' || (editingField && (editingField.type === 'SELECT' || editingField.type === 'MULTI_SELECT'))) && <Input id="cf-options" label="Options (comma-separated, optional value:label)" value={fieldOptionsRaw} onChange={(e) => setFieldOptionsRaw(e.target.value)} placeholder="todo:To do, doing:In progress, done:Done" />}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={fieldRequired} onChange={(e) => setFieldRequired(e.target.checked)} className="h-4 w-4 rounded border border-[var(--color-border)]" /> Required</label>
            <div className="flex gap-2"><Button type="submit" loading={busy} disabled={!fieldName.trim()}>{editingField ? 'Update field' : 'Add field'}</Button>{editingField && <Button type="button" variant="secondary" onClick={resetFieldForm}>Cancel edit</Button>}</div>
          </form>
          <div className="space-y-2">{customFields.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No custom fields yet.</p> : customFields.map((f) => <div key={f.id} className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2"><div className="min-w-0"><p className="text-sm font-medium">{f.name} <span className="text-xs text-[var(--color-text-muted)]">({f.type}{f.required ? ', required' : ''})</span></p><p className="text-xs text-[var(--color-text-muted)] truncate">key: {f.key}</p></div><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { setEditingField(f); setFieldName(f.name); setFieldType(f.type as CustomFieldType); setFieldRequired(f.required); setFieldOptionsRaw((f.options ?? []).map((o) => (o.label && o.label !== o.value ? `${o.value}:${o.label}` : o.value)).join(', ')); }}>Edit</Button><Button size="sm" variant="ghost" onClick={() => void handleDeleteFieldDef(f)}>Delete</Button></div></div>)}</div>
        </div>
      </Modal>

      <Modal open={Boolean(cfEditTask)} onClose={() => setCfEditTask(null)} title={cfEditTask ? `Custom fields · ${cfEditTask.key}` : 'Custom fields'}><div className="space-y-4">{customFields.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No custom fields defined for this project.</p> : customFields.map((f) => <CustomFieldInput key={f.id} field={f} idPrefix="edit-cf" value={cfEditValues[f.id] ?? null} onChange={(v) => setCfEditValues((prev) => ({ ...prev, [f.id]: v }))} />)}<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCfEditTask(null)}>Cancel</Button><Button onClick={() => void saveCfEditor()} loading={cfEditBusy} disabled={customFields.length === 0}>Save fields</Button></div></div></Modal>

      <Modal open={Boolean(recurrenceTarget)} onClose={() => setRecurrenceTarget(null)} title={recurrenceTarget ? `Recurrence · ${recurrenceTarget.key}` : 'Recurrence settings'}>
        {recurrenceLoading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3"><Select id="rec-freq" label="Frequency" value={recurrenceFrequency} onChange={(e) => setRecurrenceFrequency(e.target.value as TaskRecurrenceFrequency)} options={[{ value: 'DAILY', label: 'Daily' }, { value: 'WEEKLY', label: 'Weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} /><Input id="rec-interval" label="Interval" type="number" value={String(recurrenceInterval)} onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value) || 1))} /></div>
            {recurrenceFrequency === 'WEEKLY' && <div><p className="mb-1 text-sm font-medium">Days of week</p><div className="flex flex-wrap gap-2">{[['Sun',0],['Mon',1],['Tue',2],['Wed',3],['Thu',4],['Fri',5],['Sat',6]].map(([label, val]) => { const n = val as number; const active = recurrenceDays.includes(n); return <label key={n} className="inline-flex items-center gap-1 text-sm"><input type="checkbox" checked={active} onChange={(e) => setRecurrenceDays((prev) => e.target.checked ? [...prev, n] : prev.filter((x) => x !== n))} className="h-4 w-4 rounded border border-[var(--color-border)]" />{label as string}</label>; })}</div></div>}
            {recurrenceFrequency === 'MONTHLY' && <Input id="rec-dom" label="Day of month (1-31, optional)" type="number" value={recurrenceDayOfMonth === '' ? '' : String(recurrenceDayOfMonth)} onChange={(e) => setRecurrenceDayOfMonth(e.target.value === '' ? '' : Math.max(1, Math.min(31, Number(e.target.value) || 1)))} />}
            <div className="grid grid-cols-2 gap-3"><div><label htmlFor="rec-ends" className="block text-sm font-medium text-[var(--color-text-primary)]">Ends on (optional)</label><input id="rec-ends" type="date" value={recurrenceEndsAt} onChange={(e) => setRecurrenceEndsAt(e.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm" /></div><Input id="rec-max" label="Max occurrences (optional)" type="number" value={recurrenceMax === '' ? '' : String(recurrenceMax)} onChange={(e) => setRecurrenceMax(e.target.value === '' ? '' : Math.max(1, Number(e.target.value) || 1))} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recurrenceActive} onChange={(e) => setRecurrenceActive(e.target.checked)} className="h-4 w-4 rounded border border-[var(--color-border)]" /> Active</label>
            {recurrence && <p className="text-xs text-[var(--color-text-muted)]">Occurrences so far: {recurrence.occurrenceCount}{recurrence.nextRunAt ? ` · Next run: ${new Date(recurrence.nextRunAt).toLocaleString()}` : ''}</p>}
            <div className="flex flex-wrap justify-between gap-2"><div className="flex gap-2">{recurrence && <Button variant="secondary" onClick={() => void triggerRecurrenceGenerate()} loading={busy}>Generate next now</Button>}{recurrence && <Button variant="ghost" onClick={() => void removeRecurrence()} loading={busy}>Remove recurrence</Button>}</div><div className="flex gap-2"><Button variant="secondary" onClick={() => setRecurrenceTarget(null)}>Close</Button><Button onClick={() => void saveRecurrence()} loading={busy}>Save recurrence</Button></div></div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(currentAssignTarget)} onClose={() => { setAssignTarget(null); setAssignUserId(''); }} title={`Manage assignees${currentAssignTarget ? ` · ${currentAssignTarget.key}` : ''}`} footer={<Button variant="secondary" onClick={() => { setAssignTarget(null); setAssignUserId(''); }} disabled={taskActionBusy}>Done</Button>}>
        {currentAssignTarget && (<div className="space-y-4">{currentAssignTarget.assignees.length === 0 ? <p className="text-sm text-[var(--color-text-secondary)]">No assignees yet.</p> : <ul className="space-y-2" aria-label="Task assignee list">{currentAssignTarget.assignees.map((assignee) => <li key={assignee.userId} className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium truncate">{assignee.user.name}</p><p className="text-xs text-[var(--color-text-muted)] truncate">{assignee.user.email}</p></div>{canReassign && <Button size="sm" variant="ghost" disabled={taskActionBusy} onClick={() => void handleRemoveAssignee(assignee.userId)} aria-label={`Remove ${assignee.user.name} as assignee`}>Remove</Button>}</li>)}</ul>}{canAssign && (assignableMembers.length === 0 ? <p className="text-xs text-[var(--color-text-muted)]">Every available project member is already assigned to this task.</p> : <form onSubmit={(e) => void handleAddAssignee(e)} className="flex flex-wrap items-end gap-2" aria-label="Add assignee"><div className="min-w-48 flex-1"><Select id="list-add-assignee" label="Add assignee" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)} options={assignableMembers} placeholder="Select a project member…" /></div><Button type="submit" loading={taskActionBusy} disabled={!assignUserId}>Add</Button></form>)}{!canAssign && canReassign && <p className="text-xs text-[var(--color-text-muted)]">Your role can remove assignees but cannot add new ones.</p>}</div>)}
      </Modal>

      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={() => void handleDelete()} title={`Delete ${deleteTarget?.key}?`} description="This task will be permanently deleted. This cannot be undone." confirmLabel="Delete task" destructive loading={taskActionBusy} />
      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={() => void handleArchive()} title={`Archive ${archiveTarget?.key}?`} description="Archived tasks are hidden from the default task list. Existing data is preserved and the task can be restored." confirmLabel="Archive task" destructive loading={busy} />
      <ConfirmDialog open={Boolean(restoreTarget)} onClose={() => setRestoreTarget(null)} onConfirm={() => void handleRestore()} title={`Restore ${restoreTarget?.key}?`} description="The task will become active again and appear in the task list." confirmLabel="Restore task" loading={busy} />
      <ConfirmDialog open={Boolean(completeTarget)} onClose={() => setCompleteTarget(null)} onConfirm={() => void handleComplete()} title={`Complete ${completeTarget?.key}?`} description="The task will be marked as completed. You can reopen it later." confirmLabel="Complete task" loading={busy} />
      <ConfirmDialog open={Boolean(reopenTarget)} onClose={() => setReopenTarget(null)} onConfirm={() => void handleReopen()} title={`Reopen ${reopenTarget?.key}?`} description="The task will be reopened and returned to its previous status." confirmLabel="Reopen task" loading={busy} />
    </div>
  );
}
