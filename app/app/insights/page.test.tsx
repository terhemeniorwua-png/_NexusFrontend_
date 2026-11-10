/**
 * app/app/insights/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InsightsPage from './page';
import type { WorkspaceInsights } from '@/services/insights';

const mocks = vi.hoisted(() => ({
  loadWorkspaceInsights: vi.fn(),
  buildProjectCsv: vi.fn(() => 'Project,Key\nWebsite,WEB'),
  activeWorkspace: { id: 'ws-1', name: 'Acme', type: 'COMPANY' as const },
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace }),
}));

vi.mock('@/services/files', () => ({
  formatBytes: (bytes: number) => `${bytes} B`,
}));

vi.mock('@/services/insights', () => ({
  loadWorkspaceInsights: mocks.loadWorkspaceInsights,
  buildProjectCsv: mocks.buildProjectCsv,
}));

function snapshot(overrides: Partial<WorkspaceInsights> = {}): WorkspaceInsights {
  return {
    range: '30d',
    rangeStart: '2026-10-10T12:00:00.000Z',
    generatedAt: new Date().toISOString(),
    projects: {
      total: 2,
      active: 1,
      completed: 1,
      overdue: 1,
      byStatus: [
        { key: 'PLANNING', count: 0 },
        { key: 'ACTIVE', count: 1 },
        { key: 'ON_HOLD', count: 0 },
        { key: 'COMPLETED', count: 1 },
        { key: 'ARCHIVED', count: 0 },
      ],
      byVisibility: [
        { key: 'PRIVATE', count: 1 },
        { key: 'DEPARTMENT_TEAM', count: 0 },
        { key: 'WORKSPACE', count: 1 },
      ],
      items: [
        {
          id: 'project-1',
          name: 'Website redesign',
          key: 'WEB',
          status: 'ACTIVE',
          visibility: 'WORKSPACE',
          memberCount: 4,
          taskCount: 10,
          dueDate: '2026-12-01T00:00:00.000Z',
          overdue: false,
          updatedAt: '2026-11-08T00:00:00.000Z',
        },
        {
          id: 'project-2',
          name: 'Mobile app',
          key: 'MOB',
          status: 'COMPLETED',
          visibility: 'PRIVATE',
          memberCount: 2,
          taskCount: 5,
          dueDate: '2026-10-01T00:00:00.000Z',
          overdue: true,
          updatedAt: '2026-11-07T00:00:00.000Z',
        },
      ],
      truncated: false,
    },
    tasks: {
      totalAcrossProjects: 15,
      sampledProjects: 1,
      sampledTasks: 3,
      completedInRange: 1,
      overdue: 1,
      byStatus: [
        { key: 'ASSIGNED', count: 1 },
        { key: 'IN_PROGRESS', count: 1 },
        { key: 'SUBMITTED', count: 0 },
        { key: 'UNDER_REVIEW', count: 0 },
        { key: 'APPROVED', count: 1 },
        { key: 'CHANGES_REQUESTED', count: 0 },
      ],
      byPriority: [
        { key: 'LOW', count: 1 },
        { key: 'MEDIUM', count: 0 },
        { key: 'HIGH', count: 1 },
        { key: 'URGENT', count: 1 },
      ],
      perProject: [
        { projectId: 'project-1', sampled: 3, completed: 1, overdue: 1 },
      ],
      truncated: false,
    },
    members: {
      total: 3,
      active: 2,
      suspended: 1,
      byRole: [{ role: 'COMPANY_MEMBER', count: 3 }],
    },
    activity: {
      totalInRange: 2,
      byAction: [{ action: 'PROJECT_CREATED', count: 2 }],
      recent: [
        {
          id: 'a-1',
          action: 'PROJECT_CREATED',
          actorId: 'user-1',
          targetType: 'PROJECT',
          targetId: 'project-1',
          metadata: null,
          createdAt: '2026-11-08T00:00:00.000Z',
        },
      ],
      truncated: false,
    },
    storage: { totalBytes: 2048, fileCount: 4 },
    billing: {
      subscription: {
        id: 'sub-1',
        plan: 'BUSINESS',
        interval: 'MONTHLY',
        currency: 'USD',
        status: 'ACTIVE',
        billableSeats: 3,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        pendingChange: null,
      },
      activeBillableSeats: 3,
      includedSeats: 5,
      additionalSeats: 0,
      nextRenewalAt: '2026-12-01T00:00:00.000Z',
    },
    warnings: [],
    ...overrides,
  };
}

describe('InsightsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Acme', type: 'COMPANY' };
    mocks.loadWorkspaceInsights.mockResolvedValue(snapshot());
  });

  it('renders the heading and summary cards', async () => {
    render(<InsightsPage />);

    expect(screen.getByRole('heading', { name: 'Insights', level: 1 })).toBeInTheDocument();
    expect(await screen.findByText('Website redesign')).toBeInTheDocument();
    expect(screen.getByText('2048 B')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('2 active · 1 suspended')).toBeInTheDocument();
  });

  it('renders project sample progress and overdue markers', async () => {
    render(<InsightsPage />);

    expect(await screen.findByText('1/3')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
    expect(screen.getByText('Not sampled')).toBeInTheDocument();
  });

  it('renders plan and seat usage', async () => {
    render(<InsightsPage />);
    expect(await screen.findByText('BUSINESS')).toBeInTheDocument();
    expect(screen.getByText('3 / 5 included')).toBeInTheDocument();
  });

  it('shows partial-data warnings', async () => {
    mocks.loadWorkspaceInsights.mockResolvedValue(
      snapshot({
        members: null,
        warnings: [{ source: 'members', message: 'Forbidden' }],
      }),
    );
    render(<InsightsPage />);

    expect(await screen.findByText('Some data could not be loaded')).toBeInTheDocument();
    expect(screen.getByText('members').closest('li')).toHaveTextContent('members: Forbidden');
  });

  it('shows an empty state when there are no projects', async () => {
    mocks.loadWorkspaceInsights.mockResolvedValue(
      snapshot({
        projects: {
          ...snapshot().projects,
          total: 0,
          items: [],
          byStatus: snapshot().projects.byStatus.map((entry) => ({ ...entry, count: 0 })),
        },
      }),
    );
    render(<InsightsPage />);

    expect(await screen.findByText('No projects to report')).toBeInTheDocument();
  });

  it('shows an error with a retry action', async () => {
    mocks.loadWorkspaceInsights.mockRejectedValueOnce(new Error('boom'));
    render(<InsightsPage />);

    expect(await screen.findByText('Insights unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('reloads when the reporting period changes', async () => {
    const user = userEvent.setup();
    render(<InsightsPage />);
    await screen.findByText('Website redesign');

    await user.selectOptions(screen.getByLabelText('Reporting period'), '90d');

    await waitFor(() => {
      expect(mocks.loadWorkspaceInsights).toHaveBeenLastCalledWith('ws-1', { range: '90d' });
    });
  });

  it('shows an empty state when no workspace is active', () => {
    mocks.activeWorkspace = null as unknown as typeof mocks.activeWorkspace;
    render(<InsightsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('exports the project snapshot as CSV', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    render(<InsightsPage />);
    await screen.findByText('Website redesign');
    await user.click(screen.getByRole('button', { name: 'Export projects CSV' }));

    expect(mocks.buildProjectCsv).toHaveBeenCalled();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
