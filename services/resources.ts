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
  kind?: 'PROJECT_DOC' | 'TASK_DOC';
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

/** VERIFIED: GET /folders/:folderId/delete-impact response. */
export interface FolderDeleteImpact {
  folderId: string;
  name: string;
  folders: number;
  files: number;
}

/** VERIFIED: DELETE /folders/:folderId response. */
export interface FolderDeleteResult {
  deleted: true;
  folderId: string;
  folders: number;
  files: number;
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

interface RawOverview {
  recent?: Array<{ id: string; itemType: string; itemId: string; openedAt: string }>;
  recentItems?: OverviewData['recentItems'];
  docs?: Array<{
    id: string; kind?: 'PROJECT_DOC' | 'TASK_DOC'; taskId?: string | null; title: string; createdById?: string;
    createdByName?: string; createdBy?: { id: string; name: string }; updatedAt: string;
  }>;
  bookmarks?: Bookmark[];
  folders?: Array<{ id: string; name: string; workspaceId?: string; parentId?: string | null; itemCount?: number; createdAt?: string; updatedAt?: string }>;
  files?: Array<{ id: string; name?: string; fileName?: string; mimeType?: string; sizeBytes?: number; uploadedById?: string; createdAt?: string }>;
  lists?: TaskListSummary[];
  workload?: WorkloadEntry[];
  workloadByStatus?: Array<{ status: string; total: number; assignees: Array<{ userId: string; name: string; count: number }> }>;
}

/** Maps the backend overview shape to the shape the dashboard cards expect. Never throws on missing keys. */
function normalizeOverview(raw: RawOverview, projectId: string): OverviewData {
  const docs = raw.docs ?? [];
  const files = raw.files ?? [];
  const bookmarks = raw.bookmarks ?? [];
  const titleById = new Map<string, string>();
  for (const d of docs) titleById.set(d.id, d.title);
  for (const f of files) titleById.set(f.id, f.name ?? f.fileName ?? 'File');
  for (const b of bookmarks) titleById.set(b.id, b.title);

  const recentItems: OverviewData['recentItems'] = [...(raw.recentItems ?? [])];
  if (!raw.recentItems) {
    for (const r of raw.recent ?? []) {
      const common = { id: r.id, updatedAt: r.openedAt, projectId };
      if (r.itemType === 'TASK') {
        recentItems.push({ ...common, type: 'task', title: titleById.get(r.itemId) ?? 'Task', url: `/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(r.itemId)}` });
      } else if (r.itemType === 'DOCUMENT') {
        recentItems.push({ ...common, type: 'doc', title: titleById.get(r.itemId) ?? 'Document', url: '/app/documents' });
      } else if (r.itemType === 'FILE') {
        recentItems.push({ ...common, type: 'file', title: titleById.get(r.itemId) ?? 'File', url: '/app/files' });
      }
    }
  }

  const byUser = new Map<string, WorkloadEntry>();
  for (const st of raw.workloadByStatus ?? []) {
    for (const a of st.assignees) {
      const key = a.userId || 'unassigned';
      const entry = byUser.get(key) ?? { userId: key, user: { id: key, name: a.name }, statusCounts: {}, total: 0 };
      entry.statusCounts[st.status] = (entry.statusCounts[st.status] ?? 0) + a.count;
      entry.total += a.count;
      byUser.set(key, entry);
    }
  }

  return {
    projectId,
    recentItems,
    docs: docs.map((d) => ({
      id: d.id,
      kind: d.kind,
      taskId: d.taskId ?? null,
      title: d.title,
      createdById: d.createdById ?? '',
      createdBy: d.createdBy ?? { id: d.createdById ?? '', name: d.createdByName ?? '' },
      updatedAt: d.updatedAt,
    })),
    bookmarks,
    folders: (raw.folders ?? []).map((f) => ({
      id: f.id,
      workspaceId: f.workspaceId ?? '',
      parentId: f.parentId ?? null,
      name: f.name,
      itemCount: f.itemCount ?? 0,
      createdAt: f.createdAt ?? '',
      updatedAt: f.updatedAt ?? '',
    })),
    // Backend sends `name`; the cards read `fileName`. Keep both.
    files: files.map((f) => ({ ...f, fileName: f.fileName ?? f.name ?? '' })) as unknown as OverviewData['files'],
    lists: raw.lists ?? [],
    workload: raw.workload ?? [...byUser.values()],
  };
}

export async function getOverview(
  workspaceId: string,
  projectId: string,
): Promise<OverviewData> {
  const raw = await request<RawOverview>(projectResourcesPath(workspaceId, projectId, '/dashboard/overview'));
  return normalizeOverview(raw ?? {}, projectId);
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
  projectId?: string | null,
): Promise<FolderSummary> {
  const path = projectId
    ? projectResourcesPath(workspaceId, projectId, '/folders')
    : wsResourcesPath(workspaceId, '/folders');
  return request<FolderSummary>(path, {
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

/**
 * Fetch the delete impact so a confirmation can read `folders` and `files`
 * (for example: "This deletes 3 folders and 12 files").
 */
export function getFolderDeleteImpact(
  workspaceId: string,
  folderId: string,
): Promise<FolderDeleteImpact> {
  return request<FolderDeleteImpact>(
    wsResourcesPath(workspaceId, `/folders/${encodeURIComponent(folderId)}/delete-impact`),
  );
}

/** Deletes a folder after checking its impact; returns the verified DELETE shape. */
export async function deleteFolder(
  workspaceId: string,
  folderId: string,
): Promise<FolderDeleteResult> {
  await getFolderDeleteImpact(workspaceId, folderId);
  return request<FolderDeleteResult>(
    wsResourcesPath(workspaceId, `/folders/${encodeURIComponent(folderId)}`),
    { method: 'DELETE' },
  );
}

// ─── Bookmarks ─────────────────────────────────────────────────────────────────

export function listBookmarks(workspaceId: string): Promise<Bookmark[]> {
  return request<Bookmark[]>(wsResourcesPath(workspaceId, '/bookmarks'));
}

export function createBookmark(
  workspaceId: string,
  input: CreateBookmarkInput,
  projectId?: string | null,
): Promise<Bookmark> {
  const path = projectId
    ? projectResourcesPath(workspaceId, projectId, '/bookmarks')
    : wsResourcesPath(workspaceId, '/bookmarks');
  return request<Bookmark>(path, {
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

/** Uploads one file into a project's resource library (ResourceFile, shown on the Overview Files card). */
export function uploadProjectFile(
  params: Parameters<typeof uploadFile>[0] & { projectId: string; folderId?: string | null },
): { promise: Promise<FileSummary>; abort: () => void } {
  const controller = new AbortController();
  const form = new FormData();
  form.append('file', params.file);
  if (params.folderId) form.append('folderId', params.folderId);
  const promise = request<FileSummary>(
    projectResourcesPath(params.workspaceId, params.projectId, '/files'),
    { method: 'POST', body: form, signal: controller.signal },
  ).then((result) => {
    params.onProgress?.(100);
    return result;
  });
  return { promise, abort: () => controller.abort() };
}
