import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
  showToast: vi.fn(),
  onPermissionDenied: vi.fn(),
  notifyPermissionDenied: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  showToast: mocks.showToast,
  onPermissionDenied: mocks.onPermissionDenied,
  notifyPermissionDenied: mocks.notifyPermissionDenied,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) {
      super(message);
      this.name = 'ApiRequestError';
      this.status = status;
      this.code = code;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'workspace-1';
const PID = 'project-1';

describe('projects service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listProjects calls the correct workspace-scoped path', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listProjects } = await import('../projects');
    await listProjects(WS);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listProjects passes search, status, and visibility query params', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listProjects } = await import('../projects');
    await listProjects(WS, { search: 'nexus', status: 'ACTIVE', visibility: 'PRIVATE' });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain('search=nexus');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('visibility=PRIVATE');
  });

  it('createProject sends POST with the documented body fields', async () => {
    mocks.apiRequest.mockResolvedValue({ id: PID });
    const { createProject } = await import('../projects');
    await createProject(WS, { name: 'Nexus', key: 'NX', visibility: 'WORKSPACE' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects`,
      expect.objectContaining({ method: 'POST', authenticated: true }),
    );
  });

  it('archiveProject sends POST to the archive sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: PID, status: 'ARCHIVED' });
    const { archiveProject } = await import('../projects');
    await archiveProject(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/archive`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('restoreProject sends POST to the restore sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: PID, status: 'ACTIVE' });
    const { restoreProject } = await import('../projects');
    await restoreProject(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/restore`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('listProjectMembers calls the members sub-path', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listProjectMembers } = await import('../projects');
    await listProjectMembers(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/members`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listProjectActivity calls the activity sub-path with limit', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [], nextCursor: null });
    const { listProjectActivity } = await import('../projects');
    await listProjectActivity(WS, PID, { limit: 10 });
    const url: string = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain(`/workspaces/${WS}/projects/${PID}/activity`);
    expect(url).toContain('limit=10');
  });

  it('listProjectMilestones calls the milestones sub-path', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listProjectMilestones } = await import('../projects');
    await listProjectMilestones(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/milestones`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('updateProjectOrganizationAccess sends PATCH to the organizational-access sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ id: PID, workspaceId: WS, teamId: 'team-1', departmentId: null });
    const { updateProjectOrganizationAccess } = await import('../projects');
    await updateProjectOrganizationAccess(WS, PID, { teamId: 'team-1' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/organizational-access`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('refreshes session and retries on 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Unauthorized', 401))
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { listProjects } = await import('../projects');
    await listProjects(WS);
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
  });

  it('transferProjectOwnership sends POST to the transfer-ownership sub-path', async () => {
    mocks.apiRequest.mockResolvedValue({ projectId: PID, previousOwnerId: 'user-1', ownerId: 'user-2', ownerRole: 'PROJECT_MANAGER', previousOwnerRole: 'MANAGER', previousOwnerResultingRole: 'PROJECT_MANAGER', forcedAdminTransfer: false, updatedAt: '' });
    const { transferProjectOwnership } = await import('../projects');
    await transferProjectOwnership(WS, PID, { newOwnerId: 'user-2' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/transfer-ownership`,
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ---------------------------------------------------------------------------
  // Permission normalisation
  // ---------------------------------------------------------------------------

  describe('normaliseProjectPermissions', () => {
    it('maps a well-formed payload to a ProjectPermissions shape', async () => {
      const { normaliseProjectPermissions } = await import('../projects');
      const result = normaliseProjectPermissions({
        projectId: PID,
        workspaceRole: 'MEMBER',
        projectRole: 'PROJECT_MANAGER',
        accessSource: 'project_member',
        permissions: ['project.view', 'task.create'],
        assignableRoles: ['MEMBER', 'COLLABORATOR'],
      }, PID);
      expect(result).toEqual({
        projectId: PID,
        workspaceRole: 'MEMBER',
        projectRole: 'PROJECT_MANAGER',
        accessSource: 'project_member',
        permissions: ['project.view', 'task.create'],
        assignableRoles: ['MEMBER', 'COLLABORATOR'],
      });
    });

    it('fails closed when the payload is malformed', async () => {
      const { normaliseProjectPermissions } = await import('../projects');
      expect(() =>
        normaliseProjectPermissions(null as unknown, PID),
      ).not.toThrow();
      expect(() =>
        normaliseProjectPermissions('not an object' as unknown, PID),
      ).not.toThrow();
      expect(() =>
        normaliseProjectPermissions({ permissions: 'not an array' as unknown }, PID),
      ).not.toThrow();

      const result = normaliseProjectPermissions(null as unknown, PID);
      expect(result.projectId).toBe(PID);
      expect(result.workspaceRole).toBe('');
      expect(result.projectRole).toBeNull();
      expect(result.permissions).toEqual([]);
      expect(result.assignableRoles).toEqual([]);
      expect(result.accessSource).toBe('workspace_admin');
    });

    it('drops unknown roles from assignableRoles but retains unknown permissions', async () => {
      const { normaliseProjectPermissions } = await import('../projects');
      const result = normaliseProjectPermissions({
        projectId: PID,
        permissions: ['project.view', 'custom:permission'],
        assignableRoles: ['PROJECT_MANAGER', 'NOT_A_ROLE'],
      }, PID);
      expect(result.permissions).toEqual(['project.view', 'custom:permission']);
      expect(result.assignableRoles).toEqual(['PROJECT_MANAGER']);
    });

    it('treats a non-project_member accessSource as workspace_admin', async () => {
      const { normaliseProjectPermissions } = await import('../projects');
      const result = normaliseProjectPermissions({ accessSource: 'something_else' } as unknown, PID);
      expect(result.accessSource).toBe('workspace_admin');
    });
  });

  // ---------------------------------------------------------------------------
  // Permission endpoints
  // ---------------------------------------------------------------------------

  describe('getProjectPermissions', () => {
    it('calls the permissions sub-path with suppressPermissionEvents', async () => {
      mocks.apiRequest.mockResolvedValue({ projectId: PID, permissions: ['project.view'] });
      const { getProjectPermissions } = await import('../projects');
      await getProjectPermissions(WS, PID);
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        `/workspaces/${WS}/projects/${PID}/permissions`,
        expect.objectContaining({ authenticated: true, suppressPermissionEvents: true }),
      );
    });

    it('normalises the response and falls back projectId', async () => {
      mocks.apiRequest.mockResolvedValue({ permissions: ['task.view'] });
      const { getProjectPermissions } = await import('../projects');
      const result = await getProjectPermissions(WS, PID);
      expect(result.permissions).toEqual(['task.view']);
      expect(result.projectId).toBe(PID);
    });

    it('fails closed without throwing when the payload is malformed', async () => {
      mocks.apiRequest.mockResolvedValue(null);
      const { getProjectPermissions } = await import('../projects');
      const result = await getProjectPermissions(WS, PID);
      expect(result.permissions).toEqual([]);
      expect(result.projectRole).toBeNull();
    });
  });

  describe('listProjectRoles', () => {
    it('calls the project-roles endpoint and unwraps items', async () => {
      mocks.apiRequest.mockResolvedValue({ items: [{ role: 'VIEWER', label: 'Viewer', description: '', permissions: ['project.view'] }] });
      const { listProjectRoles } = await import('../projects');
      const roles = await listProjectRoles(WS);
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        `/workspaces/${WS}/project-roles`,
        expect.objectContaining({ authenticated: true, suppressPermissionEvents: true }),
      );
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('VIEWER');
    });

    it('tolerates a bare array instead of { items }', async () => {
      mocks.apiRequest.mockResolvedValue([{ role: 'MEMBER', label: 'Member', description: '', permissions: ['task.view'] }]);
      const { listProjectRoles } = await import('../projects');
      const roles = await listProjectRoles(WS);
      expect(roles).toHaveLength(1);
    });

    it('drops malformed role definitions', async () => {
      mocks.apiRequest.mockResolvedValue({ items: [
        { role: 'NOT_A_ROLE', label: 'Bad', description: '', permissions: [] },
        { role: 'MEMBER', label: 'Member', description: '', permissions: ['task.view'] },
      ] });
      const { listProjectRoles } = await import('../projects');
      const roles = await listProjectRoles(WS);
      expect(roles).toHaveLength(1);
      expect(roles[0].role).toBe('MEMBER');
    });
  });

  describe('deleteProject', () => {
    it('sends DELETE to the project path', async () => {
      mocks.apiRequest.mockResolvedValue({ id: PID, deleted: true });
      const { deleteProject } = await import('../projects');
      await deleteProject(WS, PID);
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        `/workspaces/${WS}/projects/${PID}`,
        expect.objectContaining({ method: 'DELETE', authenticated: true }),
      );
    });
  });
});
