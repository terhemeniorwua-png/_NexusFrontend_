import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { AuthenticatedShell } from '../AuthenticatedShell';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  pathname: '/app',
  signOut: vi.fn(),
  context: {
    user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' } as { id: string; name: string; email: string } | null,
    workspaces: [] as Array<Record<string, unknown>>,
    activeWorkspace: null as Record<string, unknown> | null,
    loading: false,
    switchToWorkspace: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
  usePathname: () => mocks.pathname,
}));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));
vi.mock('@/services/auth', () => ({ signOut: mocks.signOut }));

const company: Record<string, unknown> = {
  id: 'workspace-company',
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
  memberCount: 3,
  projectCount: 2,
  teamCount: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const personal: Record<string, unknown> = {
  ...company,
  id: 'workspace-personal',
  name: 'Personal',
  type: 'INDIVIDUAL',
  isPersonal: true,
  organizationRole: null,
};

describe('AuthenticatedShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/app';
    mocks.context.user = { id: 'user-1', name: 'Ada', email: 'ada@example.com' };
    mocks.context.workspaces = [personal, company];
    mocks.context.activeWorkspace = company;
    mocks.context.loading = false;
    mocks.signOut.mockResolvedValue(undefined);
    window.localStorage.clear();
  });

  it('mounts the shared navigation for the active workspace', () => {
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/app');
    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('href', '/app/members');
    expect(screen.getByRole('link', { name: 'Invitations' })).toHaveAttribute('href', '/app/invitations');
    expect(screen.getByRole('link', { name: 'Billing' })).toHaveAttribute('href', '/app/billing');
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch workspace: Nexus Studio, Company' })).toBeInTheDocument();
  });

  it('switches workspace through the provider', async () => {
    const user = userEvent.setup();
    mocks.context.switchToWorkspace.mockResolvedValue(true);
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: 'Switch workspace: Nexus Studio, Company' }));
    await user.click(screen.getByRole('menuitem', { name: 'Personal' }));

    expect(mocks.context.switchToWorkspace).toHaveBeenCalledWith('workspace-personal');
  });

  it('signs out through the account menu and returns to the landing page', async () => {
    const user = userEvent.setup();
    render(<ThemeProvider><AuthenticatedShell><p>Page body</p></AuthenticatedShell></ThemeProvider>);

    await user.click(screen.getByRole('button', { name: 'Account menu for Ada' }));
    await user.click(screen.getByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledOnce());
    expect(mocks.router.push).toHaveBeenCalledWith('/');
  });

  it('renders the page without chrome while the session is loading', () => {
    mocks.context.loading = true;
    render(<ThemeProvider><AuthenticatedShell><p>Loading body</p></AuthenticatedShell></ThemeProvider>);

    expect(screen.getByText('Loading body')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });
});
