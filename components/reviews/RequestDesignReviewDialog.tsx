'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ApiRequestError } from '@/lib/api';
import { createReview } from '@/services/reviews';
import type { ProjectMember } from '@/services/projects';

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

interface RequestDesignReviewDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  projectId: string;
  taskId: string;
  currentUserId: string;
  /** Project members to pick reviewer from (excluding current user). */
  members: ProjectMember[];
  /** Called with the new review ID on success. */
  onCreated: (reviewId: string) => void;
  /** When set, the dialog is disabled with this reason (e.g. open review exists). */
  disabledReason?: string;
}

export function RequestDesignReviewDialog({
  open,
  onClose,
  workspaceId,
  projectId,
  taskId,
  currentUserId,
  members,
  onCreated,
  disabledReason,
}: RequestDesignReviewDialogProps) {
  const [artworkUrl, setArtworkUrl] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [decisions, setDecisions] = useState<string[]>(['']);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Members who can receive review (exclude current user)
  const reviewerOptions = members
    .filter((m) => m.userId !== currentUserId)
    .map((m) => ({ value: m.userId, label: m.user.name || m.user.email }));

  function validateUrl(val: string): string | null {
    const trimmed = val.trim();
    if (!trimmed) return null; // optional
    if (/\s/.test(trimmed)) return 'URL must not contain whitespace.';
    if (trimmed.length > MAX_ARTWORK_URL_LEN) return `URL must be ${MAX_ARTWORK_URL_LEN} characters or fewer.`;
    if (!isValidHttpUrl(trimmed)) return 'URL must start with http:// or https://.';
    return null;
  }

  function handleUrlChange(val: string) {
    setArtworkUrl(val);
    setUrlError(validateUrl(val));
  }

  function addDecision() {
    if (decisions.length >= MAX_DECISIONS) return;
    setDecisions((d) => [...d, '']);
  }

  function removeDecision(idx: number) {
    setDecisions((d) => d.filter((_, i) => i !== idx));
  }

  function updateDecision(idx: number, val: string) {
    setDecisions((d) => d.map((v, i) => (i === idx ? val : v)));
  }

  function resetForm() {
    setArtworkUrl('');
    setAssigneeId('');
    setDecisions(['']);
    setUrlError(null);
    setSubmitError(null);
    setBusy(false);
    busyRef.current = false;
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleSubmit() {
    if (busyRef.current || disabledReason) return;

    const urlErr = validateUrl(artworkUrl);
    if (urlErr) { setUrlError(urlErr); return; }

    const cleanDecisions = decisions.map((d) => d.trim()).filter((d) => d.length > 0);
    const longDecision = cleanDecisions.find((d) => d.length > MAX_DECISION_LEN);
    if (longDecision) {
      setSubmitError(`Each decision must be ${MAX_DECISION_LEN} characters or fewer.`);
      return;
    }

    busyRef.current = true;
    setBusy(true);
    setSubmitError(null);

    try {
      const input: Parameters<typeof createReview>[2] = {
        taskId,
        ...(artworkUrl.trim() ? { artworkUrl: artworkUrl.trim() } : {}),
        ...(cleanDecisions.length > 0 ? { decisions: cleanDecisions } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      };
      const result = await createReview(workspaceId, projectId, input);
      resetForm();
      onCreated(result.review.id);
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof ApiRequestError && err.message
          ? err.message
          : 'Could not create review. Please try again.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Request design review"
      description="Attach an artwork URL and list the decisions the reviewer should evaluate."
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => { void handleSubmit(); }}
            loading={busy}
            disabled={Boolean(disabledReason) || Boolean(urlError)}
          >
            Request review
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {disabledReason ? (
          <Alert variant="warning">{disabledReason}</Alert>
        ) : null}

        {submitError ? (
          <Alert variant="error">{submitError}</Alert>
        ) : null}

        <Input
          id="artwork-url"
          label="Artwork URL"
          type="url"
          value={artworkUrl}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://www.figma.com/file/…"
          errorMessage={urlError ?? undefined}
          disabled={busy || Boolean(disabledReason)}
        />
        <p className="text-xs text-[var(--color-text-secondary)]">Must be an http or https URL with no spaces. Max 2048 characters.</p>

        {reviewerOptions.length > 0 ? (
          <Select
            id="reviewer-select"
            label="Reviewer"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            disabled={busy || Boolean(disabledReason)}
            options={[
              { value: '', label: 'No reviewer assigned' },
              ...reviewerOptions,
            ]}
          />
        ) : null}

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)]">
            Decisions
            <span className="ml-1 text-xs font-normal text-[var(--color-text-secondary)]">
              (optional, max {MAX_DECISIONS})
            </span>
          </legend>
          <div className="space-y-2">
            {decisions.map((d, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label={`Decision ${idx + 1}`}
                  value={d}
                  maxLength={MAX_DECISION_LEN}
                  onChange={(e) => updateDecision(idx, e.target.value)}
                  disabled={busy || Boolean(disabledReason)}
                  placeholder={`Decision ${idx + 1}`}
                  className={[
                    'flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)]',
                    'bg-[var(--color-surface)] px-3 py-2 text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
                    'disabled:opacity-50',
                  ].join(' ')}
                />
                {decisions.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove decision ${idx + 1}`}
                    onClick={() => removeDecision(idx)}
                    disabled={busy}
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
          {decisions.length < MAX_DECISIONS ? (
            <button
              type="button"
              onClick={addDecision}
              disabled={busy || Boolean(disabledReason)}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline disabled:opacity-40"
            >
              + Add decision
            </button>
          ) : (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">Maximum {MAX_DECISIONS} decisions.</p>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}
