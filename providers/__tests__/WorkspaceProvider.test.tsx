import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkspaceProvider, useWorkspaceContext } from '../WorkspaceProvider';
import { createWorkspace, listWorkspaces, switchWorkspace, updateWorkspace } from '@/services/workspaces';
import { ApiRequestError } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  router: { replace: vi.fn() },
  apiRequest: vi.fn(),
  getAccessToken: vi.fn(() => 'access-token' as string | null),
  refreshSession: vi.fn(),
  listWorkspaces: vi.fn(),
  switchWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, apiRequest: mocks.apiRequest, getAccessToken: mocks.getAccessToken };
});
vi.mock('@/services/auth', () => ({ refreshSession: mocks.refreshSession }));
vi.mock('@/services/workspaces', () => ({
  createWorkspace: mocks.createWorkspace,
  listWorkspaces: mocks.listWorkspaces,
  switchWorkspace: mocks.switchWorkspace,
  updateWorkspace: mocks.updateWorkspace,
}));

const personal = {
  id: 'workspace-personal', name: 'Personal', slug: 'personal', description: null,
  type: 'INDIVIDUAL' as const, isPersonal: true, visibility: 'PRIVATE' as const, status: 'ACTIVE' as const,
  ownerId: 'user-1', role: 'OWNER', organizationRole: null, joinCodeEnabled: false,
  memberCount: 1, projectCount: 0, teamCount: 0,
  createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
};
const company = { ...personal, id: 'workspace-company', name: 'Company', slug: 'company', type: 'COMPANY' as const, isPersonal: false, organizationRole: 'COMPANY_OWNER' };
const institute = { ...personal, id: 'workspace-new', name: 'New Institute', slug: 'new-institute', type: 'INSTITUTION' as const, isPersonal: false, organizationRole: 'INSTITUTION_OWNER' };

function Probe() {
  const context = useWorkspaceContext();
  return <div>
    {context.loading ? <p role="status">Loading context</p> : <p>{context.user?.name} in {context.activeWorkspace?.name ?? 'none'}</p>}
    <button onClick={() => { void context.switchToWorkspace(company.id); }}>Switch to company</button>
    <button onClick={() => { void context.createAndActivateWorkspace({ name: 'New Institute', type: 'INSTITUTION', visibility: 'PRIVATE' }); }}>Create institute</button>
  </div>;
}

describe('WorkspaceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.apiRequest.mockResolvedValue({ user: { id: 'user-1', email: 'ada@example.com', name: 'Ada', status: 'ACTIVE', emailVerifiedAt: null, createdAt: '2026-11-01T00:00:00.000Z' } });
    vi.mocked(listWorkspaces).mockResolvedValue([personal, company]);
    vi.mocked(switchWorkspace).mockImplementation(async (id) => id === company.id ? company : id === institute.id ? institute : personal);
    vi.mocked(createWorkspace).mockResolvedValue(institute);
    vi.mocked(updateWorkspace).mockResolvedValue(company);
  });

  it('loads the account and workspaces, then restores the saved valid workspace', async () => {
    window.localStorage.setItem('nexus-active-workspace', company.id);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);

    expect(await screen.findByText('Ada in Company')).toBeInTheDocument();
    expect(mocks.apiRequest).toHaveBeenCalledWith('/auth/me', { authenticated: true });
    expect(listWorkspaces).toHaveBeenCalledOnce();
    expect(switchWorkspace).toHaveBeenCalledWith(company.id);
  });

  it('changes active context only through a successful backend switch', async () => {
    vi.mocked(listWorkspaces).mockResolvedValue([personal, company]);
    vi.mocked(switchWorkspace).mockResolvedValue(personal);
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(await screen.findByText('Ada in Personal')).toBeInTheDocument();

    vi.mocked(switchWorkspace).mockResolvedValue(company);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to company' }));

    await waitFor(() => expect(screen.getByText('Ada in Company')).toBeInTheDocument());
    expect(window.localStorage.getItem('nexus-active-workspace')).toBe(company.id);
  });

  it('returns to sign-in when a workspace switch cannot refresh an expired session', async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    expect(await screen.findByText('Ada in Personal')).toBeInTheDocument();
    vi.mocked(switchWorkspace).mockRejectedValueOnce(new ApiRequestError('Your session has expired.', 401));
    fireEvent.click(screen.getByRole('button', { name: 'Switch to company' }));

    await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith('/sign-in'));
  });

  it('creates the workspace through the backend and activates its returned id', async () => {
    render(<WorkspaceProvider><Probe /></WorkspaceProvider>);
    await screen.findByText('Ada in Personal');
    fireEvent.click(screen.getByRole('button', { name: 'Create institute' }));

    await waitFor(() => expect(screen.getByText('Ada in New Institute')).toBeInTheDocument());
    expect(createWorkspace).toHaveBeenCalledWith({ name: 'New Institute', type: 'INSTITUTION', visibility: 'PRIVATE' });
    expect(switchWorkspace).toHaveBeenLastCalledWith('workspace-new');
  });
});
