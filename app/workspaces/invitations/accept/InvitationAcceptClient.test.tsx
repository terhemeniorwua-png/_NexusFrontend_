import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import { InvitationAcceptClient } from './InvitationAcceptClient';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  searchParams: new URLSearchParams('token=token_-123'),
  getAccessToken: vi.fn<() => string | null>(() => null),
  refreshSession: vi.fn(),
  previewInvitation: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, getAccessToken: mocks.getAccessToken };
});
vi.mock('@/services/auth', () => ({ refreshSession: mocks.refreshSession }));
vi.mock('@/services/invitations', () => ({
  previewInvitation: mocks.previewInvitation,
  acceptInvitation: mocks.acceptInvitation,
  declineInvitation: mocks.declineInvitation,
}));

const invitation = {
  workspace: { id: 'workspace-1', name: 'Nexus Studio', slug: 'nexus-studio' },
  invitedBy: { id: 'user-1', name: 'Grace' },
  role: 'MEMBER' as const,
  organizationRole: 'COMPANY_COLLABORATOR' as const,
  status: 'PENDING' as const,
  expiresAt: '2026-11-06T00:00:00.000Z',
  maskedEmail: 'a***@example.com',
  boundToAccount: true,
};

function clearCookies() {
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0]?.trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

describe('invitation acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCookies();
    mocks.searchParams = new URLSearchParams('token=token_-123');
    mocks.getAccessToken.mockReturnValue(null);
    mocks.previewInvitation.mockResolvedValue(invitation);
  });

  it('asks anonymous visitors to sign in while preserving the invitation link', async () => {
    render(<InvitationAcceptClient />);

    expect(await screen.findByRole('heading', { name: 'Join Nexus Studio' })).toBeInTheDocument();
    expect(screen.getByText('a***@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();

    const signIn = await screen.findByRole('link', { name: 'Sign in to accept' });
    expect(signIn.getAttribute('href')).toBe(
      '/sign-in?redirect=%2Fworkspaces%2Finvitations%2Faccept%3Ftoken%3Dtoken_-123',
    );
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('accepts the invitation, remembers the workspace, and offers to open it', async () => {
    mocks.getAccessToken.mockReturnValue('access-token');
    mocks.acceptInvitation.mockResolvedValue({
      id: 'invitation-1',
      workspaceId: 'workspace-1',
      workspaceName: 'Nexus Studio',
      status: 'ACCEPTED',
    });
    const user = userEvent.setup();
    render(<InvitationAcceptClient />);

    await user.click(await screen.findByRole('button', { name: 'Accept invitation' }));

    await waitFor(() => expect(mocks.acceptInvitation).toHaveBeenCalledWith('token_-123'));
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(await screen.findByText('You are now a member of Nexus Studio.')).toBeInTheDocument();
    expect(window.localStorage.getItem('nexus-active-workspace')).toBe('workspace-1');

    await user.click(screen.getByRole('button', { name: 'Open workspace' }));
    expect(mocks.router.push).toHaveBeenCalledWith('/app');
  });

  it('declines only after confirmation', async () => {
    mocks.getAccessToken.mockReturnValue('access-token');
    mocks.declineInvitation.mockResolvedValue({ workspaceId: 'workspace-1', workspaceName: 'Nexus Studio' });
    const user = userEvent.setup();
    render(<InvitationAcceptClient />);

    await user.click(await screen.findByRole('button', { name: 'Decline' }));
    expect(mocks.declineInvitation).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Decline invitation' }));

    await waitFor(() => expect(mocks.declineInvitation).toHaveBeenCalledWith('token_-123'));
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(await screen.findByText('You declined the invitation to Nexus Studio.')).toBeInTheDocument();
  });

  it('shows the backend explanation for an unusable invitation', async () => {
    mocks.previewInvitation.mockRejectedValue(new ApiRequestError('This invitation link has expired', 410, 'INVITATION_EXPIRED'));
    render(<InvitationAcceptClient />);

    expect(await screen.findByText('This invitation is not available')).toBeInTheDocument();
    expect(screen.getByText('This invitation link has expired')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
  });

  it('does not offer acceptance for an invitation whose backend status is expired', async () => {
    mocks.getAccessToken.mockReturnValue('access-token');
    mocks.previewInvitation.mockResolvedValue({ ...invitation, status: 'EXPIRED' });
    render(<InvitationAcceptClient />);

    expect(await screen.findByRole('heading', { name: 'Join Nexus Studio' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('This invitation has expired');
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
  });

  it('reports a missing token without calling the backend', async () => {
    mocks.searchParams = new URLSearchParams();
    render(<InvitationAcceptClient />);

    expect(await screen.findByText('This invitation is not available')).toBeInTheDocument();
    expect(mocks.previewInvitation).not.toHaveBeenCalled();
  });

  it('restores a session before showing authenticated controls', async () => {
    document.cookie = 'nexus_csrf=csrf';
    mocks.refreshSession.mockResolvedValue({ accessToken: 'restored' });
    render(<InvitationAcceptClient />);

    expect(await screen.findByRole('button', { name: 'Accept invitation' })).toBeInTheDocument();
    expect(mocks.refreshSession).toHaveBeenCalledOnce();
  });

  it('treats a rejected refresh as an anonymous visitor', async () => {
    document.cookie = 'nexus_csrf=csrf';
    mocks.refreshSession.mockRejectedValue(new ApiRequestError('Expired', 401));
    render(<InvitationAcceptClient />);

    expect(await screen.findByRole('link', { name: 'Sign in to accept' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept invitation' })).not.toBeInTheDocument();
  });
});
