import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import SprintsLayout from './layout';
import SprintsPage from './page';
import SprintDetailPage from './[sprintId]/page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
  getProject: vi.fn(),
  listSprints: vi.fn(),
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
  startSprint: vi.fn(),
  completeSprint: vi.fn(),
  restoreSprint: vi.fn(),
  getSprintBoard: vi.fn(),
  getSprintReportSummary: vi.fn(),
  getSprintReportBurndown: vi.fn(),
  addTasksToSprint: vi.fn(),
  removeTaskFromSprint: vi.fn(),
  listTasks: vi.fn(),
}));

function setPermissions(permissions: string[]) {
  mocks.permissionState = {
    permissions,
    isLoading: false,
    accessStatus: null,
    can: (permission: string) => permissions.includes(permission),
    canAny: (list: string[]) => list.some((permission) => permissions.includes(permission)),
    canAll: (list: string[]) => list.every((permission) => permissions.includes(permission)),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1', sprintId: 'sprint-1' }),
  usePathname: () => '/app/projects/project-1/sprints',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
}));
vi.mock('@/services/sprints', () => ({
  listSprints: mocks.listSprints,
  createSprint: mocks.createSprint,
  updateSprint: mocks.updateSprint,
  startSprint: mocks.startSprint,
  completeSprint: mocks.completeSprint,
  restoreSprint: mocks.restoreSprint,
  getSprintBoard: mocks.getSprintBoard,
  getSprintReportSummary: mocks.getSprintReportSummary,
  getSprintReportBurndown: mocks.getSprintReportBurndown,
  addTasksToSprint: mocks.addTasksToSprint,
  removeTaskFromSprint: mocks.removeTaskFromSprint,
}));
vi.mock('@/services/tasks', () => ({
  listTasks: mocks.listTasks,
}));

const sprint = {
  id: 'sprint-1',
  projectId: 'project-1',
  name: 'Sprint Alpha',
  goal: null,
  startDate: '2026-11-01T00:00:00.000Z',
  endDate: '2026-11-14T00:00:00.000Z',
  status: 'ACTIVE',
  createdById: 'user-1',
  completedAt: null,
  completedById: null,
  createdAt: '2026-10-31T00:00:00.000Z',
  updatedAt: '2026-10-31T00:00:00.000Z',
};

describe('SprintsLayout — workflow guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['project.view', 'project.update', 'task.view', 'task.update']);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue({ id: 'project-1', workflowMode: 'SPRINTS' });
    mocks.listSprints.mockResolvedValue({ items: [sprint], nextCursor: null });
    mocks.getSprintBoard.mockResolvedValue({
      sprint,
      columns: [{ status: 'IN_PROGRESS', count: 1, tasks: [{
        id: 'task-1', key: 'NX-1', title: 'Implement endpoint', status: 'IN_PROGRESS',
        priority: 'HIGH', sprintId: 'sprint-1', sprintPosition: 0,
        assignees: [], dueDate: null, archivedAt: null,
      }] }],
      totals: { taskCount: 1, doneCount: 0 },
    });
    mocks.getSprintReportSummary.mockResolvedValue({
      sprint,
      scopeReconstructable: true,
      summary: { metric: 'TASK_COUNT', totalTasks: 1, doneTasks: 0, remainingTasks: 1, completionRate: 0 },
      generatedAt: '2026-11-10T00:00:00.000Z',
    });
    mocks.getSprintReportBurndown.mockResolvedValue({
      sprint,
      scopeReconstructable: true,
      metric: 'TASK_COUNT',
      series: [],
      generatedAt: '2026-11-10T00:00:00.000Z',
    });
    mocks.listTasks.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('renders a loading state and makes no sprint calls while the workflow loads', () => {
    mocks.getProject.mockReturnValue(new Promise(() => {}));
    render(<SprintsLayout><SprintsPage /></SprintsLayout>);

    expect(screen.getByRole('status', { name: 'Loading sprint workflow' })).toBeInTheDocument();
    expect(screen.queryByText('Sprint Alpha')).not.toBeInTheDocument();
    expect(mocks.listSprints).not.toHaveBeenCalled();
  });

  it('fails closed on the list route, makes no sprint calls, and retries to SPRINTS', async () => {
    const user = userEvent.setup();
    mocks.getProject
      .mockRejectedValueOnce(new ApiRequestError('Backend 403 message', 403, 'PERMISSION_DENIED'))
      .mockResolvedValueOnce({ id: 'project-1', workflowMode: 'SPRINTS' });
    render(<SprintsLayout><SprintsPage /></SprintsLayout>);

    expect(await screen.findByText('Backend 403 message')).toBeInTheDocument();
    expect(screen.queryByText('Sprint Alpha')).not.toBeInTheDocument();
    expect(mocks.listSprints).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Sprint Alpha')).toBeInTheDocument();
    expect(mocks.getProject).toHaveBeenCalledTimes(2);
    expect(mocks.listSprints).toHaveBeenCalledWith('ws-1', 'project-1');
  });

  it('maps SPRINTS_DISABLED_FOR_PROJECT and keeps sprint children hidden', async () => {
    mocks.getProject.mockRejectedValueOnce(new ApiRequestError(
      'Stage 2 sprints disabled for this project',
      409,
      'SPRINTS_DISABLED_FOR_PROJECT',
    ));
    render(<SprintsLayout><SprintsPage /></SprintsLayout>);

    expect(await screen.findByText('Sprints are turned off for this project.')).toBeInTheDocument();
    expect(screen.queryByText('Stage 2 sprints disabled for this project')).not.toBeInTheDocument();
    expect(screen.queryByText('Sprint Alpha')).not.toBeInTheDocument();
    expect(mocks.listSprints).not.toHaveBeenCalled();
  });

  it('fails closed on the detail route, makes no sprint calls, and retries to SPRINTS', async () => {
    const user = userEvent.setup();
    mocks.getProject
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce({ id: 'project-1', workflowMode: 'SPRINTS' });
    render(<SprintsLayout><SprintDetailPage /></SprintsLayout>);

    expect(await screen.findByText('Sprint workflow could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByText('Implement endpoint')).not.toBeInTheDocument();
    expect(mocks.getSprintBoard).not.toHaveBeenCalled();
    expect(mocks.getSprintReportSummary).not.toHaveBeenCalled();
    expect(mocks.getSprintReportBurndown).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Implement endpoint')).toBeInTheDocument();
    expect(mocks.getProject).toHaveBeenCalledTimes(2);
    expect(mocks.getSprintBoard).toHaveBeenCalledWith('ws-1', 'project-1', 'sprint-1');
  });

  it('blocks a direct sprints list visit under BACKLOG_ONLY and makes no sprint calls', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', workflowMode: 'BACKLOG_ONLY' });
    render(<SprintsLayout><SprintsPage /></SprintsLayout>);

    expect(await screen.findByText('Sprints are not enabled for this project')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to project' })).toHaveAttribute('href', '/app/projects/project-1');
    expect(mocks.listSprints).not.toHaveBeenCalled();
  });

  it('blocks a direct sprint detail visit under BACKLOG_ONLY and makes no sprint calls', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', workflowMode: 'BACKLOG_ONLY' });
    render(<SprintsLayout><SprintDetailPage /></SprintsLayout>);

    expect(await screen.findByText('Sprints are not enabled for this project')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to project' })).toHaveAttribute('href', '/app/projects/project-1');
    expect(mocks.getSprintBoard).not.toHaveBeenCalled();
    expect(mocks.getSprintReportSummary).not.toHaveBeenCalled();
    expect(mocks.getSprintReportBurndown).not.toHaveBeenCalled();
  });

  it('renders the sprints list normally under SPRINTS', async () => {
    render(<SprintsLayout><SprintsPage /></SprintsLayout>);

    expect(await screen.findByText('Sprint Alpha')).toBeInTheDocument();
    expect(mocks.listSprints).toHaveBeenCalledWith('ws-1', 'project-1');
  });

  it('renders the sprint detail normally under SPRINTS', async () => {
    render(<SprintsLayout><SprintDetailPage /></SprintsLayout>);

    expect(await screen.findByText('Implement endpoint')).toBeInTheDocument();
    expect(mocks.getSprintBoard).toHaveBeenCalledWith('ws-1', 'project-1', 'sprint-1');
  });
});
