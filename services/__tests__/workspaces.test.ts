import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAccessToken } from '@/lib/api';
import {
  createWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
  switchWorkspace,
  updateWorkspace,
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
});
