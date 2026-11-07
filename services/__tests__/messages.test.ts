import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'workspace-1';
const CID = 'channel-1';
const MID = 'message-1';

describe('messages service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listMessages calls the channel messages path', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listMessages } = await import('../messages');
    await listMessages(WS, CID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listMessages passes cursor, limit, and includeDeleted params', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listMessages } = await import('../messages');
    await listMessages(WS, CID, { cursor: 'abc', limit: 25, includeDeleted: true });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('cursor=abc');
    expect(url).toContain('limit=25');
    expect(url).toContain('includeDeleted=true');
  });

  it('sendMessage sends POST to the messages path with body and parentId', async () => {
    mocks.apiRequest.mockResolvedValue({ id: MID });
    const { sendMessage } = await import('../messages');
    await sendMessage(WS, CID, { body: 'Hello!', parentId: 'msg-0' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages`,
      expect.objectContaining({ method: 'POST' }),
    );
    const payload = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body);
    expect(payload.body).toBe('Hello!');
    expect(payload.parentId).toBe('msg-0');
  });

  it('getReplies calls the replies sub-path', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { getReplies } = await import('../messages');
    await getReplies(WS, CID, MID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}/replies`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('editMessage sends PATCH to the message path with body', async () => {
    mocks.apiRequest.mockResolvedValue({ id: MID, body: 'Updated' });
    const { editMessage } = await import('../messages');
    await editMessage(WS, CID, MID, 'Updated');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
    const payload = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body);
    expect(payload.body).toBe('Updated');
  });

  it('deleteMessage sends DELETE to the message path', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { deleteMessage } = await import('../messages');
    await deleteMessage(WS, CID, MID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('pinMessage sends POST to the pin sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: MID, pinnedAt: '2026-01-01T00:00:00Z' });
    const { pinMessage } = await import('../messages');
    await pinMessage(WS, CID, MID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}/pin`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('unpinMessage sends POST to the unpin sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: MID, pinnedAt: null });
    const { unpinMessage } = await import('../messages');
    await unpinMessage(WS, CID, MID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}/unpin`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('addReaction sends POST to the reactions sub-path with emoji', async () => {
    mocks.apiRequest.mockResolvedValue({ id: MID });
    const { addReaction } = await import('../messages');
    await addReaction(WS, CID, MID, '👍');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}/reactions`,
      expect.objectContaining({ method: 'POST' }),
    );
    const payload = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body);
    expect(payload.emoji).toBe('👍');
  });

  it('removeReaction sends DELETE to the reactions sub-path with emoji query', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { removeReaction } = await import('../messages');
    await removeReaction(WS, CID, MID, '👍');
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain(`/messages/${MID}/reactions`);
    expect(url).toContain('emoji=%F0%9F%91%8D');
    expect(mocks.apiRequest.mock.calls[0][1]).toMatchObject({ method: 'DELETE' });
  });

  it('markMessageRead sends POST to the read sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { markMessageRead } = await import('../messages');
    await markMessageRead(WS, CID, MID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/messages/${MID}/read`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('getUnreadCount calls the unread-count sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ unreadCount: 5 });
    const { getUnreadCount } = await import('../messages');
    await getUnreadCount(WS, CID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/unread-count`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('refreshes session and retries on 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Unauthorized', 401))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { listMessages } = await import('../messages');
    await listMessages(WS, CID);
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });
});
