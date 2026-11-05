import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JoinRequestsPanel } from '../JoinRequestsPanel';
import type { Workspace } from '@/services/workspaces';
import type { JoinRequest } from '@/services/join-requests';

const mocks = vi.hoisted(() => ({
  listWorkspaceJoinRequests: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
  createWorkspaceJoinCode: vi.fn(),
  disableWorkspaceJoinCode: vi.fn(),
}));

vi.mock('@/services/join-requests', () => ({
  listWorkspaceJoinRequests: mocks.listWorkspaceJoinRequests,
  approveJoinRequest: mocks.approveJoinRequest,
  rejectJoinRequest: mocks.rejectJoinRequest,
  createWorkspaceJoinCode: mocks.createWorkspaceJoinCode,
  disableWorkspaceJoinCode: mocks.disableWorkspaceJoinCode,
}));

const workspace: Workspace = {
  id: 'workspace-1',
  name: 'Nexus Studio',
  slug: 'nexus-studio',
  description: null,
  type: 'COMPANY',
  isPersonal: false,
  visibility: 'PUBLIC',
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

const request: JoinRequest = {
  id: 'request-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Nexus Studio',
  userId: 'user-2',
  userName: 'Grace Applicant',
  userEmail: 'grace@example.com',
  status: 'PENDING',
  role: 'MEMBER',
  organizationRole: null,
  teamId: null,
  message: 'I would like to join.',
  reviewedBy: null,
  reviewedAt: null,
  decisionNote: null,
  expiresAt: '2026-11-11T00:00:00.000Z',
  createdAt: '2026-11-04T00:00:00.000Z',
};

describe('JoinRequestsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspaceJoinRequests.mockResolvedValue([request]);
  });

  it('approves a request with the selected role', async () => {
    mocks.approveJoinRequest.mockResolvedValue({
      ...request,
      status: 'APPROVED',
      role: 'COLLABORATOR',
      organizationRole: 'COMPANY_COLLABORATOR',
    });
    const user = userEvent.setup();
    render(<JoinRequestsPanel workspace={workspace} canManage />);

    expect(await screen.findByText('Grace Applicant')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Role for approved members'), 'COMPANY_COLLABORATOR');
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mocks.approveJoinRequest).toHaveBeenCalledWith('workspace-1', 'request-1', {
      organizationRole: 'COMPANY_COLLABORATOR',
    }));
    expect(await screen.findByText(/Grace Applicant joined Nexus Studio as Collaborator/)).toBeInTheDocument();
  });

  it('rejects a request with an optional note', async () => {
    mocks.rejectJoinRequest.mockResolvedValue({ ...request, status: 'REJECTED', decisionNote: 'No capacity' });
    const user = userEvent.setup();
    render(<JoinRequestsPanel workspace={workspace} canManage />);

    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    // The dialog moves focus on open; wait for that before typing.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus());
    await user.type(screen.getByLabelText('Note for the decision record'), 'No capacity');
    expect(screen.getByLabelText('Note for the decision record')).toHaveValue('No capacity');
    await user.click(screen.getByRole('button', { name: 'Reject request' }));

    await waitFor(() => expect(mocks.rejectJoinRequest).toHaveBeenCalledWith('workspace-1', 'request-1', 'No capacity'));
    expect(await screen.findByText(/Grace Applicant’s join request was rejected/)).toBeInTheDocument();
  });

  it('does not offer review actions without the capability', async () => {
    render(<JoinRequestsPanel workspace={workspace} canManage={false} />);

    expect(await screen.findByText('Grace Applicant')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create join code' })).not.toBeInTheDocument();
  });

  it('creates a join code and shows it once', async () => {
    mocks.createWorkspaceJoinCode.mockResolvedValue({
      workspaceId: 'workspace-1',
      code: 'one-time-code',
      link: 'https://nexus.test/join/one-time-code',
    });
    const user = userEvent.setup();
    render(<JoinRequestsPanel workspace={workspace} canManage />);

    await user.click(await screen.findByRole('button', { name: 'Create join code' }));

    await waitFor(() => expect(mocks.createWorkspaceJoinCode).toHaveBeenCalledWith('workspace-1'));
    expect(await screen.findByText('one-time-code')).toBeInTheDocument();
    expect(screen.getByText('https://nexus.test/join/one-time-code')).toBeInTheDocument();
  });
});
