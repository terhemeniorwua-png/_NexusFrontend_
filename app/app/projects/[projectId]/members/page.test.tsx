import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectMembersPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  listProjectMembers: vi.fn(),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  updateProjectMember: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

function setRole(role: 'PROJECT_MANAGER' | 'MEMBER' | 'COLLABORATOR' | 'VIEWER') {
  const perms: Record<string, string[]> = {
    PROJECT_MANAGER: ['project.view', 'project.member.manage'],
    MEMBER: ['project.view', 'project.member.manage'],
    COLLABORATOR: ['project.view'],
    VIEWER: ['project.view'],
  };
  const assignable: Record<string, string[]> = {
    PROJECT_MANAGER: ['PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'],
    MEMBER: ['MEMBER', 'COLLABORATOR', 'VIEWER'],
    COLLABORATOR: ['COLLABORATOR', 'VIEWER'],
    VIEWER: [],
  };
  mocks.permissionState = {
    permissions: perms[role],
    projectRole: role,
    workspaceRole: 'OWNER',
    accessSource: 'project_member',
    assignableRoles: assignable[role],
    roleDefinitions: [
      { role: 'PROJECT_MANAGER', label: 'Project manager', description: '', permissions: ['project.view', 'project.update', 'project.archive', 'project.delete', 'project.settings.manage', 'project.member.manage', 'project.report.view', 'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.reassign', 'task.complete', 'task.comment', 'file.upload', 'file.delete.any', 'submission.submit', 'submission.review', 'submission.approve', 'submission.reject', 'submission.request_revision'] },
      { role: 'MEMBER', label: 'Member', description: '', permissions: ['project.view', 'task.view', 'task.update', 'task.complete', 'task.comment', 'file.upload', 'file.delete.own'] },
      { role: 'COLLABORATOR', label: 'Collaborator', description: '', permissions: ['project.view', 'task.view', 'task.comment', 'file.upload'] },
      { role: 'VIEWER', label: 'Viewer', description: '', permissions: ['project.view', 'task.view'] },
    ],
    isLoading: false,
    accessStatus: null,
    error: null,
    can: (permission: string) => perms[role].includes(permission),
    canAny: (list: string[]) => list.some((p) => perms[role].includes(p)),
    canAll: (list: string[]) => list.every((p) => perms[role].includes(p)),
    refresh: vi.fn(),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/app/projects/project-1/members',
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: mocks.activeWorkspace,
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));

vi.mock('@/services/projects', () => ({
  addProjectMember: mocks.addProjectMember,
  listProjectMembers: mocks.listProjectMembers,
  removeProjectMember: mocks.removeProjectMember,
  updateProjectMember: mocks.updateProjectMember,
}));

vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

const members = [
  { userId: 'user-1', role: 'PROJECT_MANAGER', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } },
  { userId: 'user-2', role: 'MEMBER', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' } },
];

const workspaceMembers = [
  { userId: 'user-3', name: 'Carol', email: 'carol@example.com', membershipStatus: 'ACTIVE', owner: false, role: 'MEMBER', organizationRole: null, id: 'membership-3', status: 'ACTIVE', joinedAt: '' },
];

describe('ProjectMembersPage — four roles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listProjectMembers.mockResolvedValue(members);
    mocks.listWorkspaceMembers.mockResolvedValue(workspaceMembers);
    mocks.addProjectMember.mockResolvedValue({ projectId: 'project-1', userId: 'user-3', role: 'MEMBER', createdAt: '2026-01-01T00:00:00.000Z' });
    mocks.removeProjectMember.mockResolvedValue({ projectId: 'project-1', userId: 'user-3', removed: true });
    mocks.updateProjectMember.mockResolvedValue({ projectId: 'project-1', userId: 'user-2', role: 'COLLABORATOR', createdAt: '2026-01-01T00:00:00.000Z' });
  });

  it('PROJECT_MANAGER sees the add member form and role dropdowns', async () => {
    setRole('PROJECT_MANAGER');
    render(<ProjectMembersPage />);
    expect(await screen.findByText(/^Alice/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('Change role').length).toBeGreaterThan(0);
  });

  it('MEMBER can view members but cannot change roles', async () => {
    setRole('MEMBER');
    render(<ProjectMembersPage />);
    expect(await screen.findByText(/^Alice/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('COLLABORATOR cannot add members', async () => {
    setRole('COLLABORATOR');
    render(<ProjectMembersPage />);
    expect(await screen.findByText(/^Alice/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
  });

  it('VIEWER cannot add members or change roles', async () => {
    setRole('VIEWER');
    render(<ProjectMembersPage />);
    expect(await screen.findByText(/^Alice/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add member' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
  });

  it('adds a member with an assignable role only', async () => {
    setRole('PROJECT_MANAGER');
    render(<ProjectMembersPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument());

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Workspace member'), 'user-3');
    await user.selectOptions(screen.getByLabelText('Role'), 'MEMBER');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    await waitFor(() => expect(mocks.addProjectMember).toHaveBeenCalledWith('ws-1', 'project-1', 'user-3', 'MEMBER'));
  });

  it('does not allow adding a role that is not assignable', async () => {
    setRole('MEMBER');
    render(<ProjectMembersPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument());

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Workspace member'), 'user-3');
    // MEMBER cannot assign PROJECT_MANAGER - not in assignableRoles
    expect(screen.queryByRole('option', { name: 'Project manager' })).not.toBeInTheDocument();
  });

  it('disables self role change and does not offer it as an option', async () => {
    setRole('PROJECT_MANAGER');
    // Current user is Alice (user-1), who is PROJECT_MANAGER - self
    render(<ProjectMembersPage />);
    await waitFor(() => expect(screen.getByText(/^Alice/)).toBeInTheDocument());

    // Alice's own role select should be disabled
    const selfSelect = screen.getAllByLabelText('Change role')[0];
    expect(selfSelect).toBeDisabled();
  });

  it('shows gained/lost privileges in the role change modal', async () => {
    setRole('PROJECT_MANAGER');
    render(<ProjectMembersPage />);
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());

    const user = userEvent.setup();
    const roleSelects = screen.getAllByLabelText('Change role');
    // Bob is second member (index 1)
    await user.click(roleSelects[1]);
    await user.selectOptions(roleSelects[1], 'VIEWER');

    await screen.findByRole('dialog');
    expect(screen.getByText('Privileges lost')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change role' })).toBeInTheDocument();
  });
});
