import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskListPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  listTasks: vi.fn(),
  createTask: vi.fn(),
  archiveTask: vi.fn(),
  restoreTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  deleteTask: vi.fn(),
  addAssignee: vi.fn(),
  removeAssignee: vi.fn(),
  listProjectMembers: vi.fn(),
  replace: vi.fn(),
  createParam: null as string | null,
}));

function setPermissions(permissions: string[], overrides: Record<string, unknown> = {}) {
  mocks.permissionState = {
    permissions,
    projectRole: 'PROJECT_MANAGER',
    workspaceRole: 'OWNER',
    accessSource: 'workspace_admin',
    assignableRoles: ['PROJECT_MANAGER', 'MEMBER', 'COLLABORATOR', 'VIEWER'],
    roleDefinitions: [
      { role: 'PROJECT_MANAGER', label: 'Project Manager', description: '', permissions: ['task.view', 'task.update', 'task.assign', 'submission.review', 'submission.approve'] },
      { role: 'MEMBER', label: 'Member', description: '', permissions: ['task.view', 'task.create', 'task.update'] },
      { role: 'VIEWER', label: 'Viewer', description: '', permissions: ['task.view'] },
    ],
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

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/app/projects/project-1/tasks',
  useParams: () => ({ projectId: 'project-1' }),
  useSearchParams: () => new URLSearchParams(mocks.createParam ? `create=${mocks.createParam}` : ''),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: mocks.activeWorkspace,
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/hooks/useWorkspaceRedirect', () => ({
  useWorkspaceRedirect: () => mocks.activeWorkspace?.id ?? null,
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));

vi.mock('@/services/tasks', () => ({
  listTasks: mocks.listTasks,
  createTask: mocks.createTask,
  archiveTask: mocks.archiveTask,
  restoreTask: mocks.restoreTask,
  completeTask: mocks.completeTask,
  reopenTask: mocks.reopenTask,
  deleteTask: mocks.deleteTask,
  addAssignee: mocks.addAssignee,
  removeAssignee: mocks.removeAssignee,
}));

vi.mock('@/services/projects', () => ({
  listProjectMembers: mocks.listProjectMembers,
}));

const task1 = {
  id: 'task-1', projectId: 'project-1', key: 'NX-1', title: 'Fix authentication bug',
  description: null, status: 'ASSIGNED', priority: 'HIGH', category: null, labels: [],
  startDate: null, dueDate: '2026-12-31T00:00:00.000Z', position: 0, parentTaskId: null,
  creatorId: 'user-1', creator: { id: 'user-1', name: 'Alice' },
  assignees: [{ userId: 'user-1', user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' }, assignedBy: 'user-1', createdAt: '2026-01-01T00:00:00.000Z' }],
  dependencies: [], blockers: [],
  subTaskCount: 0, commentCount: 2, attachmentCount: 0,
  archivedAt: null, completedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createParam = null;
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listTasks.mockResolvedValue({ items: [task1], nextCursor: null });
    mocks.listProjectMembers.mockResolvedValue([]);
    setPermissions([
      'project.view',
      'task.view',
      'task.create',
      'task.update',
      'task.delete',
      'task.assign',
      'task.reassign',
      'task.complete',
    ]);
  });

  it('shows tasks loaded from the API', async () => {
    render(<TaskListPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByText('NX-1')).toBeInTheDocument();
  });

  it('shows empty state when there are no tasks', async () => {
    mocks.listTasks.mockResolvedValue({ items: [], nextCursor: null });
    render(<TaskListPage />);
    await waitFor(() => expect(screen.getByText(/no tasks/i)).toBeInTheDocument());
  });

  it('shows AccessState on 401 load failure', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listTasks.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<TaskListPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows AccessState on 403 load failure', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listTasks.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<TaskListPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });

  it('shows the create task modal on button click', async () => {
    const user = userEvent.setup();
    render(<TaskListPage />);
    const btn = await screen.findByRole('button', { name: /new task/i });
    await user.click(btn);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/new task/i);
  });

  it('lists only eligible reviewers and sends reviewerId when creating a task', async () => {
    mocks.listProjectMembers.mockResolvedValue([
      { userId: 'user-2', role: 'PROJECT_MANAGER', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' } },
      { userId: 'user-3', role: 'MEMBER', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'user-3', name: 'Carol', email: 'carol@example.com' } },
    ]);
    const user = userEvent.setup();
    render(<TaskListPage />);
    await user.click(await screen.findByRole('button', { name: /new task/i }));

    const picker = await screen.findByLabelText('Reviewer (optional)');
    expect(within(picker).getByRole('option', { name: 'No reviewer' })).toBeInTheDocument();
    expect(within(picker).getByRole('option', { name: 'Bob' })).toBeInTheDocument();
    expect(within(picker).queryByRole('option', { name: 'Carol' })).not.toBeInTheDocument();

    await user.selectOptions(picker, 'user-2');
    await user.type(screen.getByLabelText(/^Title/), 'Reviewer task');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(mocks.createTask).toHaveBeenCalledWith('ws-1', 'project-1', expect.objectContaining({ title: 'Reviewer task', reviewerId: 'user-2' })));
  });

  it('hides the reviewer picker from users without task.assign', async () => {
    setPermissions(['project.view', 'task.view', 'task.create', 'task.update']);
    const user = userEvent.setup();
    render(<TaskListPage />);
    await user.click(await screen.findByRole('button', { name: /new task/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText('Reviewer (optional)')).not.toBeInTheDocument();
  });

  it('shows the backend error when a reviewer is rejected on create', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listProjectMembers.mockResolvedValue([
      { userId: 'user-2', role: 'PROJECT_MANAGER', createdAt: '2026-01-01T00:00:00.000Z', user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' } },
    ]);
    mocks.createTask.mockRejectedValue(new ApiRequestError('The selected reviewer is not eligible', 403, 'REVIEWER_NOT_ELIGIBLE'));
    const user = userEvent.setup();
    render(<TaskListPage />);
    await user.click(await screen.findByRole('button', { name: /new task/i }));
    await user.selectOptions(await screen.findByLabelText('Reviewer (optional)'), 'user-2');
    await user.type(screen.getByLabelText(/^Title/), 'Bad reviewer task');
    await user.click(screen.getByRole('button', { name: 'Create task' }));

    expect(await screen.findByText(/not eligible/i)).toBeInTheDocument();
  });

  it('opens the create modal from ?create=1 once and removes the parameter', async () => {
    mocks.createParam = '1';
    render(<TaskListPage />);
    expect(await screen.findAllByRole('dialog')).toHaveLength(1);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/app/projects/project-1/tasks'));
  });

  it('shows Load more button when nextCursor is present', async () => {
    mocks.listTasks.mockResolvedValue({ items: [task1], nextCursor: 'cursor-abc' });
    render(<TaskListPage />);
    expect(await screen.findByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('switches to List view when List tab is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskListPage />);
    // View tabs have role="tab" and lowercase text
    const listTab = await screen.findByRole('tab', { name: 'list' });
    await user.click(listTab);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
  });

  it('clears tasks when workspace changes', async () => {
    mocks.listTasks.mockResolvedValueOnce({ items: [task1], nextCursor: null })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const view = render(<TaskListPage />);
    expect(await screen.findByText('Fix authentication bug')).toBeInTheDocument();
    mocks.activeWorkspace = { id: 'ws-2', name: 'Other', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    view.rerender(<TaskListPage />);
    await waitFor(() => expect(screen.queryByText('Fix authentication bug')).not.toBeInTheDocument());
  });
});
