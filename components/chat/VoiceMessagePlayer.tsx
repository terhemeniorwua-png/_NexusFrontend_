'use client';

import { useEffect, useState } from 'react';
import { fetchVoiceAudio } from '@/services/messages';

export function VoiceMessagePlayer({
  workspaceId,
  channelId,
  messageId,
  durationMs,
}: {
  workspaceId: string;
  channelId: string;
  messageId: string;
  durationMs: number | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const blob = await fetchVoiceAudio(workspaceId, channelId, messageId);
      setUrl(URL.createObjectURL(blob));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  const secs = Math.max(1, Math.round((durationMs ?? 0) / 1000));
  if (url) return <audio src={url} controls autoPlay className="mt-1 h-9 max-w-full" />;
  return (
    <button
      type="button"
      onClick={() => void load()}
      disabled={loading}
      className="mt-1 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm"
    >
      <span aria-hidden="true">{loading ? '…' : '▶'}</span>
      <span>{failed ? 'Could not load, tap to retry' : `Voice message · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}</span>
    </button>
  );
}
