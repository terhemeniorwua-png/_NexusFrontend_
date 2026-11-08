/**
 * app/app/automations/[automationId]/page.test.tsx
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AutomationDetailPage from './page';

const WS_ID = 'ws-auto-detail';
const AUTO_ID = 'auto-detail-1';
const mockRouter = { push: vi.fn() };

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ automationId: AUTO_ID }),
  usePathname: () => `/app/automations/${AUTO_ID}`,
}));

const mockCtx = {
  activeWorkspace: { id: WS_ID, name: 'Test WS', type: 'COMPANY' as const },
  workspaces: [],
  user: { id: 'user-1', name: 'Ada', email: 'ada@test.com' },
  loading: false,
  switchToWorkspace: vi.fn(),
};
vi.mock('@/providers/WorkspaceProvider', () => ({ useWorkspaceContext: () => mockCtx }));

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

function fakeAuto(overrides: Partial<{ name: string; enabled: boolean }> = {}) {
  return {
    id: AUTO_ID,
    workspaceId: WS_ID,
    createdById: 'user-1',
    name: 'Notify on task',
    trigger: 'EVENT_TASK_CREATED',
    condition: null,
    action: 'SEND_NOTIFICATION',
    actionConfig: { message: 'New task!' },
    enabled: true,
    maxRetries: 3,
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runs: [],
    ...overrides,
  };
}

describe('AutomationDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockRouter.push.mockClear();
    mockCtx.activeWorkspace = { id: WS_ID, name: 'Test WS', type: 'COMPANY' };
  });

  it('shows loading state initially', () => {
    let resolve!: (r: Response) => void;
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise((res) => { resolve = res; }));
    render(<AutomationDetailPage />);
    expect(screen.getByLabelText('Loading automation')).toBeInTheDocument();
    resolve(ok(fakeAuto()));
  });

  it('renders automation name and status after load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    render(<AutomationDetailPage />);
    expect(await screen.findByRole('heading', { name: 'Notify on task', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows trigger and action details', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    render(<AutomationDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automation')).not.toBeInTheDocument());
    expect(screen.getByText('Task created')).toBeInTheDocument();
    expect(screen.getByText('Send notification')).toBeInTheDocument();
  });

  it('shows empty run history', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    render(<AutomationDetailPage />);
    expect(await screen.findByText('No runs yet')).toBeInTheDocument();
  });

  it('shows Rename, Enable/Disable, and Delete buttons', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    render(<AutomationDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automation')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('opens rename modal when Rename is clicked', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    const user = userEvent.setup();
    render(<AutomationDetailPage />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Rename' }));
    expect(screen.getByRole('dialog', { name: 'Rename automation' })).toBeInTheDocument();
  });

  it('shows AccessState on 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fail('UNAUTHORIZED', 'Unauthorized', 401));
    render(<AutomationDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automation')).not.toBeInTheDocument());
    expect(screen.queryByText('Notify on task')).not.toBeInTheDocument();
  });

  it('redirects to /app/automations when workspace changes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(ok(fakeAuto()));
    const { rerender } = render(<AutomationDetailPage />);
    await waitFor(() => expect(screen.queryByLabelText('Loading automation')).not.toBeInTheDocument());

    mockCtx.activeWorkspace = { id: 'ws-other', name: 'Other WS', type: 'COMPANY' };
    rerender(<AutomationDetailPage />);
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/app/automations'));
  });
});
