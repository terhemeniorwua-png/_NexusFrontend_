'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { Socket } from 'socket.io-client';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

/**
 * Subscribe to a Socket.IO event on a socket instance.
 * Automatically cleans up the listener when the component unmounts
 * or the event/handler changes.
 */
export function useSocketEvent<T = unknown>(
  socket: Socket | null,
  event: string,
  handler: (data: T) => void,
): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!socket) return;

    const listener = (data: T) => handlerRef.current(data);
    socket.on(event, listener);

    return () => {
      socket.off(event, listener);
    };
  }, [socket, event]);
}

/**
 * Manage typing-indicator state for a channel.
 * Emits `typing:start` when the user starts typing and `typing:stop`
 * after 2 seconds of inactivity or on explicit stop.
 */
export function useTypingIndicator(
  socket: Socket | null,
  channelId: string | null,
  userId: string | null,
): { onStart: () => void; onStop: () => void; activeTypers: string[] } {
  const [activeTypers, setActiveTypers] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for typing events from others
  useEffect(() => {
    if (!socket || !channelId) return;

    const onStart = (data: { channelId: string; userId: string }) => {
      if (data.channelId !== channelId || data.userId === userId) return;
      setActiveTypers((prev) => prev.includes(data.userId) ? prev : [...prev, data.userId]);
    };

    const onStop = (data: { channelId: string; userId: string }) => {
      if (data.channelId !== channelId) return;
      setActiveTypers((prev) => prev.filter((u) => u !== data.userId));
    };

    socket.on('typing:start', onStart);
    socket.on('typing:stop', onStop);

    return () => {
      socket.off('typing:start', onStart);
      socket.off('typing:stop', onStop);
    };
  }, [socket, channelId, userId]);

  const onStart = useCallback(() => {
    if (!socket || !channelId) return;
    socket.emit('typing:start', channelId);

    // Auto-stop after 2 seconds of inactivity
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      socket.emit('typing:stop', channelId);
    }, 2000);
  }, [socket, channelId]);

  const onStop = useCallback(() => {
    if (!socket || !channelId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    socket.emit('typing:stop', channelId);
    setActiveTypers([]);
  }, [socket, channelId]);

  return { onStart, onStop, activeTypers };
}

export type { RefObject };
