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
import { refreshSession } from '@/services/auth';

let socket: Socket | null = null;
let configurationError: string | null = null;

/**
 * Returns the singleton socket instance, creating it on first call.
 * The socket auto-connects when created.
 *
 * If NEXT_PUBLIC_SOCKET_URL is not set, the socket will not connect and a
 * configuration error is available via `getConfigurationError()`.
 */
export function getSocket(): Socket {
  if (socket) return socket;

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) {
    configurationError =
      'NEXT_PUBLIC_SOCKET_URL is not set. Real-time features will not work. ' +
      'Set NEXT_PUBLIC_SOCKET_URL to the Socket.IO server origin (no trailing slash).';
    // Return null so callers can check the error instead of connecting
    return null as unknown as Socket;
  }

  socket = io(socketUrl, {
    path: '/socket.io',
    auth: (cb) => {
      void (async () => {
        let token = getAccessToken();
        if (!token) {
          try {
            await refreshSession();
            token = getAccessToken();
          } catch {
            // Fall through; the server will reject and the client will retry.
          }
        }
        cb({ token });
      })();
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

/**
 * Returns the configuration error string if NEXT_PUBLIC_SOCKET_URL is missing,
 * otherwise returns null. Consumers (e.g. SocketProvider, UI banner) can call
 * this to surface a clear error to the user instead of silently broken realtime.
 */
export function getConfigurationError(): string | null {
  return configurationError;
}
