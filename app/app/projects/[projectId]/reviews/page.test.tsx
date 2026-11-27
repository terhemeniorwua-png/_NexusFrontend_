import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';
import type { ReviewView } from '@/services/reviews';
import ProjectReviewsPage from './page';

const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; email: string },
  permissionState: null as unknown,
  listReviews: vi.fn(),
  getReview: vi.fn(),
  createReview: vi.fn(),
  assignReview: vi.fn(),
  startReview: vi.fn(),
  resubmitReview: vi.fn(),
  approveReview: vi.fn(),
  rejectReview: vi.fn(),
  requestChangesReview: vi.fn(),
  listWorkspaceMembers: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/app/projects/project-1/reviews',
}));

vi.mock('@/hooks/useWorkspaceRedirect', () => ({
  useWorkspaceRedirect: () => 'ws-1',
}));

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => ({
    activeWorkspace: { id: 'ws-1', name: 'Test Workspace' },
    user: mocks.user,
    loading: false,
  }),
}));

vi.mock('@/providers/ProjectPermissionsProvider', () => ({
  usePermissions: () => mocks.permissionState,
}));

vi.mock('@/services/reviews', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/reviews')>();
  return { ...actual, ...mocks };
});

vi.mock('@/services/workspaces', () => ({
  listWorkspaceMembers: mocks.listWorkspaceMembers,
}));

const MEMBERS = [
  { userId: 'user-1', name: 'Alice', email: 'alice@example.com' },
  { userId: 'user-2', name: 'Bob', email: 'bob@example.com' },
  { userId: 'user-3', name: 'Carol', email: 'carol@example.com' },
];

const BASE_REVIEW: ReviewView = {
  id: 'review-1',
  workspaceId: 'ws-1',
  projectId: 'project-1',
  resource: { kind: 'attachmentVersion', id: 'version-1' },
  status: 'SUBMITTED',
  round: 2,
  assigneeId: null,
  submittedById: 'user-1',
  submittedAt: '2026-11-20T10:00:00.000Z',
  checklistRevision: null,
  lastDecision: null,
  stale: false,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

function makeReview(overrides: Partial<ReviewView> = {}): ReviewView {
  return { ...BASE_REVIEW, ...overrides };
}

function setPermissions(permissions: string[]): void {
  mocks.permissionState = {
    permissions,
    projectRole: 'PROJECT_MANAGER',
    workspaceRole: 'MEMBER',
    accessSource: 'project_member',
    assignableRoles: [],
    roleDefinitions: [
      {
        role: 'PROJECT_MANAGER',
        label: 'Project Manager',
        description: '',
        permissions: ['submission.review', 'submission.approve', 'submission.reject', 'submission.request_revision'],
      },
    ],
    isLoading: false,
    accessStatus: null,
    error: null,
    can: (permission: string) => permissions.includes(permission),
    canAny: (list: string[]) => list.some((permission) => permissions.includes(permission)),
    canAll: (list: string[]) => list.every((permission) => permissions.includes(permission)),
    refresh: vi.fn(),
  };
}

const ALL_REVIEW_PERMISSIONS = [
  'project.view',
  'submission.submit',
  'submission.review',
  'submission.approve',
  'submission.reject',
  'submission.request_revision',
];

async function renderPage(): Promise<void> {
  render(<ProjectReviewsPage />);
  expect(await screen.findByRole('list', { name: 'Submission reviews' })).toBeInTheDocument();
}

async function openFirstReview(
  user: ReturnType<typeof userEvent.setup>,
  expectedLabel = 'Attachment version',
): Promise<void> {
  const list = screen.getByRole('list', { name: 'Submission reviews' });
  await user.click(within(list).getAllByRole('button')[0]);
  expect(
    await screen.findByRole('heading', { name: new RegExp(`${expectedLabel} · Round`) }),
  ).toBeInTheDocument();
}

describe('ProjectReviewsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user = { id: 'user-2', name: 'Bob', email: 'bob@example.com' };
    setPermissions(ALL_REVIEW_PERMISSIONS);
    mocks.listReviews.mockResolvedValue({ items: [makeReview()], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: makeReview() });
    mocks.createReview.mockResolvedValue({ review: makeReview() });
    mocks.assignReview.mockResolvedValue({ review: makeReview({ assigneeId: 'user-3' }) });
    mocks.startReview.mockResolvedValue({ review: makeReview({ status: 'UNDER_REVIEW' }) });
    mocks.resubmitReview.mockResolvedValue({ review: makeReview({ status: 'SUBMITTED', round: 3 }) });
    mocks.approveReview.mockResolvedValue({
      review: makeReview({ status: 'APPROVED' }),
      decision: { id: 'decision-1', reviewId: 'review-1', round: 2, decision: 'APPROVED', note: null, decidedById: 'user-2', decidedAt: '2026-11-21T10:00:00.000Z' },
    });
    mocks.rejectReview.mockResolvedValue({
      review: makeReview({ status: 'CHANGES_REQUESTED' }),
      decision: { id: 'decision-1', reviewId: 'review-1', round: 2, decision: 'REJECTED', note: 'Needs work', decidedById: 'user-2', decidedAt: '2026-11-21T10:00:00.000Z' },
    });
    mocks.requestChangesReview.mockResolvedValue({
      review: makeReview({ status: 'CHANGES_REQUESTED' }),
      decision: { id: 'decision-1', reviewId: 'review-1', round: 2, decision: 'CHANGES_REQUESTED', note: 'Please revise', decidedById: 'user-2', decidedAt: '2026-11-21T10:00:00.000Z' },
    });
    mocks.listWorkspaceMembers.mockResolvedValue(MEMBERS);
  });

  it('lists reviews and appends the next cursor page', async () => {
    const user = userEvent.setup();
    mocks.listReviews
      .mockResolvedValueOnce({ items: [makeReview()], nextCursor: 'cursor-1' })
      .mockResolvedValue({
        items: [makeReview({ id: 'review-2', resource: { kind: 'checklist', id: 'cl-1', revision: 4 }, round: 1 })],
        nextCursor: null,
      });

    await renderPage();

    expect(mocks.listReviews).toHaveBeenNthCalledWith(1, 'ws-1', 'project-1', {
      status: undefined,
      cursor: undefined,
      limit: 25,
    });
    expect(screen.getByText('Attachment version · Round 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load more reviews' }));

    await waitFor(() => expect(mocks.listReviews).toHaveBeenCalledWith('ws-1', 'project-1', {
      status: undefined,
      cursor: 'cursor-1',
      limit: 25,
    }));
    expect(await screen.findByText('Checklist · Round 1')).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Submission reviews' })).getAllByRole('button')).toHaveLength(2);
  });

  it('refetches with the selected status filter', async () => {
    await renderPage();
    const callsBefore = mocks.listReviews.mock.calls.length;

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'APPROVED' } });

    await waitFor(() => expect(mocks.listReviews.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(mocks.listReviews).toHaveBeenLastCalledWith('ws-1', 'project-1', {
      status: 'APPROVED',
      cursor: undefined,
      limit: 25,
    });
  });

  it('shows decision controls only to permitted non-submitters', async () => {
    const user = userEvent.setup();
    await renderPage();
    await openFirstReview(user);

    expect(screen.getByRole('button', { name: 'Start review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeInTheDocument();
  });

  it('hides decision controls from the submitter', async () => {
    const user = userEvent.setup();
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    await renderPage();
    await openFirstReview(user);

    expect(screen.getByRole('heading', { name: /Attachment version · Round 2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start review' })).not.toBeInTheDocument();
  });

  it('hides all mutation controls from viewers', async () => {
    const user = userEvent.setup();
    setPermissions(['project.view']);
    await renderPage();
    await openFirstReview(user);

    expect(screen.getByRole('heading', { name: /Attachment version · Round 2/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Assign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resubmit' })).not.toBeInTheDocument();
  });

  it('requires a non-blank note of at most 2000 characters for rejection and sends the displayed round', async () => {
    const user = userEvent.setup();
    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Reject' }));

    const dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Reject' });
    const note = within(dialog).getByLabelText('Note');
    expect(confirm).toBeDisabled();

    await user.type(note, '   ');
    expect(confirm).toBeDisabled();

    fireEvent.change(note, { target: { value: 'x'.repeat(2001) } });
    expect(confirm).toBeDisabled();

    await user.clear(note);
    await user.type(note, 'Needs work');
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(mocks.rejectReview).toHaveBeenCalledWith('ws-1', 'project-1', 'review-1', {
      round: 2,
      note: 'Needs work',
    }));
  });

  it('allows an optional approval note and sends the displayed round', async () => {
    const user = userEvent.setup();
    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Approve' })).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(mocks.approveReview).toHaveBeenCalledWith('ws-1', 'project-1', 'review-1', { round: 2 }));
  });

  it('sends a supplied approval note with the displayed round', async () => {
    const user = userEvent.setup();
    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Approve' }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Note'), 'Looks good');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(mocks.approveReview).toHaveBeenCalledWith('ws-1', 'project-1', 'review-1', {
      round: 2,
      note: 'Looks good',
    }));
  });

  it('sends the displayed round when the submitter resubmits a changes-requested review', async () => {
    const user = userEvent.setup();
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    const changesRequested = makeReview({ status: 'CHANGES_REQUESTED' });
    mocks.listReviews.mockResolvedValue({ items: [changesRequested], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: changesRequested });

    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Resubmit' }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Resubmit' }));

    await waitFor(() => expect(mocks.resubmitReview).toHaveBeenCalledWith('ws-1', 'project-1', 'review-1', 2));
  });

  it('surfaces STALE_ROUND and refetches the review and list', async () => {
    const user = userEvent.setup();
    mocks.approveReview.mockRejectedValue(new ApiRequestError('Round is stale', 409, 'STALE_ROUND'));
    mocks.getReview
      .mockResolvedValueOnce({ review: makeReview() })
      .mockResolvedValue({ review: makeReview({ round: 3, status: 'APPROVED' }) });

    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    const listCallsBefore = mocks.listReviews.mock.calls.length;
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Round is stale')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getReview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.listReviews.mock.calls.length).toBeGreaterThan(listCallsBefore));
    expect(await screen.findByRole('heading', { name: /Attachment version · Round 3/ })).toBeInTheDocument();
  });

  it('surfaces CHECKLIST_REVISION_STALE on resubmit and refetches the review and list', async () => {
    const user = userEvent.setup();
    mocks.user = { id: 'user-1', name: 'Alice', email: 'alice@example.com' };
    const changesRequested = makeReview({ status: 'CHANGES_REQUESTED' });
    mocks.listReviews.mockResolvedValue({ items: [changesRequested], nextCursor: null });
    mocks.getReview
      .mockResolvedValueOnce({ review: changesRequested })
      .mockResolvedValue({ review: makeReview({ status: 'SUBMITTED', round: 3, stale: true }) });
    mocks.resubmitReview.mockRejectedValue(
      new ApiRequestError('Checklist revision changed', 409, 'CHECKLIST_REVISION_STALE'),
    );

    await renderPage();
    await openFirstReview(user);
    await user.click(screen.getByRole('button', { name: 'Resubmit' }));
    const listCallsBefore = mocks.listReviews.mock.calls.length;
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Resubmit' }));

    expect(await screen.findByText('Checklist revision changed')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getReview).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.listReviews.mock.calls.length).toBeGreaterThan(listCallsBefore));
    expect(await screen.findByText('This review is stale')).toBeInTheDocument();
  });

  it('renders reviews with missing optional fields and no decision history', async () => {
    const user = userEvent.setup();
    const legacy = makeReview({
      submittedById: 'user-9',
      submittedAt: undefined,
      assigneeId: null,
      checklistRevision: undefined,
      lastDecision: undefined,
      stale: undefined,
      workspaceId: undefined,
      projectId: undefined,
      createdAt: undefined,
      updatedAt: undefined,
    });
    mocks.listReviews.mockResolvedValue({ items: [legacy], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: legacy });

    await renderPage();
    await openFirstReview(user);

    expect(screen.getByRole('heading', { name: /Attachment version · Round 2/ })).toBeInTheDocument();
    expect(screen.getByText('No decision recorded yet.')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('Unknown user')).toBeInTheDocument();
  });

  it('renders a task review with safe artwork and decisions', async () => {
    const user = userEvent.setup();
    const taskReview = makeReview({
      resource: { kind: 'task', id: 'task-1' },
      taskId: 'task-1',
      artworkUrl: 'https://example.com/art.png',
      decisions: ['Approve hero', 'Check spacing'],
    });
    mocks.listReviews.mockResolvedValue({ items: [taskReview], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: taskReview });

    await renderPage();
    await openFirstReview(user, 'Task');

    expect(screen.getByRole('heading', { name: /Task · Round 2/ })).toBeInTheDocument();
    expect(screen.getByText('Task ID')).toBeInTheDocument();
    expect(screen.getByText('task-1')).toBeInTheDocument();
    const artwork = screen.getByRole('link', { name: 'https://example.com/art.png' });
    expect(artwork).toHaveAttribute('href', 'https://example.com/art.png');
    expect(artwork).toHaveAttribute('target', '_blank');
    expect(artwork).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByText('Approve hero')).toBeInTheDocument();
    expect(screen.getByText('Check spacing')).toBeInTheDocument();
  });

  it('does not render an unsafe artwork URL as a link', async () => {
    const user = userEvent.setup();
    const taskReview = makeReview({
      resource: { kind: 'task', id: 'task-2' },
      taskId: 'task-2',
      artworkUrl: 'javascript:alert(1)',
      decisions: ['Review copy'],
    });
    mocks.listReviews.mockResolvedValue({ items: [taskReview], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: taskReview });

    await renderPage();
    await openFirstReview(user, 'Task');

    expect(screen.queryByRole('link', { name: /javascript:alert/ })).not.toBeInTheDocument();
    expect(screen.getByText('Review copy')).toBeInTheDocument();
  });

  it('renders checklist reviews exactly as before', async () => {
    const user = userEvent.setup();
    const checklistReview = makeReview({
      resource: { kind: 'checklist', id: 'checklist-1', revision: 4 },
      checklistRevision: 4,
    });
    mocks.listReviews.mockResolvedValue({ items: [checklistReview], nextCursor: null });
    mocks.getReview.mockResolvedValue({ review: checklistReview });

    await renderPage();
    await openFirstReview(user, 'Checklist');

    expect(screen.getByRole('heading', { name: /Checklist · Round 2/ })).toBeInTheDocument();
    expect(screen.getByText('Target ID')).toBeInTheDocument();
    expect(screen.getByText('checklist-1')).toBeInTheDocument();
    expect(screen.queryByText('Task ID')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /example.com/ })).not.toBeInTheDocument();
  });
});
