import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listFiles,
  getFileUsage,
  downloadFile,
  deleteFile,
  formatBytes,
  fileCategory,
  MAX_FILE_SIZE_BYTES,
} from '../files';

const WS = 'ws-abc123';
const FILE_ID = 'file-uuid-1';

const fakeFile: import('../files').FileSummary = {
  id: FILE_ID,
  workspaceId: WS,
  projectId: null,
  taskId: null,
  uploadedById: 'user-1',
  fileName: 'report.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 102400,
  createdAt: '2026-11-07T10:00:00.000Z',
};

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('files service', () => {
  beforeEach(() => vi.restoreAllMocks());

  // ── listFiles ──────────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/files — returns items, nextCursor, totalBytes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeFile], nextCursor: null, totalBytes: fakeFile.sizeBytes }),
    );
    const result = await listFiles(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0].fileName).toBe('report.pdf');
    expect(result.totalBytes).toBe(102400);
  });

  it('passes projectId and cursor query params', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null, totalBytes: 0 }),
    );
    await listFiles(WS, { projectId: 'proj-1', cursor: 'cursor-abc', limit: 10 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('projectId=proj-1');
    expect(url).toContain('cursor=cursor-abc');
    expect(url).toContain('limit=10');
  });

  it('throws ApiRequestError on 403', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('FORBIDDEN', 'Access denied', 403));
    await expect(listFiles(WS)).rejects.toThrow();
  });

  // ── getFileUsage ───────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/files/usage — returns totalBytes and fileCount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ totalBytes: 5242880, fileCount: 3 }),
    );
    const result = await getFileUsage(WS);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/usage`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result.totalBytes).toBe(5242880);
    expect(result.fileCount).toBe(3);
  });

  // ── downloadFile ───────────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/files/:fileId — triggers browser download', async () => {
    // jsdom Blob doesn't support .stream(); mock fetch to return a Response whose
    // .blob() method we control directly.
    const fakeBlob = { size: 100, type: 'application/pdf' } as Blob;
    const mockResponse = {
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(fakeBlob),
      json: vi.fn(),
    } as unknown as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue(
      Object.assign(document.createElement('a'), { click: clickSpy }),
    );

    await downloadFile(WS, FILE_ID, 'report.pdf');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(clickSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('throws on download error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('FILE_NOT_FOUND', 'File not found', 404));
    await expect(downloadFile(WS, FILE_ID, 'report.pdf')).rejects.toThrow();
  });

  // ── deleteFile ─────────────────────────────────────────────────────────────

  it('DELETE /workspaces/:wsId/files/:fileId — calls correct endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteFile(WS, FILE_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}`,
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  it('throws ApiRequestError when deleting a file without permission', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_DELETE_FORBIDDEN', 'You can only delete your own files', 403),
    );
    await expect(deleteFile(WS, FILE_ID)).rejects.toThrow('You can only delete your own files');
  });

  // ── formatBytes ────────────────────────────────────────────────────────────

  it.each([
    [0, '0 B'],
    [512, '512 B'],
    [1024, '1 KB'],
    [1536, '1.5 KB'],
    [1048576, '1 MB'],
    [52428800, '50 MB'],
    [1073741824, '1 GB'],
  ])('formatBytes(%i) = %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });

  // ── fileCategory ───────────────────────────────────────────────────────────

  it.each([
    ['image/png', 'Image'],
    ['video/mp4', 'Video'],
    ['audio/mpeg', 'Audio'],
    ['application/pdf', 'PDF'],
    ['text/csv', 'Spreadsheet'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Document'],
    ['application/zip', 'Archive'],
    ['application/json', 'File'],
  ])('fileCategory(%s) = %s', (mime, expected) => {
    expect(fileCategory(mime)).toBe(expected);
  });

  // ── MAX_FILE_SIZE_BYTES ────────────────────────────────────────────────────

  it('MAX_FILE_SIZE_BYTES is 50 MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(50 * 1024 * 1024);
  });
});
