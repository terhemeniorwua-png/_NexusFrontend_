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
const PID = 'project-1';

describe('dev-integrations service (Feature A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listDevConnections calls workspace dev-integrations connections endpoint', async () => {
    mocks.apiRequest.mockResolvedValue([{ id: 'c1', provider: 'GITHUB', status: 'ACTIVE' }]);
    const { listDevConnections } = await import('../dev-integrations');
    const res = await listDevConnections(WS);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/dev-integrations/connections`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(res[0].id).toBe('c1');
  });

  it('getGithubConnectUrl calls github start endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ url: 'https://github.com/apps/x/installations/new?state=s' });
    const { getGithubConnectUrl } = await import('../dev-integrations');
    const res = await getGithubConnectUrl(WS);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/dev-integrations/github/start`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(res.url).toContain('github.com');
  });

  it('disconnectDevConnection calls DELETE connection endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { disconnectDevConnection } = await import('../dev-integrations');
    await disconnectDevConnection(WS, 'conn-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/dev-integrations/connections/conn-1`,
      expect.objectContaining({ method: 'DELETE', authenticated: true }),
    );
  });

  it('listAvailableRepositories calls connection repos endpoint', async () => {
    mocks.apiRequest.mockResolvedValue([{ externalRepoId: '1', fullName: 'acme/app', defaultBranch: 'main' }]);
    const { listAvailableRepositories } = await import('../dev-integrations');
    await listAvailableRepositories(WS, 'conn-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/dev-integrations/connections/conn-1/repos`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('listProjectRepositories calls project repositories endpoint', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listProjectRepositories } = await import('../dev-integrations');
    await listProjectRepositories(WS, PID);
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('linkProjectRepository posts link payload', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'r1', fullName: 'acme/app' });
    const { linkProjectRepository } = await import('../dev-integrations');
    await linkProjectRepository(WS, PID, { connectionId: 'conn-1', externalRepoId: '1', fullName: 'acme/app', defaultBranch: 'main' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories`,
      expect.objectContaining({ method: 'POST', authenticated: true }),
    );
    const body = JSON.parse(String((mocks.apiRequest.mock.calls[0][1] as { body: string }).body));
    expect(body).toEqual({ connectionId: 'conn-1', externalRepoId: '1', fullName: 'acme/app', defaultBranch: 'main' });
  });

  it('unlinkProjectRepository deletes repository link', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { unlinkProjectRepository } = await import('../dev-integrations');
    await unlinkProjectRepository(WS, PID, 'repo-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories/repo-1`,
      expect.objectContaining({ method: 'DELETE', authenticated: true }),
    );
  });


  it('listRepositoryBranches calls branches endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [{ name: 'main' }] });
    const { listRepositoryBranches } = await import('../dev-integrations');
    await listRepositoryBranches(WS, PID, 'repo-1', { search: 'ma', perPage: 20 });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain(`/workspaces/${WS}/projects/${PID}/repositories/repo-1/branches`);
    expect(url).toContain('search=ma');
    expect(url).toContain('perPage=20');
  });

  it('listRepositoryPullRequests calls pull-requests endpoint', async () => {
    mocks.apiRequest.mockResolvedValue({ items: [{ externalId: '1', number: 2, title: 'PR' }] });
    const { listRepositoryPullRequests } = await import('../dev-integrations');
    await listRepositoryPullRequests(WS, PID, 'repo-1', { state: 'open', search: 'fix' });
    const url = mocks.apiRequest.mock.calls[0][0] as string;
    expect(url).toContain(`/workspaces/${WS}/projects/${PID}/repositories/repo-1/pull-requests`);
    expect(url).toContain('state=open');
    expect(url).toContain('search=fix');
  });

  it('listTaskDevLinks calls task dev-links endpoint', async () => {
    mocks.apiRequest.mockResolvedValue([]);
    const { listTaskDevLinks } = await import('../dev-integrations');
    await listTaskDevLinks(WS, PID, 'task-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/task-1/dev-links`,
      expect.objectContaining({ authenticated: true }),
    );
  });

  it('linkTaskDevLink posts payload', async () => {
    mocks.apiRequest.mockResolvedValue({ id: 'l1' });
    const { linkTaskDevLink } = await import('../dev-integrations');
    await linkTaskDevLink(WS, PID, 'task-1', { projectRepositoryId: 'repo-1', externalType: 'PULL_REQUEST', externalId: '99', externalNumber: 12, title: 'PR', headRef: 'f', baseRef: 'm' });
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/task-1/dev-links`,
      expect.objectContaining({ method: 'POST', authenticated: true }),
    );
  });

  it('unlinkTaskDevLink deletes dev link', async () => {
    mocks.apiRequest.mockResolvedValue({ ok: true });
    const { unlinkTaskDevLink } = await import('../dev-integrations');
    await unlinkTaskDevLink(WS, PID, 'task-1', 'link-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/tasks/task-1/dev-links/link-1`,
      expect.objectContaining({ method: 'DELETE', authenticated: true }),
    );
  });

  it('surfaces API failures', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest.mockRejectedValue(new ApiRequestError('Forbidden', 403, 'FORBIDDEN'));
    const { listDevConnections } = await import('../dev-integrations');
    await expect(listDevConnections(WS)).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
  });
});

describe('dev-integrations repository access (FE-8)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('lists repository access members from contract endpoint', async () => {
    mocks.apiRequest.mockResolvedValue([
      {
        userId: 'u1',
        effectiveAccessLevel: 'READ',
        defaultLevel: 'LINK',
        isOverride: true,
        overrideLevel: 'READ',
        inheritedWorkspaceAccess: false,
        user: { id: 'u1', name: 'User', email: 'u1@example.com' },
      },
    ]);
    const { listRepositoryMembers } = await import('../dev-integrations');
    const res = await listRepositoryMembers(WS, PID, 'repo-1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories/repo-1/members`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(res[0]).toMatchObject({ userId: 'u1', effectiveAccessLevel: 'READ', isOverride: true, overrideLevel: 'READ' });
  });

  it('sets repository member override with contract body', async () => {
    mocks.apiRequest.mockResolvedValue({
      userId: 'u1', effectiveAccessLevel: 'LINK', defaultLevel: 'READ', isOverride: true, overrideLevel: 'LINK', inheritedWorkspaceAccess: false, user: { id: 'u1', name: 'User', email: 'u1@example.com' },
    });
    const { setRepositoryMemberOverride } = await import('../dev-integrations');
    await setRepositoryMemberOverride(WS, PID, 'repo-1', 'u1', 'LINK');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories/repo-1/members/u1`,
      expect.objectContaining({ method: 'PUT', authenticated: true }),
    );
    const body = JSON.parse(String((mocks.apiRequest.mock.calls[0][1] as { body: string }).body));
    expect(body).toEqual({ level: 'LINK' });
  });

  it('removes repository member override (idempotent DELETE)', async () => {
    mocks.apiRequest.mockResolvedValue({
      userId: 'u1', effectiveAccessLevel: 'READ', defaultLevel: 'READ', isOverride: false, overrideLevel: null, inheritedWorkspaceAccess: true, user: { id: 'u1', name: 'User', email: 'u1@example.com' },
    });
    const { removeRepositoryMemberOverride } = await import('../dev-integrations');
    const res = await removeRepositoryMemberOverride(WS, PID, 'repo-1', 'u1');
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `/workspaces/${WS}/projects/${PID}/repositories/repo-1/members/u1`,
      expect.objectContaining({ method: 'DELETE', authenticated: true }),
    );
    expect(res.isOverride).toBe(false);
    expect(res.effectiveAccessLevel).toBe('READ');
  });

  it('surfaces 403/404 backend messages for repository access operations', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest.mockRejectedValueOnce(new ApiRequestError('No repository access', 403, 'PERMISSION_DENIED'));
    const { listRepositoryMembers } = await import('../dev-integrations');
    await expect(listRepositoryMembers(WS, PID, 'repo-1')).rejects.toMatchObject({ status: 403, message: 'No repository access' });

    mocks.apiRequest.mockRejectedValueOnce(new ApiRequestError('That project member does not exist', 404, 'PROJECT_MEMBER_NOT_FOUND'));
    const { setRepositoryMemberOverride } = await import('../dev-integrations');
    await expect(setRepositoryMemberOverride(WS, PID, 'repo-1', 'u1', 'NONE')).rejects.toMatchObject({ status: 404, code: 'PROJECT_MEMBER_NOT_FOUND' });
  });
});
