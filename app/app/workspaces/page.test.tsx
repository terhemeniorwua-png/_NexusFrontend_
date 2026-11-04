import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import WorkspacesPage from './page';
import { listWorkspaceMembers } from '@/services/workspaces';

const mocks = vi.hoisted(() => ({
  context: {
    workspaces: [{ id: 'company-1', name: 'Nexus Studio', slug: 'nexus-studio', description: null, type: 'COMPANY', isPersonal: false, visibility: 'PRIVATE', status: 'ACTIVE', ownerId: 'user-1', role: 'OWNER', organizationRole: 'COMPANY_OWNER', joinCodeEnabled: false, memberCount: 1, projectCount: 2, teamCount: 1, createdAt: '', updatedAt: '' } as const],
    activeWorkspace: null as null | { id: string; name: string; slug: string; description: string | null; type: 'COMPANY'; isPersonal: boolean; visibility: 'PRIVATE' | 'PUBLIC'; status: 'ACTIVE'; ownerId: string; role: string; organizationRole: string | null; joinCodeEnabled: boolean; memberCount: number; projectCount: number; teamCount: number; createdAt: string; updatedAt: string },
    loading: false,
    switchingWorkspaceId: null as string | null,
    error: null as string | null,
    retry: vi.fn(),
    switchToWorkspace: vi.fn(),
    createAndActivateWorkspace: vi.fn(),
    saveWorkspace: vi.fn(),
  },
}));

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));
vi.mock('@/services/workspaces', () => ({ listWorkspaceMembers: vi.fn() }));

describe('WorkspacesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.loading = false;
    mocks.context.error = null;
    mocks.context.activeWorkspace = { ...mocks.context.workspaces[0] };
    vi.mocked(listWorkspaceMembers).mockResolvedValue([{ id: 'member-1', userId: 'user-1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'ACTIVE', role: 'OWNER', organizationRole: 'COMPANY_OWNER', membershipStatus: 'ACTIVE', joinedAt: '2026-11-01T00:00:00.000Z', owner: true }]);
    mocks.context.createAndActivateWorkspace.mockResolvedValue(mocks.context.workspaces[0]);
    mocks.context.saveWorkspace.mockResolvedValue(mocks.context.workspaces[0]);
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
});
