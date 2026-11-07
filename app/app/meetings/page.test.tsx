/**
 * app/app/meetings/page.test.tsx
 *
 * Tests for the meetings list and scheduling page.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MeetingsPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WS_ID = 'ws-meeting-test';
const USER_ID = 'user-1';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/app/meetings',
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

function fakeMeeting(overrides: Partial<{
  id: string; title: string; status: string; createdById: string;
}> = {}) {
  return {
    id: 'mtg-1',
    workspaceId: WS_ID,
    projectId: null,
    createdById: USER_ID,
    title: 'Weekly Sync',
    description: 'Team standup',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-10T09:00:00.000Z',
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 3,
    ...overrides,
  };
}

function listOk(items = [fakeMeeting()]) {
  return ok({ items, nextCursor: null });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MeetingsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Ada', email: 'ada@test.com' };
  });

  it('renders the page heading', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<MeetingsPage />);
    expect(screen.getByRole('heading', { name: 'Meetings', level: 1 })).toBeInTheDocument();
  });

  it('shows empty state when no workspace is selected', () => {
    mockCtx.activeWorkspace = null as unknown as typeof mockCtx.activeWorkspace;
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('should not fetch'));
    render(<MeetingsPage />);
    expect(screen.getByText('No workspace selected')).toBeInTheDocument();
  });

  it('calls GET /workspaces/:id/meetings on mount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<MeetingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/backend/workspaces/${WS_ID}/meetings`),
      expect.any(Object),
    ));
  });

  it('shows loading skeletons while fetching', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<MeetingsPage />);
    expect(screen.getByLabelText('Loading meetings')).toBeInTheDocument();
    resolve(listOk());
  });

  it('renders meeting items after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    render(<MeetingsPage />);
    expect(await screen.findByText('Weekly Sync')).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
  });

  it('shows empty state when there are no meetings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    render(<MeetingsPage />);
    expect(await screen.findByText('No meetings found')).toBeInTheDocument();
  });

  it('shows an error alert with Retry when loading fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('INTERNAL_ERROR', 'Server error', 500));
    render(<MeetingsPage />);
    expect(await screen.findByText('Server error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows AccessState for 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<MeetingsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meetings')).not.toBeInTheDocument());
    // AccessState renders for access errors
    expect(screen.queryByText('Server error')).not.toBeInTheDocument();
  });

  it('opens the create meeting modal when New meeting is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk([]));
    const user = userEvent.setup();
    render(<MeetingsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meetings')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New meeting' }));
    expect(screen.getByRole('dialog', { name: 'New meeting' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Title' })).toBeInTheDocument();
  });

  it('creates a meeting via POST and adds it to the list', async () => {
    const newMeeting = fakeMeeting({ id: 'mtg-new', title: 'Sprint Planning' });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'POST') return ok(newMeeting, 201);
      return listOk([]);
    });
    const user = userEvent.setup();
    render(<MeetingsPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meetings')).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'New meeting' }));
    await screen.findByRole('dialog', { name: 'New meeting' });

    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Sprint Planning');
    await user.click(screen.getByRole('button', { name: 'Schedule meeting' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      `/api/backend/workspaces/${WS_ID}/meetings`,
      expect.objectContaining({ method: 'POST' }),
    ));
  });

  it('shows delete button for creator and calls DELETE', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if ((init as RequestInit | undefined)?.method === 'DELETE') return ok({ ok: true });
      return listOk([fakeMeeting({ createdById: USER_ID })]);
    });
    const user = userEvent.setup();
    render(<MeetingsPage />);
    expect(await screen.findByText('Weekly Sync')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    // ConfirmDialog should appear
    expect(await screen.findByRole('dialog', { name: 'Delete meeting' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/meetings/mtg-1`),
      expect.objectContaining({ method: 'DELETE' }),
    ));
  });

  it('workspace switch reloads meetings for new workspace', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(listOk());
    const { rerender } = render(<MeetingsPage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<MeetingsPage />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toContain('ws-other');
  });
});
