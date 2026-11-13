'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';
import { declineMeeting } from '@/services/meetings';

interface IncomingCall {
  workspaceId: string;
  meetingId: string;
  title: string;
  callerId: string;
  callerName: string;
}

interface CallEvent {
  workspaceId: string;
  meetingId: string;
  title: string;
  userId?: string;
  userName?: string;
  calleeId?: string;
  callerId?: string;
}

const NOTICE_MS = 8_000;

export function IncomingCallListener() {
  const router = useRouter();
  const { activeWorkspace, user, switchToWorkspace } = useWorkspaceContext();
  const [call, setCall] = useState<IncomingCall | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userIdRef = useRef(user?.id);
  const callRef = useRef<IncomingCall | null>(null);

  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  useEffect(() => { callRef.current = call; }, [call]);

  useEffect(() => {
    const socket = getSocket();

    const onIncoming = (payload: IncomingCall) => setCall(payload);

    // Caller side: the other person declined.
    const onDeclined = (e: CallEvent) => {
      setNotice(`${e.userName ?? 'Someone'} declined your call.`);
    };

    // Both sides: nobody answered in time. The server decides, so the
    // ring stops even if this tab was in the background.
    const onMissed = (e: CallEvent) => {
      const me = userIdRef.current;
      if (me && e.calleeId === me) {
        if (callRef.current?.meetingId === e.meetingId) setCall(null);
        setNotice(`You missed a call: ${e.title}`);
      } else if (me && e.callerId === me) {
        setNotice('No answer. Your call was not picked up.');
      }
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:declined', onDeclined);
    socket.on('call:missed', onMissed);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:declined', onDeclined);
      socket.off('call:missed', onMissed);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  // Ringtone while the card is showing. Browsers only allow sound after the
  // user has interacted with the page, so a fresh tab may ring silently.
  useEffect(() => {
    if (!call) return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume().catch(() => undefined);
    const beep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    };
    beep();
    const timer = setInterval(beep, 2000);
    return () => {
      clearInterval(timer);
      void ctx.close().catch(() => undefined);
    };
  }, [call]);

  async function accept() {
    if (!call) return;
    const target = call;
    setCall(null);
    if (activeWorkspace?.id !== target.workspaceId) {
      await switchToWorkspace(target.workspaceId);
    }
    const voiceOnly = target.title.startsWith('Voice call');
    router.push(`/app/meetings/${target.meetingId}?autojoin=1${voiceOnly ? '&mode=audio' : ''}`);
  }

  function decline() {
    if (!call) return;
    const target = call;
    setCall(null);
    void declineMeeting(target.workspaceId, target.meetingId).catch(() => undefined);
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[var(--z-toast)] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {notice && (
        <div
          role="status"
          className="pointer-events-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-primary)] shadow-[var(--shadow-lg)]"
        >
          {notice}
        </div>
      )}
      {call && (
        <div
          role="alertdialog"
          aria-label="Incoming call"
          className="pointer-events-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)]"
        >
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            Incoming call from {call.callerName}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-text-secondary)]">{call.title}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { void accept(); }}
              className="h-9 flex-1 rounded-[var(--radius-md)] bg-[var(--color-success)] px-4 text-sm font-medium text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={decline}
              className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
