import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import {
  approveJoinRequest,
  createJoinRequest,
  createWorkspaceJoinCode,
  disableWorkspaceJoinCode,
  discoverWorkspaces,
  joinWorkspaceByCode,
  listMyJoinRequests,
  listWorkspaceJoinRequests,
  rejectJoinRequest,
  withdrawJoinRequest,
} from '../join-requests';

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const joinRequest = {
  id: 'request-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Nexus Studio',
  userId: 'user-2',
  userName: 'Ada',
  userEmail: 'ada@example.com',
  status: 'PENDING',
  role: 'MEMBER',
  organizationRole: null,
  teamId: null,
  message: 'I would like to join.',
  reviewedBy: null,
  reviewedAt: null,
  decisionNote: null,
  expiresAt: '2026-11-11T00:00:00.000Z',
  createdAt: '2026-11-04T00:00:00.000Z',
};

describe('join-request API service', () => {
  beforeEach(() => {
    setAccessToken('join-access-token');
    vi.restoreAllMocks();
  });

  it('discovers public workspaces with the confirmed query parameters', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([]));

    await discoverWorkspaces({ search: '  studio ', limit: 10, offset: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/discover?search=studio&limit=10&offset=20',
      expect.anything(),
    );
  });

  it('omits discovery parameters that were not supplied', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([]));

    await discoverWorkspaces();

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/workspaces/discover', expect.anything());
  });

  it('creates a join request with a trimmed optional message', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(joinRequest, 201));

    await createJoinRequest('workspace-1', '  I would like to join.  ');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/join-requests',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ message: 'I would like to join.' }) }),
    );
  });

  it('sends null when the join message is blank', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(joinRequest, 201));

    await createJoinRequest('workspace-1', '   ');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/join-requests',
      expect.objectContaining({ body: JSON.stringify({ message: null }) }),
    );
  });

  it('uses a join code through the documented route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(joinRequest, 201));

    await joinWorkspaceByCode('  join-code  ');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/join',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ code: 'join-code', message: null }) }),
    );
  });

  it('lists the caller’s requests and workspace requests with a status filter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([joinRequest]))
      .mockResolvedValueOnce(response([joinRequest]));

    await listMyJoinRequests();
    await listWorkspaceJoinRequests('workspace-1', 'APPROVED');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/join-requests/mine', expect.anything());
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/join-requests?status=APPROVED', expect.anything());
  });

  it('approves with the selected role and rejects with a note', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ ...joinRequest, status: 'APPROVED' }))
      .mockResolvedValueOnce(response({ ...joinRequest, status: 'REJECTED' }));

    await approveJoinRequest('workspace-1', 'request-1', { organizationRole: 'COMPANY_COLLABORATOR' });
    await rejectJoinRequest('workspace-1', 'request-1', '  No capacity  ');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/backend/workspaces/workspace-1/join-requests/request-1/approve',
      expect.objectContaining({ body: JSON.stringify({ organizationRole: 'COMPANY_COLLABORATOR' }) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/backend/workspaces/workspace-1/join-requests/request-1/reject',
      expect.objectContaining({ body: JSON.stringify({ note: 'No capacity' }) }),
    );
  });

  it('withdraws a request and manages the workspace join code', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ ...joinRequest, status: 'WITHDRAWN' }))
      .mockResolvedValueOnce(response({ workspaceId: 'workspace-1', code: 'code', link: 'https://nexus.test/join/code' }))
      .mockResolvedValueOnce(response({ workspaceId: 'workspace-1', joinCodeEnabled: false }));

    await withdrawJoinRequest('request-1');
    await createWorkspaceJoinCode('workspace-1');
    await disableWorkspaceJoinCode('workspace-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/join-requests/request-1', expect.objectContaining({ method: 'DELETE' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/join-code', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/join-code', expect.objectContaining({ method: 'DELETE' }));
  });
});
