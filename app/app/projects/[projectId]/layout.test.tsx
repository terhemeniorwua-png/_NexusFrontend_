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
    mocks.getProject.mockResolvedValue({ id: 'project-1', workflowMode: 'SPRINTS' });
  });

  it('shows the Sprints tab for a SPRINTS project', async () => {
    render(<ProjectLayout><div>Page content</div></ProjectLayout>);
    expect(await screen.findByRole('link', { name: 'Sprints' })).toHaveAttribute('href', '/app/projects/project-1/sprints');
  });

  it('hides the Sprints tab for a BACKLOG_ONLY project', async () => {
    mocks.getProject.mockResolvedValue({ id: 'project-1', workflowMode: 'BACKLOG_ONLY' });
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
