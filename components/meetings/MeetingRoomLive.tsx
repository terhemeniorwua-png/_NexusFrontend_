'use client';

import '@livekit/components-styles';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { Track } from 'livekit-client';
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  useChat,
  useTracks,
} from '@livekit/components-react';

interface MeetingRoomLiveProps {
  serverUrl: string;
  token: string;
  audio: boolean;
  video: boolean;
  onDisconnected: () => void;
  onError: (error: Error) => void;
}

/** Fit the call to the area under the header and right of the sidebar. */
function useContentInset() {
  const [inset, setInset] = useState({ top: 56, left: 0 });
  useEffect(() => {
    const main = document.getElementById('main-content');
    const measure = () => {
      if (!main) return;
      const rect = main.getBoundingClientRect();
      const padLeft = parseFloat(window.getComputedStyle(main).paddingLeft) || 0;
      setInset({ top: Math.max(rect.top, 0), left: Math.max(rect.left + padLeft, 0) });
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = main ? new ResizeObserver(measure) : null;
    if (main && observer) observer.observe(main);
    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);
  return inset;
}

function CallLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const { chatMessages, send } = useChat();
  const [chatOpen, setChatOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const unread = chatOpen ? 0 : Math.max(chatMessages.length - seen, 0);

  useEffect(() => {
    if (chatOpen) setSeen(chatMessages.length);
  }, [chatOpen, chatMessages.length]);

  useEffect(() => {
    if (chatOpen) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatOpen, chatMessages.length]);

  function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    void send(text);
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <GridLayout tracks={tracks} style={{ height: '100%' }}>
            <ParticipantTile />
          </GridLayout>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-[var(--color-border)] p-2">
          <ControlBar variation="minimal" controls={{ chat: false }} />
          <button
            type="button"
            onClick={() => setChatOpen((v) => !v)}
            className="lk-button relative"
            aria-label="Toggle chat"
          >
            Chat
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[var(--color-primary)] px-1.5 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {chatOpen && (
        <aside
          className="flex w-80 shrink-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)]"
          aria-label="Call chat"
        >
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <h2 className="text-sm font-semibold">Chat</h2>
            <button type="button" onClick={() => setChatOpen(false)} className="text-sm" aria-label="Close chat">
              Close
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {chatMessages.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">
                No messages yet. Messages disappear when the call ends.
              </p>
            )}
            {chatMessages.map((m, i) => {
              const mine = Boolean(m.from?.isLocal);
              return (
                <div key={`${m.timestamp}-${i}`} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {mine ? 'You' : m.from?.name || m.from?.identity || 'Guest'}
                  </span>
                  <p
                    className={`mt-0.5 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]'
                    }`}
                  >
                    {m.message}
                  </p>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="flex gap-2 border-t border-[var(--color-border)] p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              maxLength={2000}
              className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
            />
            <button type="submit" disabled={!draft.trim()} className="lk-button">
              Send
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}

/** Loaded client-only (no SSR). */
export default function MeetingRoomLive({
  serverUrl,
  token,
  audio,
  video,
  onDisconnected,
  onError,
}: MeetingRoomLiveProps) {
  const inset = useContentInset();
  return (
    <div
      data-lk-theme="default"
      style={
        {
          position: 'fixed',
          top: inset.top,
          left: inset.left,
          right: 0,
          bottom: 0,
          zIndex: 30,
          '--lk-bg': 'var(--color-surface)',
          '--lk-bg2': 'var(--color-surface-secondary)',
          '--lk-bg3': 'var(--color-surface-secondary)',
          '--lk-fg': 'var(--color-text-primary)',
          '--lk-fg2': 'var(--color-text-secondary)',
          '--lk-control-fg': 'var(--color-text-primary)',
          '--lk-control-bg': 'var(--color-surface-secondary)',
          '--lk-control-hover-bg': 'var(--color-border)',
          '--lk-accent-bg': 'var(--color-primary)',
          '--lk-accent-fg': '#fff',
          '--lk-border-color': 'var(--color-border)',
        } as CSSProperties
      }
      className="overflow-hidden bg-[var(--color-surface)]"
    >
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        audio={audio}
        video={video}
        onDisconnected={onDisconnected}
        onError={onError}
        style={{ height: '100%' }}
      >
        <CallLayout />
        <RoomAudioRenderer />
        <StartAudio label="Click to enable audio" />
      </LiveKitRoom>
    </div>
  );
}
