import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_NOTIFICATION_TYPES } from '@/services/notifications';
import NotificationsPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WORKSPACE_ID = 'ws-test-123';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/notifications',
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    <a href={href} {...rest}>{children}</a>,
}));

const mockCtx = {
  activeWorkspace: { id: WORKSPACE_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: null,
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function fail(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeNotification(overrides: Partial<{ id: string; readAt: string | null; link: string | null }> = {}) {
  return {
    id: 'notif-1',
    type: 'TASK_ASSIGNED',
    title: 'You were assigned a task',
    body: null,
    link: null,
    data: {},
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function listOk(items = [fakeNotification()], opts: { nextCursor?: string; unreadCount?: number } = {}) {
  return ok({
    items,
    nextCursor: opts.nextCursor ?? null,
    unreadCount: opts.unreadCount ?? items.filter((n) => !n.readAt).length,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WORKSPACE_ID, name: 'Test WS', type: 'COMPANY' };
  });

  // ── Page shell ─────────────────────────────────────────────────────────────

  it('renders the page heading and the three tabs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<NotificationsPage />);
    expect(screen.getByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preferences' })).toBeInTheDocument();
  });

  it('shows empty state when there is no active workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    render(<NotificationsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  // ── Inbox tab ──────────────────────────────────────────────────────────────

  it('calls GET /notifications on mount and renders notifications', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<NotificationsPage />);
    expect(await screen.findByText('You were assigned a task')).toBeInTheDocument();
    // URL may include ?limit=25 query param
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/backend/notifications'),
      expect.any(Object),
    );
  });

  it('shows "All caught up" when unreadCount is 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      listOk([fakeNotification({ readAt: new Date().toISOString() })], { unreadCount: 0 }),
    );
    render(<NotificationsPage />);
    expect(await screen.findByText('All caught up')).toBeInTheDocument();
  });

  it('shows unread count and "Mark all as read" button when there are unread notifications', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([fakeNotification()], { unreadCount: 3 }));
    render(<NotificationsPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeInTheDocument());
    // The count 3 appears in the toolbar
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<NotificationsPage />);
    expect(screen.getByLabelText('Loading notifications')).toBeInTheDocument();
    resolve(listOk());
  });

  it('shows an error alert with Retry when listing fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Server error', 500));
    render(<NotificationsPage />);
    // The error message is surfaced from the backend response via ApiRequestError.message
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([], { unreadCount: 0 }));
    render(<NotificationsPage />);
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });

  it('marks a single notification as read via POST /notifications/read', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') return ok({ ok: true });
        return listOk([fakeNotification({ id: 'notif-99' })]);
      });
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await screen.findByText('You were assigned a task');
    await user.click(screen.getByRole('button', { name: 'Mark as read' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications/read',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ notificationIds: ['notif-99'] }),
      }),
    ));
  });

  it('opens confirm dialog and marks all as read via POST /notifications/read-all', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementation(async (_url: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'POST') return ok({ ok: true });
        return listOk([fakeNotification()], { unreadCount: 1 });
      });
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await screen.findByText('You were assigned a task');
    await user.click(screen.getByRole('button', { name: 'Mark all as read' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Click the confirm button inside the dialog
    await user.click(screen.getAllByRole('button', { name: 'Mark all as read' })[1]);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/notifications/read-all',
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('notification/message count separation: page has no reference to message unread counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([], { unreadCount: 0 }));
    render(<NotificationsPage />);
    await screen.findByText('No notifications yet');
    expect(screen.queryByText(/unread messages/i)).not.toBeInTheDocument();
  });

  // ── Preferences tab ────────────────────────────────────────────────────────

  it('loads preferences from GET /notifications/preferences/:workspaceId', async () => {
    const prefs = ALL_NOTIFICATION_TYPES.map((type) => ({ type, inAppEnabled: true }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/preferences/')) return ok(prefs);
      return ok({ items: [], nextCursor: null, unreadCount: 0 });
    });
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await user.click(screen.getByRole('tab', { name: 'Preferences' }));
    await screen.findByText('Tasks');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/notifications/preferences/${WORKSPACE_ID}`,
      expect.any(Object),
    );
  });

  it('saves a preference via PUT /notifications/preferences/:workspaceId', async () => {
    const prefs = ALL_NOTIFICATION_TYPES.map((type) => ({ type, inAppEnabled: true }));
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('/preferences/') && init?.method === 'PUT') return ok({ ok: true });
      if (u.includes('/preferences/')) return ok(prefs);
      return ok({ items: [], nextCursor: null, unreadCount: 0 });
    });
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await user.click(screen.getByRole('tab', { name: 'Preferences' }));
    await screen.findByText('Tasks');
    await user.click(screen.getByLabelText('Task assigned to me'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/notifications/preferences/${WORKSPACE_ID}`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ type: 'TASK_ASSIGNED', inAppEnabled: false }),
      }),
    ));
  });

  // ── Activity tab ───────────────────────────────────────────────────────────

  it('loads activity from GET /notifications/activity/:workspaceId', async () => {
    const activity = {
      items: [{ id: 'a1', action: 'TASK_CREATED', actorId: 'u1', targetType: 'Task', targetId: 't1', metadata: null, createdAt: new Date().toISOString() }],
      nextCursor: null,
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url: RequestInfo | URL) => {
      if (String(url).includes('/activity/')) return ok(activity);
      return ok({ items: [], nextCursor: null, unreadCount: 0 });
    });
    const user = userEvent.setup();
    render(<NotificationsPage />);
    await user.click(screen.getByRole('tab', { name: 'Activity' }));
    await screen.findByText('TASK CREATED');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/notifications/activity/${WORKSPACE_ID}`),
      expect.any(Object),
    );
  });
});
