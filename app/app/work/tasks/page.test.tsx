import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkMyTasksPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  listMyTasks: vi.fn(),
  listProjects: vi.fn(),
  push: vi.fn(),
}));

function project(id: string, name: string) {
  return {
    id,
    name,
    key: name.slice(0, 3).toUpperCase(),
    status: 'ACTIVE',
    workspaceId: 'ws-1',
  };
}

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/work/tasks',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: mocks.activeWorkspace,
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/lib/work-tasks', () => ({
  listMyTasks: mocks.listMyTasks,
}));

vi.mock('@/services/projects', () => ({
  listProjects: mocks.listProjects,
}));

describe('WorkMyTasksPage create shortcut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listMyTasks.mockResolvedValue({ items: [] });
    mocks.listProjects.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('links directly to the single available project with the create parameter', async () => {
    mocks.listProjects.mockResolvedValue({ items: [project('project-1', 'Alpha')], nextCursor: null });
    render(<WorkMyTasksPage />);
    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create task' })).toHaveAttribute(
      'href',
      '/app/projects/project-1/tasks?create=1',
    );
  });

  it('offers a project picker when several projects are available', async () => {
    mocks.listProjects.mockResolvedValue({
      items: [project('project-1', 'Alpha'), project('project-2', 'Beta')],
      nextCursor: null,
    });
    const user = userEvent.setup();
    render(<WorkMyTasksPage />);
    await user.click(await screen.findByRole('button', { name: 'Create task' }));

    await user.selectOptions(screen.getByLabelText('Choose a project'), 'project-2');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(mocks.push).toHaveBeenCalledWith('/app/projects/project-2/tasks?create=1');
  });

  it('points to Projects when no projects are available', async () => {
    render(<WorkMyTasksPage />);
    expect(await screen.findByText('No tasks found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Projects' })).toHaveAttribute('href', '/app/projects');
  });

  it('renders the shared status label in a task row', async () => {
    mocks.listMyTasks.mockResolvedValue({
      items: [{
        id: 'task-1',
        key: 'ALP-1',
        title: 'Review requested changes',
        status: 'CHANGES_REQUESTED',
        projectId: 'project-1',
        projectName: 'Alpha',
        dueDate: null,
      }],
    });

    render(<WorkMyTasksPage />);

    expect(await screen.findByText('Review requested changes')).toBeInTheDocument();
    expect(screen.getByText('Changes requested')).toBeInTheDocument();
    expect(screen.queryByText('CHANGES_REQUESTED')).not.toBeInTheDocument();
  });
});
