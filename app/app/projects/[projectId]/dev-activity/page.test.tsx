import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import ProjectDevActivityPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: { id: 'ws-1', name: 'WS', type: 'COMPANY', role: 'OWNER', organizationRole: null } as any,
  permissionState: null as any,
  listDevActivityCommits: vi.fn(),
  listDevActivityDevelopers: vi.fn(),
}));

function setPermissions(perms: string[]) {
  mocks.permissionState = {
    permissions: perms,
    projectRole: 'PROJECT_MANAGER',
    isLoading: false,
    accessStatus: null,
    can: (p: string) => perms.includes(p),
    canAny: (list: string[]) => list.some((p) => perms.includes(p)),
    canAll: (list: string[]) => list.every((p) => perms.includes(p)),
  };
}

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
}));
vi.mock('@/hooks/useWorkspaceRedirect', () => ({ useWorkspaceRedirect: () => undefined }));
vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({ activeWorkspace: mocks.activeWorkspace, loading: false }),
}));
vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));
vi.mock('@/services/dev-integrations', async () => {
  const actual = await vi.importActual<typeof import('@/services/dev-integrations')>('@/services/dev-integrations');
  return {
    ...actual,
    listDevActivityCommits: mocks.listDevActivityCommits,
    listDevActivityDevelopers: mocks.listDevActivityDevelopers,
  };
});

const commit = (overrides: Partial<any> = {}) => ({
  id: 'c1',
  repositoryId: 'repo-1',
  repositoryFullName: 'acme/api',
  sha: 'abcdef1234567890abcdef1234567890abcdef12',
  message: 'Fix bug\n\nMore details',
  authorName: 'Alice Name',
  authorLogin: 'alice',
  authorUser: { id: 'u1', name: 'Alice User' },
  committedAt: '2026-11-24T10:00:00.000Z',
  url: 'https://github.com/acme/api/commit/abcdef1',
  branch: 'main',
  ...overrides,
});

const devReport = (overrides: Partial<any> = {}) => ({
  range: { from: '2026-10-25T00:00:00.000Z', to: '2026-11-24T23:59:59.999Z' },
  coverageStartedAt: '2026-10-01T00:00:00.000Z',
  developers: [
    {
      type: 'workspace_user',
      user: { id: 'u1', name: 'Alice' },
      providerLogin: 'alice',
      displayName: 'Alice',
      commits: 5,
      pullRequestsOpened: 2,
      pullRequestsMerged: 1,
      reviewsGiven: 3,
    },
    {
      type: 'unmapped',
      user: null,
      providerLogin: 'ghost',
      displayName: 'ghost',
      commits: 2,
      pullRequestsOpened: 1,
      pullRequestsMerged: 0,
      reviewsGiven: 0,
    },
  ],
  ...overrides,
});

describe('ProjectDevActivityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['project.view', 'project.update']);
    mocks.listDevActivityCommits.mockResolvedValue({ items: [commit()], nextCursor: null });
    mocks.listDevActivityDevelopers.mockResolvedValue(devReport());
  });

  it('renders commits without email and shows author precedence', async () => {
    mocks.listDevActivityCommits.mockResolvedValue({
      items: [
        commit({ id: 'c1', authorUser: { id: 'u1', name: 'Alice User' }, authorName: 'Alice Name', authorLogin: 'alice' }),
        commit({ id: 'c2', authorUser: { id: 'u2', name: null }, authorName: 'Name Only', authorLogin: 'nameonly', url: null, branch: null, message: 'single line' }),
        commit({ id: 'c3', authorUser: null, authorName: null, authorLogin: 'loginonly', message: '' }),
        commit({ id: 'c4', authorUser: null, authorName: null, authorLogin: null, message: 'x' }),
      ],
      nextCursor: null,
    });
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('Alice User')).toBeInTheDocument();
    expect(screen.getByText('Name Only')).toBeInTheDocument();
    expect(screen.getByText('@loginonly')).toBeInTheDocument();
    expect(screen.getByText('Unknown author')).toBeInTheDocument();
    expect(screen.queryByText(/@example|email/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Commit abcdef1 (opens in new tab)' }).length).toBeGreaterThan(0);
    // c2 has no url -> plain code
    expect(screen.getAllByText('abcdef1').length).toBeGreaterThan(0);
    expect(screen.getByText('No commit message')).toBeInTheDocument();
  });

  it('shows message disclosure rule and branch omission', async () => {
    mocks.listDevActivityCommits.mockResolvedValue({
      items: [
        commit({ id: 'c1', message: 'short' }),
        commit({ id: 'c2', message: 'line1\nline2' }),
        commit({ id: 'c3', message: 'a'.repeat(121), branch: null }),
      ],
      nextCursor: null,
    });
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('short')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Show full message' })).toHaveLength(2);
    expect(screen.queryByText(' · null')).not.toBeInTheDocument();
  });

  it('filters reset cursor, ignore stale responses, and load more dedupes', async () => {
    const user = userEvent.setup();
    let resolveFirst: any;
    mocks.listDevActivityCommits
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce({ items: [commit({ id: 'c2', repositoryId: 'repo-2', repositoryFullName: 'acme/web' })], nextCursor: null });
    render(<ProjectDevActivityPage />);
    await user.type(screen.getByLabelText('Author login'), 'alice');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    resolveFirst({ items: [commit({ id: 'old' })], nextCursor: null });
    expect(await screen.findAllByText('acme/web')).not.toHaveLength(0);
    expect(screen.queryByText('acme/api')).not.toBeInTheDocument();

    mocks.listDevActivityCommits
      .mockResolvedValueOnce({ items: [commit({ id: 'c1' })], nextCursor: 'cursor1' })
      .mockResolvedValueOnce({ items: [commit({ id: 'c1' }), commit({ id: 'c3', sha: '9999999999999999999999999999999999999999' })], nextCursor: null });
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('button', { name: 'Load more' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getAllByText('abcdef1').length).toBeGreaterThan(0));
    expect(mocks.listDevActivityCommits).toHaveBeenLastCalledWith('ws-1', 'project-1', expect.objectContaining({ cursor: 'cursor1' }));
  });

  it('handles 404 repository filter by clearing filter and showing mapped copy', async () => {
    const user = userEvent.setup();
    mocks.listDevActivityCommits
      .mockResolvedValueOnce({ items: [commit()], nextCursor: null })
      .mockRejectedValueOnce(new ApiRequestError('Linked repository not found', 404, 'PROJECT_REPOSITORY_NOT_FOUND'));
    render(<ProjectDevActivityPage />);
    expect((await screen.findAllByText('acme/api')).length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('Repository'), 'repo-1');
    await user.click(screen.getByRole('button', { name: 'Apply filters' }));
    expect(await screen.findByText('This repository is not available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
  });

  it('shows empty states and notice in states', async () => {
    mocks.listDevActivityCommits.mockResolvedValue({ items: [], nextCursor: null });
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText(/No commits have been recorded for this project yet/)).toBeInTheDocument();
    expect(screen.getAllByText(/Showing activity from the default branch of linked repositories you can read/).length).toBeGreaterThan(0);
  });
});
