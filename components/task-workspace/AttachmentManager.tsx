'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Alert } from '@/components/ui/Alert';
import { PermissionButton } from '@/components/shared/PermissionButton';
import { Can } from '@/components/shared/Can';
import { ApiRequestError } from '@/lib/api';
import { deleteFile, downloadFile, uploadFile, formatBytes, type FileSummary } from '@/services/files';

export function AttachmentManager({
  workspaceId,
  projectId,
  taskId,
  files,
  loading,
  error,
  onReload,
}: {
  workspaceId: string;
  projectId: string;
  taskId: string;
  files: FileSummary[];
  loading: boolean;
  error: string | null;
  onReload: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onUpload(file: File) {
    setBusy(true); setLocalError(null); setProgress(0);
    try {
      const { promise } = uploadFile({
        workspaceId,
        file,
        projectId,
        taskId,
        onProgress: (percent: number) => setProgress(percent),
      });
      await promise;
      await onReload();
    } catch (e) {
      setLocalError(e instanceof ApiRequestError ? e.message : 'Upload failed.');
    } finally {
      setBusy(false); setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onDelete(fileId: string) {
    setBusy(true); setLocalError(null);
    try {
      await deleteFile(workspaceId, fileId);
      await onReload();
    } catch (e) {
      setLocalError(e instanceof ApiRequestError ? e.message : 'Delete failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="attachments-heading" className="space-y-4">
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="attachments-heading" className="text-base font-semibold">Attachments</h2>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              aria-label="Upload attachment"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); }}
            />
            <Can permission="file.upload">
              <Button size="sm" onClick={() => inputRef.current?.click()} disabled={busy} loading={busy && progress !== null}>
                Upload
              </Button>
            </Can>
          </div>
        </div>
        {progress !== null ? <p className="mb-2 text-xs text-[var(--color-text-secondary)]">Uploading… {progress}%</p> : null}
        {error || localError ? <Alert variant="error" title="Attachments error">{localError ?? error}</Alert> : null}
        {loading ? <p className="text-sm text-[var(--color-text-secondary)]">Loading attachments…</p> : null}
        {!loading && files.length === 0 ? (
          <EmptyState title="No attachments" description="Files uploaded for this task will appear here." />
        ) : (
          <ul className="space-y-2" role="list">
            {files.map((file) => (
              <li key={file.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{file.fileName}</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">{formatBytes(file.sizeBytes)} · {file.mimeType}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void downloadFile(workspaceId, file.id, file.fileName)}>Download</Button>
                  <PermissionButton permission={['file.delete.own', 'file.delete.any']} mode="any" size="sm" variant="secondary" onClick={() => void onDelete(file.id)} deniedReason="You do not have permission to delete this file.">
                    Delete
                  </PermissionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
