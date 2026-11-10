/**
 * services/insights.ts
 *
 * Workspace reporting and analytics derived only from existing backend
 * endpoints. The backend does not currently expose aggregate analytics
 * routes, so this module composes a bounded, transparent snapshot from:
 *
 *   GET /workspaces/:workspaceId/projects
 *   GET /workspaces/:workspaceId/projects/:projectId/tasks
 *   GET /workspaces/:workspaceId/members
 *   GET /workspaces/:workspaceId/files/usage
 *   GET /billing/workspaces/:workspaceId
 *   GET /notifications/activity/:workspaceId
 *
 * No statistic is invented. Task status/priority distribution is sampled from
 * a capped set of recently updated projects and the caller must display that
 * limitation. Every source is settled independently so a permission denial or
 * missing contract degrades gracefully instead of blanking the page.
 */

import { ApiRequestError } from '@/lib/api';
import {
  getBillingSummary,
  type BillingSummary,
} from '@/services/billing';
import { getFileUsage, type FileUsage } from '@/services/files';
import { listActivity, type ActivityEntry } from '@/services/notifications';
import {
  listProjects,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectVisibility,
} from '@/services/projects';
import {
  listTasks,
  type TaskPriority,
  type TaskStatus,
  type TaskSummary,
} from '@/services/tasks';
import {
  listWorkspaceMembers,
  type WorkspaceMember,
} from '@/services/workspaces';

// ─── Public types ────────────────────────────────────────────────────────────

export type InsightsRange = '7d' | '30d' | '90d' | 'all';

export type InsightsSource =
  | 'projects'
  | 'tasks'
  | 'members'
  | 'activity'
  | 'storage'
  | 'billing';

export interface InsightsWarning {
  source: InsightsSource;
  message: string;
}

export interface ProjectInsight {
  id: string;
  name: string;
  key: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  memberCount: number;
  taskCount: number;
  dueDate: string | null;
  overdue: boolean;
  updatedAt: string;
}

export interface CountEntry<T extends string> {
  key: T;
  count: number;
}

export interface WorkspaceInsights {
  range: InsightsRange;
  /** ISO timestamp for the start of the selected range, or null for "all". */
  rangeStart: string | null;
  generatedAt: string;
  projects: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
    byStatus: CountEntry<ProjectStatus>[];
    byVisibility: CountEntry<ProjectVisibility>[];
    items: ProjectInsight[];
    /** True when the backend has more projects than this snapshot loaded. */
    truncated: boolean;
  };
  tasks: {
    /** Sum of taskCount across the loaded projects. */
    totalAcrossProjects: number;
    sampledProjects: number;
    sampledTasks: number;
    completedInRange: number;
    overdue: number;
    byStatus: CountEntry<TaskStatus>[];
    byPriority: CountEntry<TaskPriority>[];
    /** Per-project sample, used for the progress table. */
    perProject: Array<{
      projectId: string;
      sampled: number;
      completed: number;
      overdue: number;
    }>;
    /** True when the sample is incomplete for any reason. */
    truncated: boolean;
  };
  members: {
    total: number;
    active: number;
    suspended: number;
    byRole: Array<{ role: string; count: number }>;
  } | null;
  activity: {
    totalInRange: number;
    byAction: Array<{ action: string; count: number }>;
    recent: ActivityEntry[];
    truncated: boolean;
  } | null;
  storage: FileUsage | null;
  billing: BillingSummary | null;
  warnings: InsightsWarning[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROJECT_PAGE_LIMIT = 50;
const TASK_SAMPLE_PROJECT_LIMIT = 8;
const TASK_SAMPLE_PAGE_LIMIT = 100;
const ACTIVITY_PAGE_LIMIT = 100;
const RECENT_ACTIVITY_LIMIT = 10;

export const PROJECT_STATUSES: ProjectStatus[] = [
  'PLANNING',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
];

export const PROJECT_VISIBILITIES: ProjectVisibility[] = [
  'PRIVATE',
  'DEPARTMENT_TEAM',
  'WORKSPACE',
];

export const TASK_STATUSES: TaskStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
];

export const TASK_PRIORITIES: TaskPriority[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
];

const RANGE_DAYS: Record<Exclude<InsightsRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rangeStartFor(range: InsightsRange, now: Date): Date | null {
  if (range === 'all') return null;
  const start = new Date(now);
  start.setDate(start.getDate() - RANGE_DAYS[range]);
  return start;
}

function isWithin(iso: string | null, start: Date | null): boolean {
  if (!iso) return false;
  if (!start) return true;
  const value = new Date(iso).getTime();
  return Number.isFinite(value) && value >= start.getTime();
}

function isOverdue(dueDate: string | null, completed: boolean, now: Date): boolean {
  if (!dueDate || completed) return false;
  const due = new Date(dueDate).getTime();
  return Number.isFinite(due) && due < now.getTime();
}

function countBy<T extends string>(values: T[], keys: T[]): CountEntry<T>[] {
  const counts = new Map<T, number>(keys.map((key) => [key, 0]));
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return keys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

function describeError(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The request failed.';
}

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === 'fulfilled' ? result.value : null;
}

function addWarning(
  warnings: InsightsWarning[],
  source: InsightsSource,
  result: PromiseSettledResult<unknown>,
): void {
  if (result.status === 'rejected') {
    warnings.push({ source, message: describeError(result.reason) });
  }
}

function memberRole(member: WorkspaceMember): string {
  return member.organizationRole ?? member.role;
}

// ─── Snapshot loader ─────────────────────────────────────────────────────────

export interface LoadInsightsOptions {
  range?: InsightsRange;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

export async function loadWorkspaceInsights(
  workspaceId: string,
  options: LoadInsightsOptions = {},
): Promise<WorkspaceInsights> {
  const range = options.range ?? '30d';
  const now = options.now ?? new Date();
  const rangeStart = rangeStartFor(range, now);
  const warnings: InsightsWarning[] = [];

  const [projectsResult, membersResult, storageResult, billingResult, activityResult] =
    await Promise.allSettled([
      listProjects(workspaceId, { limit: PROJECT_PAGE_LIMIT }),
      listWorkspaceMembers(workspaceId),
      getFileUsage(workspaceId),
      getBillingSummary(workspaceId),
      listActivity(workspaceId, { limit: ACTIVITY_PAGE_LIMIT }),
    ]);

  addWarning(warnings, 'projects', projectsResult);
  addWarning(warnings, 'members', membersResult);
  addWarning(warnings, 'storage', storageResult);
  addWarning(warnings, 'billing', billingResult);
  addWarning(warnings, 'activity', activityResult);

  const projectPage = settledValue(projectsResult);
  const projects: ProjectSummary[] = projectPage?.items ?? [];
  const members = settledValue(membersResult);
  const storage = settledValue(storageResult);
  const billing = settledValue(billingResult);
  const activityPage = settledValue(activityResult);

  // ── Projects ──────────────────────────────────────────────────────────────
  const projectItems: ProjectInsight[] = projects.map((project) => ({
    id: project.id,
    name: project.name,
    key: project.key,
    status: project.status,
    visibility: project.visibility,
    memberCount: project.memberCount,
    taskCount: project.taskCount,
    dueDate: project.dueDate,
    overdue: isOverdue(project.dueDate, project.status === 'COMPLETED', now),
    updatedAt: project.updatedAt,
  }));

  const projectStatusCounts = countBy(
    projectItems.map((project) => project.status),
    PROJECT_STATUSES,
  );
  const projectVisibilityCounts = countBy(
    projectItems.map((project) => project.visibility),
    PROJECT_VISIBILITIES,
  );

  // ── Tasks (bounded sample) ────────────────────────────────────────────────
  const sampleProjects = [...projectItems]
    .filter((project) => project.status !== 'ARCHIVED')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, TASK_SAMPLE_PROJECT_LIMIT);

  const taskResults = await Promise.allSettled(
    sampleProjects.map((project) =>
      listTasks(workspaceId, project.id, { limit: TASK_SAMPLE_PAGE_LIMIT }),
    ),
  );

  const sampledTasks: TaskSummary[] = [];
  const perProject: WorkspaceInsights['tasks']['perProject'] = [];
  let taskSampleTruncated = projectItems.length > sampleProjects.length;

  taskResults.forEach((result, index) => {
    const project = sampleProjects[index];
    if (result.status === 'rejected') {
      warnings.push({ source: 'tasks', message: describeError(result.reason) });
      return;
    }
    if (result.value.nextCursor) taskSampleTruncated = true;
    const tasks = result.value.items;
    sampledTasks.push(...tasks);
    perProject.push({
      projectId: project.id,
      sampled: tasks.length,
      completed: tasks.filter((task) => task.status === 'APPROVED').length,
      overdue: tasks.filter((task) => isOverdue(task.dueDate, task.completedAt !== null, now)).length,
    });
  });

  const completedInRange = sampledTasks.filter(
    (task) => task.completedAt !== null && isWithin(task.completedAt, rangeStart),
  ).length;

  // ── Members ───────────────────────────────────────────────────────────────
  let memberInsights: WorkspaceInsights['members'] = null;
  if (members) {
    const roleCounts = new Map<string, number>();
    for (const member of members) {
      const role = memberRole(member);
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }
    memberInsights = {
      total: members.length,
      active: members.filter((member) => member.membershipStatus === 'ACTIVE').length,
      suspended: members.filter((member) => member.membershipStatus === 'SUSPENDED').length,
      byRole: [...roleCounts.entries()]
        .map(([role, count]) => ({ role, count }))
        .sort((a, b) => b.count - a.count || a.role.localeCompare(b.role)),
    };
  }

  // ── Activity ──────────────────────────────────────────────────────────────
  let activityInsights: WorkspaceInsights['activity'] = null;
  if (activityPage) {
    const inRange = activityPage.items.filter((entry) =>
      isWithin(entry.createdAt, rangeStart),
    );
    const actionCounts = new Map<string, number>();
    for (const entry of inRange) {
      actionCounts.set(entry.action, (actionCounts.get(entry.action) ?? 0) + 1);
    }
    activityInsights = {
      totalInRange: inRange.length,
      byAction: [...actionCounts.entries()]
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count || a.action.localeCompare(b.action)),
      recent: inRange.slice(0, RECENT_ACTIVITY_LIMIT),
      truncated: activityPage.nextCursor !== null,
    };
  }

  return {
    range,
    rangeStart: rangeStart ? rangeStart.toISOString() : null,
    generatedAt: now.toISOString(),
    projects: {
      total: projectItems.length,
      active: projectItems.filter((project) => project.status === 'ACTIVE').length,
      completed: projectItems.filter((project) => project.status === 'COMPLETED').length,
      overdue: projectItems.filter((project) => project.overdue).length,
      byStatus: projectStatusCounts,
      byVisibility: projectVisibilityCounts,
      items: projectItems,
      truncated: projectPage?.nextCursor !== null && projectPage?.nextCursor !== undefined,
    },
    tasks: {
      totalAcrossProjects: projectItems.reduce((sum, project) => sum + project.taskCount, 0),
      sampledProjects: perProject.length,
      sampledTasks: sampledTasks.length,
      completedInRange,
      overdue: sampledTasks.filter((task) =>
        isOverdue(task.dueDate, task.completedAt !== null, now),
      ).length,
      byStatus: countBy(
        sampledTasks.map((task) => task.status),
        TASK_STATUSES,
      ),
      byPriority: countBy(
        sampledTasks.map((task) => task.priority),
        TASK_PRIORITIES,
      ),
      perProject,
      truncated: taskSampleTruncated,
    },
    members: memberInsights,
    activity: activityInsights,
    storage,
    billing,
    warnings,
  };
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function csvCell(value: string | number | null): string {
  if (value === null) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds a CSV of the loaded project snapshot. */
export function buildProjectCsv(insights: WorkspaceInsights): string {
  const header = [
    'Project',
    'Key',
    'Status',
    'Visibility',
    'Tasks',
    'Members',
    'Due date',
    'Overdue',
  ];
  const rows = insights.projects.items.map((project) => [
    csvCell(project.name),
    csvCell(project.key),
    csvCell(project.status),
    csvCell(project.visibility),
    csvCell(project.taskCount),
    csvCell(project.memberCount),
    csvCell(project.dueDate),
    csvCell(project.overdue ? 'yes' : 'no'),
  ]);
  return [header.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
