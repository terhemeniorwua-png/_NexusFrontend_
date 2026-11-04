import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import type {
  MembershipStatus,
  OrganizationRole,
  WorkspaceRole,
  WorkspaceStatus,
  WorkspaceType,
  WorkspaceVisibility,
} from '@/types/workspace';

export type {
  MembershipStatus,
  OrganizationRole,
  WorkspaceRole,
  WorkspaceStatus,
  WorkspaceType,
  WorkspaceVisibility,
} from '@/types/workspace';

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
  role: WorkspaceRole;
  organizationRole: OrganizationRole | null;
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
  role: WorkspaceRole;
  organizationRole: OrganizationRole | null;
  membershipStatus: MembershipStatus;
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

export interface AddWorkspaceMemberInput {
  email: string;
  organizationRole?: OrganizationRole;
  role?: WorkspaceRole;
}

export type UpdateWorkspaceMemberInput =
  | { organizationRole: OrganizationRole }
  | { role: WorkspaceRole };

async function authorizedRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    return await apiRequest<T>(path, { ...options, authenticated: true });
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return apiRequest<T>(path, { ...options, authenticated: true });
  }
}

function workspacePath(workspaceId: string, suffix = ''): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}${suffix}`;
}

export function listWorkspaces(): Promise<Workspace[]> {
  return authorizedRequest<Workspace[]>('/workspaces');
}

export function switchWorkspace(workspaceId: string): Promise<Workspace> {
  return authorizedRequest<Workspace>(workspacePath(workspaceId, '/switch'), { method: 'POST' });
}

export function createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
  return authorizedRequest<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(input) });
}

export function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
  return authorizedRequest<Workspace>(workspacePath(workspaceId), {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
  return authorizedRequest<WorkspaceMember[]>(workspacePath(workspaceId, '/members'));
}

/** Adds an existing Nexus account to the workspace. Invite by email instead for people without accounts. */
export function addWorkspaceMember(
  workspaceId: string,
  input: AddWorkspaceMemberInput,
): Promise<WorkspaceMember> {
  return authorizedRequest<WorkspaceMember>(workspacePath(workspaceId, '/members'), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  input: UpdateWorkspaceMemberInput,
): Promise<WorkspaceMember> {
  return authorizedRequest<WorkspaceMember>(
    workspacePath(workspaceId, `/members/${encodeURIComponent(userId)}`),
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function removeWorkspaceMember(workspaceId: string, userId: string): Promise<void> {
  return authorizedRequest<void>(workspacePath(workspaceId, `/members/${encodeURIComponent(userId)}`), {
    method: 'DELETE',
    body: JSON.stringify({}),
  });
}

export function suspendWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
  return authorizedRequest<WorkspaceMember>(
    workspacePath(workspaceId, `/members/${encodeURIComponent(userId)}/suspend`),
    { method: 'POST' },
  );
}

export function restoreWorkspaceMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
  return authorizedRequest<WorkspaceMember>(
    workspacePath(workspaceId, `/members/${encodeURIComponent(userId)}/restore`),
    { method: 'POST' },
  );
}
