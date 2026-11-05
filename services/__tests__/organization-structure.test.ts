import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, setAccessToken } from '@/lib/api';
import {
  addInstitutionGroupMember,
  addTeamMember,
  assignDepartmentMember,
  createDepartment,
  createInstitutionGroup,
  createTeam,
  listDepartments,
  listInstitutionGroups,
  listTeamMembers,
  listTeams,
  renameDepartment,
  setTeamLead,
} from '../organization-structure';

function response(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('organisation structure API contracts', () => {
  beforeEach(() => {
    setAccessToken('org-access-token');
    vi.restoreAllMocks();
  });

  it('uses the documented department endpoints and payloads', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 'dept-1', name: 'Research' }))
      .mockResolvedValueOnce(response({ id: 'dept-1', name: 'Science' }))
      .mockResolvedValueOnce(response({ userId: 'user-1', assigned: true }));

    await listDepartments('workspace-1');
    await createDepartment('workspace-1', 'Research');
    await renameDepartment('workspace-1', 'dept-1', 'Science');
    await assignDepartmentMember('workspace-1', 'dept-1', 'user-1', 'HEAD');

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/departments', expect.anything());
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/departments', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Research' }) }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/departments/dept-1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ name: 'Science' }) }));
    expect(mockFetch).toHaveBeenNthCalledWith(4, '/api/backend/workspaces/workspace-1/departments/dept-1/members', expect.objectContaining({ method: 'POST', body: JSON.stringify({ targetUserId: 'user-1', role: 'HEAD' }) }));
  });

  it('uses the documented team routes and request bodies', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 'team-1' }))
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ userId: 'user-1' }))
      .mockResolvedValueOnce(response({ id: 'team-1', leadId: 'user-1' }));

    await listTeams('workspace-1');
    await createTeam('workspace-1', { name: 'Design', departmentId: 'dept-1', leadId: 'user-1' });
    await listTeamMembers('workspace-1', 'team-1');
    await addTeamMember('workspace-1', 'team-1', 'user-1');
    await setTeamLead('workspace-1', 'team-1', 'user-1');

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/teams', expect.anything());
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/teams', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Design', departmentId: 'dept-1', leadId: 'user-1' }) }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/teams/team-1/members', expect.anything());
    expect(mockFetch).toHaveBeenNthCalledWith(4, '/api/backend/workspaces/workspace-1/teams/team-1/members', expect.objectContaining({ method: 'POST', body: JSON.stringify({ userId: 'user-1', role: 'MEMBER' }) }));
    expect(mockFetch).toHaveBeenNthCalledWith(5, '/api/backend/workspaces/workspace-1/teams/team-1/lead', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ leadId: 'user-1' }) }));
  });

  it('uses the institution group endpoints with separate membership role contracts', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response({ id: 'group-1', name: 'Faculty' }))
      .mockResolvedValueOnce(response({ id: 'member-1', userId: 'user-1', role: 'LEAD' }));

    await listInstitutionGroups('workspace-1');
    await createInstitutionGroup('workspace-1', { name: 'Faculty', description: null });
    await addInstitutionGroupMember('workspace-1', 'group-1', 'user-1', 'LEAD');

    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/backend/workspaces/workspace-1/institution-groups', expect.anything());
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/backend/workspaces/workspace-1/institution-groups', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Faculty', description: null }) }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, '/api/backend/workspaces/workspace-1/institution-groups/group-1/members', expect.objectContaining({ method: 'POST', body: JSON.stringify({ userId: 'user-1', role: 'LEAD' }) }));
  });

  it('surfaces backend 403 responses without retrying a forbidden organization read', async () => {
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(
      JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Team access is restricted.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    ));

    const request = listTeams('workspace-1');
    await expect(request).rejects.toBeInstanceOf(ApiRequestError);
    await expect(request).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'Team access is restricted.',
    });
    expect(mockFetch).toHaveBeenCalledOnce();
  });
});
