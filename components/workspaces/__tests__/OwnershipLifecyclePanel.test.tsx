import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OwnershipLifecyclePanel } from '../OwnershipLifecyclePanel';
import {
  acceptWorkspaceOwnershipTransfer,
  listIncomingOwnershipTransfers,
  rejectWorkspaceOwnershipTransfer,
} from '@/services/workspaces';

vi.mock('@/services/workspaces', () => ({
  acceptWorkspaceBillingResponsibility: vi.fn(),
  acceptWorkspaceOwnershipTransfer: vi.fn(),
  initiateWorkspaceOwnershipTransfer: vi.fn(),
  listIncomingOwnershipTransfers: vi.fn(),
  rejectWorkspaceOwnershipTransfer: vi.fn(),
}));

const workspace = {
  id: 'workspace-1',
  name: 'Nexus Studio',
  slug: 'nexus-studio',
  description: null,
  type: 'COMPANY' as const,
  isPersonal: false,
  visibility: 'PRIVATE' as const,
  status: 'ACTIVE' as const,
  ownerId: 'user-1',
  role: 'OWNER' as const,
  organizationRole: 'COMPANY_OWNER' as const,
  joinCodeEnabled: false,
  memberCount: 1,
  projectCount: 0,
  teamCount: 0,
  createdAt: '',
  updatedAt: '',
};

/** Fixture now includes initiatedBy as required by the backend contract. */
const offer = {
  id: 'transfer-1',
  workspaceId: 'workspace-2',
  status: 'PENDING' as const,
  createdAt: '2026-11-01T00:00:00.000Z',
  expiresAt: null,
  acceptedAt: null,
  billingAcceptedAt: null,
  workspace: { id: 'workspace-2', name: 'Other Studio', type: 'COMPANY' as const, status: 'ACTIVE' as const },
  initiatedBy: { id: 'user-99', name: 'Alice' },
};

describe('OwnershipLifecyclePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(listIncomingOwnershipTransfers).mockResolvedValue({
      items: [offer],
      limit: 50,
      offset: 0,
    });
  });

  it('shows sender name and workspace name in the offer line', async () => {
    render(
      <OwnershipLifecyclePanel
        workspace={workspace}
        members={[]}
        userId="user-1"
        onChanged={vi.fn()}
      />,
    );
    // The component renders "<name> is offering you ownership of <workspace>"
    expect(
      await screen.findByText('Alice is offering you ownership of Other Studio'),
    ).toBeInTheDocument();
  });

  it('falls back to "Someone" when initiatedBy name is absent', async () => {
    const offerWithoutName = {
      ...offer,
      initiatedBy: { id: 'user-99', name: '' },
    };
    vi.mocked(listIncomingOwnershipTransfers).mockResolvedValue({
      items: [offerWithoutName],
      limit: 50,
      offset: 0,
    });
    render(
      <OwnershipLifecyclePanel
        workspace={workspace}
        members={[]}
        userId="user-1"
        onChanged={vi.fn()}
      />,
    );
    expect(
      await screen.findByText('Someone is offering you ownership of Other Studio'),
    ).toBeInTheDocument();
  });

  it('lists and accepts an incoming offer by its contract identifiers', async () => {
    vi.mocked(acceptWorkspaceOwnershipTransfer).mockResolvedValue({
      workspaceId: 'workspace-2',
      billingAcceptanceRequired: true,
    });
    const user = userEvent.setup();
    render(
      <OwnershipLifecyclePanel
        workspace={workspace}
        members={[]}
        userId="user-1"
        onChanged={vi.fn()}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(acceptWorkspaceOwnershipTransfer).toHaveBeenCalledWith('workspace-2', 'transfer-1'),
    );
    expect(
      await screen.findByRole('button', { name: 'Accept billing responsibility' }),
    ).toBeInTheDocument();
  });

  it('requires confirmation before rejecting an offer', async () => {
    vi.mocked(rejectWorkspaceOwnershipTransfer).mockResolvedValue({
      workspaceId: 'workspace-2',
      status: 'REJECTED',
    });
    const user = userEvent.setup();
    render(
      <OwnershipLifecyclePanel
        workspace={workspace}
        members={[]}
        userId="user-1"
        onChanged={vi.fn()}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    expect(rejectWorkspaceOwnershipTransfer).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reject transfer' }));
    await waitFor(() =>
      expect(rejectWorkspaceOwnershipTransfer).toHaveBeenCalledWith('workspace-2', 'transfer-1'),
    );
  });
});
