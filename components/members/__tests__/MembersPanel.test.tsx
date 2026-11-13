import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersPanel } from '../MembersPanel';
import type { Workspace, WorkspaceMember } from '@/services/workspaces';

const mocks = vi.hoisted(() => ({
  listWorkspaceMembers: vi.fn(),
  updateWorkspaceMemberRole: vi.fn(),
  removeWorkspaceMember: vi.fn(),
  suspendWorkspaceMember: vi.fn(),
  restoreWorkspaceMember: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ user: { id: 'current-user-test' } }),
}));
vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
  updateWorkspaceMemberRole: mocks.updateWorkspaceMemberRole,
  removeWorkspaceMember: mocks.removeWorkspaceMember,
  suspendWorkspaceMember: mocks.suspendWorkspaceMember,
  restoreWorkspaceMember: mocks.restoreWorkspaceMember,
}));

const workspace: Workspace = {
  id: 'workspace-1',
  name: 'Nexus Studio',
  slug: 'nexus-studio',
  description: null,
  type: 'COMPANY',
  isPersonal: false,
  visibility: 'PRIVATE',
  status: 'ACTIVE',
  ownerId: 'user-1',
  role: 'OWNER',
  organizationRole: 'COMPANY_OWNER',
  joinCodeEnabled: false,
  memberCount: 2,
  projectCount: 1,
  teamCount: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const owner: WorkspaceMember = {
  id: 'membership-1',
  userId: 'user-1',
  name: 'Ada Owner',
  email: 'ada@example.com',
  status: 'ACTIVE',
  role: 'OWNER',
  organizationRole: 'COMPANY_OWNER',
  membershipStatus: 'ACTIVE',
  joinedAt: '2026-11-01T00:00:00.000Z',
  owner: true,
};

const collaborator: WorkspaceMember = {
  id: 'membership-2',
  userId: 'user-2',
  name: 'Grace Member',
  email: 'grace@example.com',
  status: 'ACTIVE',
  role: 'COLLABORATOR',
  organizationRole: 'COMPANY_MEMBER',
  membershipStatus: 'ACTIVE',
  joinedAt: '2026-11-02T00:00:00.000Z',
  owner: false,
};

describe('MembersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspaceMembers.mockResolvedValue([owner, collaborator]);
  });

  it('shows members with their role labels', async () => {
    render(<MembersPanel workspace={workspace} canManage />);

    expect(await screen.findByText('Ada Owner')).toBeInTheDocument();
    expect(screen.getByText('Grace Member')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('does not offer member management actions to a caller without the capability', async () => {
    render(<MembersPanel workspace={workspace} canManage={false} />);

    expect(await screen.findByText('Grace Member')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Grace Member' })).not.toBeInTheDocument();
  });

  it('never offers actions for the workspace owner', async () => {
    render(<MembersPanel workspace={workspace} canManage />);

    expect(await screen.findByText('Ada Owner')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Ada Owner' })).not.toBeInTheDocument();
  });

  it('changes a member role through the confirmed endpoint', async () => {
    mocks.updateWorkspaceMemberRole.mockResolvedValue({
      ...collaborator,
      role: 'COLLABORATOR',
      organizationRole: 'COMPANY_COLLABORATOR',
    });
    const user = userEvent.setup();
    render(<MembersPanel workspace={workspace} canManage />);

    await user.click(await screen.findByRole('button', { name: 'Manage Grace Member' }));
    await user.click(screen.getByRole('menuitem', { name: 'Change role' }));
    await user.selectOptions(screen.getByLabelText('Role'), 'COMPANY_COLLABORATOR');
    await user.click(screen.getByRole('button', { name: 'Save role' }));

    expect(mocks.updateWorkspaceMemberRole).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Change role' }));

    await waitFor(() => expect(mocks.updateWorkspaceMemberRole).toHaveBeenCalledWith(
      'workspace-1',
      'user-2',
      { organizationRole: 'COMPANY_COLLABORATOR' },
    ));
    expect(await screen.findByText(/Grace Member is now Collaborator/)).toBeInTheDocument();
  });

  it('suspends an active membership after a confirmation step', async () => {
    mocks.suspendWorkspaceMember.mockResolvedValue({ ...collaborator, membershipStatus: 'SUSPENDED' });
    const user = userEvent.setup();
    render(<MembersPanel workspace={workspace} canManage />);

    await user.click(await screen.findByRole('button', { name: 'Manage Grace Member' }));
    await user.click(screen.getByRole('menuitem', { name: 'Suspend membership' }));

    expect(mocks.suspendWorkspaceMember).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Suspend member' }));

    await waitFor(() => expect(mocks.suspendWorkspaceMember).toHaveBeenCalledWith('workspace-1', 'user-2'));
    expect(await screen.findByText(/Grace Member’s membership is suspended/)).toBeInTheDocument();
  });
});
