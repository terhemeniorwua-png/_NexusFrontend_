'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  listFiles,
  getFileUsage,
  uploadFile,
  downloadFile,
  fetchFileBlob,
  deleteFile,
  formatBytes,
  fileCategory,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ApiRequestError,
  type FileSummary,
  type FileUsage,
} from '@/services/files';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

// ─── Storage usage bar ────────────────────────────────────────────────────────

function UsageBar({ usage }: { usage: FileUsage }) {
  const MAX_DISPLAY_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB display scale
  const percent = Math.min(100, (usage.totalBytes / MAX_DISPLAY_BYTES) * 100);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-[var(--color-text-primary)]">
          Storage: {formatBytes(usage.totalBytes)} used · {usage.fileCount} {usage.fileCount === 1 ? 'file' : 'files'}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={usage.totalBytes}
          aria-valuemin={0}
          aria-valuemax={MAX_DISPLAY_BYTES}
          aria-label={`${formatBytes(usage.totalBytes)} storage used`}
        />
      </div>
    </Card>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  file: FileSummary;
  onDownload: (file: FileSummary) => void;
  onPreview: (file: FileSummary) => void;
  onDelete: (file: FileSummary) => void;
  downloading: boolean;
}

function FileRow({ file, onDownload, onPreview, onDelete, downloading }: FileRowProps) {
  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <span className="shrink-0 text-xl" aria-hidden="true">{fileIcon(file.mimeType)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{file.fileName}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {fileCategory(file.mimeType)} · {formatBytes(file.sizeBytes)} · {relativeTime(file.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPreview(file)}
          aria-label={`Preview ${file.fileName}`}
        >
          Preview
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDownload(file)}
          disabled={downloading}
          aria-label={`Download ${file.fileName}`}
        >
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onDelete(file)}
          aria-label={`Delete ${file.fileName}`}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

// ─── Upload area ──────────────────────────────────────────────────────────────

interface UploadAreaProps {
  workspaceId: string;
  onUploaded: (file: FileSummary) => void;
}

function UploadArea({ workspaceId, onUploaded }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const currentAbort = useRef<(() => void) | null>(null);

  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${file.name} exceeds the 50 MB limit (${formatBytes(file.size)}).`;
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return `${file.name}: file type "${file.type || 'unknown'}" is not supported.`;
    }
    return null;
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || uploading) return;
    const file = files[0];
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }

    setUploading(true);
    setProgress(0);
    setError(null);

    const { promise, abort } = uploadFile({
      workspaceId,
      file,
      onProgress: setProgress,
    });
    currentAbort.current = abort;

    try {
      const result = await promise;
      onUploaded(result);
      setProgress(0);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UPLOAD_ABORTED') {
        setError(null);
      } else {
        setError(err instanceof ApiRequestError ? err.message : 'Upload failed. Please try again.');
      }
    } finally {
      setUploading(false);
      currentAbort.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="mb-5">
      {error && (
        <Alert variant="error" className="mb-3">{error}</Alert>
      )}
      {uploading ? (
        <Card className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <p className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">Uploading… {progress}%</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Upload progress ${progress}%`}
              />
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => currentAbort.current?.()}
          >
            Cancel
          </Button>
        </Card>
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload file — click or drag and drop"
          className={[
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed p-8 text-center transition-colors',
            dragOver
              ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-secondary)]',
          ].join(' ')}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          <span className="text-3xl" aria-hidden="true">📁</span>
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Drop a file here, or click to upload
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Max 50 MB · PDF, images, Office documents, video, audio, and more
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={(e) => { void handleFiles(e.target.files); }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [usage, setUsage] = useState<FileUsage | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FileSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<FileSummary | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewSeq = useRef(0);

  const latestLoad = useRef(0);
  const loadedFor = useRef('');

  const load = useCallback(async (wsId: string, cursor?: string, append = false) => {
    if (!wsId) return;
    const seq = ++latestLoad.current;
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }

    try {
      const [result, usageResult] = await Promise.all([
        listFiles(wsId, { cursor, limit: 25 }),
        append ? Promise.resolve(null) : getFileUsage(wsId),
      ]);
      if (seq !== latestLoad.current) return;
      loadedFor.current = wsId;
      if (append) setFiles((prev) => [...prev, ...result.items]);
      else { setFiles(result.items); if (usageResult) setUsage(usageResult); }
      setNextCursor(result.nextCursor);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load files.');
    } finally {
      if (seq === latestLoad.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load(workspaceId) : undefined);
    return () => { active = false; };
  }, [workspaceId, load]);

  function handleUploaded(file: FileSummary) {
    setFiles((prev) => [file, ...prev]);
    setUsage((prev) =>
      prev ? { totalBytes: prev.totalBytes + file.sizeBytes, fileCount: prev.fileCount + 1 } : null,
    );
  }

  async function handleDownload(file: FileSummary) {
    setDownloadingId(file.id);
    setDownloadError(null);
    try {
      await downloadFile(workspaceId, file.id, file.fileName);
    } catch (err) {
      setDownloadError(err instanceof ApiRequestError ? err.message : 'Download failed. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  }

  function releasePreviewUrl() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function closePreview() {
    previewSeq.current += 1;
    releasePreviewUrl();
    setPreviewFile(null);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewError(null);
    setPreviewLoading(false);
  }

  useEffect(() => () => {
    previewSeq.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  async function handlePreview(file: FileSummary) {
    const seq = ++previewSeq.current;
    releasePreviewUrl();
    setPreviewFile(file);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewError(null);

    const isImage = file.mimeType.startsWith('image/');
    const isPdf = file.mimeType === 'application/pdf';
    const isVideo = file.mimeType.startsWith('video/');
    const isAudio = file.mimeType.startsWith('audio/');
    const isText = file.mimeType.startsWith('text/')
      || file.mimeType === 'application/json';
    if (!isImage && !isPdf && !isVideo && !isAudio && !isText) return;

    setPreviewLoading(true);
    try {
      const blob = await fetchFileBlob(workspaceId, file.id);
      if (seq !== previewSeq.current) return;
      if (isText) {
        setPreviewText(await blob.text());
      } else {
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
      }
    } catch (err) {
      if (seq !== previewSeq.current) return;
      setPreviewError(err instanceof ApiRequestError ? err.message : 'Could not load the preview.');
    } finally {
      if (seq === previewSeq.current) setPreviewLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFile(workspaceId, pendingDelete.id);
      const deleted = pendingDelete;
      setFiles((prev) => prev.filter((f) => f.id !== deleted.id));
      setUsage((prev) =>
        prev ? { totalBytes: Math.max(0, prev.totalBytes - deleted.sizeBytes), fileCount: Math.max(0, prev.fileCount - 1) } : null,
      );
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Could not delete file.');
    } finally {
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Files" />
        <EmptyState title="No workspace selected" description="Select a workspace to manage files." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Files"
        description="Upload, download, and manage workspace files."
      />

      {usage && <div className="mb-5"><UsageBar usage={usage} /></div>}

      <UploadArea workspaceId={workspaceId} onUploaded={handleUploaded} />

      {downloadError && (
        <Alert variant="error" className="mb-4">{downloadError}</Alert>
      )}
      {deleteError && (
        <Alert variant="error" className="mb-4">{deleteError}</Alert>
      )}

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading files">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
              <Skeleton className="size-6 shrink-0 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20 shrink-0" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Alert variant="error">
          {error}
          <Button variant="secondary" size="sm" className="mt-2" onClick={() => { void load(workspaceId); }}>
            Retry
          </Button>
        </Alert>
      ) : files.length === 0 ? (
        <EmptyState
          title="No files yet"
          description="Upload a file above to get started."
        />
      ) : (
        <ul className="space-y-2" aria-label="Workspace files">
          {files.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              onDownload={handleDownload}
              onPreview={(target) => { void handlePreview(target); }}
              onDelete={setPendingDelete}
              downloading={downloadingId === file.id}
            />
          ))}
        </ul>
      )}

      {nextCursor && !loading && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => { void load(workspaceId, nextCursor, true); }}
            loading={loadingMore}
            disabled={loadingMore}
          >
            Load more
          </Button>
        </div>
      )}

      <Modal
        open={previewFile !== null}
        onClose={closePreview}
        title={previewFile?.fileName ?? 'File preview'}
        maxWidth="xl"
        footer={previewFile ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closePreview}>Close</Button>
            <Button
              onClick={() => { void handleDownload(previewFile); }}
              loading={downloadingId === previewFile.id}
            >
              Download
            </Button>
          </div>
        ) : undefined}
      >
        {previewLoading ? (
          <div aria-busy="true" aria-label="Loading preview">
            <Skeleton className="h-40 w-full" />
          </div>
        ) : previewError ? (
          <Alert variant="error">{previewError}</Alert>
        ) : previewFile && previewUrl && previewFile.mimeType.startsWith('image/') ? (
          <Image
            src={previewUrl}
            alt={previewFile.fileName}
            fill
            className="max-h-[60vh] w-full rounded-[var(--radius-md)] object-contain"
            sizes="100vw"
          />
        ) : previewFile && previewUrl && previewFile.mimeType === 'application/pdf' ? (
          <iframe
            src={previewUrl}
            title={previewFile.fileName}
            className="h-[60vh] w-full rounded-[var(--radius-md)] border-0"
          />
        ) : previewFile && previewUrl && previewFile.mimeType.startsWith('video/') ? (
          <video src={previewUrl} controls className="max-h-[60vh] w-full rounded-[var(--radius-md)]">
            <track kind="captions" />
          </video>
        ) : previewFile && previewUrl && previewFile.mimeType.startsWith('audio/') ? (
          <audio src={previewUrl} controls className="w-full" />
        ) : previewText !== null ? (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-primary)]">
            {previewText}
          </pre>
        ) : (
          <p className="text-sm text-[var(--color-text-secondary)]">
            Preview isn&apos;t available for this file type. Download the file to open it locally.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete file"
        description={`Delete "${pendingDelete?.fileName ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => { void handleConfirmDelete(); }}
        onClose={() => { setPendingDelete(null); setDeleteError(null); }}
        loading={deleting}
      />
    </PageContainer>
  );
}
