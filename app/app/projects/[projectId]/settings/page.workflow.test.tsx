import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
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

function setPermissions(permissions: string[]) {
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
  };
}

const MANAGER_PERMISSIONS = [
  'project.view', 'project.update', 'project.archive', 'project.delete',
  'project.settings.manage', 'project.member.manage', 'task.view',
];
const VIEW_PERMISSIONS = ['project.view', 'task.view'];

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
  PROJECT_TYPES: ['GENERAL', 'ENGINEERING', 'DESIGN', 'OPERATIONS', 'MARKETING', 'HR'],
  PROJECT_TYPE_LABELS: {
    GENERAL: 'General', ENGINEERING: 'Engineering', DESIGN: 'Design',
    OPERATIONS: 'Operations', MARKETING: 'Marketing', HR: 'HR',
  },
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
  id: 'project-1', workspaceId: 'ws-1', name: 'PITERON', key: 'NX', description: null,
  category: null, labels: [], status: 'ACTIVE', type: 'GENERAL', visibility: 'WORKSPACE',
  startDate: null, dueDate: null, ownerId: 'user-1', owner: { id: 'user-1', name: 'Alice' },
  memberCount: 1, taskCount: 0, myRole: 'PROJECT_MANAGER', workflowMode: 'SPRINTS',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
  teamId: null, departmentId: null,
  ...overrides,
});

describe('ProjectSettingsPage — workflow mode toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(MANAGER_PERMISSIONS);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue(makeProject());
    mocks.updateProject.mockResolvedValue(makeProject());
    mocks.listTeams.mockResolvedValue([]);
    mocks.listDepartments.mockResolvedValue([]);
    mocks.listWorkspaceMembers.mockResolvedValue([]);
  });

  it('lets a manager switch from SPRINTS to BACKLOG_ONLY', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const select = await screen.findByLabelText('Project workflow mode');

    await user.selectOptions(select, 'BACKLOG_ONLY');

    await waitFor(() =>
      expect(mocks.updateProject).toHaveBeenCalledWith('ws-1', 'project-1', { workflowMode: 'BACKLOG_ONLY' }),
    );
    expect(await screen.findByText('Workflow mode updated.')).toBeInTheDocument();
  });

  it('hides the workflow toggle from a view-only member', async () => {
    setPermissions(VIEW_PERMISSIONS);
    render(<SettingsPage />);
    expect(await screen.findByText(/Project settings are limited to project managers/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Project workflow mode')).not.toBeInTheDocument();
  });

  it('shows the 409 confirmation dialog with openTaskCount and resends with confirmation', async () => {
    const user = userEvent.setup();
    mocks.getProject.mockResolvedValue(makeProject({ workflowMode: 'SPRINTS' }));
    mocks.updateProject
      .mockRejectedValueOnce(new ApiRequestError('Active sprint must be completed first', 409, 'ACTIVE_SPRINT_EXISTS', { sprintId: 'sprint-1', openTaskCount: 7 }))
      .mockResolvedValueOnce(makeProject({ workflowMode: 'BACKLOG_ONLY' }));

    render(<SettingsPage />);
    const select = await screen.findByLabelText('Project workflow mode');
    await user.selectOptions(select, 'BACKLOG_ONLY');

    expect(await screen.findByText(/7 unfinished tasks/)).toBeInTheDocument();
    expect(screen.getByText(/Active sprint must be completed first/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() =>
      expect(mocks.updateProject).toHaveBeenLastCalledWith('ws-1', 'project-1', {
        workflowMode: 'BACKLOG_ONLY', confirmActiveSprintCompletion: true,
      }),
    );
  });

  it('shows the backend message on a 403 workflow change error', async () => {
    const user = userEvent.setup();
    mocks.updateProject.mockRejectedValueOnce(new ApiRequestError('Managers only', 403, 'PERMISSION_DENIED'));
    render(<SettingsPage />);
    const select = await screen.findByLabelText('Project workflow mode');
    await user.selectOptions(select, 'BACKLOG_ONLY');
    expect(await screen.findByText('Managers only')).toBeInTheDocument();
  });

  it('shows the backend message on a 404 workflow change error', async () => {
    const user = userEvent.setup();
    mocks.updateProject.mockRejectedValueOnce(new ApiRequestError('Project not found', 404, 'PROJECT_NOT_FOUND'));
    render(<SettingsPage />);
    const select = await screen.findByLabelText('Project workflow mode');
    await user.selectOptions(select, 'BACKLOG_ONLY');
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });
});
