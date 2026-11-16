'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { BarList } from '@/components/insights/BarList';
import { PieChart } from '@/components/insights/PieChart';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { listProjects, type ProjectSummary } from '@/services/projects';
import {
  buildAnalyticsCsv,
  loadDashboardAggregates,
  type AnalyticsRange,
  type DashboardAggregateData,
} from '@/services/analytics';

type WidgetKey = 'byStatus' | 'byAssignee' | 'throughput' | 'workload' | 'timeLogged';

interface DashboardConfig {
  widgets: Record<WidgetKey, boolean>;
  range: AnalyticsRange;
  projectId: string;
  startDate: string;
  endDate: string;
}

const WIDGET_META: Array<{ key: WidgetKey; label: string; description: string }> = [
  { key: 'byStatus', label: 'Tasks by status', description: 'Task counts grouped by status.' },
  { key: 'byAssignee', label: 'Tasks by assignee', description: 'Task counts grouped by assignee.' },
  { key: 'throughput', label: 'Throughput', description: 'Created vs completed tasks over time.' },
  { key: 'workload', label: 'Workload', description: 'Open and overdue tasks by assignee.' },
  { key: 'timeLogged', label: 'Time logged', description: 'Total and per-user logged time.' },
];

const DEFAULT_CONFIG: DashboardConfig = {
  widgets: { byStatus: true, byAssignee: true, throughput: true, workload: true, timeLogged: true },
  range: '30d',
  projectId: '',
  startDate: '',
  endDate: '',
};

function configKey(workspaceId: string) {
  return `nexus.insights.dashboard.${workspaceId}`;
}

function loadConfig(workspaceId: string): DashboardConfig {
  try {
    const raw = localStorage.getItem(configKey(workspaceId));
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    return {
      widgets: { ...DEFAULT_CONFIG.widgets, ...(parsed.widgets ?? {}) },
      range: (parsed.range as AnalyticsRange) || DEFAULT_CONFIG.range,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : '',
      startDate: typeof parsed.startDate === 'string' ? parsed.startDate : '',
      endDate: typeof parsed.endDate === 'string' ? parsed.endDate : '',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveConfig(workspaceId: string, config: DashboardConfig) {
  try {
    localStorage.setItem(configKey(workspaceId), JSON.stringify(config));
  } catch {
    // ignore
  }
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function isoDay(value: string): string | undefined {
  if (!value) return undefined;
  // datetime-local gives YYYY-MM-DDTHH:mm; backend accepts datetime
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function WidgetCard({
  title,
  description,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  description?: string;
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
        {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
      </div>
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label={`Loading ${title}`}>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-4/6" />
        </div>
      ) : error ? (
        <Alert variant="warning">{error}</Alert>
      ) : empty ? (
        <p className="text-sm text-[var(--color-text-secondary)]">No data available for this scope and range.</p>
      ) : (
        children
      )}
    </Card>
  );
}

export default function InsightsPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [config, setConfig] = useState<DashboardConfig>(DEFAULT_CONFIG);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [data, setData] = useState<DashboardAggregateData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const configLoadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    if (configLoadedFor.current === workspaceId) return;
    configLoadedFor.current = workspaceId;
    // Sync persisted dashboard config when workspace changes.
    setConfig(loadConfig(workspaceId));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) return;
    saveConfig(workspaceId, config);
  }, [workspaceId, config]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProjectsLoading(true);
    listProjects(workspaceId, { limit: 100 })
      .then((page) => { if (active) setProjects(page.items ?? []); })
      .catch(() => { if (active) setProjects([]); })
      .finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [workspaceId]);

  const query = useMemo(() => {
    const q: { workspaceId: string; projectId?: string; range?: AnalyticsRange; startDate?: string; endDate?: string } = {
      workspaceId,
      range: config.range,
    };
    if (config.projectId) q.projectId = config.projectId;
    if (config.range === 'custom') {
      const start = isoDay(config.startDate);
      const end = isoDay(config.endDate);
      if (start) q.startDate = start;
      if (end) q.endDate = end;
    }
    return q;
  }, [workspaceId, config.range, config.projectId, config.startDate, config.endDate]);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const seq = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loadDashboardAggregates(query, config.widgets);
      if (seq !== latest.current) return;
      setData(result);
    } catch (e) {
      if (seq !== latest.current) return;
      setError(e instanceof Error ? e.message : 'Could not load analytics.');
    } finally {
      if (seq === latest.current) setLoading(false);
    }
  }, [workspaceId, query, config.widgets]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function toggleWidget(key: WidgetKey, checked: boolean) {
    setConfig((prev) => ({ ...prev, widgets: { ...prev.widgets, [key]: checked } }));
  }

  function handleExport() {
    if (!data) return;
    const csv = buildAnalyticsCsv(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `nexus-insights-${workspaceId || 'workspace'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Insights" />
        <EmptyState title="No workspace selected" description="Select a workspace to view its analytics dashboard." />
      </PageContainer>
    );
  }

  const projectOptions = [{ value: '', label: 'All accessible projects' }, ...projects.map((p) => ({ value: p.id, label: `${p.name} (${p.key})` }))];

  const hasAnyData = !!(data && (data.byStatus || data.byAssignee || data.throughput || data.workload || data.timeLogged));

  return (
    <PageContainer width="xl">
      <PageHeader
        title="Insights"
        description="Configurable dashboard widgets powered by aggregate workspace analytics."
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void load()} disabled={loading}>Refresh</Button>
            <Button variant="secondary" onClick={handleExport} disabled={!data || !hasAnyData}>
              Export CSV
            </Button>
          </div>
        }
      />

      <Card className="mb-5 p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Dashboard configuration</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Select
            id="ins-range"
            label="Reporting range"
            value={config.range}
            onChange={(e) => setConfig((p) => ({ ...p, range: e.target.value as AnalyticsRange }))}
            options={[
              { value: '7d', label: 'Last 7 days' },
              { value: '30d', label: 'Last 30 days' },
              { value: '90d', label: 'Last 90 days' },
              { value: 'custom', label: 'Custom range' },
            ]}
          />
          <Select
            id="ins-project"
            label="Project scope"
            value={config.projectId}
            onChange={(e) => setConfig((p) => ({ ...p, projectId: e.target.value }))}
            options={projectOptions}
            helperText={projectsLoading ? 'Loading projects…' : 'Workspace/project-scoped aggregates.'}
          />
          {config.range === 'custom' && (
            <>
              <Input id="ins-start" label="Start date" type="datetime-local" value={config.startDate} onChange={(e) => setConfig((p) => ({ ...p, startDate: e.target.value }))} />
              <Input id="ins-end" label="End date" type="datetime-local" value={config.endDate} onChange={(e) => setConfig((p) => ({ ...p, endDate: e.target.value }))} />
            </>
          )}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">Widgets</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {WIDGET_META.map((w) => (
              <Checkbox
                key={w.key}
                id={`widget-${w.key}`}
                label={w.label}
                description={w.description}
                checked={config.widgets[w.key]}
                onChange={(e) => toggleWidget(w.key, e.target.checked)}
              />
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => void load()}>Retry</Button>
        </Alert>
      )}
      {data && data.errors.length > 0 && (
        <Alert variant="warning" className="mb-4" title="Some widgets could not be loaded">
          <ul className="list-inside list-disc">
            {data.errors.map((e, i) => <li key={`${e.source}-${i}`}><span className="font-medium capitalize">{e.source}:</span> {e.message}</li>)}
          </ul>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {config.widgets.byStatus && (
          <WidgetCard
            title="Tasks by status"
            description={data?.byStatus ? `Range: ${data.byStatus.rangeDays} days${data.byStatus.projectId ? ' · project scoped' : ''}` : undefined}
            loading={loading && !data?.byStatus}
            error={data?.errors.find((e) => e.source === 'tasks by status')?.message}
            empty={!!data?.byStatus && data.byStatus.items.length === 0}
          >
            {data?.byStatus && (
              <div className="space-y-4">
                <BarList
                  ariaLabel="Tasks by status"
                  items={data.byStatus.items.map((i) => ({ id: i.status, label: labelize(i.status), value: i.count }))}
                  emptyLabel="No tasks in this range."
                />
                <PieChart
                  ariaLabel="Tasks by status distribution"
                  size={220}
                  items={data.byStatus.items.filter((i) => i.count > 0).map((i) => ({ id: i.status, label: labelize(i.status), value: i.count }))}
                  emptyLabel="No tasks in this range."
                />
              </div>
            )}
          </WidgetCard>
        )}

        {config.widgets.byAssignee && (
          <WidgetCard
            title="Tasks by assignee"
            description={data?.byAssignee ? `Range: ${data.byAssignee.rangeDays} days` : undefined}
            loading={loading && !data?.byAssignee}
            error={data?.errors.find((e) => e.source === 'tasks by assignee')?.message}
            empty={!!data?.byAssignee && data.byAssignee.items.length === 0}
          >
            {data?.byAssignee && (
              <BarList
                ariaLabel="Tasks by assignee"
                items={data.byAssignee.items.map((i) => ({ id: i.assigneeId ?? 'unassigned', label: i.assigneeName ?? 'Unassigned', value: i.count }))}
                emptyLabel="No task assignments in this range."
              />
            )}
          </WidgetCard>
        )}

        {config.widgets.throughput && (
          <WidgetCard
            title="Throughput"
            description={data?.throughput ? `Created ${data.throughput.created} · Completed ${data.throughput.completed} over ${data.throughput.rangeDays} days` : undefined}
            loading={loading && !data?.throughput}
            error={data?.errors.find((e) => e.source === 'throughput')?.message}
            empty={!!data?.throughput && data.throughput.items.length === 0}
          >
            {data?.throughput && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge variant="info">Created: {data.throughput.created}</Badge>
                  <Badge variant="success">Completed: {data.throughput.completed}</Badge>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Created</th>
                        <th className="py-2">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.throughput.items.map((p) => (
                        <tr key={p.date} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="py-2 pr-3">{p.date}</td>
                          <td className="py-2 pr-3 tabular-nums">{p.created}</td>
                          <td className="py-2 tabular-nums">{p.completed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </WidgetCard>
        )}

        {config.widgets.workload && (
          <WidgetCard
            title="Workload"
            description={data?.workload ? 'Current open and overdue tasks by assignee.' : undefined}
            loading={loading && !data?.workload}
            error={data?.errors.find((e) => e.source === 'workload')?.message}
            empty={!!data?.workload && data.workload.items.length === 0}
          >
            {data?.workload && (
              <div className="space-y-3">
                <BarList
                  ariaLabel="Open tasks by assignee"
                  items={data.workload.items.map((i) => ({ id: `open-${i.assigneeId ?? 'unassigned'}`, label: i.assigneeName ?? 'Unassigned', value: i.openTasks }))}
                  emptyLabel="No open workload."
                />
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                        <th className="py-2 pr-3">Assignee</th>
                        <th className="py-2 pr-3">Open</th>
                        <th className="py-2">Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.workload.items.map((i) => (
                        <tr key={i.assigneeId ?? 'unassigned'} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="py-2 pr-3">{i.assigneeName ?? 'Unassigned'}</td>
                          <td className="py-2 pr-3 tabular-nums">{i.openTasks}</td>
                          <td className="py-2 tabular-nums text-[var(--color-error)]">{i.overdueTasks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </WidgetCard>
        )}

        {config.widgets.timeLogged && (
          <WidgetCard
            title="Time logged"
            description={data?.timeLogged ? `Total ${formatMinutes(data.timeLogged.totalMinutes)} over ${data.timeLogged.rangeDays} days` : undefined}
            loading={loading && !data?.timeLogged}
            error={data?.errors.find((e) => e.source === 'time logged')?.message}
            empty={!!data?.timeLogged && data.timeLogged.items.length === 0}
          >
            {data?.timeLogged && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--color-text-primary)]"><span className="font-medium">Total:</span> {formatMinutes(data.timeLogged.totalMinutes)}</p>
                <BarList
                  ariaLabel="Time logged by user"
                  items={data.timeLogged.items.map((i) => ({ id: i.userId, label: i.userName ?? 'Unknown user', value: i.minutes }))}
                  emptyLabel="No time logged in this range."
                />
                <div className="overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--color-border)] text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                        <th className="py-2 pr-3">User</th>
                        <th className="py-2">Minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeLogged.items.map((i) => (
                        <tr key={i.userId} className="border-b border-[var(--color-border)] last:border-0">
                          <td className="py-2 pr-3">{i.userName ?? 'Unknown user'}</td>
                          <td className="py-2 tabular-nums">{i.minutes} ({formatMinutes(i.minutes)})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </WidgetCard>
        )}
      </div>

      {!Object.values(config.widgets).some(Boolean) && (
        <EmptyState title="No widgets selected" description="Enable at least one widget in Dashboard configuration to view analytics." />
      )}
    </PageContainer>
  );
}
