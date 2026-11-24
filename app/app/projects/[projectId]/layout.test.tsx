import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectLayout from './layout';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
  getProject: vi.fn(),
}));

function setPermissions(permissions: string[]) {
  mocks.permissionState = {
    isLoading: false,
    accessStatus: null,
    can: (p: string) => permissions.includes(p),
    canAny: (list: string[]) => list.some((p) => permissions.includes(p)),
    canAll: (list: string[]) => list.every((p) => permissions.includes(p)),
  };
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/app/projects/project-1/tasks',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...props}>{children}</a>,
}));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  ProjectPermissionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  usePermissions: () => mocks.permissionState,
}));
vi.mock('@/services/projects', () => ({
  getProject: mocks.getProject,
}));

describe('ProjectLayout — sprint tab visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['project.view', 'task.view', 'project.report.view']);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'GENERAL', workflowMode: 'SPRINTS' });
  });

  it('shows the Sprints tab for a SPRINTS project', async () => {
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    expect(await screen.findByRole('link', { name: 'Sprints' })).toHaveAttribute('href', '/app/projects/project-1/sprints');
  });

  it('hides the Sprints tab for a BACKLOG_ONLY project', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'GENERAL', workflowMode: 'BACKLOG_ONLY' });
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Sprints' })).not.toBeInTheDocument());
  });

  it('hides the Sprints tab from users without View permission', async () => {
    setPermissions(['task.view']);
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    expect(screen.queryByRole('link', { name: 'Sprints' })).not.toBeInTheDocument();
  });

  it('shows Dev activity to viewers and hides Developer activity without project.update', async () => {
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    expect(await screen.findByRole('link', { name: 'Dev activity' })).toHaveAttribute(
      'href',
      '/app/projects/project-1/dev-activity',
    );
    expect(screen.queryByRole('link', { name: 'Developer activity' })).not.toBeInTheDocument();
  });

  it('places Developer activity immediately after Dev activity for users with project.update', async () => {
    setPermissions(['project.view', 'project.update']);
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    const labels = await waitFor(() => screen.getAllByRole('link').map((link) => link.textContent));
    const devIndex = labels.indexOf('Dev activity');
    expect(devIndex).toBeGreaterThanOrEqual(0);
    expect(labels[devIndex + 1]).toBe('Developer activity');
    expect(screen.getByRole('link', { name: 'Developer activity' })).toHaveAttribute(
      'href',
      '/app/projects/project-1/dev-activity/developers',
    );
  });
});

describe('ProjectLayout — section order by project type', () => {
  const fullPermissions = ['project.view', 'task.view', 'project.report.view', 'project.settings.manage'];
  const generalOrder = [
    'Overview', 'Tasks', 'Sprints', 'Members', 'Checklists', 'Reviews',
    'Milestones', 'Code', 'Dev activity', 'Activity', 'Reports', 'Settings',
  ];
  const designOrder = [
    'Overview', 'Tasks', 'Reviews', 'Checklists', 'Sprints', 'Milestones',
    'Code', 'Dev activity', 'Members', 'Activity', 'Reports', 'Settings',
  ];
  const visibleLabels = () => screen.getAllByRole('link').map((link) => link.textContent);

  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(fullPermissions);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'GENERAL', workflowMode: 'SPRINTS' });
  });

  it.each([
    ['GENERAL', generalOrder],
    ['ENGINEERING', [
      'Overview', 'Tasks', 'Sprints', 'Code', 'Dev activity', 'Reviews', 'Checklists',
      'Milestones', 'Members', 'Activity', 'Reports', 'Settings',
    ]],
    ['DESIGN', designOrder],
    ['OPERATIONS', [
      'Overview', 'Tasks', 'Checklists', 'Milestones', 'Members', 'Activity',
      'Code', 'Dev activity', 'Reviews', 'Reports', 'Settings', 'Sprints',
    ]],
    ['MARKETING', [
      'Overview', 'Tasks', 'Milestones', 'Checklists', 'Reviews', 'Members',
      'Activity', 'Code', 'Dev activity', 'Reports', 'Settings', 'Sprints',
    ]],
    ['HR', [
      'Overview', 'Tasks', 'Checklists', 'Members', 'Reviews', 'Milestones',
      'Activity', 'Code', 'Dev activity', 'Reports', 'Settings', 'Sprints',
    ]],
  ] as const)('orders the existing sections for %s', async (type, expected) => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', type, workflowMode: 'SPRINTS' });
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    await waitFor(() => expect(visibleLabels()).toEqual(expected));
  });

  it('keeps a hidden tab hidden while reordering the rest', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'ENGINEERING', workflowMode: 'BACKLOG_ONLY' });
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    expect(screen.queryByRole('link', { name: 'Sprints' })).not.toBeInTheDocument();
    await waitFor(() => expect(visibleLabels()).toEqual([
      'Overview', 'Tasks', 'Code', 'Dev activity', 'Reviews', 'Checklists', 'Milestones',
      'Members', 'Activity', 'Reports', 'Settings',
    ]));
  });

  it.each(['ENGINEERING', 'DESIGN'] as const)(
    'a BACKLOG_ONLY project shows no Sprints tab even for %s',
    async (type) => {
      mocks.getProject.mockResolvedValue({ id: 'project-1', type, workflowMode: 'BACKLOG_ONLY' });
      render(<ProjectLayout><div>Page content</div></ProjectLayout>);
      await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
      await waitFor(() => expect(screen.queryByRole('link', { name: 'Sprints' })).not.toBeInTheDocument());
      expect(visibleLabels()).not.toContain('Sprints');
    },
  );

  it('still limits a viewer to the existing permission rules', async () => {
    setPermissions(['project.view']);
    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'HR', workflowMode: 'BACKLOG_ONLY' });
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    await waitFor(() => expect(visibleLabels()).toEqual([
      'Overview', 'Checklists', 'Members', 'Reviews', 'Milestones', 'Activity', 'Code',
      'Dev activity',
    ]));
  });

  it('reorders on the next render after the project type changes', async () => {
    const view = render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(visibleLabels()).toEqual(generalOrder));

    mocks.getProject.mockResolvedValue({ id: 'project-1', type: 'DESIGN', workflowMode: 'SPRINTS' });
    mocks.activeWorkspace = { ...mocks.activeWorkspace!, id: 'ws-2' };
    view.rerender(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-2', 'project-1'));
    await waitFor(() => expect(visibleLabels()).toEqual(designOrder));
  });

  it('uses today\'s order when the project lookup fails', async () => {
    mocks.getProject.mockRejectedValue(new Error('lookup failed'));
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalledWith('ws-1', 'project-1'));
    await waitFor(() => expect(visibleLabels()).toEqual([
      'Overview', 'Tasks', 'Members', 'Checklists', 'Reviews', 'Milestones',
      'Code', 'Dev activity', 'Activity', 'Reports', 'Settings',
    ]));
  });
});
