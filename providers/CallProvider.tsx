'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Room } from 'livekit-client';
import { leaveMeeting } from '@/services/meetings';

const LiveRoom = dynamic(() => import('@/components/meetings/MeetingRoomLive'), { ssr: false });

export interface ActiveCall {
  workspaceId: string;
  meetingId: string;
  title: string;
  isHost: boolean;
  url: string;
  token: string;
  audio: boolean;
  video: boolean;
  onParticipationChange?: () => void;
}

interface CallContextValue {
  activeCall: ActiveCall | null;
  error: string | null;
  startCall: (call: ActiveCall) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
}

export function CallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [roomState, setRoomState] = useState<{ room: Room; sharing: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);

  const startCall = useCallback((call: ActiveCall) => {
    if (activeRef.current?.meetingId === call.meetingId) return;
    activeRef.current = call;
    setError(null);
    setActiveCall(call);
  }, []);

  const handleDisconnected = useCallback((call: ActiveCall) => {
    void leaveMeeting(call.workspaceId, call.meetingId).catch(() => undefined);
    // A replaced call must not clear the new one.
    if (activeRef.current?.meetingId !== call.meetingId) return;
    activeRef.current = null;
    setActiveCall(null);
    setRoomState(null);
    setError(null);
    call.onParticipationChange?.();
  }, []);

  const value = useMemo(() => ({ activeCall, error, startCall }), [activeCall, error, startCall]);
  const callHref = activeCall ? `/app/meetings/${activeCall.meetingId}` : '';
  const onCallPage = Boolean(activeCall) && (pathname ?? '').startsWith(callHref);

  return (
    <CallContext.Provider value={value}>
      {children}
      {activeCall && (
        // Hidden, never unmounted, when the user is on another page: the connection and screen share keep running.
        <div key={activeCall.meetingId} style={{ display: onCallPage ? 'contents' : 'none' }}>
          <LiveRoom
            host={activeCall.isHost ? { workspaceId: activeCall.workspaceId, meetingId: activeCall.meetingId } : undefined}
            serverUrl={activeCall.url}
            token={activeCall.token}
            audio={activeCall.audio}
            video={activeCall.video}
            onDisconnected={() => handleDisconnected(activeCall)}
            onError={(err) => setError(err.message)}
            onRoomState={setRoomState}
          />
        </div>
      )}
      {activeCall && !onCallPage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm shadow-lg">
          <span className="font-medium text-[var(--color-text-primary)]">
            <span className="text-red-500">●</span> {roomState?.sharing ? 'Sharing your screen' : `In call: ${activeCall.title}`}
          </span>
          <Link href={callHref} className="rounded-md bg-[var(--color-surface-secondary)] px-3 py-1.5">
            Return to call
          </Link>
          {roomState && (
            <button
              type="button"
              className="rounded-md bg-[var(--color-surface-secondary)] px-3 py-1.5"
              onClick={() => void roomState.room.localParticipant.setScreenShareEnabled(!roomState.sharing)}
            >
              {roomState.sharing ? 'Stop sharing' : 'Share screen'}
            </button>
          )}
          <button
            type="button"
            className="rounded-md bg-red-600 px-3 py-1.5 text-white"
            onClick={() => roomState?.room.disconnect()}
          >
            Leave
          </button>
        </div>
      )}
    </CallContext.Provider>
  );
}
