'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiRequestError } from '@/lib/api';
import { useCall } from '@/providers/CallProvider';
import { getMeetingToken, joinMeeting } from '@/services/meetings';

export function meetingJoinErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401) return 'Your session has expired. Sign in again to join.';
    if (error.status === 403) return 'You do not have access to this meeting.';
    if (error.status === 404) return 'This meeting no longer exists.';
    if (error.status === 409) return 'This meeting has ended or been cancelled.';
    if (error.status === 503) return 'Calls are not available right now. Please try again later.';
    return error.message;
  }
  if (error instanceof Error && error.name === 'NotAllowedError') {
    return 'Camera or microphone access was blocked. Allow it in your browser and try again.';
  }
  return 'Could not join the meeting. Please try again.';
}

interface MeetingRoomProps {
  /** True only for the meeting creator; shows Host controls. */
  isHost?: boolean;
  workspaceId: string;
  meetingId: string;
  title: string;
  /** Join immediately on mount (used when a call is placed from the call button). */
  autoJoin?: boolean;
  /** Start with the camera off. */
  audioOnly?: boolean;
  /** Called after joining or leaving so the participant list can refresh. */
  onParticipationChange?: () => void;
}

export function MeetingRoom({
  isHost,
  workspaceId,
  meetingId,
  title,
  autoJoin = false,
  audioOnly = false,
  onParticipationChange,
}: MeetingRoomProps) {
  const { activeCall, error: callError, startCall } = useCall();
  const [joining, setJoining] = useState(false);
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(!audioOnly);
  const [error, setError] = useState<string | null>(null);

  const notifyRef = useRef(onParticipationChange);
  useEffect(() => {
    notifyRef.current = onParticipationChange;
  }, [onParticipationChange]);

  // The room itself lives in CallProvider, so it keeps running when this page unmounts.
  const live = activeCall?.meetingId === meetingId;

  async function handleJoin() {
    if (joining || live) return;
    setError(null);
    setJoining(true);
    try {
      // Token first, so no participant record is created when access is refused.
      const next = await getMeetingToken(workspaceId, meetingId);
      await joinMeeting(workspaceId, meetingId);
      startCall({
        workspaceId,
        meetingId,
        title,
        isHost: Boolean(isHost),
        url: next.url,
        token: next.token,
        audio,
        video,
        onParticipationChange: () => notifyRef.current?.(),
      });
      notifyRef.current?.();
    } catch (err) {
      setError(meetingJoinErrorMessage(err));
    } finally {
      setJoining(false);
    }
  }

  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!autoJoin || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    void handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin]);

  if (live) {
    const message = error ?? callError;
    return <div className="space-y-3">{message && <Alert variant="error">{message}</Alert>}</div>;
  }

  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold text-[var(--color-text-primary)]">Join “{title}”</h2>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
        Choose how you want to enter. You can change your mic and camera inside the meeting.
      </p>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-4 flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={audio}
            onChange={(e) => setAudio(e.target.checked)}
            disabled={joining}
            className="rounded border-[var(--color-border)]"
          />
          Microphone on
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={video}
            onChange={(e) => setVideo(e.target.checked)}
            disabled={joining}
            className="rounded border-[var(--color-border)]"
          />
          Camera on
        </label>
      </div>

      <Button
        className="mt-5"
        onClick={() => {
          void handleJoin();
        }}
        loading={joining}
        disabled={joining}
      >
        Join meeting
      </Button>
    </Card>
  );
}
