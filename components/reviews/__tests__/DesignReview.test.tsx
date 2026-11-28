import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequestDesignReviewDialog } from '../RequestDesignReviewDialog';
import { DesignReviewPanel } from '../DesignReviewPanel';
import { ApiRequestError } from '@/lib/api';
import type { ReviewView } from '@/services/reviews';
import type { ProjectMember } from '@/services/projects';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  createReview: vi.fn(),
  updateReview: vi.fn(),
  startReview: vi.fn(),
  approveReview: vi.fn(),
  requestChangesReview: vi.fn(),
  resubmitReview: vi.fn(),
}));

vi.mock('@/services/reviews', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/reviews')>();
  return { ...actual, ...mocks };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WS = 'ws-1';
const PROJECT = 'proj-1';
const TASK_ID = 'task-1';
const REVIEW_ID = 'review-1';
const SUBMITTER_ID = 'user-sub';
const REVIEWER_ID = 'user-rev';

function makeReview(overrides: Partial<ReviewView> = {}): ReviewView {
  return {
    id: REVIEW_ID,
    workspaceId: WS,
    projectId: PROJECT,
    resource: { kind: 'task', id: TASK_ID },
    status: 'SUBMITTED',
    round: 1,
    assigneeId: REVIEWER_ID,
    submittedById: SUBMITTER_ID,
    artworkUrl: 'https://example.com/art.png',
    decisions: ['Approve hero layout', 'Keep spacing'],
    lastDecision: null,
    ...overrides,
  };
}

const members: ProjectMember[] = [
  { userId: REVIEWER_ID, role: 'MEMBER', createdAt: '', user: { id: REVIEWER_ID, name: 'Alice', email: 'alice@example.com' } },
  { userId: 'user-other', role: 'MEMBER', createdAt: '', user: { id: 'user-other', name: 'Bob', email: 'bob@example.com' } },
];

// ---------------------------------------------------------------------------
// RequestDesignReviewDialog tests
// ---------------------------------------------------------------------------

describe('RequestDesignReviewDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createReview.mockResolvedValue({ review: makeReview() });
  });

  it('renders the form fields', () => {
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(/artwork url/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /reviewer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request review/i })).toBeInTheDocument();
  });

  it('excludes the current user from the reviewer options', () => {
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={REVIEWER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    // Alice is the current user — she should not appear
    const select = screen.getByRole('combobox', { name: /reviewer/i });
    expect(within(select).queryByText('Alice')).not.toBeInTheDocument();
    expect(within(select).getByText('Bob')).toBeInTheDocument();
  });

  it('validates that artwork URL must be http/https', async () => {
    const user = userEvent.setup();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/artwork url/i), 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: /request review/i }));
    expect(screen.getByText(/must start with http/i)).toBeInTheDocument();
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it('rejects URLs with embedded whitespace', async () => {
    const user = userEvent.setup();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/artwork url/i), 'https://example.com/my art');
    await user.click(screen.getByRole('button', { name: /request review/i }));
    expect(screen.getByText(/whitespace/i)).toBeInTheDocument();
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it('rejects a URL longer than 2048 characters', async () => {
    const user = userEvent.setup();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    // Paste a long URL to avoid character-by-character typing overhead
    const longUrl = 'https://example.com/' + 'a'.repeat(2040);
    const urlInput = screen.getByLabelText(/artwork url/i);
    await user.click(urlInput);
    await user.paste(longUrl);
    await user.click(screen.getByRole('button', { name: /request review/i }));
    expect(screen.getAllByText(/2048/i).length).toBeGreaterThan(0);
    expect(mocks.createReview).not.toHaveBeenCalled();
  });

  it('submits successfully with a valid URL', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={onCreated}
      />,
    );
    await user.type(screen.getByLabelText(/artwork url/i), 'https://figma.com/file/abc');
    await user.click(screen.getByRole('button', { name: /request review/i }));
    await waitFor(() => {
      expect(mocks.createReview).toHaveBeenCalledWith(
        WS,
        PROJECT,
        expect.objectContaining({ taskId: TASK_ID, artworkUrl: 'https://figma.com/file/abc' }),
      );
    });
    expect(onCreated).toHaveBeenCalledWith(REVIEW_ID);
  });

  it('shows API errors inline and does not close', async () => {
    mocks.createReview.mockRejectedValue(new ApiRequestError('REVIEW_ALREADY_OPEN', 409, 'REVIEW_ALREADY_OPEN'));
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={onClose}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
      />,
    );
    await user.type(screen.getByLabelText(/artwork url/i), 'https://figma.com/file/abc');
    await user.click(screen.getByRole('button', { name: /request review/i }));
    await waitFor(() => expect(screen.getByText(/REVIEW_ALREADY_OPEN/i)).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders disabled state with a reason when an open review exists', () => {
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={members}
        onCreated={vi.fn()}
        disabledReason="An open review already exists for this task."
      />,
    );
    expect(screen.getByText(/open review already exists/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request review/i })).toBeDisabled();
  });

  it('allows an empty artwork URL (field is optional)', async () => {
    const user = userEvent.setup();
    render(
      <RequestDesignReviewDialog
        open={true}
        onClose={vi.fn()}
        workspaceId={WS}
        projectId={PROJECT}
        taskId={TASK_ID}
        currentUserId={SUBMITTER_ID}
        members={[]}
        onCreated={vi.fn()}
      />,
    );
    // No URL entered
    await user.click(screen.getByRole('button', { name: /request review/i }));
    await waitFor(() => expect(mocks.createReview).toHaveBeenCalled());
    // artworkUrl should be absent when empty
    expect(mocks.createReview).toHaveBeenCalledWith(
      WS,
      PROJECT,
      expect.not.objectContaining({ artworkUrl: expect.anything() }),
    );
  });
});

// ---------------------------------------------------------------------------
// DesignReviewPanel tests
// ---------------------------------------------------------------------------

describe('DesignReviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.startReview.mockResolvedValue({ review: makeReview({ status: 'UNDER_REVIEW' }) });
    mocks.approveReview.mockResolvedValue({ review: makeReview({ status: 'APPROVED' }), decision: {} });
    mocks.requestChangesReview.mockResolvedValue({ review: makeReview({ status: 'CHANGES_REQUESTED' }), decision: {} });
    mocks.resubmitReview.mockResolvedValue({ review: makeReview({ status: 'SUBMITTED' }) });
    mocks.updateReview.mockResolvedValue({ review: makeReview() });
  });

  it('renders status badge, round, reviewer and artwork link', () => {
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        reviewerName="Alice"
        submitterName="Bob"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText(/round 1/i)).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    // Artwork link opens in a new tab with safe rel
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com/art.png');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders decisions list', () => {
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Approve hero layout')).toBeInTheDocument();
    expect(screen.getByText('Keep spacing')).toBeInTheDocument();
  });

  it('never renders a javascript: or data: href', () => {
    const malicious = makeReview({ artworkUrl: 'javascript:alert(1)' });
    render(
      <DesignReviewPanel
        review={malicious}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    // No link should be rendered for a non-http(s) URL
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows Edit button for the submitter when not APPROVED', () => {
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });

  it('hides Edit button for the submitter when APPROVED', () => {
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'APPROVED' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('hides Edit button for the reviewer', () => {
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('shows Start review button for the reviewer when SUBMITTED', () => {
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /start review/i })).toBeInTheDocument();
  });

  it('calls startReview when reviewer clicks Start review', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /start review/i }));
    await waitFor(() => expect(mocks.startReview).toHaveBeenCalledWith(WS, PROJECT, REVIEW_ID));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows Approve and Request changes for the reviewer when UNDER_REVIEW', () => {
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'UNDER_REVIEW' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument();
  });

  it('calls approveReview with the current round', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'UNDER_REVIEW', round: 2 })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() =>
      expect(mocks.approveReview).toHaveBeenCalledWith(WS, PROJECT, REVIEW_ID, { round: 2 }),
    );
  });

  it('requires a note before sending feedback for Request changes', async () => {
    const user = userEvent.setup();
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'UNDER_REVIEW' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /request changes/i }));
    // Send feedback button appears but is disabled without a note
    expect(screen.getByRole('button', { name: /send feedback/i })).toBeDisabled();
    expect(mocks.requestChangesReview).not.toHaveBeenCalled();
  });

  it('calls requestChangesReview with note and round', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'UNDER_REVIEW', round: 1 })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={REVIEWER_ID}
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /request changes/i }));
    await user.type(screen.getByRole('textbox', { name: /feedback/i }), 'Please fix the colours');
    await user.click(screen.getByRole('button', { name: /send feedback/i }));
    await waitFor(() =>
      expect(mocks.requestChangesReview).toHaveBeenCalledWith(WS, PROJECT, REVIEW_ID, {
        round: 1,
        note: 'Please fix the colours',
      }),
    );
  });

  it('shows Resubmit button for submitter when CHANGES_REQUESTED', () => {
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'CHANGES_REQUESTED' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /resubmit/i })).toBeInTheDocument();
  });

  it('calls resubmitReview with the current round', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'CHANGES_REQUESTED', round: 2 })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /resubmit/i }));
    await waitFor(() =>
      expect(mocks.resubmitReview).toHaveBeenCalledWith(WS, PROJECT, REVIEW_ID, 2),
    );
  });

  it('round conflict on edit: shows message and refreshes', async () => {
    const user = userEvent.setup();
    mocks.updateReview.mockRejectedValue(
      new ApiRequestError('Round conflict', 409, 'STALE_ROUND'),
    );
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <DesignReviewPanel
        review={makeReview()}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByRole('button', { name: /edit/i }));
    // Clear existing url so there's no validation error
    const urlInput = screen.getByLabelText(/artwork url/i);
    await user.clear(urlInput);
    await user.type(urlInput, 'https://new.example.com/art.png');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(screen.getByText(/round conflict/i)).toBeInTheDocument();
  });

  it('hides all action buttons for a third-party user', () => {
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'SUBMITTED' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId="user-unrelated"
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /start review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
  });

  it('renders APPROVED badge correctly', () => {
    render(
      <DesignReviewPanel
        review={makeReview({ status: 'APPROVED' })}
        workspaceId={WS}
        projectId={PROJECT}
        currentUserId={SUBMITTER_ID}
        onRefresh={vi.fn()}
      />,
    );
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });
});
