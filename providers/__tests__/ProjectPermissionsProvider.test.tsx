import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ProjectPermissionsProvider,
  usePermissions,
} from '../ProjectPermissionsProvider';
import type { ProjectPermissions } from '@/services/projects';

const mocks = vi.hoisted(() => ({
  getProjectPermissions: vi.fn(),
  listProjectRoles: vi.fn(),
  onPermissionDenied: vi.fn(),
}));

vi.mock('@/services/projects', () => ({
  getProjectPermissions: mocks.getProjectPermissions,
  listProjectRoles: mocks.listProjectRoles,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, onPermissionDenied: mocks.onPermissionDenied };
});

function permissionsPayload(overrides: Partial<ProjectPermissions> = {}): ProjectPermissions {
  return {
    projectId: 'project-1',
    workspaceRole: 'MEMBER',
    projectRole: 'MEMBER',
    accessSource: 'project_member',
    permissions: ['project.view', 'task.view', 'task.create'],
    assignableRoles: [],
    ...overrides,
  };
}

function Probe() {
  const { can, canAny, canAll, projectRole, isLoading, accessStatus, error, refresh } = usePermissions();
  return (
    <div>
      <p>{isLoading ? 'loading' : 'ready'}</p>
      <p>role: {projectRole ?? 'none'}</p>
      <p>view: {String(can('project.view'))}</p>
      <p>delete: {String(can('project.delete'))}</p>
      <p>any: {String(canAny(['project.delete', 'task.view']))}</p>
      <p>all: {String(canAll(['project.view', 'task.view']))}</p>
      <p>access: {accessStatus ?? 'none'}</p>
      <p>error: {error ?? 'none'}</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

function renderProvider(projectId = 'project-1') {
  return render(
    <ProjectPermissionsProvider workspaceId="ws-1" projectId={projectId}>
      <Probe />
    </ProjectPermissionsProvider>,
  );
}

describe('ProjectPermissionsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProjectPermissions.mockResolvedValue(permissionsPayload());
    mocks.listProjectRoles.mockResolvedValue([
      { role: 'MEMBER', label: 'Member', description: '', permissions: ['project.view', 'task.view'] },
    ]);
    mocks.onPermissionDenied.mockReturnValue(vi.fn());
  });

  it('exposes the backend permissions through can, canAny, and canAll', async () => {
    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('role: MEMBER')).toBeInTheDocument();
    expect(screen.getByText('view: true')).toBeInTheDocument();
    expect(screen.getByText('delete: false')).toBeInTheDocument();
    expect(screen.getByText('any: true')).toBeInTheDocument();
    expect(screen.getByText('all: true')).toBeInTheDocument();
    expect(mocks.getProjectPermissions).toHaveBeenCalledWith('ws-1', 'project-1');
  });

  it('treats permissions as denied while the fetch is in flight', async () => {
    let resolve: (value: ProjectPermissions) => void = () => {};
    mocks.getProjectPermissions.mockReturnValue(new Promise((r) => { resolve = r; }));

    renderProvider();

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(screen.getByText('view: false')).toBeInTheDocument();
    expect(screen.getByText('all: false')).toBeInTheDocument();

    await act(async () => { resolve(permissionsPayload()); });

    await waitFor(() => expect(screen.getByText('ready')).toBeInTheDocument());
    expect(screen.getByText('view: true')).toBeInTheDocument();
  });

  it('fails closed when the backend returns an empty permission payload', async () => {
    mocks.getProjectPermissions.mockResolvedValue(
      permissionsPayload({ permissions: [], projectRole: null, assignableRoles: [] }),
    );

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('role: none')).toBeInTheDocument();
    expect(screen.getByText('view: false')).toBeInTheDocument();
    expect(screen.getByText('delete: false')).toBeInTheDocument();
  });

  it('surfaces a 403 permissions response without granting anything', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.getProjectPermissions.mockRejectedValue(new ApiRequestError('Forbidden', 403));

    renderProvider();

    await waitFor(() => expect(screen.getByText('access: 403')).toBeInTheDocument());
    expect(screen.getByText('view: false')).toBeInTheDocument();
    expect(screen.getByText('role: none')).toBeInTheDocument();
  });

  it('surfaces a 404 permissions response without crashing', async () => {
    const { ApiRequestError } = await import('@/lib/api');
    mocks.getProjectPermissions.mockRejectedValue(new ApiRequestError('Not found', 404));

    renderProvider();

    await waitFor(() => expect(screen.getByText('access: 404')).toBeInTheDocument());
    expect(screen.getByText('error: none')).toBeInTheDocument();
  });

  it('re-fetches permissions when the backend reports PERMISSION_DENIED', async () => {
    let permissionDenied: (() => void) | undefined;
    mocks.onPermissionDenied.mockImplementation((listener: () => void) => {
      permissionDenied = listener;
      return vi.fn();
    });

    renderProvider();
    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(mocks.getProjectPermissions).toHaveBeenCalledTimes(1);

    mocks.getProjectPermissions.mockResolvedValue(
      permissionsPayload({ permissions: [], projectRole: 'VIEWER' }),
    );
    await act(async () => { permissionDenied?.(); });

    await waitFor(() => expect(mocks.getProjectPermissions).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('role: VIEWER')).toBeInTheDocument());
    expect(screen.getByText('view: false')).toBeInTheDocument();
  });

  it('re-fetches when the project changes and clears the previous permissions first', async () => {
    const view = renderProvider('project-1');
    expect(await screen.findByText('view: true')).toBeInTheDocument();

    mocks.getProjectPermissions.mockResolvedValue(
      permissionsPayload({ projectId: 'project-2', permissions: [] }),
    );
    view.rerender(
      <ProjectPermissionsProvider workspaceId="ws-1" projectId="project-2">
        <Probe />
      </ProjectPermissionsProvider>,
    );

    await waitFor(() =>
      expect(mocks.getProjectPermissions).toHaveBeenLastCalledWith('ws-1', 'project-2'),
    );
    await waitFor(() => expect(screen.getByText('view: false')).toBeInTheDocument());
  });

  it('keeps permissions usable when the role catalogue fails', async () => {
    mocks.listProjectRoles.mockRejectedValue(new Error('catalogue unavailable'));

    renderProvider();

    expect(await screen.findByText('ready')).toBeInTheDocument();
    expect(screen.getByText('view: true')).toBeInTheDocument();
  });

  it('throws when used outside the provider so access cannot default to allow', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('usePermissions must be used inside ProjectPermissionsProvider');
    consoleError.mockRestore();
  });
});
