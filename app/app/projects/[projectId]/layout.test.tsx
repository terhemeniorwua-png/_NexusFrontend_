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
});

describe('ProjectLayout — section order by project type', () => {
  const fullPermissions = ['project.view', 'task.view', 'project.report.view', 'project.settings.manage'];
  const generalOrder = [
    'Overview', 'Tasks', 'Sprints', 'Members', 'Checklists', 'Reviews',
    'Milestones', 'Code', 'Activity', 'Reports', 'Settings', 'Dev activity',
  ];
  const designOrder = [
    'Overview', 'Tasks', 'Reviews', 'Checklists', 'Sprints', 'Milestones',
    'Code', 'Members', 'Activity', 'Reports', 'Settings', 'Dev activity',
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
      'Overview', 'Tasks', 'Sprints', 'Code', 'Reviews', 'Checklists',
      'Milestones', 'Members', 'Activity', 'Reports', 'Settings', 'Dev activity',
    ]],
    ['DESIGN', designOrder],
    ['OPERATIONS', [
      'Overview', 'Tasks', 'Checklists', 'Milestones', 'Members', 'Activity',
      'Code', 'Reviews', 'Reports', 'Settings', 'Sprints', 'Dev activity',
    ]],
    ['MARKETING', [
      'Overview', 'Tasks', 'Milestones', 'Checklists', 'Reviews', 'Members',
      'Activity', 'Code', 'Reports', 'Settings', 'Sprints', 'Dev activity',
    ]],
    ['HR', [
      'Overview', 'Tasks', 'Checklists', 'Members', 'Reviews', 'Milestones',
      'Activity', 'Code', 'Reports', 'Settings', 'Sprints', 'Dev activity',
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
      'Overview', 'Tasks', 'Code', 'Reviews', 'Checklists', 'Milestones',
      'Members', 'Activity', 'Reports', 'Settings', 'Dev activity',
    ]));
  });

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
      'Code', 'Activity', 'Reports', 'Settings', 'Dev activity',
    ]));
  });
});
