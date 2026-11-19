'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface ListsCardProps {
  items: Array<{
    id: string;
    name: string;
    taskCount: number;
    completedCount: number;
    url: string;
  }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export function ListsCard({
  items,
  loading,
  error,
  onRetry,
}: ListsCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Lists</h3>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Lists</h3>
          <Button variant="secondary" size="sm" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
        <Alert variant="error">{error}</Alert>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Lists</h3>
        <Button variant="secondary" size="sm">View all</Button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No lists yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((list) => (
            <li key={list.id} className="flex items-center gap-3">
              <span
                className="shrink-0 h-6 w-6 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] text-xs font-medium"
                aria-hidden="true"
              >
                L
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={list.url}
                  className="truncate text-sm font-medium text-[var(--color-text-primary)] hover:underline"
                  title={list.name}
                >
                  {list.name}
                </a>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {list.completedCount}/{list.taskCount} tasks
                </p>
              </div>
              <div className="w-24 h-1.5 rounded-full bg-[var(--color-surface-secondary)] overflow-hidden">
                <div
                  className="h-full bg-[var(--color-primary)]"
                  style={{
                    width:
                      list.taskCount > 0
                        ? Math.round((list.completedCount / list.taskCount) * 100)
                        : 0,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
