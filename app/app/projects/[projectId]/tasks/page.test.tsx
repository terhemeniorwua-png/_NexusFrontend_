import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskListPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  listTasks: vi.fn(),
  createTask: vi.fn(),
  archiveTask: vi.fn(),
  restoreTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/app/projects/project-1/tasks',
  useParams: () => ({ projectId: 'project-1' }),
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

vi.mock('@/services/tasks', () => ({
  listTasks: mocks.listTasks,
  createTask: mocks.createTask,
  archiveTask: mocks.archiveTask,
  restoreTask: mocks.restoreTask,
  completeTask: mocks.completeTask,
  reopenTask: mocks.reopenTask,
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
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listTasks.mockResolvedValue({ items: [task1], nextCursor: null });
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
