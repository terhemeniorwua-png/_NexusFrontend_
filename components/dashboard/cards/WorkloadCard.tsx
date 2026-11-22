'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface WorkloadCardProps {
  entries: Array<{
    userId: string;
    user: { id: string; name: string };
    statusCounts: Record<string, number>;
    total: number;
  }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  AWAITING_CLARIFICATION: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  IN_PROGRESS: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
  SUBMITTED: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  UNDER_REVIEW: 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]',
  APPROVED: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
  CHANGES_REQUESTED: 'bg-[var(--color-error-bg)] text-[var(--color-error)]',
};

function statusLabel(status: string): string {
  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function WorkloadCard({
  entries,
  loading,
  error,
  onRetry,
}: WorkloadCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Workload by Status</h3>
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
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
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Workload by Status</h3>
          <Button variant="secondary" size="sm" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
        <Alert variant="error">{error}</Alert>
      </section>
    );
  }

  // Collect all statuses across all entries
  const allStatuses = new Set<string>();
  entries.forEach((e) => Object.keys(e.statusCounts).forEach((s) => allStatuses.add(s)));

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Workload by Status
        </h3>
        <Button variant="secondary" size="sm">View all</Button>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No workload data</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const statuses = Object.entries(entry.statusCounts).filter(
              ([, count]) => count > 0,
            );
            return (
              <div key={entry.userId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">
                    {entry.user.name}
                  </span>
                  <span className="ml-auto text-xs font-medium text-[var(--color-text-muted)]">
                    {entry.total}
                  </span>
                </div>
                <div className="space-y-1">
                  {statuses.map(([status, count]) => (
                    <div
                      key={status}
                      className="flex items-center gap-2"
                    >
                      <span className="text-xs text-[var(--color-text-secondary)] w-16">
                        {statusLabel(status)}
                      </span>
                      <div className="flex-1 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                        <div
                          className={`h-full ${STATUS_COLORS[status] ?? 'bg-[var(--color-surface-secondary)]'}`}
                          style={{
                            width:
                              entry.total > 0
                                ? Math.round((count / entry.total) * 100)
                                : 0,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-[var(--color-text-muted)] w-4 text-right">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
