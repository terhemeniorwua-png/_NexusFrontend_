'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { PageAccessState } from '@/components/shared/PageAccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import {
  getProject,
  listProjectMilestones,
  type ProjectMilestone,
  type ProjectSummary,
} from '@/services/projects';
import { listTasks, type TaskStatus, type TaskSummary } from '@/services/tasks';

const REPORT_TASK_LIMIT = 100;

const STATUS_ORDER: TaskStatus[] = [
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'CHANGES_REQUESTED',
];

function statusLabel(status: TaskStatus): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (character) => character.toUpperCase());
}

function dateLabel(value: string | null): string {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
}

function requestError(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError ? cause.message : fallback;
}

interface ReportData {
  project: ProjectSummary;
  tasks: TaskSummary[];
  milestones: ProjectMilestone[];
  tasksTruncated: boolean;
}

export default function ProjectReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { can, isLoading: permissionsLoading } = usePermissions();
  useWorkspaceRedirect();

  const canView = can('project.report.view');
  const canViewTasks = can('task.view');

  const [report, setReport] = useState<ReportData | null>(null);
  // Capture the render time once so the overdue calculation stays pure.
  const [now] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace || !canView) {
      setLoading(false);
      return;
    }
    setLoading(true); setError(null); setAccessStatus(null);
    try {
      const project = await getProject(activeWorkspace.id, projectId);
      // Task and milestone data is supplementary. A failure there must not hide
      // the project-level metrics the caller is already permitted to see.
      const [taskPage, milestones] = await Promise.all([
        canViewTasks
          ? listTasks(activeWorkspace.id, projectId, { limit: REPORT_TASK_LIMIT })
          : Promise.resolve({ items: [] as TaskSummary[], nextCursor: null }),
        listProjectMilestones(activeWorkspace.id, projectId).catch(() => [] as ProjectMilestone[]),
      ]);
      setReport({
        project,
        tasks: taskPage.items,
        milestones,
        tasksTruncated: Boolean(taskPage.nextCursor) || project.taskCount > taskPage.items.length,
      });
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else if (cause instanceof ApiRequestError && cause.status === 404) {
        setError('This project is not available or you do not have access to it.');
      } else {
        setError(requestError(cause, 'Project reports could not be loaded.'));
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, projectId, canView, canViewTasks]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  if (!activeWorkspace) {
    return (
      <EmptyState
        title="Choose a workspace"
        description="Select a workspace to view project reports."
        action={<Link href="/app/workspaces" className="text-[var(--color-primary)] underline">Manage workspaces</Link>}
      />
    );
  }

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading reports">
        <Skeleton className="h-10 w-1/3 rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (!canView) {
    return (
      <PageAccessState
        description="Project reports are limited to project managers and roles that were granted report access."
        backHref={`/app/projects/${encodeURIComponent(projectId)}`}
      />
    );
  }
  if (!report) return <Alert variant="error">{error ?? 'Project reports are unavailable.'}</Alert>;

  const { project, tasks, milestones, tasksTruncated } = report;
  const statusCounts = STATUS_ORDER.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));
  const completedMilestones = milestones.filter((milestone) => milestone.completedAt !== null).length;
  const overdueTasks = tasks.filter((task) => (
    task.status !== 'APPROVED'
    && task.dueDate !== null
    && new Date(task.dueDate).getTime() < now
  )).length;
  const unassignedTasks = tasks.filter((task) => task.assignees.length === 0).length;
  const sampleSize = tasks.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Project reports</h2>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          A summary of {project.name} based on the project record and the most recent task and milestone data.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Total tasks</p>
          <p className="mt-1 text-2xl font-semibold">{project.taskCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Members</p>
          <p className="mt-1 text-2xl font-semibold">{project.memberCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Milestones complete</p>
          <p className="mt-1 text-2xl font-semibold">{completedMilestones}<span className="text-base font-normal text-[var(--color-text-muted)]"> / {milestones.length}</span></p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Overdue tasks</p>
          <p className="mt-1 text-2xl font-semibold">{overdueTasks}</p>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Task status breakdown</h3>
          <Badge variant="outline">
            {sampleSize === 0 ? 'No task data' : `${sampleSize} task${sampleSize === 1 ? '' : 's'} analysed`}
          </Badge>
        </div>
        {!canViewTasks ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Your role can view reports but not the task list, so task-level breakdown is omitted.
          </p>
        ) : sampleSize === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">This project has no tasks yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {statusCounts.map(({ status, count }) => {
              const percent = sampleSize === 0 ? 0 : Math.round((count / sampleSize) * 100);
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">{statusLabel(status)}</span>
                    <span className="font-medium">{count} <span className="text-[var(--color-text-muted)]">({percent}%)</span></span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]" role="presentation">
                    <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tasksTruncated && canViewTasks && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)]">
            Status breakdown is based on the first {REPORT_TASK_LIMIT} tasks; the project total above includes every task.
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-semibold">Delivery</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-text-secondary)]">Unassigned tasks</dt>
              <dd className="font-medium">{canViewTasks ? unassignedTasks : '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-text-secondary)]">Start date</dt>
              <dd className="font-medium">{dateLabel(project.startDate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-text-secondary)]">Due date</dt>
              <dd className="font-medium">{dateLabel(project.dueDate)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[var(--color-text-secondary)]">Owner</dt>
              <dd className="font-medium">{project.owner?.name ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Milestones</h3>
          {milestones.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No milestones have been created for this project.</p>
          ) : (
            <ul className="mt-3 space-y-2" aria-label="Project milestones">
              {milestones.slice(0, 6).map((milestone) => (
                <li key={milestone.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{milestone.name}</span>
                  <Badge variant={milestone.completedAt ? 'success' : 'outline'}>
                    {milestone.completedAt ? 'Complete' : dateLabel(milestone.dueDate)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]">
        Detailed report exports are not available yet. These figures come from the project, task, and milestone endpoints the backend currently exposes.
      </p>
    </div>
  );
}
