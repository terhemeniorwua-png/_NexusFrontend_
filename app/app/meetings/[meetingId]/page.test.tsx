/**
 * app/app/meetings/[meetingId]/page.test.tsx
 *
 * Tests for the meeting detail page.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MeetingDetailPage from './page';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const WS_ID = 'ws-meeting-detail';
const USER_ID = 'user-creator';
const MTG_ID = 'meeting-detail-1';

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ meetingId: MTG_ID }),
  usePathname: () => `/app/meetings/${MTG_ID}`,
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: USER_ID, name: 'Creator', email: 'creator@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

vi.mock('@/components/meetings/MeetingRoom', () => ({
  MeetingRoom: ({ title }: { title: string }) => (
    <div data-testid="meeting-room">
      <button type="button">Join meeting</button>
      <span>{title}</span>
    </div>
  ),
}));

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
    id: MTG_ID,
    workspaceId: WS_ID,
    projectId: null,
    createdById: USER_ID,
    title: 'Design Review',
    description: 'Review the new designs',
    status: 'SCHEDULED',
    scheduledAt: '2026-11-12T14:00:00.000Z',
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    participantCount: 2,
    ...overrides,
  };
}

function routeMock(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (url: RequestInfo | URL, init?: RequestInit) => impl(String(url), init),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MeetingDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
    mockCtx.user = { id: USER_ID, name: 'Creator', email: 'creator@test.com' };
  });

  it('shows loading state initially', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<MeetingDetailPage />);
    expect(screen.getByLabelText('Loading meeting')).toBeInTheDocument();
    resolve(ok(fakeMeeting()));
  });

  it('renders the meeting title and status after load', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting());
    });
    render(<MeetingDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Design Review', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('SCHEDULED')).toBeInTheDocument();
  });

  it('shows description when present', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting());
    });
    render(<MeetingDetailPage />);
    expect(await screen.findByText('Review the new designs')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons for the creator', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting({ createdById: USER_ID }));
    });
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meeting')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('shows the meeting room when the meeting can be joined', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting({ status: 'SCHEDULED' }));
    });
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meeting')).not.toBeInTheDocument());
    expect(screen.getByTestId('meeting-room')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join meeting' })).toBeInTheDocument();
  });

  it.each(['ENDED', 'CANCELLED'])('does not show the room when the meeting is %s', async (status) => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting({ status }));
    });
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meeting')).not.toBeInTheDocument());
    expect(screen.queryByTestId('meeting-room')).not.toBeInTheDocument();
    expect(screen.getByText(/can no longer be joined/i)).toBeInTheDocument();
  });

  it('opens edit modal when Edit is clicked', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting({ createdById: USER_ID }));
    });
    const user = userEvent.setup();
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('dialog', { name: 'Edit meeting' })).toBeInTheDocument();
  });

  it('shows confirm dialog when Delete is clicked and calls DELETE on confirm', async () => {
    const fetchMock = routeMock((url, _init) => {
      if (String(_init?.method) === 'DELETE') return ok({ ok: true });
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting({ createdById: USER_ID }));
    });
    const user = userEvent.setup();
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete meeting' });
    expect(dialog).toBeInTheDocument();

    // Click the destructive confirm button inside the dialog
    const allDeleteBtns = screen.getAllByRole('button', { name: 'Delete' });
    const confirmBtn = allDeleteBtns.find((btn) => btn.closest('[role="dialog"]'));
    await user.click(confirmBtn!);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/meetings/${MTG_ID}`),
      expect.objectContaining({ method: 'DELETE' }),
    ));
  });

  it('shows AccessState on 401 response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meeting')).not.toBeInTheDocument());
    // Should not show meeting detail content
    expect(screen.queryByText('Design Review')).not.toBeInTheDocument();
  });

  it('redirects to /app/meetings when workspace changes', async () => {
    routeMock((url) => {
      if (url.includes('/participants')) return ok([]);
      return ok(fakeMeeting());
    });
    const { rerender } = render(<MeetingDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading meeting')).not.toBeInTheDocument());

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<MeetingDetailPage />);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/app/meetings'));
  });
});
