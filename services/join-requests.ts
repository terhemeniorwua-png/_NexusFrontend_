import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import type {
  JoinRequestStatus,
  OrganizationRole,
  WorkspaceRole,
  WorkspaceType,
} from '@/types/workspace';

export interface DiscoveredWorkspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: WorkspaceType;
  memberCount: number;
}

export interface JoinRequest {
  id: string;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: JoinRequestStatus;
  role: WorkspaceRole;
  organizationRole: OrganizationRole | null;
  teamId: string | null;
  message: string | null;
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: string | null;
  decisionNote: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface JoinCode {
  workspaceId: string;
  code: string;
  link: string;
}

export type JoinRequestListStatus = JoinRequestStatus | 'ALL';

export interface DiscoverWorkspacesInput {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ApproveJoinRequestInput {
  organizationRole?: OrganizationRole;
  role?: WorkspaceRole;
  teamId?: string | null;
}

async function authorizedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

export function discoverWorkspaces(input: DiscoverWorkspacesInput = {}): Promise<DiscoveredWorkspace[]> {
  const query = new URLSearchParams();
  if (input.search?.trim()) query.set('search', input.search.trim());
  if (input.limit !== undefined) query.set('limit', String(input.limit));
  if (input.offset !== undefined) query.set('offset', String(input.offset));
  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return authorizedRequest<DiscoveredWorkspace[]>(`/workspaces/discover${suffix}`);
}

export function createJoinRequest(
  workspaceId: string,
  message?: string | null,
): Promise<JoinRequest> {
  return authorizedRequest<JoinRequest>(
    `/workspaces/${encodeURIComponent(workspaceId)}/join-requests`,
    { method: 'POST', body: JSON.stringify({ message: message?.trim() || null }) },
  );
}

export function joinWorkspaceByCode(code: string, message?: string | null): Promise<JoinRequest> {
  return authorizedRequest<JoinRequest>('/workspaces/join', {
    method: 'POST',
    body: JSON.stringify({ code: code.trim(), message: message?.trim() || null }),
  });
}

export function listMyJoinRequests(): Promise<JoinRequest[]> {
  return authorizedRequest<JoinRequest[]>('/workspaces/join-requests/mine');
}

export function listWorkspaceJoinRequests(
  workspaceId: string,
  status: JoinRequestListStatus = 'ALL',
): Promise<JoinRequest[]> {
  const query = new URLSearchParams({ status });
  return authorizedRequest<JoinRequest[]>(
    `/workspaces/${encodeURIComponent(workspaceId)}/join-requests?${query.toString()}`,
  );
}

export function approveJoinRequest(
  workspaceId: string,
  requestId: string,
  input: ApproveJoinRequestInput = {},
): Promise<JoinRequest> {
  return authorizedRequest<JoinRequest>(
    `/workspaces/${encodeURIComponent(workspaceId)}/join-requests/${encodeURIComponent(requestId)}/approve`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function rejectJoinRequest(
  workspaceId: string,
  requestId: string,
  note?: string | null,
): Promise<JoinRequest> {
  return authorizedRequest<JoinRequest>(
    `/workspaces/${encodeURIComponent(workspaceId)}/join-requests/${encodeURIComponent(requestId)}/reject`,
    { method: 'POST', body: JSON.stringify({ note: note?.trim() || null }) },
  );
}

export function withdrawJoinRequest(requestId: string): Promise<JoinRequest> {
  return authorizedRequest<JoinRequest>(`/workspaces/join-requests/${encodeURIComponent(requestId)}`, {
    method: 'DELETE',
  });
}

export function createWorkspaceJoinCode(workspaceId: string): Promise<JoinCode> {
  return authorizedRequest<JoinCode>(`/workspaces/${encodeURIComponent(workspaceId)}/join-code`, {
    method: 'POST',
  });
}

export function disableWorkspaceJoinCode(workspaceId: string): Promise<{ workspaceId: string; joinCodeEnabled: false }> {
  return authorizedRequest<{ workspaceId: string; joinCodeEnabled: false }>(
    `/workspaces/${encodeURIComponent(workspaceId)}/join-code`,
    { method: 'DELETE' },
  );
}
