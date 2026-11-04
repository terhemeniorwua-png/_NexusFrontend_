import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvitationsPanel } from '../InvitationsPanel';
import type { Workspace } from '@/services/workspaces';
import type { Invitation } from '@/services/invitations';

const mocks = vi.hoisted(() => ({
  listWorkspaceInvitations: vi.fn(),
  createWorkspaceInvitation: vi.fn(),
  resendWorkspaceInvitation: vi.fn(),
  revokeWorkspaceInvitation: vi.fn(),
}));

vi.mock('@/services/invitations', () => ({
  listWorkspaceInvitations: mocks.listWorkspaceInvitations,
  createWorkspaceInvitation: mocks.createWorkspaceInvitation,
  resendWorkspaceInvitation: mocks.resendWorkspaceInvitation,
  revokeWorkspaceInvitation: mocks.revokeWorkspaceInvitation,
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

const pending: Invitation = {
  id: 'invitation-1',
  workspaceId: 'workspace-1',
  workspaceName: 'Nexus Studio',
  email: 'grace@example.com',
  role: 'COLLABORATOR',
  organizationRole: 'COMPANY_MEMBER',
  type: 'WORKSPACE',
  status: 'PENDING',
  invitedBy: { id: 'user-1', name: 'Ada Owner' },
  expiresAt: '2026-11-06T00:00:00.000Z',
  acceptedAt: null,
  declinedAt: null,
  revokedAt: null,
  createdAt: '2026-11-04T00:00:00.000Z',
};

describe('InvitationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listWorkspaceInvitations.mockResolvedValue([pending]);
  });

  it('sends an invitation with the selected grantable role', async () => {
    mocks.createWorkspaceInvitation.mockResolvedValue({
      invitation: { ...pending, id: 'invitation-2', email: 'linus@example.com' },
      emailSent: true,
    });
    const user = userEvent.setup();
    render(<InvitationsPanel workspace={workspace} canManage />);

    await user.type(await screen.findByLabelText(/Email address/), 'linus@example.com');
    await user.selectOptions(screen.getByLabelText('Role'), 'COMPANY_COLLABORATOR');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(mocks.createWorkspaceInvitation).toHaveBeenCalledWith('workspace-1', {
      email: 'linus@example.com',
      organizationRole: 'COMPANY_COLLABORATOR',
    }));
    expect(await screen.findByText(/Invitation sent to linus@example.com/)).toBeInTheDocument();
  });

  it('surfaces a delivery failure without pretending the invitation was emailed', async () => {
    mocks.createWorkspaceInvitation.mockResolvedValue({
      invitation: { ...pending, id: 'invitation-2', email: 'linus@example.com' },
      emailSent: false,
    });
    const user = userEvent.setup();
    render(<InvitationsPanel workspace={workspace} canManage />);

    await user.type(await screen.findByLabelText(/Email address/), 'linus@example.com');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByText(/email could not be sent/)).toBeInTheDocument();
  });

  it('rejects an invalid address before calling the backend', async () => {
    const user = userEvent.setup();
    render(<InvitationsPanel workspace={workspace} canManage />);

    await user.type(await screen.findByLabelText(/Email address/), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
    expect(mocks.createWorkspaceInvitation).not.toHaveBeenCalled();
  });

  it('hides the invite form from callers without the capability', async () => {
    render(<InvitationsPanel workspace={workspace} canManage={false} />);

    expect(await screen.findByText('grace@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send invitation' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revoke' })).not.toBeInTheDocument();
  });

  it('revokes a pending invitation after confirmation', async () => {
    mocks.revokeWorkspaceInvitation.mockResolvedValue({ ...pending, status: 'REVOKED' });
    const user = userEvent.setup();
    render(<InvitationsPanel workspace={workspace} canManage />);

    await user.click(await screen.findByRole('button', { name: 'Revoke' }));
    await user.click(screen.getByRole('button', { name: 'Revoke invitation' }));

    await waitFor(() => expect(mocks.revokeWorkspaceInvitation).toHaveBeenCalledWith('workspace-1', 'invitation-1'));
    expect(await screen.findByText(/was revoked/)).toBeInTheDocument();
  });
});
