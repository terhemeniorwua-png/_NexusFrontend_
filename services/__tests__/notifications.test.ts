import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  listNotifications,
  getUnreadCount,
  markNotificationsRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  updateNotificationPreference,
  listActivity,
  ALL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_GROUPS,
} from '../notifications';

const WS_ID = 'ws-abc123';

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function err(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fakeNotification = {
  id: 'notif-1',
  type: 'TASK_ASSIGNED',
  title: 'You were assigned a task',
  body: null,
  link: '/app/projects/p1/tasks/t1',
  data: { workspaceId: WS_ID },
  readAt: null,
  createdAt: '2026-11-07T10:00:00.000Z',
};

describe('notifications service', () => {
  beforeEach(() => vi.restoreAllMocks());

  // ── Metadata ───────────────────────────────────────────────────────────────

  it('exports all 18 notification types', () => {
    expect(ALL_NOTIFICATION_TYPES).toHaveLength(18);
    expect(ALL_NOTIFICATION_TYPES).toContain('MENTION');
    expect(ALL_NOTIFICATION_TYPES).toContain('PROJECT_UPDATE');
  });

  it('has a label for every notification type', () => {
    for (const type of ALL_NOTIFICATION_TYPES) {
      expect(NOTIFICATION_TYPE_LABELS[type]).toBeTruthy();
    }
  });

  it('groups cover all 18 types without duplication', () => {
    const flat = NOTIFICATION_TYPE_GROUPS.flatMap((g) => g.types);
    expect(flat).toHaveLength(18);
    expect(new Set(flat).size).toBe(18);
  });

  // ── listNotifications ──────────────────────────────────────────────────────

  it('GET /notifications — returns items, nextCursor, unreadCount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [fakeNotification], nextCursor: null, unreadCount: 1 }),
    );
    const result = await listNotifications();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications',
      expect.any(Object),
    );
    expect(result.items).toHaveLength(1);
    expect(result.unreadCount).toBe(1);
  });

  it('passes query params when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null, unreadCount: 0 }),
    );
    await listNotifications({ limit: 10, unreadOnly: true, type: 'MENTION' });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications?limit=10&unreadOnly=true&type=MENTION',
      expect.any(Object),
    );
  });

  it('passes cursor for pagination', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ items: [], nextCursor: null, unreadCount: 0 }),
    );
    await listNotifications({ cursor: 'notif-uuid-abc' });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('cursor=notif-uuid-abc');
  });

  // ── getUnreadCount ─────────────────────────────────────────────────────────

  it('GET /notifications/unread-count — returns unreadCount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      ok({ unreadCount: 5 }),
    );
    const result = await getUnreadCount();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications/unread-count',
      expect.any(Object),
    );
    expect(result.unreadCount).toBe(5);
  });

  // ── markNotificationsRead ──────────────────────────────────────────────────

  it('POST /notifications/read — sends batch of notification ids', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await markNotificationsRead(['id-1', 'id-2']);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications/read',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ notificationIds: ['id-1', 'id-2'] }),
      }),
    );
  });

  // ── markAllNotificationsRead ───────────────────────────────────────────────

  it('POST /notifications/read-all — no body required', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await markAllNotificationsRead();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications/read-all',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  // ── getNotificationPreferences ─────────────────────────────────────────────

  it('GET /notifications/preferences/:workspaceId — returns array', async () => {
    const prefs = [{ type: 'MENTION', inAppEnabled: true }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(prefs));
    const result = await getNotificationPreferences(WS_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/notifications/preferences/${WS_ID}`,
      expect.any(Object),
    );
    expect(result).toEqual(prefs);
  });

  it('returns empty array when response is not an array', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(null));
    expect(await getNotificationPreferences(WS_ID)).toEqual([]);
  });

  // ── updateNotificationPreference ───────────────────────────────────────────

  it('PUT /notifications/preferences/:workspaceId — sends one type + inAppEnabled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ ok: true }));
    await updateNotificationPreference(WS_ID, { type: 'MENTION', inAppEnabled: false });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/notifications/preferences/${WS_ID}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ type: 'MENTION', inAppEnabled: false }),
      }),
    );
  });

  it('throws on 403 when updating preference without membership', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      err('WORKSPACE_ACCESS_DENIED', 'You are not a member of this workspace', 403),
    );
    await expect(
      updateNotificationPreference(WS_ID, { type: 'MENTION', inAppEnabled: false }),
    ).rejects.toThrow();
  });

  // ── listActivity ───────────────────────────────────────────────────────────

  it('GET /notifications/activity/:workspaceId — returns items and nextCursor', async () => {
    const activity = { items: [{ id: 'a1', action: 'TASK_CREATED', actorId: 'u1', targetType: 'Task', targetId: 't1', metadata: null, createdAt: '2026-11-07T09:00:00.000Z' }], nextCursor: null };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(activity));
    const result = await listActivity(WS_ID);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/notifications/activity/${WS_ID}`,
      expect.any(Object),
    );
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBeNull();
  });

  it('passes cursor and limit to activity endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok({ items: [], nextCursor: null }));
    await listActivity(WS_ID, { cursor: 'cursor-abc', limit: 10 });
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('cursor=cursor-abc');
    expect(url).toContain('limit=10');
  });
});
