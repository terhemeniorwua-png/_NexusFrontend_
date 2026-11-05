import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TeamsPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: 'COMPANY' | 'INSTITUTION' },
  listTeams: vi.fn(),
  listTeamMembers: vi.fn(),
  listDepartments: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/services/workspaces', () => ({ listWorkspaceMembers: mocks.listWorkspaceMembers }));
vi.mock('@/services/organization-structure', () => ({
  listTeams: mocks.listTeams,
  listTeamMembers: mocks.listTeamMembers,
  listDepartments: mocks.listDepartments,
  createTeam: vi.fn(), updateTeam: vi.fn(), setTeamLead: vi.fn(), archiveTeam: vi.fn(),
  addTeamMember: vi.fn(), removeTeamMember: vi.fn(), createDepartment: vi.fn(),
  renameDepartment: vi.fn(), assignDepartmentMember: vi.fn(),
}));

const alpha = {
  id: 'team-alpha', workspaceId: 'workspace-alpha', name: 'Team Alpha', description: null,
  departmentId: null, status: 'ACTIVE' as const, leadId: null, lead: null, memberCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const beta = { ...alpha, id: 'team-beta', workspaceId: 'workspace-beta', name: 'Team Beta' };

describe('TeamsPage workspace scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'workspace-alpha', name: 'Alpha workspace', type: 'COMPANY' };
    mocks.listTeamMembers.mockResolvedValue([]);
    mocks.listWorkspaceMembers.mockResolvedValue([]);
    mocks.listDepartments.mockResolvedValue([]);
  });

  it('hides previous workspace data while the newly selected workspace is loading', async () => {
    let finishBetaLoad: ((teams: typeof beta[]) => void) | undefined;
    mocks.listTeams
      .mockResolvedValueOnce([alpha])
      .mockImplementationOnce(() => new Promise((resolve) => { finishBetaLoad = resolve; }));

    const view = render(<TeamsPage />);
    expect(await screen.findByText('Team Alpha')).toBeInTheDocument();

    mocks.activeWorkspace = { id: 'workspace-beta', name: 'Beta workspace', type: 'COMPANY' };
    view.rerender(<TeamsPage />);

    expect(await screen.findByText('Loading organisation structure…')).toBeInTheDocument();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();

    await act(async () => { finishBetaLoad?.([beta]); });
    expect(await screen.findByText('Team Beta')).toBeInTheDocument();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
    expect(mocks.listTeams).toHaveBeenNthCalledWith(1, 'workspace-alpha');
    expect(mocks.listTeams).toHaveBeenNthCalledWith(2, 'workspace-beta');
  });

  it('does not let a slower previous workspace response replace the current workspace', async () => {
    let finishAlphaLoad: ((teams: typeof alpha[]) => void) | undefined;
    mocks.listTeams
      .mockImplementationOnce(() => new Promise((resolve) => { finishAlphaLoad = resolve; }))
      .mockResolvedValueOnce([beta]);

    const view = render(<TeamsPage />);
    await waitFor(() => expect(mocks.listTeams).toHaveBeenCalledTimes(1));

    mocks.activeWorkspace = { id: 'workspace-beta', name: 'Beta workspace', type: 'COMPANY' };
    view.rerender(<TeamsPage />);
    expect(await screen.findByText('Team Beta')).toBeInTheDocument();

    await act(async () => { finishAlphaLoad?.([alpha]); });
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
    expect(screen.queryByText('Team Alpha')).not.toBeInTheDocument();
  });

  it('shows an unauthenticated access state when the team load returns 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listTeams.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<TeamsPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows a forbidden access state when the team load returns 403', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listTeams.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<TeamsPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });
});