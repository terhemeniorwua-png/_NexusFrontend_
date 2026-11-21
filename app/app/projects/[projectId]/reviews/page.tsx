'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProjectUnavailableState } from '@/components/shared/PageAccessState';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { useWorkspaceRedirect } from '@/hooks/useWorkspaceRedirect';
import { ApiRequestError } from '@/lib/api';
import { usePermissions } from '@/providers/ProjectPermissionsProvider';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import type { ProjectRoleDefinition } from '@/services/projects';
import {
  REVIEW_CONFLICT_CODES,
  approveReview,
  assignReview,
  getReview,
  listReviews,
  rejectReview,
  requestChangesReview,
  resubmitReview,
  startReview,
  type ReviewStatus,
  type ReviewView,
} from '@/services/reviews';
import { listWorkspaceMembers, type WorkspaceMember } from '@/services/workspaces';

const PAGE_LIMIT = 25;
const NOTE_LIMIT = 2000;

type DecisionKind = 'approve' | 'reject' | 'request-changes';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'SUBMITTED' },
  { value: 'UNDER_REVIEW', label: 'UNDER_REVIEW' },
  { value: 'APPROVED', label: 'APPROVED' },
  { value: 'CHANGES_REQUESTED', label: 'CHANGES_REQUESTED' },
];

function messageFor(cause: unknown, fallback: string): string {
  return cause instanceof ApiRequestError && cause.message ? cause.message : fallback;
}

function formatWhen(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function targetLabel(review: ReviewView): string {
  return review.resource?.kind === 'checklist' ? 'Checklist' : 'Attachment version';
}

function isOpenStatus(status: ReviewStatus): boolean {
  return status === 'SUBMITTED' || status === 'UNDER_REVIEW';
}

export default function ProjectReviewsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const workspaceId = useWorkspaceRedirect();
  const { user } = useWorkspaceContext();
  const {
    can,
    isLoading: permissionsLoading,
    accessStatus,
    roleDefinitions,
  } = usePermissions();
  const currentUserId = user?.id ?? '';

  const [statusFilter, setStatusFilter] = useState<'' | ReviewStatus>('');
  const [items, setItems] = useState<ReviewView[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ReviewView | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [decisionKind, setDecisionKind] = useState<DecisionKind | null>(null);
  const [note, setNote] = useState('');
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const busyRef = useRef(false);

  const loadList = useCallback(async (cursor?: string, keepSelection = false) => {
    if (!workspaceId || !projectId) return;
    setListLoading(true);
    setListError(null);
    if (!cursor) {
      setItems([]);
      setNextCursor(null);
      if (!keepSelection) {
        setSelectedId(null);
        setDetail(null);
      }
    }
    try {
      const page = await listReviews(workspaceId, projectId, {
        status: statusFilter || undefined,
        cursor,
        limit: PAGE_LIMIT,
      });
      setItems((current) => (cursor ? [...current, ...page.items] : page.items));
      setNextCursor(page.nextCursor);
    } catch (cause) {
      setListError(messageFor(cause, 'Unable to load reviews.'));
    } finally {
      setListLoading(false);
    }
  }, [statusFilter, workspaceId, projectId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void loadList(); });
    return () => { active = false; };
  }, [loadList, workspaceId, projectId]);

  const loadDetail = useCallback(async () => {
    if (!selectedId || !workspaceId || !projectId) return;
    setDetailLoading(true);
    try {
      const result = await getReview(workspaceId, projectId, selectedId);
      setDetail(result.review);
    } catch (cause) {
      setActionError(messageFor(cause, 'Unable to load the review.'));
    } finally {
      setDetailLoading(false);
    }
  }, [selectedId, workspaceId, projectId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      if (!selectedId) {
        setDetail(null);
        return;
      }
      void loadDetail();
    });
    return () => { active = false; };
  }, [selectedId, loadDetail]);

  const reloadDetail = useCallback(async () => {
    if (!selectedId || !workspaceId || !projectId) return;
    try {
      const result = await getReview(workspaceId, projectId, selectedId);
      setDetail(result.review);
    } catch (cause) {
      setActionError(messageFor(cause, 'Unable to load the review.'));
    }
  }, [selectedId, workspaceId, projectId]);

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void listWorkspaceMembers(workspaceId)
      .then((result) => { if (active) setMembers(result); })
      .catch(() => { if (active) setMembers([]); });
    return () => { active = false; };
  }, [workspaceId]);

  const memberNames = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((member) => map.set(member.userId, member.name || member.email));
    return map;
  }, [members]);

  function nameFor(id?: string | null): string {
    if (!id) return 'Unknown user';
    if (id === currentUserId) return 'You';
    return memberNames.get(id) ?? id;
  }

  const reviewerOptions = useMemo(() => {
    const reviewerRoles = new Set<string>(
      roleDefinitions
        .filter((definition: ProjectRoleDefinition) =>
          definition.permissions.includes('submission.review'))
        .map((definition) => definition.role),
    );
    return members
      .filter((member) =>
        member.userId !== currentUserId &&
        member.userId !== detail?.submittedById &&
        (reviewerRoles.has(member.role) || member.owner))
      .map((member) => ({
        value: member.userId,
        label: member.name || member.email,
      }));
  }, [members, roleDefinitions, currentUserId, detail?.submittedById]);

  function applyReview(review: ReviewView): void {
    setItems((current) => current.map((item) => (item.id === review.id ? review : item)));
    setDetail((current) => (current?.id === review.id ? review : current));
  }

  async function runAction<T extends { review: ReviewView }>(
    key: string,
    fallback: string,
    action: () => Promise<T>,
    successMessage?: string,
  ): Promise<T | undefined> {
    if (busyRef.current || !workspaceId || !projectId) return undefined;
    busyRef.current = true;
    setBusyAction(key);
    setActionError(null);
    setNotice(null);
    try {
      const result = await action();
      applyReview(result.review);
      if (successMessage) setNotice(successMessage);
      return result;
    } catch (cause) {
      const apiError = cause instanceof ApiRequestError ? cause : null;
      setActionError(messageFor(cause, fallback));
      if (apiError?.status === 409 && apiError.code && REVIEW_CONFLICT_CODES.has(apiError.code)) {
        await reloadDetail();
        void loadList(undefined, true);
      }
      return undefined;
    } finally {
      busyRef.current = false;
      setBusyAction(null);
    }
  }

  function openDecision(kind: DecisionKind): void {
    setDecisionKind(kind);
    setNote('');
    setActionError(null);
  }

  const trimmedNote = note.trim();
  const noteValid = decisionKind === 'approve'
    ? note.length === 0 || (trimmedNote.length > 0 && note.length <= NOTE_LIMIT)
    : trimmedNote.length > 0 && note.length <= NOTE_LIMIT;

  const isSubmitter = Boolean(detail && detail.submittedById === currentUserId);
  const open = Boolean(detail && isOpenStatus(detail.status));
  const canReview = can('submission.review') && !isSubmitter && open;
  const canApprove = can('submission.approve') && !isSubmitter && open;
  const canReject = can('submission.reject') && !isSubmitter && open;
  const canRequestChanges = can('submission.request_revision') && !isSubmitter && open;
  const canResubmit = Boolean(
    detail && can('submission.submit') && isSubmitter && detail.status === 'CHANGES_REQUESTED',
  );
  const hasActions = canReview || canApprove || canReject || canRequestChanges || canResubmit;

  async function handleDecisionConfirm(): Promise<void> {
    if (!detail || !workspaceId || !projectId || !decisionKind || !noteValid || busyRef.current) return;
    // Always send the round the user saw. A conflict response reconciles via refetch.
    const round = detail.round;
    const decisionNote = trimmedNote || undefined;
    const call = decisionKind === 'approve'
      ? () => approveReview(workspaceId, projectId, detail.id, {
          round,
          ...(decisionNote ? { note: decisionNote } : {}),
        })
      : decisionKind === 'reject'
        ? () => rejectReview(workspaceId, projectId, detail.id, { round, note: trimmedNote })
        : () => requestChangesReview(workspaceId, projectId, detail.id, { round, note: trimmedNote });
    await runAction(
      `decision-${decisionKind}`,
      'Unable to record the decision.',
      call,
      'Decision recorded.',
    );
    setDecisionKind(null);
    setNote('');
  }

  async function handleResubmit(): Promise<void> {
    if (!detail || !workspaceId || !projectId || busyRef.current) return;
    const round = detail.round;
    await runAction(
      'resubmit',
      'Unable to resubmit the review.',
      () => resubmitReview(workspaceId, projectId, detail.id, round),
      'Review resubmitted.',
    );
    setResubmitOpen(false);
  }

  async function handleAssign(): Promise<void> {
    if (!detail || !workspaceId || !projectId || !assigneeId || busyRef.current) return;
    await runAction(
      'assign',
      'Unable to assign the reviewer.',
      () => assignReview(workspaceId, projectId, detail.id, assigneeId),
      'Reviewer assigned.',
    );
    setAssigneeId('');
  }

  async function handleStart(): Promise<void> {
    if (!detail || !workspaceId || !projectId || busyRef.current) return;
    await runAction(
      'start',
      'Unable to start the review.',
      () => startReview(workspaceId, projectId, detail.id),
      'Review started.',
    );
  }

  if (accessStatus) return <ProjectUnavailableState status={accessStatus} />;

  if (permissionsLoading || listLoading) {
    return (
      <section aria-busy="true" role="status">
        <span className="sr-only">Loading reviews…</span>
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Reviews</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Submit, review, and approve project attachment versions and checklists.
        </p>
      </header>

      {listError ? <Alert variant="error" title="Request failed">{listError}</Alert> : null}
      {actionError ? <Alert variant="error" title="Request failed">{actionError}</Alert> : null}
      {notice ? <Alert variant="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <Card className="p-4 sm:p-6">
          <div className="mb-4">
            <Select
              id="review-status-filter"
              label="Filter by status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              size="sm"
              disabled={busyAction !== null}
              onChange={(event) => setStatusFilter(event.target.value as '' | ReviewStatus)}
            />
          </div>

          {items.length === 0 ? (
            <EmptyState
              title="No reviews yet"
              description="Reviews appear here when a version or checklist is submitted."
            />
          ) : (
            <ul className="space-y-2" role="list" aria-label="Submission reviews">
              {items.map((review) => (
                <li key={review.id}>
                  <button
                    type="button"
                    onClick={() => { setSelectedId(review.id); setActionError(null); setNotice(null); }}
                    aria-current={selectedId === review.id ? 'true' : undefined}
                    className={[
                      'w-full rounded-[var(--radius-md)] border p-3 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                      selectedId === review.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-surface-secondary)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]',
                    ].join(' ')}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <Badge variant={review.status}>{review.status}</Badge>
                      {review.stale ? <Badge variant="warning">STALE</Badge> : null}
                    </span>
                    <span className="mt-2 block text-sm font-medium">
                      {targetLabel(review)} · Round {review.round}
                    </span>
                    <span className="mt-1 block text-xs text-[var(--color-text-secondary)]">
                      Submitted by {nameFor(review.submittedById)} · Assignee {nameFor(review.assigneeId)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nextCursor ? (
            <div className="mt-4">
              <Button
                variant="secondary"
                size="sm"
                disabled={busyAction !== null}
                onClick={() => { void loadList(nextCursor); }}
              >
                Load more reviews
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="p-4 sm:p-6">
          {!selectedId ? (
            <EmptyState title="Select a review" description="Choose a review to inspect its details." />
          ) : detailLoading && !detail ? (
            <p className="text-sm text-[var(--color-text-secondary)]" role="status">Loading review…</p>
          ) : !detail ? (
            <p className="text-sm text-[var(--color-text-secondary)]">This review is no longer available.</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    {targetLabel(detail)} · Round {detail.round}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Status <Badge variant={detail.status}>{detail.status}</Badge>
                  </p>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Submitted {formatWhen(detail.submittedAt)} by {nameFor(detail.submittedById)}
                </p>
              </div>

              <section aria-labelledby="review-target-heading" className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <h3 id="review-target-heading" className="text-sm font-semibold">Target</h3>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-[var(--color-text-secondary)]">Type</dt><dd>{targetLabel(detail)}</dd></div>
                  <div><dt className="text-xs text-[var(--color-text-secondary)]">Target ID</dt><dd className="break-all">{detail.resource?.id || '—'}</dd></div>
                  <div>
                    <dt className="text-xs text-[var(--color-text-secondary)]">Checklist revision</dt>
                    <dd>{detail.checklistRevision ?? detail.resource?.revision ?? '—'}</dd>
                  </div>
                  <div><dt className="text-xs text-[var(--color-text-secondary)]">Assignee</dt><dd>{nameFor(detail.assigneeId)}</dd></div>
                </dl>
              </section>

              {detail.stale ? (
                <Alert variant="warning" title="This review is stale">
                  <p>The checklist has changed since this review was submitted.</p>
                  <Link
                    href={`/app/projects/${encodeURIComponent(projectId)}/checklists`}
                    className="mt-2 inline-block font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  >
                    Submit a new review
                  </Link>
                </Alert>
              ) : null}

              <section aria-labelledby="latest-decision-heading">
                <h3 id="latest-decision-heading" className="text-sm font-semibold">Latest decision</h3>
                {detail.lastDecision ? (
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-[var(--color-text-secondary)]">Round</dt><dd>{detail.lastDecision.round}</dd></div>
                    <div><dt className="text-xs text-[var(--color-text-secondary)]">Decision</dt><dd>{detail.lastDecision.decision}</dd></div>
                    <div><dt className="text-xs text-[var(--color-text-secondary)]">Note</dt><dd className="whitespace-pre-wrap">{detail.lastDecision.note ?? '—'}</dd></div>
                    <div><dt className="text-xs text-[var(--color-text-secondary)]">Decided by</dt><dd>{nameFor(detail.lastDecision.decidedById)}</dd></div>
                    <div><dt className="text-xs text-[var(--color-text-secondary)]">Time</dt><dd>{formatWhen(detail.lastDecision.decidedAt)}</dd></div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-[var(--color-text-secondary)]">No decision recorded yet.</p>
                )}
              </section>

              {hasActions ? (
                <section aria-label="Review actions" className="space-y-3 border-t border-[var(--color-border)] pt-4">
                  <h3 className="text-sm font-semibold">Actions</h3>
                  {isSubmitter ? (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      This is your submission. Decision controls are hidden from the submitter.
                    </p>
                  ) : null}

                  {canReview || canApprove || canReject || canRequestChanges ? (
                    <div className="flex flex-wrap gap-2">
                      {canReview && detail.status === 'SUBMITTED' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyAction !== null}
                          loading={busyAction === 'start'}
                          onClick={() => { void handleStart(); }}
                        >
                          Start review
                        </Button>
                      ) : null}
                      {canApprove ? (
                        <Button size="sm" disabled={busyAction !== null} onClick={() => openDecision('approve')}>
                          Approve
                        </Button>
                      ) : null}
                      {canReject ? (
                        <Button size="sm" variant="destructive" disabled={busyAction !== null} onClick={() => openDecision('reject')}>
                          Reject
                        </Button>
                      ) : null}
                      {canRequestChanges ? (
                        <Button size="sm" variant="secondary" disabled={busyAction !== null} onClick={() => openDecision('request-changes')}>
                          Request changes
                        </Button>
                      ) : null}
                    </div>
                  ) : null}

                  {canReview ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <Select
                        id="review-assignee"
                        label="Assign reviewer"
                        size="sm"
                        options={[
                          { value: '', label: 'Select a reviewer', disabled: true },
                          ...reviewerOptions,
                        ]}
                        value={assigneeId}
                        disabled={busyAction !== null}
                        onChange={(event) => setAssigneeId(event.target.value)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!assigneeId || busyAction !== null}
                        loading={busyAction === 'assign'}
                        onClick={() => { void handleAssign(); }}
                      >
                        Assign
                      </Button>
                    </div>
                  ) : null}

                  {canResubmit ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyAction !== null}
                      onClick={() => setResubmitOpen(true)}
                    >
                      Resubmit
                    </Button>
                  ) : null}
                </section>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={decisionKind !== null}
        onClose={() => { setDecisionKind(null); setNote(''); }}
        title={decisionKind === 'approve' ? 'Approve review' : decisionKind === 'reject' ? 'Reject review' : 'Request changes'}
        description={
          decisionKind === 'approve'
            ? 'A note is optional for approval.'
            : 'A note between 1 and 2000 non-blank characters is required.'
        }
        footer={
          <>
            <Button variant="secondary" disabled={busyAction !== null} onClick={() => { setDecisionKind(null); setNote(''); }}>
              Cancel
            </Button>
            <Button
              disabled={!noteValid || busyAction !== null}
              loading={busyAction !== null && busyAction.startsWith('decision-')}
              onClick={() => { void handleDecisionConfirm(); }}
            >
              {decisionKind === 'approve' ? 'Approve' : decisionKind === 'reject' ? 'Reject' : 'Request changes'}
            </Button>
          </>
        }
      >
        <Textarea
          id="review-decision-note"
          label="Note"
          value={note}
          maxLength={NOTE_LIMIT}
          disabled={busyAction !== null}
          onChange={(event) => setNote(event.target.value)}
          helperText={`${note.length}/${NOTE_LIMIT} characters`}
          placeholder={decisionKind === 'approve' ? 'Optional note' : 'Explain the decision'}
        />
      </Modal>

      <Modal
        open={resubmitOpen}
        onClose={() => setResubmitOpen(false)}
        title="Resubmit review"
        description={detail ? `Round ${detail.round} will reopen as SUBMITTED at the next round.` : undefined}
        footer={
          <>
            <Button variant="secondary" disabled={busyAction !== null} onClick={() => setResubmitOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={busyAction !== null}
              loading={busyAction === 'resubmit'}
              onClick={() => { void handleResubmit(); }}
            >
              Resubmit
            </Button>
          </>
        }
      >
        <p className="text-sm text-[var(--color-text-secondary)]">
          Resubmitting reopens this review for the current checklist revision. The round you saw is sent to the backend so a newer round cannot be overwritten.
        </p>
      </Modal>
    </section>
  );
}
