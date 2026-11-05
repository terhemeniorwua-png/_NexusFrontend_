import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GroupsPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: 'COMPANY' | 'INSTITUTION' },
  listInstitutionGroups: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/services/workspaces', () => ({ listWorkspaceMembers: mocks.listWorkspaceMembers }));
vi.mock('@/services/organization-structure', () => ({
  listInstitutionGroups: mocks.listInstitutionGroups,
  listInstitutionGroupMembers: vi.fn().mockResolvedValue([]),
  createInstitutionGroup: vi.fn(),
  updateInstitutionGroup: vi.fn(),
  deleteInstitutionGroup: vi.fn(),
  addInstitutionGroupMember: vi.fn(),
  updateInstitutionGroupMember: vi.fn(),
  removeInstitutionGroupMember: vi.fn(),
}));

const groupAlpha = {
  id: 'group-alpha', workspaceId: 'workspace-alpha', name: 'Group Alpha', description: null,
  _count: { members: 0 }, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};
const groupBeta = { ...groupAlpha, id: 'group-beta', workspaceId: 'workspace-beta', name: 'Group Beta' };

describe('GroupsPage workspace scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'workspace-alpha', name: 'Alpha workspace', type: 'INSTITUTION' };
    mocks.listWorkspaceMembers.mockResolvedValue([]);
  });

  it('hides previous workspace data while the newly selected workspace is loading', async () => {
    let finishBetaLoad: ((groups: typeof groupAlpha[]) => void) | undefined;
    mocks.listInstitutionGroups
      .mockResolvedValueOnce([groupAlpha])
      .mockImplementationOnce(() => new Promise((resolve) => { finishBetaLoad = resolve; }));

    const view = render(<GroupsPage />);
    expect(await screen.findByText('Group Alpha')).toBeInTheDocument();

    mocks.activeWorkspace = { id: 'workspace-beta', name: 'Beta workspace', type: 'INSTITUTION' };
    view.rerender(<GroupsPage />);

    expect(await screen.findByText('Loading institution groups…')).toBeInTheDocument();
    expect(screen.queryByText('Group Alpha')).not.toBeInTheDocument();

    await act(async () => { finishBetaLoad?.([groupBeta]); });
    expect(await screen.findByText('Group Beta')).toBeInTheDocument();
    expect(screen.queryByText('Group Alpha')).not.toBeInTheDocument();
  });

  it('does not let a slower previous workspace response replace the current workspace', async () => {
    let finishAlphaLoad: ((groups: typeof groupAlpha[]) => void) | undefined;
    mocks.listInstitutionGroups
      .mockImplementationOnce(() => new Promise((resolve) => { finishAlphaLoad = resolve; }))
      .mockResolvedValueOnce([groupBeta]);

    const view = render(<GroupsPage />);
    await waitFor(() => expect(mocks.listInstitutionGroups).toHaveBeenCalledTimes(1));

    mocks.activeWorkspace = { id: 'workspace-beta', name: 'Beta workspace', type: 'INSTITUTION' };
    view.rerender(<GroupsPage />);
    expect(await screen.findByText('Group Beta')).toBeInTheDocument();

    await act(async () => { finishAlphaLoad?.([groupAlpha]); });
    expect(screen.getByText('Group Beta')).toBeInTheDocument();
    expect(screen.queryByText('Group Alpha')).not.toBeInTheDocument();
  });

  it('shows an unauthenticated access state when the group load returns 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listInstitutionGroups.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<GroupsPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows a forbidden access state when the group load returns 403', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listInstitutionGroups.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<GroupsPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });
});
