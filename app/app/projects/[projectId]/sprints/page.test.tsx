import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import SprintsPage from './page';

const push = vi.fn();
const mocks = vi.hoisted(() => ({
  activeWorkspace: null as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
  listSprints: vi.fn(),
  createSprint: vi.fn(),
  updateSprint: vi.fn(),
  startSprint: vi.fn(),
  completeSprint: vi.fn(),
  restoreSprint: vi.fn(),
}));

function setPermissions(permissions: string[]) {
  mocks.permissionState = {
    permissions,
    isLoading: false,
    accessStatus: null,
    can: (p: string) => permissions.includes(p),
    canAny: (list: string[]) => list.some((p) => permissions.includes(p)),
    canAll: (list: string[]) => list.every((p) => permissions.includes(p)),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useRouter: () => ({ push, replace: vi.fn() }),
}));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));
vi.mock('@/services/sprints', () => ({
  listSprints: mocks.listSprints,
  createSprint: mocks.createSprint,
  updateSprint: mocks.updateSprint,
  startSprint: mocks.startSprint,
  completeSprint: mocks.completeSprint,
  restoreSprint: mocks.restoreSprint,
}));

const sprint = (overrides: Record<string, unknown> = {}) => ({
  id: 'sprint-1', projectId: 'project-1', name: 'Sprint Alpha', goal: 'Ship the API',
  startDate: '2026-11-01T00:00:00.000Z', endDate: '2026-11-14T00:00:00.000Z',
  status: 'PLANNED', createdById: 'user-1', completedAt: null, completedById: null,
  createdAt: '2026-10-31T00:00:00.000Z', updatedAt: '2026-10-31T00:00:00.000Z',
  ...overrides,
});

const MANAGER = ['project.view', 'project.update', 'task.view', 'task.update'];
const VIEWER = ['project.view', 'task.view'];
const BACKEND_ERRORS = [
  [403, 'PERMISSION_DENIED', 'Backend 403 message'],
  [404, 'PROJECT_NOT_FOUND', 'Backend 404 message'],
  [409, 'SPRINTS_DISABLED_FOR_PROJECT', 'Sprints are turned off for this project.'],
] as const;

describe('SprintsPage — list and lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(MANAGER);
    mocks.activeWorkspace = { id: 'ws-1', name: 'Alpha', type: 'COMPANY', role: 'OWNER', organizationRole: null };
    mocks.listSprints.mockResolvedValue({ items: [sprint()], nextCursor: null });
    mocks.createSprint.mockResolvedValue(sprint());
    mocks.updateSprint.mockResolvedValue(sprint());
    mocks.startSprint.mockResolvedValue(sprint({ status: 'ACTIVE' }));
    mocks.completeSprint.mockResolvedValue({
      sprint: sprint({ status: 'COMPLETED' }), movedTaskCount: 4, archivedUnfinishedMovedCount: 1,
      destination: { type: 'BACKLOG', nextSprintId: null },
    });
    mocks.restoreSprint.mockResolvedValue(sprint());
  });

  it('renders sprints and board links (View permission)', async () => {
    setPermissions(VIEWER);
    render(<SprintsPage />);
    expect(await screen.findByText('Sprint Alpha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open board' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create sprint' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument();
  });

  it('hides create, edit, start and complete controls from a view-only member', async () => {
    setPermissions(VIEWER);
    mocks.listSprints.mockResolvedValue({
      items: [sprint(), sprint({ id: 'sprint-2', name: 'Sprint Beta', status: 'ACTIVE' })],
      nextCursor: null,
    });
    render(<SprintsPage />);

    await screen.findByText('Sprint Alpha');
    expect(screen.queryByRole('button', { name: 'Create sprint' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start sprint' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument();
  });

  it('opens the board for the selected sprint', async () => {
    const user = userEvent.setup();
    render(<SprintsPage />);
    await screen.findByText('Sprint Alpha');
    await user.click(screen.getByRole('button', { name: 'Open board' }));
    expect(push).toHaveBeenCalledWith('/app/projects/project-1/sprints/sprint-1');
  });

  it('shows lifecycle controls only to managers', async () => {
    render(<SprintsPage />);
    expect(await screen.findByRole('button', { name: 'Create sprint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start sprint' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Complete sprint' })).not.toBeInTheDocument();
  });

  it('creates a sprint without ever sending sprintPosition', async () => {
    const user = userEvent.setup();
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Sprint name/), 'Sprint Beta');
    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));

    await waitFor(() => expect(mocks.createSprint).toHaveBeenCalledOnce());
    const body = mocks.createSprint.mock.calls[0][2];
    expect(body).toMatchObject({ name: 'Sprint Beta' });
    expect(body).not.toHaveProperty('sprintPosition');
  });

  it('edits a PLANNED sprint', async () => {
    const user = userEvent.setup();
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/^Sprint name/);
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed Sprint');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mocks.updateSprint).toHaveBeenCalledWith(
      'ws-1', 'project-1', 'sprint-1', expect.objectContaining({ name: 'Renamed Sprint' }),
    ));
  });

  it('starts a PLANNED sprint', async () => {
    const user = userEvent.setup();
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Start sprint' }));
    await waitFor(() => expect(mocks.startSprint).toHaveBeenCalledWith('ws-1', 'project-1', 'sprint-1'));
  });

  it('completes an ACTIVE sprint to BACKLOG and reloads the list', async () => {
    const user = userEvent.setup();
    mocks.listSprints.mockResolvedValue({ items: [sprint({ status: 'ACTIVE' })], nextCursor: null });
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    await waitFor(() => expect(mocks.completeSprint).toHaveBeenCalledWith(
      'ws-1', 'project-1', 'sprint-1', { target: 'BACKLOG' },
    ));
    expect(await screen.findByText('Sprint completed.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('completes an ACTIVE sprint to NEXT_SPRINT with the selected target', async () => {
    const user = userEvent.setup();
    mocks.listSprints.mockResolvedValue({
      items: [sprint({ status: 'ACTIVE' }), sprint({ id: 'sprint-2', name: 'Sprint Beta' })],
      nextCursor: null,
    });
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Destination for unfinished tasks'), 'NEXT_SPRINT');
    await user.selectOptions(within(dialog).getByLabelText('Target sprint'), 'sprint-2');
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    await waitFor(() => expect(mocks.completeSprint).toHaveBeenCalledWith(
      'ws-1', 'project-1', 'sprint-1', { target: 'NEXT_SPRINT', nextSprintId: 'sprint-2' },
    ));
  });

  it.each([
    [403, 'PERMISSION_DENIED', 'You cannot view sprints here'],
    [404, 'PROJECT_NOT_FOUND', 'Project not found'],
    [409, 'SPRINTS_DISABLED_FOR_PROJECT', 'Sprints are turned off for this project.'],
  ])('shows the user-facing copy on %i (%s)', async (status, code, message) => {
    mocks.listSprints.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintsPage />);
    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it('shows mapped copy instead of a backend 409 message when creating fails', async () => {
    const user = userEvent.setup();
    mocks.createSprint.mockRejectedValueOnce(new ApiRequestError('Sprints disabled for this project', 409, 'SPRINTS_DISABLED_FOR_PROJECT'));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Sprint name/), 'Sprint Beta');
    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));
    expect(await screen.findByText('Sprints are turned off for this project.')).toBeInTheDocument();
    expect(screen.queryByText('Sprints disabled for this project')).not.toBeInTheDocument();
  });

  it.each(BACKEND_ERRORS)('shows the backend message on %i when creating', async (status, code, message) => {
    const user = userEvent.setup();
    mocks.createSprint.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Sprint name/), 'Sprint Beta');
    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it.each(BACKEND_ERRORS)('shows the backend message on %i when editing', async (status, code, message) => {
    const user = userEvent.setup();
    mocks.updateSprint.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Edit' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it.each(BACKEND_ERRORS)('shows the backend message on %i when starting', async (status, code, message) => {
    const user = userEvent.setup();
    mocks.startSprint.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Start sprint' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it.each(BACKEND_ERRORS)('shows the backend message on %i when completing', async (status, code, message) => {
    const user = userEvent.setup();
    mocks.listSprints.mockResolvedValue({ items: [sprint({ status: 'ACTIVE' })], nextCursor: null });
    mocks.completeSprint.mockRejectedValueOnce(new ApiRequestError(message, status, code));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Complete sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Complete sprint' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    if (status === 409) {
      expect(screen.getByText('Complete sprint', { selector: 'h2' })).toBeInTheDocument();
    }
  });

  it('renders mapped copy without a raw code or stage-2 text for known errors', async () => {
    const user = userEvent.setup();
    mocks.startSprint.mockRejectedValueOnce(new ApiRequestError(
      'Stage 2 start blocked (SPRINT_NOT_STARTABLE)',
      409,
      'SPRINT_NOT_STARTABLE',
    ));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Start sprint' }));

    expect(await screen.findByText('Only planned sprints can be started.')).toBeInTheDocument();
    expect(screen.queryByText(/stage 2/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/SPRINT_NOT_STARTABLE/)).not.toBeInTheDocument();
  });

  it('shows the view-only empty state with no button of any kind', async () => {
    setPermissions(VIEWER);
    mocks.listSprints.mockResolvedValue({ items: [], nextCursor: null });
    render(<SprintsPage />);

    expect(await screen.findByText('No sprints yet. A project manager can create one.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('keeps the manager empty-state copy and create action', async () => {
    mocks.listSprints.mockResolvedValue({ items: [], nextCursor: null });
    render(<SprintsPage />);

    expect(await screen.findByText('Create your first sprint to start planning work.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Create sprint' }).length).toBeGreaterThan(0);
  });

  it('renders one status label per card and no duplicate Status row', async () => {
    render(<SprintsPage />);

    expect(await screen.findByText('Sprint Alpha')).toBeInTheDocument();
    expect(screen.getAllByText('Planned')).toHaveLength(1);
    expect(screen.queryByText(/Status:/)).not.toBeInTheDocument();
  });

  it('appends the next page with nextCursor without duplicating cards', async () => {
    const user = userEvent.setup();
    mocks.listSprints
      .mockResolvedValueOnce({ items: [sprint()], nextCursor: 'cursor-2' })
      .mockResolvedValueOnce({
        items: [
          sprint(),
          sprint({ id: 'sprint-2', name: 'Sprint Beta', status: 'ACTIVE' }),
        ],
        nextCursor: null,
      });
    render(<SprintsPage />);
    await screen.findByText('Sprint Alpha');

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Sprint Beta')).toBeInTheDocument();
    expect(screen.getAllByText('Sprint Alpha')).toHaveLength(1);
    expect(mocks.listSprints).toHaveBeenLastCalledWith('ws-1', 'project-1', { cursor: 'cursor-2' });
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('shows a load-more error below the grid with an unknown code', async () => {
    const user = userEvent.setup();
    mocks.listSprints
      .mockResolvedValueOnce({ items: [sprint()], nextCursor: 'cursor-2' })
      .mockRejectedValueOnce(new ApiRequestError('Backend page failed', 500, 'PAGE_FAILED'));
    render(<SprintsPage />);
    await screen.findByText('Sprint Alpha');

    await user.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Backend page failed')).toBeInTheDocument();
  });

  it('keeps mapped dialog errors visible inside the open modal', async () => {
    const user = userEvent.setup();
    mocks.createSprint.mockRejectedValueOnce(new ApiRequestError(
      'Stage 2 creation blocked',
      409,
      'SPRINTS_DISABLED_FOR_PROJECT',
    ));
    render(<SprintsPage />);
    await user.click(await screen.findByRole('button', { name: 'Create sprint' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Sprint name/), 'Sprint Beta');
    await user.click(within(dialog).getByRole('button', { name: 'Create sprint' }));

    expect(await within(dialog).findByText('Sprints are turned off for this project.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(screen.queryByText('Stage 2 creation blocked')).not.toBeInTheDocument();
  });

  it('groups planned and active first with completed and archived in a collapsed History group', async () => {
    mocks.listSprints.mockResolvedValue({
      items: [
        sprint({ id: 'done', name: 'Old Done', status: 'COMPLETED' }),
        sprint({ id: 'live', name: 'Live Sprint', status: 'ACTIVE' }),
        sprint({ id: 'next', name: 'Next Sprint', status: 'PLANNED' }),
      ],
      nextCursor: null,
    });
    render(<SprintsPage />);

    await screen.findByText('Old Done');
    const names = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(names.indexOf('Next Sprint')).toBeLessThan(names.indexOf('Live Sprint'));
    expect(names.indexOf('Live Sprint')).toBeLessThan(names.indexOf('Old Done'));
    expect(screen.getByText('History').closest('details')).not.toHaveAttribute('open');
  });
});
