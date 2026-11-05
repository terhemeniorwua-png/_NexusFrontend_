/**
 * lib/permissions.ts
 *
 * Presentation-only mirrors of the backend workspace role matrix.
 *
 * The backend evaluates every request against the membership stored in the
 * database (`src/modules/authorization/workspace.policy.ts`). This module
 * exists so the interface can hide or disable actions the caller cannot
 * perform, and label roles consistently. It is never an authorisation
 * boundary: a hidden control is still rejected by the backend if requested.
 *
 * Keep the matrix below in sync with the backend when the policy changes.
 */

import type {
  OrganizationRole,
  WorkspaceRole,
  WorkspaceType,
} from '@/types/workspace';

export const WORKSPACE_CAPABILITIES = [
  'workspace:view',
  'workspace:update',
  'workspace:archive',
  'workspace:delete',
  'workspace:transfer_ownership',
  'member:view',
  'member:manage',
  'invitation:view',
  'invitation:manage',
  'join_request:view',
  'join_request:manage',
] as const;

export type WorkspaceCapability = (typeof WORKSPACE_CAPABILITIES)[number];

const CAPABILITY_ROLES: Record<WorkspaceCapability, readonly WorkspaceRole[]> = {
  'workspace:view': ['OWNER', 'PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'],
  'workspace:update': ['OWNER', 'PROJECT_MANAGER'],
  'workspace:archive': ['OWNER'],
  'workspace:delete': ['OWNER'],
  'workspace:transfer_ownership': ['OWNER'],
  'member:view': ['OWNER', 'PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'],
  'member:manage': ['OWNER', 'PROJECT_MANAGER'],
  'invitation:view': ['OWNER', 'PROJECT_MANAGER'],
  'invitation:manage': ['OWNER', 'PROJECT_MANAGER'],
  'join_request:view': ['OWNER', 'PROJECT_MANAGER'],
  'join_request:manage': ['OWNER', 'PROJECT_MANAGER'],
};

export interface WorkspaceAccessShape {
  type: WorkspaceType;
  role: WorkspaceRole | string;
  organizationRole: OrganizationRole | null;
}

const COMPANY_ROLES: readonly OrganizationRole[] = [
  'COMPANY_OWNER',
  'COMPANY_ADMIN',
  'COMPANY_PROJECT_MANAGER',
  'COMPANY_MEMBER',
  'COMPANY_COLLABORATOR',
  'COMPANY_VIEWER',
];

const INSTITUTION_ROLES: readonly OrganizationRole[] = [
  'INSTITUTION_OWNER',
  'INSTITUTION_ADMIN',
  'INSTITUTION_DEPARTMENT_HEAD',
  'INSTITUTION_LECTURER_STAFF',
  'INSTITUTION_STUDENT',
  'INSTITUTION_COLLABORATOR',
  'INSTITUTION_VIEWER',
];

function isWorkspaceRole(value: string): value is WorkspaceRole {
  return value === 'OWNER'
    || value === 'PROJECT_MANAGER'
    || value === 'MEMBER'
    || value === 'COLLABORATOR'
    || value === 'VIEWER';
}

/**
 * Mirrors the backend's organization-role → shared workspace tier mapping.
 * An organization role that does not belong to the workspace type grants the
 * lowest tier, exactly as the backend treats the mismatch.
 */
export function effectiveWorkspaceRole(
  workspaceType: WorkspaceType,
  role: string,
  organizationRole: OrganizationRole | null,
): WorkspaceRole {
  const fallback: WorkspaceRole = isWorkspaceRole(role) ? role : 'VIEWER';
  if (!organizationRole) return fallback;

  const valid = workspaceType === 'COMPANY'
    ? COMPANY_ROLES.includes(organizationRole)
    : workspaceType === 'INSTITUTION'
      ? INSTITUTION_ROLES.includes(organizationRole)
      : false;
  if (!valid) return 'VIEWER';

  switch (organizationRole) {
    case 'COMPANY_OWNER':
    case 'INSTITUTION_OWNER':
      return 'OWNER';
    case 'COMPANY_ADMIN':
    case 'INSTITUTION_ADMIN':
      return 'PROJECT_MANAGER';
    default:
      return organizationRole.endsWith('VIEWER') ? 'VIEWER' : 'COLLABORATOR';
  }
}

export function workspaceCan(
  workspace: WorkspaceAccessShape | null | undefined,
  capability: WorkspaceCapability,
): boolean {
  if (!workspace) return false;
  const role = effectiveWorkspaceRole(workspace.type, workspace.role, workspace.organizationRole);
  return CAPABILITY_ROLES[capability].includes(role);
}

/** Capability keys suitable for the shell's navigation filter. */
export function workspacePermissionKeys(workspace: WorkspaceAccessShape | null | undefined): string[] {
  if (!workspace) return [];
  return WORKSPACE_CAPABILITIES.filter((capability) => workspaceCan(workspace, capability));
}

/**
 * Mirrors `assertMayManageMember` and `assertMayManageOrganizationMember`:
 * the owner cannot be managed, and only an owner may manage another
 * project manager or organization owner/administrator.
 */
export function canManageMember(input: {
  actor: WorkspaceAccessShape | null | undefined;
  targetRole: string;
  targetOrganizationRole: OrganizationRole | null;
  targetIsOwner: boolean;
}): boolean {
  const { actor, targetRole, targetOrganizationRole, targetIsOwner } = input;
  if (!actor || targetIsOwner) return false;

  const actorRole = effectiveWorkspaceRole(actor.type, actor.role, actor.organizationRole);
  const actorIsOwner = actorRole === 'OWNER';
  const actorCanManage = actorRole === 'OWNER' || actorRole === 'PROJECT_MANAGER';
  if (!actorCanManage) return false;

  const targetIsAdmin = targetOrganizationRole === 'COMPANY_ADMIN'
    || targetOrganizationRole === 'INSTITUTION_ADMIN';
  const targetIsOrgOwner = targetOrganizationRole === 'COMPANY_OWNER'
    || targetOrganizationRole === 'INSTITUTION_OWNER';
  if (targetIsAdmin || targetIsOrgOwner) return actorIsOwner;

  if (!targetOrganizationRole) {
    const targetEffective = isWorkspaceRole(targetRole) ? targetRole : 'VIEWER';
    if (!actorIsOwner && targetEffective === 'PROJECT_MANAGER') return false;
  }

  return true;
}

/** Mirrors `assertMayAssignRole` for the shared workspace role tier. */
export function canAssignWorkspaceRole(
  actor: WorkspaceAccessShape | null | undefined,
  requestedRole: WorkspaceRole,
): boolean {
  const actorRole = actor
    ? effectiveWorkspaceRole(actor.type, actor.role, actor.organizationRole)
    : 'VIEWER';
  if (actorRole !== 'OWNER' && actorRole !== 'PROJECT_MANAGER') return false;
  return actorRole === 'OWNER' || requestedRole !== 'PROJECT_MANAGER';
}

/** Mirrors `assertCanAssignOrganizationRole`. */
export function canAssignOrganizationRole(
  actor: WorkspaceAccessShape | null | undefined,
  requestedRole: OrganizationRole,
): boolean {
  if (!actor) return false;
  const allowed = actor.type === 'COMPANY'
    ? COMPANY_ROLES
    : actor.type === 'INSTITUTION'
      ? INSTITUTION_ROLES
      : [];
  if (!allowed.includes(requestedRole)) return false;

  const actorRole = effectiveWorkspaceRole(actor.type, actor.role, actor.organizationRole);
  const actorIsOwner = actorRole === 'OWNER';
  const actorIsAdmin = actorRole === 'PROJECT_MANAGER';
  const requestedIsOwner = requestedRole === 'COMPANY_OWNER' || requestedRole === 'INSTITUTION_OWNER';

  if (requestedIsOwner) return actorIsOwner;
  return actorIsOwner || actorIsAdmin;
}

const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Owner',
  PROJECT_MANAGER: 'Project manager',
  MEMBER: 'Member',
  COLLABORATOR: 'Collaborator',
  VIEWER: 'Viewer',
};

const ORGANIZATION_ROLE_LABELS: Record<OrganizationRole, string> = {
  COMPANY_OWNER: 'Owner',
  COMPANY_ADMIN: 'Administrator',
  COMPANY_PROJECT_MANAGER: 'Project manager',
  COMPANY_MEMBER: 'Member',
  COMPANY_COLLABORATOR: 'Collaborator',
  COMPANY_VIEWER: 'Viewer',
  INSTITUTION_OWNER: 'Owner',
  INSTITUTION_ADMIN: 'Institution administrator',
  INSTITUTION_DEPARTMENT_HEAD: 'Department head',
  INSTITUTION_LECTURER_STAFF: 'Lecturer / staff',
  INSTITUTION_STUDENT: 'Student',
  INSTITUTION_COLLABORATOR: 'Collaborator',
  INSTITUTION_VIEWER: 'Viewer',
};

export function roleLabel(role: string, organizationRole: OrganizationRole | null): string {
  if (organizationRole) return ORGANIZATION_ROLE_LABELS[organizationRole];
  if (isWorkspaceRole(role)) return WORKSPACE_ROLE_LABELS[role];
  return role.replaceAll('_', ' ').toLowerCase();
}

export function isOrganizationRole(value: string): value is OrganizationRole {
  return value.startsWith('COMPANY_') || value.startsWith('INSTITUTION_');
}

export interface RoleOption {
  value: OrganizationRole | WorkspaceRole;
  label: string;
}

/**
 * Roles the acting caller may grant in this workspace. Organization
 * workspaces use organization roles; personal workspaces keep the shared
 * workspace roles because the backend has no organization role for them.
 */
export function assignableRoleOptions(actor: WorkspaceAccessShape | null | undefined): RoleOption[] {
  if (!actor) return [];
  const role = effectiveWorkspaceRole(actor.type, actor.role, actor.organizationRole);

  if (actor.type === 'COMPANY') {
    const candidates: OrganizationRole[] = [
      'COMPANY_ADMIN',
      'COMPANY_PROJECT_MANAGER',
      'COMPANY_MEMBER',
      'COMPANY_COLLABORATOR',
      'COMPANY_VIEWER',
      'COMPANY_OWNER',
    ];
    return candidates
      .filter((candidate) => canAssignOrganizationRole(actor, candidate))
      .map((candidate) => ({ value: candidate, label: ORGANIZATION_ROLE_LABELS[candidate] }));
  }

  if (actor.type === 'INSTITUTION') {
    const candidates: OrganizationRole[] = [
      'INSTITUTION_ADMIN',
      'INSTITUTION_DEPARTMENT_HEAD',
      'INSTITUTION_LECTURER_STAFF',
      'INSTITUTION_STUDENT',
      'INSTITUTION_COLLABORATOR',
      'INSTITUTION_VIEWER',
      'INSTITUTION_OWNER',
    ];
    return candidates
      .filter((candidate) => canAssignOrganizationRole(actor, candidate))
      .map((candidate) => ({ value: candidate, label: ORGANIZATION_ROLE_LABELS[candidate] }));
  }

  if (role !== 'OWNER' && role !== 'PROJECT_MANAGER') return [];
  const shared: WorkspaceRole[] = ['PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'];
  return shared
    .filter((candidate) => canAssignWorkspaceRole(actor, candidate))
    .map((candidate) => ({ value: candidate, label: WORKSPACE_ROLE_LABELS[candidate] }));
}
