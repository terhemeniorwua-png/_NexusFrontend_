'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';

interface IncomingCall {
  workspaceId: string;
  meetingId: string;
  title: string;
  callerId: string;
  callerName: string;
}

const RING_TIMEOUT_MS = 30_000;

export function IncomingCallListener() {
  const router = useRouter();
  const { activeWorkspace, switchToWorkspace } = useWorkspaceContext();
  const [call, setCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onIncoming = (payload: IncomingCall) => setCall(payload);
    socket.on('call:incoming', onIncoming);
    return () => {
      socket.off('call:incoming', onIncoming);
    };
  }, []);

  // Stop ringing after a while (missed call).
  useEffect(() => {
    if (!call) return;
    const timer = setTimeout(() => setCall(null), RING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [call]);

  if (!call) return null;

  async function accept() {
    if (!call) return;
    const target = call;
    setCall(null);
    if (activeWorkspace?.id !== target.workspaceId) {
      await switchToWorkspace(target.workspaceId);
    }
    router.push(`/app/meetings/${target.meetingId}?autojoin=1`);
  }

  return (
    <div
      role="alertdialog"
      aria-label="Incoming call"
      className="fixed bottom-4 right-4 z-[var(--z-toast)] w-[calc(100vw-2rem)] max-w-sm rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-lg)]"
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
          onClick={() => setCall(null)}
          className="h-9 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] px-4 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
