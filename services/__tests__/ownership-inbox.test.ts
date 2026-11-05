import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import { listIncomingOwnershipTransfers, rejectWorkspaceOwnershipTransfer } from '../workspaces';

function response(data: unknown): Response { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }

describe('ownership transfer inbox service', () => {
  beforeEach(() => { setAccessToken('test-token'); vi.restoreAllMocks(); });
  it('lists incoming transfers with contract pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ items: [], limit: 25, offset: 5 }));
    await expect(listIncomingOwnershipTransfers(25, 5)).resolves.toEqual({ items: [], limit: 25, offset: 5 });
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/workspaces/owner-transfers/incoming?limit=25&offset=5', expect.any(Object));
  });
  it('rejects without a request body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response({ workspaceId: 'workspace-1', status: 'REJECTED' }));
    await rejectWorkspaceOwnershipTransfer('workspace-1', 'transfer-1');
    expect(fetchMock).toHaveBeenCalledWith('/api/backend/workspaces/workspace-1/owner-transfers/transfer-1/reject', expect.objectContaining({ method: 'POST' }));
  });
});
