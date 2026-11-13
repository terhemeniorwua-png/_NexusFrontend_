'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiRequestError } from '@/lib/api';
import {
  getMeetingToken,
  joinMeeting,
  leaveMeeting,
  type MeetingToken,
} from '@/services/meetings';

const LiveRoom = dynamic(() => import('./MeetingRoomLive'), {
  ssr: false,
  loading: () => <Skeleton className="h-[70vh] min-h-[420px] w-full" />,
});

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
  workspaceId: string;
  meetingId: string;
  title: string;
  /** Join immediately on mount (used when a call is placed from the call button). */
  autoJoin?: boolean;
  /** Called after joining or leaving so the participant list can refresh. */
  onParticipationChange?: () => void;
}

export function MeetingRoom({
  workspaceId,
  meetingId,
  title,
  autoJoin = false,
  onParticipationChange,
}: MeetingRoomProps) {
  const [phase, setPhase] = useState<'idle' | 'joining' | 'live'>('idle');
  const [audio, setAudio] = useState(true);
  const [video, setVideo] = useState(true);
  const [session, setSession] = useState<MeetingToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  const joinedRef = useRef(false);
  const notifyRef = useRef(onParticipationChange);
  useEffect(() => {
    notifyRef.current = onParticipationChange;
  }, [onParticipationChange]);

  const leave = useCallback(async () => {
    if (!joinedRef.current) return;
    joinedRef.current = false;
    try {
      await leaveMeeting(workspaceId, meetingId);
    } catch {
      // Non-fatal: the participant record is corrected on the next join.
    }
    notifyRef.current?.();
  }, [workspaceId, meetingId]);

  // Record the leave if the user navigates away while connected.
  useEffect(() => {
    return () => {
      if (joinedRef.current) {
        joinedRef.current = false;
        void leaveMeeting(workspaceId, meetingId).catch(() => undefined);
      }
    };
  }, [workspaceId, meetingId]);

  async function handleJoin() {
    if (phase !== 'idle') return;
    setError(null);
    setPhase('joining');
    try {
      // Token first, so no participant record is created when access is refused.
      const next = await getMeetingToken(workspaceId, meetingId);
      await joinMeeting(workspaceId, meetingId);
      joinedRef.current = true;
      setSession(next);
      setPhase('live');
      notifyRef.current?.();
    } catch (err) {
      setError(meetingJoinErrorMessage(err));
      setPhase('idle');
    }
  }

  const autoJoinedRef = useRef(false);
  useEffect(() => {
    if (!autoJoin || autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    void handleJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoin]);

  function handleDisconnected() {
    setSession(null);
    setPhase('idle');
    void leave();
  }

  if (phase === 'live' && session) {
    return (
      <div className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}
        <LiveRoom
          serverUrl={session.url}
          token={session.token}
          audio={audio}
          video={video}
          onDisconnected={handleDisconnected}
          onError={(err) => setError(meetingJoinErrorMessage(err))}
        />
      </div>
    );
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
            disabled={phase === 'joining'}
            className="rounded border-[var(--color-border)]"
          />
          Microphone on
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-primary)]">
          <input
            type="checkbox"
            checked={video}
            onChange={(e) => setVideo(e.target.checked)}
            disabled={phase === 'joining'}
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
        loading={phase === 'joining'}
        disabled={phase === 'joining'}
      >
        Join meeting
      </Button>
    </Card>
  );
}
