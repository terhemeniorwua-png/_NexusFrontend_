'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface BookmarksCardProps {
  items: Array<{ id: string; title: string; url: string }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddBookmark: () => void;
}

export function BookmarksCard({
  items,
  loading,
  error,
  onRetry,
  onAddBookmark,
}: BookmarksCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Bookmarks</h3>
          <Skeleton className="h-4 w-20" />
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
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Bookmarks</h3>
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
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Bookmarks</h3>
        <Button variant="secondary" size="sm" onClick={() => void onAddBookmark()}>
          Add Bookmark
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No bookmarks yet</p>
          <Button variant="ghost" size="sm" onClick={() => void onAddBookmark()}>
            Add Bookmark
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((bookmark) => (
            <li key={bookmark.id} className="flex items-center gap-3">
              <span
                className="shrink-0 h-6 w-6 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] text-xs font-medium"
                aria-hidden="true"
              >
                🔖
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate text-sm font-medium text-[var(--color-primary)] hover:underline"
                  title={bookmark.title}
                >
                  {bookmark.title}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
