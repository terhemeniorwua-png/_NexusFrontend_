'use client';

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
import { listTasks } from '@/services/tasks';

type TaskStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED';

function statusLabel(s: TaskStatus): string {
  return s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function priorityLabel(p: string): string {
  return p.charAt(0) + p.slice(1).toLowerCase();
}

export default function WorkSubmissionsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspaceContext();
  const [tasks, setTasks] = useState<Array<{
    id: string;
    key: string;
    title: string;
    status: TaskStatus;
    projectId: string;
    projectKey: string;
    dueDate: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const highlightTaskId = searchParams.get('highlight') ?? undefined;
  const highlightRef = useRef<string | null>(highlightTaskId);

  // Poll for task updates
  useEffect(() => {
    let active = true;
    async function poll() {
      if (!active || !activeWorkspace) return;
      try {
        setError(null);
        const result = await listMyTasks(activeWorkspace.id, user?.id ?? '', {
          limit: 100,
        });
        const allTasks = result.items.map((t) => ({
          id: t.id,
          key: t.key,
          title: t.title,
          status: t.status,
          projectId: t.projectId,
          projectKey: t.projectName || (t.key?.split('-')[0] ?? ''),
          dueDate: t.dueDate,
        }));
        setTasks(allTasks.filter(
          (t) => t.status === 'SUBMITTED' || t.status === 'UNDER_REVIEW' || t.status === 'CHANGES_REQUESTED'
        ));
        highlightRef.current = highlightTaskId;
      } catch (e) {
        setError('Your tasks could not be loaded. Retrying shortly.');
      }
    }
    void poll().finally(() => { if (active) setLoading(false); });
    const interval = setInterval(() => void poll(), 30_000);
    return () => { active = false; clearInterval(interval); };
  }, [activeWorkspace, user?.id]);

  if (loading || !activeWorkspace) {
    return (
      <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <h2 className="text-2xl font-semibold mb-6">My Submissions</h2>

      {!tasks.length && !error ? (
        <EmptyState
          title="No submissions found"
          description="You don't have any tasks currently submitted for review."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="p-4 hover:bg-[var(--color-surface-secondary)] transition-colors">
              <div className="flex flex-col h-48">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium truncate">{task.title}</h3>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      {task.projectKey || '—'} project
                    </p>
                  </div>
                  <Badge variant="info">{statusLabel(task.status)}</Badge>
                </div>
                <div className="mt-3">
                  <p className="text-sm">
                    {task.dueDate ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(task.dueDate)) : '—'}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 w-full"
                onClick={() => router.push(`/app/projects/${task.projectId}/tasks/${task.id}`)}
              >
                View task
              </Button>
            </Card>
          ))}
        </div>
      )}

      {highlightTaskId && tasks.some((t) => t.id === highlightTaskId) && (
        <Alert variant="success" className="mt-4" title="Task highlighted">
          You are viewing a specific task. Use the filter controls to adjust your view.
        </Alert>
      )}
    </div>
  );
}