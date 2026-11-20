import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkEnvironmentPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  listMyTasks: vi.fn(),
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/work/environment',
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

describe('WorkEnvironmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listMyTasks.mockResolvedValue({ items: [] });
  });

  it('does not fabricate task progress from comment and subtask counts', async () => {
    mocks.listMyTasks.mockResolvedValue({
      items: [{
        id: 'task-1',
        key: 'ALP-1',
        title: 'Implement feature',
        status: 'IN_PROGRESS',
        projectId: 'project-1',
        projectName: 'Alpha',
        dueDate: null,
        subTaskCount: 4,
        commentCount: 2,
      }],
    });

    render(<WorkEnvironmentPage />);

    expect(await screen.findByText('Implement feature')).toBeInTheDocument();
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.listMyTasks).toHaveBeenCalledWith('ws-1', 'user-1', { limit: 100 });
    });
  });
});
