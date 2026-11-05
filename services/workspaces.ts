import { apiRawRequest, apiRequest, ApiRequestError } from '@/lib/api';
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

export interface OwnershipTransferCreated {
  transferId: string;
  status: 'PENDING';
}

export interface OwnershipTransferAccepted {
  workspaceId: string;
  billingAcceptanceRequired: boolean;
}

export interface IncomingOwnershipTransfer {
  id: string;
  workspaceId: string;
  status: 'PENDING';
  createdAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  billingAcceptedAt: string | null;
  workspace: { id: string; name: string; type: WorkspaceType; status: WorkspaceStatus };
  /** The current workspace owner who initiated the transfer. */
  initiatedBy: { id: string; name: string };
}

export interface IncomingOwnershipTransfersPage {
  items: IncomingOwnershipTransfer[];
  limit: number;
  offset: number;
}

export interface OrganizationLogoResponse { logoReference: string | null }

export function listIncomingOwnershipTransfers(limit = 50, offset = 0): Promise<IncomingOwnershipTransfersPage> {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  return authorizedRequest<IncomingOwnershipTransfersPage>(`/workspaces/owner-transfers/incoming?${query}`);
}

export function rejectWorkspaceOwnershipTransfer(workspaceId: string, transferId: string): Promise<{ workspaceId: string; status: 'REJECTED' }> {
  return authorizedRequest(`/workspaces/${encodeURIComponent(workspaceId)}/owner-transfers/${encodeURIComponent(transferId)}/reject`, { method: 'POST' });
}

function logoPath(workspaceId: string, type: 'COMPANY' | 'INSTITUTION'): string {
  return workspacePath(workspaceId, `/${type === 'COMPANY' ? 'company' : 'institution'}-profile/logo`);
}

export async function getWorkspaceLogo(workspaceId: string, type: 'COMPANY' | 'INSTITUTION'): Promise<Blob> {
  try { return await (await apiRawRequest(logoPath(workspaceId, type), { authenticated: true })).blob(); }
  catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
    await refreshSession();
    return (await apiRawRequest(logoPath(workspaceId, type), { authenticated: true })).blob();
  }
}

export function uploadWorkspaceLogo(workspaceId: string, type: 'COMPANY' | 'INSTITUTION', image: Blob): Promise<OrganizationLogoResponse> {
  return authorizedRequest(logoPath(workspaceId, type), { method: 'POST', headers: { 'Content-Type': image.type }, body: image });
}

export function deleteWorkspaceLogo(workspaceId: string, type: 'COMPANY' | 'INSTITUTION'): Promise<OrganizationLogoResponse> {
  return authorizedRequest(logoPath(workspaceId, type), { method: 'DELETE' });
}

export function initiateWorkspaceOwnershipTransfer(
  workspaceId: string,
  userId: string,
  newOwnerRole?: Exclude<WorkspaceRole, 'OWNER'>,
): Promise<OwnershipTransferCreated> {
  return authorizedRequest<OwnershipTransferCreated>(
    workspacePath(workspaceId, `/owner/${encodeURIComponent(userId)}`),
    { method: 'PATCH', body: JSON.stringify(newOwnerRole ? { newOwnerRole } : {}) },
  );
}

export function acceptWorkspaceOwnershipTransfer(
  workspaceId: string,
  transferId: string,
): Promise<OwnershipTransferAccepted> {
  return authorizedRequest<OwnershipTransferAccepted>(
    workspacePath(workspaceId, `/owner-transfers/${encodeURIComponent(transferId)}/accept`),
    { method: 'POST' },
  );
}

export function acceptWorkspaceBillingResponsibility(
  workspaceId: string,
  transferId: string,
): Promise<{ workspaceId: string }> {
  return authorizedRequest<{ workspaceId: string }>(
    workspacePath(workspaceId, `/owner-transfers/${encodeURIComponent(transferId)}/billing-acceptance`),
    { method: 'POST' },
  );
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
