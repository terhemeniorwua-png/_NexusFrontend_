import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  listProjects: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  archiveProject: vi.fn(),
  restoreProject: vi.fn(),
}));

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/services/projects', () => ({
  PROJECT_TYPE_LABELS: {
    GENERAL: 'General', ENGINEERING: 'Engineering', DESIGN: 'Design',
    OPERATIONS: 'Operations', MARKETING: 'Marketing', HR: 'HR',
  },
  listProjects: mocks.listProjects,
  createProject: mocks.createProject,
  updateProject: mocks.updateProject,
  archiveProject: mocks.archiveProject,
  restoreProject: mocks.restoreProject,
}));

const projectA = {
  id: 'project-1', workspaceId: 'ws-1', name: 'PITERON Web', key: 'NW', description: null,
  category: null, labels: [], status: 'ACTIVE', type: 'ENGINEERING', visibility: 'WORKSPACE', startDate: null,
  dueDate: null, ownerId: 'user-1', owner: { id: 'user-1', name: 'Alice' },
  memberCount: 3, taskCount: 0, myRole: 'PROJECT_MANAGER', createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.listProjects.mockResolvedValue({ items: [projectA], nextCursor: null });
  });

  it('shows projects loaded from the API', async () => {
    render(<ProjectsPage />);
    expect(await screen.findByText('PITERON Web')).toBeInTheDocument();
    expect(screen.getByText('NW')).toBeInTheDocument();
    // Visibility badge is present (there may be the filter option as well)
    expect(screen.getAllByText('Organisation-wide').length).toBeGreaterThan(0);
    expect(screen.getByText('Engineering')).toBeInTheDocument();
  });

  it('renders a type badge for every project type', async () => {
    const types = ['GENERAL', 'ENGINEERING', 'DESIGN', 'OPERATIONS', 'MARKETING', 'HR'] as const;
    const labels = ['General', 'Engineering', 'Design', 'Operations', 'Marketing', 'HR'] as const;
    mocks.listProjects.mockResolvedValue({
      items: types.map((type, index) => ({ ...projectA, id: `project-${index}`, name: `Project ${type}`, type })),
      nextCursor: null,
    });
    render(<ProjectsPage />);
    expect(await screen.findByText('Project GENERAL')).toBeInTheDocument();
    for (const label of labels) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('falls back to a General badge for an unknown type from an older backend', async () => {
    mocks.listProjects.mockResolvedValue({
      items: [{ ...projectA, name: 'Legacy project', type: 'LEGACY_TYPE' }],
      nextCursor: null,
    });
    render(<ProjectsPage />);
    expect(await screen.findByText('Legacy project')).toBeInTheDocument();
    expect(screen.getAllByText('General').length).toBeGreaterThan(0);
  });

  it('shows an empty state when there are no projects', async () => {
    mocks.listProjects.mockResolvedValue({ items: [], nextCursor: null });
    render(<ProjectsPage />);
    expect(await screen.findByText('No projects found')).toBeInTheDocument();
  });

  it('shows unauthenticated AccessState when load returns 401', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listProjects.mockRejectedValue(new ApiRequestError('Unauthorized', 401));
    render(<ProjectsPage />);
    expect(await screen.findByText('Sign in to continue')).toBeInTheDocument();
  });

  it('shows forbidden AccessState when load returns 403', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.listProjects.mockRejectedValue(new ApiRequestError('Forbidden', 403));
    render(<ProjectsPage />);
    expect(await screen.findByText('You do not have access')).toBeInTheDocument();
  });

  it('clears project data when workspace changes', async () => {
    mocks.listProjects.mockResolvedValueOnce({ items: [projectA], nextCursor: null }).mockResolvedValueOnce({ items: [], nextCursor: null });
    const view = render(<ProjectsPage />);
    expect(await screen.findByText('PITERON Web')).toBeInTheDocument();

    mocks.activeWorkspace = { id: 'ws-2', name: 'Other Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    view.rerender(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByText('PITERON Web')).not.toBeInTheDocument());
  });

  it('shows the create project modal on button click', async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'New project' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'New project' }));
    // Modal title is "New project"
    const modal = await screen.findByRole('dialog');
    expect(modal).toHaveTextContent('New project');
    // The form fields are rendered inside the dialog
    expect(modal).toHaveTextContent('Project name');
    expect(modal).toHaveTextContent('Project key');
  });

  it('requires a name before submitting the create form', async () => {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    expect(mocks.createProject).not.toHaveBeenCalled();
  });

  it('sends the selected type when creating a project', async () => {
    const user = userEvent.setup();
    mocks.createProject.mockResolvedValue(projectA);
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));

    const typeSelect = await screen.findByLabelText('Type');
    expect(typeSelect).toHaveValue('GENERAL');
    expect(screen.getByText('Classification only. It does not grant access or change permissions. Changing it never deletes or hides work. Project sections are listed in the order that suits the selected type.')).toBeInTheDocument();
    await user.selectOptions(typeSelect, 'DESIGN');
    await user.type(screen.getByLabelText(/Project name/), 'Design Project');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    await waitFor(() =>
      expect(mocks.createProject).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ name: 'Design Project', type: 'DESIGN' }),
      ),
    );
  });

  it('hides the type select in the create modal for users who cannot edit the workspace', async () => {
    const user = userEvent.setup();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'VIEWER', organizationRole: null };
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
  });

  it('gates the create type select on workspace:update exactly as the backend create-project permission', async () => {
    const user = userEvent.setup();
    // Backend: requireWorkspaceAccess(..., WorkspaceCapability.UpdateWorkspace)
    // grants 'workspace:update' to OWNER and PROJECT_MANAGER only.
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'PROJECT_MANAGER', organizationRole: null };
    const view = render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));
    expect(await screen.findByLabelText('Type')).toBeInTheDocument();

    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'MEMBER', organizationRole: null };
    view.rerender(<ProjectsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Type')).not.toBeInTheDocument());
  });

  it('shows archive confirm dialog and calls archive on confirm', async () => {
    const user = userEvent.setup();
    mocks.archiveProject.mockResolvedValue({ id: 'project-1', status: 'ARCHIVED' });
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'Archive PITERON Web' }));
    await user.click(screen.getByRole('button', { name: 'Archive PITERON Web' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Archive');
    await user.click(screen.getByRole('button', { name: 'Archive project' }));
    await waitFor(() => expect(mocks.archiveProject).toHaveBeenCalledWith('ws-1', 'project-1'));
  });

  it('shows the "load more" button when there is a next cursor', async () => {
    mocks.listProjects.mockResolvedValue({ items: [projectA], nextCursor: 'cursor-abc' });
    render(<ProjectsPage />);
    expect(await screen.findByRole('button', { name: 'Load more' })).toBeInTheDocument();
  });
});

describe('ProjectsPage — starting setup', () => {
  const helperBase = 'Classification only. It does not grant access or change permissions. Changing it never deletes or hides work. Project sections are listed in the order that suits the selected type.';
  const starterNames: Record<string, string[]> = {
    ENGINEERING: ['Bug triage', 'Feature implementation', 'Definition of done'],
    DESIGN: ['Design review', 'Design iteration', 'Critique checklist'],
    OPERATIONS: ['Operational request', 'Process update', 'Process runbook'],
    MARKETING: ['Campaign asset', 'Campaign launch check', 'Campaign launch'],
    HR: ['Onboarding task', 'Policy review', 'Onboarding checklist'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.listProjects.mockResolvedValue({ items: [projectA], nextCursor: null });
  });

  async function openCreateDialog() {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));
    await screen.findByRole('dialog');
    return user;
  }

  it('shows unchecked starter checkboxes only for non-General types', async () => {
    const user = await openCreateDialog();

    expect(screen.queryByText('Starting setup')).not.toBeInTheDocument();

    for (const [type, names] of Object.entries(starterNames)) {
      await user.selectOptions(screen.getByLabelText('Type'), type);
      expect(screen.getByText('Starting setup')).toBeInTheDocument();
      for (const name of names) {
        expect(screen.getByRole('checkbox', { name })).not.toBeChecked();
      }
    }

    await user.selectOptions(screen.getByLabelText('Type'), 'GENERAL');
    expect(screen.queryByText('Starting setup')).not.toBeInTheDocument();
  });

  it('resets starter ticks when the type changes', async () => {
    const user = await openCreateDialog();

    await user.selectOptions(screen.getByLabelText('Type'), 'ENGINEERING');
    const bugTriage = screen.getByRole('checkbox', { name: 'Bug triage' });
    await user.click(bugTriage);
    expect(bugTriage).toBeChecked();

    await user.selectOptions(screen.getByLabelText('Type'), 'DESIGN');
    expect(screen.queryByRole('checkbox', { name: 'Bug triage' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Design review' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Critique checklist' })).not.toBeChecked();

    await user.selectOptions(screen.getByLabelText('Type'), 'ENGINEERING');
    expect(screen.getByRole('checkbox', { name: 'Bug triage' })).not.toBeChecked();
  });

  it('does not render starting setup outside the workspace update gate', async () => {
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'VIEWER', organizationRole: null };
    await openCreateDialog();

    expect(screen.queryByLabelText('Type')).not.toBeInTheDocument();
    expect(screen.queryByText('Starting setup')).not.toBeInTheDocument();
  });

  it('shows the unchanged helper sentence plus the type-specific suffix', async () => {
    const user = await openCreateDialog();
    const expectedSuffixes: Record<string, string> = {
      ENGINEERING: 'Engineering starts in sprints.',
      DESIGN: 'Design starts in backlog only.',
      OPERATIONS: 'Operations starts in backlog only.',
      MARKETING: 'Marketing starts in backlog only.',
      HR: 'HR starts in backlog only.',
    };

    expect(screen.getByText(helperBase)).toBeInTheDocument();
    for (const [type, suffix] of Object.entries(expectedSuffixes)) {
      await user.selectOptions(screen.getByLabelText('Type'), type);
      expect(screen.getByText(`${helperBase} ${suffix}`)).toBeInTheDocument();
    }

    await user.selectOptions(screen.getByLabelText('Type'), 'GENERAL');
    expect(screen.getByText(helperBase)).toBeInTheDocument();
    expect(screen.queryByText(`${helperBase} General`)).not.toBeInTheDocument();
  });
});

describe('ProjectsPage — workflow default', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.activeWorkspace = { id: 'ws-1', name: 'Test Workspace', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.listProjects.mockResolvedValue({ items: [projectA], nextCursor: null });
  });

  async function submitCreate(type: string, name: string) {
    const user = userEvent.setup();
    render(<ProjectsPage />);
    await waitFor(() => screen.getByRole('button', { name: 'New project' }));
    await user.click(screen.getByRole('button', { name: 'New project' }));
    await screen.findByRole('dialog');
    if (type !== 'GENERAL') {
      await user.selectOptions(screen.getByLabelText('Type'), type);
    }
    await user.type(screen.getByLabelText(/Project name/), name);
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    return user;
  }

  it('turns on sprints for Engineering after the project is created', async () => {
    mocks.createProject.mockResolvedValue({ ...projectA, id: 'project-eng', type: 'ENGINEERING' });
    mocks.updateProject.mockResolvedValue({ ...projectA, id: 'project-eng', type: 'ENGINEERING', workflowMode: 'SPRINTS' });

    await submitCreate('ENGINEERING', 'Engineering Project');

    await waitFor(() => expect(mocks.updateProject).toHaveBeenCalledWith(
      'ws-1',
      'project-eng',
      { workflowMode: 'SPRINTS' },
    ));
    expect(mocks.createProject).toHaveBeenCalledWith(
      'ws-1',
      expect.objectContaining({ name: 'Engineering Project', type: 'ENGINEERING' }),
    );
    expect(await screen.findByText('Project created.')).toBeInTheDocument();
  });

  it.each(['GENERAL', 'DESIGN', 'OPERATIONS', 'MARKETING', 'HR'])(
    'does not patch the workflow for %s',
    async (type) => {
      mocks.createProject.mockResolvedValue({ ...projectA, id: `project-${type.toLowerCase()}`, type });

      await submitCreate(type, `${type} Project`);

      await waitFor(() => expect(mocks.createProject).toHaveBeenCalled());
      expect(await screen.findByText('Project created.')).toBeInTheDocument();
      expect(mocks.updateProject).not.toHaveBeenCalled();
    },
  );

  it('keeps the project and shows a settings link when the workflow patch fails', async () => {
    mocks.createProject.mockResolvedValue({ ...projectA, id: 'project-eng', type: 'ENGINEERING' });
    mocks.updateProject.mockRejectedValue(new Error('patch failed'));

    await submitCreate('ENGINEERING', 'Engineering Project');

    await waitFor(() => expect(mocks.updateProject).toHaveBeenCalled());
    expect(await screen.findByText(/The project was created, but sprints could not be turned on/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'project settings' })).toHaveAttribute(
      'href',
      '/app/projects/project-eng/settings',
    );
    expect(screen.getByText('Project created.')).toBeInTheDocument();
  });
});
