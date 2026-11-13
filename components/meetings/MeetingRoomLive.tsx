'use client';

import '@livekit/components-styles';
import { LiveKitRoom, StartAudio, VideoConference } from '@livekit/components-react';

interface MeetingRoomLiveProps {
  serverUrl: string;
  token: string;
  audio: boolean;
  video: boolean;
  onDisconnected: () => void;
  onError: (error: Error) => void;
}

/** Loaded client-only (no SSR). VideoConference already renders the audio output. */
export default function MeetingRoomLive({
  serverUrl,
  token,
  audio,
  video,
  onDisconnected,
  onError,
}: MeetingRoomLiveProps) {
  return (
    <div
      data-lk-theme="default"
      style={
        {
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
        } as React.CSSProperties
      }
      className="h-[70vh] min-h-[420px] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)]"
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
        <VideoConference />
        <StartAudio label="Click to enable audio" />
      </LiveKitRoom>
    </div>
  );
}
