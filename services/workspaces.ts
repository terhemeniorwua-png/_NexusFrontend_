import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';

export type WorkspaceType = 'INDIVIDUAL' | 'COMPANY' | 'INSTITUTION';
export type WorkspaceVisibility = 'PRIVATE' | 'PUBLIC';
export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: WorkspaceType;
  isPersonal: boolean;
  visibility: WorkspaceVisibility;
  status: WorkspaceStatus;
  ownerId: string;
  role: string;
  organizationRole: string | null;
  joinCodeEnabled: boolean;
  memberCount: number;
  projectCount: number;
  teamCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  role: string;
  organizationRole: string | null;
  membershipStatus: 'ACTIVE' | 'SUSPENDED';
  joinedAt: string;
  owner: boolean;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string | null;
  type: 'COMPANY' | 'INSTITUTION';
  visibility: WorkspaceVisibility;
}

export interface UpdateWorkspaceInput {
  name: string;
  description: string | null;
  visibility: WorkspaceVisibility;
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

export function listWorkspaces(): Promise<Workspace[]> {
  return authorizedRequest<Workspace[]>('/workspaces');
}

export function switchWorkspace(workspaceId: string): Promise<Workspace> {
  return authorizedRequest<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}/switch`, { method: 'POST' });
}

export function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  return authorizedRequest<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(input) });
}

export function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
  return authorizedRequest<Workspace>(`/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return authorizedRequest<WorkspaceMember[]>(`/workspaces/${encodeURIComponent(workspaceId)}/members`);
}
