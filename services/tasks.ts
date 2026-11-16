import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

// ---------------------------------------------------------------------------
// Types — matching backend task.schemas.ts and task.service.ts response shapes
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskSortBy = 'position' | 'dueDate' | 'priority' | 'createdAt';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskAssignee {
  userId: string;
  user: { id: string; name: string; email: string };
  assignedBy: string;
  createdAt: string;
}

export interface TaskDependency {
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTask: { id: string; key: string; title: string; status: TaskStatus };
}

// Dependency blocker (existing) - kept for backward compatibility.
export interface TaskBlocker {
  taskId: string;
  dependsOnTaskId: string;
  task: { id: string; key: string; title: string; status: TaskStatus };
}

export type TaskReportedBlockerStatus = 'OPEN' | 'RESOLVED';

export interface TaskReportedBlocker {
  id: string;
  taskId: string;
  status: TaskReportedBlockerStatus;
  description: string;
  reportedById: string;
  reportedBy: { id: string; name: string };
  notifyUserId: string | null;
  notifyUser: { id: string; name: string } | null;
  resolvedAt: string | null;
  resolvedById: string | null;
  resolvedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author: { id: string; name: string };
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPersonRef {
  id: string;
  name: string;
}

export interface TaskDeliverable {
  id?: string;
  label: string;
  required?: boolean;
}

export interface TaskSummary {
  id: string;
  projectId: string;
  key: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  category: string | null;
  labels: string[];
  startDate: string | null;
  dueDate: string | null;
  position: number;
  parentTaskId: string | null;
  creatorId: string;
  creator: { id: string; name: string };
  assignees: TaskAssignee[];
  dependencies: TaskDependency[];
  blockers: TaskBlocker[];
  reportedBlockers?: TaskReportedBlocker[];
  hasOpenBlocker?: boolean;
  subTaskCount: number;
  commentCount: number;
  attachmentCount: number;
  archivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  customFields?: { [key: string]: unknown };
  updatedAt: string;
  weight?: number;
  requiresApproval?: boolean;
  expectedDeliverables?: TaskDeliverable[] | null;
  submissionSummary?: string | null;
  submittedAt?: string | null;
  submittedById?: string | null;
  submittedBy?: TaskPersonRef | null;
  reviewFeedback?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedBy?: TaskPersonRef | null;
}

export interface TaskProgress {
  percent: number;
  completed: number;
  total: number;
}

export interface TaskActivityItem {
  id: string;
  action: string;
  actorId: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface TaskActivityPage {
  items: TaskActivityItem[];
  nextCursor: string | null;
}

export interface TaskWorkspaceData {
  task: TaskSummary;
  subtasks: TaskSummary[];
  progress: TaskProgress;
  people: {
    assignees: TaskAssignee[];
    assignedBy: string | null;
    reviewer: TaskPersonRef | null;
  };
  schedule: {
    startDate: string | null;
    dueDate: string | null;
    overdue: boolean;
  };
  recentActivity: TaskActivityItem[];
}

// ---------------------------------------------------------------------------
// Task work documents (Phase 4A)
// ---------------------------------------------------------------------------

export interface TaskWorkDocumentSummary {
  id: string;
  taskId: string;
  title: string;
  createdById: string;
  createdBy: { id: string; name: string };
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWorkDocumentDetail extends TaskWorkDocumentSummary {
  content: unknown;
}

export interface TaskWorkDocumentVersion {
  id: string;
  version: number;
  savedById: string;
  savedBy: { id: string; name: string };
  createdAt: string;
}

export interface TaskWorkDocumentConflict {
  currentVersion: number;
  latestContent: unknown;
  document: TaskWorkDocumentSummary;
}

export function getWorkDocumentConflict(error: unknown): TaskWorkDocumentConflict | null {
  if (!(error instanceof ApiRequestError) || error.status !== 409) return null;
  const details = error.details as { currentVersion?: unknown; latestContent?: unknown; document?: unknown } | undefined;
  if (!details || typeof details.currentVersion !== 'number' || !details.document) return null;
  return {
    currentVersion: details.currentVersion,
    latestContent: details.latestContent,
    document: details.document as TaskWorkDocumentSummary,
  };
}

export interface TaskPage {
  items: TaskSummary[];
  nextCursor: string | null;
}

export interface TaskCommentPage {
  items: TaskComment[];
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string;
  labels?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  position?: number;
  parentTaskId?: string | null;
  weight?: number;
  assigneeIds?: string[];
  requiresApproval?: boolean;
  expectedDeliverables?: TaskDeliverable[] | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
  labels?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  position?: number;
  parentTaskId?: string | null;
  weight?: number;
  requiresApproval?: boolean;
  expectedDeliverables?: TaskDeliverable[] | null;
}

export type TaskReviewDecision = 'START_REVIEW' | 'APPROVE' | 'REQUEST_CHANGES';

export interface ListTasksQuery {
  cursor?: string;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  labels?: string[];
  search?: string;
  sortBy?: TaskSortBy;
  sortOrder?: TaskSortOrder;
  includeArchived?: boolean;
}

// ---------------------------------------------------------------------------
// Internal request helper (same pattern as projects.ts)
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

const basePath = (workspaceId: string, projectId: string) =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks`;

const taskPath = (workspaceId: string, projectId: string, taskId: string, suffix = '') =>
  `${basePath(workspaceId, projectId)}/${encodeURIComponent(taskId)}${suffix}`;

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

export function listTasks(
  workspaceId: string,
  projectId: string,
  query: ListTasksQuery = {},
): Promise<TaskPage> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','));
      return;
    }
    params.set(key, String(value));
  });
  return request<TaskPage>(`${basePath(workspaceId, projectId)}${params.size ? `?${params}` : ''}`);
}

export function getTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskSummary> {
  return request<TaskSummary>(taskPath(workspaceId, projectId, taskId));
}

export function createTask(
  workspaceId: string,
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskSummary> {
  return request<TaskSummary>(basePath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(normalizeTaskInput(input)),
  });
}

export function updateTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskSummary> {
  return request<TaskSummary>(taskPath(workspaceId, projectId, taskId), {
    method: 'PATCH',
    body: JSON.stringify(normalizeTaskInput(input)),
  });
}

export function deleteTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(taskPath(workspaceId, projectId, taskId), {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// Archive / Restore
// ---------------------------------------------------------------------------

export function archiveTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ id: string; archived: true }> {
  return request<{ id: string; archived: true }>(taskPath(workspaceId, projectId, taskId, '/archive'), {
    method: 'POST',
  });
}

export function restoreTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ id: string; archived: false }> {
  return request<{ id: string; archived: false }>(taskPath(workspaceId, projectId, taskId, '/restore'), {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Complete / Reopen
// ---------------------------------------------------------------------------

export function completeTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ id: string; status: TaskStatus; completedAt: string | null }> {
  return request<{ id: string; status: TaskStatus; completedAt: string | null }>(
    taskPath(workspaceId, projectId, taskId, '/complete'),
    { method: 'POST' },
  );
}

export function reopenTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ id: string; status: TaskStatus; completedAt: null }> {
  return request<{ id: string; status: TaskStatus; completedAt: null }>(
    taskPath(workspaceId, projectId, taskId, '/reopen'),
    { method: 'POST' },
  );
}

// ---------------------------------------------------------------------------
// Assignee management
// ---------------------------------------------------------------------------

export function addAssignee(
  workspaceId: string,
  projectId: string,
  taskId: string,
  targetUserId: string,
): Promise<{ taskId: string; userId: string; user: { id: string; name: string; email: string }; assignedBy: string }> {
  return request(taskPath(workspaceId, projectId, taskId, '/assignees'), {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

export function removeAssignee(
  workspaceId: string,
  projectId: string,
  taskId: string,
  targetUserId: string,
): Promise<{ taskId: string; userId: string; removed: true }> {
  return request<{ taskId: string; userId: string; removed: true }>(
    taskPath(workspaceId, projectId, taskId, `/assignees/${encodeURIComponent(targetUserId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Dependency management
// ---------------------------------------------------------------------------

export function addDependency(
  workspaceId: string,
  projectId: string,
  taskId: string,
  dependsOnTaskId: string,
): Promise<{ taskId: string; dependsOnTaskId: string; dependsOnTask: { id: string; key: string; title: string; status: TaskStatus } }> {
  return request(taskPath(workspaceId, projectId, taskId, '/dependencies'), {
    method: 'POST',
    body: JSON.stringify({ dependsOnTaskId }),
  });
}

export function removeDependency(
  workspaceId: string,
  projectId: string,
  taskId: string,
  dependsOnTaskId: string,
): Promise<{ taskId: string; dependsOnTaskId: string; removed: true }> {
  return request<{ taskId: string; dependsOnTaskId: string; removed: true }>(
    taskPath(workspaceId, projectId, taskId, `/dependencies/${encodeURIComponent(dependsOnTaskId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Comment management
// ---------------------------------------------------------------------------

export async function listComments(
  workspaceId: string,
  projectId: string,
  taskId: string,
  limit?: number,
): Promise<TaskComment[]> {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  const result = await request<TaskComment[] | { items?: TaskComment[] }>(
    taskPath(workspaceId, projectId, taskId, '/comments') + (params.size ? `?${params}` : ''),
  );
  if (Array.isArray(result)) return result;
  return Array.isArray(result?.items) ? result.items : [];
}

export function addComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  body: string,
  parentId?: string | null,
  mentionedUserIds?: string[],
): Promise<TaskComment> {
  return request<TaskComment>(taskPath(workspaceId, projectId, taskId, '/comments'), {
    method: 'POST',
    body: JSON.stringify({
      body,
      parentId: parentId ?? null,
      ...(mentionedUserIds && mentionedUserIds.length ? { mentionedUserIds } : {}),
    }),
  });
}

export function getTaskWorkspace(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskWorkspaceData> {
  return request<TaskWorkspaceData>(taskPath(workspaceId, projectId, taskId, '/workspace'));
}

export function listTaskActivity(
  workspaceId: string,
  projectId: string,
  taskId: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<TaskActivityPage> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  return request<TaskActivityPage>(
    taskPath(workspaceId, projectId, taskId, '/activity') + (params.size ? `?${params}` : ''),
  );
}

export function submitTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  workSummary: string,
): Promise<TaskSummary> {
  return request<TaskSummary>(taskPath(workspaceId, projectId, taskId, '/submit'), {
    method: 'POST',
    body: JSON.stringify({ workSummary }),
  });
}

export function reviewTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  decision: TaskReviewDecision,
  feedback?: string | null,
): Promise<TaskSummary> {
  return request<TaskSummary>(taskPath(workspaceId, projectId, taskId, '/review'), {
    method: 'POST',
    body: JSON.stringify({ decision, ...(feedback != null ? { feedback } : {}) }),
  });
}

export function completeSubtask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  subtaskId: string,
  workSummary?: string,
): Promise<{ subtask: TaskSummary; progress: TaskProgress; requiresApproval: boolean; submissionCreated: boolean }> {
  return request(taskPath(workspaceId, projectId, taskId, `/subtasks/${encodeURIComponent(subtaskId)}/complete`), {
    method: 'POST',
    body: JSON.stringify(workSummary ? { workSummary } : {}),
  });
}

export function updateComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  commentId: string,
  body: string,
): Promise<TaskComment> {
  return request<TaskComment>(
    taskPath(workspaceId, projectId, taskId, `/comments/${encodeURIComponent(commentId)}`),
    { method: 'PATCH', body: JSON.stringify({ body }) },
  );
}

export function deleteComment(
  workspaceId: string,
  projectId: string,
  taskId: string,
  commentId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    taskPath(workspaceId, projectId, taskId, `/comments/${encodeURIComponent(commentId)}`),
    { method: 'DELETE' },
  );
}

// Backend requires ISO datetimes with offset; date pickers send YYYY-MM-DD.
function toIsoDate(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value === '') return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`).toISOString() : value;
}

function normalizeTaskInput<T extends object>(input: T): T {
  const out = { ...input } as Record<string, unknown>;
  if ('startDate' in out) out.startDate = toIsoDate(out.startDate);
  if ('dueDate' in out) out.dueDate = toIsoDate(out.dueDate);
  if (typeof out.labels === 'string') {
    out.labels = out.labels.split(',').map((x: string) => x.trim()).filter(Boolean);
  }
  return out as T;
}

const workDocsPath = (workspaceId: string, projectId: string, taskId: string, suffix = '') =>
  taskPath(workspaceId, projectId, taskId, `/work-documents${suffix}`);

export function listTaskWorkDocuments(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ items: TaskWorkDocumentSummary[] }> {
  return request<{ items: TaskWorkDocumentSummary[] }>(workDocsPath(workspaceId, projectId, taskId));
}

export function createTaskWorkDocument(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: { title: string; content?: unknown },
): Promise<TaskWorkDocumentDetail> {
  return request<TaskWorkDocumentDetail>(workDocsPath(workspaceId, projectId, taskId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getTaskWorkDocument(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
): Promise<TaskWorkDocumentDetail> {
  return request<TaskWorkDocumentDetail>(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}`),
  );
}

export function updateTaskWorkDocument(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
  input: { baseVersion: number; content: unknown; title?: string; mode?: 'autosave' | 'manual' },
): Promise<TaskWorkDocumentDetail & { throttled?: boolean }> {
  return request<TaskWorkDocumentDetail & { throttled?: boolean }>(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}`),
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function listTaskWorkDocumentVersions(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
): Promise<{ items: TaskWorkDocumentVersion[]; currentVersion: number }> {
  return request<{ items: TaskWorkDocumentVersion[]; currentVersion: number }>(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}/versions`),
  );
}

export function getTaskWorkDocumentVersion(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
  version: number,
): Promise<{ id: string; version: number; savedBy: { id: string; name: string }; createdAt: string; content: unknown }> {
  return request(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}/versions/${version}`),
  );
}

export function restoreTaskWorkDocumentVersion(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
  version: number,
): Promise<TaskWorkDocumentDetail> {
  return request<TaskWorkDocumentDetail>(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}/versions/${version}/restore`),
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export function deleteTaskWorkDocument(
  workspaceId: string,
  projectId: string,
  taskId: string,
  documentId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    workDocsPath(workspaceId, projectId, taskId, `/${encodeURIComponent(documentId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Task time tracking (Phase 4C)
// ---------------------------------------------------------------------------

export interface TaskTimeEntry {
  id: string;
  taskId: string;
  userId: string;
  user: { id: string; name: string };
  startedAt: string;
  durationMinutes: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const timeEntriesPath = (workspaceId: string, projectId: string, taskId: string, suffix = '') =>
  taskPath(workspaceId, projectId, taskId, `/time-entries${suffix}`);

export function listTaskTimeEntries(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ items: TaskTimeEntry[]; totalMinutes: number }> {
  return request<{ items: TaskTimeEntry[]; totalMinutes: number }>(
    timeEntriesPath(workspaceId, projectId, taskId),
  );
}

export function createTaskTimeEntry(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: { startedAt: string; durationMinutes: number; note?: string | null },
): Promise<TaskTimeEntry> {
  return request<TaskTimeEntry>(timeEntriesPath(workspaceId, projectId, taskId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTaskTimeEntry(
  workspaceId: string,
  projectId: string,
  taskId: string,
  entryId: string,
  input: { startedAt?: string; durationMinutes?: number; note?: string | null },
): Promise<TaskTimeEntry> {
  return request<TaskTimeEntry>(
    timeEntriesPath(workspaceId, projectId, taskId, `/${encodeURIComponent(entryId)}`),
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function deleteTaskTimeEntry(
  workspaceId: string,
  projectId: string,
  taskId: string,
  entryId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    timeEntriesPath(workspaceId, projectId, taskId, `/${encodeURIComponent(entryId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Task blockers (Phase 4B, reported blockers/issues)
// ---------------------------------------------------------------------------

const blockersPath = (workspaceId: string, projectId: string, taskId: string, suffix = '') =>
  taskPath(workspaceId, projectId, taskId, `/blockers${suffix}`);

export function listTaskBlockers(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ items: TaskReportedBlocker[]; hasOpenBlocker: boolean }> {
  return request<{ items: TaskReportedBlocker[]; hasOpenBlocker: boolean }>(
    blockersPath(workspaceId, projectId, taskId),
  );
}

export function reportTaskBlocker(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: { description: string; notifyUserId?: string | null },
): Promise<TaskReportedBlocker> {
  return request<TaskReportedBlocker>(blockersPath(workspaceId, projectId, taskId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function resolveTaskBlocker(
  workspaceId: string,
  projectId: string,
  taskId: string,
  blockerId: string,
): Promise<TaskReportedBlocker> {
  return request<TaskReportedBlocker>(
    blockersPath(workspaceId, projectId, taskId, `/${encodeURIComponent(blockerId)}/resolve`),
    { method: 'POST', body: JSON.stringify({}) },
  );
}

// ---------------------------------------------------------------------------
// Custom field management (Phase 4E)
// ---------------------------------------------------------------------------

export interface TaskCustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
  required?: boolean;
  hidden?: boolean;
}

export function getTaskCustomFieldValues(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ [key: string]: unknown }> {
  return request<{ [key: string]: unknown }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/custom-fields`,
    { method: 'GET' },
  );
}

export function setTaskCustomFieldValues(
  workspaceId: string,
  projectId: string,
  taskId: string,
  values: { [key: string]: unknown },
): Promise<{ [key: string]: unknown }> {
  return request<{ [key: string]: unknown }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/custom-fields`,
    { method: 'POST', body: JSON.stringify(values) },
  );
}

// ---------------------------------------------------------------------------
// Saved task views (Phase 4F)
// ---------------------------------------------------------------------------

export interface TaskView {
  id: string;
  name: string;
  description?: string;
  filter?: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assigneeId?: string;
    search?: string;
  };
  sort?: {
    by: TaskSortBy;
    order: TaskSortOrder;
  };
  groupBy?: 'status' | 'priority' | 'assignee' | 'dueDate';
  isShared: boolean;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskViewPage {
  items: TaskView[];
  nextCursor: string | null;
}

export function listTaskSavedViews(
  workspaceId: string,
  projectId: string,
  query?: { cursor?: string; limit?: number },
): Promise<TaskViewPage> {
  const params = new URLSearchParams();
  if (query?.cursor) params.set('cursor', query.cursor);
  if (query?.limit !== undefined) params.set('limit', String(query.limit));
  return request<TaskViewPage>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/task-views${params.size ? `?${params}` : ''}`,
  );
}

export function createTaskSavedView(
  workspaceId: string,
  projectId: string,
  input: { name: string; description?: string; filter?: TaskView['filter']; sort?: TaskView['sort']; groupBy?: TaskView['groupBy']; isShared?: boolean },
): Promise<TaskView> {
  return request<TaskView>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/task-views`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateTaskSavedView(
  workspaceId: string,
  projectId: string,
  viewId: string,
  input: { name?: string; description?: string; filter?: TaskView['filter']; sort?: TaskView['sort']; groupBy?: TaskView['groupBy']; isShared?: boolean },
): Promise<TaskView> {
  return request<TaskView>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/task-views/${encodeURIComponent(viewId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function deleteTaskSavedView(
  workspaceId: string,
  projectId: string,
  viewId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/task-views/${encodeURIComponent(viewId)}`,
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Recurring task settings (Phase 4G)
// ---------------------------------------------------------------------------

export type RecurrenceRule =
  | { freq: 'daily'; interval?: number; /* end after N instances or never */ }
  | { freq: 'weekly'; interval?: number; byweekday?: number[]; /* MO=1, TU=2, ... */ }
  | { freq: 'monthly'; interval?: number; byweekday?: number; /* e.g., 1=first */ }
  | { freq: 'yearly'; interval?: number; bymonth?: number; byday?: string[] };

export interface RecurrenceSettings {
  rule: RecurrenceRule;
  endType: 'never' | 'after' | 'on';
  endAfter?: number;
  endOn?: string; // ISO date string
}

export function getTaskRecurrenceRule(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ rule: RecurrenceRule; endType: 'never' | 'after' | 'on'; endAfter?: number; endOn?: string }> {
  return request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/recurrence`,
    { method: 'GET' },
  );
}

export function setTaskRecurrenceRule(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: { rule: RecurrenceRule; endType: 'never' | 'after' | 'on'; endAfter?: number; endOn?: string },
): Promise<{ rule: RecurrenceRule; endType: 'never' | 'after' | 'on'; endAfter?: number; endOn?: string }> {
  return request(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/recurrence`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function generateTaskRecurrenceInstance(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskSummary> {
  return request<TaskSummary>(
    `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/recurrence/generate`,
    { method: 'POST' },
  );
}
