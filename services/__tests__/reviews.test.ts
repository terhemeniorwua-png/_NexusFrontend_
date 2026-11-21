import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  refreshSession: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiRequest: mocks.apiRequest,
  ApiRequestError: class ApiRequestError extends Error {
    status: number;
    code?: string;
    details?: unknown;

    constructor(message: string, status: number, code?: string, details?: unknown) {
      super(message);
      this.name = 'ApiRequestError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  },
}));

vi.mock('@/services/auth', () => ({
  refreshSession: mocks.refreshSession,
}));

const WS = 'ws-1';
const PROJECT = 'project-1';
const REVIEW = 'review-1';
const BASE = `/workspaces/${WS}/projects/${PROJECT}/reviews`;

const reviewPayload = {
  id: REVIEW,
  workspaceId: WS,
  projectId: PROJECT,
  resource: { kind: 'checklist', id: 'checklist-1', revision: 3 },
  status: 'UNDER_REVIEW',
  round: 2,
  assigneeId: 'user-2',
  submittedById: 'user-1',
  submittedAt: '2026-01-01T00:00:00.000Z',
  checklistRevision: 3,
  lastDecision: {
    id: 'decision-1',
    reviewId: REVIEW,
    round: 1,
    decision: 'CHANGES_REQUESTED',
    note: 'Please revise',
    decidedById: 'user-2',
    decidedAt: '2026-01-02T00:00:00.000Z',
  },
  stale: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('reviews service', () => {
  beforeEach(() => {
    mocks.apiRequest.mockReset();
    mocks.refreshSession.mockReset();
    mocks.refreshSession.mockResolvedValue(undefined);
  });

  it('listReviews sends all cursor filters and normalises the page', async () => {
    mocks.apiRequest.mockResolvedValue({
      items: [reviewPayload],
      nextCursor: REVIEW,
    });
    const { listReviews } = await import('../reviews');

    const result = await listReviews(WS, PROJECT, {
      targetKind: 'checklist',
      targetId: 'checklist-1',
      status: 'UNDER_REVIEW',
      assigneeId: 'user-2',
      cursor: 'cursor-1',
      limit: 10,
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}?targetKind=checklist&targetId=checklist-1&status=UNDER_REVIEW&assigneeId=user-2&cursor=cursor-1&limit=10`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.nextCursor).toBe(REVIEW);
    expect(result.items[0]).toMatchObject({
      id: REVIEW,
      status: 'UNDER_REVIEW',
      round: 2,
      stale: false,
      resource: { kind: 'checklist', id: 'checklist-1', revision: 3 },
    });
    expect(result.items[0].lastDecision?.decision).toBe('CHANGES_REQUESTED');
  });

  it('listReviews tolerates a partial page payload', async () => {
    mocks.apiRequest.mockResolvedValue({});
    const { listReviews } = await import('../reviews');

    const result = await listReviews(WS, PROJECT);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it('createReview posts a typed checklist target and unwraps the review', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { createReview } = await import('../reviews');

    const result = await createReview(WS, PROJECT, { checklistId: 'checklist-1' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ checklistId: 'checklist-1' }),
      }),
    );
    expect(result.review.id).toBe(REVIEW);
  });

  it('createReview posts an attachment version target with an optional assignee', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { createReview } = await import('../reviews');

    await createReview(WS, PROJECT, {
      attachmentVersionId: 'version-1',
      assigneeId: 'user-2',
    });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      BASE,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ attachmentVersionId: 'version-1', assigneeId: 'user-2' }),
      }),
    );
  });

  it('getReview reads one review', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { getReview } = await import('../reviews');

    const result = await getReview(WS, PROJECT, REVIEW);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}`,
      expect.objectContaining({ authenticated: true }),
    );
    expect(result.review.submittedById).toBe('user-1');
  });

  it('assignReview posts the assignee to the assign route', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { assignReview } = await import('../reviews');

    await assignReview(WS, PROJECT, REVIEW, 'user-2');

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/assign`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ assigneeId: 'user-2' }),
      }),
    );
  });

  it('startReview posts no body', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { startReview } = await import('../reviews');

    await startReview(WS, PROJECT, REVIEW);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/start`,
      expect.objectContaining({ authenticated: true, method: 'POST' }),
    );
    expect(mocks.apiRequest.mock.calls[0][1].body).toBeUndefined();
  });

  it('resubmitReview posts the round the caller observed', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload });
    const { resubmitReview } = await import('../reviews');

    await resubmitReview(WS, PROJECT, REVIEW, 2);

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/resubmit`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ round: 2 }),
      }),
    );
  });

  it('approveReview posts an optional note and returns review plus decision', async () => {
    mocks.apiRequest.mockResolvedValue({
      review: reviewPayload,
      decision: reviewPayload.lastDecision,
    });
    const { approveReview } = await import('../reviews');

    const result = await approveReview(WS, PROJECT, REVIEW, { round: 2 });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/approve`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ round: 2 }),
      }),
    );
    expect(result.decision.decision).toBe('CHANGES_REQUESTED');
    expect(result.review.id).toBe(REVIEW);
  });

  it('approveReview sends a note when one was supplied', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload, decision: reviewPayload.lastDecision });
    const { approveReview } = await import('../reviews');

    await approveReview(WS, PROJECT, REVIEW, { round: 1, note: 'Looks good' });

    expect(mocks.apiRequest.mock.calls[0][1].body).toBe(
      JSON.stringify({ round: 1, note: 'Looks good' }),
    );
  });

  it('rejectReview posts the required note', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload, decision: reviewPayload.lastDecision });
    const { rejectReview } = await import('../reviews');

    await rejectReview(WS, PROJECT, REVIEW, { round: 2, note: 'Not yet' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/reject`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ round: 2, note: 'Not yet' }),
      }),
    );
  });

  it('requestChangesReview posts the required note', async () => {
    mocks.apiRequest.mockResolvedValue({ review: reviewPayload, decision: reviewPayload.lastDecision });
    const { requestChangesReview } = await import('../reviews');

    await requestChangesReview(WS, PROJECT, REVIEW, { round: 2, note: 'Revise' });

    expect(mocks.apiRequest).toHaveBeenCalledWith(
      `${BASE}/${REVIEW}/request-changes`,
      expect.objectContaining({
        authenticated: true,
        method: 'POST',
        body: JSON.stringify({ round: 2, note: 'Revise' }),
      }),
    );
  });

  it('propagates backend conflict errors with code and status unchanged', async () => {
    mocks.apiRequest.mockRejectedValue(
      new ApiRequestError(
        'The review round has changed',
        409,
        'STALE_ROUND',
        { expected: 2, actual: 3 },
      ),
    );
    const { rejectReview } = await import('../reviews');

    await expect(
      rejectReview(WS, PROJECT, REVIEW, { round: 2, note: 'Revise' }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'STALE_ROUND',
      message: 'The review round has changed',
    });
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it('refreshes the session and retries once after a 401', async () => {
    mocks.apiRequest
      .mockRejectedValueOnce(new ApiRequestError('Expired', 401))
      .mockResolvedValueOnce({ review: reviewPayload });
    const { getReview } = await import('../reviews');

    const result = await getReview(WS, PROJECT, REVIEW);

    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.apiRequest).toHaveBeenCalledTimes(2);
    expect(result.review.id).toBe(REVIEW);
  });

  it('missing optional fields do not crash normalisation', async () => {
    mocks.apiRequest.mockResolvedValue({
      review: {
        id: REVIEW,
        resource: { id: 'version-1' },
        status: 'SUBMITTED',
        round: 1,
        assigneeId: null,
        submittedById: 'user-1',
      },
    });
    const { getReview } = await import('../reviews');

    const result = await getReview(WS, PROJECT, REVIEW);

    expect(result.review).toMatchObject({
      id: REVIEW,
      resource: { kind: 'attachmentVersion', id: 'version-1' },
      status: 'SUBMITTED',
      round: 1,
      assigneeId: null,
      checklistRevision: null,
      stale: false,
    });
    expect(result.review.lastDecision).toBeNull();
    expect(result.review.workspaceId).toBe('');
  });

  it('exposes the conflict codes that require a refetch', async () => {
    const { REVIEW_CONFLICT_CODES } = await import('../reviews');

    expect([...REVIEW_CONFLICT_CODES]).toEqual(
      expect.arrayContaining([
        'STALE_ROUND',
        'CHECKLIST_REVISION_STALE',
        'REVIEW_ALREADY_DECIDED',
      ]),
    );
  });
});
