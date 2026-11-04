import { apiRequest, ApiRequestError } from '@/lib/api';
import { refreshSession } from '@/services/auth';
import type {
  InvitationStatus,
  InvitationType,
  OrganizationRole,
  WorkspaceRole,
} from '@/types/workspace';

export interface Invitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: WorkspaceRole;
  organizationRole: OrganizationRole | null;
  type: InvitationType;
  status: InvitationStatus;
  invitedBy: { id: string; name: string };
  expiresAt: string;
  acceptedAt: string | null;
  declinedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface InvitationResult {
  invitation: Invitation;
  /** False when the backend could not hand the invitation to the mail provider. */
  emailSent: boolean;
}

export interface InvitationPreview {
  workspace: { id: string; name: string; slug: string };
  invitedBy: { id: string; name: string };
  role: WorkspaceRole;
  organizationRole: OrganizationRole | null;
  status: InvitationStatus;
  expiresAt: string;
  maskedEmail: string;
  boundToAccount: boolean;
}

export type InvitationListStatus = InvitationStatus | 'ALL';

export interface CreateInvitationInput {
  email: string;
  organizationRole?: OrganizationRole;
  role?: WorkspaceRole;
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

export function listWorkspaceInvitations(
  workspaceId: string,
  status: InvitationListStatus = 'ALL',
): Promise<Invitation[]> {
  const query = new URLSearchParams({ status });
  return authorizedRequest<Invitation[]>(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations?${query.toString()}`,
  );
}

export function createWorkspaceInvitation(
  workspaceId: string,
  input: CreateInvitationInput,
): Promise<InvitationResult> {
  return authorizedRequest<InvitationResult>(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function resendWorkspaceInvitation(
  workspaceId: string,
  invitationId: string,
): Promise<InvitationResult> {
  return authorizedRequest<InvitationResult>(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
    { method: 'POST' },
  );
}

export function revokeWorkspaceInvitation(workspaceId: string, invitationId: string): Promise<Invitation> {
  return authorizedRequest<Invitation>(
    `/workspaces/${encodeURIComponent(workspaceId)}/invitations/${encodeURIComponent(invitationId)}`,
    { method: 'DELETE' },
  );
}

/**
 * Invitations addressed to the signed-in account. The summary deliberately
 * omits the invitation token, so accepting or declining requires the emailed
 * link; this list is for status and context only.
 */
export function listMyInvitations(): Promise<Invitation[]> {
  return authorizedRequest<Invitation[]>('/invitations');
}

/** Public preview. The token in the URL is the invitation secret. */
export function previewInvitation(token: string): Promise<InvitationPreview> {
  return apiRequest<InvitationPreview>(`/invitations/${encodeURIComponent(token)}`);
}

export function acceptInvitation(token: string): Promise<Invitation> {
  return authorizedRequest<Invitation>(`/invitations/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
  });
}

export function declineInvitation(token: string): Promise<Invitation> {
  return authorizedRequest<Invitation>(`/invitations/${encodeURIComponent(token)}/decline`, {
    method: 'POST',
  });
}
