/**
 * types/workspace.ts
 *
 * Shared workspace, membership, invitation, and join-request types.
 *
 * The string unions mirror the backend enums exposed by the workspace and
 * team modules. They are the only role values the frontend may send back;
 * the backend remains authoritative for every authorisation decision.
 */

export type WorkspaceType = 'INDIVIDUAL' | 'COMPANY' | 'INSTITUTION';
export type WorkspaceVisibility = 'PRIVATE' | 'PUBLIC';
export type WorkspaceStatus = 'ACTIVE' | 'ARCHIVED';

export type WorkspaceRole = 'OWNER' | 'PROJECT_MANAGER' | 'MEMBER' | 'COLLABORATOR' | 'VIEWER';

export type OrganizationRole =
  | 'COMPANY_OWNER'
  | 'COMPANY_ADMIN'
  | 'COMPANY_PROJECT_MANAGER'
  | 'COMPANY_MEMBER'
  | 'COMPANY_COLLABORATOR'
  | 'COMPANY_VIEWER'
  | 'INSTITUTION_OWNER'
  | 'INSTITUTION_ADMIN'
  | 'INSTITUTION_DEPARTMENT_HEAD'
  | 'INSTITUTION_LECTURER_STAFF'
  | 'INSTITUTION_STUDENT'
  | 'INSTITUTION_COLLABORATOR'
  | 'INSTITUTION_VIEWER';

export type MembershipStatus = 'ACTIVE' | 'SUSPENDED';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED' | 'DECLINED';
export type InvitationType = 'WORKSPACE' | 'TEAM' | 'PROJECT';

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
