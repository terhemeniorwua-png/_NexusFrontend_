import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listDocuments,
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listDocumentRevisions,
  listDocumentComments,
  addDocumentComment,
  deleteDocumentComment,
} from '../documents';

const WS = 'ws-abc123';
const DOC_ID = 'doc-uuid-1';
const COMMENT_ID = 'cmt-uuid-1';

const fakeDoc = {
  id: DOC_ID, workspaceId: WS, projectId: null, taskId: null,
  title: 'Design Spec', content: 'Intro text', authorId: 'user-1', authorName: 'Ada',
  revisionCount: 2, commentCount: 1,
  createdAt: '2026-11-07T10:00:00.000Z', updatedAt: '2026-11-07T11:00:00.000Z',
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

describe('documents service', () => {
  beforeEach(() => vi.restoreAllMocks());

  // ── listDocuments ──────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/documents — returns items and nextCursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeDoc], nextCursor: null }),
    );
    const result = await listDocuments(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents`,
      expect.any(Object),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Design Spec');
  });

  it('passes search, projectId, and cursor params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null }),
    );
    await listDocuments(WS, { search: 'api', projectId: 'proj-1', cursor: 'cursor-abc', limit: 10 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('search=api');
    expect(url).toContain('projectId=proj-1');
    expect(url).toContain('cursor=cursor-abc');
    expect(url).toContain('limit=10');
  });

  // ── createDocument ─────────────────────────────────────────────────────────

  it('POST /workspaces/:wsId/documents — sends title and content', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeDoc, 201));
    const result = await createDocument(WS, { title: 'Design Spec', content: 'Intro text' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'Design Spec', content: 'Intro text' }),
      }),
    );
    expect(result.id).toBe(DOC_ID);
  });

  // ── getDocument ────────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/documents/:docId — returns document', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeDoc));
    const result = await getDocument(WS, DOC_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}`,
      expect.any(Object),
    );
    expect(result.title).toBe('Design Spec');
  });

  // ── updateDocument ─────────────────────────────────────────────────────────

  it('PATCH /workspaces/:wsId/documents/:docId — sends changed fields', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ ...fakeDoc, title: 'Updated Spec' }),
    );
    const result = await updateDocument(WS, DOC_ID, { title: 'Updated Spec' });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}`,
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ title: 'Updated Spec' }),
      }),
    );
    expect(result.title).toBe('Updated Spec');
  });

  // ── deleteDocument ─────────────────────────────────────────────────────────

  it('DELETE /workspaces/:wsId/documents/:docId — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteDocument(WS, DOC_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('throws on 403 when deleting without permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('FORBIDDEN', 'Access denied', 403));
    await expect(deleteDocument(WS, DOC_ID)).rejects.toThrow();
  });

  // ── listDocumentRevisions ──────────────────────────────────────────────────

  it('GET .../revisions — returns revision array', async () => {
    const revisions = [{ id: 'rev-1', authorId: 'user-1', authorName: 'Ada', content: 'v1', createdAt: '2026-11-07T09:00:00.000Z' }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(revisions));
    const result = await listDocumentRevisions(WS, DOC_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}/revisions`,
      expect.any(Object),
    );
    expect(result).toHaveLength(1);
    expect(result[0].authorName).toBe('Ada');
  });

  it('returns empty array when revisions response is not an array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(null));
    expect(await listDocumentRevisions(WS, DOC_ID)).toEqual([]);
  });

  // ── listDocumentComments ───────────────────────────────────────────────────

  it('GET .../comments — returns comment array', async () => {
    const comments = [{ id: COMMENT_ID, documentId: DOC_ID, authorId: 'user-1', authorName: 'Ada', body: 'Looks good', editedAt: null, createdAt: '2026-11-07T10:00:00.000Z' }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(comments));
    const result = await listDocumentComments(WS, DOC_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}/comments`,
      expect.any(Object),
    );
    expect(result[0].body).toBe('Looks good');
  });

  // ── addDocumentComment ─────────────────────────────────────────────────────

  it('POST .../comments — sends body string', async () => {
    const comment = { id: COMMENT_ID, documentId: DOC_ID, authorId: 'user-1', authorName: 'Ada', body: 'Nice work', editedAt: null, createdAt: '2026-11-07T10:00:00.000Z' };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(comment, 201));
    const result = await addDocumentComment(WS, DOC_ID, 'Nice work');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}/comments`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'Nice work' }) }),
    );
    expect(result.body).toBe('Nice work');
  });

  // ── deleteDocumentComment ──────────────────────────────────────────────────

  it('DELETE .../comments/:commentId — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteDocumentComment(WS, DOC_ID, COMMENT_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/documents/${DOC_ID}/comments/${COMMENT_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
