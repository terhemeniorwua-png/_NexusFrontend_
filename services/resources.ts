/**
 * services/resources.ts
 *
 * Typed functions for the project Overview dashboard, file library (Resources),
 * folders, bookmarks, and dashboard preferences.
 *
 * Routes follow the same mounting convention as services/files.ts:
 *   /api/backend/workspaces/:workspaceId/...
 * and are forwarded through the same-origin proxy.
 *
 * Backend contracts are inferred from existing service patterns (files.ts,
 * projects.ts, tasks.ts). The backend remains authoritative for every
 * authorisation decision.
 */

import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import { uploadFile } from '@/services/files';
import type { FileSummary } from '@/services/files';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type CardId =
  | 'recent'
  | 'docs'
  | 'bookmarks'
  | 'folders'
  | 'files'
  | 'lists'
  | 'workload';

export interface DashboardCardConfig {
  id: CardId;
  label: string;
  visible: boolean;
  position: number;
}

export interface DashboardPreferences {
  cards: DashboardCardConfig[];
  autoRefresh: boolean;
}

export interface OverviewData {
  projectId: string;
  recentItems: RecentItem[];
  docs: DocumentSummary[];
  bookmarks: Bookmark[];
  folders: FolderSummary[];
  files: FileSummary[];
  lists: TaskListSummary[];
  workload: WorkloadEntry[];
}

export interface RecentItem {
  id: string;
  type: 'task' | 'doc' | 'file';
  title: string;
  url: string;
  updatedAt: string;
  projectId?: string;
}

export interface DocumentSummary {
  id: string;
  taskId: string | null;
  title: string;
  createdById: string;
  createdBy: { id: string; name: string };
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  createdAt: string;
}

export interface FolderSummary {
  id: string;
  workspaceId: string;
  parentId: string | null;
  name: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListSummary {
  id: string;
  name: string;
  taskCount: number;
  completedCount: number;
  url: string;
}

export interface WorkloadEntry {
  userId: string;
  user: { id: string; name: string };
  statusCounts: Record<string, number>;
  total: number;
}

export interface CreateFolderInput {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: string | null;
}

export interface CreateBookmarkInput {
  title: string;
  url: string;
}

export interface UpdateBookmarkInput {
  title?: string;
  url?: string;
}

export interface UploadFolderResult {
  folders: FolderSummary[];
  files: FileSummary[];
}

// ─── Internal request helper ───────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

const wsPath = (workspaceId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;

const projectPath = (workspaceId: string, projectId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}${suffix}`;

// ─── Overview dashboard ────────────────────────────────────────────────────────

export function getOverview(
  workspaceId: string,
  projectId: string,
): Promise<OverviewData> {
  return request(projectPath(workspaceId, projectId, '/overview'));
}

// ─── Dashboard preferences ─────────────────────────────────────────────────────

export function getDashboardPreferences(
  workspaceId: string,
): Promise<DashboardPreferences> {
  return request(wsPath(workspaceId, '/dashboard/preferences'));
}

export function saveDashboardPreferences(
  workspaceId: string,
  input: DashboardPreferences,
): Promise<DashboardPreferences> {
  return request(wsPath(workspaceId, '/dashboard/preferences'), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

// ─── Folders ───────────────────────────────────────────────────────────────────

export function listFolders(
  workspaceId: string,
  parentId?: string | null,
): Promise<FolderSummary[]> {
  const search = new URLSearchParams();
  if (parentId !== undefined && parentId !== null) search.set('parentId', parentId);
  const qs = search.toString();
  return request<FolderSummary[]>(
    `${wsPath(workspaceId, '/folders')}${qs ? `?${qs}` : ''}`,
  );
}

export function createFolder(
  workspaceId: string,
  input: CreateFolderInput,
): Promise<FolderSummary> {
  return request<FolderSummary>(wsPath(workspaceId, '/folders'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateFolder(
  workspaceId: string,
  folderId: string,
  input: UpdateFolderInput,
): Promise<FolderSummary> {
  return request<FolderSummary>(wsPath(workspaceId, `/folders/${encodeURIComponent(folderId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteFolder(
  workspaceId: string,
  folderId: string,
): Promise<{ id: string; deleted: true; cascadeCount: number }> {
  return request<{ id: string; deleted: true; cascadeCount: number }>(
    wsPath(workspaceId, `/folders/${encodeURIComponent(folderId)}`),
    { method: 'DELETE' },
  );
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

export function listBookmarks(workspaceId: string): Promise<Bookmark[]> {
  return request<Bookmark[]>(wsPath(workspaceId, '/bookmarks'));
}

export function createBookmark(
  workspaceId: string,
  input: CreateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>(wsPath(workspaceId, '/bookmarks'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBookmark(
  workspaceId: string,
  bookmarkId: string,
  input: UpdateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>(wsPath(workspaceId, `/bookmarks/${encodeURIComponent(bookmarkId)}`), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteBookmark(
  workspaceId: string,
  bookmarkId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    wsPath(workspaceId, `/bookmarks/${encodeURIComponent(bookmarkId)}`),
    { method: 'DELETE' },
  );
}

// ─── Upload folder ─────────────────────────────────────────────────────────────

export interface UploadFolderParams {
  workspaceId: string;
  items: Array<{ file: File; relativePath: string }>;
  onProgress?: (percent: number) => void;
  onFileComplete?: (file: FileSummary) => void;
}

export function uploadFolder(params: UploadFolderParams): {
  promise: Promise<UploadFolderResult>;
  abort: () => void;
} {
  const total = params.items.length;
  let completed = 0;
  let abortRequested = false;

  const promise = new Promise<UploadFolderResult>((resolve) => {
    const folders: FolderSummary[] = [];
    const files: FileSummary[] = [];

    function next() {
      if (abortRequested || completed >= total) {
        resolve({ folders, files });
        return;
      }
      const { file } = params.items[completed];
      const { promise: filePromise } = uploadFile({
        workspaceId: params.workspaceId,
        file,
        onProgress: (percent) => {
          const overall = Math.round(((completed + percent / 100) / total) * 100);
          params.onProgress?.(overall);
        },
      });
      void filePromise
        .then((result) => {
          files.push(result);
          completed += 1;
          params.onFileComplete?.(result);
          next();
        })
        .catch(() => {
          // Continue past a failed file; record completion so the queue advances.
          completed += 1;
          next();
        });
    }

    next();
  });

  return {
    promise,
    abort: () => {
      abortRequested = true;
    },
  };
}
