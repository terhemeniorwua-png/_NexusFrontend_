import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacesPage from './page';
import { listWorkspaceMembers, listWorkspaces, type Workspace } from '@/services/workspaces';
import { ApiRequestError } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  context: {
    workspaces: [] as Workspace[],
    user: { id: 'user-1', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '' },
    activeWorkspace: null as Workspace | null,
    loading: false,
    switchingWorkspaceId: null as string | null,
    error: null as string | null,
    retry: vi.fn(),
    switchToWorkspace: vi.fn(),
    createAndActivateWorkspace: vi.fn(),
    saveWorkspace: vi.fn(),
  },
  router: { replace: vi.fn() },
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));
vi.mock('@/services/workspaces', () => ({ listWorkspaceMembers: vi.fn(), listWorkspaces: vi.fn(), listIncomingOwnershipTransfers: vi.fn().mockResolvedValue({ items: [], limit: 50, offset: 0 }), initiateWorkspaceOwnershipTransfer: vi.fn(), acceptWorkspaceOwnershipTransfer: vi.fn(), acceptWorkspaceBillingResponsibility: vi.fn(), rejectWorkspaceOwnershipTransfer: vi.fn() }));
vi.mock('@/components/workspaces/WorkspaceLogoManager', () => ({ WorkspaceLogoManager: () => null }));

describe('WorkspacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/app/workspaces');
    mocks.context.loading = false;
    mocks.context.error = null;
    mocks.context.workspaces = [{ id: 'company-1', name: 'Nexus Studio', slug: 'nexus-studio', description: null, type: 'COMPANY', isPersonal: false, visibility: 'PRIVATE', status: 'ACTIVE', ownerId: 'user-1', role: 'OWNER', organizationRole: 'COMPANY_OWNER', joinCodeEnabled: false, memberCount: 1, projectCount: 2, teamCount: 1, createdAt: '', updatedAt: '' }];
    mocks.context.activeWorkspace = { ...mocks.context.workspaces[0] };
    vi.mocked(listWorkspaceMembers).mockResolvedValue([{ id: 'member-1', userId: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'ACTIVE', role: 'OWNER', organizationRole: 'COMPANY_OWNER', membershipStatus: 'ACTIVE', joinedAt: '2026-11-01T00:00:00.000Z', owner: true }]);
    mocks.context.createAndActivateWorkspace.mockResolvedValue(mocks.context.workspaces[0]);
    mocks.context.saveWorkspace.mockResolvedValue(mocks.context.workspaces[0]);
    mocks.context.switchToWorkspace.mockResolvedValue(true);
    vi.mocked(listWorkspaces).mockResolvedValue([]);
  });

  it('loads workspace members and submits a company workspace through context', async () => {
    const user = userEvent.setup();
    render(<WorkspacesPage />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();

    await user.type(screen.getAllByRole('textbox', { name: /Workspace name/ })[0], 'Acme');
    await user.click(screen.getByRole('button', { name: 'Create workspace' }));

    await waitFor(() => expect(mocks.context.createAndActivateWorkspace).toHaveBeenCalledWith({ name: 'Acme', description: null, type: 'COMPANY', visibility: 'PRIVATE' }));
    expect(listWorkspaceMembers).toHaveBeenCalledWith('company-1');
  }, 15_000);

  it('does not render member data from the previous workspace during a switch', async () => {
    const first = mocks.context.activeWorkspace!;
    const second = { ...first, id: 'company-2', name: 'Other Company' };
    const { rerender } = render(<WorkspacesPage />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    mocks.context.activeWorkspace = second;
    mocks.context.workspaces = [first, second];
    vi.mocked(listWorkspaceMembers).mockResolvedValueOnce([{ id: 'member-2', userId: 'user-2', name: 'Grace Hopper', email: 'grace@example.com', status: 'ACTIVE', role: 'MEMBER', organizationRole: 'COMPANY_MEMBER', membershipStatus: 'ACTIVE', joinedAt: '2026-11-02T00:00:00.000Z', owner: false }]);
    rerender(<WorkspacesPage />);
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    expect(await screen.findByText('Grace Hopper')).toBeInTheDocument();
  });

  it('saves documented workspace profile fields', async () => {
    const user = userEvent.setup();
    render(<WorkspacesPage />);
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    await user.clear(screen.getAllByRole('textbox', { name: /Workspace name/ })[1]);
    await user.type(screen.getAllByRole('textbox', { name: /Workspace name/ })[1], 'Nexus Studio Updated');
    await user.click(screen.getByRole('button', { name: 'Save workspace' }));

    await waitFor(() => expect(mocks.context.saveWorkspace).toHaveBeenCalledWith('company-1', { name: 'Nexus Studio Updated', description: null, visibility: 'PRIVATE' }));
    expect(await screen.findByText('Workspace settings saved.')).toBeInTheDocument();
  });

  it.each([
    ['INSTITUTION', 'Create your institution workspace', 'Create institution workspace'],
    ['COMPANY', 'Create your business workspace', 'Create business workspace'],
  ])('resumes %s onboarding with the matching workspace type', async (type, title, action) => {
    window.history.replaceState({}, '', `/app/workspaces?type=${type}`);
    mocks.context.workspaces = [];
    mocks.context.activeWorkspace = null;
    const user = userEvent.setup();
    render(<WorkspacesPage />);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Nexus Workspace');
    await user.click(screen.getByRole('button', { name: action }));

    await waitFor(() => expect(mocks.context.createAndActivateWorkspace).toHaveBeenCalledWith({ name: 'Nexus Workspace', description: null, type, visibility: 'PRIVATE' }));
    expect(listWorkspaces).toHaveBeenCalledOnce();
    expect(mocks.router.replace).toHaveBeenCalledWith('/app');
  });

  it('resumes into an existing matching workspace instead of creating another one', async () => {
    const institution = { ...mocks.context.workspaces[0], id: 'institution-1', type: 'INSTITUTION' as const, name: 'Example School' };
    window.history.replaceState({}, '', '/app/workspaces?type=INSTITUTION');
    mocks.context.workspaces = [institution];
    mocks.context.activeWorkspace = null;
    render(<WorkspacesPage />);

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/app'));
    expect(mocks.context.switchToWorkspace).toHaveBeenCalledWith('institution-1');
    expect(mocks.context.createAndActivateWorkspace).not.toHaveBeenCalled();
  });

  it('rechecks membership before retrying after an uncertain workspace creation result', async () => {
    const institution = { ...mocks.context.workspaces[0], id: 'institution-1', type: 'INSTITUTION' as const, name: 'Example School' };
    window.history.replaceState({}, '', '/app/workspaces?type=INSTITUTION');
    mocks.context.workspaces = [];
    mocks.context.activeWorkspace = null;
    mocks.context.createAndActivateWorkspace.mockRejectedValueOnce(new Error('Connection lost after submission.'));
    vi.mocked(listWorkspaces).mockResolvedValueOnce([]).mockResolvedValueOnce([institution]);
    const user = userEvent.setup();
    render(<WorkspacesPage />);
    await screen.findByRole('heading', { name: 'Create your institution workspace' });
    await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Example School');
    await user.click(screen.getByRole('button', { name: 'Create institution workspace' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The workspace could not be created.');

    await user.click(screen.getByRole('button', { name: 'Create institution workspace' }));
    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/app'));
    expect(mocks.context.createAndActivateWorkspace).toHaveBeenCalledOnce();
    expect(mocks.context.switchToWorkspace).toHaveBeenCalledWith('institution-1');
  });

  it('returns an expired institution session to sign-in while preserving the intended type', async () => {
    window.history.replaceState({}, '', '/app/workspaces?type=INSTITUTION');
    mocks.context.workspaces = [];
    mocks.context.activeWorkspace = null;
    vi.mocked(listWorkspaces).mockRejectedValueOnce(new ApiRequestError('Your session has expired.', 401));
    const user = userEvent.setup();
    render(<WorkspacesPage />);
    await screen.findByRole('heading', { name: 'Create your institution workspace' });
    await user.type(screen.getByRole('textbox', { name: 'Workspace name' }), 'Example School');
    await user.click(screen.getByRole('button', { name: 'Create institution workspace' }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/sign-in?accountType=institution'));
    expect(mocks.context.createAndActivateWorkspace).not.toHaveBeenCalled();
  });
});
