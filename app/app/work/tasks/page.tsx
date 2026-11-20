'use client';

import Link from 'next/link';
import { listMyTasks } from '@/lib/work-tasks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { listProjects, type ProjectSummary } from '@/services/projects';
import { type TaskPriority } from '@/services/tasks';

type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';

function statusLabel(s: TaskStatus): string {
  return s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function priorityLabel(p: string): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export default function WorkMyTasksPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspaceContext();
  const activeWorkspaceId = activeWorkspace?.id ?? null;
  const userId = user?.id ?? '';
  const [tasks, setTasks] = useState<Array<{ id: string; key: string; title: string; status: TaskStatus; projectId: string; projectKey: string; dueDate: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<TaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | ''>('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const highlightTaskId = searchParams.get('highlight') ?? undefined;
  const highlightRef = useRef<string | null>(highlightTaskId);

  // Helper to get priority from search param safely
  const getPriorityParam = (): TaskPriority | undefined => {
    const p = searchParams.get('priority');
    if (p && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(p)) return p as TaskPriority;
    return undefined;
  };

  // Poll for task updates
  useEffect(() => {
    let active = true;
    async function poll() {
      if (!active || !activeWorkspaceId) return;
      try {
        setError(null);
        const result = await listMyTasks(activeWorkspaceId, userId, {
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          limit: 50,
        });
        setTasks(result.items.map((t) => ({
          id: t.id,
          key: t.key,
          title: t.title,
          status: t.status,
          projectId: t.projectId,
          projectKey: t.projectName || (t.key?.split('-')[0] ?? ''),
          dueDate: t.dueDate,
        })));
        highlightRef.current = highlightTaskId;
      } catch (e) {
        setError('Your tasks could not be loaded. Retrying shortly.');
      }
    }
    void poll().finally(() => { if (active) setLoading(false); });
    const interval = setInterval(() => void poll(), 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [activeWorkspaceId, userId, filterStatus, filterPriority, highlightTaskId]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      setProjects([]);
      setSelectedProjectId('');
      setProjectsLoading(false);
      return;
    }
    let active = true;
    setProjectsLoading(true);
    void listProjects(activeWorkspaceId, { limit: 100 })
      .then((result) => {
        if (!active) return;
        const available = result.items.filter((project) => project.status !== 'ARCHIVED');
        setProjects(available);
        setSelectedProjectId(available[0]?.id ?? '');
        setShowProjectPicker(false);
      })
      .catch(() => {
        if (!active) return;
        setProjects([]);
        setSelectedProjectId('');
        setShowProjectPicker(false);
      })
      .finally(() => { if (active) setProjectsLoading(false); });
    return () => { active = false; };
  }, [activeWorkspaceId]);

  if (loading || projectsLoading || !activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  // Build status filter options from enum
  const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
    { value: 'ASSIGNED', label: 'Assigned' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'SUBMITTED', label: 'Submitted' },
    { value: 'UNDER_REVIEW', label: 'Under Review' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  ];

  const hasHighlight = highlightTaskId && tasks.some((t) => t.id === highlightTaskId);
  const singleProject = projects.length === 1 ? projects[0] : null;
  const linkButtonClass = 'inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2';
  const createAction = singleProject ? (
    <Link href={`/app/projects/${singleProject.id}/tasks?create=1`} className={linkButtonClass}>
      Create task
    </Link>
  ) : projects.length > 1 ? (
    showProjectPicker ? (
      <div className="flex flex-col items-start gap-2">
        <label htmlFor="create-task-project" className="text-sm font-medium text-[var(--color-text-primary)]">
          Choose a project
        </label>
        <select
          id="create-task-project"
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <Button
          onClick={() => router.push(`/app/projects/${selectedProjectId}/tasks?create=1`)}
          disabled={!selectedProjectId}
        >
          Continue
        </Button>
      </div>
    ) : (
      <Button onClick={() => setShowProjectPicker(true)}>Create task</Button>
    )
  ) : (
    <Link href="/app/projects" className={linkButtonClass}>Go to Projects</Link>
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <h2 className="text-2xl font-semibold mb-6">
        My Tasks{' '}
        {highlightTaskId && <span className="text-sm text-[var(--color-text-secondary)]">(highlighted: {highlightTaskId})</span>}
      </h2>

      <Card>
        <div className="p-4 mb-4">
          <form
            className="flex flex-wrap items-end gap-3"
            role="search"
            aria-label="Filter tasks"
            onSubmit={(e) => {
              e.preventDefault();
              const priorityParam = filterPriority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(filterPriority)
                ? filterPriority
                : '';
              router.replace(`/app/work/tasks?status=${filterStatus}&priority=${priorityParam}&highlight=${highlightTaskId ?? ''}`);
            }}
          >
            <div className="flex-1 min-w-48">
              <select
                onChange={(e) => setFilterStatus(e.target.value as TaskStatus | '')}
                className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] placeholder-text-[var(--color-text-muted)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-32">
              <select
                onChange={(e) => setFilterPriority(e.target.value as TaskPriority | '')}
                className="flex h-9 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] placeholder-text-[var(--color-text-muted)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <option value="">All priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <Button type="submit" variant="secondary" loading={false}>
              Filter
            </Button>
          </form>
        </div>
      </Card>

      {tasks.length === 0 && !error ? (
        <EmptyState
          title="No tasks found"
          description={projects.length === 0
            ? "You don't have any projects yet. Create a project before adding tasks."
            : "You don't have any tasks assigned yet. Create your first task to get started."}
          action={createAction}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full rounded-md border border-[var(--color-border)]">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Key</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Title</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Project</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Status</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Priority</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">Due</th>
                <th className="p-3 text-left text-xs font-medium text-[var(--color-text-secondary)]"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]">
                  <td className="p-3 font-mono text-sm text-[var(--color-text-muted)]">{task.key}</td>
                  <td className="p-3">
                    <Link
                      href={`/app/projects/${task.projectId}/tasks/${task.id}`}
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      {task.title}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-[var(--color-text-muted)]">{task.projectKey || '—'}</td>
                  <td className="p-3">
                    <Badge variant={task.status}>{statusLabel(task.status)}</Badge>
                  </td>
                  <td className="p-3 text-sm text-[var(--color-text-muted)]">
                    {filterPriority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(filterPriority)
                      ? priorityLabel(filterPriority)
                      : '—'}
                  </td>
                  <td className="p-3 text-sm">
                    {task.dueDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(task.dueDate)) : '—'}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="ghost"
                      aria-label="View task"
                      onClick={() => router.push(`/app/projects/${task.projectId}/tasks/${task.id}`)}
                    >
                      <svg
                        aria-hidden="true"
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasHighlight && (
        <Alert variant="success" className="mt-4" title="Task highlighted">
          You are viewing a specific task. Use the filter controls to adjust your view.
        </Alert>
      )}
    </div>
  );
}