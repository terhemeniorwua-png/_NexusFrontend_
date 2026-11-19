/**
 * services/resources.ts
 *
 * Typed functions for the project Overview dashboard, file library (Resources),
 * folders, bookmarks, and dashboard preferences.
 *
 * Verified backend mounts (contract supplied 2026-11-19):
 *   Workspace: /api/v1/workspaces/:workspaceId/resources
 *   Project:   /api/v1/workspaces/:workspaceId/projects/:projectId/resources
 *
 * Requests are forwarded through the same-origin proxy at /api/backend.
 * Response/request body shapes are not part of the contract; existing caller
 * assumptions are preserved (see docs/audit-resources-contract.md).
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

/**
 * Shape assumed for GET /folders/:folderId/delete-impact.
 * The contract confirms the route exists but does not define its body; the
 * `cascadeCount` field is an assumption preserved from the previous frontend
 * delete response contract.
 */
export interface FolderDeleteImpact {
  cascadeCount: number;
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

const wsResourcesPath = (workspaceId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/resources${suffix}`;

const projectResourcesPath = (workspaceId: string, projectId: string, suffix = '') =>
  `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(projectId)}/resources${suffix}`;

// ─── Overview dashboard ────────────────────────────────────────────────────────

export function getOverview(
  workspaceId: string,
  projectId: string,
): Promise<OverviewData> {
  return request(projectResourcesPath(workspaceId, projectId, '/dashboard/overview'));
}

// ─── Dashboard preferences (project-scoped) ────────────────────────────────────

export function getDashboardPreferences(
  workspaceId: string,
  projectId: string,
): Promise<DashboardPreferences> {
  return request(projectResourcesPath(workspaceId, projectId, '/dashboard/preferences'));
}

export function saveDashboardPreferences(
  workspaceId: string,
  projectId: string,
  input: DashboardPreferences,
): Promise<DashboardPreferences> {
  return request(projectResourcesPath(workspaceId, projectId, '/dashboard/preferences'), {
    method: 'PUT',
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
    `${wsResourcesPath(workspaceId, '/folders')}${qs ? `?${qs}` : ''}`,
  );
}

export function createFolder(
  workspaceId: string,
  input: CreateFolderInput,
): Promise<FolderSummary> {
  return request<FolderSummary>(wsResourcesPath(workspaceId, '/folders'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateFolder(
  workspaceId: string,
  folderId: string,
  input: UpdateFolderInput,
): Promise<FolderSummary> {
  return request<FolderSummary>(
    wsResourcesPath(workspaceId, `/folders/${encodeURIComponent(folderId)}`),
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

/** Fetch the delete impact so a confirmation can show the cascade count. */
export function getFolderDeleteImpact(
  workspaceId: string,
  folderId: string,
): Promise<FolderDeleteImpact> {
  return request<FolderDeleteImpact>(
    wsResourcesPath(workspaceId, `/folders/${encodeURIComponent(folderId)}/delete-impact`),
  );
}

/**
 * Deletes a folder. The cascade count is read from the dedicated delete-impact
 * endpoint BEFORE the DELETE; the DELETE response is not trusted to contain it.
 */
export async function deleteFolder(
  workspaceId: string,
  folderId: string,
): Promise<{ id: string; deleted: true; cascadeCount: number }> {
  const impact = await getFolderDeleteImpact(workspaceId, folderId);
  await request<unknown>(
    wsResourcesPath(workspaceId, `/folders/${encodeURIComponent(folderId)}`),
    { method: 'DELETE' },
  );
  return { id: folderId, deleted: true, cascadeCount: impact.cascadeCount };
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

export function listBookmarks(workspaceId: string): Promise<Bookmark[]> {
  return request<Bookmark[]>(wsResourcesPath(workspaceId, '/bookmarks'));
}

export function createBookmark(
  workspaceId: string,
  input: CreateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>(wsResourcesPath(workspaceId, '/bookmarks'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateBookmark(
  workspaceId: string,
  bookmarkId: string,
  input: UpdateBookmarkInput,
): Promise<Bookmark> {
  return request<Bookmark>(
    wsResourcesPath(workspaceId, `/bookmarks/${encodeURIComponent(bookmarkId)}`),
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
}

export function deleteBookmark(
  workspaceId: string,
  bookmarkId: string,
): Promise<{ id: string; deleted: true }> {
  return request<{ id: string; deleted: true }>(
    wsResourcesPath(workspaceId, `/bookmarks/${encodeURIComponent(bookmarkId)}`),
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
