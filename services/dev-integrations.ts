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

export interface DevBranchSummary {
  name: string;
  commitSha?: string | null;
  protected?: boolean;
  url?: string | null;
}

export interface DevPullRequestSummary {
  externalId: string;
  number: number;
  title: string;
  state: string;
  url: string | null;
  headRef: string | null;
  baseRef: string | null;
  authorLogin?: string | null;
  updatedAt?: string | null;
}

export type TaskDevLinkExternalType = 'BRANCH' | 'PULL_REQUEST' | 'COMMIT';

export interface TaskDevLink {
  id: string;
  taskId: string;
  projectId: string;
  projectRepositoryId: string | null;
  provider: DevIntegrationProvider;
  externalType: TaskDevLinkExternalType;
  externalId: string;
  externalNumber: number | null;
  title: string | null;
  url: string | null;
  ref: string | null;
  headRef: string | null;
  baseRef: string | null;
  state: string | null;
  repositoryFullName: string | null;
  reviewState?: string | null;
  reviewerLogin?: string | null;
  reviewedAt?: string | null;
  mergedAt?: string | null;
  linkedById: string;
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

export async function getGitlabConnectUrl(workspaceId: string): Promise<{ url: string }> {
  return authed<{ url: string }>(`/workspaces/${workspaceId}/dev-integrations/gitlab/start`);
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

export async function listRepositoryBranches(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
  params: { search?: string; page?: number; perPage?: number } = {},
): Promise<{ items: DevBranchSummary[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authed<{ items: DevBranchSummary[] }>(
    `/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/branches${suffix}`,
  );
}

export async function listRepositoryPullRequests(
  workspaceId: string,
  projectId: string,
  repositoryId: string,
  params: { search?: string; page?: number; perPage?: number; state?: 'open' | 'closed' | 'all' } = {},
): Promise<{ items: DevPullRequestSummary[] }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.perPage) query.set('perPage', String(params.perPage));
  if (params.state) query.set('state', params.state);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return authed<{ items: DevPullRequestSummary[] }>(
    `/workspaces/${workspaceId}/projects/${projectId}/repositories/${repositoryId}/pull-requests${suffix}`,
  );
}

export async function listTaskDevLinks(
  workspaceId: string,
  projectId: string,
  taskId: string,
): Promise<TaskDevLink[]> {
  return authed<TaskDevLink[]>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/dev-links`);
}

export async function linkTaskDevLink(
  workspaceId: string,
  projectId: string,
  taskId: string,
  input: {
    projectRepositoryId: string;
    externalType: TaskDevLinkExternalType;
    externalId: string;
    externalNumber?: number | null;
    title?: string | null;
    url?: string | null;
    ref?: string | null;
    headRef?: string | null;
    baseRef?: string | null;
    state?: string | null;
  },
): Promise<TaskDevLink> {
  return authed<TaskDevLink>(`/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/dev-links`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function unlinkTaskDevLink(
  workspaceId: string,
  projectId: string,
  taskId: string,
  devLinkId: string,
): Promise<{ ok: true }> {
  return authed<{ ok: true }>(
    `/workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}/dev-links/${devLinkId}`,
    { method: 'DELETE' },
  );
}

export interface DevPullRequestDetail {
  number: number; title: string; body: string | null; state: string; url: string | null;
  headRef: string | null; baseRef: string | null; headSha: string | null; authorLogin: string | null;
  createdAt: string | null; updatedAt: string | null; mergedAt: string | null;
  merged: boolean; draft: boolean; mergeable: boolean | null;
  additions: number; deletions: number; changedFiles: number; commits: number;
  comments: number; reviewComments: number;
  checks: { total: number; passed: number; failed: number; pending: number } | null;
}

export interface DevChangedFile {
  filename: string; previousFilename: string | null; status: string;
  additions: number; deletions: number; changes: number;
  patch: string | null; patchTruncated: boolean;
}

export interface DevCommitSummary {
  sha: string; message: string; authorName: string | null; authorLogin: string | null;
  date: string | null; url: string | null;
}

const repoBase = (w: string, p: string, r: string) =>
  `/workspaces/${w}/projects/${p}/repositories/${r}`;

export function getRepositoryPullRequest(w: string, p: string, r: string, n: number) {
  return authed<DevPullRequestDetail>(`${repoBase(w, p, r)}/pull-requests/${n}`);
}

export function listPullRequestFiles(w: string, p: string, r: string, n: number, page = 1) {
  return authed<{ items: DevChangedFile[] }>(`${repoBase(w, p, r)}/pull-requests/${n}/files?page=${page}`);
}

export function listPullRequestCommits(w: string, p: string, r: string, n: number, page = 1) {
  return authed<{ items: DevCommitSummary[] }>(`${repoBase(w, p, r)}/pull-requests/${n}/commits?page=${page}`);
}

export function listRepositoryCommits(w: string, p: string, r: string, branch?: string, page = 1) {
  const q = new URLSearchParams({ page: String(page) });
  if (branch) q.set('branch', branch);
  return authed<{ items: DevCommitSummary[] }>(`${repoBase(w, p, r)}/commits?${q}`);
}

export interface DevCommitDetail extends DevCommitSummary {
  additions: number; deletions: number; total: number;
  parents: string[];
  files: DevChangedFile[];
}

export function getRepositoryCommit(w: string, p: string, r: string, sha: string) {
  return authed<DevCommitDetail>(`${repoBase(w, p, r)}/commits/${sha}`);
}
