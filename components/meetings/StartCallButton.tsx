'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiRequestError } from '@/lib/api';
import { createMeeting, updateMeeting } from '@/services/meetings';

interface StartCallButtonProps {
  workspaceId: string;
  /** When set, that member is added to the call. Omit for an open instant call. */
  targetUserId?: string;
  targetName?: string;
  /** "icon" is a round icon button, "button" adds a text label. */
  variant?: 'icon' | 'button';
  className?: string;
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function StartCallButton({
  workspaceId,
  targetUserId,
  targetName,
  variant = 'icon',
  className = '',
}: StartCallButtonProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = targetName ? `Call ${targetName}` : 'Start a call';

  async function handleClick() {
    if (starting || !workspaceId) return;
    setStarting(true);
    setError(null);
    try {
      const meeting = await createMeeting(workspaceId, {
        title: targetName ? `Call with ${targetName}` : 'Instant call',
        scheduledAt: null,
        participantIds: targetUserId ? [targetUserId] : [],
      });
      try {
        await updateMeeting(workspaceId, meeting.id, { status: 'LIVE' });
      } catch {
        // Non-fatal: the room can still be joined while the status is SCHEDULED.
      }
      router.push(`/app/meetings/${meeting.id}?autojoin=1`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not start the call.');
      setStarting(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => { void handleClick(); }}
        disabled={starting || !workspaceId}
        aria-label={label}
        title={label}
        className={[
          'inline-flex items-center justify-center gap-2 text-sm font-medium transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]',
          variant === 'icon'
            ? 'h-9 w-9 rounded-full bg-[var(--color-success)] text-white hover:opacity-90'
            : 'h-9 rounded-[var(--radius-md)] bg-[var(--color-success)] px-4 text-white hover:opacity-90',
          className,
        ].join(' ')}
      >
        <PhoneIcon />
        {variant === 'button' && <span>{starting ? 'Starting…' : 'Start call'}</span>}
      </button>
      {error && <span role="alert" className="text-xs text-[var(--color-danger,#dc2626)]">{error}</span>}
    </span>
  );
}
