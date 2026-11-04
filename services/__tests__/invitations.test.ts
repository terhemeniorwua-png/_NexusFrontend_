import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import {
  acceptInvitation,
  createWorkspaceInvitation,
  declineInvitation,
  listMyInvitations,
  listWorkspaceInvitations,
  previewInvitation,
  resendWorkspaceInvitation,
  revokeWorkspaceInvitation,
} from '../invitations';

function response(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const invitation = {
  id: 'invitation-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Nexus Studio',
  email: 'ada@example.com',
  role: 'MEMBER',
  organizationRole: 'COMPANY_MEMBER',
  type: 'WORKSPACE',
  status: 'PENDING',
  invitedBy: { id: 'user-1', name: 'Grace' },
  expiresAt: '2026-11-06T00:00:00.000Z',
  acceptedAt: null,
  declinedAt: null,
  revokedAt: null,
  createdAt: '2026-11-04T00:00:00.000Z',
};

describe('invitation API service', () => {
  beforeEach(() => {
    setAccessToken('invitation-access-token');
    vi.restoreAllMocks();
  });

  it('lists invitations for a workspace with the requested status filter', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([invitation]));

    await expect(listWorkspaceInvitations('workspace-1', 'PENDING')).resolves.toEqual([invitation]);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/invitations?status=PENDING',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('creates an invitation with the confirmed payload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ invitation, emailSent: true }, 201));

    await expect(createWorkspaceInvitation('workspace-1', {
      email: 'ada@example.com',
      organizationRole: 'COMPANY_MEMBER',
    })).resolves.toEqual({ invitation, emailSent: true });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/invitations',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'ada@example.com', organizationRole: 'COMPANY_MEMBER' }) }),
    );
  });

  it('resends and revokes an invitation through their dedicated routes', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response({ invitation, emailSent: false }))
      .mockResolvedValueOnce(response({ ...invitation, status: 'REVOKED' }));

    await resendWorkspaceInvitation('workspace-1', 'invitation-1');
    await revokeWorkspaceInvitation('workspace-1', 'invitation-1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/invitations/invitation-1/resend', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/invitations/invitation-1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('lists the caller’s invitations without fabricating a token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response([invitation]));

    await listMyInvitations();

    expect(fetchMock).toHaveBeenCalledWith('/api/backend/invitations', expect.objectContaining({
      headers: expect.any(Headers),
    }));
    expect(String((fetchMock.mock.calls[0]?.[1] as RequestInit).headers)).not.toContain('token');
  });

  it('previews an invitation without a session', async () => {
    setAccessToken(null);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({
      workspace: { id: 'workspace-1', name: 'Nexus Studio', slug: 'nexus-studio' },
      invitedBy: { id: 'user-1', name: 'Grace' },
      role: 'MEMBER',
      organizationRole: null,
      status: 'PENDING',
      expiresAt: '2026-11-06T00:00:00.000Z',
      maskedEmail: 'a***@example.com',
      boundToAccount: true,
    }));

    const preview = await previewInvitation('token_-123');

    expect(preview.maskedEmail).toBe('a***@example.com');
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Headers;
    expect(headers.get('authorization')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/invitations/token_-123', expect.anything());
  });

  it('refreshes an expired access token and retries an accept once', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(errorResponse(401, 'AUTHENTICATION_REQUIRED', 'Expired'))
      .mockResolvedValueOnce(response({ accessToken: 'refreshed-token' }))
      .mockResolvedValueOnce(response({ ...invitation, status: 'ACCEPTED' }));

    await expect(acceptInvitation('token_-123')).resolves.toMatchObject({ status: 'ACCEPTED' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = (fetchMock.mock.calls[2]?.[1] as RequestInit).headers as Headers;
    expect(retryHeaders.get('authorization')).toBe('Bearer refreshed-token');
  });

  it('declines an invitation with a POST to the token route', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ ...invitation, status: 'DECLINED' }));

    await declineInvitation('token_-123');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/invitations/token_-123/decline',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
