import { describe, expect, it } from 'vitest';
import {
  assignableRoleOptions,
  canAssignOrganizationRole,
  canAssignWorkspaceRole,
  canManageMember,
  effectiveWorkspaceRole,
  isOrganizationRole,
  roleLabel,
  workspaceCan,
  workspacePermissionKeys,
} from '../permissions';

const personalOwner = { type: 'INDIVIDUAL' as const, role: 'OWNER', organizationRole: null };
const personalMember = { type: 'INDIVIDUAL' as const, role: 'MEMBER', organizationRole: null };
const companyOwner = { type: 'COMPANY' as const, role: 'OWNER', organizationRole: 'COMPANY_OWNER' as const };
const companyAdmin = { type: 'COMPANY' as const, role: 'MEMBER', organizationRole: 'COMPANY_ADMIN' as const };
const companyMember = { type: 'COMPANY' as const, role: 'MEMBER', organizationRole: 'COMPANY_MEMBER' as const };
const institutionHead = {
  type: 'INSTITUTION' as const,
  role: 'MEMBER',
  organizationRole: 'INSTITUTION_DEPARTMENT_HEAD' as const,
};

describe('effectiveWorkspaceRole', () => {
  it('keeps the shared role when there is no organization role', () => {
    expect(effectiveWorkspaceRole('INDIVIDUAL', 'COLLABORATOR', null)).toBe('COLLABORATOR');
  });

  it('maps organization owners and administrators to the shared tiers', () => {
    expect(effectiveWorkspaceRole('COMPANY', 'MEMBER', 'COMPANY_OWNER')).toBe('OWNER');
    expect(effectiveWorkspaceRole('COMPANY', 'MEMBER', 'COMPANY_ADMIN')).toBe('PROJECT_MANAGER');
    expect(effectiveWorkspaceRole('INSTITUTION', 'MEMBER', 'INSTITUTION_ADMIN')).toBe('PROJECT_MANAGER');
    expect(effectiveWorkspaceRole('INSTITUTION', 'MEMBER', 'INSTITUTION_DEPARTMENT_HEAD')).toBe('COLLABORATOR');
  });

  it('treats an organization role from another workspace type as a viewer', () => {
    expect(effectiveWorkspaceRole('COMPANY', 'MEMBER', 'INSTITUTION_ADMIN')).toBe('VIEWER');
    expect(effectiveWorkspaceRole('INDIVIDUAL', 'OWNER', 'COMPANY_OWNER')).toBe('VIEWER');
  });
});

describe('workspaceCan', () => {
  it('mirrors the backend capability matrix', () => {
    expect(workspaceCan(personalOwner, 'workspace:delete')).toBe(true);
    expect(workspaceCan(personalMember, 'workspace:delete')).toBe(false);
    expect(workspaceCan(personalMember, 'workspace:view')).toBe(true);
    expect(workspaceCan(personalMember, 'member:manage')).toBe(false);
    expect(workspaceCan(companyAdmin, 'member:manage')).toBe(true);
    expect(workspaceCan(companyAdmin, 'workspace:archive')).toBe(false);
    expect(workspaceCan(companyMember, 'invitation:manage')).toBe(false);
    expect(workspaceCan(institutionHead, 'join_request:manage')).toBe(false);
    expect(workspaceCan(null, 'workspace:view')).toBe(false);
  });

  it('returns only the capabilities held by the caller', () => {
    expect(workspacePermissionKeys(personalOwner)).toEqual(expect.arrayContaining([
      'workspace:delete',
      'member:manage',
      'join_request:manage',
    ]));
    expect(workspacePermissionKeys(companyMember)).not.toContain('member:manage');
    expect(workspacePermissionKeys(null)).toEqual([]);
  });
});

describe('member management guards', () => {
  it('never lets anyone manage the owner', () => {
    expect(canManageMember({
      actor: companyOwner,
      targetRole: 'OWNER',
      targetOrganizationRole: 'COMPANY_OWNER',
      targetIsOwner: true,
    })).toBe(false);
  });

  it('only lets the owner manage another project manager or administrator', () => {
    expect(canManageMember({
      actor: companyAdmin,
      targetRole: 'MEMBER',
      targetOrganizationRole: 'COMPANY_ADMIN',
      targetIsOwner: false,
    })).toBe(false);
    expect(canManageMember({
      actor: companyOwner,
      targetRole: 'MEMBER',
      targetOrganizationRole: 'COMPANY_ADMIN',
      targetIsOwner: false,
    })).toBe(true);
    expect(canManageMember({
      actor: personalMember,
      targetRole: 'MEMBER',
      targetOrganizationRole: null,
      targetIsOwner: false,
    })).toBe(false);
  });

  it('applies the project-manager guard only to members without organization roles', () => {
    expect(canManageMember({
      actor: companyAdmin,
      targetRole: 'PROJECT_MANAGER',
      targetOrganizationRole: null,
      targetIsOwner: false,
    })).toBe(false);
    expect(canManageMember({
      actor: companyAdmin,
      targetRole: 'MEMBER',
      targetOrganizationRole: 'COMPANY_PROJECT_MANAGER',
      targetIsOwner: false,
    })).toBe(true);
  });
});

describe('role assignment', () => {
  it('only grants shared project-manager roles from an owner', () => {
    expect(canAssignWorkspaceRole(personalOwner, 'PROJECT_MANAGER')).toBe(true);
    expect(canAssignWorkspaceRole({ ...personalOwner, role: 'PROJECT_MANAGER' }, 'PROJECT_MANAGER')).toBe(false);
    expect(canAssignWorkspaceRole({ ...personalOwner, role: 'PROJECT_MANAGER' }, 'MEMBER')).toBe(true);
    expect(canAssignWorkspaceRole(null, 'MEMBER')).toBe(false);
  });

  it('reserves organization owner roles for owners and rejects foreign roles', () => {
    expect(canAssignOrganizationRole(companyOwner, 'COMPANY_OWNER')).toBe(true);
    expect(canAssignOrganizationRole(companyAdmin, 'COMPANY_OWNER')).toBe(false);
    expect(canAssignOrganizationRole(companyAdmin, 'COMPANY_MEMBER')).toBe(true);
    expect(canAssignOrganizationRole(companyOwner, 'INSTITUTION_ADMIN')).toBe(false);
  });

  it('lists only roles the acting caller may grant', () => {
    expect(assignableRoleOptions(companyAdmin).map((option) => option.value)).not.toContain('COMPANY_OWNER');
    expect(assignableRoleOptions(companyOwner).map((option) => option.value)).toContain('COMPANY_OWNER');
    expect(assignableRoleOptions(personalMember)).toEqual([]);
    expect(assignableRoleOptions(null)).toEqual([]);
  });
});

describe('role labels', () => {
  it('prefers the organization role label', () => {
    expect(roleLabel('MEMBER', 'INSTITUTION_DEPARTMENT_HEAD')).toBe('Department head');
    expect(roleLabel('PROJECT_MANAGER', null)).toBe('Project manager');
    expect(roleLabel('UNKNOWN_ROLE', null)).toBe('unknown role');
  });

  it('recognises only organization role prefixes', () => {
    expect(isOrganizationRole('COMPANY_ADMIN')).toBe(true);
    expect(isOrganizationRole('INSTITUTION_STUDENT')).toBe(true);
    expect(isOrganizationRole('PROJECT_MANAGER')).toBe(false);
  });
});
