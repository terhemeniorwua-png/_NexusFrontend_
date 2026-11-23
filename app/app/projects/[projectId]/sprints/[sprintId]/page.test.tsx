import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import SprintDetailPage from './page';

const push = vi.fn();
const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
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
    can: (p: string) => permissions.includes(p),
    canAny: (list: string[]) => list.some((p) => permissions.includes(p)),
    canAll: (list: string[]) => list.every((p) => permissions.includes(p)),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1', sprintId: 'sprint-1' }),
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));
vi.mock('@/services/sprints', () => ({
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
  id: 'sprint-1', projectId: 'project-1', name: 'Sprint Alpha', goal: null,
  startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-11-14T00:00:00.000Z',
  status: 'ACTIVE', createdById: 'user-1', completedAt: null, completedById: null,
  createdAt: '2026-10-31T00:00:00.000Z', updatedAt: '2026-10-31T00:00:00.000Z',
};

const boardTask = (overrides: Record<string, unknown> = {}) => ({
  id: 'task-1', key: 'NX-1', title: 'Implement endpoint', status: 'IN_PROGRESS',
  priority: 'HIGH', sprintId: 'sprint-1', sprintPosition: 0,
  assignees: [{ userId: 'user-1', name: 'Alice' }], dueDate: null, archivedAt: null,
  ...overrides,
});

const board = () => ({
  sprint,
  columns: [
    { status: 'IN_PROGRESS', count: 1, tasks: [boardTask()] },
    { status: 'APPROVED', count: 1, tasks: [boardTask({ id: 'task-2', key: 'NX-2', title: 'Approved work', status: 'APPROVED', sprintPosition: 1 })] },
    { status: 'ASSIGNED', count: 0, tasks: [] },
  ],
  totals: { taskCount: 2, doneCount: 1 },
});

const summary = () => ({
  sprint, scopeReconstructable: true,
  summary: { metric: 'TASK_COUNT', totalTasks: 2, doneTasks: 1, remainingTasks: 1, completionRate: 0.5 },
  generatedAt: '2026-11-10T00:00:00.000Z',
});

const burndown = () => ({
  sprint, scopeReconstructable: true, metric: 'TASK_COUNT',
  startAt: '2026-11-01T00:00:00.000Z', endAt: '2026-11-14T00:00:00.000Z',
  series: [{ date: '2026-11-01', remaining: 2, ideal: 2, scope: 2, completed: 0 }],
  totals: { initialScope: 2, completed: 0, remaining: 2 },
  generatedAt: '2026-11-10T00:00:00.000Z',
});

const MANAGER = ['project.view', 'task.view', 'task.update'];
const VIEWER = ['project.view', 'task.view'];

describe('SprintDetailPage — board and reports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(MANAGER);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getSprintBoard.mockResolvedValue(board());
    mocks.getSprintReportSummary.mockResolvedValue(summary());
    mocks.getSprintReportBurndown.mockResolvedValue(burndown());
    mocks.addTasksToSprint.mockResolvedValue({ sprint, addedTaskIds: ['task-3'] });
    mocks.removeTaskFromSprint.mockResolvedValue({ sprint, taskId: 'task-1' });
    mocks.listTasks.mockResolvedValue({
      items: [
        { id: 'task-1', key: 'NX-1', title: 'Already in sprint', status: 'ASSIGNED', sprintId: 'sprint-1' },
        { id: 'task-3', key: 'NX-3', title: 'Backlog candidate', status: 'ASSIGNED', sprintId: null },
      ],
      nextCursor: null,
    });
  });

  it('renders board columns with counts and task-count progress (View permission)', async () => {
    setPermissions(VIEWER);
    render(<SprintDetailPage />);
    expect(await screen.findByText('Implement endpoint')).toBeInTheDocument();
    expect(screen.getByText('Approved work')).toBeInTheDocument();
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    expect(screen.getByText('Total tasks')).toBeInTheDocument();
    expect(screen.getByText('Done (APPROVED)')).toBeInTheDocument();
    expect(screen.getByText(/Metric: task count \(done = APPROVED\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove from sprint' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign tasks' })).not.toBeInTheDocument();
  });

  it('lets a manager remove a task and never sends sprintPosition', async () => {
    const user = userEvent.setup();
    render(<SprintDetailPage />);
    await screen.findByText('Implement endpoint');
    const removeButtons = screen.getAllByRole('button', { name: 'Remove from sprint' });
    expect(removeButtons).toHaveLength(2);
    await user.click(removeButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Remove "Implement endpoint" from this sprint/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

    await waitFor(() => expect(mocks.removeTaskFromSprint).toHaveBeenCalledWith('ws-1', 'project-1', 'sprint-1', 'task-1'));
    expect(JSON.stringify(mocks.removeTaskFromSprint.mock.calls)).not.toContain('sprintPosition');
  });

  it('assigns tasks using only the existing task list filters and sends taskIds only', async () => {
    const user = userEvent.setup();
    render(<SprintDetailPage />);
    await user.click(await screen.findByRole('button', { name: 'Assign tasks' }));
    const dialog = screen.getByRole('dialog');

    expect(await within(dialog).findByText('Backlog candidate')).toBeInTheDocument();
    expect(within(dialog).queryByText('Already in sprint')).not.toBeInTheDocument();
    expect(mocks.listTasks).toHaveBeenCalledWith('ws-1', 'project-1', expect.objectContaining({ limit: 100 }));

    await user.selectOptions(within(dialog).getByLabelText('Filter by status'), 'IN_PROGRESS');
    expect(mocks.listTasks).toHaveBeenLastCalledWith('ws-1', 'project-1', expect.objectContaining({ status: 'IN_PROGRESS' }));

    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: /Add 1 task/ }));

    await waitFor(() => expect(mocks.addTasksToSprint).toHaveBeenCalledWith('ws-1', 'project-1', 'sprint-1', { taskIds: ['task-3'] }));
    expect(JSON.stringify(mocks.addTasksToSprint.mock.calls)).not.toContain('sprintPosition');
  });

  it('shows the reason and an empty state when scope is not reconstructable', async () => {
    mocks.getSprintReportSummary.mockResolvedValue({
      sprint, scopeReconstructable: false, reason: 'Sprint predates audit trail', summary: null,
      generatedAt: '2026-11-10T00:00:00.000Z',
    });
    mocks.getSprintReportBurndown.mockResolvedValue({
      sprint, scopeReconstructable: false, reason: 'Sprint predates audit trail', series: [],
      generatedAt: '2026-11-10T00:00:00.000Z',
    });

    render(<SprintDetailPage />);
    expect(await screen.findByText(/Sprint scope cannot be reconstructed: Sprint predates audit trail/)).toBeInTheDocument();
    expect(screen.getByText(/Burndown unavailable: Sprint predates audit trail/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Completion rate:')).not.toBeInTheDocument();
    expect(screen.queryByText('Initial scope: 0')).not.toBeInTheDocument();
  });

  it.each([
    [403, 'PERMISSION_DENIED', 'No sprint access'],
    [404, 'SPRINT_NOT_FOUND', 'Sprint not found'],
    [409, 'SPRINTS_DISABLED_FOR_PROJECT', 'Sprints are disabled'],
  ])('shows the backend message on %i (%s)', async (status, code, message) => {
    mocks.getSprintBoard.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintDetailPage />);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
