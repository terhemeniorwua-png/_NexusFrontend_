import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkOverviewPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  user: null as null | { id: string; name: string; email: string },
  listMyTasks: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/work',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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

describe('WorkOverviewPage summary counts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    mocks.listMyTasks.mockResolvedValue({ items: [] });
  });

  it('computes counts from the full task page and omits the Projects placeholder', async () => {
    const statuses = ['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'];
    mocks.listMyTasks.mockResolvedValue({
      items: statuses.map((status, index) => ({ id: `task-${index + 1}`, status })),
    });

    render(<WorkOverviewPage />);

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('Projects')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.listMyTasks).toHaveBeenCalledWith('ws-1', 'user-1', { limit: 100 });
    });
  });
});
