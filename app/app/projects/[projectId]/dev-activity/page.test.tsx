import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import ProjectDevActivityPage from './page';

const mocks = vi.hoisted(() => ({
  activeWorkspace: { id: 'ws-1', name: 'WS', type: 'COMPANY', role: 'OWNER', organizationRole: null } as null | { id: string; name: string; type: string; role: string; organizationRole: null },
  permissionState: null as unknown,
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

const commit = (overrides: Record<string, unknown> = {}) => ({
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

const devReport = (overrides: Record<string, unknown> = {}) => ({
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
    let resolveFirst!: (value: { items: unknown[]; nextCursor: string | null }) => void;
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

describe('Developer report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['project.view', 'project.update']);
    mocks.listDevActivityCommits.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listDevActivityDevelopers.mockResolvedValue(devReport());
  });

  it('is hidden for non-managers with no element of any kind', async () => {
    setPermissions(['project.view']);
    render(<ProjectDevActivityPage />);
    await screen.findByText('No commits have been recorded for this project yet.');
    expect(screen.queryByText('Developer activity')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    expect(screen.queryByText('How these counts work')).not.toBeInTheDocument();
    expect(mocks.listDevActivityDevelopers).not.toHaveBeenCalled();
  });

  it('uses default 30 day range and validates range with no request sent', async () => {
    const user = userEvent.setup();
    render(<ProjectDevActivityPage />);
    await screen.findByRole('heading', { name: 'Developer activity' });
    // default 30 day range: first call should have from ~30 days before to
    const firstCall = mocks.listDevActivityDevelopers.mock.calls[0][2];
    const from = new Date(firstCall.from).getTime();
    const to = new Date(firstCall.to).getTime();
    const days = (to - from) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);

    const callsBefore = mocks.listDevActivityDevelopers.mock.calls.length;
    await user.clear(screen.getByLabelText('Start date'));
    await user.clear(screen.getByLabelText('End date'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('Select a start and end date.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Start date'), '2026-11-20');
    await user.type(screen.getByLabelText('End date'), '2026-11-10');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('The start date must be before the end date.')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Start date'));
    await user.clear(screen.getByLabelText('End date'));
    await user.type(screen.getByLabelText('Start date'), '2026-01-01');
    await user.type(screen.getByLabelText('End date'), '2026-05-01');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('Choose a range of 90 days or less.')).toBeInTheDocument();

    expect(mocks.listDevActivityDevelopers.mock.calls.length).toBe(callsBefore);
  });

  it('renders mapped and unmapped rows, sort, coverage, disclosure, and empty state', async () => {
    const user = userEvent.setup();
    render(<ProjectDevActivityPage />);
    expect((await screen.findAllByText('Alice')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('@ghost').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unmapped').length).toBeGreaterThan(0);
    expect(screen.getAllByTitle('This GitHub account is not linked to a workspace member.').length).toBeGreaterThan(0);
    expect(screen.getByText(/Activity is counted from/)).toBeInTheDocument();

    const commitsSort = screen.getByRole('button', { name: 'Commits' });
    expect(commitsSort.closest('th')).toHaveAttribute('aria-sort', 'descending');
    await user.click(commitsSort);
    expect(commitsSort.closest('th')).toHaveAttribute('aria-sort', 'ascending');

    const disclosure = screen.getByRole('button', { name: 'How these counts work' });
    await user.click(disclosure);
    expect(screen.getByText('Merge commits are counted.')).toBeInTheDocument();
    expect(screen.getByText('Force-pushes can leave rewritten history in the counts.')).toBeInTheDocument();
    expect(screen.getByText('Partial push truncation is not detected.')).toBeInTheDocument();
    expect(screen.getByText('History starts when the repository was connected and is not backfilled.')).toBeInTheDocument();
  });

  it('shows coverage null and empty range state', async () => {
    mocks.listDevActivityDevelopers.mockResolvedValue(devReport({ coverageStartedAt: null, developers: [] }));
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('No activity has been recorded yet.')).toBeInTheDocument();
    expect(screen.getByText('No developer activity in this range.')).toBeInTheDocument();
    expect(screen.getByText('How these counts work')).toBeInTheDocument();
  });

  it('handles 403 and 404 mapped copy', async () => {
    mocks.listDevActivityDevelopers.mockRejectedValueOnce(new ApiRequestError('Forbidden', 403, 'PERMISSION_DENIED'));
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('You do not have access to this report.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();

    vi.clearAllMocks();
    setPermissions(['project.view', 'project.update']);
    mocks.listDevActivityCommits.mockResolvedValue({ items: [], nextCursor: null });
    mocks.listDevActivityDevelopers.mockRejectedValueOnce(new ApiRequestError('Not found', 404, 'PROJECT_REPOSITORY_NOT_FOUND'));
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('This repository is not available.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});

describe('Accessibility and polish', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setPermissions(['project.view', 'project.update']);
    mocks.listDevActivityCommits.mockResolvedValue({ items: [commit()], nextCursor: 'c2' });
    mocks.listDevActivityDevelopers.mockResolvedValue(devReport());
  });

  it('has status/error roles and keyboard-operable controls', async () => {
    const user = userEvent.setup();
    mocks.listDevActivityCommits
      .mockResolvedValueOnce({ items: [commit()], nextCursor: 'c2' })
      .mockRejectedValueOnce(new ApiRequestError('bad', 500, 'INTERNAL'));
    render(<ProjectDevActivityPage />);
    expect(await screen.findByRole('button', { name: 'Load more' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('bad');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();

    // disclosure keyboard operable
    const disclosure = screen.getByRole('button', { name: 'How these counts work' });
    disclosure.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Merge commits are counted.')).toBeInTheDocument();
  });

  it('mobile developer cards include sort controls and all fields', async () => {
    render(<ProjectDevActivityPage />);
    expect(await screen.findByText('Developer activity summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort by')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ascending|Descending/ })).toBeInTheDocument();
    // card fields present
    expect(screen.getAllByText('PRs opened').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PRs merged').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Reviews given').length).toBeGreaterThan(0);
  });
});
