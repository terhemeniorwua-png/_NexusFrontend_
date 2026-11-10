'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, destroySocket, setSocketToken } from '@/lib/socket';
import { getAccessToken } from '@/lib/api';
import { useWorkspaceContext } from '@/providers/WorkspaceProvider';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface SocketContextValue {
  socket: Socket | null;
  status: ConnectionStatus;
  /** User ids that have announced presence in the active workspace. */
  onlineUserIds: string[];
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useWorkspaceContext();
  const workspaceId = activeWorkspace?.id ?? null;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  // Presence is scoped to the workspace it was observed in. Deriving the
  // exposed list avoids clearing state inside an effect when the workspace
  // changes or disappears.
  const [presence, setPresence] = useState<{
    workspaceId: string | null;
    ids: string[];
  }>({ workspaceId: null, ids: [] });
  const onlineUserIds = useMemo(
    () => (presence.workspaceId === workspaceId ? presence.ids : []),
    [presence, workspaceId],
  );
  const initialized = useRef(false);
  // Kept in a ref so the one-time connect handler can re-join the room after a
  // reconnect without re-registering every listener.
  const workspaceIdRef = useRef<string | null>(workspaceId);

  useEffect(() => {
    workspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();
    setSocket(s);

    // Sync the access token whenever it changes (e.g. after a refresh)
    const token = getAccessToken();
    if (token) setSocketToken(token);

    const joinActiveWorkspace = () => {
      const currentWorkspaceId = workspaceIdRef.current;
      if (!currentWorkspaceId) return;
      s.emit('workspace:join', currentWorkspaceId);
      s.emit('presence:online');
    };

    const onConnect = () => {
      setStatus('connected');
      // Socket.IO rooms are per-connection, so they must be re-joined after
      // every successful (re)connection.
      joinActiveWorkspace();
    };
    const onDisconnect = () => {
      setStatus('disconnected');
      setPresence({ workspaceId: workspaceIdRef.current, ids: [] });
    };
    const onConnectError = () => setStatus('connecting');
    const onReconnectAttempt = () => setStatus('reconnecting');
    const onReconnect = () => setStatus('connected');
    const onReconnectError = () => setStatus('disconnected');

    const onPresenceOnline = (data: { userId?: string }) => {
      if (!data?.userId) return;
      const userId = data.userId;
      setPresence((current) => {
        const ids = current.workspaceId === workspaceIdRef.current ? current.ids : [];
        return {
          workspaceId: workspaceIdRef.current,
          ids: ids.includes(userId) ? ids : [...ids, userId],
        };
      });
    };
    const onPresenceOffline = (data: { userId?: string }) => {
      if (!data?.userId) return;
      const userId = data.userId;
      setPresence((current) => ({
        workspaceId: current.workspaceId,
        ids: current.ids.filter((id) => id !== userId),
      }));
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onConnectError);
    s.on('presence:online', onPresenceOnline);
    s.on('presence:offline', onPresenceOffline);
    s.io.on('reconnect_attempt', onReconnectAttempt);
    s.io.on('reconnect', onReconnect);
    s.io.on('reconnect_error', onReconnectError);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onConnectError);
      s.off('presence:online', onPresenceOnline);
      s.off('presence:offline', onPresenceOffline);
      s.io.off('reconnect_attempt', onReconnectAttempt);
      s.io.off('reconnect', onReconnect);
      s.io.off('reconnect_error', onReconnectError);
    };
  }, []);

  // Join the active workspace room and announce presence. The cleanup leaves
  // the previous room so events from a switched-away workspace are not
  // delivered to this client.
  useEffect(() => {
    if (!socket || !workspaceId) return;
    socket.emit('workspace:join', workspaceId);
    socket.emit('presence:online');

    return () => {
      socket.emit('workspace:leave', workspaceId);
    };
  }, [socket, workspaceId]);

  // Clean up on unmount (e.g. logout)
  useEffect(() => {
    return () => {
      destroySocket();
    };
  }, []);

  const value = useMemo<SocketContextValue>(
    () => ({ socket, status, onlineUserIds }),
    [socket, status, onlineUserIds],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}

/**
 * Invokes `onReconnect` after the shared socket reconnects. Pages that hold
 * cached server data can use this to refetch instead of showing stale state.
 * The initial connection does not trigger a refetch.
 */
export function useRealtimeRefresh(onReconnect: () => void): void {
  // Read the context directly so the hook is safe in isolated component tests
  // and in shells rendered without a SocketProvider.
  const ctx = useContext(SocketContext);
  const socket = ctx?.socket ?? null;
  const callbackRef = useRef(onReconnect);

  useEffect(() => {
    callbackRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => callbackRef.current();
    socket.io.on('reconnect', handler);
    return () => {
      socket.io.off('reconnect', handler);
    };
  }, [socket]);
}

/** Convenience hook for the current connection status. */
export function useConnectionStatus(): ConnectionStatus {
  return useSocket().status;
}

/** Kept as a stable helper for components that only need a memoised set. */
export function useOnlineUsers(): Set<string> {
  const { onlineUserIds } = useSocket();
  return useMemo(() => new Set(onlineUserIds), [onlineUserIds]);
}
