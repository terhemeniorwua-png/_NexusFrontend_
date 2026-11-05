/**
 * Regression tests for workspace-switch safety on project detail pages.
 *
 * Each detail page (overview, members, milestones, activity, settings) must:
 * - Show a redirect to /app/projects when the active workspace changes.
 * The redirect is handled by useWorkspaceRedirect; these tests verify the hook
 * is wired in each page.
 */
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Track router.replace calls
const routerReplace = vi.fn();

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  loading: false,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
  usePathname: () => '/app/projects/project-1',
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: mocks.loading }),
}));

vi.mock('@/services/projects', () => ({
  getProject: vi.fn().mockResolvedValue({
    id: 'project-1', workspaceId: 'ws-1', name: 'Nexus', key: 'NX', description: null,
    category: null, labels: [], status: 'ACTIVE', visibility: 'WORKSPACE', startDate: null,
    dueDate: null, ownerId: 'user-1', owner: { id: 'user-1', name: 'Alice' },
    memberCount: 1, taskCount: 0, myRole: 'PROJECT_MANAGER', createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z', teamId: null, departmentId: null,
  }),
  listProjectMembers: vi.fn().mockResolvedValue([]),
  addProjectMember: vi.fn(),
  removeProjectMember: vi.fn(),
  updateProjectMember: vi.fn(),
  listProjectActivity: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  listProjectMilestones: vi.fn().mockResolvedValue([]),
  createProjectMilestone: vi.fn(),
  updateProjectMilestone: vi.fn(),
  deleteProjectMilestone: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
  updateProject: vi.fn(),
  updateProjectOrganizationAccess: vi.fn(),
  transferProjectOwnership: vi.fn(),
}));

vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/organization-structure', () => ({
  listDepartments: vi.fn().mockResolvedValue([]),
  listTeams: vi.fn().mockResolvedValue([]),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));

const wsAlpha = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null as null };
const wsBeta = { id: 'ws-2', name: 'Beta', type: 'COMPANY', role: 'OWNER', organizationRole: null as null };

describe('Project detail pages: workspace-switch redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routerReplace.mockReset();
    mocks.activeWorkspace = wsAlpha;
  });

  it('overview page redirects to /app/projects on workspace change', async () => {
    const { default: Page } = await import('./[projectId]/page');
    const view = render(<Page params={{ projectId: 'project-1' }} />);
    mocks.activeWorkspace = wsBeta;
    view.rerender(<Page params={{ projectId: 'project-1' }} />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/app/projects'));
  });

  it('members page redirects to /app/projects on workspace change', async () => {
    const { default: Page } = await import('./[projectId]/members/page');
    const view = render(<Page params={{ projectId: 'project-1' }} />);
    mocks.activeWorkspace = wsBeta;
    view.rerender(<Page params={{ projectId: 'project-1' }} />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/app/projects'));
  });

  it('milestones page redirects to /app/projects on workspace change', async () => {
    const { default: Page } = await import('./[projectId]/milestones/page');
    const view = render(<Page params={{ projectId: 'project-1' }} />);
    mocks.activeWorkspace = wsBeta;
    view.rerender(<Page params={{ projectId: 'project-1' }} />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/app/projects'));
  });

  it('activity page redirects to /app/projects on workspace change', async () => {
    const { default: Page } = await import('./[projectId]/activity/page');
    const view = render(<Page params={{ projectId: 'project-1' }} />);
    mocks.activeWorkspace = wsBeta;
    view.rerender(<Page params={{ projectId: 'project-1' }} />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/app/projects'));
  });

  it('settings page redirects to /app/projects on workspace change', async () => {
    const { default: Page } = await import('./[projectId]/settings/page');
    const view = render(<Page params={{ projectId: 'project-1' }} />);
    mocks.activeWorkspace = wsBeta;
    view.rerender(<Page params={{ projectId: 'project-1' }} />);
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/app/projects'));
  });
});
