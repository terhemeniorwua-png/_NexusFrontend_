'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Room, RoomEvent } from 'livekit-client';

type CallContextValue = {
  room: Room | null;
  inCall: boolean;
  sharing: boolean;
  join: (url: string, token: string) => Promise<Room>;
  leave: () => void;
  toggleShare: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used inside <CallProvider>');
  return ctx;
}

export function CallProvider({
  children,
  callHref = '/app/meetings',
}: {
  children: ReactNode;
  callHref?: string;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [sharing, setSharing] = useState(false);

  const join = useCallback(async (url: string, token: string) => {
    const next = new Room();
    const sync = () => setSharing(next.localParticipant.isScreenShareEnabled);
    next.on(RoomEvent.LocalTrackPublished, sync);
    next.on(RoomEvent.LocalTrackUnpublished, sync); // also fires when the browser's own "Stop sharing" is used
    next.on(RoomEvent.Disconnected, () => {
      setRoom(null);
      setSharing(false);
    });
    await next.connect(url, token);
    setRoom(next);
    return next;
  }, []);

  // Only the Leave button should call this, never a page unmount.
  const leave = useCallback(() => {
    room?.disconnect();
  }, [room]);

  const toggleShare = useCallback(async () => {
    if (!room) return;
    const lp = room.localParticipant;
    await lp.setScreenShareEnabled(!lp.isScreenShareEnabled);
    setSharing(lp.isScreenShareEnabled);
  }, [room]);

  return (
    <CallContext.Provider value={{ room, inCall: !!room, sharing, join, leave, toggleShare }}>
      {children}
      {room && <MiniCallBar callHref={callHref} />}
    </CallContext.Provider>
  );
}

function MiniCallBar({ callHref }: { callHref: string }) {
  const { sharing, toggleShare, leave } = useCall();
  const btn: React.CSSProperties = {
    padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: '#2a2f45', color: '#fff', fontSize: 13,
  };
  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 12, background: '#12151f', border: '1px solid #2a2f45', color: '#fff',
      }}
    >
      <span style={{ fontSize: 13 }}>
        <span style={{ color: '#f43f5e' }}>●</span> {sharing ? 'Sharing your screen' : 'In call'}
      </span>
      <Link href={callHref} style={{ ...btn, textDecoration: 'none' }}>Return to call</Link>
      <button style={btn} onClick={toggleShare}>{sharing ? 'Stop sharing' : 'Share screen'}</button>
      <button style={{ ...btn, background: '#dc2626' }} onClick={leave}>Leave</button>
    </div>
  );
}
