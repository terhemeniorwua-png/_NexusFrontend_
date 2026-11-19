'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface DocsCardProps {
  items: Array<{ id: string; title: string; updatedAt: string; url: string }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onAddDoc: () => void;
}

export function DocsCard({
  items,
  loading,
  error,
  onRetry,
  onAddDoc,
}: DocsCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Docs</h3>
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
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Docs</h3>
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
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Docs</h3>
        <Button variant="secondary" size="sm" onClick={() => void onAddDoc()}>
          Add a Doc
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No documents yet</p>
          <Button variant="ghost" size="sm" onClick={() => void onAddDoc()}>
            Add a Doc
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3">
              <span
                className="shrink-0 h-6 w-6 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] text-xs font-medium"
                aria-hidden="true"
              >
                D
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={doc.url}
                  className="truncate text-sm font-medium text-[var(--color-text-primary)] hover:underline"
                  title={doc.title}
                >
                  {doc.title}
                </a>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0">
                View all
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
