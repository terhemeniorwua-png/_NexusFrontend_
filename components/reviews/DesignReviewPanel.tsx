'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ApiRequestError } from '@/lib/api';
import { REVIEW_CONFLICT_CODES } from '@/services/reviews';
import {
  approveReview,
  requestChangesReview,
  resubmitReview,
  startReview,
  updateReview,
} from '@/services/reviews';
import type { ReviewView } from '@/services/reviews';

const MAX_DECISIONS = 20;
const MAX_DECISION_LEN = 500;
const MAX_ARTWORK_URL_LEN = 2048;

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

type BadgeVariant = 'default' | 'info' | 'success' | 'warning' | 'error';

function statusBadge(status: ReviewView['status']): { label: string; variant: BadgeVariant } {
  switch (status) {
    case 'SUBMITTED': return { label: 'Submitted', variant: 'info' };
    case 'UNDER_REVIEW': return { label: 'Under review', variant: 'warning' };
    case 'APPROVED': return { label: 'Approved', variant: 'success' };
    case 'CHANGES_REQUESTED': return { label: 'Changes requested', variant: 'error' };
    default: return { label: status, variant: 'default' };
  }
}

interface DesignReviewPanelProps {
  review: ReviewView;
  workspaceId: string;
  projectId: string;
  currentUserId: string;
  /** Name of the reviewer (resolved from members/workspace). */
  reviewerName?: string | null;
  /** Name of the submitter. */
  submitterName?: string | null;
  /** Called after any action to trigger a reload. */
  onRefresh: () => Promise<void> | void;
}

export function DesignReviewPanel({
  review,
  workspaceId,
  projectId,
  currentUserId,
  reviewerName,
  submitterName,
  onRefresh,
}: DesignReviewPanelProps) {
  const isSubmitter = review.submittedById === currentUserId;
  const isReviewer = review.assigneeId === currentUserId;

  // --- Edit state ---
  const [editing, setEditing] = useState(false);
  const [editUrl, setEditUrl] = useState(review.artworkUrl ?? '');
  const [editDecisions, setEditDecisions] = useState<string[]>(
    review.decisions && review.decisions.length > 0 ? review.decisions : [''],
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const editBusyRef = useRef(false);

  // --- Reviewer action state ---
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNoteFor, setShowNoteFor] = useState<'changes' | null>(null);

  function validateUrl(val: string): string | null {
    const trimmed = val.trim();
    if (!trimmed) return null;
    if (/\s/.test(trimmed)) return 'URL must not contain whitespace.';
    if (trimmed.length > MAX_ARTWORK_URL_LEN) return `URL must be ${MAX_ARTWORK_URL_LEN} characters or fewer.`;
    if (!isValidHttpUrl(trimmed)) return 'URL must start with http:// or https://.';
    return null;
  }

  function handleEditUrlChange(val: string) {
    setEditUrl(val);
    setUrlError(validateUrl(val));
  }

  function addDecision() {
    if (editDecisions.length >= MAX_DECISIONS) return;
    setEditDecisions((d) => [...d, '']);
  }

  function removeDecision(idx: number) {
    setEditDecisions((d) => d.filter((_, i) => i !== idx));
  }

  function updateDecisionItem(idx: number, val: string) {
    setEditDecisions((d) => d.map((v, i) => (i === idx ? val : v)));
  }

  function cancelEdit() {
    setEditing(false);
    setEditUrl(review.artworkUrl ?? '');
    setEditDecisions(review.decisions && review.decisions.length > 0 ? review.decisions : ['']);
    setUrlError(null);
    setEditError(null);
  }

  async function handleSaveEdit() {
    if (editBusyRef.current) return;
    const urlErr = validateUrl(editUrl);
    if (urlErr) { setUrlError(urlErr); return; }

    const cleanDecisions = editDecisions.map((d) => d.trim()).filter((d) => d.length > 0);
    const longDecision = cleanDecisions.find((d) => d.length > MAX_DECISION_LEN);
    if (longDecision) {
      setEditError(`Each decision must be ${MAX_DECISION_LEN} characters or fewer.`);
      return;
    }

    editBusyRef.current = true;
    setEditBusy(true);
    setEditError(null);
    try {
      await updateReview(workspaceId, projectId, review.id, {
        round: review.round,
        artworkUrl: editUrl.trim() || null,
        decisions: cleanDecisions,
      });
      setEditing(false);
      await onRefresh();
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        err.code &&
        REVIEW_CONFLICT_CODES.has(err.code)
      ) {
        setEditError(
          `Round conflict: the review was updated by someone else. Refreshing…`,
        );
        await onRefresh();
      } else {
        setEditError(
          err instanceof ApiRequestError && err.message
            ? err.message
            : 'Could not save changes. Please try again.',
        );
      }
    } finally {
      editBusyRef.current = false;
      setEditBusy(false);
    }
  }

  async function handleAction(
    action: () => Promise<unknown>,
    successNote?: string,
  ) {
    setActionBusy(true);
    setActionError(null);
    try {
      await action();
      setActionNote('');
      setShowNoteFor(null);
      await onRefresh();
      void successNote;
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        err.code &&
        REVIEW_CONFLICT_CODES.has(err.code)
      ) {
        setActionError(
          `Conflict: the review state changed. Refreshing…`,
        );
        await onRefresh();
      } else {
        setActionError(
          err instanceof ApiRequestError && err.message
            ? err.message
            : 'Action failed. Please try again.',
        );
      }
    } finally {
      setActionBusy(false);
    }
  }

  const badge = statusBadge(review.status);

  const artworkUrlSafe =
    review.artworkUrl && isValidHttpUrl(review.artworkUrl) ? review.artworkUrl : null;

  const canEdit =
    isSubmitter && review.status !== 'APPROVED' && !editing;

  const canStart =
    isReviewer && review.status === 'SUBMITTED';

  const canApprove =
    isReviewer && (review.status === 'UNDER_REVIEW' || review.status === 'SUBMITTED');

  const canRequestChanges =
    isReviewer && (review.status === 'UNDER_REVIEW' || review.status === 'SUBMITTED');

  const canResubmit =
    isSubmitter && review.status === 'CHANGES_REQUESTED';

  return (
    <Card className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Design review</h2>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Round {review.round}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Meta */}
      <dl className="mb-4 space-y-1.5 text-sm">
        {submitterName ? (
          <div className="flex gap-2">
            <dt className="text-[var(--color-text-secondary)]">Submitted by</dt>
            <dd className="font-medium">{submitterName}</dd>
          </div>
        ) : null}
        {reviewerName ? (
          <div className="flex gap-2">
            <dt className="text-[var(--color-text-secondary)]">Reviewer</dt>
            <dd className="font-medium">{reviewerName}</dd>
          </div>
        ) : review.assigneeId ? (
          <div className="flex gap-2">
            <dt className="text-[var(--color-text-secondary)]">Reviewer</dt>
            <dd className="font-medium text-[var(--color-text-secondary)]">{review.assigneeId}</dd>
          </div>
        ) : null}
      </dl>

      {/* Last decision note */}
      {review.lastDecision?.note ? (
        <Alert
          variant={review.lastDecision.decision === 'APPROVED' ? 'info' : 'warning'}
          title="Reviewer note"
          className="mb-4"
        >
          <p className="whitespace-pre-wrap text-sm">{review.lastDecision.note}</p>
        </Alert>
      ) : null}

      {/* Artwork link */}
      {artworkUrlSafe ? (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Artwork
          </p>
          <a
            href={artworkUrlSafe}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline break-all"
          >
            {artworkUrlSafe.length > 60
              ? artworkUrlSafe.slice(0, 57) + '…'
              : artworkUrlSafe}
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      ) : null}

      {/* Decisions list */}
      {review.decisions && review.decisions.length > 0 ? (
        <div className="mb-4">
          <p className="mb-1 text-xs font-medium text-[var(--color-text-secondary)] uppercase tracking-wide">
            Decisions
          </p>
          <ul className="space-y-1" role="list">
            {review.decisions.map((d, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 text-[var(--color-text-secondary)]">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Edit form */}
      {editing ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
          <h3 className="text-sm font-medium">Edit review details</h3>
          {editError ? <Alert variant="error">{editError}</Alert> : null}
          <Input
            id="edit-artwork-url"
            label="Artwork URL"
            type="url"
            value={editUrl}
            onChange={(e) => handleEditUrlChange(e.target.value)}
            placeholder="https://www.figma.com/file/…"
            errorMessage={urlError ?? undefined}
            disabled={editBusy}
          />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Decisions</legend>
            <div className="space-y-2">
              {editDecisions.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    aria-label={`Decision ${idx + 1}`}
                    value={d}
                    maxLength={MAX_DECISION_LEN}
                    onChange={(e) => updateDecisionItem(idx, e.target.value)}
                    disabled={editBusy}
                    className={[
                      'flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)]',
                      'bg-[var(--color-surface)] px-3 py-2 text-sm',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                      'disabled:opacity-50',
                    ].join(' ')}
                  />
                  {editDecisions.length > 1 ? (
                    <button
                      type="button"
                      aria-label={`Remove decision ${idx + 1}`}
                      onClick={() => removeDecision(idx)}
                      disabled={editBusy}
                      className="rounded p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] disabled:opacity-40"
                    >
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {editDecisions.length < MAX_DECISIONS ? (
              <button
                type="button"
                onClick={addDecision}
                disabled={editBusy}
                className="mt-2 text-sm text-[var(--color-primary)] hover:underline disabled:opacity-40"
              >
                + Add decision
              </button>
            ) : null}
          </fieldset>
          <div className="flex gap-2">
            <Button size="sm" variant="primary" loading={editBusy} onClick={() => { void handleSaveEdit(); }}>
              Save
            </Button>
            <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={editBusy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {/* Action errors */}
      {actionError ? <Alert variant="error" className="mt-3">{actionError}</Alert> : null}

      {/* Submitter: edit button */}
      {canEdit && !editing ? (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
            Edit
          </Button>
        </div>
      ) : null}

      {/* Reviewer: start review */}
      {canStart ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="secondary"
            loading={actionBusy}
            onClick={() => {
              void handleAction(() => startReview(workspaceId, projectId, review.id));
            }}
          >
            Start review
          </Button>
        </div>
      ) : null}

      {/* Reviewer: approve + request changes */}
      {(canApprove || canRequestChanges) && !editing ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {canApprove ? (
              <Button
                size="sm"
                variant="primary"
                loading={actionBusy && showNoteFor !== 'changes'}
                disabled={actionBusy}
                onClick={() => {
                  void handleAction(() =>
                    approveReview(workspaceId, projectId, review.id, { round: review.round }),
                  );
                }}
              >
                Approve
              </Button>
            ) : null}
            {canRequestChanges ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={actionBusy}
                onClick={() => setShowNoteFor(showNoteFor === 'changes' ? null : 'changes')}
              >
                Request changes
              </Button>
            ) : null}
          </div>

          {showNoteFor === 'changes' ? (
            <div className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
              <label htmlFor="reviewer-note" className="text-sm font-medium">
                Feedback <span aria-hidden="true" className="text-[var(--color-error)]">*</span>
              </label>
              <textarea
                id="reviewer-note"
                rows={3}
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="Describe the changes needed…"
                className={[
                  'w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
                  'bg-[var(--color-surface)] px-3 py-2 text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                ].join(' ')}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  loading={actionBusy}
                  disabled={!actionNote.trim()}
                  onClick={() => {
                    void handleAction(() =>
                      requestChangesReview(workspaceId, projectId, review.id, {
                        round: review.round,
                        note: actionNote.trim(),
                      }),
                    );
                  }}
                >
                  Send feedback
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowNoteFor(null)} disabled={actionBusy}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Submitter: resubmit after changes requested */}
      {canResubmit && !editing ? (
        <div className="mt-3">
          <Button
            size="sm"
            variant="primary"
            loading={actionBusy}
            onClick={() => {
              void handleAction(() =>
                resubmitReview(workspaceId, projectId, review.id, review.round),
              );
            }}
          >
            Resubmit
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
