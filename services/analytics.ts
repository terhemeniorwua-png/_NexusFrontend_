/**
 * services/analytics.ts
 *
 * Aggregate analytics endpoints (workspace-scoped).
 * Routes: /api/v1/analytics/...
 */

import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

export type AnalyticsRange = '7d' | '30d' | '90d' | 'custom';

export interface AnalyticsQuery {
  workspaceId: string;
  projectId?: string;
  range?: AnalyticsRange;
  startDate?: string;
  endDate?: string;
}

export interface StatusCountItem {
  status: string;
  count: number;
}

export interface TasksByStatusResult {
  workspaceId: string;
  projectId: string | null;
  rangeDays: number;
  items: StatusCountItem[];
}

export interface TasksByAssigneeItem {
  assigneeId: string | null;
  assigneeName: string | null;
  count: number;
}

export interface TasksByAssigneeResult {
  workspaceId: string;
  projectId: string | null;
  rangeDays: number;
  items: TasksByAssigneeItem[];
}

export interface ThroughputPoint {
  date: string;
  created: number;
  completed: number;
}

export interface TasksThroughputResult {
  workspaceId: string;
  projectId: string | null;
  rangeDays: number;
  created: number;
  completed: number;
  items: ThroughputPoint[];
}

export interface WorkloadItem {
  assigneeId: string | null;
  assigneeName: string | null;
  openTasks: number;
  overdueTasks: number;
}

export interface TasksWorkloadResult {
  workspaceId: string;
  projectId: string | null;
  rangeDays: number;
  items: WorkloadItem[];
}

export interface TimeLoggedItem {
  userId: string;
  userName: string | null;
  minutes: number;
}

export interface TimeLoggedResult {
  workspaceId: string;
  projectId: string | null;
  rangeDays: number;
  totalMinutes: number;
  items: TimeLoggedItem[];
}

function authed<T>(path: string): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { authenticated: true }));
}

function buildQuery(query: AnalyticsQuery): string {
  const params = new URLSearchParams();
  params.set('workspaceId', query.workspaceId);
  if (query.projectId) params.set('projectId', query.projectId);
  if (query.range) params.set('range', query.range);
  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  return params.toString();
}

export async function getTasksByStatus(query: AnalyticsQuery): Promise<TasksByStatusResult> {
  return authed<TasksByStatusResult>(`/analytics/tasks/by-status?${buildQuery(query)}`);
}

export async function getTasksByAssignee(query: AnalyticsQuery): Promise<TasksByAssigneeResult> {
  return authed<TasksByAssigneeResult>(`/analytics/tasks/by-assignee?${buildQuery(query)}`);
}

export async function getTasksThroughput(query: AnalyticsQuery): Promise<TasksThroughputResult> {
  return authed<TasksThroughputResult>(`/analytics/tasks/throughput?${buildQuery(query)}`);
}

export async function getTasksWorkload(query: AnalyticsQuery): Promise<TasksWorkloadResult> {
  return authed<TasksWorkloadResult>(`/analytics/tasks/workload?${buildQuery(query)}`);
}

export async function getTimeLogged(query: AnalyticsQuery): Promise<TimeLoggedResult> {
  return authed<TimeLoggedResult>(`/analytics/time-logged?${buildQuery(query)}`);
}

export interface DashboardAggregateData {
  byStatus: TasksByStatusResult | null;
  byAssignee: TasksByAssigneeResult | null;
  throughput: TasksThroughputResult | null;
  workload: TasksWorkloadResult | null;
  timeLogged: TimeLoggedResult | null;
  errors: Array<{ source: string; message: string }>;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Request failed';
}

export async function loadDashboardAggregates(
  query: AnalyticsQuery,
  enabled: {
    byStatus?: boolean;
    byAssignee?: boolean;
    throughput?: boolean;
    workload?: boolean;
    timeLogged?: boolean;
  } = {},
): Promise<DashboardAggregateData> {
  const want = {
    byStatus: enabled.byStatus ?? true,
    byAssignee: enabled.byAssignee ?? true,
    throughput: enabled.throughput ?? true,
    workload: enabled.workload ?? true,
    timeLogged: enabled.timeLogged ?? true,
  };

  const [byStatus, byAssignee, throughput, workload, timeLogged] = await Promise.allSettled([
    want.byStatus ? getTasksByStatus(query) : Promise.resolve(null),
    want.byAssignee ? getTasksByAssignee(query) : Promise.resolve(null),
    want.throughput ? getTasksThroughput(query) : Promise.resolve(null),
    want.workload ? getTasksWorkload(query) : Promise.resolve(null),
    want.timeLogged ? getTimeLogged(query) : Promise.resolve(null),
  ]);

  const errors: Array<{ source: string; message: string }> = [];
  const val = <T,>(r: PromiseSettledResult<T | null>, source: string): T | null => {
    if (r.status === 'fulfilled') return r.value as T | null;
    errors.push({ source, message: messageOf(r.reason) });
    return null;
  };

  return {
    byStatus: val(byStatus, 'tasks by status'),
    byAssignee: val(byAssignee, 'tasks by assignee'),
    throughput: val(throughput, 'throughput'),
    workload: val(workload, 'workload'),
    timeLogged: val(timeLogged, 'time logged'),
    errors,
  };
}

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV export of current aggregate dashboard data (keeps CSV export capability). */
export function buildAnalyticsCsv(data: DashboardAggregateData): string {
  const lines: string[] = [];
  const section = (title: string, header: string[], rows: Array<Array<string | number | null | undefined>>) => {
    lines.push(title);
    lines.push(header.join(','));
    for (const row of rows) lines.push(row.map(csvCell).join(','));
    lines.push('');
  };

  if (data.byStatus) {
    section('Tasks by status', ['Status', 'Count'], data.byStatus.items.map((i) => [i.status, i.count]));
  }
  if (data.byAssignee) {
    section('Tasks by assignee', ['Assignee', 'Assignee ID', 'Count'], data.byAssignee.items.map((i) => [i.assigneeName ?? 'Unassigned', i.assigneeId, i.count]));
  }
  if (data.throughput) {
    section('Throughput summary', ['Created', 'Completed', 'Range days'], [[data.throughput.created, data.throughput.completed, data.throughput.rangeDays]]);
    section('Throughput by date', ['Date', 'Created', 'Completed'], data.throughput.items.map((i) => [i.date, i.created, i.completed]));
  }
  if (data.workload) {
    section('Workload', ['Assignee', 'Assignee ID', 'Open tasks', 'Overdue tasks'], data.workload.items.map((i) => [i.assigneeName ?? 'Unassigned', i.assigneeId, i.openTasks, i.overdueTasks]));
  }
  if (data.timeLogged) {
    section('Time logged summary', ['Total minutes', 'Range days'], [[data.timeLogged.totalMinutes, data.timeLogged.rangeDays]]);
    section('Time logged by user', ['User', 'User ID', 'Minutes'], data.timeLogged.items.map((i) => [i.userName ?? 'Unknown', i.userId, i.minutes]));
  }
  if (lines.length === 0) {
    lines.push('No analytics data available');
  }
  return lines.join('\n');
}
