import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WS_ID = 'ws-cal-test';
const USER_ID = 'user-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/calendar',
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: USER_ID, name: 'Ada', email: 'ada@test.com' },
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

function fakeEvent(overrides: Partial<{
  id: string; title: string; status: string; allDay: boolean; createdById: string;
}> = {}) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 15, 10, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), 15, 11, 0, 0);
  return {
    id: 'evt-1',
    workspaceId: WS_ID,
    projectId: null,
    createdById: USER_ID,
    title: 'Team Standup',
    description: 'Daily sync',
    location: 'Room A',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    allDay: false,
    status: 'CONFIRMED',
    visibility: 'PUBLIC',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function listOk(items = [fakeEvent()]) {
  return ok({ items, nextCursor: null });
}

function routeMock(impl: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url: RequestInfo | URL, init?: RequestInit) => impl(String(url), init),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<CalendarPage />);
    expect(screen.getByRole('heading', { name: 'Calendar', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when there is no active workspace', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    render(<CalendarPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('loads events via GET /workspaces/:id/events', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<CalendarPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/events`),
      expect.any(Object),
    ));
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<CalendarPage />);
    expect(screen.getByLabelText('Loading events')).toBeInTheDocument();
    resolve(listOk());
  });

  it('shows an error alert with Retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Server error', 500));
    render(<CalendarPage />);
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows month/week/day view switcher buttons', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'week' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'day' })).toBeInTheDocument();
  });

  it('switches between views when view buttons are clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    // Initially in month view — month button should be pressed
    expect(screen.getByRole('button', { name: 'month' })).toHaveAttribute('aria-pressed', 'true');

    // Switch to week
    await user.click(screen.getByRole('button', { name: 'week' }));
    expect(screen.getByRole('button', { name: 'week' })).toHaveAttribute('aria-pressed', 'true');

    // Switch to day
    await user.click(screen.getByRole('button', { name: 'day' }));
    expect(screen.getByRole('button', { name: 'day' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders the Today navigation button', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('opens the create event modal when New event is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New event' }));
    expect(screen.getByRole('dialog', { name: 'New event' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  });

  it('creates an event via POST and adds it to the calendar', async () => {
    const newEvent = fakeEvent({ id: 'evt-new', title: 'Launch Meeting' });
    const fetchMock = routeMock((url, init) => {
      if (init?.method === 'POST' && !url.includes('/cancel') && !url.includes('/respond')) {
        return ok(newEvent, 201);
      }
      return ok({ items: [fakeEvent()], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New event' }));
    await screen.findByRole('dialog', { name: 'New event' });

    const titleInput = screen.getByRole('textbox', { name: 'Title' });
    await user.type(titleInput, 'Launch Meeting');
    await user.click(screen.getByRole('button', { name: 'Create event' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS_ID}/events`,
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows event detail when an event is clicked in month view', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    // Click the event in the calendar — it renders as a button with the event title
    const eventBtn = screen.getByRole('button', { name: 'Team Standup' });
    await user.click(eventBtn);
    // Detail panel shows the event title as a heading
    expect(screen.getByRole('heading', { name: 'Team Standup' })).toBeInTheDocument();
  });

  it('shows Edit and Cancel event buttons for the event creator', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/invitations')) return ok([]);
      return ok({ items: [fakeEvent({ createdById: USER_ID })], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Team Standup' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Cancel event' })).toBeInTheDocument();
  });

  it('navigates forward and backward', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    const prevBtn = screen.getByRole('button', { name: 'Previous' });
    const nextBtn = screen.getByRole('button', { name: 'Next' });
    await user.click(nextBtn);
    await user.click(prevBtn);
    // Both clicks complete without error — basic navigation sanity
    expect(screen.getByRole('heading', { name: 'Calendar', level: 1 })).toBeInTheDocument();
  });

  it('switches to the agenda view and lists events by day', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'agenda' }));
    expect(screen.getByRole('button', { name: 'agenda' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Team Standup')).toBeInTheDocument();
    // Day headings are rendered as h3 in the agenda
    expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0);
  });

  it('shows an empty agenda when nothing is scheduled', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'agenda' }));
    expect(screen.getByText('No upcoming events')).toBeInTheDocument();
  });

  it('lets an invitee accept a calendar invitation', async () => {
    const invitation = {
      userId: USER_ID,
      status: 'INVITED',
      createdAt: new Date().toISOString(),
    };
    const fetchMock = routeMock((url, init) => {
      if (url.includes('/respond') && init?.method === 'POST') return ok({ ok: true });
      if (url.includes('/invitations')) return ok([invitation]);
      return ok({ items: [fakeEvent({ createdById: 'user-2' })], nextCursor: null });
    });
    const user = userEvent.setup();
    render(<CalendarPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading events')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Team Standup' }));
    await user.click(await screen.findByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/events/evt-1/respond`),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      }),
    ));
  });
});
