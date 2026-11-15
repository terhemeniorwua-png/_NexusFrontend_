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
    const body = JSON.parse((mocks.apiRequest.mock.calls[0][1] as any).body);
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

  it('surfaces API failures', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.apiRequest.mockRejectedValue(new ApiRequestError('Forbidden', 403, 'FORBIDDEN'));
    const { listDevConnections } = await import('../dev-integrations');
    await expect(listDevConnections(WS)).rejects.toMatchObject({ status: 403, message: 'Forbidden' });
  });
});
