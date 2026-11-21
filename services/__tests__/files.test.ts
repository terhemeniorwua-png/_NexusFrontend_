import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listFiles,
  getFileUsage,
  downloadFile,
  deleteFile,
  listFileVersions,
  getFileVersion,
  uploadFileVersion,
  downloadFileVersion,
  makeFileVersionCurrent,
  deleteFileVersion,
  listFileVersionFeedback,
  createFileVersionFeedback,
  updateFileVersionFeedback,
  deleteFileVersionFeedback,
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

const VERSION_ID = 'version-uuid-1';
const FEEDBACK_ID = 'feedback-uuid-1';

const fakeVersion: import('../files').AttachmentVersionSummary = {
  id: VERSION_ID,
  attachmentId: FILE_ID,
  versionNumber: 2,
  isCurrent: true,
  fileName: 'report-v2.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 204800,
  uploadedById: 'user-1',
  changeNote: 'Updated figures',
  createdAt: '2026-11-21T10:00:00.000Z',
};

const fakeFeedback: import('../files').AttachmentVersionFeedbackSummary = {
  id: FEEDBACK_ID,
  attachmentVersionId: VERSION_ID,
  authorId: 'user-2',
  body: 'Please clarify the chart.',
  createdAt: '2026-11-21T11:00:00.000Z',
  updatedAt: '2026-11-21T11:00:00.000Z',
  editedAt: null,
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
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;

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

  // ── Attachment versions ─────────────────────────────────────────────────────

  it('GET /workspaces/:wsId/files/:fileId/versions — returns newest-first items and nextCursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeVersion], nextCursor: null }),
    );
    const result = await listFileVersions(WS, FILE_ID, { cursor: 'cursor-v1', limit: 10 });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions?cursor=cursor-v1&limit=10`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result.items).toEqual([fakeVersion]);
    expect(result.nextCursor).toBeNull();
  });

  it('listFileVersions tolerates a response item with missing fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [{}], nextCursor: null }));
    const result = await listFileVersions(WS, FILE_ID);
    expect(result.items).toEqual([{}]);
    expect(result.nextCursor).toBeNull();
  });

  it('listFileVersions propagates backend errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_NOT_FOUND', 'That file does not exist', 404),
    );
    await expect(listFileVersions(WS, FILE_ID)).rejects.toThrow('That file does not exist');
  });

  it('GET /workspaces/:wsId/files/:fileId/versions/:versionId — unwraps the version', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ version: fakeVersion }));
    const result = await getFileVersion(WS, FILE_ID, VERSION_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result).toEqual(fakeVersion);
  });

  it('getFileVersion propagates FILE_VERSION_NOT_FOUND', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_VERSION_NOT_FOUND', 'That file version does not exist', 404),
    );
    await expect(getFileVersion(WS, FILE_ID, VERSION_ID))
      .rejects.toThrow('That file version does not exist');
  });

  it('POST /workspaces/:wsId/files/:fileId/versions — sends multipart file and changeNote', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ version: fakeVersion }, 201),
    );
    const file = new File(['v2'], 'report-v2.pdf', { type: 'application/pdf' });

    const result = await uploadFileVersion({
      workspaceId: WS,
      fileId: FILE_ID,
      file,
      changeNote: '  Updated figures  ',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions`,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('changeNote')).toBe('Updated figures');
    expect(result).toEqual(fakeVersion);
  });

  it('uploadFileVersion omits a blank changeNote and surfaces upload errors', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_TYPE_NOT_ALLOWED', "File type 'text/html' is not permitted", 415),
    );
    const file = new File(['v2'], 'report.html', { type: 'text/html' });

    await expect(uploadFileVersion({ workspaceId: WS, fileId: FILE_ID, file, changeNote: '   ' }))
      .rejects.toThrow("File type 'text/html' is not permitted");
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect(body.has('changeNote')).toBe(false);
  });

  it('GET version download — triggers a browser download from the version endpoint', async () => {
    const fakeBlob = { size: 100, type: 'application/pdf' } as Blob;
    const mockResponse = {
      ok: true,
      status: 200,
      blob: vi.fn().mockResolvedValue(fakeBlob),
    } as unknown as Response;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);
    const createObjectURL = vi.fn().mockReturnValue('blob:version-url');
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
    const clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue(
      Object.assign(document.createElement('a'), { click: clickSpy }),
    );
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    await downloadFileVersion(WS, FILE_ID, VERSION_ID, 'report-v2.pdf');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/download`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(clickSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('downloadFileVersion propagates errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_VERSION_NOT_FOUND', 'That file version does not exist', 404),
    );
    await expect(downloadFileVersion(WS, FILE_ID, VERSION_ID, 'report-v2.pdf'))
      .rejects.toThrow('That file version does not exist');
  });

  it('POST version make-current — calls the make-current endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ version: fakeVersion }));
    const result = await makeFileVersionCurrent(WS, FILE_ID, VERSION_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/make-current`,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(result).toEqual(fakeVersion);
  });

  it('makeFileVersionCurrent propagates backend errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('INSUFFICIENT_ROLE', 'Your role cannot modify files', 403),
    );
    await expect(makeFileVersionCurrent(WS, FILE_ID, VERSION_ID))
      .rejects.toThrow('Your role cannot modify files');
  });

  it('DELETE version — calls the version endpoint and surfaces LAST_VERSION', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('LAST_VERSION', 'The last live version cannot be deleted', 409),
    );

    await expect(deleteFileVersion(WS, FILE_ID, VERSION_ID))
      .rejects.toThrow('The last live version cannot be deleted');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}`,
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  // ── Attachment version feedback ─────────────────────────────────────────────

  it('GET version feedback — returns items and nextCursor', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeFeedback], nextCursor: null }),
    );
    const result = await listFileVersionFeedback(WS, FILE_ID, VERSION_ID, { limit: 5 });

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/feedback?limit=5`,
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result).toEqual({ items: [fakeFeedback], nextCursor: null });
  });

  it('listFileVersionFeedback propagates FILE_VERSION_NOT_FOUND', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FILE_VERSION_NOT_FOUND', 'That file version does not exist', 404),
    );
    await expect(listFileVersionFeedback(WS, FILE_ID, VERSION_ID))
      .rejects.toThrow('That file version does not exist');
  });

  it('POST version feedback — sends the body as JSON', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ feedback: fakeFeedback }, 201),
    );
    const result = await createFileVersionFeedback(WS, FILE_ID, VERSION_ID, 'Please clarify.');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/feedback`,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ body: 'Please clarify.' });
    expect(result).toEqual(fakeFeedback);
  });

  it('createFileVersionFeedback propagates validation errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('VALIDATION_ERROR', 'Feedback must be between 1 and 4000 characters', 400),
    );
    await expect(createFileVersionFeedback(WS, FILE_ID, VERSION_ID, ''))
      .rejects.toThrow('Feedback must be between 1 and 4000 characters');
  });

  it('PATCH version feedback — sends the edited body to the feedback endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ feedback: fakeFeedback }));
    const result = await updateFileVersionFeedback(
      WS,
      FILE_ID,
      VERSION_ID,
      FEEDBACK_ID,
      'Edited feedback',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/feedback/${FEEDBACK_ID}`,
      expect.objectContaining({ method: 'PATCH', credentials: 'include' }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ body: 'Edited feedback' });
    expect(result).toEqual(fakeFeedback);
  });

  it('updateFileVersionFeedback propagates FEEDBACK_FORBIDDEN', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FEEDBACK_FORBIDDEN', 'Only the author can edit this feedback', 403),
    );
    await expect(updateFileVersionFeedback(WS, FILE_ID, VERSION_ID, FEEDBACK_ID, 'Edited'))
      .rejects.toThrow('Only the author can edit this feedback');
  });

  it('DELETE version feedback — calls the feedback endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await deleteFileVersionFeedback(WS, FILE_ID, VERSION_ID, FEEDBACK_ID);

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS}/files/${FILE_ID}/versions/${VERSION_ID}/feedback/${FEEDBACK_ID}`,
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  it('deleteFileVersionFeedback propagates FEEDBACK_FORBIDDEN', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      fail('FEEDBACK_FORBIDDEN', 'Only the author or an admin can delete this feedback', 403),
    );
    await expect(deleteFileVersionFeedback(WS, FILE_ID, VERSION_ID, FEEDBACK_ID))
      .rejects.toThrow('Only the author or an admin can delete this feedback');
  });
});
