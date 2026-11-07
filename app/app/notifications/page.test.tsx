import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_NOTIFICATION_TYPES } from '@/services/notifications';

// ── Mocks ────────────────────────────────────────────────────────────────────

const WORKSPACE_ID = 'ws-test-123';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/app/notifications' }));

const mockWorkspaceContext = {
  activeWorkspace: { id: WORKSPACE_ID, name: 'Test Workspace', type: 'COMPANY' },
  workspaces: [],
  user: null,
  loading: false,
  switchToWorkspace: vi.fn(),
};

vi.mock('@/providers/WorkspaceProvider', () => ({
  useWorkspaceContext: () => mockWorkspaceContext,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAllPrefsEnabled() {
  return ALL_NOTIFICATION_TYPES.map((type) => ({ type, inAppEnabled: true }));
}

function makeOkResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeErrorResponse(code: string, message: string, status = 400) {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function renderPage() {
  const { default: NotificationsPage } = await import('./page');
  return render(<NotificationsPage />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockWorkspaceContext.activeWorkspace = { id: WORKSPACE_ID, name: 'Test Workspace', type: 'COMPANY' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Notifications', level: 1 })).toBeInTheDocument();
  });

  it('shows the notification inbox unavailability notice', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    await renderPage();
    expect(await screen.findByText('Notification inbox is not yet available')).toBeInTheDocument();
    expect(screen.getByText(/The backend does not currently provide a general notification list/)).toBeInTheDocument();
    // Use getAllByText since the page mentions GET /notifications in multiple code elements
    expect(screen.getAllByText(/GET \/notifications/).length).toBeGreaterThan(0);
  });

  it('loads and displays notification preference groups', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    await renderPage();
    // All 5 groups should appear
    expect(await screen.findByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Comments and mentions')).toBeInTheDocument();
    expect(screen.getByText('Membership')).toBeInTheDocument();
    expect(screen.getByText('Meetings')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('calls GET /workspaces/{id}/notification-preferences on mount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    await renderPage();
    await screen.findByText('Tasks');
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WORKSPACE_ID}/notification-preferences`,
      expect.any(Object),
    );
  });

  it('shows accessible loading skeletons while fetching', async () => {
    // Never resolves during this test - held pending
    let resolver!: (v: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolver = res; }));
    await renderPage();
    expect(screen.getByLabelText('Loading notification preferences')).toBeInTheDocument();
    // Cleanup
    resolver(makeOkResponse(makeAllPrefsEnabled()));
  });

  it('shows an error alert with retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      makeErrorResponse('FORBIDDEN', 'Active workspace membership required.', 403),
    );
    await renderPage();
    expect(await screen.findByText('Could not load preferences')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('toggles a single preference and enables the save button', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    const user = userEvent.setup();
    await renderPage();

    // Wait for preferences to load
    await screen.findByText('Tasks');

    // Save button should be disabled initially
    const saveButton = screen.getByRole('button', { name: 'Save preferences' });
    expect(saveButton).toBeDisabled();

    // Toggle one preference
    const mentionCheckbox = screen.getByLabelText('Mentions');
    await user.click(mentionCheckbox);
    expect(saveButton).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
  });

  it('saves preferences via PATCH and shows success alert', async () => {
    const updatedPrefs = makeAllPrefsEnabled().map((p) =>
      p.type === 'MENTION' ? { ...p, inAppEnabled: false } : p,
    );
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeOkResponse(makeAllPrefsEnabled()))
      .mockResolvedValueOnce(makeOkResponse(updatedPrefs));
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Tasks');
    await user.click(screen.getByLabelText('Mentions'));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));

    expect(await screen.findByText('Notification preferences saved.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/backend/workspaces/${WORKSPACE_ID}/notification-preferences`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('shows a save error alert when PATCH fails', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(makeOkResponse(makeAllPrefsEnabled()))
      .mockResolvedValueOnce(makeErrorResponse('FORBIDDEN', 'Active workspace membership required.', 403));
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Tasks');
    await user.click(screen.getByLabelText('Mentions'));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));

    expect(await screen.findByText('Could not save preferences')).toBeInTheDocument();
  });

  it('discarding changes reloads preferences from the backend', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Tasks');
    await user.click(screen.getByLabelText('Mentions'));
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('renders empty state when there is no active workspace', async () => {
    mockWorkspaceContext.activeWorkspace = null as unknown as typeof mockWorkspaceContext.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    await renderPage();
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('the group toggle header enables or disables all types in the group', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    const user = userEvent.setup();
    await renderPage();

    await screen.findByText('Tasks');
    // Uncheck the Tasks group (all currently checked)
    await user.click(screen.getByLabelText('Tasks'));

    // All task-related checkboxes should now be unchecked
    expect(screen.getByLabelText('Task assigned to me')).not.toBeChecked();
    expect(screen.getByLabelText('Task reassigned')).not.toBeChecked();
    expect(screen.getByLabelText('Task approved')).not.toBeChecked();

    // Save button should now be enabled
    expect(screen.getByRole('button', { name: 'Save preferences' })).toBeEnabled();
  });

  it('does not mix message unread counts with notification state', async () => {
    // This test documents the separation invariant: the notifications page
    // has no connection to message unread counts or socket message events.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeOkResponse(makeAllPrefsEnabled()));
    await renderPage();
    await screen.findByText('Tasks');
    // No "messages" or "unread messages" text on the notifications page
    expect(screen.queryByText(/unread messages/i)).not.toBeInTheDocument();
  });
});
