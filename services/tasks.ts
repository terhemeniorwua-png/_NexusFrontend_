import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

// ---------------------------------------------------------------------------
// Task dev-links — read-only "Linked development items" view on the task page
// ---------------------------------------------------------------------------

/**
 * Task-page consumers can import the dev-link service and its view helpers
 * from the task service surface. The implementation is not duplicated here.
 */
export {
  listTaskDevLinks,
  groupTaskDevLinks,
  isMaskedTaskDevLink,
  TASK_DEV_LINK_GROUP_ORDER,
  type TaskDevLink,
  type TaskDevLinkExternalType,
  type TaskDevLinkGroup,
  type TaskDevLinkGroupType,
} from '@/services/dev-integrations';

// ---------------------------------------------------------------------------
// Types — matching backend task.schemas.ts and task.service.ts response shapes
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'ASSIGNED'
  | 'AWAITING_CLARIFICATION'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'CHANGES_REQUESTED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

/** Per-assignee acceptance state (backend TaskAssigneeAcceptanceStatus). */
export type TaskAcceptanceStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export type TaskSortBy = 'position' | 'dueDate' | 'priority' | 'createdAt';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskAssignee {
  userId: string;
  user: { id: string; name: string; email: string };
  assignedBy: string;
  createdAt: string;
  /** Optional so older responses and existing fixtures stay valid. */
  acceptanceStatus?: TaskAcceptanceStatus;
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
  customFields?: Record<string, unknown>;
  customFieldValues?: TaskCustomFieldValue[];
  recurrenceRule?: TaskRecurrenceRule | null;
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
  /** Optional so older responses and existing fixtures stay valid. */
  acceptanceStatus?: TaskAcceptanceStatus;
  reviewerId?: string | null;
  /** Optional so older responses and existing fixtures stay valid. */
  reviewer?: TaskPersonRef | null;
  /** Optional so older responses and existing fixtures stay valid. */
  sprintId?: string | null;
  /** Optional display name when the task list response includes sprint details. */
  sprintName?: string | null;
  /** Optional so older responses and existing fixtures stay valid. */
  sprintPosition?: number | null;
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

export interface TaskProgressUpdate {
  id: string;
  taskId: string;
  authorId: string;
  note: string;
  percent: number | null;
  /** Returned by backend; echoed for idempotent submits. */
  clientRequestId?: string | null;
  createdAt: string;
}

export interface TaskProgressUpdatePage {
  items: TaskProgressUpdate[];
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
    reviewerId?: string | null;
  };
  /** Optional so older responses and existing fixtures stay valid. */
  acceptanceStatus?: TaskAcceptanceStatus;
  reviewerId?: string | null;
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
  sprintId?: string | null;
  parentTaskId?: string | null;
  weight?: number;
  assigneeIds?: string[];
  reviewerId?: string | null;
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
  sprintId?: string | null;
  parentTaskId?: string | null;
  weight?: number;
  reviewerId?: string | null;
  requiresApproval?: boolean;
  expectedDeliverables?: TaskDeliverable[] | null;
}

export type TaskReviewDecision = 'START_REVIEW' | 'APPROVE' | 'REQUEST_CHANGES';

/** Assignee record returned by accept/decline/start (backend task.service.ts). */
export interface TaskAssigneeActionResult {
  taskId: string;
  userId: string;
  user: { id: string; name: string; email: string };
  assignedBy: string | null;
  assignedAt: string;
  acceptanceStatus: TaskAcceptanceStatus;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
}

/** Response envelope returned by POST /:taskId/{accept,decline,start}. */
export interface TaskAssigneeActionResponse {
  task: TaskSummary;
  assignee: TaskAssigneeActionResult;
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

// These are the only query keys accepted by GET /tasks. Unsupported filters
// such as dueFrom, dueTo, and overdue are deliberately not forwarded.
const SUPPORTED_TASK_QUERY_KEYS: readonly (keyof ListTasksQuery)[] = [
  'cursor',
  'limit',
  'status',
  'priority',
  'assigneeId',
  'labels',
  'search',
  'sortBy',
  'sortOrder',
  'includeArchived',
];

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
    if (!SUPPORTED_TASK_QUERY_KEYS.includes(key as keyof ListTasksQuery)) return;
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

export interface AddTaskProgressUpdateInput {
  note: string;
  percent?: number | null;
  clientRequestId?: string;
}

export function addTaskProgressUpdate(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: AddTaskProgressUpdateInput,
): Promise<{ update: TaskProgressUpdate }> {
  const body: Record<string, unknown> = {
    note: input.note,
    clientRequestId: input.clientRequestId,
  };
  if (input.percent !== undefined) body.percent = input.percent;
  return request<{ update: TaskProgressUpdate }>(
    taskPath(workspaceId, projectId, taskId, '/progress-updates'),
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export function listTaskProgressUpdates(
  workspaceId: string,
  projectId: string,
  taskId: string,
  opts: { cursor?: string; limit?: number } = {},
): Promise<TaskProgressUpdatePage> {
  const params = new URLSearchParams();
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.limit !== undefined) params.set('limit', String(opts.limit));
  return request<TaskProgressUpdatePage>(
    taskPath(workspaceId, projectId, taskId, '/progress-updates') + (params.size ? `?${params}` : ''),
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

/** Assignee-only actions. The backend schema requires an empty JSON object for accept/start. */
export function acceptTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskAssigneeActionResponse> {
  return request<TaskAssigneeActionResponse>(taskPath(workspaceId, projectId, taskId, '/accept'), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function declineTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
  reason: string,
): Promise<TaskAssigneeActionResponse> {
  return request<TaskAssigneeActionResponse>(taskPath(workspaceId, projectId, taskId, '/decline'), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function startTask(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskAssigneeActionResponse> {
  return request<TaskAssigneeActionResponse>(taskPath(workspaceId, projectId, taskId, '/start'), {
    method: 'POST',
    body: JSON.stringify({}),
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
// Custom fields (project definitions + task values) — backend task-advanced contract
// ---------------------------------------------------------------------------

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT' | 'USER' | 'CHECKBOX';

export interface CustomFieldOption {
  value: string;
  label: string;
  color?: string;
}

export interface ProjectCustomField {
  id: string;
  projectId: string;
  name: string;
  key: string;
  type: CustomFieldType;
  description: string | null;
  options: CustomFieldOption[] | null;
  required: boolean;
  position: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskCustomFieldValue {
  taskId: string;
  fieldId: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
  field: ProjectCustomField;
}

export interface CreateCustomFieldInput {
  name: string;
  key?: string;
  type: CustomFieldType;
  description?: string | null;
  options?: CustomFieldOption[] | null;
  required?: boolean;
  position?: number;
}

export interface UpdateCustomFieldInput {
  name?: string;
  description?: string | null;
  options?: CustomFieldOption[] | null;
  required?: boolean;
  position?: number;
}

const customFieldsPath = (workspaceId: string, projectId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/custom-fields${suffix}`;

export function listProjectCustomFields(workspaceId: string, projectId: string): Promise<ProjectCustomField[]> {
  return request<ProjectCustomField[]>(customFieldsPath(workspaceId, projectId));
}

export function createProjectCustomField(
  workspaceId: string,
  projectId: string,
  input: CreateCustomFieldInput,
): Promise<ProjectCustomField> {
  return request<ProjectCustomField>(customFieldsPath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProjectCustomField(
  workspaceId: string,
  projectId: string,
  fieldId: string,
  input: UpdateCustomFieldInput,
): Promise<ProjectCustomField> {
  return request<ProjectCustomField>(customFieldsPath(workspaceId, projectId, `/${encodeURIComponent(fieldId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteProjectCustomField(
  workspaceId: string,
  projectId: string,
  fieldId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    customFieldsPath(workspaceId, projectId, `/${encodeURIComponent(fieldId)}`),
    { method: 'DELETE' },
  );
}

export function getTaskCustomFieldValues(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskCustomFieldValue[]> {
  return request<TaskCustomFieldValue[]>(
    taskPath(workspaceId, projectId, taskId, '/custom-fields'),
    { method: 'GET' },
  );
}

export function setTaskCustomFieldValues(
  workspaceId: string,
  projectId: string,
  taskId: string,
  values: Array<{ fieldId: string; value?: unknown }>,
): Promise<{ taskId: string; values: TaskCustomFieldValue[] }> {
  return request<{ taskId: string; values: TaskCustomFieldValue[] }>(
    taskPath(workspaceId, projectId, taskId, '/custom-fields'),
    { method: 'PUT', body: JSON.stringify({ values }) },
  );
}

// ---------------------------------------------------------------------------
// Saved views (project-scoped, versioned config)
// ---------------------------------------------------------------------------

export interface SavedViewConfigV1 {
  version: 1;
  filters: Record<string, unknown>;
  sort: Record<string, unknown> | null;
  group: Record<string, unknown> | null;
}

export interface TaskSavedView {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  isShared: boolean;
  config: SavedViewConfigV1;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavedViewInput {
  name: string;
  isShared?: boolean;
  config?: SavedViewConfigV1;
}

export interface UpdateSavedViewInput {
  name?: string;
  isShared?: boolean;
  config?: Partial<Omit<SavedViewConfigV1, 'version'>> & { version: 1 };
}

const savedViewsPath = (workspaceId: string, projectId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/saved-views${suffix}`;

export function listTaskSavedViews(workspaceId: string, projectId: string): Promise<TaskSavedView[]> {
  return request<TaskSavedView[]>(savedViewsPath(workspaceId, projectId));
}

export function createTaskSavedView(
  workspaceId: string,
  projectId: string,
  input: CreateSavedViewInput,
): Promise<TaskSavedView> {
  return request<TaskSavedView>(savedViewsPath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTaskSavedView(
  workspaceId: string,
  projectId: string,
  viewId: string,
  input: UpdateSavedViewInput,
): Promise<TaskSavedView> {
  return request<TaskSavedView>(savedViewsPath(workspaceId, projectId, `/${encodeURIComponent(viewId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTaskSavedView(
  workspaceId: string,
  projectId: string,
  viewId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    savedViewsPath(workspaceId, projectId, `/${encodeURIComponent(viewId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Task recurrence
// ---------------------------------------------------------------------------

export type TaskRecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface TaskRecurrenceRule {
  id: string;
  taskId: string;
  frequency: TaskRecurrenceFrequency;
  interval: number;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  endsAt: string | null;
  maxOccurrences: number | null;
  nextRunAt: string | null;
  active: boolean;
  occurrenceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertTaskRecurrenceInput {
  frequency: TaskRecurrenceFrequency;
  interval?: number;
  daysOfWeek?: number[];
  dayOfMonth?: number | null;
  endsAt?: string | null;
  maxOccurrences?: number | null;
  nextRunAt?: string | null;
  active?: boolean;
}

const recurrencePath = (workspaceId: string, projectId: string, taskId: string, suffix = '') =>
  taskPath(workspaceId, projectId, taskId, `/recurrence${suffix}`);

export function getTaskRecurrence(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskRecurrenceRule> {
  return request<TaskRecurrenceRule>(recurrencePath(workspaceId, projectId, taskId));
}

export function upsertTaskRecurrence(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: UpsertTaskRecurrenceInput,
): Promise<TaskRecurrenceRule> {
  return request<TaskRecurrenceRule>(recurrencePath(workspaceId, projectId, taskId), {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTaskRecurrence(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<{ taskId: string; deleted: true }> {
  return request<{ taskId: string; deleted: true }>(recurrencePath(workspaceId, projectId, taskId), {
    method: 'DELETE',
  });
}

export function generateTaskRecurrenceInstance(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskSummary> {
  return request<TaskSummary>(recurrencePath(workspaceId, projectId, taskId, '/generate'), {
    method: 'POST',
  });
}

// ---------------------------------------------------------------------------
// Task templates (project-scoped) and project templates (workspace-scoped)
// ---------------------------------------------------------------------------

export interface TaskTemplateDataV1 {
  version: 1;
  title?: string;
  description?: string | null;
  status?: string;
  priority?: string;
  category?: string | null;
  labels?: string[];
  startDate?: string | null;
  dueDate?: string | null;
  customFieldValues?: Array<{ fieldId: string; value?: unknown }>;
  subtasks?: Array<Record<string, unknown>>;
}

export interface TaskTemplate {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  data: TaskTemplateDataV1;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

const taskTemplatesPath = (workspaceId: string, projectId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/task-templates${suffix}`;

export function listTaskTemplates(workspaceId: string, projectId: string): Promise<TaskTemplate[]> {
  return request<TaskTemplate[]>(taskTemplatesPath(workspaceId, projectId));
}

export function createTaskTemplate(
  workspaceId: string,
  projectId: string,
  input: { name: string; description?: string | null; data?: TaskTemplateDataV1 },
): Promise<TaskTemplate> {
  return request<TaskTemplate>(taskTemplatesPath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTaskTemplate(
  workspaceId: string,
  projectId: string,
  templateId: string,
  input: { name?: string; description?: string | null; data?: TaskTemplateDataV1 },
): Promise<TaskTemplate> {
  return request<TaskTemplate>(taskTemplatesPath(workspaceId, projectId, `/${encodeURIComponent(templateId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteTaskTemplate(
  workspaceId: string,
  projectId: string,
  templateId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    taskTemplatesPath(workspaceId, projectId, `/${encodeURIComponent(templateId)}`),
    { method: 'DELETE' },
  );
}

export function createTaskFromTemplate(
  workspaceId: string,
  projectId: string,
  templateId: string,
  input: { title?: string; assigneeIds?: string[]; startDate?: string | null; dueDate?: string | null } = {},
): Promise<TaskSummary> {
  return request<TaskSummary>(
    taskTemplatesPath(workspaceId, projectId, `/${encodeURIComponent(templateId)}/create-task`),
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export interface ProjectTemplate {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  data: Record<string, unknown>;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

const projectTemplatesPath = (workspaceId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/project-templates${suffix}`;

export function listProjectTemplates(workspaceId: string): Promise<ProjectTemplate[]> {
  return request<ProjectTemplate[]>(projectTemplatesPath(workspaceId));
}

export function createProjectTemplate(
  workspaceId: string,
  input: { name: string; description?: string | null; data?: Record<string, unknown> },
): Promise<ProjectTemplate> {
  return request<ProjectTemplate>(projectTemplatesPath(workspaceId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateProjectTemplate(
  workspaceId: string,
  templateId: string,
  input: { name?: string; description?: string | null; data?: Record<string, unknown> },
): Promise<ProjectTemplate> {
  return request<ProjectTemplate>(projectTemplatesPath(workspaceId, `/${encodeURIComponent(templateId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteProjectTemplate(
  workspaceId: string,
  templateId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    projectTemplatesPath(workspaceId, `/${encodeURIComponent(templateId)}`),
    { method: 'DELETE' },
  );
}

export function createProjectFromTemplate(
  workspaceId: string,
  templateId: string,
  input: { name: string; key: string; description?: string | null },
): Promise<unknown> {
  return request<unknown>(
    projectTemplatesPath(workspaceId, `/${encodeURIComponent(templateId)}/create-project`),
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function listMineTasks(
  workspaceId: string,
  query: { status?: TaskStatus; priority?: TaskPriority; limit?: number } = {},
): Promise<{ items: Array<TaskSummary & { projectName: string; projectKeyLabel: string }>; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.priority) params.set('priority', query.priority);
  params.set('limit', String(query.limit ?? 50));
  return request(`/workspaces/${encodeURIComponent(workspaceId)}/tasks/mine?${params}`);
}
