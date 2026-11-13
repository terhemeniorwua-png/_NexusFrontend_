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

export interface TaskBlocker {
  taskId: string;
  dependsOnTaskId: string;
  task: { id: string; key: string; title: string; status: TaskStatus };
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
  subTaskCount: number;
  commentCount: number;
  attachmentCount: number;
  archivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  assigneeIds?: string[];
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
}

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
): Promise<TaskComment> {
  return request<TaskComment>(taskPath(workspaceId, projectId, taskId, '/comments'), {
    method: 'POST',
    body: JSON.stringify({ body, parentId: parentId ?? null }),
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
