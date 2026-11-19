'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import {
  listFiles,
  uploadFile,
  downloadFile,
  fetchFileBlob,
  deleteFile,
  formatBytes,
  fileCategory,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  ApiRequestError,
} from '@/services/files';
import { BookmarkDialog } from './BookmarkDialog';

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

interface ResourceItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy?: { id: string; name: string };
  itemCount?: number;
}

// ─── Folder Breadcrumb ───────────────────────────────────────────────────────

interface FolderBreadcrumbProps {
  path: Array<{ id: string; name: string }>;
  onNavigate: (folderId: string | null) => void;
}

export function FolderBreadcrumb({
  path,
  onNavigate,
}: FolderBreadcrumbProps) {
  return (
    <nav
      aria-label="Folder navigation"
      className="flex items-center gap-1 overflow-x-auto pb-2"
    >
      <button
        type="button"
        onClick={() => void onNavigate(null)}
        className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:underline"
        aria-label="All files"
      >
        All files
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
          <span className="text-[var(--color-text-secondary)]">/</span>
          <button
            type="button"
            onClick={() => void onNavigate(folder.id)}
            className="text-sm text-[var(--color-text-primary)] hover:underline"
          >
            {folder.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

// ─── Resource Row ────────────────────────────────────────────────────────────

interface ResourceRowProps {
  item: ResourceItem;
  onDownload: (item: ResourceItem) => void;
  onPreview: (item: ResourceItem) => void;
  onRename: (item: ResourceItem) => void;
  onMove: (item: ResourceItem) => void;
  onDelete: (item: ResourceItem) => void;
  downloading: boolean;
}

function ResourceRow({
  item,
  onDownload,
  onPreview,
  onRename,
  onMove,
  onDelete,
  downloading,
}: ResourceRowProps) {
  const isFolder = item.type === 'folder';
  const icon = isFolder ? '📁' : fileIcon(item.mimeType ?? '');

  return (
    <li className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
      <span className="shrink-0 text-xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {item.name}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {isFolder
            ? `${item.itemCount ?? 0} item${(item.itemCount ?? 0) !== 1 ? 's' : ''}`
            : `${fileCategory(item.mimeType ?? '')} · ${formatBytes(item.sizeBytes ?? 0)}`}
        </p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {relativeTime(item.updatedAt)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isFolder && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void onPreview(item)}
              aria-label={`Preview ${item.name}`}
            >
              Preview
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void onDownload(item)}
              disabled={downloading}
              aria-label={`Download ${item.name}`}
            >
              {downloading ? 'Downloading…' : 'Download'}
            </Button>
          </>
        )}
        <Dropdown
          label="Actions"
          triggerLabel="Actions"
          items={[
            {
              id: 'rename',
              label: 'Rename',
              onSelect: () => void onRename(item),
            },
            {
              id: 'move',
              label: 'Move',
              onSelect: () => void onMove(item),
            },
            {
              id: 'delete',
              label: 'Delete',
              destructive: true,
              onSelect: () => void onDelete(item),
            },
          ]}
        />
      </div>
    </li>
  );
}

// ─── Upload Dialog ───────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  onUploaded: () => void;
}

export function UploadDialog({
  open,
  onClose,
  workspaceId,
  onUploaded,
}: UploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Array<{
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress: number;
    error: string | null;
  }>>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeAborts = useRef<Map<string, () => void>>(new Map());

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `${file.name} exceeds the 50 MB limit.`;
    }
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return `${file.name}: file type "${file.type || 'unknown'}" is not supported.`;
    }
    return null;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validationErrors = fileArray
      .map((f) => validateFile(f))
      .filter(Boolean);
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }

    const newUploads = fileArray.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file: f,
      status: 'pending' as const,
      progress: 0,
      error: null,
    }));
    setUploads((prev) => [...prev, ...newUploads]);
    setError(null);
    await processQueue();
  };

  const processQueue = async () => {
    const pending = uploads.filter((u) => u.status === 'pending');
    if (pending.length === 0) return;

    // Process in batches of 3
    const batch = pending.slice(0, 3);
    await Promise.all(batch.map((u) => processUpload(u)));
  };

  const processUpload = async (upload: { id: string; file: File }) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === upload.id ? { ...u, status: 'uploading' } : u)),
    );

    const { promise, abort } = uploadFile({
      workspaceId,
      file: upload.file,
      onProgress: (percent) => {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id ? { ...u, progress: percent } : u,
          ),
        );
        setOverallProgress(
          Math.round(
            uploads.reduce((sum, u) => sum + u.progress, 0) / uploads.length,
          ),
        );
      },
    });

    activeAborts.current.set(upload.id, abort);

    try {
      await promise;
      setUploads((prev) =>
        prev.map((u) =>
          u.id === upload.id
            ? { ...u, status: 'done', progress: 100 }
            : u,
        ),
      );
      activeAborts.current.delete(upload.id);
      onUploaded();
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === 'UPLOAD_ABORTED') {
        setUploads((prev) =>
          prev.filter((u) => u.id !== upload.id),
        );
      } else {
        setUploads((prev) =>
          prev.map((u) =>
            u.id === upload.id
              ? {
                  ...u,
                  status: 'error',
                  error: err instanceof ApiRequestError ? err.message : 'Upload failed.',
                }
              : u,
          ),
        );
      }
      activeAborts.current.delete(upload.id);
    }

    // Continue with next pending
    const remaining = uploads.filter((u) => u.status === 'pending');
    if (remaining.length > 0) {
      void processQueue();
    }
  };

  const cancelUpload = (id: string) => {
    activeAborts.current.get(id)?.();
    setUploads((prev) => prev.filter((u) => u.id !== id));
    activeAborts.current.delete(id);
  };

  const retryUpload = (id: string) => {
    const upload = uploads.find((u) => u.id === id);
    if (!upload) return;
    setUploads((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: 'pending', progress: 0, error: null } : u,
      ),
    );
    void processQueue();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    // For folder uploads with webkitdirectory, files come flattened with relative paths
    const fileArray = Array.from(files);
    setUploads((prev) => [
      ...prev,
      ...fileArray.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        status: 'pending' as const,
        progress: 0,
        error: null,
      })),
    ]);
    setError(null);
    await processQueue();
  };

  const doneCount = uploads.filter((u) => u.status === 'done').length;
  const errorCount = uploads.filter((u) => u.status === 'error').length;
  const allDone = uploads.length > 0 && uploads.every((u) => u.status === 'done' || u.status === 'error');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload files"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
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
            Drop files here, or click to upload
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Max 50 MB per file · PDF, images, Office documents, video, audio, and more
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={(e) => { void handleFiles(e.target.files); }}
            aria-hidden="true"
            tabIndex={-1}
          />
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => folderInputRef.current?.click()}>
              Upload folder
            </Button>
            <input
              ref={(el) => {
                folderInputRef.current = el;
                if (el) {
                  (el as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).webkitdirectory = true;
                  (el as HTMLInputElement & { webkitdirectory?: boolean; directory?: boolean }).directory = true;
                }
              }}
              type="file"
              className="sr-only"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { void handleFolderSelect(e); }}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {uploads.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-text-secondary)]">
                Uploads: {doneCount} done{errorCount > 0 ? `, ${errorCount} failed` : ''}
              </span>
              {overallProgress > 0 && overallProgress < 100 && (
                <span className="text-sm text-[var(--color-text-primary)]">{overallProgress}%</span>
              )}
            </div>
            {overallProgress > 0 && overallProgress < 100 && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{ width: `${overallProgress}%` }}
                  role="progressbar"
                  aria-valuenow={overallProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Overall upload progress"
                />
              </div>
            )}
            <ul className="max-h-48 overflow-y-auto space-y-1">
              {uploads.map((u) => (
                <li
                  key={u.id}
                  className={`flex items-center justify-between gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm ${
                    u.status === 'done'
                      ? 'bg-[var(--color-success-bg)] border-[var(--color-success)]'
                      : u.status === 'error'
                        ? 'bg-[var(--color-error-bg)] border-[var(--color-error)]'
                        : 'bg-[var(--color-surface-secondary)] border-[var(--color-border)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[var(--color-text-primary)]">{u.file.name}</p>
                    {u.status === 'uploading' && (
                      <div className="w-full h-1 bg-[var(--color-surface)] rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-primary)]"
                          style={{ width: `${u.progress}%` }}
                        />
                      </div>
                    )}
                    {u.status === 'error' && (
                      <p className="text-xs text-[var(--color-error)]">{u.error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {u.status === 'pending' || u.status === 'uploading' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void cancelUpload(u.id)}
                        aria-label={`Cancel ${u.file.name}`}
                      >
                        Cancel
                      </Button>
                    ) : u.status === 'error' ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void retryUpload(u.id)}
                        aria-label={`Retry ${u.file.name}`}
                      >
                        Retry
                      </Button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void cancelUpload(u.id)}
                        className="text-[var(--color-text-secondary)] hover:text-[var(--color-error)]"
                        aria-label={`Remove ${u.file.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allDone && (
          <p className="text-sm text-[var(--color-success)]">
            {doneCount} file{doneCount !== 1 ? 's' : ''} uploaded.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ResourcesPage() {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [folderPath] = useState<Array<{ id: string; name: string }>>([]);

  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<ResourceItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewItem, setPreviewItem] = useState<ResourceItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const previewSeq = useRef(0);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [bookmarkOpen, setBookmarkOpen] = useState(false);

  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const seq = ++latestLoad.current;
    setLoading(true);
    setError(null);
    try {
      const [filesResult] = await Promise.all([
        listFiles(workspaceId, { limit: 100 }),
      ]);
      if (seq !== latestLoad.current) return;
      // Merge files with folder structure (folders come from backend separately)
      const resourceItems: ResourceItem[] = filesResult.items.map((f) => ({
        id: f.id,
        name: f.fileName,
        type: 'file' as const,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt,
        updatedAt: f.createdAt,
        uploadedBy: { id: f.uploadedById, name: f.uploadedById }, // backend may not return name; fallback below
      }));
      // Folders would come from a separate listFolders call
      setItems(resourceItems);
    } catch (err) {
      if (seq !== latestLoad.current) return;
      setError(err instanceof ApiRequestError ? err.message : 'Could not load resources.');
    } finally {
      if (seq === latestLoad.current) setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => active ? load() : undefined);
    return () => { active = false; };
  }, [workspaceId, load]);

  function handleUploaded() {
    setUploadOpen(false);
    void load();
  }

  async function handleDownload(item: ResourceItem) {
    if (item.type === 'folder') return;
    setDownloadingId(item.id);
    setDownloadError(null);
    try {
      await downloadFile(workspaceId, item.id, item.name);
    } catch (err) {
      setDownloadError(err instanceof ApiRequestError ? err.message : 'Download failed.');
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
    setPreviewItem(null);
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

  const [previewText, setPreviewText] = useState<string | null>(null);

  async function handlePreview(item: ResourceItem) {
    if (item.type === 'folder') return;
    const seq = ++previewSeq.current;
    releasePreviewUrl();
    setPreviewItem(item);
    setPreviewUrl(null);
    setPreviewText(null);
    setPreviewError(null);
    setPreviewLoading(true);

    const isImage = item.mimeType?.startsWith('image/');
    const isPdf = item.mimeType === 'application/pdf';
    const isVideo = item.mimeType?.startsWith('video/');
    const isAudio = item.mimeType?.startsWith('audio/');
    const isText = item.mimeType?.startsWith('text/') || item.mimeType === 'application/json';
    if (!isImage && !isPdf && !isVideo && !isAudio && !isText) {
      setPreviewLoading(false);
      return;
    }

    try {
      const blob = await fetchFileBlob(workspaceId, item.id);
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
      setPreviewError(err instanceof ApiRequestError ? err.message : 'Could not load preview.');
    } finally {
      if (seq === previewSeq.current) setPreviewLoading(false);
    }
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteFile(workspaceId, pendingDelete.id);
      setItems((prev) => prev.filter((i) => i.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setDownloadError(err instanceof ApiRequestError ? err.message : 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  }

  if (!workspaceId) {
    return (
      <PageContainer>
        <PageHeader title="Resources" />
        <EmptyState title="No workspace selected" description="Select a workspace to manage resources." />
      </PageContainer>
    );
  }

  const sortedItems = [...items].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <PageContainer>
      <PageHeader
        title="Resources"
        description="Files, folders, and bookmarks for your workspace."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => void setUploadOpen(true)}>Upload files</Button>
            <Button variant="secondary" onClick={() => void setBookmarkOpen(true)}>
              Add bookmark
            </Button>
          </div>
        }
        breadcrumb={
          <FolderBreadcrumb path={folderPath} onNavigate={(_folderId) => {
            // Filter items by folder (backend would handle this)
          }} />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}
      {downloadError && <Alert variant="error">{downloadError}</Alert>}

      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading resources">
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
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title="No resources yet"
          description="Upload files or add bookmarks to get started."
        />
      ) : (
        <ul className="space-y-2" aria-label="Workspace resources">
          {sortedItems.map((item) => (
            <ResourceRow
              key={item.id}
              item={item}
              onDownload={handleDownload}
              onPreview={handlePreview}
              onRename={() => { /* handled by folder dialog */ }}
              onMove={() => { /* handled by folder dialog */ }}
              onDelete={() => setPendingDelete(item)}
              downloading={downloadingId === item.id}
            />
          ))}
        </ul>
      )}

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload files"
        maxWidth="lg"
      >
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          workspaceId={workspaceId}
          onUploaded={handleUploaded}
        />
      </Modal>

      <BookmarkDialog
        open={bookmarkOpen}
        onClose={() => setBookmarkOpen(false)}
        workspaceId={workspaceId}
        onAdded={() => void load()}
      />

      <Modal
        open={previewItem !== null}
        onClose={closePreview}
        title={previewItem?.name ?? 'File preview'}
        maxWidth="xl"
        footer={previewItem ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closePreview}>Close</Button>
            <Button
              onClick={() => { void handleDownload(previewItem); }}
              loading={downloadingId === previewItem.id}
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
          <div className="p-4"><Alert variant="error">{previewError}</Alert></div>
        ) : previewItem && previewUrl && previewItem.mimeType?.startsWith('image/') ? (
          <img
            src={previewUrl}
            alt={previewItem.name}
            className="max-h-[60vh] w-full rounded-[var(--radius-md)] object-contain"
            sizes="100vw"
          />
        ) : previewItem && previewUrl && previewItem.mimeType === 'application/pdf' ? (
          <iframe
            src={previewUrl}
            title={previewItem.name}
            className="h-[60vh] w-full rounded-[var(--radius-md)] border-0"
          />
        ) : previewText !== null ? (
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-primary)]">
            {previewText}
          </pre>
        ) : (
          <p className="p-4 text-sm text-[var(--color-text-secondary)]">
            Preview isn&apos;t available for this file type. Download the file to open it locally.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => { setPendingDelete(null); setDownloadError(null); }}
        onConfirm={() => { void handleConfirmDelete(); }}
        title="Delete resource"
        description={`Delete "${pendingDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </PageContainer>
  );
}
