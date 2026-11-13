'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_MS = 5 * 60 * 1000;
const CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function useVoiceRecorder() {
  const [state, setState] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const cancelled = useRef(false);

  const cleanup = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = () => {
        cleanup();
        if (cancelled.current) return setState('idle');
        setElapsedMs(Date.now() - startedAt.current);
        setBlob(new Blob(chunks.current, { type: rec.mimeType || 'audio/webm' }));
        setState('preview');
      };
      recorder.current = rec;
      startedAt.current = Date.now();
      setElapsedMs(0);
      rec.start();
      setState('recording');
      timer.current = setInterval(() => {
        const ms = Date.now() - startedAt.current;
        setElapsedMs(ms);
        if (ms >= MAX_MS) stop();
      }, 200);
    } catch {
      cleanup();
      setError('Microphone access was denied or is unavailable.');
    }
  }, [cleanup, stop]);

  const cancel = useCallback(() => {
    cancelled.current = true;
    if (recorder.current?.state === 'recording') recorder.current.stop();
    else setState('idle');
    setBlob(null);
    setElapsedMs(0);
  }, []);

  const reset = useCallback(() => { setBlob(null); setElapsedMs(0); setState('idle'); }, []);

  useEffect(() => () => { cancelled.current = true; cleanup(); }, [cleanup]);

  return { state, elapsedMs, blob, error, start, stop, cancel, reset };
}
