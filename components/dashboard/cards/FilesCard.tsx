'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';

interface FilesCardProps {
  items: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
    uploadedById: string;
  }>;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onUploadFiles: () => void;
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎬';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv') return '📊';
  if (mimeType.includes('presentation')) return '📑';
  if (mimeType === 'application/zip') return '📦';
  return '📎';
}

export function FilesCard({
  items,
  loading,
  error,
  onRetry,
  onUploadFiles,
}: FilesCardProps) {
  if (loading) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Files</h3>
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
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Files</h3>
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
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Files</h3>
        <Button variant="secondary" size="sm" onClick={() => void onUploadFiles()}>
          Upload files
        </Button>
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">No files yet</p>
          <Button variant="ghost" size="sm" onClick={() => void onUploadFiles()}>
            Upload files
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((file) => (
            <li key={file.id} className="flex items-center gap-3">
              <span className="shrink-0 text-xl" aria-hidden="true">
                {fileIcon(file.mimeType)}
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-[var(--color-text-primary)] truncate block">
                  {file.fileName}
                </span>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Uploaded {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
