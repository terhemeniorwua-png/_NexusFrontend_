'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type AnnounceFn = (message: string) => void;

export interface UseAnnouncerResult {
  announce: AnnounceFn;
  message: string;
}

const RESET_DELAY_MS = 50;

/**
 * Manages the text for a polite live region.
 *
 * The region is cleared before the next message is written so that repeating
 * the same message is announced again instead of being ignored as unchanged.
 */
export function useAnnouncer(): UseAnnouncerResult {
  const [message, setMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    setMessage('');
    timerRef.current = setTimeout(() => {
      setMessage(next);
      timerRef.current = null;
    }, RESET_DELAY_MS);
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { announce, message };
}

interface LiveAnnouncerProps {
  message: string;
}

/** Visually hidden polite live region. Render the `message` from `useAnnouncer`. */
export function LiveAnnouncer({ message }: LiveAnnouncerProps) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

/** Backwards-friendly name for the standalone region. */
export const LiveAnnouncerRegion = LiveAnnouncer;
