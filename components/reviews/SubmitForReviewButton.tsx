'use client';

import { useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ApiRequestError } from '@/lib/api';
import { createReview } from '@/services/reviews';

interface SubmitForReviewButtonProps {
  workspaceId: string;
  projectId: string;
  /** Exactly one typed review target, matching the backend create contract. */
  target: { attachmentVersionId: string } | { checklistId: string };
  canSubmit: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  label?: string;
  onSubmitted?: (reviewId: string) => void;
}

/**
 * Shared submission entry point used by the FE-3 version panel and the FE-4
 * checklist page. Backend messages (CHECKLIST_NOT_READY, REVIEW_ALREADY_OPEN,
 * REVIEW_ALREADY_APPROVED) are surfaced verbatim.
 */
export function SubmitForReviewButton({
  workspaceId,
  projectId,
  target,
  canSubmit,
  disabled = false,
  size = 'md',
  label = 'Submit for review',
  onSubmitted,
}: SubmitForReviewButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  async function handleSubmit(): Promise<void> {
    if (busyRef.current || disabled || !workspaceId || !projectId) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await createReview(workspaceId, projectId, target);
      onSubmitted?.(result.review.id);
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError && cause.message
          ? cause.message
          : 'Unable to submit for review. Please try again.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (!canSubmit) return null;

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        size={size}
        variant="secondary"
        disabled={disabled}
        loading={busy}
        onClick={() => { void handleSubmit(); }}
      >
        {label}
      </Button>
      {error ? (
        <Alert variant="error" className="whitespace-normal text-left">
          {error}
        </Alert>
      ) : null}
    </span>
  );
}
