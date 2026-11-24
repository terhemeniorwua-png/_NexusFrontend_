import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import type { TaskStatus } from '@/services/tasks';

/** Backend sprint status lifecycle. */
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  createdById: string;
  completedAt: string | null;
  completedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SprintPage {
  items: Sprint[];
  nextCursor: string | null;
}

export interface CreateSprintInput {
  name: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export type CompleteSprintTarget = 'BACKLOG' | 'NEXT_SPRINT';

export interface CompleteSprintInput {
  target: CompleteSprintTarget;
  nextSprintId?: string;
}

export interface CompleteSprintResult {
  sprint: Sprint;
  movedTaskCount: number;
  archivedUnfinishedMovedCount: number;
  destination: { type: CompleteSprintTarget; nextSprintId: string | null };
}

export interface SprintBoardTask {
  id: string;
  key: string;
  title: string;
  status: TaskStatus;
  priority: string;
  sprintId: string;
  sprintPosition: number | null;
  assignees: { userId: string; name: string }[];
  dueDate: string | null;
  archivedAt: string | null;
}

export interface SprintBoardColumn {
  status: TaskStatus;
  count: number;
  tasks: SprintBoardTask[];
}

export interface SprintBoard {
  sprint: Sprint;
  columns: SprintBoardColumn[];
  totals: { taskCount: number; doneCount: number };
}

export interface SprintReportSummary {
  sprint: Sprint;
  scopeReconstructable: boolean;
  reason?: string;
  summary: {
    metric: 'TASK_COUNT';
    totalTasks: number;
    doneTasks: number;
    remainingTasks: number;
    completionRate: number;
  } | null;
  generatedAt: string;
}

export interface BurndownSeriesPoint {
  date: string; // YYYY-MM-DD UTC
  remaining: number;
  ideal: number;
  scope: number;
  completed: number;
}

export interface SprintReportBurndown {
  sprint: Sprint;
  scopeReconstructable: boolean;
  reason?: string;
  metric?: 'TASK_COUNT';
  startAt?: string;
  endAt?: string;
  series: BurndownSeriesPoint[];
  totals?: { initialScope: number; completed: number; remaining: number };
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Internal request helper (same pattern as projects.ts / tasks.ts)
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
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/sprints`;

const sprintPath = (workspaceId: string, projectId: string, sprintId: string, suffix = '') =>
  `${basePath(workspaceId, projectId)}/${encodeURIComponent(sprintId)}${suffix}`;

// ---------------------------------------------------------------------------
// R1 - List sprints
// ---------------------------------------------------------------------------

export interface ListSprintsQuery {
  cursor?: string;
  limit?: number;
  status?: SprintStatus;
}

export function listSprints(
  workspaceId: string,
  projectId: string,
  query: ListSprintsQuery = {},
): Promise<SprintPage> {
  const params = new URLSearchParams();
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.limit !== undefined) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  return request<SprintPage>(`${basePath(workspaceId, projectId)}${params.size ? `?${params}` : ''}`);
}

// ---------------------------------------------------------------------------
// R2 - Create sprint
// ---------------------------------------------------------------------------

export function createSprint(
  workspaceId: string,
  projectId: string,
  input: CreateSprintInput,
): Promise<Sprint> {
  return request<Sprint>(basePath(workspaceId, projectId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// R3 - Update sprint
// ---------------------------------------------------------------------------

export function updateSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
  input: UpdateSprintInput,
): Promise<Sprint> {
  return request<Sprint>(sprintPath(workspaceId, projectId, sprintId), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// R4 - Start sprint
// ---------------------------------------------------------------------------

export function startSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
): Promise<Sprint> {
  return request<Sprint>(sprintPath(workspaceId, projectId, sprintId, '/start'), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// R5 - Complete sprint
// ---------------------------------------------------------------------------

export function completeSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
  input: CompleteSprintInput,
): Promise<CompleteSprintResult> {
  return request<CompleteSprintResult>(sprintPath(workspaceId, projectId, sprintId, '/complete'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// R6 - Restore sprint
// ---------------------------------------------------------------------------

export function restoreSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
): Promise<Sprint> {
  return request<Sprint>(sprintPath(workspaceId, projectId, sprintId, '/restore'), {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

// ---------------------------------------------------------------------------
// R7 - Add/move tasks to sprint
// ---------------------------------------------------------------------------

export interface AddTasksToSprintInput {
  taskIds: string[];
}

export interface AddTasksToSprintResult {
  sprint: Sprint;
  addedTaskIds: string[];
}

export function addTasksToSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
  input: AddTasksToSprintInput,
): Promise<AddTasksToSprintResult> {
  return request<AddTasksToSprintResult>(sprintPath(workspaceId, projectId, sprintId, '/tasks'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ---------------------------------------------------------------------------
// R8 - Remove task from sprint to backlog
// ---------------------------------------------------------------------------

export interface RemoveTaskFromSprintResult {
  sprint: Sprint;
  taskId: string;
}

export function removeTaskFromSprint(
  workspaceId: string,
  projectId: string,
  sprintId: string,
  taskId: string,
): Promise<RemoveTaskFromSprintResult> {
  return request<RemoveTaskFromSprintResult>(
    sprintPath(workspaceId, projectId, sprintId, `/tasks/${encodeURIComponent(taskId)}`),
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// R11 - Sprint board
// ---------------------------------------------------------------------------

export function getSprintBoard(
  workspaceId: string,
  projectId: string,
  sprintId: string,
): Promise<SprintBoard> {
  return request<SprintBoard>(sprintPath(workspaceId, projectId, sprintId, '/board'));
}

// ---------------------------------------------------------------------------
// R12 - Sprint report summary
// ---------------------------------------------------------------------------

export function getSprintReportSummary(
  workspaceId: string,
  projectId: string,
  sprintId: string,
): Promise<SprintReportSummary> {
  return request<SprintReportSummary>(sprintPath(workspaceId, projectId, sprintId, '/reports/summary'));
}

// ---------------------------------------------------------------------------
// R13 - Sprint burndown
// ---------------------------------------------------------------------------

export function getSprintReportBurndown(
  workspaceId: string,
  projectId: string,
  sprintId: string,
): Promise<SprintReportBurndown> {
  return request<SprintReportBurndown>(sprintPath(workspaceId, projectId, sprintId, '/reports/burndown'));
}
