/**
 * services/files.ts
 *
 * PITERON Drive — workspace file management service.
 *
 * All routes are mounted at:
 *   /api/v1/workspaces/:workspaceId/files
 * and forwarded through the same-origin proxy at:
 *   /api/backend/workspaces/:workspaceId/files
 *
 * The `workspaces` prefix is already in ALLOWED_API_PREFIXES, so no proxy
 * change is required.
 *
 * ─── Verified backend contract (2026-11-07) ────────────────────────────────
 *
 * GET  /workspaces/:workspaceId/files
 *   query: cursor?, limit? (1–100, default 25), projectId?, taskId?
 *   response: { items: FileSummary[], nextCursor: string|null, totalBytes: number }
 *
 * GET  /workspaces/:workspaceId/files/usage
 *   response: { totalBytes: number, fileCount: number }
 *
 * POST /workspaces/:workspaceId/files
 *   multipart/form-data: field "file" (required) + "projectId"? + "taskId"?
 *   limit: 50 MB, allowed MIME types documented in file.schemas.ts
 *   response: FileSummary (201)
 *
 * GET  /workspaces/:workspaceId/files/:fileId
 *   response: raw bytes + Content-Disposition: attachment (not JSON)
 *   Note: cannot use apiRequest() here — use a direct fetch instead
 *
 * DELETE /workspaces/:workspaceId/files/:fileId
 *   response: { ok: true }
 *   Only the uploader, project manager, or workspace owner/admin can delete.
 *
 * ─── Attachment versions (verified 2026-11-21) ─────────────────────────────
 *
 * GET    /workspaces/:workspaceId/files/:fileId/versions
 * POST   /workspaces/:workspaceId/files/:fileId/versions
 * GET    /workspaces/:workspaceId/files/:fileId/versions/:versionId
 * GET    /workspaces/:workspaceId/files/:fileId/versions/:versionId/download
 * POST   /workspaces/:workspaceId/files/:fileId/versions/:versionId/make-current
 * DELETE /workspaces/:workspaceId/files/:fileId/versions/:versionId
 * GET    /workspaces/:workspaceId/files/:fileId/versions/:versionId/feedback
 * POST   /workspaces/:workspaceId/files/:fileId/versions/:versionId/feedback
 * PATCH  /workspaces/:workspaceId/files/:fileId/versions/:versionId/feedback/:feedbackId
 * DELETE /workspaces/:workspaceId/files/:fileId/versions/:versionId/feedback/:feedbackId
 * ─────────────────────────────────────────────────────────────────────────
 */

import { apiRawRequest, apiRequest, ApiRequestError, getAccessToken, setAccessToken } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

// Re-export setAccessToken for convenience, but keep api import minimal
export { ApiRequestError };

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FileSummary {
  id: string;
  workspaceId: string;
  projectId: string | null;
  taskId: string | null;
  uploadedById: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ListFilesResult {
  items: FileSummary[];
  nextCursor: string | null;
  totalBytes: number;
}

export interface FileUsage {
  totalBytes: number;
  fileCount: number;
}

export interface ListFilesParams {
  cursor?: string;
  limit?: number;
  projectId?: string;
  taskId?: string;
}

/**
 * Backend currently returns every field. They are typed optional so an older
 * or degraded response is still renderable instead of crashing the panel.
 */
export interface AttachmentVersionSummary {
  id?: string;
  attachmentId?: string;
  versionNumber?: number;
  isCurrent?: boolean;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedById?: string;
  changeNote?: string | null;
  createdAt?: string;
}

export interface AttachmentVersionFeedbackSummary {
  id?: string;
  attachmentVersionId?: string;
  authorId?: string;
  body?: string;
  createdAt?: string;
  updatedAt?: string;
  editedAt?: string | null;
}

export interface ListFileVersionsParams {
  cursor?: string;
  limit?: number;
}

export interface ListFileVersionsResult {
  items: AttachmentVersionSummary[];
  nextCursor: string | null;
}

export interface UploadFileVersionParams {
  workspaceId: string;
  fileId: string;
  file: File;
  changeNote?: string;
}

export interface ListVersionFeedbackParams {
  cursor?: string;
  limit?: number;
}

export interface ListVersionFeedbackResult {
  items: AttachmentVersionFeedbackSummary[];
  nextCursor: string | null;
}

/** Allowed MIME types (mirrors file.schemas.ts ALLOWED_MIME_TYPES). */
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/zip',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Maximum upload size in bytes (50 MB — mirrors backend limit). */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export const PROXY_UPLOAD_LIMIT_BYTES = 4_500_000;
// ─── Shared fetch helpers ─────────────────────────────────────────────────────

const API_BASE = '/api/backend';

// ─── List files ───────────────────────────────────────────────────────────────

export async function listFiles(
  workspaceId: string,
  params: ListFilesParams = {},
): Promise<ListFilesResult> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  if (params.projectId) search.set('projectId', params.projectId);
  if (params.taskId) search.set('taskId', params.taskId);
  const qs = search.toString();

  return withAuthRetry(() => apiRequest<ListFilesResult>(
    `/workspaces/${workspaceId}/files${qs ? `?${qs}` : ''}`,
    { authenticated: true },
  ));
}

// ─── Get storage usage ────────────────────────────────────────────────────────

export async function getFileUsage(workspaceId: string): Promise<FileUsage> {
  return withAuthRetry(() => apiRequest<FileUsage>(
    `/workspaces/${workspaceId}/files/usage`,
    { authenticated: true },
  ));
}

// ─── Upload file ──────────────────────────────────────────────────────────────

export interface UploadFileParams {
  workspaceId: string;
  file: File;
  projectId?: string;
  taskId?: string;
  onProgress?: (percent: number) => void;
}

/**
 * Upload a file via multipart/form-data using XMLHttpRequest so we can
 * report progress. Falls back silently if progress reporting is unavailable.
 */
export function uploadFile(params: UploadFileParams): {
  promise: Promise<FileSummary>;
  abort: () => void;
} {
  let xhr: XMLHttpRequest | null = new XMLHttpRequest();

  const promise = new Promise<FileSummary>((resolve, reject) => {
    const form = new FormData();
    form.append('file', params.file);
    if (params.projectId) form.append('projectId', params.projectId);
    if (params.taskId) form.append('taskId', params.taskId);

    xhr!.open('POST', `${API_BASE}/workspaces/${params.workspaceId}/files`);
    xhr!.withCredentials = true;
    const token = getAccessToken();
    if (token) xhr!.setRequestHeader('Authorization', `Bearer ${token}`);

    if (params.onProgress) {
      xhr!.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && params.onProgress) {
          params.onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr!.addEventListener('load', () => {
      const xhrRef = xhr;
      xhr = null;
      if (!xhrRef) return;
      if (xhrRef.status === 201) {
        try {
          const body = JSON.parse(xhrRef.responseText) as { success: true; data: FileSummary };
          resolve(body.data);
        } catch {
          reject(new ApiRequestError('Invalid upload response', xhrRef.status));
        }
      } else {
        try {
          const body = JSON.parse(xhrRef.responseText) as { error?: { code?: string; message?: string } };
          reject(new ApiRequestError(body.error?.message ?? 'Upload failed', xhrRef.status, body.error?.code));
        } catch {
          reject(new ApiRequestError('Upload failed', xhrRef.status));
        }
      }
    });

    xhr!.addEventListener('error', () => {
      xhr = null;
      reject(new ApiRequestError('Network error during upload', 0));
    });

    xhr!.addEventListener('abort', () => {
      xhr = null;
      reject(new ApiRequestError('Upload was cancelled', 0, 'UPLOAD_ABORTED'));
    });

    xhr!.send(form);
  });

  return {
    promise,
    abort: () => { if (xhr) { xhr.abort(); xhr = null; } },
  };
}

// ─── Download file ────────────────────────────────────────────────────────────

/** Trigger a browser save dialog for a blob. */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke after a short delay so the download can start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Download a file and trigger a browser save dialog.
 * The backend returns raw bytes (not JSON), so we use a direct fetch.
 */
export async function downloadFile(
  workspaceId: string,
  fileId: string,
  fileName: string,
): Promise<void> {
  const response = await withAuthRetry(() => apiRawRequest(
    `/workspaces/${workspaceId}/files/${fileId}`,
    { authenticated: true },
  ));

  triggerBlobDownload(await response.blob(), fileName);
}

// ─── Preview file ─────────────────────────────────────────────────────────────

/**
 * Fetch a file's raw bytes for in-app preview.
 * The caller owns the returned Blob and must revoke any object URL it creates.
 */
export async function fetchFileBlob(workspaceId: string, fileId: string): Promise<Blob> {
  const response = await withAuthRetry(() => apiRawRequest(
    `/workspaces/${workspaceId}/files/${fileId}`,
    { authenticated: true },
  ));
  return response.blob();
}

// ─── Delete file ──────────────────────────────────────────────────────────────

export async function deleteFile(workspaceId: string, fileId: string): Promise<void> {
  await withAuthRetry(() => apiRequest<unknown>(
    `/workspaces/${workspaceId}/files/${fileId}`,
    { method: 'DELETE', authenticated: true },
  ));
}

// ─── Attachment versions ──────────────────────────────────────────────────────

export async function listFileVersions(
  workspaceId: string,
  fileId: string,
  params: ListFileVersionsParams = {},
): Promise<ListFileVersionsResult> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  const result = await withAuthRetry(() => apiRequest<ListFileVersionsResult>(
    `/workspaces/${workspaceId}/files/${fileId}/versions${qs ? `?${qs}` : ''}`,
    { authenticated: true },
  ));
  return { items: result?.items ?? [], nextCursor: result?.nextCursor ?? null };
}

export async function getFileVersion(
  workspaceId: string,
  fileId: string,
  versionId: string,
): Promise<AttachmentVersionSummary> {
  const result = await withAuthRetry(() => apiRequest<{ version?: AttachmentVersionSummary }>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}`,
    { authenticated: true },
  ));
  return result?.version ?? {};
}

/** Upload the next version with a multipart `file` and optional `changeNote`. */
export async function uploadFileVersion(
  params: UploadFileVersionParams,
): Promise<AttachmentVersionSummary> {
  const form = new FormData();
  form.append('file', params.file);
  const changeNote = params.changeNote?.trim();
  if (changeNote) form.append('changeNote', changeNote);

  const result = await withAuthRetry(() => apiRequest<{ version?: AttachmentVersionSummary }>(
    `/workspaces/${params.workspaceId}/files/${params.fileId}/versions`,
    { method: 'POST', body: form, authenticated: true },
  ));
  return result?.version ?? {};
}

/** Download one version's raw bytes and trigger a browser save dialog. */
export async function downloadFileVersion(
  workspaceId: string,
  fileId: string,
  versionId: string,
  fileName: string,
): Promise<void> {
  const response = await withAuthRetry(() => apiRawRequest(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/download`,
    { authenticated: true },
  ));
  triggerBlobDownload(await response.blob(), fileName);
}

export async function makeFileVersionCurrent(
  workspaceId: string,
  fileId: string,
  versionId: string,
): Promise<AttachmentVersionSummary> {
  const result = await withAuthRetry(() => apiRequest<{ version?: AttachmentVersionSummary }>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/make-current`,
    { method: 'POST', authenticated: true },
  ));
  return result?.version ?? {};
}

export async function deleteFileVersion(
  workspaceId: string,
  fileId: string,
  versionId: string,
): Promise<void> {
  await withAuthRetry(() => apiRequest<unknown>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}`,
    { method: 'DELETE', authenticated: true },
  ));
}

// ─── Attachment version feedback ──────────────────────────────────────────────

export async function listFileVersionFeedback(
  workspaceId: string,
  fileId: string,
  versionId: string,
  params: ListVersionFeedbackParams = {},
): Promise<ListVersionFeedbackResult> {
  const search = new URLSearchParams();
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();

  const result = await withAuthRetry(() => apiRequest<ListVersionFeedbackResult>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/feedback${qs ? `?${qs}` : ''}`,
    { authenticated: true },
  ));
  return { items: result?.items ?? [], nextCursor: result?.nextCursor ?? null };
}

export async function createFileVersionFeedback(
  workspaceId: string,
  fileId: string,
  versionId: string,
  body: string,
): Promise<AttachmentVersionFeedbackSummary> {
  const result = await withAuthRetry(() => apiRequest<{ feedback?: AttachmentVersionFeedbackSummary }>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/feedback`,
    { method: 'POST', body: JSON.stringify({ body }), authenticated: true },
  ));
  return result?.feedback ?? {};
}

export async function updateFileVersionFeedback(
  workspaceId: string,
  fileId: string,
  versionId: string,
  feedbackId: string,
  body: string,
): Promise<AttachmentVersionFeedbackSummary> {
  const result = await withAuthRetry(() => apiRequest<{ feedback?: AttachmentVersionFeedbackSummary }>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/feedback/${feedbackId}`,
    { method: 'PATCH', body: JSON.stringify({ body }), authenticated: true },
  ));
  return result?.feedback ?? {};
}

export async function deleteFileVersionFeedback(
  workspaceId: string,
  fileId: string,
  versionId: string,
  feedbackId: string,
): Promise<void> {
  await withAuthRetry(() => apiRequest<unknown>(
    `/workspaces/${workspaceId}/files/${fileId}/versions/${versionId}/feedback/${feedbackId}`,
    { method: 'DELETE', authenticated: true },
  ));
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/** Format bytes as a human-readable string (e.g. "2.4 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exp = Math.min(Math.floor(Math.log2(bytes) / 10), units.length - 1);
  const value = bytes / 1024 ** exp;
  const formatted = value < 10 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.round(value));
  return `${formatted} ${units[exp]}`;
}

/** Return a display category for a MIME type. */
export function fileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'Spreadsheet';
  if (mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('word') || mimeType === 'text/plain' || mimeType === 'text/markdown') return 'Document';
  if (mimeType === 'application/zip') return 'Archive';
  return 'File';
}

// Re-export setAccessToken so tests don't need to import from two places
export { setAccessToken };
