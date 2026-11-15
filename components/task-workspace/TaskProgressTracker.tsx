'use client';

import type { TaskProgress } from '@/services/tasks';

export function TaskProgressTracker({
  progress,
  className = '',
}: {
  progress: TaskProgress;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, progress.percent));
  return (
    <div className={className}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
        <span>Progress</span>
        <span>
          {progress.completed}/{progress.total} approved ({pct}%)
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Task progress ${pct} percent`}
      >
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
