import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import {
  listIncomingOwnershipTransfers,
  rejectWorkspaceOwnershipTransfer,
  type IncomingOwnershipTransfer,
} from '../workspaces';

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Minimal valid IncomingOwnershipTransfer fixture including the sender field. */
const transferFixture: IncomingOwnershipTransfer = {
  id: 'transfer-1',
  workspaceId: 'workspace-2',
  status: 'PENDING',
  createdAt: '2026-11-01T00:00:00.000Z',
  expiresAt: null,
  acceptedAt: null,
  billingAcceptedAt: null,
  workspace: { id: 'workspace-2', name: 'Other Studio', type: 'COMPANY', status: 'ACTIVE' },
  initiatedBy: { id: 'user-99', name: 'Alice' },
};

describe('ownership transfer inbox service', () => {
  beforeEach(() => {
    setAccessToken('test-token');
    vi.restoreAllMocks();
  });

  it('lists incoming transfers with contract pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ items: [], limit: 25, offset: 5 }),
    );
    await expect(listIncomingOwnershipTransfers(25, 5)).resolves.toEqual({
      items: [],
      limit: 25,
      offset: 5,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/owner-transfers/incoming?limit=25&offset=5',
      expect.any(Object),
    );
  });

  it('returns items including the initiatedBy sender field', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ items: [transferFixture], limit: 50, offset: 0 }),
    );
    const result = await listIncomingOwnershipTransfers();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.initiatedBy).toEqual({ id: 'user-99', name: 'Alice' });
  });

  it('rejects without a request body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      response({ workspaceId: 'workspace-1', status: 'REJECTED' }),
    );
    await rejectWorkspaceOwnershipTransfer('workspace-1', 'transfer-1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/workspaces/workspace-1/owner-transfers/transfer-1/reject',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
