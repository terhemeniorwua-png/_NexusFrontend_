import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import {
  addWorkspaceMember,
  acceptWorkspaceBillingResponsibility,
  acceptWorkspaceOwnershipTransfer,
  createWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
  initiateWorkspaceOwnershipTransfer,
  getWorkspaceLogo,
  uploadWorkspaceLogo,
  deleteWorkspaceLogo,
  removeWorkspaceMember,
  restoreWorkspaceMember,
  suspendWorkspaceMember,
  switchWorkspace,
  updateWorkspace,
  updateWorkspaceMemberRole,
} from '../workspaces';

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('workspace API service', () => {
  beforeEach(() => {
    setAccessToken('workspace-access-token');
    vi.restoreAllMocks();
  });

  it('lists the caller’s workspaces from the confirmed endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([]));

    await expect(listWorkspaces()).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledWith('/api/backend/workspaces', expect.objectContaining({
      credentials: 'include',
    }));
  });

  it('validates membership with the backend switch endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ id: 'workspace-1' }));

    await switchWorkspace('workspace-1');
    expect(fetch).toHaveBeenCalledWith('/api/backend/workspaces/workspace-1/switch', expect.objectContaining({ method: 'POST' }));
  });

  it('creates organization workspaces using the documented payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ id: 'workspace-1' }));
    const input = { name: 'Example Company', description: null, type: 'COMPANY' as const, visibility: 'PRIVATE' as const };

    await createWorkspace(input);
    expect(fetch).toHaveBeenCalledWith('/api/backend/workspaces', expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }));
  });

  it('updates only the supported workspace profile fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ id: 'workspace-1' }));
    const input = { name: 'Renamed', description: 'Details', visibility: 'PUBLIC' as const };

    await updateWorkspace('workspace-1', input);
    expect(fetch).toHaveBeenCalledWith('/api/backend/workspaces/workspace-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify(input) }));
  });

  it('loads workspace members from the authorized member endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([]));

    await expect(listWorkspaceMembers('workspace-1')).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledWith('/api/backend/workspaces/workspace-1/members', expect.any(Object));
  });

  it('adds an existing account with an organization role', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ userId: 'user-2' }));

    await addWorkspaceMember('workspace-1', {
      email: 'ada@example.com',
      organizationRole: 'COMPANY_COLLABORATOR',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/members',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'ada@example.com', organizationRole: 'COMPANY_COLLABORATOR' }),
      }),
    );
  });

  it('changes a member’s shared role with a PATCH', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ userId: 'user-2' }));

    await updateWorkspaceMemberRole('workspace-1', 'user-2', { role: 'COLLABORATOR' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/members/user-2',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ role: 'COLLABORATOR' }) }),
    );
  });

  it('removes a member with the delete-body contract the backend validates', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await expect(removeWorkspaceMember('workspace-1', 'user-2')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/members/user-2',
      expect.objectContaining({ method: 'DELETE', body: JSON.stringify({}) }),
    );
  });

  it('suspends and restores membership through their dedicated routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ userId: 'user-2', membershipStatus: 'SUSPENDED' }))
      .mockResolvedValueOnce(response({ userId: 'user-2', membershipStatus: 'ACTIVE' }));

    await suspendWorkspaceMember('workspace-1', 'user-2');
    await restoreWorkspaceMember('workspace-1', 'user-2');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/members/user-2/suspend', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/members/user-2/restore', expect.objectContaining({ method: 'POST' }));
  });

  it('initiates ownership transfer and requires separate transfer and billing acceptance calls', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ transferId: 'transfer-1', status: 'PENDING' }))
      .mockResolvedValueOnce(response({ workspaceId: 'workspace-1', billingAcceptanceRequired: true }))
      .mockResolvedValueOnce(response({ workspaceId: 'workspace-1' }));

    await initiateWorkspaceOwnershipTransfer('workspace-1', 'member-2');
    await acceptWorkspaceOwnershipTransfer('workspace-1', 'transfer-1');
    await acceptWorkspaceBillingResponsibility('workspace-1', 'transfer-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/owner/member-2', expect.objectContaining({ method: 'PATCH', body: '{}' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/owner-transfers/transfer-1/accept', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/owner-transfers/transfer-1/billing-acceptance', expect.objectContaining({ method: 'POST' }));
  });

  it('reads private logos as authenticated bytes and uploads raw bytes with image content type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'Content-Type': 'image/png' } }))
      .mockResolvedValueOnce(response({ logoReference: 'private-logo' }))
      .mockResolvedValueOnce(response({ logoReference: null }));
    const logo = await getWorkspaceLogo('workspace-1', 'COMPANY');
    const file = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' });
    await uploadWorkspaceLogo('workspace-1', 'COMPANY', file);
    await deleteWorkspaceLogo('workspace-1', 'COMPANY');
    expect(logo.type).toBe('image/png');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/company-profile/logo', expect.objectContaining({ headers: expect.any(Headers), credentials: 'include' }));
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: 'POST', body: file, headers: expect.objectContaining({}) }));
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Content-Type')).toBe('image/png');
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/company-profile/logo', expect.objectContaining({ method: 'DELETE' }));
  });
});
