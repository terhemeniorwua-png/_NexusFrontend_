# Nexus Frontend — Real-Time Reference

## Status

All Socket.IO contracts are **PENDING** confirmation from the backend team. See `PHASES.md` Phase 9 and Appendix B.

Do not implement real-time features without confirmed event names, payload shapes, room naming conventions, and authentication method.

## Key Files

| File | Phase | Purpose |
|---|---|---|
| `lib/socket.ts` | 9 | Singleton socket.io-client instance |
| `providers/SocketProvider.tsx` | 9 | Connection management, status context |
| `hooks/useSocket.ts` | 9 | Access socket and connection status |
| `services/notifications.ts` | 9 | Notification REST API calls |
| `types/notifications.ts` | 9 | Notification type definitions |

## Socket Client Setup

```typescript
// lib/socket.ts (Phase 9 — confirm auth method with backend)
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      // auth: { token } or withCredentials: true
      // Confirm method with backend team
      withCredentials: true,
      autoConnect: false,
    });
  }
  return socket;
}

export function connectSocket(): void {
  getSocket().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
```

## Event Listener Lifecycle Rule

**Always clean up listeners in effect cleanup functions:**

```typescript
useEffect(() => {
  function handleTaskUpdated(payload: TaskUpdatedPayload) {
    setTasks(prev => prev.map(t => t.id === payload.id ? payload : t));
  }

  socket.on('task:updated', handleTaskUpdated);
  return () => socket.off('task:updated', handleTaskUpdated);
}, [socket]);
```

Failure to clean up causes duplicate listeners and memory leaks.

## Known Events (Placeholder — Confirm with Backend)

### Task events
| Event | Payload (TBD) | Frontend action |
|---|---|---|
| `task:created` | Task object | Append to list/board |
| `task:updated` | Partial task | Update card/detail |
| `task:deleted` | `{ id: string }` | Remove from list/board |

### Message events
| Event | Payload (TBD) | Frontend action |
|---|---|---|
| `message:created` | Message object | Append to thread |
| `message:edited` | Partial message | Update in thread |
| `message:deleted` | `{ id: string }` | Remove from thread |
| `message:reaction` | Reaction update | Update reactions |
| `typing:start` | `{ userId, conversationId }` | Show typing indicator |
| `typing:stop` | `{ userId, conversationId }` | Hide typing indicator |

### Notification events
| Event | Payload (TBD) | Frontend action |
|---|---|---|
| `notification:created` | Notification object | Increment bell badge |

### Presence events (if supported)
| Event | Payload (TBD) | Frontend action |
|---|---|---|
| `user:online` | `{ userId }` | Show green presence dot |
| `user:offline` | `{ userId }` | Hide presence dot |

## Notification Type Reference

```typescript
// types/notifications.ts
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_COMMENT'
  | 'TASK_MENTION'
  | 'TASK_STATUS_CHANGED'
  | 'PROJECT_INVITATION'
  | 'DIRECT_MESSAGE'
  | 'MEETING_INVITE'
  | 'AI_JOB_COMPLETED';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface Notification {
  id: string;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  body: string;
  resourceType: 'task' | 'project' | 'conversation' | 'meeting' | null;
  resourceId: string | null;
  createdAt: string;
}
```

Confirm field names against the actual backend notification schema.
