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

describe('channels service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listChannels calls the workspace-scoped channels path', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listChannels } = await import('../channels');
    await listChannels(WS);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listChannels passes cursor and limit params', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listChannels } = await import('../channels');
    await listChannels(WS, { cursor: 'abc', limit: 50 });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('cursor=abc');
    expect(url).toContain('limit=50');
  });

  it('createChannel sends POST with type, name, and description', async () => {
    mocks.apiRequest.mockResolvedValue({ id: CID });
    const { createChannel } = await import('../channels');
    await createChannel(WS, { type: 'WORKSPACE', name: 'general', description: 'General chat' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body);
    expect(body.type).toBe('WORKSPACE');
    expect(body.name).toBe('general');
    expect(body.description).toBe('General chat');
  });

  it('getChannel calls the channel path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: CID });
    const { getChannel } = await import('../channels');
    await getChannel(WS, CID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('updateChannel sends PATCH with name and description', async () => {
    mocks.apiRequest.mockResolvedValue({ id: CID });
    const { updateChannel } = await import('../channels');
    await updateChannel(WS, CID, { name: 'updated' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('archiveChannel sends POST to the archive sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: CID, archivedAt: '2026-01-01T00:00:00Z' });
    const { archiveChannel } = await import('../channels');
    await archiveChannel(WS, CID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/archive`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('deleteChannel sends DELETE to the channel path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: CID, deleted: true });
    const { deleteChannel } = await import('../channels');
    await deleteChannel(WS, CID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('addChannelMember sends POST to members sub-path with userId', async () => {
    mocks.apiRequest.mockResolvedValue({ channelId: CID, userId: 'user-2', role: 'MEMBER' });
    const { addChannelMember } = await import('../channels');
    await addChannelMember(WS, CID, 'user-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/members`,
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse((mocks.apiRequest.mock.calls[0][1] as { body: string }).body);
    expect(body.userId).toBe('user-2');
  });

  it('removeChannelMember sends DELETE to members/:userId sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ channelId: CID, userId: 'user-2', removed: true });
    const { removeChannelMember } = await import('../channels');
    await removeChannelMember(WS, CID, 'user-2');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/channels/${CID}/members/user-2`,
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('refreshes session and retries on 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Unauthorized', 401))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { listChannels } = await import('../channels');
    await listChannels(WS);
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });
});
