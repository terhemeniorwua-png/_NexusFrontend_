'use client';

import { useEffect } from 'react';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

function beep(c: AudioContext, freq: number, start: number, dur: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.25, c.currentTime + start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

/** Browsers block audio until the user interacts once, so unlock on the first click or key press. */
export function useRingtone(active: boolean) {
  useEffect(() => {
    const unlock = () => {
      const c = getCtx();
      if (c && c.state === 'suspended') void c.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const ring = () => {
      const c = getCtx();
      if (!c) return;
      if (c.state === 'suspended') void c.resume();
      if (c.state !== 'running') return;
      beep(c, 440, 0, 0.4);
      beep(c, 480, 0.45, 0.4);
    };
    ring();
    const timer = setInterval(ring, 2000);
    return () => clearInterval(timer);
  }, [active]);
}
