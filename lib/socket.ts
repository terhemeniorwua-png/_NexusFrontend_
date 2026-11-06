/**
 * lib/socket.ts
 *
 * Singleton Socket.IO client for the Nexus frontend.
 *
 * Authentication: the access token is sent in the handshake `auth` payload,
 * matching the backend's `socket.handshake.auth?.token` expectation.
 * The socket connects to the same-origin `/api/backend` proxy path so that
 * the existing same-origin reverse proxy forwards the upgrade request to
 * the backend's `/socket.io` endpoint.
 *
 * Do NOT create additional socket connections in components. Use the
 * SocketProvider + useSocket hook to consume this singleton.
 */

import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

/**
 * Returns the singleton socket instance, creating it on first call.
 * The socket auto-connects when created.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  socket = io('/api/backend', {
    path: '/api/backend/socket.io',
    auth: (cb) => {
      cb({ token: getAccessToken() });
    },
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling'],
  });

  return socket;
}

/**
 * Updates the auth token on the existing socket. Called after a session
 * refresh so the socket can re-authenticate on the next reconnect.
 */
export function setSocketToken(token: string): void {
  if (!socket) return;
  socket.auth = (cb) => cb({ token });
}

/**
 * Disconnects and destroys the singleton socket. Call on logout.
 */
export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
