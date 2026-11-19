'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface FoldersCardProps {
  items: Array<{ id: string; name: string; itemCount: number }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddFolder: () => void;
}

export function FoldersCard({
  items,
  loading,
  error,
  onRetry,
  onAddFolder,
}: FoldersCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Folders</h3>
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
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Folders</h3>
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
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Folders</h3>
        <Button variant="secondary" size="sm" onClick={() => void onAddFolder()}>
          Add Folder
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No folders yet</p>
          <Button variant="ghost" size="sm" onClick={() => void onAddFolder()}>
            Add Folder
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((folder) => (
            <li key={folder.id} className="flex items-center gap-3">
              <span
                className="shrink-0 h-6 w-6 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] text-xs font-medium"
                aria-hidden="true"
              >
                📁
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {folder.name}
                </span>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {folder.itemCount} item{folder.itemCount !== 1 ? 's' : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
