import { apiRequest } from '@/lib/api';
import { withAuthRetry } from '@/lib/with-auth-retry';

export type DevIntegrationProvider = 'GITHUB' | 'GITLAB';
export type IntegrationConnectionStatus = 'PENDING' | 'ACTIVE' | 'DISCONNECTED' | 'ERROR';

export interface DevExternalAccount {
  id: string | null;
  login: string | null;
  name: string | null;
  type?: string | null;
}

export interface DevConnectionSummary {
  id: string;
  provider: DevIntegrationProvider;
  workspaceId: string;
  status: IntegrationConnectionStatus;
  externalAccount: DevExternalAccount;
  scopes: string[];
  createdById: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevRepositorySummary {
  externalRepoId: string;
  fullName: string;
  name?: string;
  ownerLogin?: string | null;
  defaultBranch: string | null;
  private?: boolean;
  htmlUrl?: string | null;
}

export interface LinkedProjectRepository {
  id: string;
  projectId: string;
  connectionId: string;
  provider: DevIntegrationProvider;
  externalRepoId: string;
  fullName: string;
  defaultBranch: string | null;
  createdAt: string;
  updatedAt: string;
}

function authed<T>(path: string, options: RequestInit = {}): Promise<T> {
  return withAuthRetry(() => apiRequest<T>(path, { ...options, authenticated: true }));
}

export async function listDevConnections(workspaceId: string): Promise<DevConnectionSummary[]> {
  return authed<DevConnectionSummary[]>(`/workspaces/${workspaceId}/dev-integrations/connections`);
}

export async function getGithubConnectUrl(workspaceId: string): Promise<{ url: string }> {
  return authed<{ url: string }>(`/workspaces/${workspaceId}/dev-integrations/github/start`);
}

export async function disconnectDevConnection(
  workspaceId: string,
  connectionId: string,
): Promise<{ ok: true; providerRevoked?: boolean }> {
  return authed<{ ok: true; providerRevoked?: boolean }>(
    `/workspaces/${workspaceId}/dev-integrations/connections/${connectionId}`,
    { method: 'DELETE' },
  );
}

export async function listAvailableRepositories(
  workspaceId: string,
  connectionId: string,
): Promise<DevRepositorySummary[]> {
  return authed<DevRepositorySummary[]>(
    `/workspaces/${workspaceId}/dev-integrations/connections/${connectionId}/repos`,
  );
}

export async function listProjectRepositories(
  workspaceId: string,
  projectId: string,
): Promise<LinkedProjectRepository[]> {
  return authed<LinkedProjectRepository[]>(
    `/workspaces/${workspaceId}/projects/${projectId}/repositories`,
  );
}

export async function linkProjectRepository(
  workspaceId: string,
  projectId: string,
  input: { connectionId: string; externalRepoId: string; fullName: string; defaultBranch?: string | null },
): Promise<LinkedProjectRepository> {
  return authed<LinkedProjectRepository>(
    `/workspaces/${workspaceId}/projects/${projectId}/repositories`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export async function unlinkProjectRepository(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
): Promise<{ ok: true }> {
  return authed<{ ok: true }>(
    `/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}`,
    { method: 'DELETE' },
  );
}
