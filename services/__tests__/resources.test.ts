import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBookmark,
  createFolder,
  deleteBookmark,
  deleteFolder,
  getDashboardPreferences,
  getFolderDeleteImpact,
  getOverview,
  listBookmarks,
  listFolders,
  saveDashboardPreferences,
  updateBookmark,
  updateFolder,
} from '../resources';

vi.mock('@/services/auth', () => ({ refreshSession: vi.fn().mockResolvedValue(undefined) }));

const WS = 'ws-abc123';
const PROJECT = 'proj-abc123';
const FOLDER = 'folder-1';
const BOOKMARK = 'bm-1';

const WS_BASE = `/api/backend/workspaces/${WS}/resources`;
const PROJECT_BASE = `/api/backend/workspaces/${WS}/projects/${PROJECT}/resources`;

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function expectRequest(fetchMock: ReturnType<typeof vi.spyOn>, url: string, method: string) {
  // GET requests omit `method` in RequestInit; other verbs set it explicitly.
  expect(fetchMock).toHaveBeenCalledWith(
    url,
    method === 'GET'
      ? expect.not.objectContaining({ method: expect.anything() })
      : expect.objectContaining({ method, credentials: 'include' }),
  );
  if (method === 'GET') {
    expect(fetchMock.mock.calls.some((call) => call[0] === url && (call[1] as RequestInit)?.credentials === 'include')).toBe(true);
  }
}

describe('resources service — contract paths and methods', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('getOverview — GET project dashboard overview', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ recentItems: [] }));
    await getOverview(WS, PROJECT);
    expectRequest(fetchMock, `${PROJECT_BASE}/dashboard/overview`, 'GET');
  });

  it('getDashboardPreferences — GET project dashboard preferences', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ cards: [] }));
    await getDashboardPreferences(WS, PROJECT);
    expectRequest(fetchMock, `${PROJECT_BASE}/dashboard/preferences`, 'GET');
  });

  it('saveDashboardPreferences — PUT project dashboard preferences', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ cards: [] }));
    const input = { cards: [], autoRefresh: false };
    await saveDashboardPreferences(WS, PROJECT, input);
    expectRequest(fetchMock, `${PROJECT_BASE}/dashboard/preferences`, 'PUT');
    expect(fetchMock.mock.calls[0][1]?.body).toBe(JSON.stringify(input));
  });

  it('listFolders — GET workspace folders (no query)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listFolders(WS);
    expectRequest(fetchMock, `${WS_BASE}/folders`, 'GET');
  });

  it('listFolders — GET workspace folders with parentId filter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listFolders(WS, 'parent-1');
    expectRequest(fetchMock, `${WS_BASE}/folders?parentId=parent-1`, 'GET');
  });

  it('createFolder — POST workspace folders', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: FOLDER }));
    await createFolder(WS, { name: 'Docs' });
    expectRequest(fetchMock, `${WS_BASE}/folders`, 'POST');
  });

  it('updateFolder — PATCH workspace folder by id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: FOLDER }));
    await updateFolder(WS, FOLDER, { name: 'Documents' });
    expectRequest(fetchMock, `${WS_BASE}/folders/${FOLDER}`, 'PATCH');
  });

  it('getFolderDeleteImpact — GET delete-impact before deleting', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ cascadeCount: 4 }));
    const result = await getFolderDeleteImpact(WS, FOLDER);
    expectRequest(fetchMock, `${WS_BASE}/folders/${FOLDER}/delete-impact`, 'GET');
    expect(result.cascadeCount).toBe(4);
  });

  it('deleteFolder — calls delete-impact first, then DELETE, and derives cascadeCount', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(ok({ cascadeCount: 3 }))
      .mockResolvedValueOnce(ok({ ok: true }));

    const result = await deleteFolder(WS, FOLDER);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expectRequest(fetchMock, `${WS_BASE}/folders/${FOLDER}/delete-impact`, 'GET');
    expectRequest(fetchMock, `${WS_BASE}/folders/${FOLDER}`, 'DELETE');
    expect(result).toEqual({ id: FOLDER, deleted: true, cascadeCount: 3 });
  });

  it('listBookmarks — GET workspace bookmarks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok([]));
    await listBookmarks(WS);
    expectRequest(fetchMock, `${WS_BASE}/bookmarks`, 'GET');
  });

  it('createBookmark — POST workspace bookmarks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: BOOKMARK }));
    await createBookmark(WS, { title: 'Docs', url: 'https://example.com' });
    expectRequest(fetchMock, `${WS_BASE}/bookmarks`, 'POST');
  });

  it('updateBookmark — PATCH workspace bookmark by id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ id: BOOKMARK }));
    await updateBookmark(WS, BOOKMARK, { title: 'Handbook' });
    expectRequest(fetchMock, `${WS_BASE}/bookmarks/${BOOKMARK}`, 'PATCH');
  });

  it('deleteBookmark — DELETE workspace bookmark by id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteBookmark(WS, BOOKMARK);
    expectRequest(fetchMock, `${WS_BASE}/bookmarks/${BOOKMARK}`, 'DELETE');
  });
});
