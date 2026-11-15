'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import type { TaskActivityItem } from '@/services/tasks';

function labelFor(action: string): string {
  const map: Record<string, string> = {
    'task.created': 'Task created',
    'task.updated': 'Task updated',
    'task.completed': 'Task completed',
    'task.reopened': 'Task reopened',
    'task.reviewed': 'Review started',
    'task.approved': 'Submission approved',
    'task.changes_requested': 'Changes requested',
    'task.assignee_added': 'Assignee added',
    'task.assignee_removed': 'Assignee removed',
    'task.dependency_added': 'Dependency added',
    'task.dependency_removed': 'Dependency removed',
    'task.comment_created': 'Comment added',
    'task.comment_updated': 'Comment updated',
    'task.comment_deleted': 'Comment deleted',
  };
  return map[action] ?? action.replace(/[._]/g, ' ');
}

export function TaskActivityTimeline({
  items,
  loading,
  error,
  hasMore,
  onLoadMore,
  loadingMore,
}: {
  items: TaskActivityItem[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}) {
  return (
    <section aria-labelledby="activity-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <h2 id="activity-heading" className="mb-3 text-base font-semibold">Activity</h2>
        {error ? <Alert variant="error" title="Activity error">{error}</Alert> : null}
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading activity…</p> : null}
        {!loading && items.length === 0 ? (
          <EmptyState title="No activity yet" description="Task activity will appear here." />
        ) : (
          <ul className="space-y-3" role="list">
            {items.map((item) => (
              <li key={item.id} className="border-l-2 border-[var(--color-border)] pl-3">
                <p className="text-sm font-medium">{labelFor(item.action)}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{new Date(item.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
        {hasMore ? (
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={onLoadMore} loading={loadingMore} disabled={loadingMore}>
              Load more
            </Button>
          </div>
        ) : null}
      </Card>
    </section>
  );
}
