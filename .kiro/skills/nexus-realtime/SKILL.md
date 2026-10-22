---
name: nexus-realtime
description: Socket.IO client setup, real-time task and message event handling, typing indicators, online presence, and the notification system for the Nexus frontend.
---

# Nexus Real-Time Skill

## 1. Purpose

This skill defines real-time communication standards for the Nexus frontend using Socket.IO. Apply these standards in Phase 9 and maintain them through Phases 10–15.

**BLOCKED until the backend Socket.IO gateway contract is confirmed.** Do not invent event names, room naming conventions, payload shapes, or authentication methods.

Before implementing:
1. Read `AGENTS.md`.
2. Read Phase 9 in `PHASES.md` for its tasks, backend dependencies, and acceptance criteria.
3. Confirm all Socket.IO event contracts with the backend team.

## 2. Installation

Install `socket.io-client` in Phase 9:
- Confirm the `socket.io-client` version matches the backend's `socket.io` server version before installing.
- Add `NEXT_PUBLIC_SOCKET_URL` to `.env.example` (placeholder value only).

## 3. Socket Client (`lib/socket.ts`)

Create a **singleton socket client** in `lib/socket.ts`:

- Connect to `NEXT_PUBLIC_SOCKET_URL`.
- Authenticate per backend contract (token in handshake auth, HttpOnly cookie, or query parameter — confirm with backend).
- Manage connection and reconnection state.
- Never log authentication tokens or session secrets.
- Export a single socket instance — do not create per-component socket connections.

## 4. Socket Provider and Hook

### `providers/SocketProvider.tsx`
- Wrap the authenticated app tree.
- Initialize the socket connection on mount.
- Disconnect on logout or session expiry.
- Provide: socket instance and connection status (`connected`, `reconnecting`, `disconnected`).

### `hooks/useSocket.ts`
- Consume `SocketProvider`.
- Return socket instance and connection status.
- Allow components to subscribe to events safely.

### Connection status indicator
- Show connection status in `TopNav`: connected (no indicator), reconnecting (yellow), disconnected (red).
- Do not block UI interaction while reconnecting — use optimistic state where appropriate.

## 5. Event Subscription Rules

For every socket event subscription:

1. Subscribe on component mount.
2. **Clean up on component unmount** — call `socket.off(eventName, handler)` in the effect cleanup.
3. Prevent duplicate listeners — use the same function reference in `on` and `off`.
4. Do not subscribe at the module level — subscribe within React effects.
5. Do not register the same event listener from multiple components when a shared context can handle it.

```typescript
// Example pattern
useEffect(() => {
  function handleTaskUpdated(payload: TaskUpdatedPayload) {
    // update local state
  }
  socket.on('task:updated', handleTaskUpdated);
  return () => {
    socket.off('task:updated', handleTaskUpdated);
  };
}, [socket]);
```

## 6. Task Real-Time Events (Phase 9)

Confirm exact event names and payload shapes with the backend before implementing.

| Event (placeholder) | Trigger | Frontend action |
|---|---|---|
| `task:created` | A task is created in a project/workspace | Add to task list and Kanban board |
| `task:updated` | A task field or status changes | Update task card and detail panel |
| `task:deleted` | A task is deleted | Remove from list and board |

- Subscribe at the workspace or project level per room conventions.
- Update Kanban board and task list without a full page refresh.
- Reconcile with optimistic updates from Phase 6 drag-and-drop.
- Handle the case where the incoming event is for the same action the current user just performed (avoid duplicating local state updates).

## 7. Messaging Real-Time Events (Phase 9)

Confirm exact event names with the backend.

| Event (placeholder) | Trigger | Frontend action |
|---|---|---|
| `message:created` | A new message in a conversation | Append to active thread |
| `message:edited` | A message is edited | Update message in thread |
| `message:deleted` | A message is deleted | Remove from thread |
| `message:reaction` | A reaction is added or removed | Update reactions on message |
| `typing:start` | A user starts typing | Show typing indicator |
| `typing:stop` | A user stops typing | Hide typing indicator |

- Update conversation unread counts on `message:created` for inactive conversations.
- Typing indicator: send `typing:start` event on composer input; clear after debounce; display "X is typing…".
- Do not duplicate messages that arrive via both REST (optimistic send) and socket event — deduplicate by message ID.

## 8. Online Presence (Phase 9)

- Subscribe to `user:online` and `user:offline` events if the backend provides them.
- Show a green presence dot on user avatars when online.
- If the backend does not implement presence events, mark as **deferred** — do not simulate it.

## 9. Notification Real-Time Events (Phase 9)

| Event (placeholder) | Frontend action |
|---|---|
| `notification:created` | Increment TopNav bell badge; optionally show a toast |

- Deduplicate notifications: if the same notification ID arrives via both REST poll and socket event, show it only once.
- Navigate from notification to the correct resource (task, project, message) using `lib/routes.ts` constants.

## 10. Notification System (Phase 9)

### Services and types
- `services/notifications.ts`: `getNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`.
- `types/notifications.ts`: `Notification`, `NotificationType`, `NotificationStatus`.

### Notification inbox page
- Route: `app/(auth)/notifications/page.tsx`.
- Paginated list.
- Filter by type.
- Mark individual notification as read.
- Mark all as read.
- Navigate to referenced resource.

### TopNav bell
- Unread count badge.
- Dropdown preview of latest notifications.
- Opens full inbox on click.

### Supported notification types (confirm with backend)
- Task assigned.
- Task comment or mention.
- Task status changed (APPROVED, CHANGES_REQUESTED).
- Project invitation.
- Direct message.
- Meeting invite.
- AI job completed.

## 11. Security Rules

- Never subscribe to events for resources the user is not authorized to access.
- Do not treat frontend room selection as proof of authorization — the backend controls room membership.
- Authenticate the socket connection per the backend's documented method.
- Do not log message content, auth tokens, or private data in socket event handlers.
- Disconnect the socket on logout and clear all event listeners.

## 12. Testing Requirements

- Unit tests for socket event handlers: mock socket, emit event, assert UI state change.
- Test listener cleanup: confirm no duplicate listeners after component remount.
- Component tests: notification list unread badge, mark-as-read interaction.
- Integration test: socket reconnection — disconnect, reconnect, confirm state is reconciled.
