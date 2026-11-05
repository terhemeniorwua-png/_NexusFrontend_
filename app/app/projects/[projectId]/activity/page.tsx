'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { AccessState } from '@/components/shared/AccessState';
import { ApiRequestError } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { listProjectActivity, type ProjectActivity } from '@/services/projects';

function dateTimeLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatAction(action: string): string {
  return action.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function ProjectActivityPage({ params }: { params: { projectId: string } }) {
  const { activeWorkspace } = useWorkspaceContext();
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [accessStatus, setAccessStatus] = useState<null | 401 | 403>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true); setError(null); setAccessStatus(null); setActivity([]); setNextCursor(null);
    try {
      const page = await listProjectActivity(activeWorkspace.id, params.projectId, { limit: 25 });
      setActivity(page.items);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (cause instanceof ApiRequestError && (cause.status === 401 || cause.status === 403)) {
        setAccessStatus(cause.status);
      } else {
        setError(cause instanceof ApiRequestError ? cause.message : 'Project activity could not be loaded.');
      }
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace, params.projectId]);

  async function loadMore() {
    if (!activeWorkspace || !nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listProjectActivity(activeWorkspace.id, params.projectId, { cursor: nextCursor, limit: 25 });
      setActivity((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setError(cause instanceof ApiRequestError ? cause.message : 'More activity could not be loaded.');
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => { let active = true; void Promise.resolve().then(() => active ? load() : undefined); return () => { active = false; }; }, [load]);

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading activity">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (accessStatus) return <AccessState status={accessStatus} onRetry={() => void load()} />;
  if (error) return <Alert variant="error" title="Activity unavailable">{error}</Alert>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Activity</h2>

      {activity.length === 0 ? (
        <EmptyState title="No activity yet" description="Project changes and events will appear here." />
      ) : (
        <Card className="p-4">
          <ol className="divide-y divide-[var(--color-border)]" aria-label="Project activity">
            {activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{formatAction(item.action)}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{dateTimeLabel(item.createdAt)}</p>
                </div>
              </li>
            ))}
          </ol>

          {nextCursor && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" loading={loadingMore} onClick={() => void loadMore()}>
                Load more
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
