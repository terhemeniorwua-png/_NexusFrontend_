'use client';

import { useState } from 'react';
import { useParticipants } from '@livekit/components-react';
import { endMeetingForAll, muteAllInCall, removeFromCall } from '@/services/meetings';

interface HostControlsProps {
  workspaceId: string;
  meetingId: string;
}

export default function HostControls({ workspaceId, meetingId }: HostControlsProps) {
  const [open, setOpen] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const others = useParticipants().filter((p) => !p.isLocal);

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setNote(null);
    try {
      await action();
      setNote(done);
    } catch {
      setNote('That action failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const item = 'block w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-secondary)] disabled:opacity-50';

  return (
    <div className="relative">
      <button type="button" className="lk-button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        Host controls
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full right-0 z-40 mb-2 w-64 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-lg"
        >
          <button
            role="menuitem"
            className={item}
            disabled={busy}
            onClick={() => void run(() => muteAllInCall(workspaceId, meetingId), 'Everyone else was muted.')}
          >
            Mute all
          </button>
          <button role="menuitem" className={item} disabled={busy} onClick={() => setShowPeople((v) => !v)}>
            Remove participant {showPeople ? '▴' : '▾'}
          </button>
          {showPeople && (
            <div className="max-h-40 overflow-y-auto px-1 pb-1">
              {others.length === 0 && (
                <p className="px-2 py-1 text-xs text-[var(--color-text-muted)]">No one else is in the call.</p>
              )}
              {others.map((p) => (
                <button
                  key={p.identity}
                  className={item}
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Remove ${p.name || p.identity} from the call?`)) {
                      void run(() => removeFromCall(workspaceId, meetingId, p.identity), 'Participant removed.');
                    }
                  }}
                >
                  {p.name || p.identity}
                </button>
              ))}
            </div>
          )}
          <button
            role="menuitem"
            className={`${item} text-[var(--color-error)]`}
            disabled={busy}
            onClick={() => {
              if (window.confirm('End this meeting for everyone? Nobody will be able to join again.')) {
                void run(() => endMeetingForAll(workspaceId, meetingId), 'Meeting ended.');
              }
            }}
          >
            End meeting for everyone
          </button>
          {note && <p className="px-3 py-1 text-xs text-[var(--color-text-muted)]">{note}</p>}
        </div>
      )}
    </div>
  );
}
