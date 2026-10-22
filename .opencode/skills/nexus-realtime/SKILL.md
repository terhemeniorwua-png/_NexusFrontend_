---
name: nexus-realtime
description: Socket.IO client setup, real-time task and message event handling, typing indicators, online presence, and the notification system for the Nexus frontend.
---

# Nexus Real-Time Skill

## 1. Purpose

This skill defines real-time communication standards using Socket.IO. Applies from Phase 9.

**BLOCKED until the backend Socket.IO gateway contract is confirmed.** Do not invent event names, payloads, room conventions, or auth methods.

Before implementing: Read `AGENTS.md`, read Phase 9 in `PHASES.md`, confirm all contracts with backend team.

## 2. Installation

Install `socket.io-client` in Phase 9. Confirm version matches backend's `socket.io` version. Add `NEXT_PUBLIC_SOCKET_URL` to `.env.example`.

## 3. Key Files

| File | Purpose |
|---|---|
| `lib/socket.ts` | Singleton socket instance |
| `providers/SocketProvider.tsx` | Connection management, status context |
| `hooks/useSocket.ts` | Access socket and status from components |
| `services/notifications.ts` | Notification REST calls |
| `types/notifications.ts` | Notification type definitions |

## 4. Socket Client (`lib/socket.ts`)

Singleton pattern — one connection for the entire authenticated session:
- Connect to `NEXT_PUBLIC_SOCKET_URL`.
- Authenticate per backend contract.
- Manage reconnection automatically.
- Never log auth tokens.
- Disconnect on logout.

## 5. Event Subscription Rules

1. Subscribe on component mount.
2. **Clean up on unmount** — `socket.off(event, handler)` in effect cleanup.
3. Use the same handler reference in `on` and `off` to prevent listener leaks.
4. Do not register the same event from multiple components when a shared context suffices.

```typescript
useEffect(() => {
  const handler = (payload: TaskUpdatedPayload) => { /* update state */ };
  socket.on('task:updated', handler);
  return () => socket.off('task:updated', handler);
}, [socket]);
```

## 6. Task Events (Confirm with Backend)

`task:created`, `task:updated`, `task:deleted` — update Kanban board and list without page refresh.

## 7. Message Events (Confirm with Backend)

`message:created`, `message:edited`, `message:deleted`, `message:reaction` — update active conversation thread.
`typing:start`, `typing:stop` — show/hide typing indicator.

Deduplicate messages by ID (REST optimistic send + socket event).

## 8. Notification System

- `notification:created` socket event — increment TopNav bell badge.
- Deduplicate by notification ID.
- Navigate from notification to resource using `lib/routes.ts`.
- Notification inbox at `app/(auth)/notifications/page.tsx`.
- Support: mark as read, mark all as read, paginated list, filter by type.

## 9. Security

- Never subscribe to events for resources the user cannot access.
- Backend controls room membership — frontend room selection is not authorization.
- Disconnect socket on logout and clear all listeners.
- Never log message content or auth tokens in event handlers.

See `nexus-frontend/references/realtime.md` for detailed contracts and patterns.
