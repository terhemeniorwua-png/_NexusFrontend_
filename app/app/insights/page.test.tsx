import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InsightsPage from './page';

const mocks = vi.hoisted(() => ({
  loadDashboardAggregates: vi.fn(),
  buildAnalyticsCsv: vi.fn(() => 'Tasks by status\nStatus,Count\nASSIGNED,1\n'),
  listProjects: vi.fn(),
  activeWorkspace: { id: 'ws-1', name: 'Acme', type: 'COMPANY' as const },
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace }),
}));

vi.mock('@/services/projects', () => ({
  listProjects: mocks.listProjects,
}));

vi.mock('@/services/analytics', () => ({
  loadDashboardAggregates: mocks.loadDashboardAggregates,
  buildAnalyticsCsv: mocks.buildAnalyticsCsv,
}));

function sampleData() {
  return {
    byStatus: { workspaceId: 'ws-1', projectId: null, rangeDays: 30, items: [{ status: 'ASSIGNED', count: 2 }, { status: 'APPROVED', count: 1 }] },
    byAssignee: { workspaceId: 'ws-1', projectId: null, rangeDays: 30, items: [{ assigneeId: 'u1', assigneeName: 'Ada', count: 3 }] },
    throughput: { workspaceId: 'ws-1', projectId: null, rangeDays: 30, created: 5, completed: 2, items: [{ date: '2026-11-01', created: 2, completed: 1 }] },
    workload: { workspaceId: 'ws-1', projectId: null, rangeDays: 30, items: [{ assigneeId: 'u1', assigneeName: 'Ada', openTasks: 3, overdueTasks: 1 }] },
    timeLogged: { workspaceId: 'ws-1', projectId: null, rangeDays: 30, totalMinutes: 120, items: [{ userId: 'u1', userName: 'Ada', minutes: 120 }] },
    errors: [],
  };
}

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Acme', type: 'COMPANY' };
    mocks.listProjects.mockResolvedValue({ items: [{ id: 'p1', name: 'Website', key: 'WEB' }], nextCursor: null });
    mocks.loadDashboardAggregates.mockResolvedValue(sampleData());
  });

  it('renders heading and configurable dashboard widgets', async () => {
    render(<InsightsPage />);

    expect(screen.getByRole('heading', { name: 'Insights', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Tasks by status' })).toBeInTheDocument();
    expect(screen.getByText('Dashboard configuration')).toBeInTheDocument();
    expect(screen.getByText('Widgets')).toBeInTheDocument();
  });

  it('loads aggregate analytics for the active workspace', async () => {
    render(<InsightsPage />);
    await waitFor(() => expect(mocks.loadDashboardAggregates).toHaveBeenCalled());
    expect(mocks.loadDashboardAggregates).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws-1', range: '30d' }),
      expect.objectContaining({ byStatus: true, throughput: true }),
    );
  });

  it('shows widget data from aggregate endpoints', async () => {
    render(<InsightsPage />);
    expect(await screen.findByText(/Created 5 · Completed 2 over 30 days/)).toBeInTheDocument();
    expect(screen.getByText(/Total 2h over 30 days/)).toBeInTheDocument();
  });

  it('reloads when reporting range changes', async () => {
    const user = userEvent.setup();
    render(<InsightsPage />);
    await screen.findByText(/Created 5 · Completed 2 over 30 days/);
    await user.selectOptions(screen.getByLabelText('Reporting range'), '90d');
    await waitFor(() => {
      expect(mocks.loadDashboardAggregates).toHaveBeenLastCalledWith(
        expect.objectContaining({ workspaceId: 'ws-1', range: '90d' }),
        expect.any(Object),
      );
    });
  });

  it('exports analytics CSV', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    render(<InsightsPage />);
    await screen.findByText(/Created 5 · Completed 2 over 30 days/);
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(mocks.buildAnalyticsCsv).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it('shows empty state when no workspace is active', () => {
    mocks.activeWorkspace = null as unknown as typeof mocks.activeWorkspace;
    render(<InsightsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });
});
