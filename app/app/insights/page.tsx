'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarList } from '@/components/insights/BarList';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { formatBytes } from '@/services/files';
import {
  buildProjectCsv,
  loadWorkspaceInsights,
  type InsightsRange,
  type WorkspaceInsights,
} from '@/services/insights';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
];

// Keep in sync with the sampling caps documented in services/insights.ts.
const PROJECT_PAGE_LIMIT = 50;
const TASK_SAMPLE_PROJECT_LIMIT = 8;
const TASK_SAMPLE_PAGE_LIMIT = 100;
const ACTIVITY_PAGE_LIMIT = 100;

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  CHANGES_REQUESTED: 'Changes requested',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const VISIBILITY_LABELS: Record<string, string> = {
  PRIVATE: 'Private',
  DEPARTMENT_TEAM: 'Department or team',
  WORKSPACE: 'Workspace-wide',
};

function labelFor(labels: Record<string, string>, value: string): string {
  return labels[value] ?? value.replace(/_/g, ' ').toLowerCase();
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDate(isoString: string | null): string {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function projectStatusVariant(status: string): 'success' | 'info' | 'warning' | 'default' {
  if (status === 'COMPLETED') return 'success';
  if (status === 'ACTIVE') return 'info';
  if (status === 'ON_HOLD') return 'warning';
  return 'default';
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-[var(--color-text-secondary)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{detail}</p>
    </Card>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading insights">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="p-5">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              {[1, 2, 3, 4].map((j) => <Skeleton key={j} className="h-6 w-full" />)}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';
  const [range, setRange] = useState<InsightsRange>('30d');
  const [data, setData] = useState<WorkspaceInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const load = useCallback(async (id: string, selectedRange: InsightsRange) => {
    if (!id) return;
    const seq = ++latestLoad.current;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await loadWorkspaceInsights(id, { range: selectedRange });
      if (seq !== latestLoad.current) return;
      setData(snapshot);
    } catch (cause) {
      if (seq !== latestLoad.current) return;
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Workspace insights could not be loaded.',
      );
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load(workspaceId, range);
    });
    return () => {
      active = false;
    };
  }, [workspaceId, range, load]);

  function handleExport() {
    if (!data || data.projects.items.length === 0) return;
    const csv = buildProjectCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexus-projects-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Insights" />
        <EmptyState
          title="No workspace selected"
          description="Select a workspace to view its reporting and analytics."
        />
      </PageContainer>
    );
  }

  const progressByProject = new Map(
    (data?.tasks.perProject ?? []).map((entry) => [entry.projectId, entry]),
  );

  return (
    <PageContainer width="xl">
      <PageHeader
        title="Insights"
        description={`Reporting for ${activeWorkspace?.name ?? 'this workspace'}, built from data you are permitted to access.`}
        actions={
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={!data || data.projects.items.length === 0}
          >
            Export projects CSV
          </Button>
        }
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:w-56">
          <Select
            id="insights-range"
            label="Reporting period"
            size="sm"
            value={range}
            onChange={(event) => setRange(event.target.value as InsightsRange)}
            options={RANGE_OPTIONS}
            helperText="Applies to activity and completed-task counts."
          />
        </div>
        {data && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Snapshot generated {relativeTime(data.generatedAt)} · {data.range === 'all' ? 'all time' : `last ${data.range.replace('d', ' days')}`}
          </p>
        )}
      </div>

      {loading && <div className="mt-5"><InsightsSkeleton /></div>}

      {!loading && error && (
        <Alert variant="error" title="Insights unavailable" className="mt-5">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId, range); }}>
            Retry
          </Button>
        </Alert>
      )}

      {!loading && !error && data && (
        <div className="mt-5 space-y-5">
          {data.warnings.length > 0 && (
            <Alert variant="warning" title="Some data could not be loaded">
              <ul className="list-inside list-disc space-y-0.5">
                {data.warnings.map((warning, index) => (
                  <li key={`${warning.source}-${index}`}>
                    <span className="font-medium capitalize">{warning.source}</span>: {warning.message}
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs">
                Other sections remain available. A permission denial is enforced by the backend.
              </p>
            </Alert>
          )}

          <section aria-label="Workspace summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Projects"
              value={String(data.projects.total)}
              detail={`${data.projects.active} active · ${data.projects.completed} completed`}
            />
            <SummaryCard
              label="Tasks"
              value={String(data.tasks.totalAcrossProjects)}
              detail={`${data.tasks.overdue} overdue in sample`}
            />
            <SummaryCard
              label="Members"
              value={data.members ? String(data.members.total) : 'Unavailable'}
              detail={
                data.members
                  ? `${data.members.active} active · ${data.members.suspended} suspended`
                  : 'Member list not accessible'
              }
            />
            <SummaryCard
              label="Storage"
              value={data.storage ? formatBytes(data.storage.totalBytes) : 'Unavailable'}
              detail={data.storage ? `${data.storage.fileCount} files` : 'Usage not accessible'}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Projects by status
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {data.projects.overdue} overdue across {data.projects.total} projects.
              </p>
              <BarList
                className="mt-4"
                ariaLabel="Projects by status"
                items={data.projects.byStatus.map((entry) => ({
                  id: entry.key,
                  label: labelFor(STATUS_LABELS, entry.key),
                  value: entry.count,
                }))}
                emptyLabel="No projects are visible in this workspace."
              />
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Projects by visibility
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Visibility is enforced by the backend for every project request.
              </p>
              <BarList
                className="mt-4"
                ariaLabel="Projects by visibility"
                items={data.projects.byVisibility.map((entry) => ({
                  id: entry.key,
                  label: labelFor(VISIBILITY_LABELS, entry.key),
                  value: entry.count,
                }))}
                emptyLabel="No projects are visible in this workspace."
              />
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Tasks by status
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Sampled from {data.tasks.sampledTasks} tasks in {data.tasks.sampledProjects}{' '}
                recently updated projects.
              </p>
              <BarList
                className="mt-4"
                ariaLabel="Sampled tasks by status"
                items={data.tasks.byStatus.map((entry) => ({
                  id: entry.key,
                  label: labelFor(STATUS_LABELS, entry.key),
                  value: entry.count,
                }))}
                emptyLabel="No tasks were returned for the sampled projects."
              />
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Tasks by priority
              </h2>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                {data.tasks.completedInRange} sampled tasks completed in the selected period.
              </p>
              <BarList
                className="mt-4"
                ariaLabel="Sampled tasks by priority"
                items={data.tasks.byPriority.map((entry) => ({
                  id: entry.key,
                  label: labelFor(PRIORITY_LABELS, entry.key),
                  value: entry.count,
                }))}
                emptyLabel="No tasks were returned for the sampled projects."
              />
            </Card>
          </div>

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Project progress
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Completed counts come from the task sample; projects outside the sample show
                  only their backend task total.
                </p>
              </div>
              {data.projects.truncated && <Badge variant="warning">Partial project list</Badge>}
            </div>

            {data.projects.items.length === 0 ? (
              <EmptyState
                title="No projects to report"
                description="Create a project or join one to see progress here."
                action={
                  <Link
                    href="/app/projects"
                    className="text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Go to Projects
                  </Link>
                }
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">Project progress and task sample</caption>
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      <th scope="col" className="py-2 pr-4 font-medium">Project</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Status</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Tasks</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Sample progress</th>
                      <th scope="col" className="py-2 pr-4 font-medium">Members</th>
                      <th scope="col" className="py-2 font-medium">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.projects.items.map((project) => {
                      const sample = progressByProject.get(project.id);
                      return (
                        <tr key={project.id} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="py-3 pr-4">
                            <Link
                              href={`/app/projects/${project.id}`}
                              className="font-medium text-[var(--color-text-primary)] hover:underline"
                            >
                              {project.name}
                            </Link>
                            <span className="ml-2 text-xs text-[var(--color-text-muted)]">{project.key}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={projectStatusVariant(project.status)}>
                              {labelFor(STATUS_LABELS, project.status)}
                            </Badge>
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{project.taskCount}</td>
                          <td className="py-3 pr-4">
                            {sample ? (
                              <span className="tabular-nums">
                                {sample.completed}/{sample.sampled}
                                {sample.overdue > 0 && (
                                  <span className="ml-2 text-xs text-[var(--color-error)]">
                                    {sample.overdue} overdue
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-[var(--color-text-muted)]">Not sampled</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{project.memberCount}</td>
                          <td className="py-3">
                            <span className={project.overdue ? 'font-medium text-[var(--color-error)]' : ''}>
                              {formatDate(project.dueDate)}
                              {project.overdue && <span className="ml-1 text-xs">overdue</span>}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Workspace activity
              </h2>
              {data.activity ? (
                <>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {data.activity.totalInRange} recorded actions in the selected period.
                    {data.activity.truncated && ' Only the most recent page was analysed.'}
                  </p>
                  <BarList
                    className="mt-4"
                    ariaLabel="Activity by action"
                    items={data.activity.byAction.slice(0, 8).map((entry) => ({
                      id: entry.action,
                      label: entry.action.replace(/_/g, ' ').toLowerCase(),
                      value: entry.count,
                    }))}
                    emptyLabel="No activity was recorded in this period."
                  />
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Workspace activity is not available to this account or could not be loaded.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                Plan and seat usage
              </h2>
              {data.billing ? (
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-secondary)]">Plan</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">
                      {data.billing.subscription?.plan ?? 'No paid subscription'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-secondary)]">Status</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">
                      {data.billing.subscription?.status ?? 'Not subscribed'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-secondary)]">Active billable seats</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">
                      {data.billing.activeBillableSeats} / {data.billing.includedSeats} included
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-[var(--color-text-secondary)]">Next renewal</dt>
                    <dd className="font-medium text-[var(--color-text-primary)]">
                      {formatDate(data.billing.nextRenewalAt)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                  Billing information is not available for this workspace. Personal
                  workspaces do not have an organisation subscription.
                </p>
              )}
              <Link
                href="/app/billing"
                className="mt-4 inline-flex text-sm font-medium text-[var(--color-primary)] hover:underline"
              >
                Open billing
              </Link>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Recent activity
            </h2>
            {data.activity && data.activity.recent.length > 0 ? (
              <ul className="mt-3 divide-y divide-[var(--color-border)]" aria-label="Recent workspace activity">
                {data.activity.recent.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="text-[var(--color-text-primary)]">
                      {entry.action.replace(/_/g, ' ').toLowerCase()}
                      <span className="text-[var(--color-text-muted)]"> · {entry.targetType.toLowerCase()}</span>
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">{relativeTime(entry.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
                No recent activity to display.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              About these metrics
            </h2>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--color-text-secondary)]">
              <li>
                The current backend does not expose aggregate analytics endpoints, so this
                page derives its numbers from the existing project, task, member, file,
                billing, and activity APIs.
              </li>
              <li>
                Project totals reflect the first {PROJECT_PAGE_LIMIT} visible projects. Task
                distribution is sampled from up to {TASK_SAMPLE_PROJECT_LIMIT} recently
                updated projects and up to {TASK_SAMPLE_PAGE_LIMIT} tasks per project.
              </li>
              <li>
                Activity is analysed from the most recent {ACTIVITY_PAGE_LIMIT} records and
                filtered to the selected period in the browser.
              </li>
              <li>
                All data is scoped to the active workspace and to what the backend permits
                your role to read. No private project or team data is inferred.
              </li>
            </ul>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
