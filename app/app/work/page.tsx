'use client';

import { listMyTasks } from '@/lib/work-tasks';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

export default function WorkOverviewPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeWorkspace, user } = useWorkspaceContext();
  const [tasks, setTasks] = useState<number>(0);
  const [submissions, setSubmissions] = useState<number>(0);
  const [completed, setCompleted] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const highlightTaskId = searchParams.get('highlight') ?? undefined;

  // Poll for task counts
  useEffect(() => {
    let active = true;
    async function poll() {
      if (!active || !activeWorkspace) return;
      try {
        setError(null);
        const result = await listMyTasks(activeWorkspace.id, user?.id ?? '', {
          limit: 100,
        });
        const allTasks = result.items.map((t) => t.status);
        const countAssigned = allTasks.filter((s: string) => s === 'ASSIGNED').length;
        const countInProgress = allTasks.filter((s: string) => s === 'IN_PROGRESS' || s === 'SUBMITTED' || s === 'UNDER_REVIEW').length;
        const countSubmitted = allTasks.filter((s: string) => s === 'SUBMITTED').length;
        const countCompleted = allTasks.filter((s: string) => s === 'APPROVED' || s === 'COMPLETED').length;
        setTasks(countAssigned + countInProgress);
        setSubmissions(countSubmitted);
        setCompleted(countCompleted);
      } catch (e) {
        setError('Your work summary could not be loaded. Retrying shortly.');
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
      <h2 className="text-2xl font-semibold mb-6">
        Work Overview{' '}
        {highlightTaskId && <span className="text-sm text-[var(--color-text-secondary)]">(highlighted: {highlightTaskId})</span>}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Tasks card */}
        <Card>
          <div className="p-6">
            <div className="flex items-baseline gap-2">
              <Badge variant="outline" className="text-4xl font-bold">{tasks}</Badge>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Tasks</p>
                <p className="text-xs text-[var(--color-text-muted)]">Assigned to me</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Submissions card */}
        <Card>
          <div className="p-6">
            <div className="flex items-baseline gap-2">
              <Badge variant="outline" className="text-4xl font-bold">{submissions}</Badge>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Submissions</p>
                <p className="text-xs text-[var(--color-text-muted)]">Pending review</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Completed card */}
        <Card>
          <div className="p-6">
            <div className="flex items-baseline gap-2">
              <Badge variant="outline" className="text-4xl font-bold">{completed}</Badge>
              <div>
                <p className="text-sm text-[var(--color-text-secondary)]">Completed</p>
                <p className="text-xs text-[var(--color-text-muted)]">Approved/completed work</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}