import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
  getProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProjectOrganizationAccess: vi.fn(),
  transferProjectOwnership: vi.fn(),
  listDepartments: vi.fn(),
  listTeams: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

function setPermissions(permissions: string[], overrides: Record<string, unknown> = {}) {
  mocks.permissionState = {
    permissions,
    projectRole: 'PROJECT_MANAGER',
    workspaceRole: 'OWNER',
    accessSource: 'workspace_admin',
    assignableRoles: [],
    roleDefinitions: [],
    isLoading: false,
    accessStatus: null,
    error: null,
    can: (permission: string) => permissions.includes(permission),
    canAny: (list: string[]) => list.some((permission) => permissions.includes(permission)),
    canAll: (list: string[]) => list.every((permission) => permissions.includes(permission)),
    refresh: vi.fn(),
    ...overrides,
  };
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/app/projects/project-1/settings',
  useParams: () => ({ projectId: 'project-1' }),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));
vi.mock('@/services/projects', () => ({
  getProject: mocks.getProject,
  updateProject: mocks.updateProject,
  archiveProject: mocks.archiveProject,
  restoreProject: mocks.restoreProject,
  deleteProject: mocks.deleteProject,
  updateProjectOrganizationAccess: mocks.updateProjectOrganizationAccess,
  transferProjectOwnership: mocks.transferProjectOwnership,
}));
vi.mock('@/services/organization-structure', () => ({
  listDepartments: mocks.listDepartments,
  listTeams: mocks.listTeams,
}));
vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

const makeProject = (overrides: Record<string, unknown> = {}) => ({
  id: 'project-1', workspaceId: 'ws-1', name: 'Nexus', key: 'NX', description: null,
  category: null, labels: [], status: 'ACTIVE', visibility: 'DEPARTMENT_TEAM',
  startDate: null, dueDate: null, ownerId: 'user-1', owner: { id: 'user-1', name: 'Alice' },
  memberCount: 1, taskCount: 0, myRole: 'PROJECT_MANAGER',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  teamId: null, departmentId: null,
  ...overrides,
});

describe('ProjectSettingsPage — organizational access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions([
      'project.view',
      'project.update',
      'project.archive',
      'project.delete',
      'project.settings.manage',
      'project.member.manage',
      'task.view',
    ]);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue(makeProject());
    mocks.listTeams.mockResolvedValue([{ id: 'team-1', name: 'Engineering', workspaceId: 'ws-1', description: null, departmentId: null, status: 'ACTIVE', leadId: null, lead: null, memberCount: 3, createdAt: '', updatedAt: '' }]);
    mocks.listDepartments.mockResolvedValue([]);
    mocks.listWorkspaceMembers.mockResolvedValue([]);
    mocks.updateProjectOrganizationAccess.mockResolvedValue({ id: 'project-1', workspaceId: 'ws-1', teamId: 'team-1', departmentId: null });
  });

  it('shows organizational access section when visibility is DEPARTMENT_TEAM', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText('Organizational access')).toBeInTheDocument();
    expect(screen.getByLabelText('Team')).toBeInTheDocument();
  });

  it('calls updateProjectOrganizationAccess with selected team', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await screen.findByText('Organizational access');

    const teamSelect = screen.getByLabelText('Team');
    await user.selectOptions(teamSelect, 'team-1');
    await user.click(screen.getByRole('button', { name: 'Save organizational access' }));

    await waitFor(() =>
      expect(mocks.updateProjectOrganizationAccess).toHaveBeenCalledWith(
        'ws-1', 'project-1', { teamId: 'team-1', departmentId: null },
      ),
    );
    expect(await screen.findByText('Organizational access updated.')).toBeInTheDocument();
  });

  it('does not show organizational access section when visibility is WORKSPACE', async () => {
    mocks.getProject.mockResolvedValue(makeProject({ visibility: 'WORKSPACE' }));
    render(<SettingsPage />);
    await screen.findByText('Project settings');
    expect(screen.queryByText('Organizational access')).not.toBeInTheDocument();
  });
});

describe('ProjectSettingsPage — ownership transfer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions([
      'project.view',
      'project.update',
      'project.archive',
      'project.delete',
      'project.settings.manage',
      'project.member.manage',
      'task.view',
    ]);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue(makeProject({ visibility: 'WORKSPACE' }));
    mocks.listTeams.mockResolvedValue([]);
    mocks.listDepartments.mockResolvedValue([]);
    mocks.listWorkspaceMembers.mockResolvedValue([
      { userId: 'user-2', name: 'Bob', email: 'bob@example.com', membershipStatus: 'ACTIVE', owner: false, role: 'MEMBER', organizationRole: null, id: 'membership-2', status: 'ACTIVE', joinedAt: '' },
    ]);
    mocks.transferProjectOwnership.mockResolvedValue({ projectId: 'project-1', previousOwnerId: 'user-1', ownerId: 'user-2', ownerRole: 'PROJECT_MANAGER', previousOwnerRole: 'MANAGER', previousOwnerResultingRole: 'PROJECT_MANAGER', forcedAdminTransfer: false, updatedAt: '' });
  });

  it('shows the ownership transfer section when workspace members are available', async () => {
    render(<SettingsPage />);
    expect(await screen.findByRole('heading', { name: 'Transfer ownership' })).toBeInTheDocument();
  });

  it('opens confirmation dialog before transferring', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await screen.findByRole('heading', { name: 'Transfer ownership' });

    await user.selectOptions(screen.getByLabelText('New owner'), 'user-2');
    await user.click(screen.getByRole('button', { name: 'Transfer ownership' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Transfer project ownership?');
    expect(dialog).toHaveTextContent('Bob');
  });

  it('calls transferProjectOwnership after confirmation', async () => {
    const user = userEvent.setup();
    mocks.getProject.mockResolvedValue(makeProject({ visibility: 'WORKSPACE' }));
    render(<SettingsPage />);
    await screen.findByRole('heading', { name: 'Transfer ownership' });

    await user.selectOptions(screen.getByLabelText('New owner'), 'user-2');
    // Click the section button (the danger one outside dialog)
    const transferButtons = screen.getAllByRole('button', { name: 'Transfer ownership' });
    await user.click(transferButtons[0]);
    // Now dialog is open — click confirm
    const dialogTransferBtn = screen.getAllByRole('button', { name: 'Transfer ownership' }).find(
      (btn) => btn.closest('[role="dialog"]'),
    );
    if (dialogTransferBtn) await user.click(dialogTransferBtn);

    await waitFor(() =>
      expect(mocks.transferProjectOwnership).toHaveBeenCalledWith(
        'ws-1', 'project-1', { newOwnerId: 'user-2' },
      ),
    );
  });

  it('shows a 401 access state when loading fails with unauthorized', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.getProject.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<SettingsPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });
});
