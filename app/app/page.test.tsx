import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppHomePage from './page';

const mocks = vi.hoisted(() => ({
  router: { push: vi.fn(), replace: vi.fn() },
  context: {
    user: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
    workspaces: [{ id: 'personal', name: 'Personal', type: 'INDIVIDUAL', isPersonal: true, role: 'OWNER', organizationRole: null, memberCount: 1, projectCount: 0, teamCount: 0 }],
    activeWorkspace: null as { id: string; name: string; type: string; isPersonal: boolean; role: string; organizationRole: string | null; memberCount: number; projectCount: number; teamCount: number } | null,
    loading: false,
    switchingWorkspaceId: null as string | null,
    error: null as string | null,
    retry: vi.fn(),
    switchToWorkspace: vi.fn(),
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => mocks.router }));
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mocks.context }));

describe('AppHomePage workspace context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.context.loading = false;
    mocks.context.error = null;
    mocks.context.activeWorkspace = { ...mocks.context.workspaces[0], name: 'Personal' };
  });

  it('shows the active workspace and links to workspace management', () => {
    render(<AppHomePage />);

    expect(screen.getByRole('heading', { name: 'Welcome, Ada.' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch workspace: Personal, Individual' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage workspaces' })).toHaveAttribute('href', '/app/workspaces');
  });

  it('provides a retry state when workspace data cannot be loaded', () => {
    mocks.context.activeWorkspace = null;
    mocks.context.workspaces = [];
    mocks.context.error = 'Workspace service unavailable.';
    render(<AppHomePage />);

    expect(screen.getByRole('alert')).toHaveTextContent('Workspace service unavailable.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('offers workspace creation when the caller belongs to no workspace', () => {
    mocks.context.activeWorkspace = null;
    mocks.context.workspaces = [];
    render(<AppHomePage />);

    expect(screen.getByText('No workspaces are available')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create workspace' })).toHaveAttribute('href', '/app/workspaces');
  });
});
